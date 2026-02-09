import { describe, it } from "vitest";
import { jsxUsesCrank } from "./jsx-uses-crank.js";
import { RuleTester } from "eslint";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

describe("jsx-uses-crank", () => {
  it("should mark Crank and createElement as used when JSX is present", () => {
    ruleTester.run("jsx-uses-crank", jsxUsesCrank, {
      valid: [
        // JSX present — createElement should be marked as used
        { code: `var createElement = 1; <div />` },
        // Namespace import style
        { code: `var Crank = 1; <div />` },
        // No JSX — rule doesn't fire (no false positives)
        { code: `var x = 1;` },
      ],
      invalid: [],
    });
  });
});
