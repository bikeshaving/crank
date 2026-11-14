/**
 * CSS utility functions for style property transformation.
 *
 * This module handles camelCase to kebab-case conversion and automatic
 * px unit conversion for numeric CSS values, making Crank more React-compatible.
 */

/**
 * Converts camelCase CSS property names to kebab-case.
 * Handles vendor prefixes correctly (WebkitTransform -> -webkit-transform).
 * Custom properties (--myVar) are case-sensitive, so they are left alone.
 */
export function camelToKebabCase(str: string): string {
	if (str.startsWith("--")) {
		return str;
	}

	// Handle vendor prefixes that start with capital letters (WebkitTransform -> -webkit-transform)
	if (/^[A-Z]/.test(str)) {
		return `-${str.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`).slice(1)}`;
	}
	// Handle normal camelCase (fontSize -> font-size)
	return str.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

/**
 * CSS properties that should remain unitless when given numeric values.
 * Based on React's list of unitless properties.
 */
export const UNITLESS_PROPERTIES = new Set([
	"animation-iteration-count",
	"aspect-ratio",
	"border-image-outset",
	"border-image-slice",
	"border-image-width",
	"box-flex",
	"box-flex-group",
	"box-ordinal-group",
	"column-count",
	"columns",
	"flex",
	"flex-grow",
	"flex-positive",
	"flex-shrink",
	"flex-negative",
	"flex-order",
	"fill-opacity",
	"flood-opacity",
	"font-weight",
	"grid-area",
	"grid-column",
	"grid-column-end",
	"grid-column-span",
	"grid-column-start",
	"grid-row",
	"grid-row-end",
	"grid-row-span",
	"grid-row-start",
	"line-clamp",
	"line-height",
	"opacity",
	"order",
	"orphans",
	"scale",
	"stop-opacity",
	"stroke-dasharray",
	"stroke-dashoffset",
	"stroke-miterlimit",
	"stroke-opacity",
	"stroke-width",
	"tab-size",
	"widows",
	"z-index",
	"zoom",
]);

const VENDOR_PREFIX = /^-(?:webkit|moz|ms|o)-/;

/**
 * Formats CSS property values, automatically adding "px" to numeric values
 * for properties that are not unitless.
 */
export function formatStyleValue(name: string, value: unknown): string {
	if (typeof value === "number") {
		// If the property should remain unitless, keep the number as-is.
		// Custom properties have no known type, and a vendor-prefixed property
		// (-webkit-line-clamp) takes the same values as the property it prefixes.
		if (
			name.startsWith("--") ||
			UNITLESS_PROPERTIES.has(name.replace(VENDOR_PREFIX, ""))
		) {
			return String(value);
		}
		// Otherwise, append "px" for numeric values
		return `${value}px`;
	}
	return String(value);
}
