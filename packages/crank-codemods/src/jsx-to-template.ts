/**
 * Codemod to convert between JSX syntax and Crank's tagged template syntax.
 *
 * JSX features:
 *   <div class="foo">Hello {name}</div>
 *   <Component {...props} />
 *   <>{children}</>
 *
 * Template features:
 *   jsx`<div class="foo">Hello ${name}</div>`
 *   jsx`<${Component} ...${props} />`
 *   jsx`<>${children}<//>`
 *   jsx`<div class="foo ${dynamic}">` (string interpolation)
 *   jsx`<//>` (generic closing tag)
 *
 * Usage:
 *   import { jsxToTemplate, templateToJsx } from "@b9g/crank-codemods";
 *   const templateCode = jsxToTemplate(jsxCode);
 *   const jsxCode = templateToJsx(templateCode);
 */

import jscodeshift from "jscodeshift";
import type {
	API,
	FileInfo,
	JSXElement,
	JSXFragment,
	JSCodeshift,
	Collection,
} from "jscodeshift";
import {
	parse,
	type ParseElement,
	type ParseValue,
	type ParseProp,
	type ParsePropString,
	type ParseResult,
} from "@b9g/crank/jsx-tag";

interface SerializeResult {
	parts: string[];
	expressions: any[];
}

// Serialize a JSX element to template parts
function serializeJSXElement(
	j: JSCodeshift,
	node: JSXElement,
	useGenericClose: boolean = true,
): SerializeResult {
	const parts: string[] = [];
	const expressions: any[] = [];
	let current = "";

	const {openingElement, children, closingElement} = node;
	const tagName = openingElement.name;

	// Opening tag
	if (tagName.type === "JSXIdentifier") {
		const name = tagName.name;
		// Lowercase = HTML element, uppercase = component
		if (name[0] === name[0].toLowerCase()) {
			current += `<${name}`;
		} else {
			// Component - use expression syntax
			current += "<";
			parts.push(current);
			current = "";
			expressions.push(j.identifier(name));
		}
	} else if (tagName.type === "JSXMemberExpression") {
		current += "<";
		parts.push(current);
		current = "";
		expressions.push(memberExpressionToExpression(j, tagName));
	} else {
		// JSXNamespacedName - just use as string
		current += `<${(tagName as any).namespace.name}:${(tagName as any).name.name}`;
	}

	// Attributes
	for (const attr of openingElement.attributes || []) {
		if (attr.type === "JSXAttribute") {
			const attrName =
				attr.name.type === "JSXIdentifier"
					? attr.name.name
					: `${(attr.name as any).namespace.name}:${(attr.name as any).name.name}`;

			if (attr.value == null) {
				// Boolean attribute
				current += ` ${attrName}`;
			} else if (attr.value.type === "StringLiteral") {
				current += ` ${attrName}="${attr.value.value}"`;
			} else if (attr.value.type === "JSXExpressionContainer") {
				current += ` ${attrName}=`;
				parts.push(current);
				current = "";
				expressions.push(attr.value.expression);
			}
		} else if (attr.type === "JSXSpreadAttribute") {
			// Spread props: ...${expr} (not {...expr})
			current += " ...";
			parts.push(current);
			current = "";
			expressions.push(attr.argument);
		}
	}

	if (openingElement.selfClosing) {
		current += " />";
	} else {
		current += ">";

		// Children
		for (const child of children || []) {
			if (child.type === "JSXText") {
				current += child.value;
			} else if (child.type === "JSXExpressionContainer") {
				if (child.expression.type !== "JSXEmptyExpression") {
					parts.push(current);
					current = "";
					expressions.push(child.expression);
				}
			} else if (child.type === "JSXElement") {
				const nested = serializeJSXElement(j, child, useGenericClose);
				current += nested.parts[0];
				for (let i = 0; i < nested.expressions.length; i++) {
					parts.push(current);
					current = "";
					expressions.push(nested.expressions[i]);
					current += nested.parts[i + 1] || "";
				}
			} else if (child.type === "JSXFragment") {
				const nested = serializeJSXFragment(j, child, useGenericClose);
				current += nested.parts[0];
				for (let i = 0; i < nested.expressions.length; i++) {
					parts.push(current);
					current = "";
					expressions.push(nested.expressions[i]);
					current += nested.parts[i + 1] || "";
				}
			} else if (child.type === "JSXSpreadChild") {
				parts.push(current);
				current = "";
				expressions.push((child as any).expression);
			}
		}

		// Closing tag - use generic <//>  for components, specific for HTML
		if (closingElement) {
			if (useGenericClose && tagName.type !== "JSXIdentifier") {
				current += "<//>";
			} else if (
				useGenericClose &&
				tagName.type === "JSXIdentifier" &&
				tagName.name[0] !== tagName.name[0].toLowerCase()
			) {
				current += "<//>";
			} else {
				const closeName =
					closingElement.name.type === "JSXIdentifier"
						? closingElement.name.name
						: closingElement.name.type === "JSXMemberExpression"
							? memberExpressionToString(closingElement.name)
							: `${(closingElement.name as any).namespace.name}:${(closingElement.name as any).name.name}`;
				current += `</${closeName}>`;
			}
		}
	}

	parts.push(current);
	return {parts, expressions};
}

function serializeJSXFragment(
	j: JSCodeshift,
	node: JSXFragment,
	useGenericClose: boolean = true,
): SerializeResult {
	const parts: string[] = [];
	const expressions: any[] = [];
	let current = "<>";

	for (const child of node.children || []) {
		if (child.type === "JSXText") {
			current += child.value;
		} else if (child.type === "JSXExpressionContainer") {
			if (child.expression.type !== "JSXEmptyExpression") {
				parts.push(current);
				current = "";
				expressions.push(child.expression);
			}
		} else if (child.type === "JSXElement") {
			const nested = serializeJSXElement(j, child, useGenericClose);
			current += nested.parts[0];
			for (let i = 0; i < nested.expressions.length; i++) {
				parts.push(current);
				current = "";
				expressions.push(nested.expressions[i]);
				current += nested.parts[i + 1] || "";
			}
		} else if (child.type === "JSXFragment") {
			const nested = serializeJSXFragment(j, child, useGenericClose);
			current += nested.parts[0];
			for (let i = 0; i < nested.expressions.length; i++) {
				parts.push(current);
				current = "";
				expressions.push(nested.expressions[i]);
				current += nested.parts[i + 1] || "";
			}
		} else if (child.type === "JSXSpreadChild") {
			parts.push(current);
			current = "";
			expressions.push((child as any).expression);
		}
	}

	current += useGenericClose ? "<//>" : "</>";
	parts.push(current);
	return {parts, expressions};
}

function memberExpressionToExpression(j: JSCodeshift, node: any): any {
	if (node.type === "JSXMemberExpression") {
		return j.memberExpression(
			memberExpressionToExpression(j, node.object),
			j.identifier(node.property.name),
		);
	}
	return j.identifier(node.name);
}

function memberExpressionToString(node: any): string {
	if (node.type === "JSXMemberExpression") {
		return `${memberExpressionToString(node.object)}.${node.property.name}`;
	}
	return node.name;
}

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
 * Transform JSX to tagged template literals (jscodeshift transform)
 */
export function jsxToTemplateTransform(
	fileInfo: FileInfo,
	api: API,
): string | null {
	const j = api.jscodeshift;
	const root = j(fileInfo.source);

	let hasJSX = false;
	let hasJsxImport = false;

	// Check for existing jsx import from standalone
	root.find(j.ImportDeclaration).forEach((path) => {
		const source = path.node.source.value;
		if (source === "@b9g/crank/standalone") {
			path.node.specifiers?.forEach((spec) => {
				if (
					spec.type === "ImportSpecifier" &&
					spec.imported.type === "Identifier" &&
					spec.imported.name === "jsx"
				) {
					hasJsxImport = true;
				}
			});
		}
	});

	// Find top-level JSX (not nested inside other JSX)
	const transformJSX = (collection: Collection<any>, nodeType: string) => {
		collection.forEach((path) => {
			// Skip if nested inside another JSX
			let parent = path.parent;
			while (parent) {
				if (
					parent.node.type === "JSXElement" ||
					parent.node.type === "JSXFragment"
				) {
					return;
				}
				parent = parent.parent;
			}

			hasJSX = true;
			const serialized =
				nodeType === "JSXElement"
					? serializeJSXElement(j, path.node)
					: serializeJSXFragment(j, path.node);

			const {parts, expressions} = serialized;

			const templateLiteral = j.templateLiteral(
				parts.map((p, i) =>
					j.templateElement({raw: p, cooked: p}, i === parts.length - 1),
				),
				expressions,
			);

			const taggedTemplate = j.taggedTemplateExpression(
				j.identifier("jsx"),
				templateLiteral,
			);

			j(path).replaceWith(taggedTemplate);
		});
	};

	transformJSX(root.find(j.JSXElement), "JSXElement");
	transformJSX(root.find(j.JSXFragment), "JSXFragment");

	// Add jsx import if needed
	if (hasJSX && !hasJsxImport) {
		let addedToExisting = false;
		root.find(j.ImportDeclaration).forEach((path) => {
			if (
				path.node.source.value === "@b9g/crank/standalone" &&
				!addedToExisting
			) {
				const hasJsx = path.node.specifiers?.some(
					(s) =>
						s.type === "ImportSpecifier" &&
						s.imported.type === "Identifier" &&
						s.imported.name === "jsx",
				);
				if (!hasJsx) {
					path.node.specifiers = path.node.specifiers || [];
					path.node.specifiers.push(j.importSpecifier(j.identifier("jsx")));
				}
				addedToExisting = true;
			}
		});

		if (!addedToExisting) {
			const importDecl = j.importDeclaration(
				[j.importSpecifier(j.identifier("jsx"))],
				j.literal("@b9g/crank/standalone"),
			);

			const body = root.get().node.program.body;
			const firstImport = body.findIndex(
				(n: any) => n.type === "ImportDeclaration",
			);
			if (firstImport >= 0) {
				body.splice(firstImport, 0, importDecl);
			} else {
				body.unshift(importDecl);
			}
		}
	}

	return root.toSource({quote: "double"});
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

			attributes.push(
				j.jsxAttribute(j.jsxIdentifier(prop.name), attrValue),
			);
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
 * Transform tagged template literals back to JSX (jscodeshift transform)
 */
export function templateToJsxTransform(
	fileInfo: FileInfo,
	api: API,
): string | null {
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

		try {
			const parseResult = parse(spans);
			const {element, targets} = parseResult;

			for (let i = 0; i < expressions.length; i++) {
				const target = targets[i];
				if (target && target.type !== "error") {
					target.value = expressions[i];
				}
			}

			const jsxNode = parseElementToJSX(j, element, expressions);
			j(path).replaceWith(jsxNode);
		} catch (e) {
			console.warn("Failed to parse template:", e);
		}
	});

	return root.toSource({quote: "double"});
}

/**
 * Convert JSX code to tagged template syntax
 */
export function jsxToTemplate(code: string): string {
	const j = jscodeshift.withParser("tsx");
	const result = jsxToTemplateTransform(
		{source: code, path: "input.tsx"},
		{
			jscodeshift: j,
			j,
			stats: () => {},
			report: () => {},
		} as API,
	);
	return result || code;
}

/**
 * Convert tagged template syntax to JSX code
 */
export function templateToJsx(code: string): string {
	const j = jscodeshift.withParser("tsx");
	const result = templateToJsxTransform(
		{source: code, path: "input.tsx"},
		{
			jscodeshift: j,
			j,
			stats: () => {},
			report: () => {},
		} as API,
	);
	return result || code;
}
