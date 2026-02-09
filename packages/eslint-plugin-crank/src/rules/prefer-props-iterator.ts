import {Rule} from "eslint";
import {
	createFunctionTracker,
	createGeneratorTrackingVisitors,
} from "../utils/function-tracker.js";
import {traverseAST} from "../utils/ast-utils.js";
import {ESLintNode} from "../utils/types.js";

export const preferPropsIterator: Rule.RuleModule = {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Prefer for ({} of this) over while(true) in generator components",
			category: "Best Practices",
			recommended: true,
		},
		fixable: "code",
		schema: [],
		messages: {
			preferPropsIterator:
				"Use 'for ({} of this)' instead of 'while (true)' to prevent infinite loops and ensure prop updates are received.",
		},
	},

	create(context) {
		const functionTracker = createFunctionTracker();
		const generatorVisitors = createGeneratorTrackingVisitors(functionTracker);

		function findPropAccess(
			node: ESLintNode,
			usedProps: Set<string>,
			params: string[],
		): void {
			traverseAST(node, (current) => {
				if (current.type === "Identifier" && params.includes(current.name)) {
					usedProps.add(current.name);
				}
			});
		}

		return {
			...generatorVisitors,

			WhileStatement(node) {
				const currentFunction = functionTracker.getCurrentFunction();
				if (
					currentFunction &&
					currentFunction.isGenerator &&
					node.test.type === "Literal" &&
					node.test.value === true
				) {
					const contextRef = currentFunction.contextVariable || "this";

					const usedProps = new Set<string>();
					findPropAccess(node.body, usedProps, currentFunction.params);

					const destructuringPattern =
						usedProps.size > 0
							? `{ ${Array.from(usedProps).join(", ")} }`
							: "{}";

					context.report({
						node,
						messageId: "preferPropsIterator",
						fix: (fixer) => {
							const sourceCode = context.getSourceCode();
							const bodyText = sourceCode.getText(node.body);
							return fixer.replaceText(
								node,
								`for (${destructuringPattern} of ${contextRef}) ${bodyText}`,
							);
						},
					});
				}
			},
		};
	},
};
