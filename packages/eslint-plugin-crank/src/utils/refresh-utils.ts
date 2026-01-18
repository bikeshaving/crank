import type { ESLintNode } from "./types";
import { traverseAST } from "./ast-utils.js";

/**
 * Check if a call expression is a refresh() call on a context object
 */
export function isRefreshCall(
  node: ESLintNode,
  contextVar: string | null = null
): boolean {
  if (node.type !== "CallExpression") return false;

  if (node.callee.type === "MemberExpression") {
    const object = node.callee.object;
    const property = node.callee.property;

    // Check if it's a refresh() call
    if (property.type === "Identifier" && property.name === "refresh") {
      // Check if the object is 'this' or matches the context variable
      if (object.type === "ThisExpression") {
        return true;
      }
      if (
        contextVar &&
        object.type === "Identifier" &&
        object.name === contextVar
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if a refresh call has no arguments
 */
export function isRefreshCallWithoutArgs(node: ESLintNode): boolean {
  return (
    isRefreshCall(node) &&
    node.type === "CallExpression" &&
    node.arguments.length === 0
  );
}

/**
 * Find all refresh calls in a node tree
 */
export function findRefreshCalls(
  node: ESLintNode,
  contextVar: string | null = null
): ESLintNode[] {
  const refreshCalls: ESLintNode[] = [];

  traverseAST(node, (current) => {
    if (isRefreshCall(current, contextVar)) {
      refreshCalls.push(current);
    }
  });

  return refreshCalls;
}
