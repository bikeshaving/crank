import {createServer} from "node:http";
import * as Path from "node:path";
import * as MimeTypes from "mime-types";
import process from "node:process";

import {jsx} from "@b9g/crank/standalone";
import type {Component} from "@b9g/crank";
import {renderer} from "@b9g/crank/html";
import {renderStylesToString} from "@emotion/server";

import {router} from "./routes.js";
import {Storage} from "./components/esbuild.js";

const __dirname = new URL(".", import.meta.url).pathname;
const storage = new Storage({
	dirname: __dirname,
	staticPaths: [Path.join(__dirname, "../static")],
});

import HomeView from "./views/home.js";
import BlogHomeView from "./views/blog-home.js";
import GuideView from "./views/guide.js";
import BlogView from "./views/blog.js";
import PlaygroundView from "./views/playground.js";

const views: Record<string, Component> = {
	home: HomeView,
	blogHome: BlogHomeView,
	blog: BlogView,
	guide: GuideView,
	playground: PlaygroundView,
};

const server = createServer(async (req, res) => {
	// TODO: Why can req.url be undefined???
	const url = req.url || "";
	console.info(`req: ${url}`);
	if (url.startsWith(storage.publicPath)) {
		const source = await storage.serve(url);
		const mimeType = MimeTypes.lookup(url) || "application/octet-stream";
		const charset = MimeTypes.charset(mimeType) || "binary";
		if (source) {
			res.writeHead(200, {
				"Content-Type": mimeType,
				//"Access-Control-Allow-Origin": "*",
			});
			// TODO: import Buffer
			res.end(source, charset as any);
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
		res.writeHead(404, {"Content-Type": "text/html"});
		res.end(`Missing view for ${match.name}`, "utf-8");
		return;
	}

	res.writeHead(200, {"Content-Type": "text/html"});
	// TODO: Should we pass in name to props?
	let html = await renderer.render(jsx`
		<${View} url=${url} storage=${storage} params=${match.params} />
	`);

	html = renderStylesToString(html);
	res.end(html, "utf-8");
});

const PORT = process.env.PORT ?? 1338;
console.info(`Server is listening on port ${PORT}`);
server.listen(PORT);
