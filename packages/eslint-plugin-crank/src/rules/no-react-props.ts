import {Rule} from "eslint";
import {ESLintNode} from "../utils/types.js";
import {
	createConditionalJSXAttributeMapper,
	isNativeElement,
} from "../utils/jsx-utils.js";

// React-specific prop names that should be converted to standard HTML attributes
const REACT_PROP_MAPPINGS: Record<string, string> = {
	className: "class",
	htmlFor: "for",
};

export const noReactProps: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Warn against using React-specific prop names (className, htmlFor, dangerouslySetInnerHTML) - Crank uses standard HTML attribute names",
			category: "Best Practices",
			recommended: true,
		},
		fixable: "code",
		schema: [],
		messages: {
			useStandardAttribute:
				"Use '{{standard}}' instead of '{{react}}' - Crank uses standard HTML attribute names",
			useinnerHTML:
				"Use 'innerHTML' instead of 'dangerouslySetInnerHTML' - Crank uses standard HTML attribute names",
		},
	},

	create(context) {
		const sourceCode = context.getSourceCode();

		// Create the mapper for simple prop replacements, only for native elements
		const handleSimpleMapping = createConditionalJSXAttributeMapper(
			REACT_PROP_MAPPINGS,
			"useStandardAttribute",
			{from: "react", to: "standard"},
			isNativeElement,
		);

		return {
			JSXAttribute(node: ESLintNode) {
				if (node.name.type !== "JSXIdentifier") {
					return;
				}

				// Only apply to native elements
				if (!isNativeElement(node)) {
					return;
				}

				const propName = node.name.name;

				// Handle className -> class and htmlFor -> for
				if (propName in REACT_PROP_MAPPINGS) {
					handleSimpleMapping(node, context);
					return;
				}

				// Handle dangerouslySetInnerHTML={{ __html: value }} -> innerHTML={value}
				if (propName === "dangerouslySetInnerHTML") {
					context.report({
						node,
						messageId: "useinnerHTML",
						fix: (fixer) => {
							// Try to extract the value from dangerouslySetInnerHTML={{ __html: value }}
							if (
								node.value &&
								node.value.type === "JSXExpressionContainer" &&
								node.value.expression.type === "ObjectExpression"
							) {
								const properties = node.value.expression.properties;
								const htmlProp = properties.find(
									(prop: any) =>
										prop.type === "Property" &&
										prop.key.type === "Identifier" &&
										prop.key.name === "__html",
								);

								if (htmlProp && htmlProp.type === "Property") {
									const valueText = sourceCode.getText(htmlProp.value);
									return fixer.replaceText(node, `innerHTML={${valueText}}`);
								}
							}

							// Fallback: just replace the attribute name
							return fixer.replaceText(node.name, "innerHTML");
						},
					});
				}
			},
		};
	},
};
