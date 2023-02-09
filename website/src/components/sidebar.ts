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
					<a
						href=${doc.url}
						class="
							${doc.url === url && "current"}
							${css`
								text-decoration: none;
							`}
						"
					>
						${doc.attributes.title}
					</a>
				</div>
			`);
		}
	}

	return jsx`
		<div id="sidebar" class=${css`
			background-color: var(--bg-color);
			margin-top: 50px;
			padding: 2rem 0.4rem;
			color: var(--text-color);
			border-right: 1px solid currentcolor;
			@media screen and (min-width: 800px) {
				position: fixed;
				top: 50px;
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

			> :first-child {
				margin-top: 0;
			}
		`}>
			<h3 class=${css`
				color: var(--accent-color);
				margin-top: 0;
			`}>${title}</h3>
			${links}
		</div>
	`;
}

export function Main({children}: {children: unknown}) {
	return jsx`
		<main class=${css`
			margin: 0 auto;
			padding: 2rem 0.4rem;

			@media screen and (min-width: 800px) {
				margin-left: 240px;
				padding: 2rem 1rem;
				margin-top: 50px;
			}

			@media screen and (min-width: 1100px) {
				margin-left: 320px;
				padding: 3rem 2rem;
			}

			p {
				max-width: 800px;
			}
		`}>
			${children}
		</main>
	`;
}
