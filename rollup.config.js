import path from "path";
import typescript from "rollup-plugin-typescript2";

const root = process.cwd();

export default [
	{
		input: path.join(root, "src/crank.ts"),
		output: [
			{
				file: "lib/crank.cjs.js",
				format: "cjs",
				sourcemap: true,
			},
			{
				file: "lib/crank.js",
				format: "esm",
				sourcemap: true,
			},
		],
		external: ["event-target-shim", "@repeaterjs/repeater"],
		plugins: [typescript()],
	},
	{
		input: path.join(root, "src/envs/dom.ts"),
		output: [
			{
				file: "lib/dom.cjs.js",
				format: "cjs",
				sourcemap: true,
			},
			{
				file: "lib/dom.js",
				format: "esm",
				sourcemap: true,
			},
		],
		external: ["event-target-shim", "@repeaterjs/repeater"],
		plugins: [typescript()],
	}
];
