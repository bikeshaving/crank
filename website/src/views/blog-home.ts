import {jsx} from "@b9g/crank/standalone";
import {css} from "@emotion/css";

import {Root} from "../components/root.js";
import {BlogCard} from "../components/blog-card.js";

interface ViewProps {
	url: string;
	params: Record<string, string>;
}

import {collectDocuments} from "../models/document.js";

function estimateReadTime(body: string): number {
	const words = body.trim().split(/\s+/).length;
	return Math.max(1, Math.ceil(words / 200));
}

export default async function BlogHome({url}: ViewProps) {
	const docsDir = await self.directories.open("docs");
	const blogDir = await docsDir.getDirectoryHandle("blog");
	const posts = await collectDocuments(blogDir, "blog");
	posts.reverse();

	return jsx`
		<${Root} title="Crank.js | Blog" url=${url} description="Read the latest articles and updates about Crank.js, exploring reactive UI patterns and framework design.">
			<main class=${css`
				max-width: 1200px;
				margin: 0 auto;
				padding: 80px 1rem 3rem;

				@media (min-width: 800px) {
					padding: 100px 2rem 4rem;
				}
			`}>
				<header class=${css`
					margin-bottom: 3rem;
					text-align: center;

					@media (min-width: 800px) {
						margin-bottom: 4rem;
					}
				`}>
					<h1 class=${css`
						font-size: 2.5rem;
						margin: 0 0 0.5rem;
						color: var(--highlight-color);

						@media (min-width: 800px) {
							font-size: 3rem;
						}
					`}>Blog</h1>
					<p class=${css`
						color: var(--text-color);
						opacity: 0.7;
						font-size: 1.1rem;
						margin: 0;
					`}>Thoughts on UI frameworks, JavaScript, and building for the web</p>
				</header>

				<div class=${css`
					display: grid;
					gap: 1.5rem;

					@media (min-width: 700px) {
						grid-template-columns: repeat(2, 1fr);
						gap: 2rem;
					}
				`}>
					${posts.map((post, index) => {
						const {title, publishDate, author, description} = post.attributes;
						const readTime = estimateReadTime(post.body);
						return jsx`
							<${BlogCard}
								href=${post.url}
								title=${title}
								description=${description}
								publishDate=${publishDate}
								readTime=${readTime}
								author=${author}
								featured=${index === 0}
							/>
						`;
					})}
				</div>
			</main>
		<//Root>
	`;
}
