import js from "@eslint/js";
import tseslint from "typescript-eslint";
import crankPlugin from "./dist/index.js";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      crank: crankPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        console: "readonly",
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // Crank plugin rules
      ...crankPlugin.configs.recommended.rules,

      // Additional recommended rules for Crank projects
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "off", // Allow console in examples
    },
  },
  {
    files: [
      "**/*.test.{ts,tsx,js,jsx}",
      "**/*.spec.{ts,tsx,js,jsx}",
      "vitest.config.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  }
);
