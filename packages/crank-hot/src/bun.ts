import type {BunPlugin} from "bun";
import {relative} from "node:path";
import {fileURLToPath} from "node:url";
import {compile, getLoader, isPackage, SOURCE} from "./compile.ts";

const RUNTIME = fileURLToPath(new URL("./runtime.js", import.meta.url));

/**
 * A plugin for Bun's development server, which replaces a module in the page
 * when it changes. List it under `[serve.static] plugins` in bunfig.toml.
 */
const plugin: BunPlugin = {
	name: "crank-hot",
	setup(build) {
		build.onLoad({filter: SOURCE}, async (args) => {
			if (isPackage(args.path) || args.path === RUNTIME) {
				return undefined as any;
			}

			const source = await Bun.file(args.path).text();
			return {
				// The module is still in the language it was written in.
				contents: compile(source, {
					id: relative(process.cwd(), args.path),
					runtime: RUNTIME,
				}).code,
				loader: getLoader(args.path) as any,
			};
		});
	},
};

export default plugin;
