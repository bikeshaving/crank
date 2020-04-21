import resolve from "@rollup/plugin-node-resolve";
import typescript from "rollup-plugin-typescript2";
export default {
	input: "./src/umd/index.ts",
	output: [
		{
			format: "umd",
			dir: "umd",
			sourcemap: true,
			name: "Crank",
		},
	],
	external: ["@repeaterjs/repeater"],
	plugins: [typescript(), resolve()],
};
