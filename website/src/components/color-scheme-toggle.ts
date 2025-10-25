import {jsx} from "@b9g/crank/standalone";
import type {Context} from "@b9g/crank/standalone";
import {
	getColorScheme,
	setColorScheme,
	applyColorScheme,
	syncIframes,
	type ColorScheme,
} from "../utils/color-scheme.js";

// the website defaults to dark mode
let colorScheme: ColorScheme | undefined;
if (typeof window !== "undefined") {
	colorScheme = getColorScheme();
	applyColorScheme(colorScheme);
}

// This component would not work with multiple instances, insofar as clicking
// on one instance would not update the state of others. Too lazy to fix this
// though.
export function ColorSchemeToggle(this: Context) {
	const onclick = () => {
		colorScheme = colorScheme === "dark" ? "light" : "dark";
		setColorScheme(colorScheme);
		this.refresh();
	};

	if (typeof window !== "undefined") {
		applyColorScheme(colorScheme!);
		syncIframes(colorScheme!);
	}

	return jsx`
		<button
			onclick=${onclick}
			role="switch"
			aria-label="set dark mode"
			aria-checked="${(colorScheme === "dark").toString()}"
			hydrate="!aria-checked !children"
		>
			${colorScheme == null ? "⬜" : colorScheme === "dark" ? "💡" : "🕶"}
		</button>
	`;
}
