import * as fs from "fs";
import * as path from "path";

import ts from "rollup-plugin-typescript2";
import MagicString from "magic-string";
import pkg from "./package.json";
import {transform} from "ts-transform-import-path-rewrite";

const output = (type) => ({
	format: type,
	dir: `dist/${type}`,
	sourcemap: true,
	preserveModules: type !== "umd",
	preserveModulesRoot: "src",
	name: "Crank",
});

export default [
	{
		input: ["src/index.ts", "src/dom.ts", "src/html.ts"],
		output: output("esm"),
		plugins: [ts({clean: true, transformers: [transformer]}), dts()],
	},
	{
		input: ["src/index.ts", "src/dom.ts", "src/html.ts"],
		output: output("cjs"),
		plugins: [ts(), cjs()],
	},
	{
		input: "umd.ts",
		output: output("umd"),
		plugins: [ts(), cjs()],
	},
];

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
			const relPath = path.join("./src", importPath);

			return fs.existsSync(relPath) && fs.lstatSync(relPath).isDirectory()
				? importPath + "/index.js"
				: importPath + ".js";
		},
	});

	return {afterDeclarations: [rewritePath]};
}
