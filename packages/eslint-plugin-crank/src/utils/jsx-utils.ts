import type {Rule} from "eslint";
import type {ESLintNode} from "./types";

/**
 * Creates a JSX attribute handler that maps attribute names and reports/fixes them
 * This is a common pattern used across multiple rules
 */
export function createJSXAttributeMapper(
	mappings: Record<string, string>,
	messageId: string,
	dataKeys: {from: string; to: string},
): (node: ESLintNode, context: Rule.RuleContext) => void {
	return (node: ESLintNode, context: Rule.RuleContext) => {
		if (node.name.type !== "JSXIdentifier") return;

		const propName = node.name.name;
		const mappedName = mappings[propName];

		if (!mappedName) return;

		context.report({
			node: node.name,
			messageId,
			data: {
				[dataKeys.from]: propName,
				[dataKeys.to]: mappedName,
			},
			fix: (fixer) => fixer.replaceText(node.name, mappedName),
		});
	};
}

/**
 * Checks if a JSX attribute node belongs to a native HTML element
 * Native elements have lowercase tag names (div, span, etc.)
 * Component elements have uppercase first letters (MyComponent, etc.)
 */
export function isNativeElement(attributeNode: ESLintNode): boolean {
	// Walk up to find the JSXOpeningElement
	let current = attributeNode.parent;
	while (current && current.type !== "JSXOpeningElement") {
		current = current.parent;
	}

	if (!current || current.type !== "JSXOpeningElement") {
		return false;
	}

	// Check if the element name starts with lowercase
	const elementName = current.name;
	if (elementName.type === "JSXIdentifier") {
		const name = elementName.name;
		return name.charAt(0) === name.charAt(0).toLowerCase();
	}

	// For namespaced elements (svg:circle) or member expressions (Foo.Bar),
	// they are not native elements
	return false;
}

/**
 * Creates a JSX attribute handler with an additional check condition
 * Useful when the mapping should only apply in specific contexts
 */
export function createConditionalJSXAttributeMapper(
	mappings: Record<string, string>,
	messageId: string,
	dataKeys: {from: string; to: string},
	shouldApply: (node: ESLintNode) => boolean,
): (node: ESLintNode, context: Rule.RuleContext) => void {
	return (node: ESLintNode, context: Rule.RuleContext) => {
		if (node.name.type !== "JSXIdentifier") return;
		if (!shouldApply(node)) return;

		const propName = node.name.name;
		const mappedName = mappings[propName];

		if (!mappedName) return;

		context.report({
			node: node.name,
			messageId,
			data: {
				[dataKeys.from]: propName,
				[dataKeys.to]: mappedName,
			},
			fix: (fixer) => fixer.replaceText(node.name, mappedName),
		});
	};
}
