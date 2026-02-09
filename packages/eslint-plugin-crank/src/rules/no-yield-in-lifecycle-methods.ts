import { Rule } from "eslint";
import { ESLintNode } from "../utils/types.js";
import { isThisMethodCall } from "../utils/ast-utils.js";

const LIFECYCLE_METHODS = ["schedule", "after", "cleanup"];

export const noYieldInLifecycleMethods: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevent yield or return in lifecycle methods (schedule, after, cleanup)",
      category: "Possible Errors",
      recommended: true,
    },
    schema: [],
    messages: {
      noYieldInLifecycle:
        "Do not use '{{statement}}' in lifecycle method '{{method}}'. Lifecycle methods should not yield or return values as this can cause unexpected behavior.",
    },
  },

  create(context) {
    const lifecycleCallbacks = new Map<ESLintNode, string>();

    /**
     * Check if a yield or return is inside a lifecycle callback
     */
    function isInsideLifecycleCallback(node: ESLintNode): string | null {
      let current = node.parent;
      while (current) {
        if (lifecycleCallbacks.has(current)) {
          return lifecycleCallbacks.get(current) || null;
        }
        // Stop if we encounter another function boundary
        if (
          current.type === "FunctionExpression" ||
          current.type === "ArrowFunctionExpression" ||
          current.type === "FunctionDeclaration"
        ) {
          break;
        }
        current = current.parent;
      }
      return null;
    }

    return {
      CallExpression(node) {
        const lifecycleMethod = isThisMethodCall(node, LIFECYCLE_METHODS);
        if (lifecycleMethod && node.arguments && node.arguments.length > 0) {
          const firstArg = node.arguments[0];
          if (
            firstArg.type === "FunctionExpression" ||
            firstArg.type === "ArrowFunctionExpression"
          ) {
            lifecycleCallbacks.set(firstArg, lifecycleMethod);
          }
        }
      },

      YieldExpression(node) {
        const method = isInsideLifecycleCallback(node);
        if (method) {
          context.report({
            node,
            messageId: "noYieldInLifecycle",
            data: {
              statement: "yield",
              method,
            },
          });
        }
      },

      ReturnStatement(node) {
        // Only flag return statements with a value, and only in after().
        // schedule() and cleanup() can be async in 0.7, so returning
        // values (e.g. promises) from them is valid.
        if (node.argument) {
          const method = isInsideLifecycleCallback(node);
          if (method === "after") {
            context.report({
              node,
              messageId: "noYieldInLifecycle",
              data: {
                statement: "return",
                method,
              },
            });
          }
        }
      },
    };
  },
};
