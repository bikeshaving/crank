import {t} from "@b9g/crank/template.js";
import {renderer} from "@b9g/crank/html.js";
import type {Children, Element} from "@b9g/crank/crank.js";

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

import {collectDocuments} from "./models/document.js";
import type {DocInfo} from "./models/document.js";

import {Marked} from "./components/marked.js";
import {components} from "./components/marked-components.js";
import {Sidebar} from "./components/navigation.js";
import {Storage} from "./components/esbuild.js";
import {Root} from "./components/root.js";

const rootDirname = new URL(".", import.meta.url).pathname;
const storage = new Storage({dirname: rootDirname});

const dist = path.join(rootDirname, "../dist");
await fs.emptyDir(dist);
await fs.ensureDir(dist);

import Home from "./views/home.js";
{
	// HOMEPAGE
	await fs.writeFile(
		path.join(dist, "index.html"),
		await renderer.render(t`<${Home} storage=${storage} />`),
	);
}

import Guide from "./views/guide.js";

{
	// GUIDES
	const docs = await collectDocuments(
		path.join(rootDirname, "../documents/guides"),
		path.join(rootDirname, "../documents/"),
	);
	await Promise.all(
		docs.map(async (post) => {
			const {
				attributes: {title, publish},
				body,
				url,
			} = post;
			if (!publish) {
				return;
			}

			const filename = path.join(dist, url + ".html");
			const html = await renderer.render(t`
			<${Guide} title=${title} docs=${docs} url=${url} storage=${storage}>
				<${Marked} markdown=${body} components=${components} />
			<//Guide>
		`);

			await fs.ensureDir(path.dirname(filename));
			await fs.writeFile(filename, html);
		}),
	);
}

import BlogHome from "./views/blog-home.js";
{
	const html = await renderer.render(t`
		<${BlogHome} storage=${storage} />
	`);

	await fs.ensureDir(path.join(dist, "blog"));
	await fs.writeFile(path.join(dist, "blog/index.html"), html);
}

import {BlogContent} from "./components/blog-content.js";

interface BlogPageProps {
	title: string;
	url: string;
	publishDate?: Date;
	docs: Array<DocInfo>;
	children: Children;
}

function BlogPage({
	title,
	docs,
	children,
	publishDate,
	url,
}: BlogPageProps): Element {
	return t`
		<${Root} title="Crank.js | ${title}" url=${url} storage=${storage}>
			<${Sidebar} docs=${docs} url=${url} title="Recent Posts" />
			<main class="main">
				<div class="content">
					<${BlogContent} title=${title} publishDate=${publishDate}>
						${children}
					<//BlogContent>
				</div>
			</main>
		<//Root>
	`;
}

{
	// BLOG POSTS
	const posts = await collectDocuments(
		path.join(rootDirname, "../documents/blog"),
		path.join(rootDirname, "../documents/"),
	);
	posts.reverse();
	await Promise.all(
		posts.map(async (post) => {
			const {
				attributes: {title, publish, publishDate},
				url,
				body,
			} = post;
			if (!publish) {
				return;
			}

			const filename = path.join(dist, url + ".html");
			await fs.ensureDir(path.dirname(filename));
			const html = await renderer.render(t`
				<${BlogPage}
					title=${title}
					docs=${posts}
					url=${url}
					publishDate=${publishDate}
				>
					<${Marked} markdown=${body} components=${components} />
				<//BlogPage>
			`);
			await fs.writeFile(filename, html);
		}),
	);
}

await fs.copy(path.join(rootDirname, "../static"), path.join(dist, "static"));

await storage.write(path.join(dist, "static/"));
storage.clear();
