import {jsx} from "@b9g/crank/standalone";
import {css} from "@emotion/css";
import type {Context} from "@b9g/crank/standalone";
import {useColorScheme} from "../utils/color-scheme.js";

const toggleStyles = css`
	position: relative;
	width: 60px;
	height: 32px;
	border-radius: 16px;
	border: 2px solid var(--text-color);
	background: var(--bg-color);
	cursor: pointer;
	padding: 0 4px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-size: 16px;

	&:focus {
		outline: none;
		border-color: var(--highlight-color);
	}
`;

const knobStyles = css`
	position: absolute;
	width: 26px;
	height: 26px;
	border-radius: 50%;
	border: 2px solid var(--text-color);
	background: var(--bg-color);
	transition: left 0.2s;
`;

/**
 * Color scheme toggle component
 *
 * Uses the reactive useColorScheme hook which automatically:
 * - Syncs with all iframes via storage events
 * - Responds to system preference changes
 * - Persists user choice in sessionStorage
 */
export function* ColorSchemeToggle(this: Context) {
	const colorScheme = useColorScheme(this);

	for ({} of this) {
		const scheme = colorScheme.get();
		const isDark = scheme === "dark";
		const onclick = () => colorScheme.toggle();

		// Emojis must be interpolated because Bun escapes them in tagged templates.
		// https://github.com/oven-sh/bun/issues/19654
		yield jsx`
			<button
				onclick=${onclick}
				role="switch"
				aria-label="toggle color scheme"
				aria-checked=${isDark}
				hydrate="!aria-checked"
				class=${toggleStyles}
			>
				<span>${"🌙"}</span>
				<span>${"💡"}</span>
				<span
					class=${knobStyles}
					style=${{left: isDark ? "30px" : "1px"}}
				/>
			</button>
		`;
	}
}
