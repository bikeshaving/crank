import {t} from "@b9g/crank/template.js";
import * as path from "path";

import {Root} from "../views/root.js";

import {Sidebar} from "../components/navigation.js";
import {BlogContent} from "../components/blog-content.js";
import {Marked} from "../components/marked.js";
import {components} from "../components/marked-components.js";
import type {Storage} from "../components/esbuild.js";

import {collectDocuments} from "../models/document.js";
const __dirname = new URL(".", import.meta.url).pathname;

export interface BlogIndexPageProps {
	storage: Storage;
}

export default async function BlogIndexPage({storage}: BlogIndexPageProps) {
	// BLOG INDEX
	const posts = await collectDocuments(
		path.join(__dirname, "../../documents/blog"),
		path.join(__dirname, "../../documents/"),
	);
	posts.reverse();
	return t`
		<${Root} title="Crank.js | Blog" url="/blog" storage=${storage}>
			<${Sidebar} docs=${posts} url="/blog" title="Recent Posts" />
			<main class="main">${posts.map((post) => {
				let {body} = post;
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

				const {title, publishDate} = post.attributes;
				return t`
					<div class="content">
						<${BlogContent} title=${title} publishDate=${publishDate}>
							<${Marked} markdown=${body} components=${components} />
						<//BlogContent>
						<div>
							<a href=${post.url}>Read more…</a>
						</div>
					</div>
				`;
			})}</main>
		<//Root>
	`;
}
