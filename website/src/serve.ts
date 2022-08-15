import {createServer} from "node:http";
import * as path from "node:path";
import * as mime from "mime-types";

import {xm} from "@b9g/crank";
import type {Component} from "@b9g/crank";
import {renderer} from "@b9g/crank/html.js";

import {router} from "./routes.js";
import {Storage} from "./components/esbuild.js";

const __dirname = new URL(".", import.meta.url).pathname;
const storage = new Storage({
	dirname: __dirname,
	staticPaths: [path.join(__dirname, "../static")],
});

import HomeView from "./views/home.js";
import BlogHomeView from "./views/blog-home.js";
import GuideView from "./views/guide.js";
import BlogView from "./views/blog.js";
import PlaygroundView from "./views/playground.js";
import SandboxView from "./views/sandbox.js";

const views: Record<string, Component> = {
	home: HomeView,
	blogHome: BlogHomeView,
	blog: BlogView,
	guide: GuideView,
	playground: PlaygroundView,
	sandbox: SandboxView,
};

const server = createServer(async (req, res) => {
	// TODO: Why can req.url be undefined???
	const url = req.url || "";
	console.info(`req: ${url}`);
	if (url.startsWith(storage.publicPath)) {
		const source = await storage.serve(url);
		const mimeType = mime.lookup(url) || "application/octet-stream";
		const charset = mime.charset(mimeType) || "binary";
		if (source) {
			res.writeHead(200, {
				"Content-Type": mimeType,
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
	const html = await renderer.render(xm`
		<${View} url=${url} storage=${storage} params=${match.params} />
	`);
	res.end(html, "utf-8");
});

const PORT = 1338;
console.info(`Server is listening on port ${PORT}`);
server.listen(PORT);
