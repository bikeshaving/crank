import {jsx} from "@b9g/crank/standalone";
import {css} from "@emotion/css";
import type {Element} from "@b9g/crank/standalone";
import type {DocInfo} from "../models/document.js";

export function Sidebar({
	docs,
	title,
	url,
}: {
	docs: Array<DocInfo>;
	url: string;
	title: string;
}) {
	const links: Array<Element> = [];
	for (const doc of docs) {
		if (doc.attributes.publish) {
			links.push(jsx`
				<div class=${css`
					margin: 10px 0;
				`}>
					<a href=${doc.url} class=${doc.url === url ? "current" : ""}>
						${doc.attributes.title}
					</a>
				</div>
			`);
		}
	}

	return jsx`
		<div id="sidebar" class=${css`
			background-color: var(--bg-color);
			margin-top: 3.5rem;
			padding: 2rem 0.4rem;
			color: var(--text-color);

			@media screen and (min-width: 800px) {
				position: fixed;
				top: 3.5rem;
				bottom: 0;
				overflow-x: hidden;
				overflow-y: auto;
				width: 15rem;
				margin: 0;
				padding: 2rem 1rem;
				text-align: right;
			}

			@media screen and (min-width: 1100px) {
				padding: 3rem 2rem;
				width: 20rem;
			}

			h3 {
				color: var(--accent-color);
			}

			a {
				text-decoration: none;
			}

			:first-child {
				margin-top: 0;
			}

			:last-child {
				margin-bottom: 0;
			}
		`}>
			<h3>${title}</h3>
			${links}
		</div>
	`;
}
