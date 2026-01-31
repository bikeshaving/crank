---
title: "@b9g/crank/html"
publish: true
---

# @b9g/crank/html

Renderer for generating HTML strings, typically used for server-side rendering.

## Installation

```bash
npm install @b9g/crank
```

```ts
import {renderer} from "@b9g/crank/html";
// or
import {HTMLRenderer, impl} from "@b9g/crank/html";
```

## Classes

- [HTMLRenderer](/api/html/classes/HTMLRenderer) - The HTML string renderer class

## Objects

- [impl](/api/html/objects/impl) - The HTML render adapter implementation
- [renderer](/api/html/objects/renderer) - Pre-instantiated HTMLRenderer instance

## Quick start

```tsx
import {renderer} from "@b9g/crank/html";

function App() {
  return <div>Hello, World!</div>;
}

const html = await renderer.render(<App />);
console.log(html); // "<div>Hello, World!</div>"
```
