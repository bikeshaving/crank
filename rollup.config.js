import * as fs from "fs";
import * as path from "path";

import ts from "rollup-plugin-typescript2";
import MagicString from "magic-string";
import pkg from "./package.json";
import {transform} from "ts-transform-import-path-rewrite";

/**
 * A hack to add triple-slash references to sibling d.ts files for deno.
 */
function dts() {
	return {
		name: "dts",
		renderChunk(code, info) {
			if (info.isEntry) {
				const dts = path.join("./", info.fileName.replace(/js$/, "d.ts"));
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

function copyPackage() {
	return {
		name: "copy-package",
		writeBundle() {
			const pkg1 = {...pkg};
			delete pkg1.private;
			delete pkg1.scripts;
			fs.writeFileSync("./dist/package.json", JSON.stringify(pkg1, null, 2));
			fs.copyFileSync("./README.md", "./dist/README.md");
		},
	};
}

const input = ["src/index.ts", "src/crank.ts", "src/dom.ts", "src/html.ts"];

export default [
	{
		input,
		output: {
			format: "esm",
			dir: "dist",
			chunkFileNames: "[hash].js",
			sourcemap: true,
		},
		plugins: [
			ts({clean: true, transformers: [transformer]}),
			dts(),
			copyPackage(),
		],
	},
	{
		input,
		output: {
			format: "cjs",
			dir: "dist",
			chunkFileNames: "[hash].cjs",
			entryFileNames: "[name].cjs",
			sourcemap: true,
		},
		plugins: [ts()],
	},
	{
		input: "src/umd.ts",
		output: {
			format: "umd",
			dir: "dist",
			name: "Crank",
			preserveModules: false,
			sourcemap: true,
		},
		plugins: [ts()],
	},
];
