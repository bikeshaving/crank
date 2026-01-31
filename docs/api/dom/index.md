---
title: "@b9g/crank/dom"
publish: true
---

# @b9g/crank/dom

Renderer for browser DOM environments.

## Installation

```bash
npm install @b9g/crank
```

```ts
import {renderer} from "@b9g/crank/dom";
// or
import {DOMRenderer, adapter} from "@b9g/crank/dom";
```

## Classes

- [DOMRenderer](/api/dom/classes/DOMRenderer) - The DOM renderer class

## Objects

- [adapter](/api/dom/objects/adapter) - The DOM render adapter
- [renderer](/api/dom/objects/renderer) - Pre-instantiated DOMRenderer instance

## Quick start

```tsx
import {renderer} from "@b9g/crank/dom";

function App() {
  return <div>Hello, World!</div>;
}

renderer.render(<App />, document.getElementById("root"));
```
