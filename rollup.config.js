import resolve from "@rollup/plugin-node-resolve";
import typescript from "rollup-plugin-typescript2";
import * as fs from "fs";
import * as path from "path";

function packageCJS() {
	return {
		name: "packageCJS",
		writeBundle(options) {
			const dir = options.dir;
			fs.writeFileSync(
				path.join(__dirname, dir, "package.json"),
				JSON.stringify({type: "commonjs"}),
			);
		},
	};
}

export default [
	{
		input: ["src/index.ts", "src/dom.ts", "src/html.ts"],
		output: {
			format: "esm",
			dir: "esm",
			sourcemap: true,
		},
		plugins: [typescript(), resolve()],
	},
	{
		input: ["src/index.ts", "src/dom.ts", "src/html.ts"],
		output: {
			format: "cjs",
			dir: "cjs",
			sourcemap: true,
		},
		plugins: [
			typescript({tsconfigOverride: {compilerOptions: {target: "ES6"}}}),
			resolve(),
			packageCJS(),
		],
	},
	{
		input: "umd.ts",
		output: {
			format: "umd",
			dir: "umd",
			sourcemap: true,
			name: "Crank",
		},
		plugins: [
			typescript({tsconfigOverride: {compilerOptions: {target: "ES6"}}}),
			resolve(),
		],
	},
];
