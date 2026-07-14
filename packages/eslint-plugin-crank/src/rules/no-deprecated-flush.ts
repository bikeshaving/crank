import {Rule} from "eslint";
import {ESLintNode} from "../utils/types.js";

// Crank's idiom is to pass `this` into helper functions, so a context is
// routinely held in a variable rather than being the literal `this`:
//
//   function useVirtualizer(_this: Context) { _this.flush(cb); }
//   useVirtualizer(this);
//
// Matching only ThisExpression misses every one of those. Match the names a
// context is conventionally bound to as well, without being so broad that we
// flag unrelated `.flush()` calls (streams, buffers).
const CONTEXT_NAMES = /^_*(this|ctx|context)\d*$/i;

function isContextReceiver(object: ESLintNode): boolean {
	return (
		object.type === "ThisExpression" ||
		(object.type === "Identifier" && CONTEXT_NAMES.test(object.name))
	);
}

export const noDeprecatedFlush: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Disallow use of the removed this.flush() method - use this.after() instead",
			category: "Best Practices",
			recommended: true,
		},
		fixable: "code",
		schema: [],
		messages: {
			useAfter: "'flush()' was removed. Use 'after()' instead.",
		},
	},

	create(context) {
		return {
			CallExpression(node: ESLintNode) {
				if (
					node.callee.type === "MemberExpression" &&
					node.callee.property.type === "Identifier" &&
					node.callee.property.name === "flush" &&
					isContextReceiver(node.callee.object)
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
