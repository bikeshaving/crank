import {jsx} from "@b9g/crank/standalone";
import {css} from "@emotion/css";

import {Root} from "../components/root.js";
import {SerializeScript} from "../components/serialize-javascript.js";
import {collectDocuments} from "../models/document.js";

import {Marked} from "../components/marked.js";
import {InlineCodeBlock} from "../components/inline-code-block.js";
interface ViewProps {
	url: string;
	params: Record<string, string>;
}

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
					margin: 0.75em auto;
					${(depth === 2 || depth === 3) && "padding: 0.75em 0"};
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
		const isLive = lang.endsWith(" live");

		return jsx`
			<div
				class="
					code-block-container
					${isLive ? "code-block-live" : ""}
					${css`
						@media screen and (min-width: 800px) {
							margin: 30px auto;
						}

						max-width: 1500px;
						background-color: var(--bg-color);
					`}
				"
			>
				<${InlineCodeBlock}
					value=${code}
					lang=${lang}
					breakpoint="800px"
					editable=${isLive}
				/>
				<${SerializeScript}
					value=${{code, lang}}
					class="props"
					name="inline-code-block-props"
				/>
			</div>
		`;
	},
};

const interactiveBackground = css`
	line-height: 0.85;
	text-decoration: none;
`;

function Hero() {
	return jsx`
		<div id="gear-interactive" />
		<header
			class=${css`
				height: 100vh;
				width: 100%;
				display: flex;
				flex-direction: column;
				justify-content: center;
				position: relative;
				align-items: center;
				text-align: center;
			`}
		>
			<h1 class="${css`
				width: 100%;
				color: var(--highlight-color);
				font-size: max(40px, 14vw);
				margin: 0.3em 0;
				padding: 0 0.2em;
				text-shadow:
					0 0 20px var(--bg-color),
					0 0 40px var(--bg-color),
					0 0 60px var(--bg-color);
			`} ${interactiveBackground}"
			>Crank.js</h1>
			<h2
				class="${css`
					width: 100%;
					color: var(--text-color);
					font-size: max(25px, 5vw);
					margin: 0.2em;
					padding: 0.1em 0.2em 0.05em;
					line-height: 0.8;
					text-shadow:
						0 0 20px var(--bg-color),
						0 0 40px var(--bg-color),
						0 0 60px var(--bg-color);
				`} ${interactiveBackground}"
			>
				The Just JavaScript UI Framework
			</h2>
		</header>
	`;
}

function CallToAction() {
	return jsx`
		<div class=${css`
			padding: 3rem 1rem;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 1.5rem;
		`}>
			<nav class=${css`
				display: flex;
				flex-wrap: wrap;
				justify-content: center;
				gap: 1.5rem;
				font-size: 1.1rem;

				a {
					color: var(--text-color);
					text-decoration: none;
					opacity: 0.8;
					padding: 0.5em 0;

					&:hover {
						color: var(--highlight-color);
						opacity: 1;
					}
				}
			`}>
				<a
					href="/guides/getting-started"
					class=${css`
						&& {
							background: var(--highlight-color);
							color: var(--bg-color);
							opacity: 1;
							padding: 0.5em 1.5em;
							font-weight: bold;
							border-radius: 4px;
							transition:
								transform 0.15s ease,
								box-shadow 0.15s ease;

							&:hover {
								color: var(--bg-color);
								transform: translateY(-2px);
								box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
							}
						}
					`}
				>Get Started</a>
				<a href="/playground">Playground</a>
				<a href="/api">API Reference</a>
				<a href="https://github.com/bikeshaving/crank">GitHub</a>
			</nav>
		</div>
	`;
}

function AntiHero() {
	return jsx`
		<div class=${css`
			height: 100vh;
		`} />
	`;
}

export default async function Home({url}: ViewProps) {
	const docsDir = await self.directories.open("docs");
	const docs = await collectDocuments(docsDir);
	const md = docs.find((doc) => doc.filename === "index.md");
	if (!md) {
		throw new Error("index.md missing you silly goose");
	}

	return jsx`
		<${Root}
			title="Crank.js"
			url=${url}
			description=${md.attributes.description}
		>
			<${Hero} />
			<div class="blur-background-2 ${css`
				font-size: max(18px, min(24px, 2vw));
				border-top: 1px solid var(--text-color);
				border-bottom: 1px solid var(--text-color);
				padding: 2em 0;
			`}">
				<${CallToAction} />
				<${Marked} markdown=${md.body} components=${components} />
			</div>
			<${AntiHero} />
		<//Root>
	`;
}
