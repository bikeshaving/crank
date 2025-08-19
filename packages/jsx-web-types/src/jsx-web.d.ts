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
	MathMLAttributesTagNamesMap,
	HTMLVoidTagNames,
	SVGVoidTagNames,
	MathMLVoidTagNames
} from "./attributes.generated";

/**
 * Enhanced HTML intrinsic elements that merge DOM properties with JSX attributes
 * Uses the JSXProps utility for intelligent property/attribute mapping
 * Void elements cannot have children
 * 
 * Note: This is an example implementation. Users should create their own
 * IntrinsicElements by calling JSXProps with their framework's types:
 * 
 * JSXProps<TElement, TAttributes, TIsVoid, TIntrinsicAttributes, TElementChildrenAttribute>
 */
export type HTMLIntrinsicElements<
	TIntrinsicAttributes,
	TElementChildrenAttribute
> = {
	[K in keyof HTMLElementTagNameMap]: JSXProps<
		HTMLElementTagNameMap[K],
		HTMLAttributesTagNamesMap[K],
		K extends HTMLVoidTagNames ? true : false,
		TIntrinsicAttributes,
		TElementChildrenAttribute
	>;
};

/**
 * Enhanced SVG intrinsic elements that merge DOM properties with JSX attributes
 * Uses the JSXProps utility for intelligent property/attribute mapping
 * Self-closing elements cannot have children
 */
export type SVGIntrinsicElements<
	TIntrinsicAttributes,
	TElementChildrenAttribute
> = {
	[K in keyof SVGElementTagNameMap]: JSXProps<
		SVGElementTagNameMap[K],
		SVGAttributesTagNamesMap[K],
		K extends SVGVoidTagNames ? true : false,
		TIntrinsicAttributes,
		TElementChildrenAttribute
	>;
};

/**
 * Enhanced MathML intrinsic elements that merge DOM properties with JSX attributes
 * Uses the JSXProps utility for intelligent property/attribute mapping
 * Empty elements cannot have children
 */
export type MathMLIntrinsicElements<
	TIntrinsicAttributes,
	TElementChildrenAttribute
> = {
	[K in keyof MathMLElementTagNameMap]: JSXProps<
		MathMLElementTagNameMap[K],
		MathMLAttributesTagNamesMap[K],
		K extends MathMLVoidTagNames ? true : false,
		TIntrinsicAttributes,
		TElementChildrenAttribute
	>;
};

/**
 * Complete intrinsic elements combining HTML, SVG, and MathML
 * Uses union of values for conflicting keys (e.g., 'a' gets both HTML and SVG props)
 */
export type WebIntrinsicElements<
	TIntrinsicAttributes,
	TElementChildrenAttribute
> = {
  [K in keyof HTMLIntrinsicElements<TIntrinsicAttributes, TElementChildrenAttribute> | keyof SVGIntrinsicElements<TIntrinsicAttributes, TElementChildrenAttribute> | keyof MathMLIntrinsicElements<TIntrinsicAttributes, TElementChildrenAttribute>]: 
    (K extends keyof HTMLIntrinsicElements<TIntrinsicAttributes, TElementChildrenAttribute> ? HTMLIntrinsicElements<TIntrinsicAttributes, TElementChildrenAttribute>[K] : never) |
    (K extends keyof SVGIntrinsicElements<TIntrinsicAttributes, TElementChildrenAttribute> ? SVGIntrinsicElements<TIntrinsicAttributes, TElementChildrenAttribute>[K] : never) |
    (K extends keyof MathMLIntrinsicElements<TIntrinsicAttributes, TElementChildrenAttribute> ? MathMLIntrinsicElements<TIntrinsicAttributes, TElementChildrenAttribute>[K] : never);
};

/**
 * Combined attributes map for all web platform elements
 */
export type WebAttributesTagNameMap = HTMLAttributesTagNamesMap & SVGAttributesTagNamesMap & MathMLAttributesTagNamesMap;

/**
 * Combined void elements for all web platform elements
 */
export type WebVoidElements = HTMLVoidTagNames | SVGVoidTagNames | MathMLVoidTagNames;
