import {describe, it} from "bun:test";
import {noDeprecatedFlush} from "./no-deprecated-flush.js";
import {
	createTsRuleTester,
	createJsRuleTester,
} from "../test-helpers/rule-tester.js";

const ruleTester = createTsRuleTester();

describe("no-deprecated-flush", () => {
	it("should detect this.flush() and suggest this.after()", () => {
		ruleTester.run("no-deprecated-flush", noDeprecatedFlush, {
			valid: [
				{
					code: `
						function* Component(this: Context) {
							this.after((el) => {
								el.focus();
							});
							yield <div>Hello</div>;
						}
					`,
				},
				{
					code: `
						function* Component(this: Context) {
							this.after(() => {
								console.log("rendered");
							});
							for ({} of this) {
								yield <div>Hello</div>;
							}
						}
					`,
				},
				// Non-this flush calls should not trigger
				{
					code: `
						function test() {
							stream.flush();
						}
					`,
				},
			],
			invalid: [
				{
					code: `
						function* Component(this: Context) {
							this.flush((el) => {
								el.focus();
							});
							yield <div>Hello</div>;
						}
					`,
					output: `
						function* Component(this: Context) {
							this.after((el) => {
								el.focus();
							});
							yield <div>Hello</div>;
						}
					`,
					errors: [{messageId: "useAfter"}],
				},
				{
					code: `
						function* Component(this: Context) {
							this.flush(() => {
								console.log("rendered");
							});
							for ({} of this) {
								yield <div>Hello</div>;
							}
						}
					`,
					output: `
						function* Component(this: Context) {
							this.after(() => {
								console.log("rendered");
							});
							for ({} of this) {
								yield <div>Hello</div>;
							}
						}
					`,
					errors: [{messageId: "useAfter"}],
				},
			],
		});
	});

	it("should work with JavaScript", () => {
		const jsRuleTester = createJsRuleTester();

		jsRuleTester.run("no-deprecated-flush", noDeprecatedFlush, {
			valid: [
				{
					code: `
						function* Component() {
							this.after((el) => el.focus());
							yield <div>Hello</div>;
						}
					`,
				},
			],
			invalid: [
				{
					code: `
						function* Component() {
							this.flush((el) => el.focus());
							yield <div>Hello</div>;
						}
					`,
					output: `
						function* Component() {
							this.after((el) => el.focus());
							yield <div>Hello</div>;
						}
					`,
					errors: [{messageId: "useAfter"}],
				},
			],
		});
	});

	it("should detect flush() on an aliased context (the helper-function idiom)", () => {
		ruleTester.run("no-deprecated-flush", noDeprecatedFlush, {
			valid: [
				// not a context — must not flag unrelated .flush()
				{code: "stream.flush();"},
				{code: "buffer.flush();"},
				{code: "writer.flush(data);"},
			],
			invalid: [
				{
					code: "function useThing(_this) { _this.flush(cb); }",
					output: "function useThing(_this) { _this.after(cb); }",
					errors: [{messageId: "useAfter"}],
				},
				{
					code: "function useThing(ctx) { ctx.flush(cb); }",
					output: "function useThing(ctx) { ctx.after(cb); }",
					errors: [{messageId: "useAfter"}],
				},
				{
					code: "function useThing(context) { context.flush(cb); }",
					output: "function useThing(context) { context.after(cb); }",
					errors: [{messageId: "useAfter"}],
				},
			],
		});
	});
});
