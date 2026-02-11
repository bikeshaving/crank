import {jsx} from "@b9g/crank/standalone";
import {css} from "@emotion/css";

import {NotFound} from "@b9g/http-errors";
import {Root} from "../components/root.js";
import {BlogContent} from "../components/blog-content.js";
import {Marked} from "../components/marked.js";
import {components} from "../components/marked-components.js";
import {Giscus} from "../components/giscus.js";
import {EditOnGitHub} from "../components/edit-on-github.js";

interface ViewProps {
	url: string;
	params: Record<string, string>;
}

import {collectDocuments} from "../models/document.js";

function estimateReadTime(body: string): number {
	const words = body.trim().split(/\s+/).length;
	return Math.max(1, Math.ceil(words / 200));
}

export default async function BlogPage({url}: ViewProps) {
	const docsDir = await self.directories.open("docs");
	const blogDir = await docsDir.getDirectoryHandle("blog");
	const posts = await collectDocuments(blogDir, "blog");
	posts.reverse();
	const post = posts.find(
		(doc) => doc.url.replace(/\/$/, "") === url.replace(/\/$/, ""),
	);
	if (!post) {
		throw new NotFound(`Blog post not found: ${url}`);
	}

	const {
		attributes: {title, publishDate, author, authorURL, description},
		body,
		filename,
	} = post;

	const readTime = estimateReadTime(body);

	return jsx`
		<${Root} title="Crank.js | ${title}" url=${url} description=${description}>
			<main class=${css`
				max-width: 900px;
				margin: 0 auto;
				padding: 80px 1rem 3rem;

				@media (min-width: 800px) {
					padding: 100px 2rem 4rem;
				}
			`}>
				<nav class=${css`
					margin-bottom: 2rem;
				`}>
					<a
						href="/blog"
						class=${css`
							color: var(--highlight-color);
							text-decoration: none;
							font-size: 0.95rem;
							display: inline-flex;
							align-items: center;
							gap: 0.5rem;

							&:hover {
								text-decoration: underline;
							}
						`}
					>${"←"} Back to Blog</a>
				</nav>

				<${BlogContent}
					title=${title}
					description=${description}
					publishDate=${publishDate}
					author=${author}
					authorURL=${authorURL}
					readTime=${readTime}
				>
					<${Marked} markdown=${body} components=${components} />
				<//BlogContent>

				<div class=${css`
					max-width: 800px;
					margin-top: 2rem;
				`}>
					<${EditOnGitHub} filename=${filename} />
				</div>

				<div class=${css`
					max-width: 800px;
					margin-top: 3rem;
					padding-top: 2rem;
					border-top: 1px solid var(--text-color);
				`}>
					<${Giscus}
						repo="bikeshaving/crank"
						repoId="MDEwOlJlcG9zaXRvcnkyMDY0Mzk3MDc="
						category="Comments"
						categoryId="DIC_kwDODE4FG84Cw3V5"
						mapping="url"
						strict=${true}
						reactionsEnabled=${true}
						emitMetadata=${true}
						inputPosition="top"
					/>
				</div>
			</main>
		<//Root>
	`;
}
