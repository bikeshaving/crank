import {describe, it} from "bun:test";
import {jsxNoUndef} from "./jsx-no-undef.js";
import {createJsRuleTester} from "../test-helpers/rule-tester.js";

const ruleTester = createJsRuleTester();

describe("jsx-no-undef", () => {
	it("should allow defined components", () => {
		ruleTester.run("jsx-no-undef", jsxNoUndef, {
			valid: [
				{code: `var App = () => {}; <App />`},
				{code: `function Foo() {} <Foo />`},
				{code: `var Foo = 1; <Foo.Bar />`},
				// Native elements are always fine
				{code: `<div />`},
				{code: `<span>text</span>`},
				{code: `<input type="text" />`},
			],
			invalid: [],
		});
	});

	it("should detect undefined components", () => {
		ruleTester.run("jsx-no-undef", jsxNoUndef, {
			valid: [],
			invalid: [
				{
					code: `<App />`,
					errors: [
						{
							messageId: "undefined",
							data: {identifier: "App"},
						},
					],
				},
				{
					code: `<Foo.Bar />`,
					errors: [
						{
							messageId: "undefined",
							data: {identifier: "Foo"},
						},
					],
				},
			],
		});
	});
});
