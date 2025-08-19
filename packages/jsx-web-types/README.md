# jsx-web-types

Comprehensive TypeScript types for JSX web platform elements (HTML, SVG, MathML).

## Features

- ✅ **Complete coverage**: 223+ elements across HTML, SVG, and MathML
- ✅ **Smart unions**: Properties like `width` accept both `number` and `string`
- ✅ **Void element safety**: Prevents children on void elements like `<img>`, `<br>`
- ✅ **ARIA support**: Full ARIA attribute typing with proper constraints
- ✅ **Framework agnostic**: Works with React, Preact, Solid, Crank, etc.
- ✅ **Specification-driven**: Generated from MDN data + TypeScript DOM types

## Installation

```bash
npm install @crank/jsx-web-types
# or
bun add @crank/jsx-web-types
```

## Usage

### Basic Integration

```typescript
import type { AllElementsPropsMap } from '@crank/jsx-web-types';

declare global {
  namespace JSX {
    interface IntrinsicElements extends AllElementsPropsMap {}
  }
}
```

### Advanced Usage

```typescript
import type { 
  HTMLElementsMap,
  SVGElementsMap,
  CreateElementProps,
  HTMLAttributes,
  DOMEventMap 
} from '@crank/jsx-web-types';

// Use specific namespace
declare global {
  namespace JSX {
    interface IntrinsicElements extends HTMLElementsMap {}
  }
}

// Create custom element types
interface MyCustomAttributes {
  'data-custom': string;
}

interface MyCustomProperties {
  customProp: boolean;
}

type MyElement = CreateElementProps<MyCustomAttributes, MyCustomProperties>;
```

## Type Safety Examples

### Void Elements
```typescript
// ✅ Valid - no children
<img src="photo.jpg" width={100} />

// ❌ Type error - void elements cannot have children
<img src="photo.jpg">Content not allowed</img>
```

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

- `AllElementsPropsMap` - All elements (HTML + SVG + MathML)
- `HTMLElementsMap` - HTML elements only
- `SVGElementsMap` - SVG elements only  
- `MathMLElementsMap` - MathML elements only
- `CreateElementProps` - Utility for custom elements
- `DOMEventMap` - Comprehensive event type map
- `HTMLAttributes`, `SVGAttributes`, `ARIAAttributes` - Base attribute interfaces

## Framework Examples

### React/Preact
```typescript
import type { AllElementsPropsMap } from '@crank/jsx-web-types';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends AllElementsPropsMap {}
  }
}
```

### Solid.js
```typescript
import type { AllElementsPropsMap } from '@crank/jsx-web-types';

declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements extends AllElementsPropsMap {}
  }
}
```

## Development

```bash
# Generate types from latest web standards
bun run generate

# Build package
bun run build

# Test types
bun run test
```

## License

MIT