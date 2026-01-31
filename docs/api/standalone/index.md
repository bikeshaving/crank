---
title: "@b9g/crank/standalone"
publish: true
---

# @b9g/crank/standalone

Template tag functions for writing JSX-like syntax without a build step.

## Installation

```bash
npm install @b9g/crank
```

```ts
import {jsx, html} from "@b9g/crank/standalone";
```

## Functions

- [jsx](/api/standalone/functions/jsx) - Template tag for JSX-like syntax
- [html](/api/standalone/functions/html) - Alias for jsx

## Quick start

```tsx
import {jsx} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/dom";

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
