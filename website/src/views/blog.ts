import {xm} from "@b9g/crank";
import * as path from "path";

import {Root} from "../components/root.js";
import {Sidebar} from "../components/sidebar.js";
import {BlogContent} from "../components/blog-content.js";
import {Marked} from "../components/marked.js";
import {components} from "../components/marked-components.js";
import type {Storage} from "../components/esbuild.js";

import {collectDocuments} from "../models/document.js";

const __dirname = new URL(".", import.meta.url).pathname;

export interface BlogPageProps {
	url: string;
	storage: Storage;
}

export default async function BlogPage({url, storage}: BlogPageProps) {
	const posts = await collectDocuments(
		path.join(__dirname, "../../documents/blog"),
		path.join(__dirname, "../../documents/"),
	);
	posts.reverse();
	const post = posts.find((doc) => doc.url === url);
	if (!post) {
		throw new Error("TODO: 404 errors");
	}

	const {
		attributes: {title, publishDate},
		body,
	} = post;
	return xm`
		<${Root} title="Crank.js | ${title}" url=${url} storage=${storage}>
			<${Sidebar} docs=${posts} url=${url} title="Recent Posts" />
			<main class="main">
				<div class="content">
					<${BlogContent} title=${title} publishDate=${publishDate}>
						<${Marked} markdown=${body} components=${components} />
					<//BlogContent>
				</div>
			</main>
		<//Root>
	`;
}
