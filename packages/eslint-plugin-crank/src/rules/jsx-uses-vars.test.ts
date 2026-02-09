import {describe, it} from "vitest";
import {jsxUsesVars} from "./jsx-uses-vars.js";
import {RuleTester} from "eslint";

// We need to test this rule in combination with no-unused-vars.
// jsx-uses-vars marks component references as used so no-unused-vars
// doesn't flag them.
const ruleTester = new RuleTester({
	languageOptions: {
		ecmaVersion: 2022,
		sourceType: "module",
		parserOptions: {
			ecmaFeatures: {jsx: true},
		},
	},
});

describe("jsx-uses-vars", () => {
	it("should mark component variables as used", () => {
		ruleTester.run("jsx-uses-vars", jsxUsesVars, {
			valid: [
				// Component used in JSX — should not trigger
				{code: `var App = 1; <App />`},
				// Member expression — marks the root object as used
				{code: `var Foo = 1; <Foo.Bar />`},
				// Nested member expression
				{code: `var Foo = 1; <Foo.Bar.Baz />`},
			],
			invalid: [],
		});
	});

	it("should not mark native elements", () => {
		ruleTester.run("jsx-uses-vars", jsxUsesVars, {
			valid: [
				// Lowercase tags are native elements, rule should not mark them
				{code: `<div />`},
				{code: `<span>text</span>`},
			],
			invalid: [],
		});
	});
});
