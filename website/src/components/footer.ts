import {jsx} from "@b9g/crank/standalone";
import {css} from "@emotion/css";

export function Footer() {
	return jsx`
		<footer
			class=${css`
				background-color: var(--bg-color);
				border-top: 1px solid var(--text-color);
				padding: 2em;
				text-align: center;
				font-size: 14px;
			`}
		>
			<nav
				class=${css`
					display: flex;
					justify-content: center;
					gap: 2em;
					flex-wrap: wrap;
					margin-bottom: 1em;
				`}
			>
				<a href="/guides/getting-started">Docs</a>
				<a href="/blog">Blog</a>
				<a href="/playground">Playground</a>
				<a href="https://github.com/bikeshaving/crank">GitHub</a>
				<a href="https://www.npmjs.com/package/@b9g/crank">NPM</a>
			</nav>
			<p
				class=${css`
					margin: 0;
					color: var(--text-color);
					opacity: 0.7;
				`}
			>
				MIT Licensed ${"·"} Made with Crank.js
			</p>
		</footer>
	`;
}
