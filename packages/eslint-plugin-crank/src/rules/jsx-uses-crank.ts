// Marks Crank pragma imports as used when JSX is present.
// Only needed with the classic JSX transform (not the automatic runtime).
// Adapted from eslint-plugin-react's jsx-uses-react.
// Original: Copyright (c) 2014 Yannick Croissant, MIT License
// https://github.com/jsx-eslint/eslint-plugin-react

import {Rule} from "eslint";
import {ESLintNode} from "../utils/types.js";

const CRANK_IDENTIFIERS = ["createElement", "Crank"];

export const jsxUsesCrank: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Prevent Crank pragma imports from being marked as unused when JSX is present (classic transform only)",
			category: "Best Practices",
			recommended: false,
		},
		schema: [],
	},

	create(context) {
		return {
			JSXOpeningElement(_node: ESLintNode) {
				for (const name of CRANK_IDENTIFIERS) {
					const sourceCode = context.sourceCode || context.getSourceCode();
					(sourceCode as any).markVariableAsUsed(name, _node);
				}
			},
			JSXOpeningFragment(_node: ESLintNode) {
				for (const name of CRANK_IDENTIFIERS) {
					const sourceCode = context.sourceCode || context.getSourceCode();
					(sourceCode as any).markVariableAsUsed(name, _node);
				}
			},
		};
	},
};
