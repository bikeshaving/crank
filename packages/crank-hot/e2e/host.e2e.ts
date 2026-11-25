// A server which is not esbuild's: something builds the bundles, and tells
// the pages itself when a build is ready, as a framework does which has a
// server of its own to reload first.
import * as esbuild from "esbuild";
import {mkdirSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import crankHot from "../src/esbuild.ts";
import {defineTests} from "./shared.ts";

const example = join(import.meta.dir, "../example");
const dist = join(import.meta.dir, "../.work/host");

defineTests(async () => {
	rmSync(dist, {recursive: true, force: true});
	mkdirSync(dist, {recursive: true});
	for (const [page, entry] of [
		["index.html", "main"],
		["hydrate.html", "hydrate"],
		["lab.html", "lab"],
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
		entryPoints: ["src/main.tsx", "src/hydrate.tsx", "src/lab.tsx"],
		bundle: true,
		format: "esm",
		outdir: dist,
		sourcemap: true,
		logLevel: "silent",
		// The pages listen to nothing.
		plugins: [crankHot({events: false})],
	});
	await ctx.rebuild();
	const server = Bun.serve({
		port: 0,
		fetch(req) {
			const {pathname} = new URL(req.url);
			return new Response(
				Bun.file(join(dist, pathname === "/" ? "index.html" : pathname)),
			);
		},
	});
	const url = server.url.href;
	return {
		url,
		hydrateUrl: url + "hydrate.html",
		labUrl: url + "lab.html",
		async rebuild(pages) {
			await ctx.rebuild();
			await Promise.all(
				pages.map((page) =>
					page.evaluate(() => (globalThis as any).__crankHot.update()),
				),
			);
		},
		async close() {
			await ctx.dispose();
			await server.stop(true);
		},
	};
});
