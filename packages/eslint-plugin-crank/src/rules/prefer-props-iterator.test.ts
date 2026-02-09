import { describe, it } from "vitest";
import { preferPropsIterator } from "./prefer-props-iterator.js";
import { createJsRuleTester } from "../test-helpers/rule-tester.js";

const ruleTester = createJsRuleTester();

describe("prefer-props-iterator", () => {
  it("should pass", () => {
    ruleTester.run("prefer-props-iterator", preferPropsIterator, {
      valid: [
        // Correct usage with for loop
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
        // Correct usage with prop extraction
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
        // Correct usage with multiple props extracted (only the ones accessed)
        {
          code: `
            function* MultiProp({ title, count, description }) {
              for ({ title, count } of this) {
                yield <div><h1>{title}</h1><p>{count}</p></div>;
              }
            }
          `,
        },
        // Correct: Extra props destructured (not accessed but developer choice is allowed)
        {
          code: `
            function* WithExtraProps({ foo, bar, baz }) {
              for ({ foo, bar, baz } of this) {
                yield <div>{foo}</div>;
              }
            }
          `,
        },
        // Correct usage with context parameter
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
        // Non-generator function with while(true) - should not trigger
        {
          code: `
            function regularFunction() {
              while (true) {
                doSomething();
              }
            }
          `,
        },
        // Generator function without while(true) - should not trigger
        {
          code: `
            function* Generator() {
              yield 1;
              yield 2;
            }
          `,
        },
      ],
      invalid: [
        // while(true) in generator function without props
        {
          code: `
            function* Counter() {
              let count = 0;
              while (true) {
                yield <div>{count}</div>;
              }
            }
          `,
          output: `
            function* Counter() {
              let count = 0;
              for ({} of this) {
                yield <div>{count}</div>;
              }
            }
          `,
          errors: [
            {
              messageId: "preferPropsIterator",
            },
          ],
        },
        // while(true) with context parameter and accessed prop
        {
          code: `
            function* Timer({ message }, ctx) {
              let seconds = 0;
              while (true) {
                yield <div>{message} {seconds}</div>;
              }
            }
          `,
          output: `
            function* Timer({ message }, ctx) {
              let seconds = 0;
              for ({ message } of ctx) {
                yield <div>{message} {seconds}</div>;
              }
            }
          `,
          errors: [
            {
              messageId: "preferPropsIterator",
            },
          ],
        },
        // while(true) with multiple accessed props
        {
          code: `
            function* MultiProp({ title, count, description }) {
              while (true) {
                yield <div><h1>{title}</h1><p>{count}</p></div>;
              }
            }
          `,
          output: `
            function* MultiProp({ title, count, description }) {
              for ({ title, count } of this) {
                yield <div><h1>{title}</h1><p>{count}</p></div>;
              }
            }
          `,
          errors: [
            {
              messageId: "preferPropsIterator",
            },
          ],
        },
        // Missing one prop in destructuring (has 'title' but not 'count')
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
              data: { propName: "count" },
            },
          ],
        },
        // Missing multiple props in destructuring
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
              data: { propName: "bar" },
            },
            {
              messageId: "extractPropsFromContext",
              data: { propName: "baz" },
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
              data: { propName: "message" },
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
              data: { propName: "title" },
            },
            {
              messageId: "extractPropsFromContext",
              data: { propName: "count" },
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
              data: { propName: "bar" },
            },
          ],
        },
      ],
    });
  });
});
