import resolve from "@rollup/plugin-node-resolve";
import ts from "@wessberg/rollup-plugin-ts";
import * as fs from "fs";
import * as path from "path";
import pkg from "./package.json";

function packageCJS() {
	return {
		name: "packageCJS",
		writeBundle({dir, format}) {
			fs.writeFileSync(
				path.join(__dirname, dir, "package.json"),
				JSON.stringify(
					{
						name: `${pkg.name}-${format}`,
						type: "commonjs",
						private: true,
					},
					null,
					2,
				),
			);
		},
	};
}

export default [
	{
		input: ["src/index.ts", "src/dom.ts", "src/html.ts"],
		output: {
			format: "esm",
			dir: "./",
			chunkFileNames: "dist/[hash].js",
			sourcemap: true,
		},
		plugins: [ts(), resolve()],
	},
	{
		input: ["src/index.ts", "src/dom.ts", "src/html.ts"],
		output: {
			format: "cjs",
			dir: "cjs",
			sourcemap: true,
		},
		plugins: [ts(), resolve(), packageCJS()],
	},
	{
		input: "umd.ts",
		output: {
			format: "umd",
			dir: "umd",
			sourcemap: true,
			name: "Crank",
		},
		plugins: [ts(), resolve(), packageCJS()],
	},
];
