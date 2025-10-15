import { Rule } from "eslint";
import {
  createFunctionTracker,
  createGeneratorTrackingVisitors,
} from "../utils/function-tracker.js";
import { ESLintNode } from "../utils/types.js";
import {
  isTimerCall,
  getClearFunctionForTimer,
  getAssignedVariableName,
} from "../utils/ast-utils.js";

export const requireCleanupForTimers: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Detect setInterval/setTimeout in generator components without corresponding this.cleanup()",
      category: "Possible Errors",
      recommended: true,
    },
    schema: [],
    messages: {
      missingCleanup:
        "{{timerType}} used without a corresponding this.cleanup() call. This can cause memory leaks. Store the timer ID and clear it in a cleanup callback.",
      missingClearInCleanup:
        "Timer ID '{{timerVar}}' is not cleared in this.cleanup(). Call {{clearFunction}}({{timerVar}}) to prevent memory leaks.",
    },
  },

  create(context) {
    const functionTracker = createFunctionTracker();
    const generatorVisitors = createGeneratorTrackingVisitors(functionTracker);

    // Track timers created in each generator function
    const timersByFunction = new Map<
      ESLintNode,
      Array<{ node: ESLintNode; type: string; variable: string | null }>
    >();
    // Track cleanup calls in each generator function
    const cleanupCallsByFunction = new Map<ESLintNode, Set<ESLintNode>>();

    /**
     * Check if a call expression is this.cleanup()
     */
    function isCleanupCall(node: ESLintNode): boolean {
      return (
        node.type === "CallExpression" &&
        node.callee.type === "MemberExpression" &&
        node.callee.object.type === "ThisExpression" &&
        node.callee.property.type === "Identifier" &&
        node.callee.property.name === "cleanup"
      );
    }

    /**
     * Check if a cleanup callback clears the given timer variable
     */
    function cleanupCallbackClearsTimer(
      cleanupNode: ESLintNode,
      timerVariable: string,
      timerType: string
    ): boolean {
      if (!cleanupNode.arguments || cleanupNode.arguments.length === 0) {
        return false;
      }

      const cleanupCallback = cleanupNode.arguments[0];
      if (
        cleanupCallback.type !== "ArrowFunctionExpression" &&
        cleanupCallback.type !== "FunctionExpression"
      ) {
        return false;
      }

      const clearFunction = getClearFunctionForTimer(timerType);

      // Walk through the cleanup callback to find clear calls
      return checkNodeForClearCall(cleanupCallback.body, timerVariable, clearFunction);
    }

    /**
     * Recursively check if a node contains a clear call for the timer
     */
    function checkNodeForClearCall(
      node: any,
      timerVariable: string,
      clearFunction: string
    ): boolean {
      if (!node) return false;

      // Check if this is a clear call
      if (
        node.type === "CallExpression" &&
        node.callee.type === "Identifier" &&
        node.callee.name === clearFunction &&
        node.arguments &&
        node.arguments.length > 0 &&
        node.arguments[0].type === "Identifier" &&
        node.arguments[0].name === timerVariable
      ) {
        return true;
      }

      // Check block statements
      if (node.type === "BlockStatement" && node.body) {
        return node.body.some((stmt: any) =>
          checkNodeForClearCall(stmt, timerVariable, clearFunction)
        );
      }

      // Check expression statements
      if (node.type === "ExpressionStatement" && node.expression) {
        return checkNodeForClearCall(node.expression, timerVariable, clearFunction);
      }

      return false;
    }

    /**
     * Check if any cleanup call in the function clears the timer
     */
    function hasCleanupForTimer(
      generatorFunc: ESLintNode,
      timerVariable: string | null,
      timerType: string
    ): boolean {
      const cleanupCalls = cleanupCallsByFunction.get(generatorFunc);
      if (!cleanupCalls || cleanupCalls.size === 0) {
        return false;
      }

      // If we don't know the variable name, we can't verify cleanup
      if (!timerVariable) {
        // Check if there's at least one cleanup call
        return cleanupCalls.size > 0;
      }

      // Check if any cleanup call clears this specific timer
      for (const cleanupCall of cleanupCalls) {
        if (cleanupCallbackClearsTimer(cleanupCall, timerVariable, timerType)) {
          return true;
        }
      }

      return false;
    }

    return {
      ...generatorVisitors,

      CallExpression(node) {
        const currentFunction = functionTracker.getCurrentFunction();

        // Track timer calls in generator functions
        const timerType = isTimerCall(node);
        if (timerType && currentFunction) {
          const timerVariable = getAssignedVariableName(node);

          if (!timersByFunction.has(currentFunction.node)) {
            timersByFunction.set(currentFunction.node, []);
          }

          timersByFunction.get(currentFunction.node)!.push({
            node,
            type: timerType,
            variable: timerVariable,
          });
        }

        // Track cleanup calls in generator functions
        if (isCleanupCall(node) && currentFunction) {
          if (!cleanupCallsByFunction.has(currentFunction.node)) {
            cleanupCallsByFunction.set(currentFunction.node, new Set());
          }
          cleanupCallsByFunction.get(currentFunction.node)!.add(node);
        }
      },

      "FunctionDeclaration:exit"(node) {
        checkFunctionForTimerCleanup(node);
      },

      "FunctionExpression:exit"(node) {
        checkFunctionForTimerCleanup(node);
      },

      "ArrowFunctionExpression:exit"(node) {
        checkFunctionForTimerCleanup(node);
      },
    };

    function checkFunctionForTimerCleanup(node: ESLintNode) {
      // Only check generator functions
      if (!node.generator) return;

      const timers = timersByFunction.get(node);
      if (!timers || timers.length === 0) return;

      const cleanupCalls = cleanupCallsByFunction.get(node);

      for (const timer of timers) {
        if (!hasCleanupForTimer(node, timer.variable, timer.type)) {
          // If we know the variable name, give a more specific error
          if (timer.variable && cleanupCalls && cleanupCalls.size > 0) {
            context.report({
              node: timer.node,
              messageId: "missingClearInCleanup",
              data: {
                timerVar: timer.variable,
                clearFunction: getClearFunctionForTimer(timer.type),
              },
            });
          } else {
            context.report({
              node: timer.node,
              messageId: "missingCleanup",
              data: {
                timerType: timer.type,
              },
            });
          }
        }
      }
    }
  },
};
