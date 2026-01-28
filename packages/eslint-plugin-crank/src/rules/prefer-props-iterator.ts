import { Rule } from "eslint";
import {
  createFunctionTracker,
  createGeneratorTrackingVisitors,
} from "../utils/function-tracker.js";
import { traverseAST } from "../utils/ast-utils.js";
import { ESLintNode } from "../utils/types.js";

export const preferPropsIterator: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Prefer for ({} of this) over while(true) and ensure props are extracted from context",
      category: "Best Practices",
      recommended: true,
    },
    fixable: "code",
    hasSuggestions: true,
    schema: [],
    messages: {
      preferPropsIterator:
        "Use 'for ({} of this)' instead of 'while (true)' to prevent infinite loops and ensure prop updates are received.",
      extractPropsFromContext:
        "Extract '{{propName}}' from the context in the for loop to ensure the component responds to prop changes.",
      useContextVariable:
        "Use '{{contextVar}}' instead of 'this' in the for loop since the context is passed as a parameter.",
    },
  },

  create(context) {
    const functionTracker = createFunctionTracker();
    const generatorVisitors = createGeneratorTrackingVisitors(functionTracker);

    // Helper function to find prop access in AST nodes
    function findPropAccess(
      node: ESLintNode,
      usedProps: Set<string>,
      params: string[]
    ): void {
      traverseAST(node, (current) => {
        // Check if this is an identifier that matches a function parameter
        if (current.type === "Identifier" && params.includes(current.name)) {
          usedProps.add(current.name);
        }
      });
    }

    return {
      ...generatorVisitors,

      // Detect while(true) loops in generator functions
      WhileStatement(node) {
        const currentFunction = functionTracker.getCurrentFunction();
        if (
          currentFunction &&
          currentFunction.isGenerator &&
          node.test.type === "Literal" &&
          node.test.value === true
        ) {
          const contextRef = currentFunction.contextVariable || "this";

          // Analyze the loop body to find prop usage
          const usedProps = new Set<string>();
          findPropAccess(node.body, usedProps, currentFunction.params);

          // Create the destructuring pattern
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
                `for (${destructuringPattern} of ${contextRef}) ${bodyText}`
              );
            },
          });
        }
      },

      // Detect prop access inside for loops that should be extracted
      ForOfStatement(node) {
        const currentFunction = functionTracker.getCurrentFunction();
        if (!currentFunction || !currentFunction.isGenerator) {
          return;
        }

        const contextRef = currentFunction.contextVariable || "this";

        // Check if this is a for...of loop over the context (this or ctx)
        const isContextLoop =
          node.right.type === "ThisExpression" ||
          (node.right.type === "Identifier" && node.right.name === contextRef);

        if (!isContextLoop) {
          return;
        }

        // Check if the loop variable is an object pattern (destructuring)
        if (node.left.type !== "ObjectPattern") {
          return;
        }

        const loopBody = node.body;

        // Find all props accessed inside the loop body
        const usedProps = new Set<string>();
        findPropAccess(loopBody, usedProps, currentFunction.params);

        // Find props already destructured in the for loop
        const destructuredProps = new Set<string>();
        for (const prop of node.left.properties) {
          if (prop.type === "Property" && prop.key.type === "Identifier") {
            destructuredProps.add(prop.key.name);
          }
        }

        // Find props that are used but not destructured
        const missingProps = Array.from(usedProps).filter(
          (prop) => !destructuredProps.has(prop)
        );

        if (missingProps.length === 0) {
          return;
        }

        // Combine existing and missing props for the fix
        const allProps = [...Array.from(destructuredProps), ...missingProps];

        // Report missing props with auto-fix
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
