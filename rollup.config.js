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
	external: ["event-target-shim", "@repeaterjs/repeater"],
	plugins: [typescript()],
};
