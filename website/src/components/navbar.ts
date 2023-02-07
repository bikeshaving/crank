import {jsx} from "@b9g/crank/standalone";
import {css} from "@emotion/css";

import {ColorSchemeToggle} from "./color-scheme-toggle.js";

const positionFixed = css`
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	height: 50px;
	z-index: 999;
	gap: 1rem;
`;

const navbarLayout = css`
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	gap: 2rem;
`;

const navbarGroupLayout = css`
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
	gap: 1rem;
`;

export function Navbar({url}: {url: string}) {
	return jsx`
		<nav
			class="
				blur-background
				${positionFixed}
				${navbarLayout}
				${css`
					border-bottom: 1px solid var(--text-color);
					overflow-x: auto;
					padding: 0 2rem;
					background-color: inherit;
					a {
						text-decoration: none;
						font-weight: bold;
					}
				`}
			"
		>
			<div class=${navbarGroupLayout}>
				<img
					src="/static/logo.svg"
					alt="Crank.js logo"
					class="${css`
						width: 1.9em;
						height: 1.9em;
						background-color: transparent;
					`}"
				/>
				<div>
					<a
						class=${url === "/" ? "current" : ""}
						href="/"
					>
						Crank.js
					</a>
				</div>
				<div>
					<a
						href="/guides/getting-started"
						class=${url.startsWith("/guides") && "current"}
					>Guides</a>
				</div>
				<div>
					<a
						href="/blog/"
						class=${url.startsWith("/blog") && "current"}
					>Blog</a>
				</div>
				<div>
					<a
						href="/playground/"
						class=${url.startsWith("/playground") && "current"}
					>Playground</a>
				</div>
			</div>
			<div class=${navbarGroupLayout}>
				<div>
					<a href="https://github.com/bikeshaving/crank">GitHub</a>
				</div>
				<div>
					<a href="http://npm.im/@b9g/crank">NPM</a>
				</div>
				<${ColorSchemeToggle} />
			</div>
		</nav>
	`;
}
