import { ESLint } from "eslint";

const eslint = new ESLint({
  useEslintrc: false,
  overrideConfig: {
    parser: "@typescript-eslint/parser",
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      ecmaFeatures: {
        jsx: true
      }
    },
    plugins: ["crank"],
    rules: {
      "crank/prefer-refresh-callback": "error"
    }
  }
});

const code = `
function* Component(this: Context) {
  const handleMove = () => {
    // ...
  };

  const handleClick = async () => {
    await doSomething();
    this.refresh();
  };
}
`;

const results = await eslint.lintText(code, { filePath: "test.ts" });
console.log(JSON.stringify(results, null, 2));
