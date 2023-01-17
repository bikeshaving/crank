import {jsx} from "@b9g/crank/standalone";
import type {Element} from "@b9g/crank/standalone";
import type {DocInfo} from "../models/document.js";

export interface SidebarProps {
	docs: Array<DocInfo>;
	url: string;
	title: string;
}

export function Sidebar({docs, title, url}: SidebarProps) {
	const links: Array<Element> = [];
	for (const doc of docs) {
		if (doc.attributes.publish) {
			links.push(jsx`
				<div class="sidebar-item">
					<a href=${doc.url} class=${doc.url === url ? "current" : ""}>
						${doc.attributes.title}
					</a>
				</div>
			`);
		}
	}

	return jsx`
		<div id="sidebar" class="sidebar">
			<h3>${title}</h3>
			${links}
		</div>
	`;
}
