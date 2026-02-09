import {describe, it} from "vitest";
import {propDestructuringConsistency} from "./prop-destructuring-consistency.js";
import {
	createJsRuleTester,
	createTsRuleTester,
} from "../test-helpers/rule-tester.js";

const ruleTester = createJsRuleTester();

describe("prop-destructuring-consistency", () => {
	it("should allow correctly destructured props", () => {
		ruleTester.run(
			"prop-destructuring-consistency",
			propDestructuringConsistency,
			{
				valid: [
					{
						code: `
            function* Counter() {
              let count = 0;
              for ({} of this) {
                yield <div>{count}</div>;
              }
            }
          `,
					},
					{
						code: `
            function* MulCounter({ multiplier }) {
              let seconds = 0;
              for ({ multiplier } of this) {
                yield <p>Multiplied value: {seconds * multiplier}</p>;
              }
            }
          `,
					},
					{
						code: `
            function* MultiProp({ title, count, description }) {
              for ({ title, count } of this) {
                yield <div><h1>{title}</h1><p>{count}</p></div>;
              }
            }
          `,
					},
					// Extra props destructured (not accessed but developer choice is allowed)
					{
						code: `
            function* WithExtraProps({ foo, bar, baz }) {
              for ({ foo, bar, baz } of this) {
                yield <div>{foo}</div>;
              }
            }
          `,
					},
					{
						code: `
            function* Timer({ message }, ctx) {
              let seconds = 0;
              for ({ message } of ctx) {
                yield <div>{message} {seconds}</div>;
              }
            }
          `,
					},
				],
				invalid: [
					// Missing one prop in destructuring
					{
						code: `
            function* MissingOneProp({ title, count }) {
              for ({ title } of this) {
                yield <div><h1>{title}</h1><p>{count}</p></div>;
              }
            }
          `,
						output: `
            function* MissingOneProp({ title, count }) {
              for ({ title, count } of this) {
                yield <div><h1>{title}</h1><p>{count}</p></div>;
              }
            }
          `,
						errors: [
							{
								messageId: "extractPropsFromContext",
								data: {propName: "count"},
							},
						],
					},
					// Missing multiple props
					{
						code: `
            function* MissingMultipleProps({ foo, bar, baz }) {
              for ({ foo } of this) {
                yield <div>{foo} {bar} {baz}</div>;
              }
            }
          `,
						output: `
            function* MissingMultipleProps({ foo, bar, baz }) {
              for ({ foo, bar, baz } of this) {
                yield <div>{foo} {bar} {baz}</div>;
              }
            }
          `,
						errors: [
							{
								messageId: "extractPropsFromContext",
								data: {propName: "bar"},
							},
							{
								messageId: "extractPropsFromContext",
								data: {propName: "baz"},
							},
						],
					},
					// Empty destructuring with accessed props
					{
						code: `
            function* EmptyDestructuring({ message }) {
              for ({} of this) {
                yield <div>{message}</div>;
              }
            }
          `,
						output: `
            function* EmptyDestructuring({ message }) {
              for ({ message } of this) {
                yield <div>{message}</div>;
              }
            }
          `,
						errors: [
							{
								messageId: "extractPropsFromContext",
								data: {propName: "message"},
							},
						],
					},
					// Empty destructuring with multiple accessed props
					{
						code: `
            function* EmptyWithMultiple({ title, count }) {
              for ({} of this) {
                yield <div><h1>{title}</h1><p>{count}</p></div>;
              }
            }
          `,
						output: `
            function* EmptyWithMultiple({ title, count }) {
              for ({ title, count } of this) {
                yield <div><h1>{title}</h1><p>{count}</p></div>;
              }
            }
          `,
						errors: [
							{
								messageId: "extractPropsFromContext",
								data: {propName: "title"},
							},
							{
								messageId: "extractPropsFromContext",
								data: {propName: "count"},
							},
						],
					},
					// Partial destructuring with context parameter
					{
						code: `
            function* PartialContext({ foo, bar }, ctx) {
              for ({ foo } of ctx) {
                yield <div>{foo} {bar}</div>;
              }
            }
          `,
						output: `
            function* PartialContext({ foo, bar }, ctx) {
              for ({ foo, bar } of ctx) {
                yield <div>{foo} {bar}</div>;
              }
            }
          `,
						errors: [
							{
								messageId: "extractPropsFromContext",
								data: {propName: "bar"},
							},
						],
					},
				],
			},
		);
	});

	it("should work with TypeScript", () => {
		const tsRuleTester = createTsRuleTester();

		tsRuleTester.run(
			"prop-destructuring-consistency",
			propDestructuringConsistency,
			{
				valid: [
					{
						code: `
            function* Timer({ message }: { message: string }, ctx: Context) {
              let seconds = 0;
              for ({ message } of ctx) {
                yield <div>{message} {seconds}</div>;
              }
            }
          `,
					},
				],
				invalid: [],
			},
		);
	});
});
