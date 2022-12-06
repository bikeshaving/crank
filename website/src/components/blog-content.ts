import {jsx} from "@b9g/crank";
import type {Children} from "@b9g/crank";

export interface BlogContentProps {
	title: string;
	publishDate?: Date;
	children: Children;
}

export function BlogContent({title, publishDate, children}: BlogContentProps) {
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
		${publishDateDisplay && jsx`<p>${publishDateDisplay}</p>`}
		${children}
	`;
}
