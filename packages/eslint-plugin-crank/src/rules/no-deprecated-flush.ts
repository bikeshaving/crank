import {Rule} from "eslint";
import {ESLintNode} from "../utils/types.js";

/**
 * Whether `this` at the node is an instance of a class or the class itself,
 * as opposed to the context of a component.
 */
function isClassThis(node: ESLintNode): boolean {
	for (let current = node.parent; current; current = current.parent) {
		if (
			current.type === "FunctionDeclaration" ||
			current.type === "FunctionExpression"
		) {
			return current.parent.type === "MethodDefinition";
		} else if (
			current.type === "PropertyDefinition" ||
			current.type === "StaticBlock"
		) {
			return true;
		}
	}

	return false;
}

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
					node.callee.property.name === "flush" &&
					!isClassThis(node)
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
