import path from "path";
import typescript from "rollup-plugin-typescript2";

const root = process.cwd();
const pkg = require(path.join(root, "package.json")); // eslint-disable-line

export default {
	input: path.join(root, "src/react-hooks.ts"),
	output: [
		{
			file: pkg.main,
			format: "cjs",
			sourcemap: true,
		},
		{
			file: pkg.module,
			format: "esm",
			sourcemap: true,
		},
	],
	plugins: [typescript()],
	external: ["@repeaterjs/repeater"],
};
