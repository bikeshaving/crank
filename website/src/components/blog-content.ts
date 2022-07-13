import {xm} from "@b9g/crank";
import type {Children} from "@b9g/crank";

export interface BlogContentProps {
	title: string;
	publishDate?: Date;
	children: Children;
}

export function BlogContent({title, publishDate, children}: BlogContentProps) {
	return xm`
		<h1>${title}</h1>
		${
			publishDate &&
			xm`<p>${publishDate.toLocaleString("en-US", {
				month: "long",
				year: "numeric",
				day: "numeric",
				timeZone: "UTC",
			})}</p>`
		}
		${children}
	`;
}
