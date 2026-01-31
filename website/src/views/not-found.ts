import {jsx} from "@b9g/crank/standalone";
import {css} from "@emotion/css";

import {Root} from "../components/root.js";

interface ViewProps {
	url: string;
	params: Record<string, string>;
}

export default function NotFound({url}: ViewProps) {
	return jsx`
		<${Root}
			title="404 - Page Not Found | Crank.js"
			url=${url}
		>
			<div class=${css`
				min-height: 100vh;
				display: flex;
				flex-direction: column;
				justify-content: center;
				align-items: center;
				text-align: center;
				padding: 2em;
			`}>
				<h1 class=${css`
					font-size: max(60px, 15vw);
					margin: 0;
					color: var(--highlight-color);
				`}>404</h1>
				<p class=${css`
					font-size: max(18px, 2vw);
					margin: 1em 0 2em;
				`}>Page not found.</p>
				<a href="/" class=${css`
					border: 1px solid var(--text-color);
					border-radius: 4px;
					padding: 0.5em 1em;
					text-decoration: none;
					&:hover {
						background: rgba(255, 255, 255, 0.1);
					}
				`}>Go home</a>
			</div>
		<//Root>
	`;
}
