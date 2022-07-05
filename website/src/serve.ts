import {createServer} from "node:http";
import * as path from "node:path";
import * as mime from "mime-types";

import {t} from "@b9g/crank/template.js";
import {renderer} from "@b9g/crank/html.js";
import type {Component} from "@b9g/crank/crank.js";

import {router} from "./routes.js";

import HomeView from "./views/home.js";

import {Storage} from "./components/esbuild.js";

const __dirname = new URL(".", import.meta.url).pathname;
const storage = new Storage({
	dirname: __dirname,
	staticPaths: [path.join(__dirname, "../static")],
});

const views: Record<string, Component> = {
	home: HomeView,
};

const server = createServer(async (req, res) => {
	// TODO: Why can req.url be undefined???
	const url = req.url || "";
	console.info(`req: ${url}`);
	if (url.startsWith(storage.publicPath)) {
		const source = await storage.serve(url);
		if (source) {
			res.writeHead(200, {
				"Content-Type": mime.lookup(url) || "application/octet-stream",
			});
			res.end(source, "utf-8");
			return;
		}
	}

	const match = router.match(url);
	if (!match) {
		res.writeHead(404, {"Content-Type": "text/html"});
		res.end("Page not found", "utf-8");
		return;
	}

	const View = views[match.name];
	if (!View) {
		throw new Error(`Missing view for ${match.name}`);
	}

	res.writeHead(200, {"Content-Type": "text/html"});
	// TODO: Should we pass in name to props?
	const html = await renderer.render(t`
		<${View} storage=${storage} params=${match.params} />
	`);
	res.end(html, "utf-8");
});

const PORT = 1337;
console.info(`Server is listening on port ${PORT}`);
server.listen(PORT);
