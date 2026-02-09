import {Rule} from "eslint";
import {ESLintNode} from "../utils/types.js";

export const noDeprecatedFlush: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Disallow use of deprecated this.flush() method - use this.after() instead",
			category: "Best Practices",
			recommended: true,
		},
		fixable: "code",
		schema: [],
		messages: {
			useAfter: "'this.flush()' is deprecated. Use 'this.after()' instead.",
		},
	},

	create(context) {
		return {
			CallExpression(node: ESLintNode) {
				if (
					node.callee.type === "MemberExpression" &&
					node.callee.object.type === "ThisExpression" &&
					node.callee.property.type === "Identifier" &&
					node.callee.property.name === "flush"
				) {
					context.report({
						node: node.callee.property,
						messageId: "useAfter",
						fix(fixer) {
							return fixer.replaceText(node.callee.property, "after");
						},
					});
				}
			},
		};
	},
};
