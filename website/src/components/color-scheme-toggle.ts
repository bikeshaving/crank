import {jsx} from "@b9g/crank/standalone";
import type {Context} from "@b9g/crank/standalone";
import {useColorScheme} from "../utils/color-scheme.js";

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
		const onclick = () => colorScheme.toggle();

		yield jsx`
			<button
				onclick=${onclick}
				role="switch"
				aria-label="toggle color scheme"
				aria-checked="${(scheme === "dark").toString()}"
				hydrate="!aria-checked !children"
			>
				${scheme === "dark" ? "💡" : "🕶"}
			</button>
		`;
	}
}
