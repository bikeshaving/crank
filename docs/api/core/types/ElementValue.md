---
title: ElementValue
module: "@b9g/crank"
type: type
publish: true
---

# ElementValue

A type representing all possible rendered values of an element.

## Syntax

```ts
type ElementValue<TNode> = Array<TNode> | TNode | undefined;
```

## Type parameters

- **TNode** - The type of node produced by the renderer (e.g., DOM `Node`)

## Description

`ElementValue` represents what an element actually renders to in the target environment. The type varies based on the element's tag:

| Element type | ElementValue |
|--------------|--------------|
| Host element (`<div>`) | Single `TNode` |
| Text node | Single `TNode` |
| Fragment | `Array<TNode>` or single `TNode` |
| Component | `Array<TNode>`, single `TNode`, or `undefined` |
| Portal | `undefined` (opaque to parent) |
| Empty render | `undefined` |

## Examples

### Accessing rendered values

```tsx
import {renderer} from "@b9g/crank/dom";
import type {ElementValue} from "@b9g/crank";

function App() {
  return <div id="app">Hello</div>;
}

const result: ElementValue<Node> = renderer.render(<App />, container);

// result could be a Node, array of Nodes, or undefined
if (result instanceof Node) {
  console.log("Single node:", result);
} else if (Array.isArray(result)) {
  console.log("Multiple nodes:", result.length);
} else {
  console.log("Nothing rendered");
}
```

### Using ref callbacks

```tsx
import type {ElementValue} from "@b9g/crank";

function Form() {
  let inputRef: ElementValue<Node>;

  return (
    <form>
      <input ref={(el) => { inputRef = el; }} />
      <button onclick={() => {
        if (inputRef instanceof HTMLInputElement) {
          inputRef.focus();
        }
      }}>
        Focus
      </button>
    </form>
  );
}
```

### In custom renderers

```tsx
import type {ElementValue, RenderAdapter} from "@b9g/crank";

interface MyNode {
  id: string;
  type: string;
}

const adapter: Partial<RenderAdapter<MyNode, void>> = {
  // The read method transforms internal values to public API
  read(value: ElementValue<MyNode>): MyNode | MyNode[] | null {
    if (value === undefined) {
      return null;
    }
    return value;
  },
};
```

## See also

- [Renderer](/api/core/classes/Renderer)
- [RenderAdapter](/api/core/interfaces/RenderAdapter)
- [Context](/api/core/classes/Context)
