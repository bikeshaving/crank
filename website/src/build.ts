import {jsx} from "@b9g/crank/standalone";
import type {Component} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/html";
import {renderStylesToString} from "@emotion/server";

import FS from "fs-extra";
import * as Path from "path";

// TODO: lazily import these?
// TODO: I do not understand the importance of these imports. I may very well delete them.
// Watch out. I am a madman. I MIGHT ACTUALLY DELETE THESE.
import "prismjs";
import "prismjs/components/prism-javascript.js";
import "prismjs/components/prism-jsx.js";
import "prismjs/components/prism-typescript.js";
import "prismjs/components/prism-tsx.js";
import "prismjs/components/prism-diff.js";
import "prismjs/components/prism-bash.js";

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
	//{
	//	// GUIDES
	//	const docs = await collectDocuments(
	//		path.join(__dirname, "../documents/guides"),
	//		path.join(__dirname, "../documents/"),
	//	);
	//
	//	await Promise.all(
	//		docs.map(async (post) => {
	//			const {
	//				attributes: {publish},
	//				url,
	//			} = post;
	//			if (!publish) {
	//				return;
	//			}
	//
	//			const match = router.match(url);
	//			if (!match) {
	//				return;
	//			}
	//
	//			const html = await renderer.render(jsx`
	//				<${Guide} url=${url} storage=${storage} params=${match.params} />
	//			`);
	//
	//			const filename = path.join(dist, url + ".html");
	//			await fs.ensureDir(path.dirname(filename));
	//			await fs.writeFile(filename, html);
	//		}),
	//	);
	//import BlogHome from "./views/blog-home.js";
	//{
	//	const html = await renderer.render(jsx`
	//		<${BlogHome} storage=${storage} />
	//	`);
	//
	//	await fs.ensureDir(path.join(dist, "blog"));
	//	await fs.writeFile(path.join(dist, "blog/index.html"), html);
	//}
	//
	//import BlogPage from "./views/blog.js";
	//{
	//	// BLOG POSTS
	//	const posts = await collectDocuments(
	//		path.join(__dirname, "../documents/blog"),
	//		path.join(__dirname, "../documents/"),
	//	);
	//	posts.reverse();
	//	await Promise.all(
	//		posts.map(async (post) => {
	//			const {
	//				attributes: {publish},
	//				url,
	//			} = post;
	//			if (!publish) {
	//				return;
	//			}
	//
	//			const match = router.match(url);
	//			if (!match) {
	//				return;
	//			}
	//
	//			const html = await renderer.render(jsx`
	//				<${BlogPage} url=${url} storage=${storage} />
	//			`);
	//
	//			const filename = path.join(dist, url + ".html");
	//			await fs.ensureDir(path.dirname(filename));
	//			await fs.writeFile(filename, html);
	//		}),
	//	);
	//}
}

await build(urls);
await storage.write(Path.join(dist, "/static/"));
storage.clear();
