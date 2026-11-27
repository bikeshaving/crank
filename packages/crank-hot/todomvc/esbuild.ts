import * as esbuild from "esbuild";
import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import crankHot from "@b9g/crank-hot/esbuild";

// The page loads the bundle which esbuild writes.
mkdirSync("dist", {recursive: true});
writeFileSync(
	"dist/index.html",
	readFileSync("index.html", "utf8").replace("./src/main.tsx", "/main.js"),
);
const ctx = await esbuild.context({
	entryPoints: ["src/main.tsx"],
	bundle: true,
	format: "esm",
	outdir: "dist",
	sourcemap: true,
	plugins: [crankHot()],
});
await ctx.watch();
const {port} = await ctx.serve({
	servedir: "dist",
	port: Number(process.env.PORT || 8000),
});
// eslint-disable-next-line no-console
console.log(`http://localhost:${port}/`);
