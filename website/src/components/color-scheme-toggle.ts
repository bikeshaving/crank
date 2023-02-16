import {jsx} from "@b9g/crank/standalone";
import type {Context} from "@b9g/crank/standalone";

// the website defaults to dark mode
let colorScheme: string | undefined;
if (typeof window !== "undefined") {
	colorScheme =
		sessionStorage.getItem("color-scheme") ||
		(window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light");
	if (colorScheme === "dark") {
		document.body.classList.remove("color-scheme-light");
	} else {
		document.body.classList.add("color-scheme-light");
	}
}

// This component would not work with multiple instances, insofar as clicking
// on one instance would not update the state of others. Too lazy to fix this
// though.
export function ColorSchemeToggle(this: Context) {
	const onclick = () => {
		colorScheme = colorScheme === "dark" ? "light" : "dark";
		sessionStorage.setItem("color-scheme", colorScheme);
		this.refresh();
	};

	if (typeof window !== "undefined") {
		if (colorScheme === "dark") {
			document.body.classList.remove("color-scheme-light");
			for (const iframe of Array.from(
				document.querySelectorAll(".playground-iframe"),
			)) {
				(
					iframe as HTMLIFrameElement
				).contentWindow?.document.body.classList.remove("color-scheme-light");
			}
		} else {
			document.body.classList.add("color-scheme-light");
			for (const iframe of Array.from(
				document.querySelectorAll(".playground-iframe"),
			)) {
				(
					iframe as HTMLIFrameElement
				).contentWindow?.document.body.classList.add("color-scheme-light");
			}
		}
	}

	return jsx`
		<button
			onclick=${onclick}
			role="switch"
			aria-label="set dark mode"
			aria-checked="${(colorScheme === "dark").toString()}"
		>
			${colorScheme == null ? "⬜" : colorScheme === "dark" ? "💡" : "🕶"}
		</button>
	`;
}
