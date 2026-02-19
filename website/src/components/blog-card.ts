import {jsx} from "@b9g/crank/standalone";
import {css} from "@emotion/css";

export interface BlogCardProps {
	href: string;
	title: string;
	description?: string;
	publishDate?: Date;
	readTime?: number;
	author?: string;
	featured?: boolean;
}

export function BlogCard({
	href,
	title,
	description,
	publishDate,
	readTime,
	author,
	featured,
}: BlogCardProps) {
	const publishDateDisplay =
		publishDate &&
		publishDate.toLocaleString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
			timeZone: "UTC",
		});

	const hasMetadata = publishDateDisplay || readTime;

	return jsx`
		<a
			href=${href}
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
					padding: ${featured ? "2rem" : "1.5rem"};
					${featured ? "grid-column: 1 / -1;" : ""}
				}
			`}
		>
			${
				hasMetadata &&
				jsx`
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
					${publishDateDisplay && readTime && jsx`<span style="opacity: 0.5">/</span>`}
					${readTime && jsx`<span>${readTime} min read</span>`}
				</div>
			`
			}
			<h3 class=${css`
				font-size: ${featured ? "1.75rem" : "1.35rem"};
				margin: 0 0 ${description ? "0.75rem" : "0"};
				color: var(--highlight-color);
				line-height: 1.3;

				@media (min-width: 700px) {
					font-size: ${featured ? "2rem" : "1.35rem"};
				}
			`}>${title}</h3>
			${
				description &&
				jsx`
				<p class=${css`
					margin: 0;
					color: var(--text-color);
					opacity: 0.85;
					line-height: 1.6;
					font-size: ${featured ? "1.05rem" : "0.95rem"};
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
}
