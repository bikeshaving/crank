import {jsx} from "@b9g/crank/standalone";
import * as path from "path";

import {Root} from "../components/root.js";
import {Main, Sidebar} from "../components/sidebar.js";
import {BlogContent} from "../components/blog-content.js";
import {Marked} from "../components/marked.js";
import {components} from "../components/marked-components.js";
import type {ViewProps} from "../router.js";

import {collectDocuments} from "../models/document.js";
const __dirname = new URL(".", import.meta.url).pathname;

export default async function BlogHome({context: {storage}}: ViewProps) {
	const posts = await collectDocuments(
		path.join(__dirname, "../../../docs/blog"),
		path.join(__dirname, "../../../docs/"),
	);
	posts.reverse();

	return jsx`
		<${Root} title="Crank.js | Blog" url="/blog" storage=${storage}>
			<${Sidebar} docs=${posts} url="/blog" title="Recent Posts" />
			<${Main}>
				${posts.map((post) => {
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

					const {title, publishDate, author, authorURL} = post.attributes;
					return jsx`
						<div class="content">
								<${BlogContent}
										title=${title}
										publishDate=${publishDate}
										author=${author}
										authorURL=${authorURL}
								>
								<${Marked} markdown=${body} components=${components} />
								<//BlogContent>
							<div>
								<a href=${post.url}>Read more ...</a>
							</div>
						</div>
					`;
				})}
			<//Main>
		<//Root>
	`;
}
