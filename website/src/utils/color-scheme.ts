/**
 * Shared color scheme utilities for consistent dark/light mode handling
 */

export type ColorScheme = "dark" | "light";

/**
 * Gets the current color scheme from sessionStorage or system preference
 */
export function getColorScheme(): ColorScheme {
	if (typeof window === "undefined") {
		return "dark"; // SSR default
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
 * Applies color scheme classes and CSS variables to a document element
 */
export function applyColorScheme(
	scheme: ColorScheme,
	target: Document | HTMLElement = document.documentElement,
): void {
	const root = target instanceof Document ? target.documentElement : target;
	const body =
		target instanceof Document ? target.body : target.ownerDocument?.body;

	const isDark = scheme === "dark";
	const bgColor = isDark ? "#0a0e1f" : "#e7f4f5";
	const textColor = isDark ? "#f5f9ff" : "#0a0e1f";

	// Apply CSS variables as inline styles for highest specificity
	root.style.setProperty("--bg-color", bgColor);
	root.style.setProperty("--text-color", textColor);

	// Apply classes
	if (isDark) {
		root.classList.remove("color-scheme-light");
		body?.classList.remove("color-scheme-light");
	} else {
		root.classList.add("color-scheme-light");
		body?.classList.add("color-scheme-light");
	}
}

/**
 * Returns the inline script code for applying color scheme before render
 * Use this in server-rendered HTML to prevent FOUC
 */
export function getColorSchemeScript(): string {
	return `
		const colorScheme = sessionStorage.getItem("color-scheme") ||
			(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark" : "light");

		const isDark = colorScheme === "dark";
		const bgColor = isDark ? "#0a0e1f" : "#e7f4f5";
		const textColor = isDark ? "#f5f9ff" : "#0a0e1f";

		document.documentElement.style.setProperty("--bg-color", bgColor);
		document.documentElement.style.setProperty("--text-color", textColor);

		if (!isDark) {
			document.documentElement.classList.add("color-scheme-light");
		}
	`.trim();
}

/**
 * Syncs color scheme to all playground iframes via postMessage
 */
export function syncIframes(scheme: ColorScheme): void {
	if (typeof window === "undefined") return;

	const iframes =
		document.querySelectorAll<HTMLIFrameElement>(".playground-iframe");

	for (const iframe of iframes) {
		// Send message to iframe
		iframe.contentWindow?.postMessage(
			JSON.stringify({type: "color-scheme-change", scheme}),
			window.location.origin,
		);

		// Also apply directly (for iframes that don't have message listener yet)
		if (iframe.contentDocument) {
			applyColorScheme(scheme, iframe.contentDocument);
		}
	}
}

/**
 * Sets up a message listener in an iframe to receive color scheme updates
 */
export function setupIframeColorSchemeListener(): void {
	if (typeof window === "undefined") return;

	window.addEventListener("message", (ev) => {
		try {
			const data = JSON.parse(ev.data);
			if (data.type === "color-scheme-change") {
				applyColorScheme(data.scheme as ColorScheme);
			}
		} catch {
			// Ignore non-JSON messages
		}
	});
}
