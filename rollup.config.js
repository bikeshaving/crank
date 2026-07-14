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

			// Return null to indicate no transformation, avoiding sourcemap warning
			return null;
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

// Map each workspace package name to its version, from the workspace globs.
function workspaceVersions() {
	const versions = {};
	for (const pattern of pkg.workspaces || []) {
		const base = pattern.replace(/\/\*$/, "");
		if (!fs.existsSync(base)) continue;
		for (const entry of fs.readdirSync(base)) {
			const manifest = path.join(base, entry, "package.json");
			if (!fs.existsSync(manifest)) continue;
			const wp = JSON.parse(fs.readFileSync(manifest, "utf8"));
			if (wp.name) versions[wp.name] = wp.version;
		}
	}
	return versions;
}

// `npm publish` doesn't understand the `workspace:` protocol, so replace it with
// the referenced package's concrete version (matching pnpm/bun: `workspace:*` →
// exact, `^`/`~` → ranged). Without this, a published `@b9g/crank` ships
// `"@b9g/jsx-web-types": "workspace:*"` and every install fails to resolve it.
function rewriteWorkspaceDeps(deps, versions) {
	if (!deps) return;
	for (const [name, spec] of Object.entries(deps)) {
		if (typeof spec !== "string" || !spec.startsWith("workspace:")) continue;
		const version = versions[name];
		if (!version) {
			throw new Error(`copy-package: no workspace version found for ${name}`);
		}
		const range = spec.slice("workspace:".length);
		deps[name] =
			range === "*" || range === ""
				? version
				: range === "^"
					? `^${version}`
					: range === "~"
						? `~${version}`
						: range;
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
			const versions = workspaceVersions();
			rewriteWorkspaceDeps(pkg1.dependencies, versions);
			rewriteWorkspaceDeps(pkg1.devDependencies, versions);
			rewriteWorkspaceDeps(pkg1.peerDependencies, versions);
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
		compilerOptions: {
			declaration: true,
			sourceMap: true,
			noEmit: false,
		},
		exclude: ["test"],
	},
});

export default [
	{
		input,
		output: {
			format: "esm",
			dir: "dist",
			preserveModules: true,
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
			preserveModules: true,
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
