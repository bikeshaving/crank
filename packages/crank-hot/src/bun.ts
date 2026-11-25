import type {BunPlugin} from "bun";
import {relative} from "node:path";
import {fileURLToPath} from "node:url";
import {transform} from "./transform.ts";

const RUNTIME = fileURLToPath(new URL("./runtime.js", import.meta.url));

/**
 * A plugin for Bun's development server, which replaces a module in the page
 * when it changes. List it under `[serve.static] plugins` in bunfig.toml.
 */
const plugin: BunPlugin = {
	name: "crank-hot",
	setup(build) {
		build.onLoad({filter: /\.[jt]sx?$/}, async (args) => {
			if (args.path.includes("/node_modules/") || args.path === RUNTIME) {
				return undefined as any;
			}

			const source = await Bun.file(args.path).text();
			return {
				contents: transform(source, {
					id: relative(process.cwd(), args.path),
					runtime: RUNTIME,
					accept: true,
				}),
				loader: "js",
			};
		});
	},
};

export default plugin;
