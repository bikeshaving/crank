import {join} from "node:path";
import {createServer} from "vite";
import crankHot from "../src/vite.ts";
import {defineTests} from "./shared.ts";

defineTests(async () => {
	const server = await createServer({
		root: join(import.meta.dir, "../example"),
		configFile: false,
		logLevel: "silent",
		plugins: [crankHot()],
		// Vite compiles JSX for React's development mode unless it is told
		// not to, which adds props that Crank would render.
		oxc: {jsx: {development: false}},
		server: {port: 5199},
	});
	await server.listen();
	const url = server.resolvedUrls!.local[0];
	return {
		url,
		hydrateUrl: url + "hydrate.html",
		labUrl: url + "lab.html",
		close: () => server.close(),
	};
});
