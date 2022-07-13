import {xm} from "@b9g/crank";
import * as path from "path";

import {Root} from "../components/root.js";
import {Sidebar} from "../components/sidebar.js";
import {Marked} from "../components/marked.js";
import {components} from "../components/marked-components.js";
import type {Storage} from "../components/esbuild.js";

import {collectDocuments} from "../models/document.js";

export interface GuideProps {
	url: string;
	storage: Storage;
}

const __dirname = new URL(".", import.meta.url).pathname;
export default async function Guide({
	// TODO: prop name is wrong here
	url,
	storage,
}: GuideProps) {
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
	return xm`
		<${Root} title="Crank.js | ${title}" url=${url} storage=${storage}>
			<${Sidebar} docs=${docs} url=${url} title="Guides" />
			<main class="main">
				<div class="content">
					<h1>${title}</h1>
					<${Marked} markdown=${body} components=${components} />
				</div>
			</main>
		<//Root>
	`;
}
