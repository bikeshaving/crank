import {jsx} from "@b9g/crank/standalone";
import type {Component} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/html";
import {renderStylesToString} from "@emotion/server";

import FS from "fs-extra";
import * as Path from "path";

import {collectDocuments} from "./models/document.js";
import {Storage} from "./components/esbuild.js";
import {router} from "./routes.js";

const __dirname = new URL(".", import.meta.url).pathname;
const storage = new Storage({
	dirname: __dirname,
	staticPaths: [Path.join(__dirname, "../static")],
});

const dist = Path.join(__dirname, "../dist");
await FS.emptyDir(dist);
await FS.ensureDir(dist);

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

const blogDocs = await collectDocuments(
	Path.join(__dirname, "../documents/blog"),
	Path.join(__dirname, "../documents"),
);
const guideDocs = await collectDocuments(
	Path.join(__dirname, "../documents/guides"),
	Path.join(__dirname, "../documents"),
);

const blogURLs = blogDocs.map((doc) => doc.url);
const guideURLs = guideDocs.map((doc) => doc.url);
// TODO: get the URLs from the file system (guides, blog posts, etc)
const urls = ["/", "/blog", "/playground", ...guideURLs, ...blogURLs];

async function build(urls: Array<string>) {
	for (const url of urls) {
		const match = router.match(url);
		if (!match) {
			continue;
		}

		const View = views[match.name];
		if (!View) {
			continue;
		}

		//res.writeHead(200, {"Content-Type": "text/html"});
		// TODO: Should we pass in name to props?
		let html = await renderer.render(jsx`
			<${View} url=${url} storage=${storage} params=${match.params} />
		`);

		// TODO: This is causing the process to hang.
		html = renderStylesToString(html);
		await FS.ensureDir(Path.join(dist, url));
		await FS.writeFile(Path.join(dist, url, "index.html"), html);
	}
}

await build(urls);
await storage.write(Path.join(dist, "/static/"));
storage.clear();
