/* @jsx createElement */
import {Stats} from "fs";
import * as fs from "fs-extra";
import * as path from "path";
import frontmatter from "front-matter";
import marked from "marked";
import {Children, createElement, Fragment} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/cjs/html";
import Typography from "typography";
// @ts-ignore
import CodePlugin from "typography-plugin-code";
// @ts-ignore
import githubTheme from "typography-theme-github";
githubTheme.plugins = [new CodePlugin()];
const typography = new Typography(githubTheme);

interface WalkInfo {
	filename: string;
	info: Stats;
}

async function *walk(name: string): AsyncGenerator<WalkInfo> {
	const files = await fs.readdir(name);
	for (const filename of files) {
		const name1 = path.join(name, filename);
		const stat = await fs.stat(name1);
		if (stat.isDirectory()) {
			yield *walk(name1);
		} else if (stat.isFile()) {
			yield {filename: name1, info: stat};
		}
	}
}

interface ParseInfo {
	url: string;
	filename: string;
	html: string;
	title: string;
}

async function parseInfos(
	name: string,
	root: string = name,
): Promise<Array<ParseInfo>> {
	let infos: Array<ParseInfo> = [];
	for await (const {filename, info} of walk(name)) {
		if (info.isFile()) {
			if (filename.endsWith(".md")) {
				const md = await fs.readFile(filename, {encoding: "utf8"});
				const {attributes: {title}, body} = frontmatter(md);
				const html = marked(body);
				const url = path.relative(root, filename)
					.replace(/\.md$/, "")
					.replace(/[0-9]+-/, "");
				infos.push({url, filename, html, title});
			}
		} else if (filename !== name) {
			const infos1 = await parseInfos(filename, name);
			infos = infos.concat(infos1);
		}
	}

	return infos;
}

function Page({head, children}: {head: Children, children: Children}) {
	return (
		<Fragment>
			<Fragment innerHTML="<!DOCTYPE html>" />
			<html lang="en">
				<head>
					<meta charset="utf-8" />
					<meta
						name="viewport"
						content="width=device-width, initial-scale=1.0"
					/>
					{head}
					<style innerHTML={typography.createStyles()} />
					<link
						href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.19.0/themes/prism.min.css"
						rel="stylesheet"
					/>
				</head>
				<body>
					{children}
					<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.19.0/prism.min.js" />
					<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.19.0/plugins/autoloader/prism-autoloader.min.js" />
				</body>
			</html>
		</Fragment>
	);
}

interface HomeProps {
	docs: Array<ParseInfo>;
}


function Home({docs}: HomeProps) {
	return (
		<Page head={<title>Crank.js</title>}>
			<div>
				{
					docs.map((doc) => (
						<div>
							<a href={doc.url}>{doc.title}</a>
						</div>
					))
				}
			</div>
		</Page>
	);
}

interface DocProps {
	html: string;
	title: string;
}

function Doc({title, html}: DocProps) {
	return (
		<Page head={<title>Crank.js | {title}</title>}>
			<h1>{title}</h1>
			<div innerHTML={html} />
		</Page>
	);
}

(async () => {
	const dist = path.join(__dirname, "./dist");
	await fs.ensureDir(dist);
	await fs.emptyDir(dist);
	const docs = await parseInfos(path.join(__dirname, "./docs"));
	const home = renderer.renderToString(
		<Home docs={docs} />
	);
	await fs.writeFile(path.join(dist, "./index.html"), home);
	await Promise.all(docs.map(async (doc) => {
		const filename = path.join(dist, doc.url + ".html");
		await fs.ensureDir(path.dirname(filename));
		const html = renderer.renderToString(
			<Doc title={doc.title} html={doc.html} />,
		);
		return fs.writeFile(filename, html);
	}));
})();
