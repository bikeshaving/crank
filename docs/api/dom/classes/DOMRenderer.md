---
title: DOMRenderer
module: "@b9g/crank/dom"
type: class
publish: true
---

# DOMRenderer

A renderer for browser DOM environments.

## Syntax

```tsx
import {renderer} from "@b9g/crank/dom";

renderer.render(<App />, document.getElementById("root"));
renderer.hydrate(<App />, document.getElementById("root"));
```

## Constructor

```ts
new DOMRenderer()
```

Creates a new DOMRenderer instance. In most cases, you should use the pre-instantiated [renderer](/api/dom/objects/renderer) export instead.

## Instance methods

### render()

```ts
render(children, root, ctx?): Promise<ElementValue<Node>> | ElementValue<Node>
```

Renders an element tree into a DOM element.

**Parameters:**
- **children** - `Children` - The element tree to render. Pass `null` to unmount.
- **root** - `Element` - The DOM element to render into.
- **ctx** (optional) - `Context` - An ancestor context for bridging renderers.

**Returns:** The rendered DOM nodes, or a promise if the tree is async.

**Throws:** `TypeError` if root is not a DOM element node.

### hydrate()

```ts
hydrate(children, root, ctx?): Promise<ElementValue<Node>> | ElementValue<Node>
```

Hydrates server-rendered HTML by attaching event handlers and reconciling state.

**Parameters:**
- **children** - `Children` - The element tree matching the server-rendered HTML.
- **root** - `Element` - The DOM element containing server-rendered content.
- **ctx** (optional) - `Context` - An ancestor context for bridging renderers.

**Returns:** The hydrated DOM nodes, or a promise if the tree is async.

**Throws:** `TypeError` if root is not a DOM element node.

## Description

DOMRenderer is the standard renderer for browser applications. It extends the base [Renderer](/api/core/classes/Renderer) class with DOM-specific behavior:

- Creates DOM elements from string tags
- Handles SVG and MathML namespaces automatically
- Maps props to DOM attributes and properties
- Manages event listeners
- Supports hydration of server-rendered HTML

The renderer validates that the root is a DOM element node and will throw a `TypeError` if the root is not an element node. It will also log a warning if you render into the document, body, head, or documentElement directly.

## Examples

### Basic rendering

```tsx
import {DOMRenderer} from "@b9g/crank/dom";

const renderer = new DOMRenderer();

function App() {
  return <div>Hello, World!</div>;
}

renderer.render(<App />, document.getElementById("root"));
```

### Using the pre-instantiated renderer

```tsx
import {renderer} from "@b9g/crank/dom";

function App() {
  return <div>Hello, World!</div>;
}

// Simpler - no need to instantiate
renderer.render(<App />, document.getElementById("root"));
```

### Updating and unmounting

```tsx
import {renderer} from "@b9g/crank/dom";

const root = document.getElementById("root");

// Initial render
renderer.render(<App count={0} />, root);

// Update
renderer.render(<App count={1} />, root);

// Unmount
renderer.render(null, root);
```

### Hydration

```tsx
import {renderer} from "@b9g/crank/dom";

// HTML was server-rendered:
// <div id="root"><div class="app">Hello, World!</div></div>

function App() {
  return <div class="app">Hello, World!</div>;
}

// Hydrate attaches event handlers without replacing DOM
renderer.hydrate(<App />, document.getElementById("root"));
```

### Async rendering

```tsx
import {renderer} from "@b9g/crank/dom";

async function AsyncApp() {
  const data = await fetchData();
  return <div>{data.message}</div>;
}

// Returns a promise for async components
const result = await renderer.render(<AsyncApp />, document.getElementById("root"));
```

## See also

- [renderer](/api/dom/objects/renderer)
- [adapter](/api/dom/objects/adapter)
- [Renderer](/api/core/classes/Renderer)
- [HTMLRenderer](/api/html/classes/HTMLRenderer)
