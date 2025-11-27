import type {Context} from "@b9g/crank/standalone";

export type ColorScheme = "dark" | "light";

/**
 * Reactive color scheme utility for Crank components
 *
 * This utility provides a clean, library-ready way to manage color schemes with:
 * - Automatic sync across iframes via storage events
 * - System preference detection via matchMedia
 * - sessionStorage for user overrides
 * - Automatic cleanup
 *
 * @example
 * ```ts
 * function *MyComponent() {
 *   const colorScheme = useColorScheme(this);
 *
 *   for ({} of this) {
 *     yield <div>Current theme: {colorScheme.get()}</div>;
 *   }
 * }
 * ```
 */
export function useColorScheme(ctx: Context) {
	let currentScheme: ColorScheme = getInitialColorScheme();

	// Apply initial scheme
	applyColorScheme(currentScheme);

	// Listen to system preference changes (only apply if no user override)
	if (typeof window !== "undefined") {
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleSystemChange = (e: MediaQueryListEvent) => {
			// Only apply system changes if user hasn't set an override
			if (!sessionStorage.getItem("color-scheme")) {
				currentScheme = e.matches ? "dark" : "light";
				applyColorScheme(currentScheme);
				ctx.refresh();
			}
		};

		mediaQuery.addEventListener("change", handleSystemChange);
		ctx.cleanup(() => mediaQuery.removeEventListener("change", handleSystemChange));
	}

	// Listen to storage events (fired when OTHER windows/iframes change sessionStorage)
	if (typeof window !== "undefined") {
		const handleStorageChange = (e: StorageEvent) => {
			if (
				e.key === "color-scheme" &&
				e.storageArea === sessionStorage &&
				(e.newValue === "dark" || e.newValue === "light")
			) {
				currentScheme = e.newValue;
				applyColorScheme(currentScheme);
				ctx.refresh();
			}
		};

		window.addEventListener("storage", handleStorageChange);
		ctx.cleanup(() => window.removeEventListener("storage", handleStorageChange));
	}

	return {
		/**
		 * Get the current color scheme
		 */
		get(): ColorScheme {
			return currentScheme;
		},

		/**
		 * Toggle between dark and light mode
		 */
		toggle(): void {
			currentScheme = currentScheme === "dark" ? "light" : "dark";
			if (typeof window !== "undefined") {
				sessionStorage.setItem("color-scheme", currentScheme);
			}
			applyColorScheme(currentScheme);
			// Note: storage event won't fire in same window, but will fire in iframes
			ctx.refresh();
		},

		/**
		 * Set a specific color scheme
		 */
		set(scheme: ColorScheme): void {
			currentScheme = scheme;
			if (typeof window !== "undefined") {
				sessionStorage.setItem("color-scheme", currentScheme);
			}
			applyColorScheme(currentScheme);
			ctx.refresh();
		},
	};
}

/**
 * Gets the initial color scheme from sessionStorage or system preference
 */
function getInitialColorScheme(): ColorScheme {
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
 * Applies color scheme by setting data-theme attribute
 */
function applyColorScheme(scheme: ColorScheme): void {
	if (typeof document === "undefined") return;

	const isDark = scheme === "dark";
	const bgColor = isDark ? "#0a0e1f" : "#e7f4f5";
	const textColor = isDark ? "#f5f9ff" : "#0a0e1f";

	// Set data-theme attribute (cleaner than classes)
	document.documentElement.dataset.theme = scheme;

	// Also set CSS variables as inline styles for highest specificity
	document.documentElement.style.setProperty("--bg-color", bgColor);
	document.documentElement.style.setProperty("--text-color", textColor);

	// Keep body classes for backward compatibility
	const body = document.body;
	if (body) {
		if (isDark) {
			body.classList.remove("color-scheme-light");
		} else {
			body.classList.add("color-scheme-light");
		}
	}
}

/**
 * Returns inline script code for applying color scheme before render
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

		document.documentElement.dataset.theme = colorScheme;
		document.documentElement.style.setProperty("--bg-color", bgColor);
		document.documentElement.style.setProperty("--text-color", textColor);

		if (!isDark && document.body) {
			document.body.classList.add("color-scheme-light");
		}
	`.trim();
}
