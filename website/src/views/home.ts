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

							&:hover {
								color: var(--bg-color);
							}
						}
					`}
				>Get Started</a>
				<a href="/playground">Playground</a>
				<a href="/api">API Reference</a>
				<a href="https://github.com/bikeshaving/crank">GitHub</a>
			</nav>
			<div class="code-block-container ${css`
				max-width: 600px;
				width: 100%;
			`}">
				<${InlineCodeBlock}
					value=${"npm create crank"}
					lang="bash"
					editable=${false}
				/>
				<${SerializeScript}
					value=${{code: "npm create crank", lang: "bash"}}
					class="props"
					name="inline-code-block-props"
				/>
			</div>
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

function BlogSection({posts}: {posts: Array<any>}) {
	return jsx`
		<div class=${css`
			max-width: 1200px;
			margin: 0 auto;
			padding: 3rem 1rem;

			@media (min-width: 800px) {
				padding: 4rem 2rem;
			}
		`}>
			<h2 class=${css`
				text-align: center;
				font-size: max(4vh, 30px);
				color: var(--highlight-color);
				margin: 0 0 2rem;
			`}>From the Blog</h2>
			<div class=${css`
				display: grid;
				gap: 1.5rem;

				@media (min-width: 700px) {
					grid-template-columns: repeat(2, 1fr);
				}
			`}>
				${posts.map((post) => {
					const {title, description} = post.attributes;
					return jsx`
						<a
							href=${post.url}
							class="blur-background ${css`
								display: block;
								text-decoration: none;
								color: inherit;
								border: 1px solid var(--text-color);
								border-radius: 4px;
								padding: 1.5rem;

								&:hover {
									border-color: var(--highlight-color);
								}
							`}"
						>
							<h3 class=${css`
								font-size: 1.35rem;
								margin: 0 0 0.5rem;
								color: var(--highlight-color);
								line-height: 1.3;
							`}>${title}</h3>
							${
								description &&
								jsx`
								<p class=${css`
									margin: 0;
									color: var(--text-color);
									opacity: 0.85;
									line-height: 1.6;
									font-size: 0.95rem;
								`}>${description}</p>
							`
							}
						</a>
					`;
				})}
			</div>
			<div class=${css`
				text-align: center;
				margin-top: 2rem;
			`}>
				<a
					href="/blog"
					class=${css`
						color: var(--highlight-color);
						font-size: 1.1rem;
					`}
				>All posts ${"→"}</a>
			</div>
		</div>
	`;
}

export default async function Home({url}: ViewProps) {
	const docsDir = await self.directories.open("docs");
	const docs = await collectDocuments(docsDir);
	const md = docs.find((doc) => doc.filename === "index.md");
	if (!md) {
		throw new Error("index.md missing you silly goose");
	}

	const blogDir = await docsDir.getDirectoryHandle("blog");
	const posts = (await collectDocuments(blogDir, "blog")).reverse().slice(0, 4);

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
			<${BlogSection} posts=${posts} />
			<${AntiHero} />
		<//Root>
	`;
}
