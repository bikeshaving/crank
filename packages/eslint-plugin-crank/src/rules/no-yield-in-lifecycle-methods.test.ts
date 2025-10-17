import { describe, it } from "vitest";
import { noYieldInLifecycleMethods } from "./no-yield-in-lifecycle-methods.js";
import { createTsRuleTester, createJsRuleTester } from "../test-helpers/rule-tester.js";

const ruleTester = createTsRuleTester();

describe("no-yield-in-lifecycle-methods", () => {
  describe("valid cases", () => {
    it("should allow lifecycle methods without yield or return", () => {
      ruleTester.run(
        "no-yield-in-lifecycle-methods",
        noYieldInLifecycleMethods,
        {
          valid: [
            {
              code: `
              function* Component(this: Context) {
                this.schedule(() => {
                  console.log("Scheduled");
                });
              }
            `,
            },
            {
              code: `
              function* Component(this: Context) {
                this.after(() => {
                  console.log("After");
                });
              }
            `,
            },
            {
              code: `
              function* Component(this: Context) {
                this.cleanup(() => {
                  console.log("Cleanup");
                });
              }
            `,
            },
            {
              code: `
              function* Component(this: Context) {
                this.schedule(() => {
                  doSomething();
                  return;
                });
              }
            `,
            },
          ],
          invalid: [],
        }
      );
    });

    it("should allow yield in generator components (not in lifecycle methods)", () => {
      ruleTester.run(
        "no-yield-in-lifecycle-methods",
        noYieldInLifecycleMethods,
        {
          valid: [
            {
              code: `
              function* Component(this: Context) {
                this.schedule(() => {
                  console.log("Setup");
                });
                yield <div>Hello</div>;
              }
            `,
            },
            {
              code: `
              function* Component(this: Context) {
                for (const props of this) {
                  yield <div>Hello</div>;
                }
              }
            `,
            },
          ],
          invalid: [],
        }
      );
    });

    it("should allow nested functions with yield inside lifecycle methods", () => {
      ruleTester.run(
        "no-yield-in-lifecycle-methods",
        noYieldInLifecycleMethods,
        {
          valid: [
            {
              code: `
              function* Component(this: Context) {
                this.schedule(() => {
                  const innerGenerator = function* () {
                    yield 1;
                  };
                });
              }
            `,
            },
          ],
          invalid: [],
        }
      );
    });
  });

  describe("invalid cases - yield in lifecycle methods", () => {
    it.each([
      {
        method: "schedule",
        yieldValue: "<div>Bad</div>",
        line: 4,
        column: 19,
      },
      {
        method: "after",
        yieldValue: "someValue",
        line: 4,
        column: 19,
      },
      {
        method: "cleanup",
        yieldValue: "cleanupValue",
        line: 4,
        column: 19,
      },
    ])("should detect yield in this.$method()", ({ method, yieldValue, line, column }) => {
      ruleTester.run(
        "no-yield-in-lifecycle-methods",
        noYieldInLifecycleMethods,
        {
          valid: [],
          invalid: [
            {
              code: `
              function* Component(this: Context) {
                this.${method}(function* () {
                  yield ${yieldValue};
                });
              }
            `,
              errors: [
                {
                  messageId: "noYieldInLifecycle",
                  data: {
                    statement: "yield",
                    method: method,
                  },
                  line: line,
                  column: column,
                },
              ],
            },
          ],
        }
      );
    });
  });

  describe("invalid cases - return with value in lifecycle methods", () => {
    it.each([
      {
        method: "schedule",
        returnValue: "someValue",
        setup: "doSomething();",
        line: 5,
        column: 19,
      },
      {
        method: "after",
        returnValue: "42",
        setup: "",
        line: 4,
        column: 19,
      },
      {
        method: "cleanup",
        returnValue: "result",
        setup: "cleanup();",
        line: 5,
        column: 19,
      },
    ])("should detect return with value in this.$method()", ({ method, returnValue, setup, line, column }) => {
      const setupLine = setup ? `${setup}\n                  ` : "";
      ruleTester.run(
        "no-yield-in-lifecycle-methods",
        noYieldInLifecycleMethods,
        {
          valid: [],
          invalid: [
            {
              code: `
              function* Component(this: Context) {
                this.${method}(() => {
                  ${setupLine}return ${returnValue};
                });
              }
            `,
              errors: [
                {
                  messageId: "noYieldInLifecycle",
                  data: {
                    statement: "return",
                    method: method,
                  },
                  line: line,
                  column: column,
                },
              ],
            },
          ],
        }
      );
    });
  });

  describe("arrow function syntax", () => {
    it("should detect yield in arrow function lifecycle callbacks", () => {
      ruleTester.run(
        "no-yield-in-lifecycle-methods",
        noYieldInLifecycleMethods,
        {
          valid: [],
          invalid: [
            {
              code: `
              function* Component(this: Context) {
                this.schedule(function* () {
                  yield setupValue;
                });
              }
            `,
              errors: [
                {
                  messageId: "noYieldInLifecycle",
                  data: {
                    statement: "yield",
                    method: "schedule",
                  },
                },
              ],
            },
          ],
        }
      );
    });
  });

  describe("multiple lifecycle calls", () => {
    it("should detect issues in multiple lifecycle methods", () => {
      ruleTester.run(
        "no-yield-in-lifecycle-methods",
        noYieldInLifecycleMethods,
        {
          valid: [],
          invalid: [
            {
              code: `
              function* Component(this: Context) {
                this.schedule(function* () {
                  yield 1;
                });
                this.after(function* () {
                  yield 2;
                });
                this.cleanup(() => {
                  return 3;
                });
              }
            `,
              errors: [
                {
                  messageId: "noYieldInLifecycle",
                  data: {
                    statement: "yield",
                    method: "schedule",
                  },
                  line: 4,
                },
                {
                  messageId: "noYieldInLifecycle",
                  data: {
                    statement: "yield",
                    method: "after",
                  },
                  line: 7,
                },
                {
                  messageId: "noYieldInLifecycle",
                  data: {
                    statement: "return",
                    method: "cleanup",
                  },
                  line: 10,
                },
              ],
            },
          ],
        }
      );
    });
  });

  describe("real-world examples", () => {
    it("should catch common mistake of yielding in schedule", () => {
      ruleTester.run(
        "no-yield-in-lifecycle-methods",
        noYieldInLifecycleMethods,
        {
          valid: [],
          invalid: [
            {
              code: `
              function* Timer(this: Context) {
                let seconds = 0;
                this.schedule(function* () {
                  const timer = setInterval(() => {
                    seconds++;
                    this.refresh();
                  }, 1000);
                  yield timer; // ❌ Wrong! Should not yield in schedule
                });

                for (const _ of this) {
                  yield <div>{seconds} seconds</div>;
                }
              }
            `,
              errors: [
                {
                  messageId: "noYieldInLifecycle",
                  data: {
                    statement: "yield",
                    method: "schedule",
                  },
                },
              ],
            },
          ],
        }
      );
    });

    it("should catch returning a value from after()", () => {
      ruleTester.run(
        "no-yield-in-lifecycle-methods",
        noYieldInLifecycleMethods,
        {
          valid: [],
          invalid: [
            {
              code: `
              function* Component(this: Context) {
                this.after(() => {
                  const element = document.getElementById("myId");
                  return element; // ❌ Wrong! Should not return value from after
                });
              }
            `,
              errors: [
                {
                  messageId: "noYieldInLifecycle",
                  data: {
                    statement: "return",
                    method: "after",
                  },
                },
              ],
            },
          ],
        }
      );
    });
  });

  describe("JavaScript compatibility", () => {
    it("should work with plain JavaScript", () => {
      const jsRuleTester = createJsRuleTester();

      jsRuleTester.run(
        "no-yield-in-lifecycle-methods",
        noYieldInLifecycleMethods,
        {
          valid: [
            {
              code: `
              function* Component() {
                this.schedule(() => {
                  console.log("Setup");
                });
                yield <div>Hello</div>;
              }
            `,
            },
          ],
          invalid: [
            {
              code: `
              function* Component() {
                this.schedule(function* () {
                  yield <div>Bad</div>;
                });
              }
            `,
              errors: [
                {
                  messageId: "noYieldInLifecycle",
                },
              ],
            },
          ],
        }
      );
    });
  });
});
