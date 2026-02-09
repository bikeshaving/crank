import {describe, it} from "vitest";
import {preferPropsIterator} from "./prefer-props-iterator.js";
import {createTsRuleTester} from "../test-helpers/rule-tester.js";

const ruleTester = createTsRuleTester();

describe("prefer-props-iterator (TypeScript)", () => {
	it("should work with TypeScript context type annotations", () => {
		ruleTester.run("prefer-props-iterator", preferPropsIterator, {
			valid: [
				// Correct usage with context parameter and type annotation
				{
					code: `
            interface Context {
              refresh: (callback?: () => void) => void;
            }
            
            function* Timer({ message }: { message: string }, ctx: Context) {
              let seconds = 0;
              for ({ message } of ctx) {
                yield <div>{message} {seconds}</div>;
              }
            }
          `,
				},
				// Correct usage with this context parameter and type annotation
				{
					code: `
            interface Context {
              refresh: (callback?: () => void) => void;
            }
            
            function* TimerThis(this: Context, { message }: { message: string }) {
              let seconds = 0;
              for ({ message } of this) {
                yield <div>{message} {seconds}</div>;
              }
            }
          `,
				},
			],
			invalid: [
				// while(true) with context parameter and type annotation
				{
					code: `
            interface Context {
              refresh: (callback?: () => void) => void;
            }
            
            function* Timer({ message }: { message: string }, ctx: Context) {
              let seconds = 0;
              while (true) {
                yield <div>{message} {seconds}</div>;
              }
            }
          `,
					output: `
            interface Context {
              refresh: (callback?: () => void) => void;
            }
            
            function* Timer({ message }: { message: string }, ctx: Context) {
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
				// while(true) with this context parameter and type annotation
				{
					code: `
            interface Context {
              refresh: (callback?: () => void) => void;
            }
            
            function* TimerThis(this: Context, { message }: { message: string }) {
              let seconds = 0;
              while (true) {
                yield <div>{message} {seconds}</div>;
              }
            }
          `,
					output: `
            interface Context {
              refresh: (callback?: () => void) => void;
            }
            
            function* TimerThis(this: Context, { message }: { message: string }) {
              let seconds = 0;
              for ({ message } of this) {
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
			],
		});
	});
});
