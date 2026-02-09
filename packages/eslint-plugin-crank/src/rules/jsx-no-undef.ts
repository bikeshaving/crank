// Adapted from eslint-plugin-react's jsx-no-undef
// Original: Copyright (c) 2014 Yannick Croissant, MIT License
// https://github.com/jsx-eslint/eslint-plugin-react

import { Rule, Scope } from "eslint";
import { ESLintNode } from "../utils/types.js";

const isTagName = (name: string) => /^[a-z]/.test(name);

export const jsxNoUndef: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow undeclared variables in JSX",
      category: "Possible Errors",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        properties: {
          allowGlobals: { type: "boolean" },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      undefined: "'{{identifier}}' is not defined.",
    },
  },

  create(context) {
    const config = context.options[0] || {};
    const allowGlobals = config.allowGlobals || false;

    function checkIdentifierInJSX(node: ESLintNode) {
      if (node.name === "this") return;

      const sourceCode = context.sourceCode || context.getSourceCode();
      let scope: Scope.Scope = (sourceCode as any).getScope
        ? (sourceCode as any).getScope(node)
        : (context as any).getScope();
      const sourceType = sourceCode.ast?.sourceType;
      const scopeUpperBound =
        !allowGlobals && sourceType === "module" ? "module" : "global";

      let variables: Scope.Variable[] = scope.variables;

      while (scope.type !== scopeUpperBound && scope.type !== "global") {
        scope = scope.upper!;
        variables = scope.variables.concat(variables);
      }

      if (scope.childScopes.length) {
        variables = scope.childScopes[0].variables.concat(variables);
        if (scope.childScopes[0].childScopes.length) {
          variables =
            scope.childScopes[0].childScopes[0].variables.concat(variables);
        }
      }

      for (const variable of variables) {
        if (variable.name === node.name) return;
      }

      context.report({
        node,
        messageId: "undefined",
        data: { identifier: node.name },
      });
    }

    return {
      JSXOpeningElement(node: ESLintNode) {
        switch (node.name.type) {
          case "JSXIdentifier":
            if (isTagName(node.name.name)) return;
            checkIdentifierInJSX(node.name);
            break;
          case "JSXMemberExpression": {
            let current = node.name;
            while (current.object) {
              current = current.object;
            }
            checkIdentifierInJSX(current);
            break;
          }
          case "JSXNamespacedName":
            return;
        }
      },
    };
  },
};
