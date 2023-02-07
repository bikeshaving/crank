import {jsx} from "@b9g/crank/standalone";
import type {Context} from "@b9g/crank/standalone";

let colorScheme = "dark";
if (typeof window !== "undefined") {
	colorScheme =
		sessionStorage.getItem("color-scheme") ||
		(window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light");
	if (colorScheme === "dark") {
		document.body.classList.add("color-theme-dark");
		document.body.classList.remove("color-theme-light");
	} else {
		document.body.classList.add("color-theme-light");
		document.body.classList.remove("color-theme-dark");
	}
}

export function ColorSchemeToggle(this: Context) {
	const onclick = () => {
		colorScheme = colorScheme === "dark" ? "light" : "dark";
		sessionStorage.setItem("color-scheme", colorScheme);
		this.refresh();
	};

	if (typeof window !== "undefined") {
		if (colorScheme === "dark") {
			document.body.classList.add("color-theme-dark");
			document.body.classList.remove("color-theme-light");
		} else {
			document.body.classList.add("color-theme-light");
			document.body.classList.remove("color-theme-dark");
		}
	}

	// TODO: better icons
	return jsx`
		<div>
			<button onclick=${onclick}>
				${colorScheme === "dark" ? "🌞" : "🌚"}
			</button>
		</div>
	`;
}
