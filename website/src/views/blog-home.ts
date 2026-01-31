import {jsx} from "@b9g/crank/standalone";
import {css} from "@emotion/css";
import * as path from "path";

import {Root} from "../components/root.js";

interface ViewProps {
	url: string;
	params: Record<string, string>;
}

import {collectDocuments} from "../models/document.js";
const __dirname = new URL(".", import.meta.url).pathname;

function estimateReadTime(body: string): number {
	const words = body.trim().split(/\s+/).length;
	return Math.max(1, Math.ceil(words / 200));
}

export default async function BlogHome({url}: ViewProps) {
	const posts = await collectDocuments(
		path.join(__dirname, "../../../docs/blog"),
		path.join(__dirname, "../../../docs/"),
	);
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
						const publishDateDisplay =
							publishDate &&
							publishDate.toLocaleString("en-US", {
								month: "short",
								day: "numeric",
								year: "numeric",
								timeZone: "UTC",
							});

						const isFirst = index === 0;

						return jsx`
							<a
								href=${post.url}
								class=${css`
									display: block;
									text-decoration: none;
									color: inherit;
									border: 1px solid var(--text-color);
									border-radius: 4px;
									padding: 1.5rem;
									transition: all 0.2s ease;
									background: var(--bg-color);

									&:hover {
										border-color: var(--highlight-color);
										transform: translateY(-2px);
										box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
									}

									@media (min-width: 700px) {
										padding: 2rem;
										${isFirst ? "grid-column: 1 / -1;" : ""}
									}
								`}
							>
								<div class=${css`
									display: flex;
									flex-wrap: wrap;
									gap: 0.5rem;
									align-items: center;
									margin-bottom: 0.75rem;
									font-size: 0.85rem;
									color: var(--text-color);
									opacity: 0.7;
								`}>
									${publishDateDisplay && jsx`<span>${publishDateDisplay}</span>`}
									${publishDateDisplay && jsx`<span>•</span>`}
									<span>${readTime} min read</span>
								</div>
								<h2 class=${css`
									font-size: ${isFirst ? "1.75rem" : "1.35rem"};
									margin: 0 0 0.75rem;
									color: var(--highlight-color);
									line-height: 1.3;

									@media (min-width: 700px) {
										font-size: ${isFirst ? "2rem" : "1.5rem"};
									}
								`}>${title}</h2>
								${
									description &&
									jsx`
									<p class=${css`
										margin: 0;
										color: var(--text-color);
										opacity: 0.85;
										line-height: 1.6;
										font-size: ${isFirst ? "1.05rem" : "0.95rem"};
									`}>${description}</p>
								`
								}
								${
									author &&
									jsx`
									<p class=${css`
										margin: 1rem 0 0;
										font-size: 0.85rem;
										color: var(--text-color);
										opacity: 0.6;
									`}>By ${author}</p>
								`
								}
							</a>
						`;
					})}
				</div>
			</main>
		<//Root>
	`;
}
