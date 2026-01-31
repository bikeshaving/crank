import {jsx} from "@b9g/crank/standalone";
import {css} from "@emotion/css";
import type {Children} from "@b9g/crank";

export interface BlogContentProps {
	title: string;
	description?: string;
	author?: string;
	authorURL?: string;
	publishDate?: Date;
	readTime?: number;
	children: Children;
}

export function BlogContent({
	title,
	description,
	publishDate,
	author,
	authorURL,
	readTime,
	children,
}: BlogContentProps) {
	const publishDateDisplay =
		publishDate &&
		publishDate.toLocaleString("en-US", {
			month: "long",
			year: "numeric",
			day: "numeric",
			timeZone: "UTC",
		});

	return jsx`
		<article class=${css`
			max-width: 800px;
		`}>
			<header class=${css`
				margin-bottom: 2.5rem;
				padding-bottom: 2rem;
				border-bottom: 1px solid var(--text-color);
			`}>
				<h1 class=${css`
					font-size: 2.25rem;
					line-height: 1.2;
					margin: 0 0 1rem;
					color: var(--highlight-color);

					@media (min-width: 600px) {
						font-size: 2.75rem;
					}
				`}>${title}</h1>

				<div class=${css`
					display: flex;
					flex-wrap: wrap;
					align-items: center;
					gap: 0.5rem 1rem;
					font-size: 0.95rem;
					color: var(--text-color);
					opacity: 0.7;
				`}>
					${
						author &&
						jsx`
						<span>
							By ${
								authorURL
									? jsx`<a href=${authorURL} rel="author" class=${css`
											color: var(--highlight-color);
											text-decoration: none;
											&:hover {
												text-decoration: underline;
											}
										`}>${author}</a>`
									: author
							}
						</span>
					`
					}
					${publishDateDisplay && jsx`<span>•</span><span>${publishDateDisplay}</span>`}
					${readTime && jsx`<span>•</span><span>${readTime} min read</span>`}
				</div>

				${
					description &&
					jsx`
					<p class=${css`
						font-size: 1.2rem;
						line-height: 1.6;
						color: var(--text-color);
						opacity: 0.85;
						margin: 1.5rem 0 0;
						font-style: italic;
					`}>${description}</p>
				`
				}
			</header>

			<div class=${css`
				font-size: 1.1rem;
				line-height: 1.75;

				h2 {
					font-size: 1.75rem;
					margin: 2.5rem 0 1rem;
					color: var(--highlight-color);
				}

				h3 {
					font-size: 1.35rem;
					margin: 2rem 0 0.75rem;
				}

				p {
					margin: 1.25rem 0;
				}

				a {
					color: var(--highlight-color);
				}

				blockquote {
					margin: 1.5rem 0;
					padding: 1rem 1.5rem;
					border-left: 3px solid var(--highlight-color);
					background: rgba(128, 128, 128, 0.1);
					font-style: italic;
				}

				blockquote p {
					margin: 0;
				}

				ul,
				ol {
					margin: 1.25rem 0;
					padding-left: 1.5rem;
				}

				li {
					margin: 0.5rem 0;
				}

				img {
					max-width: 100%;
					height: auto;
					border-radius: 4px;
				}

				hr {
					border: none;
					border-top: 1px solid var(--text-color);
					opacity: 0.3;
					margin: 2.5rem 0;
				}
			`}>
				${children}
			</div>
		</article>
	`;
}
