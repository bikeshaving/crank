import * as fs from "fs";
import * as path from "path";

import resolve from "@rollup/plugin-node-resolve";
import ts from "rollup-plugin-typescript2";
import MagicString from "magic-string";
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

/**
 * A quick plugin to add triple-slash references to sibling d.ts files for deno.
 */
function prependDTSReference() {
	return {
		name: "prependDTSReference",
		renderChunk(code, info) {
			if (info.isEntry) {
				const dts = "./" + info.fileName.replace(/js$/, "d.ts");
				const ms = new MagicString(code);
				ms.prepend(`/// <reference types="${dts}" />\n`);
				return {
					code: ms.toString(),
					map: ms.generateMap({hires: true}),
				};
			}

			return code;
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
		plugins: [ts(), resolve(), prependDTSReference()],
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
