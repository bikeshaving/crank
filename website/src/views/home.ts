import {jsx} from "@b9g/crank/standalone";

import {Root} from "../components/root.js";
import type {Storage} from "../components/esbuild.js";
import {collectDocuments} from "../models/document.js";
import * as Path from "path";

import {Marked} from "../components/marked.js";
import {InlineCodeBlock} from "../components/inline-code-block.js";
const components = {
	heading({token, children}: any) {
		const {depth} = token;
		const tag = `h${depth}`;
		return jsx`
			<${tag}
				style="
					text-align: center;
					font-size: ${depth === 2 ? 24 : depth === 3 ? 20 : 0}px;
				"
			>
				${children}
			<//tag>`;
	},

	paragraph({token}: any) {
		return jsx`
			<p style="
				margin: 30px auto;
				max-width: 800px;
			">${token.text}</p>
		`;
	},

	codespan({token}: any) {
		return jsx`<code class="inline">${token.text}</code>`;
	},

	code({token}: any) {
		const {text: code, lang} = token;
		return jsx`
			<div
				style="
					margin: 30px auto;
					max-width: 1400px;
				"
				class="code-block-container"
				data-code=${code} data-lang=${lang}
			>
				<${InlineCodeBlock}
					value=${code}
					lang=${lang}
					editable=${lang.endsWith(" live")}
				/>
			</div>
		`;
	},
};

const __dirname = new URL(".", import.meta.url).pathname;

export default async function Home({storage}: {storage: Storage}) {
	const docs = await collectDocuments(Path.join(__dirname, "../../documents"));

	const md = docs.find((doc) => doc.filename.endsWith("/index.md"));
	if (!md) {
		throw new Error("index.md missing you silly goose");
	}

	return jsx`
		<${Root} title="Crank.js" url="/" storage=${storage}>
			<div id="gear-interactive" />
			<div style="margin: 0 auto">
				<header
					style="
						height: 100vh;
						display: flex;
						flex-direction: column;
						justify-content: center;
						position: relative;
						align-items: center;
						text-align: center;
						font-size: 5vh;
					"
				>
					<h1
						style="
							margin: 30px 0;
							color: var(--highlight-color);
						"
					>
						Crank.js
					</h1>
					<h3
						style="
							margin: 0;
							color: var(--text-color);
						"
					>
						The Just JavaScript Framework
					</h3>
				</header>
				<div class="blur-background">
					<${Marked} markdown=${md.body} components=${components} />
				</div>
				<div
					style="
						text-align: center;
						height: 100vh;
						display: flex;
						justify-content: center;
						align-items: center;
					"
				>
					<a
						style="
							display: inline-block;
							border: 1px solid #dbb368;
							color: #dbb368;
							padding: 20px;
							margin: 50px 0;
							text-decoration: none;
							font-size: 24px;
						"
						href="/guides/getting-started"
					>Get Started</a>
				</div>
			</div>
		<//Root>
	`;
}
