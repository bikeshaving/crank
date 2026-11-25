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
		// The tests write a file and wait for the page, and on the CI machine
		// the events of the file system did not always arrive.
		server: {port: 5199, watch: {usePolling: true, interval: 50}},
	});
	await server.listen();
	// An edit which is made before the files are being watched is not seen.
	const watcher = server.watcher as any;
	if (!watcher._readyEmitted) {
		await Promise.race([
			new Promise((resolve) => watcher.once("ready", resolve)),
			new Promise((resolve) => setTimeout(resolve, 5000)),
		]);
	}

	const url = server.resolvedUrls!.local[0];
	return {
		url,
		hydrateUrl: url + "hydrate.html",
		labUrl: url + "lab.html",
		close: () => server.close(),
	};
});
