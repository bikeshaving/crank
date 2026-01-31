---
title: Renderer
module: "@b9g/crank"
type: class
publish: true
---

# Renderer

The base class for creating renderers that convert Crank elements into target-specific output.

## Syntax

```ts
class Renderer<
  TNode extends object,
  TScope,
  TRoot extends TNode | undefined = TNode,
  TResult = ElementValue<TNode>
> {
  constructor(adapter: Partial<RenderAdapter<TNode, TScope, TRoot, TResult>>);

  render(
    children: Children,
    root?: TRoot,
    bridge?: Context
  ): Promise<TResult> | TResult;

  hydrate(
    children: Children,
    root: TRoot,
    bridge?: Context
  ): Promise<TResult> | TResult;
}
```

## Type parameters

- **TNode** - The type of nodes in your rendering environment (e.g., DOM `Node`)
- **TScope** - Data passed down the component tree (e.g., XML namespace)
- **TRoot** - The type of the root container (defaults to `TNode`)
- **TResult** - The type returned from render (defaults to `ElementValue<TNode>`)

## Constructor

```ts
new Renderer(adapter)
```

### Parameters

- **adapter** - `Partial<RenderAdapter<TNode, TScope, TRoot, TResult>>` - An object implementing the render adapter interface.

## Instance methods

### render()

```ts
render(children, root?, bridge?): Promise<TResult> | TResult
```

Renders an element tree into a root container.

**Parameters:**
- **children** - `Children` - The element tree to render. Pass `null` to unmount.
- **root** (optional) - `TRoot` - The root container to render into. The renderer caches renders per root.
- **bridge** (optional) - `Context` - An ancestor context for connecting different renderers.

**Returns:** The rendered result, or a promise if the tree renders asynchronously.

### hydrate()

```ts
hydrate(children, root, bridge?): Promise<TResult> | TResult
```

Hydrates server-rendered content by attaching event handlers and reconciling with existing nodes.

**Parameters:**
- **children** - `Children` - The element tree that matches the server-rendered HTML
- **root** - `TRoot` - The container with existing server-rendered content
- **bridge** (optional) - `Context` - An ancestor context for connecting different renderers

**Returns:** The hydrated result, or a promise if hydration is asynchronous.

## Description

Renderer is an abstract class that must be subclassed with a custom [RenderAdapter](/api/core/interfaces/RenderAdapter) to target specific rendering environments. Crank provides two built-in renderers:

- [DOMRenderer](/api/dom/classes/DOMRenderer) for browser environments
- [HTMLRenderer](/api/html/classes/HTMLRenderer) for server-side string rendering

The renderer maintains a cache of element trees per root, enabling efficient updates when re-rendering.

## Examples

### Using built-in renderers

```tsx
import {renderer} from "@b9g/crank/dom";

function App() {
  return <div>Hello, World!</div>;
}

// Render to DOM
renderer.render(<App />, document.getElementById("root"));

// Update
renderer.render(<App name="Updated" />, document.getElementById("root"));

// Unmount
renderer.render(null, document.getElementById("root"));
```

### Server-side rendering

```tsx
import {renderer} from "@b9g/crank/html";

function App() {
  return <div>Hello, World!</div>;
}

const html = await renderer.render(<App />);
console.log(html); // "<div>Hello, World!</div>"
```

### Creating a custom renderer

```tsx
import {Renderer} from "@b9g/crank";
import type {RenderAdapter} from "@b9g/crank";

interface CanvasNode {
  type: string;
  props: Record<string, any>;
  children: CanvasNode[];
}

const canvasAdapter: RenderAdapter<CanvasNode, void> = {
  create({tag, props}) {
    return {type: tag as string, props, children: []};
  },
  patch({node, props}) {
    Object.assign(node.props, props);
  },
  arrange({node, children}) {
    node.children = children;
  },
  text({value}) {
    return {type: "text", props: {value}, children: []};
  },
  // ... implement other methods
};

class CanvasRenderer extends Renderer<CanvasNode, void> {
  constructor() {
    super(canvasAdapter);
  }
}
```

### Bridging renderers

```tsx
import {renderer as domRenderer} from "@b9g/crank/dom";
import {renderer as htmlRenderer} from "@b9g/crank/html";

function* App() {
  // This component's context can be passed to other renderers
  for (const props of this) {
    yield <div>...</div>;
  }
}

// The bridge parameter connects event propagation and context
const bridge = /* get context from a component */;
htmlRenderer.render(<ChildApp />, undefined, bridge);
```

## See also

- [RenderAdapter](/api/core/interfaces/RenderAdapter)
- [DOMRenderer](/api/dom/classes/DOMRenderer)
- [HTMLRenderer](/api/html/classes/HTMLRenderer)
- [Custom Renderers Guide](/guides/custom-renderers)
