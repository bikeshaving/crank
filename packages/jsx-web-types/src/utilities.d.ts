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
 * @param TIntrinsicAttributes - Framework's intrinsic attributes (key, ref, etc.)
 * @param TElementChildrenAttribute - Framework's children attribute definition
 * @param TPropOverrides - Framework-supplied value overrides for specific props.
 *   The web platform types `style`/`class` as strings; a framework that accepts
 *   richer values (e.g. an object `style` or a classnames-style object `class`)
 *   supplies them here rather than baking its convention into the base types.
 */
export type JSXProps<
	TElement,
	TAttributes,
	TIntrinsicAttributes,
	TElementChildrenAttribute,
	TPropOverrides = {}
> =
	// Children — accepted on every element. (We intentionally don't type void
	// elements as childless: forbidding `<br>x</br>` at the type level isn't
	// worth the machinery, and the runtime simply ignores stray children.)
	{ [K in keyof TElementChildrenAttribute]?: TElementChildrenAttribute[K] } &
	// Handle intrinsic attributes (key, ref, etc.)
	{ [K in keyof TIntrinsicAttributes]?: TIntrinsicAttributes[K] } &
	// Spec attributes. This map is *homomorphic* over TAttributes (its key set is
	// exactly `keyof TAttributes`), which is what lets TypeScript carry each
	// attribute's JSDoc through to hover/completion in editors and other LSP
	// tooling. A union-keyed map (e.g. `keyof TAttributes | keyof Props`) is
	// non-homomorphic and silently drops those doc comments, so the DOM-property
	// keys are layered in via a separate homomorphic map below.
	{
		[K in keyof TAttributes]?:
			K extends keyof TPropOverrides
				? // Framework-supplied value override for this prop. The base library
					// types every attribute/property natively (the web platform treats
					// `style`/`class` as strings); richer conventions like an object
					// `style` or a classnames-style object `class` are layered on by the
					// consuming framework via TPropOverrides, not baked in here.
					TPropOverrides[K]
				: K extends keyof JSXAbleProperties<TElement>
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
								TAttributes[K];
	} &
	// DOM properties (camelCase forms like `className`, plus any property not also
	// surfaced as an attribute). Homomorphic over the element's properties so any
	// JSDoc on them is likewise preserved. Where a key is also an attribute, the
	// computed value matches the attribute map above, so the intersection is a
	// no-op rather than a conflict.
	{
		[K in keyof JSXAbleProperties<TElement>]?:
			K extends keyof TPropOverrides
				? TPropOverrides[K]
				: JSXAttributeValue<JSXAbleProperties<TElement>[K]>;
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
		// The DOM `children` property (an HTMLCollection) is not a JSX prop;
		// children come from the framework's ElementChildrenAttribute.
		K extends "children"
			? never
			: // Check if it's a function type
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
