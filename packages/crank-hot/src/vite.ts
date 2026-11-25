import {relative} from "node:path";
import {fileURLToPath} from "node:url";
import {compile, isPackage, SOURCE} from "./transform.ts";

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
		config(this: any) {
			// Vite compiles JSX for React's development mode unless it is told
			// not to, which adds props that Crank would render. This is a
			// default: what the app's own configuration says comes after it.
			return this && this.meta && this.meta.rolldownVersion
				? {oxc: {jsx: {development: false}}}
				: {esbuild: {jsxDev: false}};
		},
		configResolved(config: {root: string}) {
			root = config.root;
		},
		transform(source: string, id: string, options?: {ssr?: boolean}) {
			const path = id.split("?")[0];
			if (
				(options && options.ssr) ||
				!SOURCE.test(path) ||
				isPackage(path) ||
				path === RUNTIME
			) {
				return null;
			}

			const {code, map} = compile(source, {
				id: relative(root, path),
				runtime: RUNTIME,
				accept: true,
			});
			// A module without components is left to Vite.
			return code === source ? null : {code, map: JSON.parse(map)};
		},
	};
}
