/** @jsx createElement */
import {
	Children,
	createElement,
	Element,
	Fragment,
	Raw,
} from "@bikeshaving/crank";
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
	title: string;
	filename: string;
	html: string;
	publish: boolean;
	publishDate?: Date;
}

async function parseDocs(
	name: string,
	root: string = name,
): Promise<Array<DocInfo>> {
	let docs: Array<DocInfo> = [];
	for await (const {filename} of walk(name)) {
		if (filename.endsWith(".md")) {
			const md = await fs.readFile(filename, {encoding: "utf8"});
			let {
				attributes: {title, publish = true, publishDate},
				body,
			} = frontmatter(md);
			const html = marked(body);
			const urlRoot = path.relative(__dirname, name);
			const url = path.join(
				"/",
				urlRoot,
				path
					.relative(root, filename)
					.replace(/\.md$/, "")
					.replace(/([0-9]+-)*/, ""),
			);
			if (publishDate != null) {
				publishDate = new Date(publishDate);
			}

			docs.push({url, filename, html, title, publish, publishDate});
		}
	}

	return docs;
}

const storage = new Storage(path.join(__dirname, "src"));
interface RootProps {
	title: string;
	children: Children;
}

// @ts-ignore
import Typography from "typography";
// @ts-ignore
import CodePlugin from "typography-plugin-code";
const typo = new Typography({
	overrideStyles: () => ({
		a: {
			color: "#22a2c9",
			textDecoration: "none",
		},
	}),
	plugins: [new CodePlugin()],
});

// TODO: I wonder if we can do some kind of slot-based or includes API
function Root({title, children}: RootProps): Element {
	return (
		<html lang="en">
			<Raw value="<!DOCTYPE html>" />
			<Page storage={storage}>
				<head>
					<meta charset="UTF-8" />
					<title>{title}</title>
					<Link rel="stylesheet" type="text/css" href="./index.css" />
					<style>
						<Raw value={typo.toString()} />
					</style>
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
		<nav class="navbar">
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
		</nav>
	);
}

interface SidebarProps {
	docs: Array<DocInfo>;
	url: string;
	title: string;
}

function Sidebar({docs, title, url}: SidebarProps): Element {
	const links: Array<Element> = [];
	for (const doc of docs) {
		if (doc.publish) {
			links.push(
				<div class="sidebar-item">
					<a href={doc.url} class={doc.url === url ? "current" : ""}>
						{doc.title}
					</a>
				</div>,
			);
		}
	}

	return (
		<div class="sidebar">
			<h3>{title}</h3>
			{links}
		</div>
	);
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

interface BlogContentProps {
	title: string;
	html: string;
	publishDate?: Date;
}

function BlogContent({title, html, publishDate}: BlogContentProps) {
	const formattedDate =
		publishDate &&
		publishDate.toLocaleString("en-US", {
			month: "long",
			year: "numeric",
			day: "numeric",
		});
	return (
		<Fragment>
			<h1>{title}</h1>
			{formattedDate && <p>{formattedDate}</p>}
			<Raw value={html} />
		</Fragment>
	);
}

interface BlogPreviewProps {
	docs: Array<DocInfo>;
}

function BlogPreview({docs}: BlogPreviewProps): Array<Element> {
	return docs.map((doc) => {
		let html = doc.html;
		if (html.match("<!-- truncate -->")) {
			[html] = html.split("<!-- truncate -->");
		}

		return (
			<div class="content">
				<BlogContent {...doc} html={html} />
				<div>
					<a href={doc.url}>Read more…</a>
				</div>
			</div>
		);
	});
}

interface BlogIndexPageProps {
	docs: Array<DocInfo>;
	url: string;
}

function BlogIndexPage({docs, url}: BlogIndexPageProps): Element {
	return (
		<Root title="Crank.js | Blog">
			<Sidebar docs={docs} url={url} title="Recent Posts" />
			<BlogPreview docs={docs} />
		</Root>
	);
}

interface BlogPageProps {
	html: string;
	title: string;
	url: string;
	publishDate?: Date;
	docs: Array<DocInfo>;
}

function BlogPage({
	title,
	docs,
	html,
	publishDate,
	url,
}: BlogPageProps): Element {
	return (
		<Root title={`Crank.js | ${title}`}>
			<Sidebar docs={docs} url={url} title="Recent Posts" />
			<div class="content">
				<BlogContent title={title} html={html} publishDate={publishDate} />
			</div>
		</Root>
	);
}

interface GuidePageProps {
	html: string;
	title: string;
	url: string;
	docs: Array<DocInfo>;
}

function GuidePage({title, html, docs, url}: GuidePageProps): Element {
	return (
		<Root title={`Crank.js | ${title}`}>
			<Sidebar docs={docs} url={url} title="Guides" />
			<div class="content">
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
	const docs = await parseDocs(path.join(__dirname, "guides"));
	const posts = await parseDocs(path.join(__dirname, "blog"));
	await fs.copy(path.join(__dirname, "static"), path.join(dist, "static"));
	await fs.writeFile(
		path.join(dist, "index.html"),
		await renderer.renderToString(<Home docs={docs} />),
	);
	await Promise.all(
		docs.map(async ({title, html, url, publish}) => {
			if (!publish) {
				return;
			}

			const filename = path.join(dist, url + ".html");
			await fs.ensureDir(path.dirname(filename));
			return fs.writeFile(
				filename,
				await renderer.renderToString(
					<GuidePage title={title} html={html} docs={docs} url={url} />,
				),
			);
		}),
	);

	await fs.ensureDir(path.join(dist, "blog"));
	await fs.writeFile(
		path.join(dist, "blog/index.html"),
		await renderer.renderToString(<BlogIndexPage docs={posts} url="/blog" />),
	);
	await Promise.all(
		posts.map(async ({title, html, url, publish, publishDate}) => {
			if (!publish) {
				return;
			}

			const filename = path.join(dist, url + ".html");
			await fs.ensureDir(path.dirname(filename));
			return fs.writeFile(
				filename,
				await renderer.renderToString(
					<BlogPage
						title={title}
						html={html}
						docs={posts}
						url={url}
						publishDate={publishDate}
					/>,
				),
			);
		}),
	);
})();
