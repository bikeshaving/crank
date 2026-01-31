---
title: renderer
module: "@b9g/crank/dom"
type: object
publish: true
---

# renderer

A pre-instantiated DOMRenderer for convenient browser rendering.

## Syntax

```ts
const renderer: DOMRenderer
```

## Description

The `renderer` export is a pre-created instance of [DOMRenderer](/api/dom/classes/DOMRenderer). For most applications, this is all you need - there's no reason to create your own DOMRenderer instance.

## Examples

### Basic usage

```tsx
import {renderer} from "@b9g/crank/dom";

function App() {
  return <h1>Hello, World!</h1>;
}

renderer.render(<App />, document.getElementById("root"));
```

### Complete application

```tsx
import {renderer} from "@b9g/crank/dom";

function* Counter() {
  let count = 0;

  for (const props of this) {
    yield (
      <div>
        <p>Count: {count}</p>
        <button onclick={() => { count++; this.refresh(); }}>
          Increment
        </button>
      </div>
    );
  }
}

renderer.render(<Counter />, document.getElementById("root"));
```

### With hydration

```tsx
import {renderer} from "@b9g/crank/dom";

function App() {
  return <div class="app">Server-rendered content</div>;
}

// For server-rendered HTML, use hydrate instead of render
renderer.hydrate(<App />, document.getElementById("root"));
```

### Updating the render

```tsx
import {renderer} from "@b9g/crank/dom";

function App({name}) {
  return <div>Hello, {name}!</div>;
}

const root = document.getElementById("root");

// Subsequent render calls update the existing tree
renderer.render(<App name="World" />, root);
renderer.render(<App name="Crank" />, root);
```

### Unmounting

```tsx
import {renderer} from "@b9g/crank/dom";

// Remove all rendered content
renderer.render(null, document.getElementById("root"));
```

## See also

- [DOMRenderer](/api/dom/classes/DOMRenderer)
- [adapter](/api/dom/objects/adapter)
