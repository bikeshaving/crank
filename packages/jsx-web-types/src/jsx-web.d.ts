/**
 * jsx-web-types
 *
 * Comprehensive TypeScript types for JSX web platform elements.
 * Supports HTML, SVG, and MathML with proper attribute/property unions.
 */
export * from "./utilities";
export * from "./attributes.generated";

import type {JSXProps} from "./utilities";
import type {
	HTMLAttributesTagNamesMap,
	SVGAttributesTagNamesMap,
	MathMLAttributesTagNamesMap
} from "./attributes.generated";

/**
 * HTML intrinsic elements: merges DOM properties with spec attributes via the
 * JSXProps utility. Parameterized by a framework's intrinsic attributes,
 * children attribute, and optional per-prop value overrides (e.g. an object
 * `style`/`class`).
 */
export type HTMLIntrinsicElements<
	TIntrinsicAttributes = {},
	TElementChildrenAttribute = {children?: unknown},
	TPropOverrides = {}
> = {
	[K in keyof HTMLElementTagNameMap]: JSXProps<
		HTMLElementTagNameMap[K],
		HTMLAttributesTagNamesMap[K],
		TIntrinsicAttributes,
		TElementChildrenAttribute,
		TPropOverrides
	>;
};

/**
 * SVG intrinsic elements (see HTMLIntrinsicElements).
 */
export type SVGIntrinsicElements<
	TIntrinsicAttributes = {},
	TElementChildrenAttribute = {children?: unknown},
	TPropOverrides = {}
> = {
	[K in keyof SVGElementTagNameMap]: JSXProps<
		SVGElementTagNameMap[K],
		SVGAttributesTagNamesMap[K],
		TIntrinsicAttributes,
		TElementChildrenAttribute,
		TPropOverrides
	>;
};

/**
 * MathML intrinsic elements (see HTMLIntrinsicElements).
 */
export type MathMLIntrinsicElements<
	TIntrinsicAttributes = {},
	TElementChildrenAttribute = {children?: unknown},
	TPropOverrides = {}
> = {
	[K in keyof MathMLElementTagNameMap]: JSXProps<
		MathMLElementTagNameMap[K],
		MathMLAttributesTagNamesMap[K],
		TIntrinsicAttributes,
		TElementChildrenAttribute,
		TPropOverrides
	>;
};

/**
 * Complete intrinsic elements combining HTML, SVG, and MathML.
 * Uses a union of values for conflicting keys (e.g. 'a' gets both HTML and SVG props).
 */
export type WebIntrinsicElements<
	TIntrinsicAttributes = {},
	TElementChildrenAttribute = {children?: unknown},
	TPropOverrides = {}
> = {
	// A handful of tag names exist in more than one namespace (`a`, `font`,
	// `script`, `style`, `title`). Resolve them by precedence — HTML, then SVG,
	// then MathML — rather than unioning the per-namespace prop types. JSX
	// conventionally treats these tags as HTML, and a single (non-union)
	// definition per tag is also what lets TypeScript carry each attribute's MDN
	// JSDoc through to hover/completion: a union of two differently-typed props
	// reconciles to no documentation.
	[K in
		| keyof HTMLIntrinsicElements<TIntrinsicAttributes, TElementChildrenAttribute, TPropOverrides>
		| keyof SVGIntrinsicElements<TIntrinsicAttributes, TElementChildrenAttribute, TPropOverrides>
		| keyof MathMLIntrinsicElements<TIntrinsicAttributes, TElementChildrenAttribute, TPropOverrides>]:
		K extends keyof HTMLIntrinsicElements<TIntrinsicAttributes, TElementChildrenAttribute, TPropOverrides>
			? HTMLIntrinsicElements<TIntrinsicAttributes, TElementChildrenAttribute, TPropOverrides>[K]
			: K extends keyof SVGIntrinsicElements<TIntrinsicAttributes, TElementChildrenAttribute, TPropOverrides>
				? SVGIntrinsicElements<TIntrinsicAttributes, TElementChildrenAttribute, TPropOverrides>[K]
				: K extends keyof MathMLIntrinsicElements<TIntrinsicAttributes, TElementChildrenAttribute, TPropOverrides>
					? MathMLIntrinsicElements<TIntrinsicAttributes, TElementChildrenAttribute, TPropOverrides>[K]
					: never;
};

/**
 * Combined attributes map for all web platform elements
 */
export type WebAttributesTagNameMap = HTMLAttributesTagNamesMap & SVGAttributesTagNamesMap & MathMLAttributesTagNamesMap;
