import * as esbuild from "esbuild";
import {mkdirSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import crankHot from "../src/esbuild.ts";
import {defineTests} from "./shared.ts";

const example = join(import.meta.dir, "../example");
const dist = join(import.meta.dir, "../.work/esbuild");

defineTests(async () => {
	rmSync(dist, {recursive: true, force: true});
	mkdirSync(dist, {recursive: true});
	// The pages load the bundles which esbuild writes.
	for (const [page, entry] of [
		["index.html", "main"],
		["hydrate.html", "hydrate"],
	]) {
		writeFileSync(
			join(dist, page),
			readFileSync(join(example, page), "utf8").replace(
				`./src/${entry}.tsx`,
				`/${entry}.js`,
			),
		);
	}

	const ctx = await esbuild.context({
		absWorkingDir: example,
		entryPoints: ["src/main.tsx", "src/hydrate.tsx"],
		bundle: true,
		format: "esm",
		outdir: dist,
		logLevel: "silent",
		plugins: [crankHot()],
	});
	await ctx.rebuild();
	const {port} = await ctx.serve({servedir: dist});
	const url = `http://localhost:${port}/`;
	return {
		url,
		hydrateUrl: url + "hydrate.html",
		rebuild: () => ctx.rebuild(),
		close: () => ctx.dispose(),
	};
});
