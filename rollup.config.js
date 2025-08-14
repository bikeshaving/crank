import * as fs from "fs";
import * as path from "path";

import typescript2 from "rollup-plugin-typescript2";
import MagicString from "magic-string";
import pkg from "./package.json" assert {type: "json"};

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

function rewritePaths(exports) {
	for (const [key, value] of Object.entries(exports)) {
		if (typeof value === "string") {
			exports[key] = value.replace(/^\.\/dist/, ".");
		} else if (typeof value === "object" && value !== null) {
			rewritePaths(value);
		}
	}
}

function copyPackage() {
	return {
		name: "copy-package",
		writeBundle() {
			const pkg1 = JSON.parse(JSON.stringify(pkg));
			delete pkg1.private;
			delete pkg1.scripts;
			rewritePaths(pkg1.exports);
			fs.writeFileSync("./dist/package.json", JSON.stringify(pkg1, null, 2));
			fs.copyFileSync("./README.md", "./dist/README.md");
		},
	};
}

const input = [
	"src/async.ts",
	"src/crank.ts",
	"src/dom.ts",
	"src/event-target.ts",
	"src/jsx-runtime.ts",
	"src/jsx-tag.ts",
	"src/html.ts",
	"src/standalone.ts",
];

const ts = typescript2({
	clean: true,
	tsconfigOverride: {
		exclude: ["test"],
	},
});

export default [
	{
		input,
		output: {
			format: "esm",
			dir: "dist",
			chunkFileNames: "[hash].js",
			sourcemap: true,
			exports: "named",
		},
		plugins: [ts, dts(), copyPackage()],
	},
	{
		input,
		output: {
			format: "cjs",
			dir: "dist",
			chunkFileNames: "[hash].cjs",
			entryFileNames: "[name].cjs",
			sourcemap: true,
			exports: "named",
		},
		plugins: [ts],
	},
	{
		input: "src/umd.ts",
		output: {
			format: "umd",
			dir: "dist",
			name: "Crank",
			preserveModules: false,
			sourcemap: true,
			exports: "named",
		},
		plugins: [ts],
	},
];
