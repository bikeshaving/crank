import {describe, it} from "bun:test";
import {preferRefreshCallback} from "./prefer-refresh-callback.js";
import {
	createTsRuleTester,
	createJsRuleTester,
} from "../test-helpers/rule-tester.js";

const ruleTester = createTsRuleTester();

describe("prefer-refresh-callback", () => {
	describe("basic functionality", () => {
		it("should pass for valid refresh callback patterns", () => {
			ruleTester.run("prefer-refresh-callback", preferRefreshCallback, {
				valid: [
					{
						code: `this.refresh(() => count++);`,
					},
					{
						code: `this.refresh(() => { count++; });`,
					},
					{
						code: `this.refresh(() => { 
              count++;
              doSomething();
            });`,
					},
					{
						code: `someOtherObject.refresh();`,
					},
					{
						code: `this.someOtherMethod();`,
					},
					{
						code: `this.refresh(callback);`,
					},
				],
				invalid: [],
			});
		});

		it("should NOT detect standalone refresh calls outside Crank components", () => {
			ruleTester.run("prefer-refresh-callback", preferRefreshCallback, {
				valid: [
					{
						code: `this.refresh();`,
					},
				],
				invalid: [],
			});
		});
	});

	describe("context parameter patterns", () => {
		it("should detect refresh calls with arbitrary context parameter names", () => {
			ruleTester.run("prefer-refresh-callback", preferRefreshCallback, {
				valid: [],
				invalid: [
					{
						code: `
              function* Component({ ...props }, ctx: Context) {
                const handleClick = async (e : Event) => {
                  await doSomething();
                  ctx.refresh();
                };
              }
            `,
						errors: [
							{
								messageId: "preferRefreshCallback",
								line: 5,
								column: 19,
								suggestions: [
									{
										messageId: "suggestRefreshCallback",
										output: `
              function* Component({ ...props }, ctx: Context) {
                const handleClick = (e: Event) => ctx.refresh(
                  async () => {
                    await doSomething();
                  }
                );
              }
            `,
									},
								],
							},
						],
					},
					{
						code: `
              function* Component({ ...props }, context: Context) {
                const handleClick = async () => {
                  await doSomething();
                  context.refresh();
                }
              }
            `,
						errors: [
							{
								messageId: "preferRefreshCallback",
								line: 5,
								column: 19,
								suggestions: [
									{
										messageId: "suggestRefreshCallback",
										output: `
              function* Component({ ...props }, context: Context) {
                const handleClick = () => context.refresh(
                  async () => {
                    await doSomething();
                  }
                )
              }
            `,
									},
								],
							},
						],
					},
					{
						code: `
              function* Component({ ...props }, c: Context) {
                const handleClick = async () => {
                  await doSomething();
                  c.refresh();
                }
              }
            `,
						errors: [
							{
								messageId: "preferRefreshCallback",
								line: 5,
								column: 19,
								suggestions: [
									{
										messageId: "suggestRefreshCallback",
										output: `
              function* Component({ ...props }, c: Context) {
                const handleClick = () => c.refresh(
                  async () => {
                    await doSomething();
                  }
                )
              }
            `,
									},
								],
							},
						],
					},
				],
			});
		});

		it("should work with this: Context pattern", () => {
			ruleTester.run("prefer-refresh-callback", preferRefreshCallback, {
				valid: [],
				invalid: [
					{
						code: `
              function* Component(this: Context, { ...props }) {
                const handleClick = async () => {
                  await doSomething();
                  this.refresh();
                }
              }
            `,
						errors: [
							{
								messageId: "preferRefreshCallback",
								line: 5,
								column: 19,
								suggestions: [
									{
										messageId: "suggestRefreshCallback",
										output: `
              function* Component(this: Context, { ...props }) {
                const handleClick = () => this.refresh(
                  async () => {
                    await doSomething();
                  }
                )
              }
            `,
									},
								],
							},
						],
					},
				],
			});
		});
	});

	describe("final action detection", () => {
		it("should detect refresh calls before return statements", () => {
			ruleTester.run("prefer-refresh-callback", preferRefreshCallback, {
				valid: [],
				invalid: [
					{
						code: `
              function* Component(this: Context) {
                const handleClick = async () => {
                  await doSomething();
                  this.refresh();
                  return;
                }
              }
            `,
						errors: [
							{
								messageId: "preferRefreshCallback",
								line: 5,
								column: 19,
								suggestions: [
									{
										messageId: "suggestRefreshCallback",
										output: `
              function* Component(this: Context) {
                const handleClick = () => this.refresh(
                  async () => {
                    await doSomething();
                    return;
                  }
                )
              }
            `,
									},
								],
							},
						],
					},
					{
						code: `
              function* Component(this: Context) {
                const handleClick = async () => {
                  await doSomething();
                  this.refresh();
                  return result;
                }
              }
            `,
						errors: [
							{
								messageId: "preferRefreshCallback",
								line: 5,
								column: 19,
								suggestions: [
									{
										messageId: "suggestRefreshCallback",
										output: `
              function* Component(this: Context) {
                const handleClick = () => this.refresh(
                  async () => {
                    await doSomething();
                    return result;
                  }
                )
              }
            `,
									},
								],
							},
						],
					},
				],
			});
		});

		it("should detect refresh calls before throw statements", () => {
			ruleTester.run("prefer-refresh-callback", preferRefreshCallback, {
				valid: [],
				invalid: [
					{
						code: `
              function* Component(this: Context) {
                const handleClick = async () => {
                  try {
                    await doSomething();
                  } catch (e) {
                    this.refresh();
                    throw e;
                  }
                }
              }
            `,
						errors: [
							{
								messageId: "preferRefreshCallback",
								line: 7,
								column: 21,
								suggestions: [
									{
										messageId: "suggestRefreshCallback",
										output: `
              function* Component(this: Context) {
                const handleClick = () => this.refresh(
                  async () => {
                    try {
                      await doSomething();
                    } catch (e) {
                      throw e;
                    }
                  }
                )
              }
            `,
									},
								],
							},
						],
					},
				],
			});
		});

		it("should detect refresh calls as last statements in try/catch/finally blocks", () => {
			ruleTester.run("prefer-refresh-callback", preferRefreshCallback, {
				valid: [],
				invalid: [
					{
						code: `
              function* Component(this: Context) {
                const handleClick = async () => {
                  try {
                    await doSomething();
                    this.refresh();
                  } catch (e) {
                    showError(e);
                  }
                }
              }
            `,
						errors: [
							{
								messageId: "preferRefreshCallback",
								line: 6,
								column: 21,
								suggestions: [
									{
										messageId: "suggestRefreshCallback",
										output: `
              function* Component(this: Context) {
                const handleClick = () => this.refresh(
                  async () => {
                    try {
                      await doSomething();
                    } catch (e) {
                      showError(e);
                    }
                  }
                )
              }
            `,
									},
								],
							},
						],
					},
					{
						code: `
              function* Component(this: Context) {
                const handleClick = async () => {
                  try {
                    await doSomething();
                  } catch (e) {
                    showError(e);
                    this.refresh();
                  }
                }
              }
            `,
						errors: [
							{
								messageId: "preferRefreshCallback",
								line: 8,
								column: 21,
								suggestions: [
									{
										messageId: "suggestRefreshCallback",
										output: `
              function* Component(this: Context) {
                const handleClick = () => this.refresh(
                  async () => {
                    try {
                      await doSomething();
                    } catch (e) {
                      showError(e);
                    }
                  }
                )
              }
            `,
									},
								],
							},
						],
					},
					{
						code: `
              function* Component(this: Context) {
                const handleClick = async () => {
                  try {
                    await doSomething();
                  } finally {
                    cleanup();
                    this.refresh();
                  }
                }
              }
            `,
						errors: [
							{
								messageId: "preferRefreshCallback",
								line: 8,
								column: 21,
								suggestions: [
									{
										messageId: "suggestRefreshCallback",
										output: `
              function* Component(this: Context) {
                const handleClick = () => this.refresh(
                  async () => {
                    try {
                      await doSomething();
                    } finally {
                      cleanup();
                    }
                  }
                )
              }
            `,
									},
								],
							},
						],
					},
				],
			});
		});

		it("should detect refresh calls as last statements in function scope", () => {
			ruleTester.run("prefer-refresh-callback", preferRefreshCallback, {
				valid: [],
				invalid: [
					{
						code: `
              function* Component(this: Context) {
                const handleClick = async () => {
                  await doSomething();
                  this.refresh();
                }
              }
            `,
						errors: [
							{
								messageId: "preferRefreshCallback",
								line: 5,
								column: 19,
								suggestions: [
									{
										messageId: "suggestRefreshCallback",
										output: `
              function* Component(this: Context) {
                const handleClick = () => this.refresh(
                  async () => {
                    await doSomething();
                  }
                )
              }
            `,
									},
								],
							},
						],
					},
				],
			});
		});

		it("should NOT detect refresh calls that are not final actions", () => {
			ruleTester.run("prefer-refresh-callback", preferRefreshCallback, {
				valid: [
					{
						code: `
              function* Component(this: Context) {
                const handleClick = async () => {
                  this.refresh();
                  await doSomething();
                }
              }
            `,
					},
					{
						code: `
              function* Component(this: Context) {
                const handleClick = async () => {
                  this.refresh();
                  doSomething();
                  return result;
                }
              }
            `,
					},
					{
						code: `
              function* Component(this: Context) {
                const handleClick = async () => {
                  this.refresh();
                  if (condition) {
                    return;
                  }
                  doSomething();
                }
              }
            `,
					},
				],
				invalid: [],
			});
		});
	});

	describe("auto-fix functionality", () => {
		it("should provide auto-fix for simple callback wrapping", () => {
			ruleTester.run("prefer-refresh-callback", preferRefreshCallback, {
				valid: [],
				invalid: [
					{
						code: `
              function* Component(this: Context) {
                const handleClick = async () => {
                  await doSomething();
                  this.refresh();
                }
              }
            `,
						errors: [
							{
								messageId: "preferRefreshCallback",
								suggestions: [
									{
										messageId: "suggestRefreshCallback",
										output: `
              function* Component(this: Context) {
                const handleClick = () => this.refresh(
                  async () => {
                    await doSomething();
                  }
                )
              }
            `,
									},
								],
							},
						],
					},
				],
			});
		});

		it("should work when there are multiple callbacks in the component", () => {
			ruleTester.run("prefer-refresh-callback", preferRefreshCallback, {
				valid: [],
				invalid: [
					{
						code: `
              function* Component(this: Context) {
                const handleMove = () => {
                  // ...
                };

                const handleClick = async () => {
                  await doSomething();
                  this.refresh();
                };
              }
            `,
						errors: [
							{
								messageId: "preferRefreshCallback",
								suggestions: [
									{
										messageId: "suggestRefreshCallback",
										output: `
              function* Component(this: Context) {
                const handleMove = () => {
                  // ...
                };

                const handleClick = () => this.refresh(
                  async () => {
                    await doSomething();
                  }
                );
              }
            `,
									},
								],
							},
						],
					},
				],
			});
		});

		it("should detect refresh calls in inline JSX callbacks", () => {
			ruleTester.run("prefer-refresh-callback", preferRefreshCallback, {
				valid: [],
				invalid: [
					{
						code: `
              function* Component(this: Context) {
                yield <button onclick={async () => {
                  await doSomething();
                  this.refresh();
                }} />;
              }
            `,
						errors: [
							{
								messageId: "preferRefreshCallback",
								suggestions: [
									{
										messageId: "suggestRefreshCallback",
										output: `
              function* Component(this: Context) {
                yield <button onclick={() => this.refresh(
                  async () => {
                    await doSomething();
                  }
                )} />;
              }
            `,
									},
								],
							},
						],
					},
				],
			});
		});

		it("should provide auto-fix for complex callback with try/catch", () => {
			ruleTester.run("prefer-refresh-callback", preferRefreshCallback, {
				valid: [],
				invalid: [
					{
						code: `
              function* Component(this: Context) {
                const handleClick = async () => {
                  loadingState = true;
                  this.refresh();
                  try {
                    await updateOnServer();
                    loadingState = false;
                    this.refresh();
                  } catch (e) {
                    showErrorNotification(e);
                    loadingState = false;
                    this.refresh();
                  }
                }
              }
            `,
						errors: [
							{
								messageId: "preferRefreshCallback",
								line: 9,
								column: 21,
								suggestions: [
									{
										messageId: "suggestRefreshCallback",
										output: `
              function* Component(this: Context) {
                const handleClick = () => this.refresh(
                  async () => {
                    loadingState = true;
                    this.refresh();
                    try {
                      await updateOnServer();
                      loadingState = false;
                    } catch (e) {
                      showErrorNotification(e);
                      loadingState = false;
                    }
                  }
                )
              }
            `,
									},
								],
							},
						],
					},
				],
			});
		});

		it("should work with generic context types", () => {
			ruleTester.run("prefer-refresh-callback", preferRefreshCallback, {
				valid: [],
				invalid: [
					{
						code: `
              function* Component<T>({ ...props }, ctx: Context<T>) {
                const handleClick = async () => {
                  await processData<T>();
                  ctx.refresh();
                }
              }
            `,
						errors: [
							{
								messageId: "preferRefreshCallback",
								line: 5,
								column: 19,
								suggestions: [
									{
										messageId: "suggestRefreshCallback",
										output: `
              function* Component<T>({ ...props }, ctx: Context<T>) {
                const handleClick = () => ctx.refresh(
                  async () => {
                    await processData<T>();
                  }
                )
              }
            `,
									},
								],
							},
						],
					},
				],
			});
		});
	});

	describe("complex real-world scenarios", () => {
		it("should handle multiple refresh calls in nested if blocks and try/catch", () => {
			ruleTester.run("prefer-refresh-callback", preferRefreshCallback, {
				valid: [],
				invalid: [
					{
						code: `
              function* Component(this: Context) {
                const handleSubmit = async (event: Event) => {
                  event.preventDefault();
                  const form = event.target as HTMLFormElement;
                  const token = form.token.value;

                  if (!token || !token.trim()) {
                    state.error = "Please enter a token";
                    this.refresh();
                    return;
                  }

                  try {
                    state.error = null;
                    this.refresh();

                    const isValid = await validateToken(token.trim());
                    if (!isValid) {
                      state.error = "Invalid token";
                      this.refresh();
                      return;
                    }

                    saveToken(token.trim());
                    onSuccess();
                  } catch (error) {
                    state.error = "Failed to validate";
                    this.refresh();
                  }
                }
              }
            `,
						errors: [
							{
								messageId: "preferRefreshCallback",
								suggestions: [
									{
										messageId: "suggestRefreshCallback",
										output: `
              function* Component(this: Context) {
                const handleSubmit = (event: Event) => this.refresh(
                  async () => {
                    event.preventDefault();
                    const form = event.target as HTMLFormElement;
                    const token = form.token.value;
                    if (!token || !token.trim()) {
                      state.error = "Please enter a token";
                      return;
                    }
                    try {
                      state.error = null;
                      this.refresh();
                      const isValid = await validateToken(token.trim());
                      if (!isValid) {
                        state.error = "Invalid token";
                        return;
                      }
                      saveToken(token.trim());
                      onSuccess();
                    } catch (error) {
                      state.error = "Failed to validate";
                    }
                  }
                )
              }
            `,
									},
								],
							},
						],
					},
				],
			});
		});
	});

	describe("JavaScript compatibility", () => {
		it("should work with plain JavaScript", () => {
			const jsRuleTester = createJsRuleTester();

			jsRuleTester.run("prefer-refresh-callback", preferRefreshCallback, {
				valid: [],
				invalid: [
					{
						code: `
              function* Component({ ...props }, ctx) {
                const handleClick = async () => {
                  await doSomething();
                  ctx.refresh();
                }
              }
            `,
						errors: [
							{
								messageId: "preferRefreshCallback",
								line: 5,
								column: 19,
								suggestions: [
									{
										messageId: "suggestRefreshCallback",
										output: `
              function* Component({ ...props }, ctx) {
                const handleClick = () => ctx.refresh(
                  async () => {
                    await doSomething();
                  }
                )
              }
            `,
									},
								],
							},
						],
					},
				],
			});
		});
	});
});
