import {jsx} from "@b9g/crank/standalone";
import {css} from "@emotion/css";

import {Root} from "../components/root.js";
import {Main} from "../components/sidebar.js";
import {Marked} from "../components/marked.js";
import {components} from "../components/marked-components.js";
import {APISidebar, buildAPIModules} from "../components/api-sidebar.js";
import {EditOnGitHub} from "../components/edit-on-github.js";
import {collectDocuments} from "../models/document.js";

interface ViewProps {
	url: string;
	arams: Record<string, string>;
}

export default async function APIView({url}: ViewProps) {
	const docsDir = await self.directories.open("docs");
	const apiDir = await docsDir.getDirectoryHandle("api");
	const docs = await collectDocuments(apiDir, "api");

	// Find the matching document
	// Handle /api -> /api/index mapping
	let lookupUrl = url.replace(/\/$/, "");
	let post = docs.find((doc) => doc.url.replace(/\/$/, "") === lookupUrl);

	// If not found and URL ends without a specific file, try adding /index
	if (!post && !lookupUrl.match(/\/[^/]+\.[^/]+$/)) {
		const indexUrl = lookupUrl + "/index";
		post = docs.find((doc) => doc.url.replace(/\/$/, "") === indexUrl);
	}

	if (!post) {
		throw new Error(`API document not found: ${url}`);
	}

	const {
		attributes: {title, description},
		body,
		filename,
	} = post;

	return jsx`
		<${Root}
			title="Crank.js | ${title}"
			url=${url}
			description=${description || `API documentation for ${title}`}
		>
			<${APISidebar} modules=${buildAPIModules(docs)} url=${url} />
			<${Main}>
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
