/**
 * Codemod: Convert JSX syntax to Crank's tagged template syntax.
 *
 * Usage with jscodeshift:
 *   jscodeshift -t node_modules/@b9g/crank-codemods/dist/jsx-to-template.js src/
 *
 * Programmatic usage:
 *   import { templateFromJSX } from "@b9g/crank-codemods";
 *   const templateCode = templateFromJSX(jsxCode);
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

interface SerializeResult {
	parts: string[];
	expressions: any[];
}

/**
 * If an expression is a JSX element or fragment, wrap it in a jsx`...` tagged template.
 * Otherwise, return the expression as-is.
 */
function wrapJSXExpression(
	j: JSCodeshift,
	expr: any,
	useGenericClose: boolean = true,
): any {
	if (expr.type === "JSXElement") {
		const serialized = serializeJSXElement(j, expr, useGenericClose);
		return createTaggedTemplate(j, serialized);
	} else if (expr.type === "JSXFragment") {
		const serialized = serializeJSXFragment(j, expr, useGenericClose);
		return createTaggedTemplate(j, serialized);
	}
	return expr;
}

/**
 * Create a jsx`...` tagged template expression from serialized parts/expressions.
 */
function createTaggedTemplate(
	j: JSCodeshift,
	serialized: SerializeResult,
): any {
	const {parts, expressions} = serialized;
	const templateLiteral = j.templateLiteral(
		parts.map((p, i) =>
			j.templateElement({raw: p, cooked: p}, i === parts.length - 1),
		),
		expressions,
	);
	return j.taggedTemplateExpression(j.identifier("jsx"), templateLiteral);
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
				expressions.push(
					wrapJSXExpression(j, attr.value.expression, useGenericClose),
				);
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
					expressions.push(
						wrapJSXExpression(j, child.expression, useGenericClose),
					);
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
				expressions.push(
					wrapJSXExpression(j, (child as any).expression, useGenericClose),
				);
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
				expressions.push(
					wrapJSXExpression(j, child.expression, useGenericClose),
				);
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
			expressions.push(
				wrapJSXExpression(j, (child as any).expression, useGenericClose),
			);
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
 * jscodeshift transform: Convert JSX to tagged template literals.
 * This is the default export for jscodeshift CLI compatibility.
 */
export default function transform(fileInfo: FileInfo, api: API): string | null {
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

			let {parts, expressions} = serialized;

			// If content is multi-line, add newlines and proper indentation
			const isMultiLine = parts.some((p) => p.includes("\n"));
			if (isMultiLine) {
				// Get indentation from the statement containing the JSX
				let stmtPath = path.parent;
				while (
					stmtPath &&
					!stmtPath.node.type?.endsWith("Statement") &&
					!stmtPath.node.type?.endsWith("Declaration")
				) {
					stmtPath = stmtPath.parent;
				}
				const stmtIndent = stmtPath?.node?.loc?.start?.column ?? 0;
				const contentIndent = stmtIndent + 2; // Content indented one level from statement

				parts = parts.slice();
				// Add newline + content indent at start, newline + statement indent before closing backtick
				parts[0] = "\n" + " ".repeat(contentIndent) + parts[0];
				parts[parts.length - 1] =
					parts[parts.length - 1] + "\n" + " ".repeat(stmtIndent);
			}

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

			// If JSX is wrapped in parentheses, replace the whole parenthesized expression
			// since template literals don't need parens
			if (path.parent?.node?.type === "ParenthesizedExpression") {
				j(path.parent).replaceWith(taggedTemplate);
			} else {
				j(path).replaceWith(taggedTemplate);
			}
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

	let output = root.toSource({quote: "double"});

	// Remove unnecessary parentheses around jsx`` template literals
	// Pattern: (\n  jsx`...`) -> jsx`...`
	output = output.replace(
		/\(\s*\n(\s*)(jsx`[\s\S]*?`)\s*\n\s*\)/g,
		(match, indent, template) => {
			return template;
		},
	);

	return output;
}

/**
 * Programmatic API: Convert JSX code to tagged template syntax.
 */
export function templateFromJSX(code: string): string {
	const j = jscodeshift.withParser("tsx");
	const result = transform({source: code, path: "input.tsx"}, {
		jscodeshift: j,
		j,
		stats: () => {},
		report: () => {},
	} as API);
	return result || code;
}
