import {jsx} from "@b9g/crank/standalone";
import * as path from "path";

import {Root} from "../components/root.js";
import {Main} from "../components/sidebar.js";
import {BlogContent} from "../components/blog-content.js";
import {Marked} from "../components/marked.js";
import {components} from "../components/marked-components.js";
import type {ViewProps} from "../router.js";

import {collectDocuments} from "../models/document.js";

const __dirname = new URL(".", import.meta.url).pathname;
export default async function BlogPage({url, context: {storage}}: ViewProps) {
	const posts = await collectDocuments(
		path.join(__dirname, "../../../docs/blog"),
		path.join(__dirname, "../../../docs/"),
	);
	posts.reverse();
	const post = posts.find(
		(doc) => doc.url.replace(/\/$/, "") === url.replace(/\/$/, ""),
	);
	if (!post) {
		throw new Error("TODO: 404 errors");
	}

	const {
		attributes: {title, publishDate, author, authorURL, description},
		body,
	} = post;
	return jsx`
		<${Root} title="Crank.js | ${title}" url=${url} description=${description} storage=${storage}>
			<${Main}>
				<${BlogContent}
					title=${title}
					publishDate=${publishDate}
					author=${author}
					authorURL=${authorURL}
				>
					<${Marked} markdown=${body} components=${components} />
				<//BlogContent>
			<//Main>
		<//Root>
	`;
}
