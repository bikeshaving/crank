/** @jsx createElement */
import {
	Children,
	createElement,
	Element,
	Fragment,
	Raw,
} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/html";
import fs from "fs-extra";
import type {Stats} from "fs";
import * as path from "path";
import frontmatter from "front-matter";
import marked from "marked";
import {Page, Link, Script, Storage} from "./esbuild";

const __dirname = new URL(".", import.meta.url).pathname;

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

const markedRenderer: Partial<marked.Renderer> = {
	heading(text, level, raw, slugger) {
		const slug = slugger.slug(raw);
		if (level <= 3) {
			return `<h${level}>
				<a class="anchor" name="${slug}" href="#${slug}">${text}</a>
			</h${level}>`;
		}
		return `<h${level}>${text}</h${level}>`;
	},
};

marked.use({renderer: markedRenderer as marked.Renderer});

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

const storage = new Storage({
	dirname: path.join(__dirname, "src"),
});

interface RootProps {
	title: string;
	children: Children;
	url: string;
}

// TODO: I wonder if we can do some kind of slot-based or includes API
function Root({title, children, url}: RootProps): Element {
	return (
		<Fragment>
			<Raw value="<!DOCTYPE html>" />
			<Page storage={storage}>
				<html lang="en">
					<head>
						<meta charset="UTF-8" />
						<meta name="viewport" content="width=device-width" />
						<title>{title}</title>
						<Link rel="stylesheet" type="text/css" href="./index.css" />
						<link rel="shortcut icon" href="/static/favicon.ico" />
						<script
							async
							src="https://www.googletagmanager.com/gtag/js?id=UA-20910936-4"
						/>
						<script
							innerHTML={`
								window.dataLayer = window.dataLayer || [];
								function gtag(){dataLayer.push(arguments);}
								gtag('js', new Date());

								gtag('config', 'UA-20910936-4');
							`}
						/>
					</head>
					<body>
						<Navbar url={url} />
						{children}
						<Script src="index.tsx" />
					</body>
				</html>
			</Page>
		</Fragment>
	);
}

interface NavbarProps {
	url: string;
}

function Navbar({url}: NavbarProps): Element {
	return (
		<nav id="navbar" class="navbar">
			<div class="navbar-group">
				<div class="navbar-item">
					<a class={`navbar-title-link ${url === "/" && "current"}`} href="/">
						<img class="navbar-logo" src="/static/logo.svg" alt="" />
						<span>Crank.js</span>
					</a>
				</div>
				<div class="navbar-item">
					<a
						class={url.startsWith("/guides") && "current"}
						href="/guides/getting-started"
					>
						Docs
					</a>
				</div>
				<div class="navbar-item">
					<a class={url.startsWith("/blog") && "current"} href="/blog/">
						Blog
					</a>
				</div>
			</div>
			<div class="navbar-group">
				<div class="navbar-item">
					<a href="https://github.com/bikeshaving/crank">GitHub</a>
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

function Footer(): Element {
	return (
		<footer class="footer">
			<div>Copyright © 2020 Brian Kim.</div>
			<div>
				Distributed under the{" "}
				<a href="https://github.com/bikeshaving/crank/blob/master/LICENSE">
					MIT License
				</a>
				.
			</div>
			<div>
				Logo by <a href="https://wstone.io">Will Stone</a> and{" "}
				<a href="https://github.com/pjdon">Paul Donchenko</a>.
			</div>
		</footer>
	);
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
		<div id="sidebar" class="sidebar">
			<h3>{title}</h3>
			{links}
		</div>
	);
}

function Home(): Element {
	return (
		<Root title="Crank.js" url="/">
			<div class="home">
				<header class="hero">
					<div>
						<h1>Crank.js</h1>
						<h2>
							Write JSX-driven components with functions, promises and
							generators.
						</h2>
						<a href="/guides/getting-started">Get Started</a>
						<iframe
							src="https://ghbtns.com/github-btn.html?user=bikeshaving&repo=crank&type=star&count=true&size=large"
							frameborder="0"
							scrolling="0"
							width="160px"
							height="30px"
						/>
					</div>
				</header>
				<h2>Features</h2>
				<main class="features">
					<div class="feature">
						<h3>Declarative</h3>
						<p>
							Crank uses the same JSX syntax and diffing algorithm popularized
							by React, allowing you to write HTML-like code directly in
							JavaScript.
						</p>
					</div>
					<div class="feature">
						<h3>Just Functions</h3>
						<p>
							All components in Crank are just functions or generator functions.
							No classes, hooks, proxies or template languages are needed.
						</p>
					</div>
					<div class="feature">
						<h3>Promise-friendly</h3>
						<p>
							Crank provides first-class support for promises. You can define
							components as async functions and race renderings to display
							fallback UIs.
						</p>
					</div>
					<div class="feature">
						<h3>Lightweight</h3>
						<p>
							Crank has no dependencies, and its core is a single file. It
							currently measures at{" "}
							<a href="https://bundlephobia.com/result?p=@bikeshaving/crank">
								4.5KB minified and gzipped
							</a>
							.
						</p>
					</div>
					<div class="feature">
						<h3>Performant</h3>
						<p>
							<a href="https://github.com/krausest/js-framework-benchmark">
								According to benchmarks
							</a>
							, Crank beats React in terms of speed and memory usage, and is
							currently comparable to Preact or Vue.
						</p>
					</div>
					<div class="feature">
						<h3>Extensible</h3>
						<p>
							The core renderer can be extended to target alternative
							environments such as WebGL libraries, terminals, smartphones or
							smart TVs.
						</p>
					</div>
				</main>
			</div>
			<Footer />
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
			timeZone: "UTC",
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
		<Root title="Crank.js | Blog" url={url}>
			<Sidebar docs={docs} url={url} title="Recent Posts" />
			<main class="main">
				<BlogPreview docs={docs} />
				<Footer />
			</main>
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
		<Root title={`Crank.js | ${title}`} url={url}>
			<Sidebar docs={docs} url={url} title="Recent Posts" />
			<main class="main">
				<div class="content">
					<BlogContent title={title} html={html} publishDate={publishDate} />
				</div>
				<Footer />
			</main>
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
		<Root title={`Crank.js | ${title}`} url={url}>
			<Sidebar docs={docs} url={url} title="Guides" />
			<main class="main">
				<div class="content">
					<h1>{title}</h1>
					<Raw value={html} />
				</div>
				<Footer />
			</main>
		</Root>
	);
}

(async () => {
	const dist = path.join(__dirname, "./dist");
	await fs.ensureDir(dist);
	await fs.emptyDir(dist);
	const docs = await parseDocs(path.join(__dirname, "guides"));
	const posts = await parseDocs(path.join(__dirname, "blog"));
	posts.reverse();
	await fs.copy(path.join(__dirname, "static"), path.join(dist, "static"));
	await fs.writeFile(
		path.join(dist, "index.html"),
		await renderer.render(<Home />),
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
				await renderer.render(
					<GuidePage title={title} html={html} docs={docs} url={url} />,
				),
			);
		}),
	);

	await fs.ensureDir(path.join(dist, "blog"));
	await fs.writeFile(
		path.join(dist, "blog/index.html"),
		await renderer.render(<BlogIndexPage docs={posts} url="/blog" />),
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
				await renderer.render(
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

	await storage.write(path.join(dist, "static/"));
	storage.dispose();
})();
