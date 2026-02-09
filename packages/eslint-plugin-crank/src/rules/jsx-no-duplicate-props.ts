// Adapted from eslint-plugin-react's jsx-no-duplicate-props
// Original: Copyright (c) 2014 Yannick Croissant, MIT License
// https://github.com/jsx-eslint/eslint-plugin-react

import {Rule} from "eslint";
import {ESLintNode} from "../utils/types.js";

export const jsxNoDuplicateProps: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow duplicate properties in JSX",
			category: "Possible Errors",
			recommended: true,
		},
		schema: [
			{
				type: "object",
				properties: {
					ignoreCase: {type: "boolean"},
				},
				additionalProperties: false,
			},
		],
		messages: {
			noDuplicateProps: "No duplicate props allowed.",
		},
	},

	create(context) {
		const config = context.options[0] || {};
		const ignoreCase = config.ignoreCase || false;

		return {
			JSXOpeningElement(node: ESLintNode) {
				const props: Record<string, boolean> = {};

				for (const decl of node.attributes) {
					if (decl.type === "JSXSpreadAttribute") continue;
					let name = decl.name?.name;
					if (typeof name !== "string") continue;
					if (ignoreCase) name = name.toLowerCase();

					if (props[name]) {
						context.report({node: decl, messageId: "noDuplicateProps"});
					} else {
						props[name] = true;
					}
				}
			},
		};
	},
};
