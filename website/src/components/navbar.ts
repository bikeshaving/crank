import {jsx} from "@b9g/crank/standalone";
import {css} from "@emotion/css";

import {GearLogo} from "./gear-interactive.js";
import {ColorSchemeToggle} from "./color-scheme-toggle.js";

const positionFixed = css`
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	height: 50px;
	z-index: 999;
	gap: 1em;
`;

const navbarGroupLayout = css`
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
	gap: 1em;
`;

export function Navbar({url}: {url: string}) {
	return jsx`
		<nav
			class="
				blur-background
				${positionFixed}
				${css`
					border-bottom: 1px solid var(--text-color);
					overflow-x: auto;
					background-color: inherit;
					a {
						text-decoration: none;
						font-weight: bold;
					}

					@media screen and (min-width: 800px) {
						padding: 0 2em;
					}

					display: flex;
					flex-direction: row;
					justify-content: space-between;
					gap: 1em;
				`}
			"
		>
			<div class=${navbarGroupLayout}>
				<div>
					<a
						class=${navbarGroupLayout}
						aria-current=${url === "/" && "page"}
						style="gap: 0.3em"
						href="/"
					>
						<${GearLogo} width="1.9em" height="1.9em" />
						Crank.js
					</a>
				</div>
				<div>
					<a
						href="/guides/getting-started"
						aria-current=${url.startsWith("/guides") && "page"}
					>Guides</a>
				</div>
				<div>
					<a
						href="/blog/"
						aria-current=${url.startsWith("/blog") && "page"}
					>Blog</a>
				</div>
				<div>
					<a
						href="/playground/"
						aria-current=${url.startsWith("/playground") && "page"}
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
