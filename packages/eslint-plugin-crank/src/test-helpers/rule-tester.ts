import {RuleTester} from "eslint";
import * as tsParser from "@typescript-eslint/parser";

// Override RuleTester's internal describe/it to avoid nesting issues with the
// test runner. bun:test (and @b9g/libuild/test) do not allow describe() inside
// it(), but RuleTester.run() calls this.constructor.describe/it internally.
// Bypassing them makes RuleTester run assertions synchronously within the
// outer it() block.
(RuleTester as any).describe = function (_text: string, fn: () => void) {
	fn();
};
(RuleTester as any).it = function (_text: string, fn: () => void) {
	fn();
};

/**
 * Creates a RuleTester configured for TypeScript with JSX support
 */
export function createTsRuleTester(): RuleTester {
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
