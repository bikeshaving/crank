import {jsx} from "@b9g/crank/standalone";
import * as path from "path";

import {Root} from "../components/root.js";
import {Main} from "../components/sidebar.js";
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
		<${Root} title="Crank.js | Blog" url="/blog" description="Read the latest articles and updates about Crank.js, exploring reactive UI patterns and framework design." storage=${storage}>
			<${Main}>
				${posts.map((post) => {
					const {title, publishDate, author, description} = post.attributes;
					const publishDateDisplay =
						publishDate &&
						publishDate.toLocaleString("en-US", {
							month: "long",
							year: "numeric",
							day: "numeric",
							timeZone: "UTC",
						});

					return jsx`
						<a href=${post.url} class="blog-preview-link" style="text-decoration: none; color: inherit; display: block; cursor: pointer;">
							<div class="content">
								<h1>${title}</h1>
								<p style="color: var(--text-color); opacity: 0.7; font-size: 0.9em;">
									${author && jsx`By <span style="text-decoration: underline;">${author}</span>`} \
									${publishDateDisplay && jsx`<span>${"–"} ${publishDateDisplay}</span>`}
								</p>
								${
									description
										? jsx`
									<p style="font-style: italic; color: var(--text-color); opacity: 0.8; margin: 1.5em 0;">
										${description}
									</p>
								`
										: jsx`
									<p style="font-style: italic; color: var(--text-color); opacity: 0.8; margin: 1.5em 0;">
										Click to read the full article...
									</p>
								`
								}
							</div>
						</a>
					`;
				})}
			<//Main>
		<//Root>
	`;
}
