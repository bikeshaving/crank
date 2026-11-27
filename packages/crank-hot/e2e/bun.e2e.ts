// Bun reads the plugin from the bunfig.toml of the directory it is run in,
// so this is run from the example directory.
import index from "../example/index.html";
import hydrate from "../example/hydrate.html";
import lab from "../example/lab.html";
import {defineTests} from "./shared.ts";

defineTests(async () => {
	const server = Bun.serve({
		port: 0,
		routes: {"/": index, "/hydrate": hydrate, "/lab": lab},
		development: {hmr: true},
	});
	return {
		url: server.url.href,
		hydrateUrl: server.url.href + "hydrate",
		labUrl: server.url.href + "lab",
		close: () => server.stop(true),
	};
});
