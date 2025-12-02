import {jsx} from "@b9g/crank/standalone";
import * as path from "path";

import {Root} from "../components/root.js";
import {Main, Sidebar} from "../components/sidebar.js";
import {Marked} from "../components/marked.js";
import {components} from "../components/marked-components.js";
interface ViewProps {
	url: string;
	params: Record<string, string>;
}

import {collectDocuments} from "../models/document.js";

const __dirname = new URL(".", import.meta.url).pathname;
export default async function Guide({url}: ViewProps) {
	const docs = await collectDocuments(
		path.join(__dirname, "../../../docs/guides"),
		path.join(__dirname, "../../../docs/"),
	);

	const post = docs.find(
		(doc) => doc.url.replace(/\/$/, "") === url.replace(/\/$/, ""),
	);
	if (!post) {
		throw new Error("TODO: 404 errors");
	}

	const {
		attributes: {title, description},
		body,
	} = post;
	return jsx`
		<${Root} title="Crank.js | ${title}" url=${url} description=${description}>
			<${Sidebar} docs=${docs} url=${url} title="Guides" />
			<${Main}>
				<h1>${title}</h1>
				<${Marked} markdown=${body} components=${components} />
			<//Main>
		<//Root>
	`;
}
