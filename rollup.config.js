import resolve from "@rollup/plugin-node-resolve";
import typescript from "rollup-plugin-typescript2";
import {basename} from "path";
export default ["src/index.ts", "src/dom.ts", "src/html.ts"].map((input) => ({
	input,
	output: [
		{
			format: "cjs",
			file: `cjs/${basename(input).replace(/\.ts$/, ".js")}`,
			sourcemap: true,
		},
		{
			format: "esm",
			file: `esm/${basename(input).replace(/\.ts$/, ".mjs")}`,
			sourcemap: true,
		},
	],
	plugins: [typescript(), resolve()],
}));
