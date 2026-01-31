---
title: adapter
module: "@b9g/crank/dom"
type: object
publish: true
---

# adapter

The DOM render adapter implementing the RenderAdapter interface for browser environments.

## Syntax

```ts
const adapter: Partial<RenderAdapter<Node, string, Node>>
```

## Description

The `adapter` object contains the implementation details for how Crank elements are converted to DOM nodes. It implements the [RenderAdapter](/api/core/interfaces/RenderAdapter) interface with DOM-specific behavior.

This is primarily an internal implementation detail, but it's exported for:
- Building custom renderers that extend DOM rendering
- Understanding how DOM rendering works
- Advanced customization scenarios

## Implemented methods

### scope()

Handles XML namespace propagation for SVG and MathML elements.

```ts
scope({scope: xmlns, tag, props}): string | undefined
```

- Returns `"http://www.w3.org/2000/svg"` for `<svg>` elements
- Returns `"http://www.w3.org/1998/Math/MathML"` for `<math>` elements
- Inherits namespace from props or parent scope

### create()

Creates DOM elements with proper namespace handling.

```ts
create({tag, tagName, scope: xmlns, root}): Node
```

### adopt()

Adopts existing DOM nodes during hydration.

```ts
adopt({tag, tagName, node, root}): Array<Node> | undefined
```

Returns child nodes if the node matches, or undefined for hydration mismatch.

### patch()

Updates DOM element attributes and properties.

```ts
patch({tagName, node, props, oldProps, scope: xmlns, ...}): void
```

Handles:
- Style props (string or object)
- Class/className props (string or object)
- Event handlers (onClick → onclick)
- Boolean attributes
- Custom attributes with `attr:` prefix
- Properties with `prop:` prefix
- innerHTML prop

### arrange()

Arranges child nodes within their parent.

```ts
arrange({tag, node, props, children}): void
```

Efficiently moves, inserts, and removes nodes to match the children array.

### remove()

Removes a node from its parent.

```ts
remove({node, parentNode, isNested}): void
```

### text()

Creates or updates text nodes.

```ts
text({value, oldNode, hydrationNodes, root}): Node
```

### raw()

Handles Raw element values.

```ts
raw({value, scope: xmlns, hydrationNodes, root}): ElementValue<Node>
```

Parses HTML strings or returns node arrays directly.

## Examples

### Understanding prop handling

```tsx
// These all work thanks to the adapter's patch() method:

// String class
<div class="container" />

// Object class (conditional classes)
<div class={{"active": isActive, "disabled": isDisabled}} />

// Style string
<div style="color: red; font-size: 16px;" />

// Style object
<div style={{color: "red", fontSize: "16px"}} />

// Event handlers (React-style naming works)
<button onClick={handleClick} />

// Boolean attributes
<input disabled={true} />
<input disabled />

// Force attribute vs property
<input attr:value="forced attribute" />
<input prop:value="forced property" />
```

### Custom renderer extending DOM

```tsx
import {Renderer} from "@b9g/crank";
import {adapter as domAdapter} from "@b9g/crank/dom";

const customAdapter = {
  ...domAdapter,
  patch(data) {
    // Custom patching logic
    console.log("Patching:", data.tagName);
    domAdapter.patch?.(data);
  },
};

class CustomDOMRenderer extends Renderer<Node, string, Element> {
  constructor() {
    super(customAdapter);
  }
}
```

## See also

- [DOMRenderer](/api/dom/classes/DOMRenderer)
- [RenderAdapter](/api/core/interfaces/RenderAdapter)
- [renderer](/api/dom/objects/renderer)
