import {jsx} from "@b9g/crank/standalone";
import type {Children} from "@b9g/crank";

export interface BlogContentProps {
	title: string;
	description?: string;
	author?: string;
	authorURL?: string;
	publishDate?: Date;
	children: Children;
}

export function BlogContent({
	title,
	description,
	publishDate,
	author,
	authorURL,
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
		<h1>${title}</h1>
		<p style="color: var(--text-color); opacity: 0.7; font-size: 0.9em;">
			${author && jsx`By <a href=${authorURL} rel="author">${author}</a>`} \
			${publishDateDisplay && jsx`<span>${"–"} ${publishDateDisplay}</span>`}
		</p>
		${
			description &&
			jsx`
			<p style="font-style: italic; color: var(--text-color); opacity: 0.8; margin: 1.5em 0;">
				${description}
			</p>
		`
		}
		${children}
	`;
}
