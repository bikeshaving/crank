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

import {Page, Link, Script, Storage} from "./components/esbuild.js";
import {CodeBlock} from "./components/prism.js";
import {Marked} from "./components/marked.js";
import {Navbar, Sidebar} from "./components/navigation.js";
import {GoogleSpyware} from "./components/google-spyware.js";

import {collectDocuments} from "./models/document.js";
import type {DocInfo} from "./models/document.js";

const rootDirname = new URL(".", import.meta.url).pathname;
const storage = new Storage({dirname: rootDirname});

interface RootProps {
	title: string;
	children: Children;
	url: string;
	storage: Storage;
}

function Root({title, children, url, storage}: RootProps): Element {
	return t`
		<$RAW value="<!DOCTYPE html>" />
		<${Page} storage=${storage}>
			<html lang="en">
				<head>
					<meta charset="UTF-8" />
					<meta name="viewport" content="width=device-width" />
					<title>${title}</title>
					<${Link} rel="stylesheet" type="text/css" href="client.css" />
					<link rel="shortcut icon" href="/static/favicon.ico" />
					<${GoogleSpyware} />
				</head>
				<body>
					<${Navbar} url=${url} />
					<div class="non-footer">${children}</div>
					<${Script} src="client.ts" />
				</body>
			</html>
		<//Page>
	`!;
}

// TODO: where does this belong
const components = {
	codespan({token}: any) {
		return t`<code class="inline">${token.text}</code>`;
	},

	code({token}: any) {
		const {text: code, lang} = token;
		return t`
			<div class="codeblock" data-code=${code} data-lang=${lang}>
				<${CodeBlock} value=${code} lang=${lang} />
			</div>
		`;
	},
};

const dist = path.join(rootDirname, "../dist");
await fs.ensureDir(dist);
await fs.emptyDir(dist);
await fs.copy(path.join(rootDirname, "../static"), path.join(dist, "static"));

async function Home(): Promise<Element> {
	const markdown = await fs.readFile(
		path.join(rootDirname, "../documents/index.md"),
		{encoding: "utf8"},
	);

	return t`
		<${Root} title="Crank.js" url="/" storage=${storage}>
			<div class="home">
				<header class="hero">
					<h1>Crank.js</h1>
					<h2>The most “Just JavaScript” web framework.</h2>
				</header>
				<${Marked} components=${components} markdown=${markdown} />
			</div>
		<//Root>
	`;
}

{
	// HOME
	await fs.writeFile(
		path.join(dist, "index.html"),
		await renderer.render(t`<${Home} />`),
	);
}

interface GuidePageProps {
	title: string;
	url: string;
	docs: Array<DocInfo>;
	children: Children;
}

function GuidePage({title, docs, url, children}: GuidePageProps): Element {
	return t`
		<${Root} title="Crank.js | ${title}" url=${url} storage=${storage}>
			<${Sidebar} docs=${docs} url=${url} title="Guides" />
			<main class="main">
				<div class="content">
					<h1>${title}</h1>
					${children}
				</div>
			</main>
		<//Root>
	`;
}

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
				url,
				body,
			} = post;
			if (!publish) {
				return;
			}

			const filename = path.join(dist, url + ".html");
			await fs.ensureDir(path.dirname(filename));
			const html = await renderer.render(t`
				<${GuidePage} title=${title} docs=${docs} url=${url}>
					<${Marked} markdown=${body} components=${components} />
				<//GuidePage>
			`);
			return fs.writeFile(filename, html);
		}),
	);
}

interface BlogContentProps {
	title: string;
	publishDate?: Date;
	children: Children;
}

function BlogContent({title, publishDate, children}: BlogContentProps) {
	const formattedDate =
		publishDate &&
		publishDate.toLocaleString("en-US", {
			month: "long",
			year: "numeric",
			day: "numeric",
			timeZone: "UTC",
		});
	return t`
		<h1>${title}</h1>
		${formattedDate && t`<p>${formattedDate}</p>`}
		${children}
	`;
}

interface BlogPreviewProps {
	docs: Array<DocInfo>;
}

function BlogPreview({docs}: BlogPreviewProps): Array<Element> {
	return docs.map((doc) => {
		let {body} = doc;
		if (body.match("<!-- endpreview -->")) {
			body = body.split("<!-- endpreview -->")[0];
		} else {
			const lines = body.split(/\r\n|\r|\n/);
			body = "";
			let count = 0;
			for (const line of lines) {
				body += line + "\n";
				if (line.trim()) {
					count++;
				}

				if (count > 2) {
					break;
				}
			}
		}

		const {title, publishDate} = doc.attributes;
		return t`
			<div class="content">
				<${BlogContent} title=${title} publishDate=${publishDate}>
					<${Marked} markdown=${body} components=${components} />
				<//BlogContent>
				<div>
					<a href=${doc.url}>Read more…</a>
				</div>
			</div>
		`;
	});
}

interface BlogIndexPageProps {
	docs: Array<DocInfo>;
	url: string;
}

function BlogIndexPage({docs, url}: BlogIndexPageProps): Element {
	return t`
		<${Root} title="Crank.js | Blog" url=${url} storage=${storage}>
			<${Sidebar} docs=${docs} url=${url} title="Recent Posts" />
			<main class="main">
				<${BlogPreview} docs=${docs} />
			</main>
		<//Root>
	`;
}

{
	// BLOG INDEX
	const posts = await collectDocuments(
		path.join(rootDirname, "../documents/blog"),
		path.join(rootDirname, "../documents/"),
	);
	posts.reverse();
	await fs.ensureDir(path.join(dist, "blog"));
	const html = await renderer.render(t`
		<${BlogIndexPage} docs=${posts} url="/blog" />
	`);
	await fs.writeFile(path.join(dist, "blog/index.html"), html);
}

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
			return fs.writeFile(filename, html);
		}),
	);
}

await storage.write(path.join(dist, "static/"));
storage.clear();
