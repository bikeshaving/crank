---
title: "@b9g/crank/standalone"
publish: true
---

# @b9g/crank/standalone

Single-import module that re-exports everything from the core `@b9g/crank` module, the JSX template tag functions, and both renderers.

## Installation

```bash
npm install @b9g/crank
```

```ts
import {jsx, renderer} from "@b9g/crank/standalone";
```

## Exports

- [jsx](/api/standalone/functions/jsx) - Template tag for JSX-like syntax
- [html](/api/standalone/functions/html) - Alias for jsx
- `renderer` / `domRenderer` - DOM renderer (from `@b9g/crank/dom`)
- `htmlRenderer` - HTML renderer (from `@b9g/crank/html`)
- All core exports from `@b9g/crank` (Fragment, Portal, Copy, Raw, Text, createElement, etc.)

## Quick start

```tsx
import {jsx, renderer} from "@b9g/crank/standalone";

function Greeting({name}) {
  return jsx`<p>Hello, ${name}!</p>`;
}

renderer.render(
  jsx`<${Greeting} name="World" />`,
  document.getElementById("root")
);
```

## Why use standalone?

The standalone module lets you write Crank components without:
- A build step (Babel, TypeScript JSX transform, etc.)
- Special IDE/editor configuration
- Complex tooling setup

It's great for:
- Quick prototypes
- Learning Crank
- Environments where you can't use a build tool
- Server-side scripts

For production applications with many components, using a proper JSX transform is recommended for better developer experience and tooling support.
