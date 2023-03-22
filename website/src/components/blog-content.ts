import {jsx} from "@b9g/crank/standalone";
import type {Children} from "@b9g/crank";

export interface BlogContentProps {
	title: string;
	author?: string;
	authorURL?: string;
	publishDate?: Date;
	children: Children;
}

export function BlogContent({
	title,
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
		<p>
			${author && jsx`By <a href=${authorURL} rel="author">${author}</a>`} \
			${publishDateDisplay && jsx`<span>– Published ${publishDateDisplay}</span>`}
		</p>
		${children}
	`;
}
