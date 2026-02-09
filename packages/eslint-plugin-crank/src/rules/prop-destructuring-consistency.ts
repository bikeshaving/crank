import { Rule } from "eslint";
import {
  createFunctionTracker,
  createGeneratorTrackingVisitors,
} from "../utils/function-tracker.js";
import { traverseAST } from "../utils/ast-utils.js";
import { ESLintNode } from "../utils/types.js";

export const propDestructuringConsistency: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Ensure props accessed in loop body are destructured in the for...of pattern",
      category: "Best Practices",
      recommended: true,
    },
    fixable: "code",
    schema: [],
    messages: {
      extractPropsFromContext:
        "Extract '{{propName}}' from the context in the for loop to ensure the component responds to prop changes.",
    },
  },

  create(context) {
    const functionTracker = createFunctionTracker();
    const generatorVisitors = createGeneratorTrackingVisitors(functionTracker);

    function findPropAccess(
      node: ESLintNode,
      usedProps: Set<string>,
      params: string[]
    ): void {
      traverseAST(node, (current) => {
        if (current.type === "Identifier" && params.includes(current.name)) {
          usedProps.add(current.name);
        }
      });
    }

    return {
      ...generatorVisitors,

      ForOfStatement(node) {
        const currentFunction = functionTracker.getCurrentFunction();
        if (!currentFunction || !currentFunction.isGenerator) {
          return;
        }

        const contextRef = currentFunction.contextVariable || "this";

        const isContextLoop =
          node.right.type === "ThisExpression" ||
          (node.right.type === "Identifier" && node.right.name === contextRef);

        if (!isContextLoop) {
          return;
        }

        if (node.left.type !== "ObjectPattern") {
          return;
        }

        const loopBody = node.body;

        const usedProps = new Set<string>();
        findPropAccess(loopBody, usedProps, currentFunction.params);

        const destructuredProps = new Set<string>();
        for (const prop of node.left.properties) {
          if (prop.type === "Property" && prop.key.type === "Identifier") {
            destructuredProps.add(prop.key.name);
          }
        }

        const missingProps = Array.from(usedProps).filter(
          (prop) => !destructuredProps.has(prop)
        );

        if (missingProps.length === 0) {
          return;
        }

        const allProps = [...Array.from(destructuredProps), ...missingProps];

        missingProps.forEach((propName) => {
          context.report({
            node: node.left,
            messageId: "extractPropsFromContext",
            data: { propName },
            fix: (fixer) => {
              const newLeft = `{ ${allProps.join(", ")} }`;
              return fixer.replaceText(node.left, newLeft);
            },
          });
        });
      },
    };
  },
};
