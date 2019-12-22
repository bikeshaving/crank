import path from "path";
import resolve from "rollup-plugin-node-resolve";
import typescript from "rollup-plugin-typescript2";

const root = process.cwd();

export default {
	input: path.join(root, "src/index.tsx"),
	output: {
		file: "lib/index.js",
		format: "umd",
		sourcemap: "inline",
	},
	plugins: [typescript(), resolve()],
};
