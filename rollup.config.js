import * as fs from "fs";
import * as path from "path";

import typescript2 from "rollup-plugin-typescript2";
import MagicString from "magic-string";
import pkg from "./package.json";

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

const input = [
	"src/index.ts",
	"src/crank.ts",
	"src/dom.ts",
	"src/html.ts",
	"src/template.ts",
];
const ts = typescript2({
	clean: true,
	tsconfigOverride: {
		exclude: ["src/__tests__"],
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
