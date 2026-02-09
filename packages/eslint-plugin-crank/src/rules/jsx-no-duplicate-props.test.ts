import {describe, it} from "vitest";
import {jsxNoDuplicateProps} from "./jsx-no-duplicate-props.js";
import {createJsRuleTester} from "../test-helpers/rule-tester.js";

const ruleTester = createJsRuleTester();

describe("jsx-no-duplicate-props", () => {
	it("should detect duplicate props", () => {
		ruleTester.run("jsx-no-duplicate-props", jsxNoDuplicateProps, {
			valid: [
				{code: `<div id="a" class="b" />`},
				{code: `<div onclick={handler} class="btn" />`},
				{code: `<input type="text" value={val} />`},
				{code: `<div {...props} class="extra" />`},
			],
			invalid: [
				{
					code: `<div class="a" class="b" />`,
					errors: [{messageId: "noDuplicateProps"}],
				},
				{
					code: `<div id="x" onclick={a} id="y" />`,
					errors: [{messageId: "noDuplicateProps"}],
				},
				{
					code: `<div class="a" id="b" class="c" id="d" />`,
					errors: [
						{messageId: "noDuplicateProps"},
						{messageId: "noDuplicateProps"},
					],
				},
			],
		});
	});

	it("should support ignoreCase option", () => {
		ruleTester.run("jsx-no-duplicate-props", jsxNoDuplicateProps, {
			valid: [],
			invalid: [
				{
					code: `<div data-foo="a" data-FOO="b" />`,
					options: [{ignoreCase: true}],
					errors: [{messageId: "noDuplicateProps"}],
				},
			],
		});
	});
});
