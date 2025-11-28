import type {Context} from "@b9g/crank/standalone";

export type ColorScheme = "dark" | "light";

const BG_DARK = "#0a0e1f";
const BG_LIGHT = "#e7f4f5";
const TEXT_DARK = "#f5f9ff";
const TEXT_LIGHT = "#0a0e1f";

/**
 * Reactive color scheme hook for Crank components
 */
export function useColorScheme(ctx: Context) {
	// SSR: return static object, hydration will set up reactivity
	if (typeof window === "undefined") {
		return {
			get: (): ColorScheme => "dark",
			toggle: () => {},
			set: () => {},
		};
	}

	let current: ColorScheme = getColorScheme();
	applyColorScheme(current);

	const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
	const onMediaChange = (e: MediaQueryListEvent) => {
		if (!sessionStorage.getItem("color-scheme")) {
			current = e.matches ? "dark" : "light";
			applyColorScheme(current);
			ctx.refresh();
		}
	};
	mediaQuery.addEventListener("change", onMediaChange);
	ctx.cleanup(() => mediaQuery.removeEventListener("change", onMediaChange));

	const onStorage = (e: StorageEvent) => {
		if (
			e.key === "color-scheme" &&
			e.storageArea === sessionStorage &&
			(e.newValue === "dark" || e.newValue === "light")
		) {
			current = e.newValue;
			applyColorScheme(current);
			ctx.refresh();
		}
	};
	window.addEventListener("storage", onStorage);
	ctx.cleanup(() => window.removeEventListener("storage", onStorage));

	return {
		get(): ColorScheme {
			return current;
		},
		toggle(): void {
			current = current === "dark" ? "light" : "dark";
			sessionStorage.setItem("color-scheme", current);
			applyColorScheme(current);
			ctx.refresh();
		},
		set(scheme: ColorScheme): void {
			current = scheme;
			sessionStorage.setItem("color-scheme", current);
			applyColorScheme(current);
			ctx.refresh();
		},
	};
}

function getColorScheme(): ColorScheme {
	const stored = sessionStorage.getItem("color-scheme");
	if (stored === "dark" || stored === "light") {
		return stored;
	}
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function applyColorScheme(scheme: ColorScheme): void {
	const isDark = scheme === "dark";
	document.documentElement.dataset.theme = scheme;
	document.documentElement.style.setProperty(
		"--bg-color",
		isDark ? BG_DARK : BG_LIGHT,
	);
	document.documentElement.style.setProperty(
		"--text-color",
		isDark ? TEXT_DARK : TEXT_LIGHT,
	);
	// Toggle class for CSS that uses .color-scheme-light
	document.documentElement.classList.toggle("color-scheme-light", !isDark);
}

/**
 * Inline script for FOUC prevention in SSR
 */
export function getColorSchemeScript(): string {
	return `
		const s = sessionStorage.getItem("color-scheme");
		const scheme = s === "dark" || s === "light" ? s :
			(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
		const isDark = scheme === "dark";
		document.documentElement.dataset.theme = scheme;
		document.documentElement.style.setProperty("--bg-color", isDark ? "${BG_DARK}" : "${BG_LIGHT}");
		document.documentElement.style.setProperty("--text-color", isDark ? "${TEXT_DARK}" : "${TEXT_LIGHT}");
		if (!isDark) document.documentElement.classList.add("color-scheme-light");
	`.trim();
}
