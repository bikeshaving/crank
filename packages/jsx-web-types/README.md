# jsx-web-types

Comprehensive TypeScript types for JSX web platform elements (HTML, SVG, MathML).

## Features

- ✅ **Complete coverage**: HTML, SVG, and MathML elements and their attributes
- ✅ **Smart unions**: properties like `width` accept both `number` and `string`
- ✅ **Documented on hover**: each attribute carries its MDN description, surfaced in editor hover/completion
- ✅ **ARIA support**: full ARIA attribute typing with value enums
- ✅ **Framework agnostic**: native names for any JSX framework, plus a camelCase variant for React-likes
- ✅ **Specification-driven**: generated from BCD/MDN, the WAI-ARIA spec, and TypeScript's DOM types

## Installation

```bash
npm install @b9g/jsx-web-types
# or
bun add @b9g/jsx-web-types
```

## Usage

The package is framework-agnostic. The defaults need no configuration:

```typescript
import type {WebIntrinsicElements} from "@b9g/jsx-web-types";

declare global {
  namespace JSX {
    interface IntrinsicElements extends WebIntrinsicElements {}
  }
}
```

To add a framework's special attributes (`key`/`ref`/…) or change the children
key, pass them as type parameters:

```typescript
interface IntrinsicAttributes {
  key?: string | number;
  ref?: unknown;
}
interface ElementChildrenAttribute {
  children?: unknown;
}

declare global {
  namespace JSX {
    interface IntrinsicElements
      extends WebIntrinsicElements<IntrinsicAttributes, ElementChildrenAttribute> {}
  }
}
```

Need a single namespace? Use `HTMLIntrinsicElements`, `SVGIntrinsicElements`, or
`MathMLIntrinsicElements` (same type parameters) in place of `WebIntrinsicElements`.

### Widening prop values (`TPropOverrides`)

The third type parameter lets a framework widen specific props beyond the
platform types — the web platform types `style`/`class` as strings, but a
framework can accept richer values without baking that into the base types:

```typescript
interface PropOverrides {
  class?: string | Record<string, boolean>;
  style?: string | Record<string, string>;
}

type Elements = WebIntrinsicElements<
  IntrinsicAttributes,
  ElementChildrenAttribute,
  PropOverrides
>;
```

## camelCase variant

The standard types use web-platform names (`class`, `for`, `tabindex`). React,
Inferno, and other frameworks camelCase their JSX props (`className`, `htmlFor`,
`tabIndex`, …) — a separate variant for those consumers, with the names sourced
from React's own
[`possibleStandardNames.js`](https://github.com/facebook/react/blob/main/packages/react-dom-bindings/src/shared/possibleStandardNames.js)
(no hand-maintained rename list):

```typescript
import type {CamelCaseIntrinsicElements} from "@b9g/jsx-web-types/camel-case";

// Supply the framework's reserved props (key/ref/…) as the first parameter,
// exactly like the standard types.
interface ReservedProps {
  key?: string | number;
  ref?: unknown;
  dangerouslySetInnerHTML?: {__html: string};
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends CamelCaseIntrinsicElements<ReservedProps> {}
  }
}
```

Event handlers keep their lowercase DOM names (`onclick`) — React's camelCased
event names aren't part of `possibleStandardNames`, so this variant doesn't apply
them.

## Type Safety Examples

### Attribute/Property Unions
```typescript
// ✅ Both work - smart unions for dual attribute/property cases
<img width={100} />      // number (DOM property)
<img width="100" />      // string (HTML attribute)
```

### ARIA Support
```typescript
// ✅ Full ARIA typing
<button aria-pressed={true} aria-label="Save">Save</button>
```

## Package Exports

- `WebIntrinsicElements<TIntrinsicAttributes?, TElementChildrenAttribute?, TPropOverrides?>` — all elements (HTML + SVG + MathML); the type parameters default, so it works with no arguments
- `HTMLIntrinsicElements` / `SVGIntrinsicElements` / `MathMLIntrinsicElements` — a single namespace (same parameters)
- `JSXProps` / `JSXAttributeValue` — the composition utilities, for building custom-element prop types
- `DOMEventMap` — comprehensive event type map (derived from `lib.dom.d.ts`)
- `GlobalAttributes`, `HTMLAttributes`, `SVGAttributes`, `ARIAAttributes`, and the per-element interfaces (`HTMLAnchorAttributes`, …) — base/element attribute interfaces
- `@b9g/jsx-web-types/camel-case` → `CamelCaseIntrinsicElements` — the camelCase-prop-name variant (React/Inferno/…)

## Development

```bash
# Regenerate the types from their sources (scrapers + generator)
bun run build

# Typecheck the package and the type-level tests
bun run test
```

## License

MIT