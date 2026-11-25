import {relative} from "node:path";
import {fileURLToPath} from "node:url";
import {compile} from "./transform.ts";

const RUNTIME = fileURLToPath(new URL("./runtime.js", import.meta.url));

/**
 * A plugin for Vite's development server.
 */
export default function crankHot(): any {
	let root = process.cwd();
	return {
		name: "crank-hot",
		apply: "serve",
		// The transform reads the module as it was written.
		enforce: "pre",
		configResolved(config: {root: string}) {
			root = config.root;
		},
		transform(source: string, id: string, options?: {ssr?: boolean}) {
			const path = id.split("?")[0];
			if (
				(options && options.ssr) ||
				!/\.[jt]sx?$/.test(path) ||
				path.includes("/node_modules/") ||
				path === RUNTIME
			) {
				return null;
			}

			const {code, map} = compile(source, {
				id: relative(root, path),
				runtime: RUNTIME,
				accept: true,
			});
			return {code, map: JSON.parse(map)};
		},
	};
}
