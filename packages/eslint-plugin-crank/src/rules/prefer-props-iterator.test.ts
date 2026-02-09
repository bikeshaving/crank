import {describe, it} from "vitest";
import {preferPropsIterator} from "./prefer-props-iterator.js";
import {createJsRuleTester} from "../test-helpers/rule-tester.js";

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
			],
		});
	});
});
