// Bun reads the plugin from the bunfig.toml of the directory it is run in,
// so this is run from the example directory.
import index from "../example/index.html";
import hydrate from "../example/hydrate.html";
import {defineTests} from "./shared.ts";

defineTests(async () => {
	const server = Bun.serve({
		port: 0,
		routes: {"/": index, "/hydrate": hydrate},
		development: {hmr: true},
	});
	return {
		url: server.url.href,
		hydrateUrl: server.url.href + "hydrate",
		close: () => server.stop(true),
	};
});
