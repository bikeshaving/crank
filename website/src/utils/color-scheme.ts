/**
 * Shared color scheme utilities for consistent dark/light mode handling
 */

export type ColorScheme = "dark" | "light";

/**
 * Gets the current color scheme from sessionStorage or system preference
 */
export function getColorScheme(): ColorScheme {
	if (typeof window === "undefined") {
		// For SSR, we can't know the preference, so we return null/undefined
		// and let client-side hydration handle it
		return "dark"; // Still need a default for type safety
	}

	const stored = sessionStorage.getItem("color-scheme");
	if (stored === "dark" || stored === "light") {
		return stored;
	}

	// Fall back to system preference
	return window.matchMedia &&
		window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

/**
 * Sets the color scheme in sessionStorage
 */
export function setColorScheme(scheme: ColorScheme): void {
	if (typeof window === "undefined") return;
	sessionStorage.setItem("color-scheme", scheme);
}

/**
 * Applies color scheme class to document elements.
 * The actual colors are defined in CSS via :root and .color-scheme-light
 */
export function applyColorScheme(
	scheme: ColorScheme,
	target: Document | HTMLElement = document.documentElement,
): void {
	const root = target instanceof Document ? target.documentElement : target;
	const body =
		target instanceof Document ? target.body : target.ownerDocument?.body;

	// Just toggle the class - CSS handles the actual colors
	if (scheme === "dark") {
		root.classList.remove("color-scheme-light");
		body?.classList.remove("color-scheme-light");
	} else {
		root.classList.add("color-scheme-light");
		body?.classList.add("color-scheme-light");
	}
}

/**
 * Returns the inline script code for applying color scheme before render.
 * Use this in server-rendered HTML to prevent FOUC.
 * Only handles the mechanism - CSS defines the actual colors.
 */
export function getColorSchemeScript(): string {
	return `
		const colorScheme = sessionStorage.getItem("color-scheme") ||
			(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark" : "light");

		if (colorScheme === "light") {
			document.documentElement.classList.add("color-scheme-light");
		}
	`.trim();
}

