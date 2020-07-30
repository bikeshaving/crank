import * as fs from "fs";
import * as path from "path";

import ts from "rollup-plugin-typescript2";
import MagicString from "magic-string";
import pkg from "./package.json";
import {transform} from "ts-transform-import-path-rewrite";

/**
 * A hack to provide package.json files with "type": "commonjs" in cjs/umd subdirectories.
 */
function cjs() {
	return {
		name: "cjs",
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
 * A hack to add triple-slash references to sibling d.ts files for deno.
 */
function dts() {
	return {
		name: "dts",
		renderChunk(code, info) {
			if (info.isEntry) {
				const dts = "./" + info.fileName.replace(/js$/, "d.ts");
				const ms = new MagicString(code);
				ms.prepend(`/// <reference types="${dts}" />\n`);
				code = ms.toString();
				const map = ms.generateMap({hires: true});
				return {code, map};
			}

			return code;
		},
	};
}

/**
 * A hack to rewrite import paths in d.ts files for deno.
 */
function transformer() {
	const rewritePath = transform({
		rewrite(importPath) {
			return importPath + ".js";
		},
	});

	return {afterDeclarations: [rewritePath]};
}

export default [
	{
		input: ["src/index.ts", "src/crank.ts", "src/dom.ts", "src/html.ts"],
		output: {
			format: "esm",
			dir: "./",
			sourcemap: true,
			chunkFileNames: "dist/[hash].js",
		},
		plugins: [ts({clean: true, transformers: [transformer]}), dts()],
	},
	{
		input: ["src/index.ts", "src/crank.ts", "src/dom.ts", "src/html.ts"],
		output: {
			format: "cjs",
			dir: "cjs",
			sourcemap: true,
		},
		plugins: [ts(), cjs()],
	},
	{
		input: "umd.ts",
		output: {
			format: "umd",
			dir: "umd",
			sourcemap: true,
			name: "Crank",
		},
		plugins: [ts(), cjs()],
	},
];
