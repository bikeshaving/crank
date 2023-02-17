import {jsx, Raw} from "@b9g/crank/standalone";
import {css} from "@emotion/css";

import {Root} from "../components/root.js";
import type {Storage} from "../components/esbuild.js";
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
					text-align: center;
					color: var(${depth === 2 ? "--text-color" : "--highlight-color"});
					margin: ${depth === 2 ? "100px" : depth === 3 ? "50px" : 0} auto;
					font-size: ${depth === 2 ? "5vh" : depth === 3 ? "4vh" : null};
				`}"
			>
				${children}
			<//Tag>`;
	},

	paragraph({children}: any) {
		return jsx`
			<p class=${css`
				padding: 1em;
				@media screen and (min-width: 800px) {
					margin: 1em auto 0;
					max-width: 1000px;
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
		const json = JSON.stringify({code, lang});
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
				<script class="props" type="application/json">
					<${Raw} value=${json} />
				</script>
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
					font-size: max(50px, 10vw);
				`}
				>Crank.js</h1>
				<h2
					class=${css`
						margin: 0;
						color: var(--text-color);
						font-size: max(30px, 4vw);
					`}
				>
					The Just JavaScript Framework.
				</h2>
			</header>
			<div class=${css`
				font-size: 16px;
				@media screen and (min-width: 800px) {
					font-size: 24px;
				}

				background-color: var(--bg-color);
				border-top: 1px solid currentcolor;
			`}>
				<${Marked} markdown=${md.body} components=${components} />
				<div class=${css`
					text-align: center;
					height: 100vh;
					display: flex;
					justify-content: center;
					align-items: center;
				`}>
					<a
						href="/guides/getting-started"
						class=${css`
							display: inline-block;
							border: 1px solid #dbb368;
							color: #dbb368;
							padding: 20px;
							margin: 50px 0;
							text-decoration: none;
							font-size: 24px;
						`}
					>Get Started</a>
				</div>
			</div>
		<//Root>
	`;
}
