import typescript from "rollup-plugin-typescript2";
export default {
	input: ["src/crank.ts", "src/dom.ts"],
	output: [
		{
			format: "cjs",
			dir: "lib/cjs",
			sourcemap: true,
		},
		{
			format: "esm",
			dir: "lib",
			sourcemap: true,
		},
	],
	external: ["event-target-shim", "@repeaterjs/repeater"],
	plugins: [typescript()],
};
