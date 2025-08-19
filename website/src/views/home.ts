import {jsx} from "@b9g/crank/standalone";
import {css} from "@emotion/css";

import {Root} from "../components/root.js";
import {SerializeScript} from "../components/serialize-javascript.js";
import {collectDocuments} from "../models/document.js";
import * as Path from "path";

import {Marked} from "../components/marked.js";
import {InlineCodeBlock} from "../components/inline-code-block.js";
import type {ViewProps} from "../router.js";

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
					breakpoint="800px"
					editable=${lang.endsWith(" live")}
				/>
				<${SerializeScript} value=${{code, lang}} class="props" />
			</div>
		`;
	},
};

const interactiveBackground = css`
	line-height: 0.85;
	border: 1px solid var(--text-color);
	text-decoration: none;
`;

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
			<h1 class="${css`
				color: var(--highlight-color);
				font-size: max(40px, 14vw);
				margin: 0.3em 0;
				padding: 0 0.2em;
			`} blur-background ${interactiveBackground}"
			>Crank.js</h1>
			<h2
				class="${css`
					color: var(--text-color);
					font-size: max(25px, 5vw);
					margin: 0.2em;
					padding: 0.1em 0.2em 0.05em;
					line-height: 0.8;
					border: 1px solid var(--text-color);
				`} blur-background ${interactiveBackground}"
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
			<div class="${css`
				padding: 2em;
				display: flex;
				flex-direction: column;
				justify-content: center;
				align-items: center;
			`}">
				<h2 class="${css`
					font-size: 32px;
					margin: 1em 0.2em;
					padding: 0.5em;
				`} ${interactiveBackground} blur-background">Intrigued? Here are some possible next steps.</h2>
				<div class="${css`
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
						font-size: 24px;
					}
				`}">
					<a class="${interactiveBackground} blur-background" href="/playground">Try it in the browser</a>
					<a class="${interactiveBackground} blur-background" href="/guides/getting-started">Install it</a>
					<a class="${interactiveBackground} blur-background" href="https://github.com/bikeshaving/crank">Contribute on GitHub</a>
				</div>
			</div>
		</div>
	`;
}

const __dirname = new URL(".", import.meta.url).pathname;

export default async function Home({context: {storage}}: ViewProps) {
	const docs = await collectDocuments(Path.join(__dirname, "../../../docs"));
	const md = docs.find((doc) => doc.filename.endsWith("/index.md"));
	if (!md) {
		throw new Error("index.md missing you silly goose");
	}

	return jsx`
		<${Root}
			title="Crank.js"
			url="/"
			description=${md.attributes.description}
			storage=${storage}
		>
			<${Hero} />
			<div class=${css`
				font-size: max(18px, min(24px, 2vw));
				background-color: var(--bg-color);
				border-top: 1px solid var(--text-color);
				border-bottom: 1px solid var(--text-color);
				padding: 2em 0;
			`}>
				<${Marked} markdown=${md.body} components=${components} />
			</div>
			<${CallToAction} />
		<//Root>
	`;
}
