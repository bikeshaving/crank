import {RuleTester} from "eslint";
import {createRequire} from "module";

/**
 * Creates a RuleTester configured for TypeScript with JSX support
 */
export function createTsRuleTester(): RuleTester {
	const require = createRequire(import.meta.url);
	const tsParser = require("@typescript-eslint/parser");

	return new RuleTester({
		languageOptions: {
			parser: tsParser,
			ecmaVersion: 2022,
			sourceType: "module",
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
	});
}

/**
 * Creates a RuleTester configured for JavaScript with JSX support
 */
export function createJsRuleTester(): RuleTester {
	return new RuleTester({
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "module",
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
	});
}
