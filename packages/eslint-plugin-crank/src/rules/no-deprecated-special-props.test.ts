import {describe, it} from "vitest";
import {noDeprecatedSpecialProps} from "./no-deprecated-special-props.js";
import {createJsRuleTester} from "../test-helpers/rule-tester.js";

const ruleTester = createJsRuleTester();

describe("no-deprecated-special-props", () => {
	it("should allow modern prop syntax", () => {
		ruleTester.run("no-deprecated-special-props", noDeprecatedSpecialProps, {
			valid: [
				{code: `<div key={id} />`},
				{code: `<div ref={myRef} />`},
				{code: `<div copy />`},
				{code: `<Component key={id} ref={myRef} />`},
				// Regular props should not be flagged
				{code: `<div class="foo" />`},
				{code: `<div id="bar" />`},
				{code: `<div data-crank-foo="bar" />`},
			],
			invalid: [],
		});
	});

	it("should detect bare 'static' prop", () => {
		ruleTester.run("no-deprecated-special-props", noDeprecatedSpecialProps, {
			valid: [],
			invalid: [
				{
					code: `<div static />`,
					output: `<div copy />`,
					errors: [
						{
							messageId: "useModernProp",
							data: {deprecated: "static", modern: "copy"},
						},
					],
				},
				{
					code: `<div static>{content}</div>`,
					output: `<div copy>{content}</div>`,
					errors: [{messageId: "useModernProp"}],
				},
			],
		});
	});

	it("should detect crank- prefixed props", () => {
		ruleTester.run("no-deprecated-special-props", noDeprecatedSpecialProps, {
			valid: [],
			invalid: [
				{
					code: `<Component crank-key={id} />`,
					output: `<Component key={id} />`,
					errors: [
						{
							messageId: "useModernProp",
							data: {deprecated: "crank-key", modern: "key"},
						},
					],
				},
				{
					code: `<div crank-ref={myRef} />`,
					output: `<div ref={myRef} />`,
					errors: [
						{
							messageId: "useModernProp",
							data: {deprecated: "crank-ref", modern: "ref"},
						},
					],
				},
				{
					code: `<div crank-copy />`,
					output: `<div copy />`,
					errors: [
						{
							messageId: "useModernProp",
							data: {deprecated: "crank-copy", modern: "copy"},
						},
					],
				},
				{
					code: `<div crank-static />`,
					output: `<div copy />`,
					errors: [
						{
							messageId: "useModernProp",
							data: {
								deprecated: "crank-static",
								modern: "copy",
							},
						},
					],
				},
			],
		});
	});

	it("should detect c- prefixed props", () => {
		ruleTester.run("no-deprecated-special-props", noDeprecatedSpecialProps, {
			valid: [],
			invalid: [
				{
					code: `<Component c-key={id} />`,
					output: `<Component key={id} />`,
					errors: [
						{
							messageId: "useModernProp",
							data: {deprecated: "c-key", modern: "key"},
						},
					],
				},
				{
					code: `<div c-ref={myRef} />`,
					output: `<div ref={myRef} />`,
					errors: [{messageId: "useModernProp"}],
				},
				{
					code: `<div c-static />`,
					output: `<div copy />`,
					errors: [{messageId: "useModernProp"}],
				},
			],
		});
	});

	it("should detect $ prefixed props", () => {
		ruleTester.run("no-deprecated-special-props", noDeprecatedSpecialProps, {
			valid: [],
			invalid: [
				{
					code: `<Component $key={id} />`,
					output: `<Component key={id} />`,
					errors: [
						{
							messageId: "useModernProp",
							data: {deprecated: "$key", modern: "key"},
						},
					],
				},
				{
					code: `<div $ref={myRef} />`,
					output: `<div ref={myRef} />`,
					errors: [{messageId: "useModernProp"}],
				},
				{
					code: `<div $copy />`,
					output: `<div copy />`,
					errors: [{messageId: "useModernProp"}],
				},
				{
					code: `<div $static />`,
					output: `<div copy />`,
					errors: [{messageId: "useModernProp"}],
				},
			],
		});
	});

	it("should detect multiple deprecated props on same element", () => {
		ruleTester.run("no-deprecated-special-props", noDeprecatedSpecialProps, {
			valid: [],
			invalid: [
				{
					code: `<Component crank-key={id} crank-ref={myRef} />`,
					output: `<Component key={id} ref={myRef} />`,
					errors: [
						{
							messageId: "useModernProp",
							data: {deprecated: "crank-key", modern: "key"},
						},
						{
							messageId: "useModernProp",
							data: {deprecated: "crank-ref", modern: "ref"},
						},
					],
				},
			],
		});
	});
});
