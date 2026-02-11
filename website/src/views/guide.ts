import {jsx} from "@b9g/crank/standalone";
import {css} from "@emotion/css";

import {NotFound} from "@b9g/http-errors";
import {Root} from "../components/root.js";
import {Main, Sidebar} from "../components/sidebar.js";
import {Marked} from "../components/marked.js";
import {components} from "../components/marked-components.js";
import {EditOnGitHub} from "../components/edit-on-github.js";
interface ViewProps {
	url: string;
	params: Record<string, string>;
}

import {collectDocuments} from "../models/document.js";

export default async function Guide({url}: ViewProps) {
	const docsDir = await self.directories.open("docs");
	const guidesDir = await docsDir.getDirectoryHandle("guides");
	const docs = await collectDocuments(guidesDir, "guides");

	const post = docs.find(
		(doc) => doc.url.replace(/\/$/, "") === url.replace(/\/$/, ""),
	);
	if (!post) {
		throw new NotFound(`Guide not found: ${url}`);
	}

	const {
		attributes: {title, description},
		body,
		filename,
	} = post;
	return jsx`
		<${Root} title="Crank.js | ${title}" url=${url} description=${description}>
			<${Sidebar} docs=${docs} url=${url} title="Guides" />
			<${Main}>
				<h1>${title}</h1>
				<${Marked} markdown=${body} components=${components} />
				<div class=${css`
					margin-top: 3rem;
					padding-top: 1.5rem;
					border-top: 1px solid var(--text-color);
					opacity: 0.5;
				`}>
					<${EditOnGitHub} filename=${filename} />
				</div>
			<//Main>
		<//Root>
	`;
}
