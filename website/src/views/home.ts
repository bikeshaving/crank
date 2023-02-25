import {jsx} from "@b9g/crank/standalone";
import {css} from "@emotion/css";

import {Root} from "../components/root.js";
import type {Storage} from "../components/esbuild.js";
import {EmbeddedJSON} from "../components/embed-json.js";
import {collectDocuments} from "../models/document.js";
import * as Path from "path";

import {Marked} from "../components/marked.js";
import {InlineCodeBlock} from "../components/inline-code-block.js";

const components = {
	heading({token, children}: any) {
		const {depth} = token;
		const Tag = `h${depth}`;
		return jsx`
			<${Tag}
				class="${css`
					display: block;
					text-align: center;
					font-size: ${depth === 2
						? "max(5vh, 40px)"
						: depth === 3
						? "max(4vh, 30px)"
						: null};
					color: var(${depth === 3 ? "--highlight-color" : "--text-color"});
					margin: 1em auto;
					${(depth === 2 || depth === 3) && "padding: 1em 0"};
				`}"
			>
				${children}
			<//Tag>`;
	},

	paragraph({children}: any) {
		return jsx`
			<p class=${css`
				padding: 0 5px;
				@media screen and (min-width: 800px) {
					margin: 1em auto 0;
					max-width: 1000px;
					padding: 0 1em;
				}
			`}>
				<span class=${css`
					box-decoration-break: clone;
				`}>${children}</span>
			</p>
		`;
	},

	codespan({token}: any) {
		return jsx`<code class="inline">${token.text}</code>`;
	},

	code({token}: any) {
		const {text: code, lang} = token;
		return jsx`
			<div
				class="
					code-block-container
					blur-background
					${css`
						@media screen and (min-width: 800px) {
							margin: 30px auto;
						}

						max-width: 1500px;
					`}
				"
			>
				<${InlineCodeBlock}
					value=${code}
					lang=${lang}
					editable=${lang.endsWith(" live")}
				/>
				<${EmbeddedJSON} value=${{code, lang}} class="props" />
			</div>
		`;
	},
};

function Hero() {
	return jsx`
		<div id="gear-interactive" />
		<header
			class=${css`
				height: 100vh;
				display: flex;
				flex-direction: column;
				justify-content: center;
				position: relative;
				align-items: center;
				text-align: center;
			`}
		>
			<h1 class=${css`
				margin: 30px 0;
				color: var(--highlight-color);
				font-size: max(40px, 14vw);
			`}
			>Crank.js</h1>
			<h2
				class=${css`
					margin: 0;
					color: var(--text-color);
					font-size: max(25px, 5vw);
				`}
			>
				The Just JavaScript Framework.
			</h2>
		</header>
	`;
}

function CallToAction() {
	return jsx`
		<div class=${css`
			text-align: center;
			height: 100vh;
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
		`}>
			<div class="blur-background-2 ${css`
				padding: 2em;
				display: flex;
				flex-direction: column;
				justify-content: center;
				align-items: center;
			`}">
				<h2 class=${css`
					font-size: 32px;
				`}>Intrigued? Here are some possible next steps.</h2>
				<div class=${css`
					@media screen and (min-width: 800px) {
						display: flex;
						justify-content: center;
						gap: 1em;
					}

					& a {
						display: block;
						flex: 0 1 auto;
						border: 1px solid var(--text-color);
						color: var(--highlight-color);
						padding: 0.4em;
						text-decoration: none;
						font-size: 24px;
					}
				`}>
					<a href="/playground">Try it in the browser</a>
					<a href="/guides/getting-started">Install it</a>
					<a href="https://github.com/bikeshaving/crank">Star it on GitHub</a>
				</div>
			</div>
		</div>
	`;
}

const __dirname = new URL(".", import.meta.url).pathname;

export default async function Home({storage}: {storage: Storage}) {
	const docs = await collectDocuments(Path.join(__dirname, "../../documents"));

	const md = docs.find((doc) => doc.filename.endsWith("/index.md"));
	if (!md) {
		throw new Error("index.md missing you silly goose");
	}

	return jsx`
		<${Root} title="Crank.js" url="/" storage=${storage}>
			<${Hero} />
			<div class="${css`
				font-size: max(18px, min(24px, 2vw));
				background-color: var(--bg-color);
				border-top: 1px solid var(--text-color);
				border-bottom: 1px solid var(--text-color);
				padding: 2em 0;
			`}">
				<${Marked} markdown=${md.body} components=${components} />
			</div>
			<${CallToAction} />
		<//Root>
	`;
}
