import {describe, it} from "vitest";
import {requireCleanupForTimers} from "./require-cleanup-for-timers.js";
import {
	createTsRuleTester,
	createJsRuleTester,
} from "../test-helpers/rule-tester.js";

const ruleTester = createTsRuleTester();

describe("require-cleanup-for-timers", () => {
	describe("valid cases", () => {
		it("should allow timers with proper cleanup", () => {
			ruleTester.run("require-cleanup-for-timers", requireCleanupForTimers, {
				valid: [
					{
						code: `
              function* Timer(this: Context) {
                const timer = setInterval(() => {
                  this.refresh();
                }, 1000);

                this.cleanup(() => {
                  clearInterval(timer);
                });

                for (const _ of this) {
                  yield <div>Tick</div>;
                }
              }
            `,
					},
					{
						code: `
              function* Timer(this: Context) {
                const timeout = setTimeout(() => {
                  console.log("Done");
                }, 1000);

                this.cleanup(() => {
                  clearTimeout(timeout);
                });

                yield <div>Hello</div>;
              }
            `,
					},
				],
				invalid: [],
			});
		});

		it("should allow non-generator functions with timers", () => {
			ruleTester.run("require-cleanup-for-timers", requireCleanupForTimers, {
				valid: [
					{
						code: `
              function regularFunction() {
                const timer = setInterval(() => {
                  console.log("tick");
                }, 1000);
              }
            `,
					},
				],
				invalid: [],
			});
		});

		it("should allow generator functions without timers", () => {
			ruleTester.run("require-cleanup-for-timers", requireCleanupForTimers, {
				valid: [
					{
						code: `
              function* Component(this: Context) {
                for (const _ of this) {
                  yield <div>Hello</div>;
                }
              }
            `,
					},
				],
				invalid: [],
			});
		});

		it("should allow timers with cleanup in function expressions", () => {
			ruleTester.run("require-cleanup-for-timers", requireCleanupForTimers, {
				valid: [
					{
						code: `
              function* Timer(this: Context) {
                const timer = setInterval(() => this.refresh(), 1000);

                this.cleanup(function() {
                  clearInterval(timer);
                });

                yield <div>Tick</div>;
              }
            `,
					},
				],
				invalid: [],
			});
		});
	});

	describe.each([
		{
			timerType: "setInterval",
			clearFunction: "clearInterval",
			varName: "timer",
			componentName: "Timer",
			action: "this.refresh()",
		},
		{
			timerType: "setTimeout",
			clearFunction: "clearTimeout",
			varName: "timeout",
			componentName: "Component",
			action: 'console.log("Done")',
		},
	])(
		"invalid cases - $timerType without cleanup",
		({timerType, clearFunction, varName, componentName, action}) => {
			it(`should detect ${timerType} without any cleanup call`, () => {
				ruleTester.run("require-cleanup-for-timers", requireCleanupForTimers, {
					valid: [],
					invalid: [
						{
							code: `
              function* ${componentName}(this: Context) {
                const ${varName} = ${timerType}(() => {
                  ${action};
                }, 1000);

                ${timerType === "setInterval" ? `for (const _ of this) {\n                  yield <div>Tick</div>;\n                }` : `yield <div>Hello</div>;`}
              }
            `,
							errors: [
								{
									messageId: "missingCleanup",
									data: {
										timerType,
									},
									line: 3,
									...(timerType === "setInterval" ? {column: 31} : {}),
								},
							],
						},
					],
				});
			});

			it(`should detect ${timerType} without ${clearFunction} in cleanup`, () => {
				ruleTester.run("require-cleanup-for-timers", requireCleanupForTimers, {
					valid: [],
					invalid: [
						{
							code: `
              function* ${componentName}(this: Context) {
                const ${varName} = ${timerType}(() => {
                  ${action};
                }, 1000);

                this.cleanup(() => {
                  console.log("cleanup");
                });

                yield <div>${timerType === "setInterval" ? "Tick" : "Hello"}</div>;
              }
            `,
							errors: [
								{
									messageId: "missingClearInCleanup",
									data: {
										timerVar: varName,
										clearFunction,
									},
									...(timerType === "setInterval" ? {line: 3} : {}),
								},
							],
						},
					],
				});
			});

			it(`should detect ${timerType} clearing wrong variable`, () => {
				const wrongClearVar =
					timerType === "setInterval" ? "wrongTimer" : "timeout";
				const wrongClearFunc =
					timerType === "setTimeout" ? "clearInterval" : clearFunction;

				ruleTester.run("require-cleanup-for-timers", requireCleanupForTimers, {
					valid: [],
					invalid: [
						{
							code: `
              function* ${componentName}(this: Context) {
                const ${varName} = ${timerType}(() => {
                  ${action};
                }, 1000);

                this.cleanup(() => {
                  ${wrongClearFunc}(${wrongClearVar});${timerType === "setTimeout" ? " // Wrong! Should be clearTimeout" : ""}
                });

                yield <div>${timerType === "setInterval" ? "Tick" : "Hello"}</div>;
              }
            `,
							errors: [
								{
									messageId: "missingClearInCleanup",
									data: {
										timerVar: varName,
										clearFunction,
									},
								},
							],
						},
					],
				});
			});
		},
	);

	describe("multiple timers", () => {
		it("should detect multiple timers without cleanup", () => {
			ruleTester.run("require-cleanup-for-timers", requireCleanupForTimers, {
				valid: [],
				invalid: [
					{
						code: `
              function* Component(this: Context) {
                const timer1 = setInterval(() => {}, 1000);
                const timer2 = setTimeout(() => {}, 2000);

                yield <div>Hello</div>;
              }
            `,
						errors: [
							{
								messageId: "missingCleanup",
								data: {
									timerType: "setInterval",
								},
								line: 3,
							},
							{
								messageId: "missingCleanup",
								data: {
									timerType: "setTimeout",
								},
								line: 4,
							},
						],
					},
				],
			});
		});

		it("should allow multiple timers with proper cleanup", () => {
			ruleTester.run("require-cleanup-for-timers", requireCleanupForTimers, {
				valid: [
					{
						code: `
              function* Component(this: Context) {
                const timer1 = setInterval(() => {}, 1000);
                const timer2 = setTimeout(() => {}, 2000);

                this.cleanup(() => {
                  clearInterval(timer1);
                  clearTimeout(timer2);
                });

                yield <div>Hello</div>;
              }
            `,
					},
				],
				invalid: [],
			});
		});

		it("should detect partial cleanup", () => {
			ruleTester.run("require-cleanup-for-timers", requireCleanupForTimers, {
				valid: [],
				invalid: [
					{
						code: `
              function* Component(this: Context) {
                const timer1 = setInterval(() => {}, 1000);
                const timer2 = setTimeout(() => {}, 2000);

                this.cleanup(() => {
                  clearInterval(timer1);
                  // Missing clearTimeout(timer2)
                });

                yield <div>Hello</div>;
              }
            `,
						errors: [
							{
								messageId: "missingClearInCleanup",
								data: {
									timerVar: "timer2",
									clearFunction: "clearTimeout",
								},
							},
						],
					},
				],
			});
		});
	});

	describe("real-world examples", () => {
		it("should catch timer leak in a clock component", () => {
			ruleTester.run("require-cleanup-for-timers", requireCleanupForTimers, {
				valid: [],
				invalid: [
					{
						code: `
              function* Clock(this: Context) {
                let time = new Date();

                const intervalId = setInterval(() => {
                  time = new Date();
                  this.refresh();
                }, 1000);

                for (const _ of this) {
                  yield <div>{time.toLocaleTimeString()}</div>;
                }
              }
            `,
						errors: [
							{
								messageId: "missingCleanup",
								data: {
									timerType: "setInterval",
								},
							},
						],
					},
				],
			});
		});

		it("should accept proper timer cleanup in a clock component", () => {
			ruleTester.run("require-cleanup-for-timers", requireCleanupForTimers, {
				valid: [
					{
						code: `
              function* Clock(this: Context) {
                let time = new Date();

                const intervalId = setInterval(() => {
                  time = new Date();
                  this.refresh();
                }, 1000);

                this.cleanup(() => {
                  clearInterval(intervalId);
                });

                for (const _ of this) {
                  yield <div>{time.toLocaleTimeString()}</div>;
                }
              }
            `,
					},
				],
				invalid: [],
			});
		});

		it("should catch debounce timer without cleanup", () => {
			ruleTester.run("require-cleanup-for-timers", requireCleanupForTimers, {
				valid: [],
				invalid: [
					{
						code: `
              function* SearchInput(this: Context) {
                let debounceTimer;

                const handleInput = (e) => {
                  debounceTimer = setTimeout(() => {
                    performSearch(e.target.value);
                  }, 300);
                };

                yield <input oninput={handleInput} />;
              }
            `,
						errors: [
							{
								messageId: "missingCleanup",
								data: {
									timerType: "setTimeout",
								},
							},
						],
					},
				],
			});
		});
	});

	describe("post-loop and try/finally cleanup", () => {
		it("should allow cleanup after the for-of loop", () => {
			ruleTester.run("require-cleanup-for-timers", requireCleanupForTimers, {
				valid: [
					{
						code: `
              function* Timer(this: Context) {
                let seconds = 0;
                const interval = setInterval(() => this.refresh(() => {
                  seconds++;
                }), 1000);
                for (const {} of this) {
                  yield <div>{seconds}</div>;
                }

                clearInterval(interval);
              }
            `,
					},
				],
				invalid: [],
			});
		});

		it("should allow cleanup in try/finally", () => {
			ruleTester.run("require-cleanup-for-timers", requireCleanupForTimers, {
				valid: [
					{
						code: `
              function* Timer(this: Context) {
                let seconds = 0;
                const interval = setInterval(() => {
                  seconds++;
                  this.refresh();
                }, 1000);

                try {
                  for (const {} of this) {
                    yield <div>{seconds}</div>;
                  }
                } finally {
                  clearInterval(interval);
                }
              }
            `,
					},
				],
				invalid: [],
			});
		});
	});

	describe("JavaScript compatibility", () => {
		it("should work with plain JavaScript", () => {
			const jsRuleTester = createJsRuleTester();

			jsRuleTester.run("require-cleanup-for-timers", requireCleanupForTimers, {
				valid: [
					{
						code: `
              function* Timer() {
                const timer = setInterval(() => {}, 1000);
                this.cleanup(() => clearInterval(timer));
                yield <div>Tick</div>;
              }
            `,
					},
				],
				invalid: [
					{
						code: `
              function* Timer() {
                const timer = setInterval(() => {}, 1000);
                yield <div>Tick</div>;
              }
            `,
						errors: [
							{
								messageId: "missingCleanup",
							},
						],
					},
				],
			});
		});
	});
});
