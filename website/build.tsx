/** @jsx createElement */
import {Children, createElement, Element, Raw} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/cjs/html";
import {Stats} from "fs";
import * as fs from "fs-extra";
import * as path from "path";
import frontmatter from "front-matter";
import marked from "marked";
import {Page, Link, Script, Storage} from "./webpack";

interface WalkInfo {
	filename: string;
	info: Stats;
}

async function* walk(dir: string): AsyncGenerator<WalkInfo> {
	const files = await fs.readdir(dir);
	for (let filename of files) {
		filename = path.join(dir, filename);
		const info = await fs.stat(filename);
		if (info.isDirectory()) {
			yield* walk(filename);
		} else if (info.isFile()) {
			yield {filename, info};
		}
	}
}

interface DocInfo {
	url: string;
	filename: string;
	html: string;
	title: string;
	publish: boolean;
}

async function parseDocs(
	name: string,
	root: string = name,
): Promise<Array<DocInfo>> {
	let docs: Array<DocInfo> = [];
	for await (const {filename} of walk(name)) {
		if (filename.endsWith(".md")) {
			const md = await fs.readFile(filename, {encoding: "utf8"});
			const {
				attributes: {title, publish = true},
				body,
			} = frontmatter(md);
			const html = marked(body);
			const url = path
				.relative(root, filename)
				.replace(/\.md$/, "")
				.replace(/[0-9]+-/, "");
			docs.push({url, filename, html, title, publish});
		}
	}

	return docs;
}

const storage = new Storage(path.join(__dirname, "src"));
interface RootProps {
	title: string;
	children: Children;
}

// TODO: I wonder if we can do some kind of slot-based or includes API
function Root({title, children}: RootProps): Element {
	return (
		<html lang="en">
			<Raw value="<!DOCTYPE html>" />
			<Page storage={storage}>
				<head>
					<meta charset="UTF-8" />
					<title>{title}</title>
					<Link rel="stylesheet" type="text/css" href="index.css" />

					<link
						rel="stylesheet"
						type="text/css"
						href="https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css"
					/>
					<link
						rel="stylesheet"
						type="text/css"
						href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/4.0.0/github-markdown.min.css"
					/>
				</head>
				<body>
					<Navbar />
					<div class="main">{children}</div>
					<Script src="index.tsx" />
				</body>
			</Page>
		</html>
	);
}

function Navbar(): Element {
	return (
		<div class="navbar-background markdown-body">
			<header class="navbar">
				<div class="navbar-group">
					<div class="navbar-item">
						<a href="/">Crank.js</a>
					</div>
					<div class="navbar-item">
						<a href="/guides/getting-started">Docs</a>
					</div>
					<div class="navbar-item">
						<a href="/blog/">Blog</a>
					</div>
				</div>
				<div class="navbar-group">
					<div class="navbar-item">
						<a href="https://github.com/brainkim/crank">Github</a>
					</div>
					<div class="navbar-item">
						<a href="http://npm.im/@bikeshaving/crank">NPM</a>
					</div>
				</div>
			</header>
		</div>
	);
}

interface SidebarProps {
	docs: Array<DocInfo>;
	prefix?: string;
}

function Sidebar({docs, prefix = "/guides"}: SidebarProps): Element {
	const links: Array<Element> = [];
	for (const doc of docs) {
		if (doc.publish) {
			links.push(
				<div class="sidebar-item">
					<a href={path.join(prefix, doc.url)}>{doc.title}</a>
				</div>,
			);
		}
	}

	return (
		<div class="sidebar markdown-body">
			<h4>Sidebar</h4>
			{links}
		</div>
	);
}

interface PageProps {
	docs: Array<DocInfo>;
}

function Home(): Element {
	return (
		<Root title="Crank.js">
			<div class="hero">
				<h1>Crank.js</h1>
				<p>JSX-driven components with functions, promises and generators.</p>
			</div>
		</Root>
	);
}

function BlogIndex({docs}: PageProps): Element {
	return (
		<Root title="Crank.js | Blog">
			<Sidebar prefix="/blog" docs={docs} />
		</Root>
	);
}

function Blog({title, docs, html}: DocProps): Element {
	return (
		<Root title={`Crank.js | ${title}`}>
			<Sidebar docs={docs} />
			<div class="content markdown-body">
				<h1>{title}</h1>
				<Raw value={html} />
			</div>
		</Root>
	);
}

interface DocProps extends PageProps {
	html: string;
	title: string;
	docs: Array<DocInfo>;
}

function Doc({title, html, docs}: DocProps): Element {
	return (
		<Root title={`Crank.js | ${title}`}>
			<Sidebar docs={docs} />
			<div class="content markdown-body">
				<h1>{title}</h1>
				<Raw value={html} />
			</div>
		</Root>
	);
}

(async () => {
	const dist = path.join(__dirname, "./dist");
	await fs.ensureDir(dist);
	await fs.emptyDir(dist);
	const docs = await parseDocs(path.join(__dirname, "./guides"));
	const posts = await parseDocs(path.join(__dirname, "./blog"));
	await fs.writeFile(
		path.join(dist, "./index.html"),
		await renderer.renderToString(<Home docs={docs} />),
	);
	await Promise.all(
		docs.map(async ({title, html, url, publish}) => {
			if (!publish) {
				return;
			}

			const filename = path.join(dist, "guides", url + ".html");
			await fs.ensureDir(path.dirname(filename));
			return fs.writeFile(
				filename,
				await renderer.renderToString(
					<Doc title={title} html={html} docs={docs} />,
				),
			);
		}),
	);

	await fs.ensureDir(path.join(dist, "blog"));
	await fs.writeFile(
		path.join(dist, "blog/index.html"),
		await renderer.renderToString(<BlogIndex docs={posts} />),
	);
	await Promise.all(
		posts.map(async ({title, html, url, publish}) => {
			if (!publish) {
				return;
			}

			const filename = path.join(dist, "blog", url + ".html");
			await fs.ensureDir(path.dirname(filename));
			return fs.writeFile(
				filename,
				await renderer.renderToString(
					<Blog title={title} html={html} docs={posts} />,
				),
			);
		}),
	);
})();
