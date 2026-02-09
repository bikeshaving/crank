import {SourceCode} from "eslint";
import type {ESLintNode} from "./types";

/**
 * Check if a statement is a final action in its scope (before return, throw, or end of block)
 */
export function isFinalAction(node: ESLintNode): boolean {
	if (!node.parent) return false;

	// If the node is a CallExpression, we need to check if its parent ExpressionStatement
	// is the final action in its block
	let statementNode = node;
	if (
		node.type === "CallExpression" &&
		node.parent.type === "ExpressionStatement"
	) {
		statementNode = node.parent;
	}

	const parent = statementNode.parent;

	// Check if this is the last statement in a block or followed by return/throw
	if (parent.type === "BlockStatement") {
		const statements = parent.body;
		const currentIndex = statements.indexOf(statementNode);

		// Check if this is the last statement
		const lastStatement = statements[statements.length - 1];
		if (lastStatement === statementNode) {
			return true;
		}

		// Check if the next sibling is a return or throw
		if (currentIndex >= 0 && currentIndex < statements.length - 1) {
			const nextStatement = statements[currentIndex + 1];
			return (
				nextStatement.type === "ReturnStatement" ||
				nextStatement.type === "ThrowStatement"
			);
		}
	}

	return false;
}

/**
 * Check if a node is inside a callback function (arrow function, function expression, etc.)
 */
export function isInsideCallback(node: ESLintNode): boolean {
	let current = node.parent;
	while (current) {
		if (
			current.type === "ArrowFunctionExpression" ||
			current.type === "FunctionExpression" ||
			current.type === "FunctionDeclaration"
		) {
			// Don't count generator functions as callbacks
			if (current.generator) {
				current = current.parent;
				continue;
			}
			return true;
		}
		current = current.parent;
	}
	return false;
}

/**
 * Get the source code text for a node
 */
export function getNodeText(node: ESLintNode, sourceCode: SourceCode): string {
	return sourceCode.getText(node);
}

/**
 * Generic AST traversal utility.
 * Recursively visits all nodes in the AST tree, skipping parent references.
 */
export function traverseAST(
	node: ESLintNode,
	visitor: (node: ESLintNode) => void,
): void {
	if (!node) return;

	visitor(node);

	// Recursively traverse all properties
	for (const key in node) {
		if (
			key !== "parent" &&
			typeof node[key] === "object" &&
			node[key] !== null
		) {
			if (Array.isArray(node[key])) {
				node[key].forEach((item: any) => traverseAST(item, visitor));
			} else {
				traverseAST(node[key], visitor);
			}
		}
	}
}

/**
 * Check if a node is a reference to a context variable (this or a specific identifier)
 */
export function isContextReference(
	node: ESLintNode,
	contextVar: string | null,
): boolean {
	if (node.type === "ThisExpression") {
		return true;
	}
	if (contextVar && node.type === "Identifier" && node.name === contextVar) {
		return true;
	}
	return false;
}

/**
 * Check if a node is a this.method() call pattern
 * Returns the method name if it matches, null otherwise
 */
export function isThisMethodCall(
	node: ESLintNode,
	methodNames: string | string[],
): string | null {
	if (
		node.type === "CallExpression" &&
		node.callee.type === "MemberExpression" &&
		node.callee.object.type === "ThisExpression" &&
		node.callee.property.type === "Identifier"
	) {
		const methodName = node.callee.property.name;
		const names = Array.isArray(methodNames) ? methodNames : [methodNames];
		if (names.includes(methodName)) {
			return methodName;
		}
	}
	return null;
}

/**
 * Check if a node is a function node (any type of function)
 */
export function isFunctionNode(node: ESLintNode): boolean {
	return (
		node.type === "ArrowFunctionExpression" ||
		node.type === "FunctionExpression" ||
		node.type === "FunctionDeclaration"
	);
}

/**
 * Find the nearest containing function by traversing up the parent chain
 * @param includeGenerators - Whether to include generator functions (default: true)
 */
export function findContainingFunction(
	node: ESLintNode,
	options: {includeGenerators?: boolean} = {},
): ESLintNode | null {
	const {includeGenerators = true} = options;
	let current = node.parent;
	while (current) {
		if (isFunctionNode(current)) {
			if (!includeGenerators && current.generator) {
				current = current.parent;
				continue;
			}
			return current;
		}
		current = current.parent;
	}
	return null;
}

/**
 * Find an ancestor node that matches a predicate
 * @param stopCondition - Optional condition that stops the traversal when met
 */
export function findAncestor(
	node: ESLintNode,
	predicate: (node: ESLintNode) => boolean,
	stopCondition?: (node: ESLintNode) => boolean,
): ESLintNode | null {
	let current = node.parent;
	while (current) {
		if (stopCondition && stopCondition(current)) {
			return null;
		}
		if (predicate(current)) {
			return current;
		}
		current = current.parent;
	}
	return null;
}

/**
 * Get the variable name that a value is assigned to
 * Handles both variable declarations (const x = ...) and assignments (x = ...)
 */
export function getAssignedVariableName(node: ESLintNode): string | null {
	const parent = node.parent;
	if (!parent) return null;

	// Variable declaration: const x = ...
	if (parent.type === "VariableDeclarator" && parent.id.type === "Identifier") {
		return parent.id.name;
	}

	// Assignment expression: x = ...
	if (
		parent.type === "AssignmentExpression" &&
		parent.left.type === "Identifier"
	) {
		return parent.left.name;
	}

	return null;
}

/**
 * Check if a call expression is a timer function (setInterval or setTimeout)
 * Returns the timer type if it matches, null otherwise
 */
export function isTimerCall(node: ESLintNode): string | null {
	if (node.type === "CallExpression" && node.callee.type === "Identifier") {
		const name = node.callee.name;
		if (name === "setInterval" || name === "setTimeout") {
			return name;
		}
	}
	return null;
}

/**
 * Get the clear function name for a given timer type
 */
export function getClearFunctionForTimer(timerType: string): string {
	return timerType === "setInterval" ? "clearInterval" : "clearTimeout";
}

/**
 * Find all references to specific identifiers in a node's subtree
 */
export function findIdentifierReferences(
	node: ESLintNode,
	identifierNames: string[],
): Set<string> {
	const found = new Set<string>();
	traverseAST(node, (current) => {
		if (
			current.type === "Identifier" &&
			identifierNames.includes(current.name)
		) {
			found.add(current.name);
		}
	});
	return found;
}
