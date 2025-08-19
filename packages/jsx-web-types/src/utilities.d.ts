/**
 * JSX Type Utilities
 *
 * Core type utilities for creating framework-agnostic JSX element types.
 * These utilities are used by the generated types to create properly
 * parameterized element interfaces.
 */



/**
 * Helper to find property for attribute by lowercase matching
 */
type PropertyForAttribute<AttrName, Properties> = {
	[PropName in keyof Properties]: PropName extends string
		? Lowercase<PropName> extends AttrName
			? PropName
			: never
		: never;
}[keyof Properties];

/**
 * JSXProps utility that merges DOM properties with attributes and handles children
 * @param TElement - The DOM element type (e.g., HTMLDivElement)
 * @param TAttributes - The generated attributes interface for this element
 * @param TIsVoid - Whether this element is void (cannot have children)
 * @param TIntrinsicAttributes - Framework's intrinsic attributes (key, ref, etc.)
 * @param TElementChildrenAttribute - Framework's children attribute definition
 */
export type JSXProps<
	TElement, 
	TAttributes, 
	TIsVoid extends boolean,
	TIntrinsicAttributes,
	TElementChildrenAttribute
> = 
	// Handle children separately for both void and non-void cases
	(TIsVoid extends true 
		? {} 
		: { [K in keyof TElementChildrenAttribute]?: TElementChildrenAttribute[K] }
	) & 
	// Handle intrinsic attributes (key, ref, etc.)
	{ [K in keyof TIntrinsicAttributes]?: TIntrinsicAttributes[K] } &
	// Handle element-specific attributes and properties
	{
	[K in keyof TAttributes | keyof JSXAbleProperties<TElement>]?: 
		K extends keyof TAttributes
				? K extends keyof JSXAbleProperties<TElement>
					? // K exists in BOTH attributes and properties - use enhanced DOM property type
						// Example: "id" exists as both attribute and property, use JSXAttributeValue<string>
						JSXAttributeValue<JSXAbleProperties<TElement>[K]>
					: // K only exists in attributes
						// check if there's a camelCase property match
						PropertyForAttribute<K, JSXAbleProperties<TElement>> extends never
						? // No camelCase property found - use original attribute type
							// Example: "title" attribute has no property match, use original string type
							TAttributes[K]
						: // We have to double-check for exhaustiveness
							PropertyForAttribute<
									K,
									JSXAbleProperties<TElement>
							  > extends keyof JSXAbleProperties<TElement>
							? // A camelCase property was found in the properties
								// Example: "tabindex" attribute should map to "tabIndex" property
								JSXAttributeValue<
									JSXAbleProperties<TElement>[PropertyForAttribute<
										K,
										JSXAbleProperties<TElement>
									>]
								>
							: // This fallback should never happen
								TAttributes[K]
				: // K is NOT in attributes, check if it's a DOM property
					K extends keyof JSXAbleProperties<TElement>
					? // K only exists as a DOM property - wrap as JSXAttributeValue
						// Example: "className" property becomes JSXAttributeValue<string>
						JSXAttributeValue<JSXAbleProperties<TElement>[K]>
					: // K exists in none of the sources (shouldn't happen)
						never;
};

/**
 * JSX attribute value type - maximally permissive for JSX semantics
 * - string/number: converted to string attributes
 * - boolean: presence-based attributes (true=present, false=absent)
 * - null/undefined: treated as absent
 */
export type JSXAttributeValue<T = unknown> = T extends Function
	? T | null | undefined // Functions (event handlers) - keep original type but allow null/undefined
	: T extends number
		? number | `${number}` // Numbers can be strings: width="100"
		: T extends string
			? string extends T
				? T | number | boolean | null | undefined // Generic string - keep flexibility
				: T | boolean | null | undefined // Specific string union - no arbitrary numbers
			: string | number | boolean | null | undefined; // Fallback (includes boolean case for now)

/**
 * Convert DOM element interfaces to JSX-compatible property types
 *
 * This mapped type:
 * - Removes readonly modifiers (JSX props should be settable)
 * - Filters out methods but keeps event handler properties (which can be null)
 * - Makes all properties optional (JSX doesn't require all props)
 * - Filters out children property - handled by framework's ElementChildrenAttribute
 */
export type JSXAbleProperties<T> = {
	-readonly [K in keyof T as 
		// Check if it's a function type
		T[K] extends (...args: any[]) => any
				? // Inspect function signature to detect event handlers
					T[K] extends (event: infer E, ...rest: any[]) => infer R
					? // First parameter must extend Event and return type should be void or any
						E extends Event
						? R extends void
							? K // Return type is void (event handler) - keep it
							: never // Return type is specific (method) - filter out
						: never // First param not Event - filter out method
					: // Function with no params or different signature - filter out
						never
				: // Not a function - keep all other properties
					K]?: T[K]; // Keep the original type
};

/**
 * Utility type to create complete element props by combining attributes, properties, and framework-specific types
 * Creates unions for keys that exist in both attributes and properties (e.g., width?: number | JSXAttributeValue)
 */
export type ElementProps<
	TAttributes,
	TProperties,
	TFrameworkAttrs = {},
	TIntrinsicAttrs = {},
	TChildrenAttribute = {},
> = {
	[K in keyof TAttributes | keyof TProperties]?: K extends keyof TAttributes
		? K extends keyof TProperties
			? TProperties[K] | TAttributes[K] // Union if in both
			: TAttributes[K] // Attribute only
		: K extends keyof TProperties
			? TProperties[K] // Property only
			: never;
} & TFrameworkAttrs &
	TIntrinsicAttrs &
	Partial<TChildrenAttribute>;

// /**
//  * Void element children constraint - prevents children on void elements
//  * Maps over framework's ElementChildrenAttribute to dynamically set the children property to never
//  */
// export type VoidElementChildren<TChildrenAttribute = {}> = {
// 	[K in keyof TChildrenAttribute]?: never;
// };

// /**
//  * Utility type for void elements that cannot have children
//  */
// export type CreateVoidElementProps<
// 	TAttributes,
// 	TProperties,
// 	TFrameworkAttrs = {},
// 	TIntrinsicAttrs = {},
// 	TChildrenAttribute = {},
// > = Omit<
// 	TAttributes & TProperties & TFrameworkAttrs & TIntrinsicAttrs,
// 	keyof TChildrenAttribute
// > &
// 	VoidElementChildren<TChildrenAttribute>;

// /**
//  * HTML void elements that cannot have children
//  * TODO: Generate this from actual void element data
//  */
// export type HTMLVoidElement =
// 	| "area"
// 	| "base"
// 	| "br"
// 	| "col"
// 	| "embed"
// 	| "hr"
// 	| "img"
// 	| "input"
// 	| "link"
// 	| "meta"
// 	| "param"
// 	| "source"
// 	| "track"
// 	| "wbr";

// /**
//  * SVG void elements that cannot have children
//  * TODO: Generate this from actual void element data
//  */
// export type SVGVoidElement =
// 	| "animate"
// 	| "animateMotion"
// 	| "animateTransform"
// 	| "circle"
// 	| "ellipse"
// 	| "feBlend"
// 	| "feColorMatrix"
// 	| "feComponentTransfer"
// 	| "feComposite"
// 	| "feConvolveMatrix"
// 	| "feDiffuseLighting"
// 	| "feDisplacementMap"
// 	| "feDistantLight"
// 	| "feDropShadow"
// 	| "feFlood"
// 	| "feFuncA"
// 	| "feFuncB"
// 	| "feFuncG"
// 	| "feFuncR"
// 	| "feGaussianBlur"
// 	| "feImage"
// 	| "feMerge"
// 	| "feMergeNode"
// 	| "feMorphology"
// 	| "feOffset"
// 	| "fePointLight"
// 	| "feSpecularLighting"
// 	| "feSpotLight"
// 	| "feTile"
// 	| "feTurbulence"
// 	| "image"
// 	| "line"
// 	| "path"
// 	| "polygon"
// 	| "polyline"
// 	| "rect"
// 	| "set"
// 	| "stop"
// 	| "use";

// /**
//  * MathML void elements that cannot have children
//  * TODO: Generate this from actual void element data
//  */
// export type MathMLVoidElement = "mi" | "mn" | "mo" | "ms" | "mspace" | "mtext";

// /**
//  * All void elements across HTML, SVG, and MathML
//  * TODO: Generate this from actual void element data
//  */
// export type AllVoidElements =
// 	| HTMLVoidElement
// 	| SVGVoidElement
// 	| MathMLVoidElement;
