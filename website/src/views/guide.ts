import {jsx} from "@b9g/crank/standalone";
import * as path from "path";

import {Root} from "../components/root.js";
import {Main, Sidebar} from "../components/sidebar.js";
import {Marked} from "../components/marked.js";
import {components} from "../components/marked-components.js";
import type {ViewProps} from "../router.js";

import {collectDocuments} from "../models/document.js";

const __dirname = new URL(".", import.meta.url).pathname;
export default async function Guide({
	// TODO: prop name is wrong here
	url,
	context: {storage},
}: ViewProps) {
	const docs = await collectDocuments(
		path.join(__dirname, "../../documents/guides"),
		path.join(__dirname, "../../documents/"),
	);

	const post = docs.find((doc) => doc.url === url);
	if (!post) {
		throw new Error("TODO: 404 errors");
	}

	const {
		attributes: {title},
		body,
	} = post;
	return jsx`
		<${Root} title="Crank.js | ${title}" url=${url} storage=${storage}>
			<${Sidebar} docs=${docs} url=${url} title="Guides" />
			<${Main}>
				<marquee behavior="alternate">
					👷👷
					The Crank documentation website is under construction to match the latest API. \
					Please pardon the appearance.
					👷👷
				</marquee>

				<h1>${title}</h1>
				<${Marked} markdown=${body} components=${components} />
			<//Main>
		<//Root>
	`;
}
