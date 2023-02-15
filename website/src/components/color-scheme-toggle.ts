import {jsx} from "@b9g/crank/standalone";
import type {Context} from "@b9g/crank/standalone";

let colorScheme: string | undefined;
if (typeof window !== "undefined") {
	colorScheme =
		sessionStorage.getItem("color-scheme") ||
		(window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light");
	if (colorScheme === "dark") {
		document.body.classList.remove("color-theme-light");
	} else {
		document.body.classList.add("color-theme-light");
	}
}

// This component would not work with multiple instances, insofar as clicking
// on one instance would not notify the others. Too lazy to fix this though and
// I don’t want to.
export function ColorSchemeToggle(this: Context) {
	const onclick = () => {
		colorScheme = colorScheme === "dark" ? "light" : "dark";
		sessionStorage.setItem("color-scheme", colorScheme);
		this.refresh();
	};

	if (typeof window !== "undefined") {
		if (colorScheme === "dark") {
			document.body.classList.remove("color-theme-light");
			for (const iframe of Array.from(
				document.querySelectorAll(".playground-iframe"),
			)) {
				(
					iframe as HTMLIFrameElement
				).contentWindow?.document.body.classList.remove("color-theme-light");
			}
		} else {
			document.body.classList.add("color-theme-light");
			for (const iframe of Array.from(
				document.querySelectorAll(".playground-iframe"),
			)) {
				(
					iframe as HTMLIFrameElement
				).contentWindow?.document.body.classList.add("color-theme-light");
			}
		}
	}

	// TODO: better icons?
	return jsx`
		<div>
			<button onclick=${onclick}>
				${colorScheme == null ? "⬜" : colorScheme === "dark" ? "💡" : "🕶"}
			</button>
		</div>
	`;
}
