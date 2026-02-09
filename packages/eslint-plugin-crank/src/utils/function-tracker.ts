import type {ESLintNode} from "./types";
import {extractCrankParams} from "./param-utils.js";

export interface CrankFunctionContext {
	isGenerator: boolean;
	contextVariable: string | null;
	params: string[];
	node: ESLintNode;
}

export interface FunctionTracker {
	getCurrentFunction: () => CrankFunctionContext | null;
	setCurrentFunction: (func: CrankFunctionContext | null) => void;
	clearCurrentFunction: () => void;
}

/**
 * Check if a function could be a generator component.
 * Those are the ones our rules are interested in, as they are the ones that involve
 * dynamic state changes.
 */
export function isGeneratorComponent(node: ESLintNode): boolean {
	return (
		(node.type === "FunctionDeclaration" ||
			node.type === "FunctionExpression" ||
			node.type === "ArrowFunctionExpression") &&
		node.generator === true
	);
}

/**
 * Create a function context tracker for ESLint rules
 */
export function createFunctionTracker(): FunctionTracker {
	let currentFunction: CrankFunctionContext | null = null;

	return {
		getCurrentFunction: () => currentFunction,
		setCurrentFunction: (func: CrankFunctionContext | null) => {
			currentFunction = func;
		},
		clearCurrentFunction: () => {
			currentFunction = null;
		},
	};
}

/**
 * Create ESLint visitors for tracking generator function context.
 * This generates the boilerplate enter/exit handlers for function nodes.
 */
export function createGeneratorTrackingVisitors(
	functionTracker: FunctionTracker,
) {
	const handleFunctionEnter = (node: ESLintNode) => {
		if (isGeneratorComponent(node)) {
			const {props, contextVar} = extractCrankParams(node.params);
			functionTracker.setCurrentFunction({
				isGenerator: true,
				contextVariable: contextVar,
				params: props,
				node,
			});
		}
	};

	const handleFunctionExit = (node: ESLintNode) => {
		// Only clear the current function if we're exiting a generator function
		if (isGeneratorComponent(node)) {
			functionTracker.clearCurrentFunction();
		}
	};

	return {
		FunctionDeclaration: handleFunctionEnter,
		FunctionExpression: handleFunctionEnter,
		ArrowFunctionExpression: handleFunctionEnter,
		"FunctionDeclaration:exit": handleFunctionExit,
		"FunctionExpression:exit": handleFunctionExit,
		"ArrowFunctionExpression:exit": handleFunctionExit,
	};
}
