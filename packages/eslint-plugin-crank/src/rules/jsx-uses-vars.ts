// Adapted from eslint-plugin-react's jsx-uses-vars
// Original: Copyright (c) 2014 Yannick Croissant, MIT License
// https://github.com/jsx-eslint/eslint-plugin-react

import { Rule } from "eslint";
import { ESLintNode } from "../utils/types.js";

const isTagName = (name: string) => /^[a-z]/.test(name);

export const jsxUsesVars: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevent variables used in JSX from being incorrectly marked as unused",
      category: "Best Practices",
      recommended: true,
    },
    schema: [],
  },

  create(context) {
    return {
      JSXOpeningElement(node: ESLintNode) {
        let name: string | undefined;

        if (node.name.namespace) {
          return;
        }

        if (node.name.name) {
          name = node.name.name;
          if (isTagName(name!)) return;
        } else if (node.name.object) {
          let parent = node.name.object;
          while (parent.object) {
            parent = parent.object;
          }
          name = parent.name;
        } else {
          return;
        }

        if (name) {
          const sourceCode = context.sourceCode || context.getSourceCode();
          (sourceCode as any).markVariableAsUsed(name, node);
        }
      },
    };
  },
};
