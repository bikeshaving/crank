import {t} from "@b9g/crank/template.js";
import type {Children} from "@b9g/crank/crank.js";

export interface BlogContentProps {
	title: string;
	publishDate?: Date;
	children: Children;
}

export function BlogContent({title, publishDate, children}: BlogContentProps) {
	return t`
		<h1>${title}</h1>
		${
			publishDate &&
			t`<p>${publishDate.toLocaleString("en-US", {
				month: "long",
				year: "numeric",
				day: "numeric",
				timeZone: "UTC",
			})}</p>`
		}
		${children}
	`;
}
