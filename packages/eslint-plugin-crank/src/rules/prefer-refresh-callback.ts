import {Rule} from "eslint";
import {isRefreshCall, findRefreshCalls} from "../utils/refresh-utils.js";
import {
	isFinalAction,
	isInsideCallback,
	getNodeText,
	isContextReference,
} from "../utils/ast-utils.js";
import {
	createFunctionTracker,
	createGeneratorTrackingVisitors,
} from "../utils/function-tracker.js";
import {
	extractCallbackBodyWithoutRefresh,
	generateCallbackText,
	findRefreshStatementParent,
	getNodeIndentation,
} from "../utils/callback-formatters.js";
import {ESLintNode} from "../utils/types.js";

export const preferRefreshCallback: Rule.RuleModule = {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Prefer callback pattern for context.refresh() calls that are final actions in callbacks to avoid forgetting to call refresh",
			category: "Best Practices",
			recommended: true,
		},
		fixable: "code",
		hasSuggestions: true,
		schema: [],
		messages: {
			preferRefreshCallback:
				"Consider using the callback pattern: context.refresh(() => { /* your code */ }) instead of calling context.refresh() as a final action. This prevents forgetting to call refresh after state changes.",
			suggestRefreshCallback:
				"Use callback pattern: context.refresh(() => { /* your code */ })",
		},
	},

	create(context) {
		const functionTracker = createFunctionTracker();
		const generatorVisitors = createGeneratorTrackingVisitors(functionTracker);

		/**
		 * Check if the refresh call's context matches the current function's context
		 */
		function isMatchingContext(
			node: ESLintNode,
			contextVar: string | null,
		): boolean {
			if (node.callee.type !== "MemberExpression") return false;

			const object = node.callee.object;
			return isContextReference(object, contextVar);
		}

		/**
		 * Find the containing callback function for a refresh call
		 */
		function findContainingCallback(node: ESLintNode): ESLintNode | null {
			let current: any = node;

			// Walk up the AST to find the nearest non-generator function
			while (current) {
				current = current.parent;

				if (!current) return null;

				// Check if we found a function node
				if (
					current.type === "ArrowFunctionExpression" ||
					current.type === "FunctionExpression" ||
					current.type === "FunctionDeclaration"
				) {
					// Skip generator functions (these are component functions)
					if (current.generator) {
						return null;
					}
					// Found a non-generator function (callback)
					return current;
				}
			}

			return null;
		}

		/**
		 * Extract callback parameters as a formatted string
		 */
		function getCallbackParamsText(
			callbackNode: ESLintNode,
			sourceCode: Rule.RuleContext["sourceCode"],
		): string {
			if (!callbackNode.params || callbackNode.params.length === 0) {
				return "()";
			}

			const paramTexts = callbackNode.params.map((param: any) => {
				const text = getNodeText(param, sourceCode);
				// Clean up parameter text by removing extra spaces around colons
				return text.replace(/\s*:\s*/g, ": ");
			});
			return `(${paramTexts.join(", ")})`;
		}

		/**
		 * Find the parent statement node for indentation calculation
		 */
		function findParentStatement(callbackNode: ESLintNode): ESLintNode | null {
			let statementNode = callbackNode.parent;
			while (
				statementNode &&
				statementNode.type !== "VariableDeclaration" &&
				statementNode.type !== "ExpressionStatement"
			) {
				statementNode = statementNode.parent;
			}
			return statementNode;
		}

		/**
		 * Generate the suggestion fix for wrapping callback with refresh
		 */
		function createRefreshCallbackFix(
			callbackNode: ESLintNode,
			finalActionRefreshCalls: ESLintNode[],
			contextRef: string,
			sourceCode: Rule.RuleContext["sourceCode"],
		): (fixer: Rule.RuleFixer) => Rule.Fix {
			const refreshStatements = finalActionRefreshCalls
				.map((call) => findRefreshStatementParent(call))
				.filter((stmt) => stmt !== null);

			const callbackBodyText = extractCallbackBodyWithoutRefresh(
				callbackNode,
				refreshStatements,
				sourceCode,
			);

			const asyncKeyword = callbackNode.async ? "async " : "";
			const callbackParams = getCallbackParamsText(callbackNode, sourceCode);

			const statementNode = findParentStatement(callbackNode);
			const baseIndentation = statementNode
				? getNodeIndentation(statementNode, sourceCode)
				: getNodeIndentation(callbackNode, sourceCode);

			return (fixer: Rule.RuleFixer) => {
				// Check if there's a semicolon after the callback in the source
				const callbackEnd = callbackNode.range?.[1] ?? 0;
				const textAfterCallback = sourceCode
					.getText()
					.slice(callbackEnd, callbackEnd + 1);
				const hasSemicolon = textAfterCallback === ";";

				const newCallbackText = generateCallbackText(
					callbackParams,
					contextRef,
					asyncKeyword,
					callbackBodyText,
					baseIndentation,
					hasSemicolon,
				);

				// If there's a semicolon, include it in the replacement range to avoid double semicolons
				if (hasSemicolon) {
					return fixer.replaceTextRange(
						[callbackNode.range![0], callbackEnd + 1],
						newCallbackText,
					);
				}

				return fixer.replaceText(callbackNode as any, newCallbackText);
			};
		}

		return {
			...generatorVisitors,

			CallExpression(node) {
				const currentFunction = functionTracker.getCurrentFunction();
				const contextVar = currentFunction?.contextVariable || null;

				// Early returns for non-applicable cases
				if (!isRefreshCall(node, contextVar)) return;
				if (node.arguments.length > 0) return;
				if (!currentFunction) return;
				if (!isMatchingContext(node, contextVar)) return;
				if (!isInsideCallback(node)) return;

				// Find the callback containing this refresh call
				const callbackNode = findContainingCallback(node);
				if (!callbackNode) return;

				// Find all final action refresh calls in this callback
				const allRefreshCalls = findRefreshCalls(callbackNode, contextVar);
				const finalActionRefreshCalls = allRefreshCalls.filter((call) =>
					isFinalAction(call),
				);

				// Only flag if there's at least one final action refresh call
				if (finalActionRefreshCalls.length === 0) return;

				// Only flag the first final action refresh call to avoid duplicate errors
				if (finalActionRefreshCalls[0] !== node) return;

				// Generate and report the suggestion
				const sourceCode = context.getSourceCode();
				const contextRef = currentFunction.contextVariable || "this";

				context.report({
					node,
					messageId: "preferRefreshCallback",
					suggest: [
						{
							messageId: "suggestRefreshCallback",
							fix: createRefreshCallbackFix(
								callbackNode,
								finalActionRefreshCalls,
								contextRef,
								sourceCode,
							),
						},
					],
				});
			},
		};
	},
};
