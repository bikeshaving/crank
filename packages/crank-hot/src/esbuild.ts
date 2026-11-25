import {readFileSync} from "node:fs";
import {join, relative, resolve as resolvePath} from "node:path";
import {fileURLToPath} from "node:url";
import {analyze} from "./graph.ts";
import type {Graph} from "./graph.ts";
import {getLoader, isPackage, SOURCE, transform} from "./transform.ts";

const RUNTIME = fileURLToPath(new URL("./runtime.js", import.meta.url));
const RELOAD = fileURLToPath(new URL("./reload.js", import.meta.url));

export interface HotOptions {
	/** Where the packages which the app imports are built, in the outdir. */
	deps?: string;
	/**
	 * The URL of the event stream which says that a build has finished. It
	 * is esbuild's own by default. With false, the page listens to nothing,
	 * and whatever serves it calls `__crankHot.update()` and
	 * `__crankHot.reload()` in the page.
	 */
	events?: string | false;
}

/**
 * A plugin for esbuild's development server, and for anything else which
 * builds a whole new bundle when a file changes.
 *
 * The build must be a bundle in the esm format with an outdir. Each new
 * bundle is evaluated in the page alongside the ones before it, so the
 * packages are built once, on their own, and shared.
 */
export default function crankHot(options: HotOptions = {}): any {
	const depsName = options.deps || "deps";
	return {
		name: "crank-hot",
		setup(build: any) {
			const initial = build.initialOptions;
			const cwd = initial.absWorkingDir || process.cwd();
			const entryPoints: Array<string> = (
				Array.isArray(initial.entryPoints)
					? initial.entryPoints.map((e: any) =>
							typeof e === "string" ? e : e.in,
						)
					: Object.values(initial.entryPoints || {})
			).map((e: string) => resolvePath(cwd, e));

			let builds = 0;
			let graph: Graph = {hashes: new Map(), packages: []};
			let builtPackages = "";
			build.onStart(async () => {
				graph = analyze(entryPoints, ++builds);
				// The runtime imports Crank.
				const packages = [...new Set([...graph.packages, "@b9g/crank"])].sort();
				if (packages.join() === builtPackages) {
					return;
				}

				builtPackages = packages.join();
				await build.esbuild.build({
					entryPoints: packages.map((spec) => ({in: spec, out: spec})),
					bundle: true,
					format: "esm",
					splitting: true,
					outdir: join(resolvePath(cwd, initial.outdir || "."), depsName),
					absWorkingDir: cwd,
					alias: initial.alias,
					conditions: initial.conditions,
					define: initial.define,
					logLevel: "silent",
					plugins: [
						{
							name: "crank-hot-packages",
							setup(packageBuild: any) {
								// Entry points are resolved the way imports are.
								packageBuild.onResolve({filter: /.*/}, (args: any) =>
									args.kind === "entry-point"
										? packageBuild.resolve(args.path, {
												kind: "import-statement",
												resolveDir: cwd,
											})
										: undefined,
								);
							},
						},
					],
				});
			});

			build.onResolve({filter: /^[^./]/}, (args: any) => {
				if (
					args.kind === "entry-point" ||
					args.namespace !== "file" ||
					isPackage(args.importer)
				) {
					return undefined;
				}

				return {path: `/${depsName}/${args.path}.js`, external: true};
			});

			build.onLoad({filter: SOURCE}, (args: any) => {
				const hashes = graph.hashes.get(args.path);
				if (!hashes) {
					return undefined;
				}

				let contents = transform(readFileSync(args.path, "utf8"), {
					id: relative(cwd, args.path),
					runtime: RUNTIME,
					hashes,
					evaluate: process.env.CRANK_HOT_EVALUATE === "1",
					sourceMap: true,
				});
				if (entryPoints.includes(args.path)) {
					const events =
						options.events === undefined ? "/esbuild" : options.events;
					contents =
						`import {connect as __hotConnect} from ${JSON.stringify(RELOAD)};` +
						`__hotConnect(import.meta.url, ${JSON.stringify(events || null)});` +
						contents;
				}

				return {
					contents,
					// The module is still in the language it was written in.
					loader: getLoader(args.path),
					resolveDir: resolvePath(args.path, ".."),
				};
			});
		},
	};
}
