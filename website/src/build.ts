import {jsx} from "@b9g/crank/standalone";
import type {Component} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/html";
import {renderStylesToString} from "@emotion/server";

import * as FS from "fs/promises";
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
// Empty a directory
// Ensure that the dist directory exists and that it's empty
await FS.rm(dist, {recursive: true, force: true});
import HomeView from "./views/home.js";
import BlogHomeView from "./views/blog-home.js";
import GuideView from "./views/guide.js";
import BlogView from "./views/blog.js";
import PlaygroundView from "./views/playground.js";

const views: Record<string, Component> = {
	home: HomeView,
	["blog-home"]: BlogHomeView,
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
const urls = ["/", "/blog", "/playground", ...guideURLs, ...blogURLs];

async function build(urls: Array<string>) {
	for (const url of urls) {
		// TODO: Make a mock request object and pass it through the server, and use the Response object to write html files.
		const match = router.match(url);
		if (!match) {
			console.error("no match for", url);
			continue;
		}

		const View = views[match.name];
		if (!View) {
			console.error("no view for", match.name);
			continue;
		}

		const html = renderStylesToString(
			await renderer.render(jsx`
				<${View}
					url=${url}
					params=${match.params}
					context=${{storage}}
				/>
			`),
		);

		console.info("writing", url);
		await FS.mkdir(Path.join(dist, url), {recursive: true});
		await FS.writeFile(Path.join(dist, url, "index.html"), html);
	}
}

await build(urls);

await storage.write(Path.join(dist, "/static/"));
storage.clear();
