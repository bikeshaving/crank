import resolve from "@rollup/plugin-node-resolve";
import typescript from "rollup-plugin-typescript2";
export default {
	input: ["src/index.ts", "src/dom.ts", "src/html.ts"],
	output: [
		{
			format: "cjs",
			dir: "cjs",
			sourcemap: true,
		},
		{
			format: "esm",
			dir: "esm",
			sourcemap: true,
		},
	],
	external: ["@repeaterjs/repeater"],
	plugins: [
		typescript(),
		resolve(),
	],
};
