import {Rule} from "eslint";
import {ESLintNode} from "../utils/types.js";

// Deprecated prefixes for special props
const DEPRECATED_PREFIXES = ["crank-", "c-", "$"];

// Special prop bases and their modern equivalents
const SPECIAL_PROP_BASES: Record<string, string> = {
	key: "key",
	ref: "ref",
	copy: "copy",
	static: "copy",
};

export const noDeprecatedSpecialProps: Rule.RuleModule = {
	meta: {
		type: "problem",
		docs: {
			description:
				"Disallow deprecated special prop syntax (crank-key, c-ref, $copy, static, etc.) - use unprefixed props instead",
			category: "Best Practices",
			recommended: true,
		},
		fixable: "code",
		schema: [],
		messages: {
			useModernProp:
				"'{{deprecated}}' is deprecated. Use '{{modern}}' instead.",
		},
	},

	create(context) {
		return {
			JSXAttribute(node: ESLintNode) {
				if (node.name.type !== "JSXIdentifier") {
					return;
				}

				const propName: string = node.name.name;

				// Check for bare "static" prop
				if (propName === "static") {
					context.report({
						node: node.name,
						messageId: "useModernProp",
						data: {deprecated: "static", modern: "copy"},
						fix(fixer) {
							return fixer.replaceText(node.name, "copy");
						},
					});
					return;
				}

				// Check for prefixed special props
				for (const prefix of DEPRECATED_PREFIXES) {
					if (propName.startsWith(prefix)) {
						const base = propName.slice(prefix.length);
						if (base in SPECIAL_PROP_BASES) {
							const modern = SPECIAL_PROP_BASES[base];
							context.report({
								node: node.name,
								messageId: "useModernProp",
								data: {deprecated: propName, modern},
								fix(fixer) {
									return fixer.replaceText(node.name, modern);
								},
							});
							return;
						}
					}
				}
			},
		};
	},
};
