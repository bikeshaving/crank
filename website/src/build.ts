import {jsx} from "@b9g/crank";
import {renderer} from "@b9g/crank/html.js";

import fs from "fs-extra";
import * as path from "path";

// TODO: lazily import these?
import "prismjs";
import "prismjs/components/prism-javascript.js";
import "prismjs/components/prism-jsx.js";
import "prismjs/components/prism-typescript.js";
import "prismjs/components/prism-tsx.js";
import "prismjs/components/prism-diff.js";
import "prismjs/components/prism-bash.js";

import {router} from "./routes.js";
import {collectDocuments} from "./models/document.js";

import {Storage} from "./components/esbuild.js";

const __dirname = new URL(".", import.meta.url).pathname;
const storage = new Storage({
	dirname: __dirname,
	staticPaths: [path.join(__dirname, "../static")],
});

const dist = path.join(__dirname, "../dist");
await fs.emptyDir(dist);
await fs.ensureDir(dist);

// TODO: Route this through the server or whatever
import Home from "./views/home.js";
{
	// HOMEPAGE
	await fs.writeFile(
		path.join(dist, "index.html"),
		await renderer.render(jsx`<${Home} storage=${storage} />`),
	);
}

import Guide from "./views/guide.js";

{
	// GUIDES
	const docs = await collectDocuments(
		path.join(__dirname, "../documents/guides"),
		path.join(__dirname, "../documents/"),
	);

	await Promise.all(
		docs.map(async (post) => {
			const {
				attributes: {publish},
				url,
			} = post;
			if (!publish) {
				return;
			}

			const match = router.match(url);
			if (!match) {
				return;
			}

			const html = await renderer.render(jsx`
				<${Guide} url=${url} storage=${storage} params=${match.params} />
			`);

			const filename = path.join(dist, url + ".html");
			await fs.ensureDir(path.dirname(filename));
			await fs.writeFile(filename, html);
		}),
	);
}

import BlogHome from "./views/blog-home.js";
{
	const html = await renderer.render(jsx`
		<${BlogHome} storage=${storage} />
	`);

	await fs.ensureDir(path.join(dist, "blog"));
	await fs.writeFile(path.join(dist, "blog/index.html"), html);
}

import BlogPage from "./views/blog.js";
{
	// BLOG POSTS
	const posts = await collectDocuments(
		path.join(__dirname, "../documents/blog"),
		path.join(__dirname, "../documents/"),
	);
	posts.reverse();
	await Promise.all(
		posts.map(async (post) => {
			const {
				attributes: {publish},
				url,
			} = post;
			if (!publish) {
				return;
			}

			const match = router.match(url);
			if (!match) {
				return;
			}

			const html = await renderer.render(jsx`
				<${BlogPage} url=${url} storage=${storage} />
			`);

			const filename = path.join(dist, url + ".html");
			await fs.ensureDir(path.dirname(filename));
			await fs.writeFile(filename, html);
		}),
	);
}

await storage.write(path.join(dist, "/static/"));
storage.clear();
