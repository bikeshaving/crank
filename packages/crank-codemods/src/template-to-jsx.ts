/**
 * Codemod: Convert Crank's tagged template syntax to JSX.
 *
 * Usage with jscodeshift:
 *   jscodeshift -t node_modules/@b9g/crank-codemods/dist/template-to-jsx.js src/
 *
 * Programmatic usage:
 *   import { templateToJSX } from "@b9g/crank-codemods";
 *   const jsxCode = templateToJSX(templateCode);
 */

import jscodeshift from "jscodeshift";
import type {API, FileInfo, JSCodeshift} from "jscodeshift";
import {parse, type ParseElement} from "@b9g/crank/jsx-tag";

/**
 * Convert a regular MemberExpression to a JSXMemberExpression.
 * Used when converting template syntax back to JSX for component tags like Foo.Bar.
 */
function expressionToJSXMemberExpression(j: JSCodeshift, node: any): any {
	if (node.type === "MemberExpression") {
		const object = node.object;
		const property = node.property;
		return j.jsxMemberExpression(
			object.type === "MemberExpression"
				? expressionToJSXMemberExpression(j, object)
				: j.jsxIdentifier(object.name),
			j.jsxIdentifier(property.name),
		);
	}
	return j.jsxIdentifier(node.name);
}

/**
 * Convert a ParseElement (from Crank's template parser) to a jscodeshift JSX AST node.
 */
function parseElementToJSX(
	j: JSCodeshift,
	element: ParseElement,
	expressions: any[],
): any {
	const tagValue = element.open.value;

	let tagName: any;
	let isFragment = false;

	if (tagValue === "") {
		isFragment = true;
	} else if (typeof tagValue === "string") {
		tagName = j.jsxIdentifier(tagValue);
	} else if (tagValue.type === "Identifier") {
		// Component reference - convert Identifier to JSXIdentifier
		tagName = j.jsxIdentifier(tagValue.name);
	} else if (tagValue.type === "MemberExpression") {
		// Namespaced component like Foo.Bar - convert to JSXMemberExpression
		tagName = expressionToJSXMemberExpression(j, tagValue);
	} else {
		// Other expressions can't be converted back to JSX
		// Leave as template (return null to signal this)
		return null;
	}

	// Build attributes
	const attributes: any[] = [];
	for (const prop of element.props) {
		if (prop.type === "value") {
			// Spread attribute
			attributes.push(j.jsxSpreadAttribute(prop.value));
		} else if (prop.type === "prop") {
			let attrValue: any;
			if (prop.value.type === "value") {
				if (prop.value.value === true) {
					attrValue = null;
				} else if (typeof prop.value.value === "string") {
					attrValue = j.stringLiteral(prop.value.value);
				} else {
					attrValue = j.jsxExpressionContainer(prop.value.value);
				}
			} else if (prop.value.type === "propString") {
				const parts = prop.value.parts;
				if (parts.length === 1 && typeof parts[0] === "string") {
					const str = parts[0] as string;
					attrValue = j.stringLiteral(str.slice(1, -1));
				} else {
					// Has interpolations - convert to template literal
					const quasis: any[] = [];
					const exprs: any[] = [];
					let currentQuasi = "";

					for (const part of parts) {
						if (typeof part === "string") {
							currentQuasi += part;
						} else {
							quasis.push(
								j.templateElement(
									{raw: currentQuasi, cooked: currentQuasi},
									false,
								),
							);
							currentQuasi = "";
							exprs.push(part.value);
						}
					}
					if (quasis.length > 0) {
						const first = quasis[0];
						first.value.raw = first.value.raw.replace(/^['"]/, "");
						first.value.cooked = first.value.cooked.replace(/^['"]/, "");
					}
					quasis.push(
						j.templateElement(
							{
								raw: currentQuasi.replace(/['"]$/, ""),
								cooked: currentQuasi.replace(/['"]$/, ""),
							},
							true,
						),
					);

					attrValue = j.jsxExpressionContainer(
						j.templateLiteral(quasis, exprs),
					);
				}
			}

			attributes.push(j.jsxAttribute(j.jsxIdentifier(prop.name), attrValue));
		}
	}

	// Build children
	const children: any[] = [];
	for (const child of element.children) {
		if (child.type === "element") {
			children.push(parseElementToJSX(j, child, expressions));
		} else if (child.type === "value") {
			if (typeof child.value === "string") {
				children.push(j.jsxText(child.value));
			} else {
				children.push(j.jsxExpressionContainer(child.value));
			}
		}
	}

	if (isFragment) {
		return j.jsxFragment(
			j.jsxOpeningFragment(),
			j.jsxClosingFragment(),
			children,
		);
	}

	const selfClosing = element.close === null;

	return j.jsxElement(
		j.jsxOpeningElement(tagName, attributes, selfClosing),
		selfClosing ? null : j.jsxClosingElement(tagName),
		children,
	);
}

/**
 * jscodeshift transform: Convert tagged template literals back to JSX.
 * This is the default export for jscodeshift CLI compatibility.
 */
export default function transform(fileInfo: FileInfo, api: API): string | null {
	const j = api.jscodeshift;
	const root = j(fileInfo.source);

	root.find(j.TaggedTemplateExpression).forEach((path) => {
		const {tag, quasi} = path.node;
		if (
			tag.type !== "Identifier" ||
			(tag.name !== "jsx" && tag.name !== "html")
		) {
			return;
		}

		const spans = quasi.quasis.map((q) => q.value.raw);
		const expressions = quasi.expressions;

		const parseResult = parse(spans);
		const {element, targets} = parseResult;

		for (let i = 0; i < expressions.length; i++) {
			const target = targets[i];
			if (target && target.type !== "error") {
				target.value = expressions[i];
			}
		}

		const jsxNode = parseElementToJSX(j, element, expressions);

		// If template was multi-line, wrap JSX in parentheses
		const isMultiLine = spans.some((s) => s.includes("\n"));
		if (isMultiLine) {
			// Use parenthesized expression for multi-line JSX
			const parenExpr = j.parenthesizedExpression
				? j.parenthesizedExpression(jsxNode)
				: jsxNode;
			j(path).replaceWith(parenExpr);
		} else {
			j(path).replaceWith(jsxNode);
		}
	});

	return root.toSource({quote: "double"});
}

/**
 * Programmatic API: Convert tagged template syntax to JSX code.
 */
export function templateToJSX(code: string): string {
	const j = jscodeshift.withParser("tsx");
	const result = transform({source: code, path: "input.tsx"}, {
		jscodeshift: j,
		j,
		stats: () => {},
		report: () => {},
	} as API);
	return result || code;
}
