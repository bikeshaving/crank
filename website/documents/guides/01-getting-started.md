---
title: Getting Started
---

## Try Crank

The fastest way to try Crank is via the [online playground](/playground).
Additionally, many of the code examples in these guides are editable and
runnable.

## Installation
The Crank package is available on [NPM](https://npmjs.org/@b9g/crank) through
the [@b9g organization](https://www.npmjs.com/org/b9g) (short for
b*ikeshavin*g).

```shell
$ npm install @b9g/crank
```

### Hello world with the **classic** JSX transform.

```jsx
/** @jsx createElement */
import {createElement} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";
renderer.render(<div id="hello">Hello world</div>, document.body);
```

### Hello world with the **automatic** JSX transform.

```jsx
/** @jsxImportSource @b9g/crank */
import {renderer} from "@b9g/crank/dom";
renderer.render(<div id="hello">Hello world</div>, document.body);
```

If you do not wish to use pragmas (`/** @jsx createElement */`, `/** @jsxImportSource @b9g/crank */`), you will likely have to configure your tools to support it. See below for common tools and configurations.

### Hello world with the JSX template tag (added in `0.5.0`).

```js
import {jsx} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/dom";
renderer.render(jsx`<div id="hello">Hello world</div>`, document.body);
```

### ECMAScript Module CDNs
Crank is also available on CDNs like [unpkg](https://unpkg.com)
(https://unpkg.com/@b9g/crank?module) and [esm.sh](https://esm.sh)
(https://esm.sh/@b9g/crank) for usage in ESM-ready environments.

```jsx live
/** @jsx createElement */

// This is an ESM-ready environment!
// If code previews work, your browser is an ESM-ready environment!

import {createElement} from "https://unpkg.com/@b9g/crank/crank?module";
import {renderer} from "https://unpkg.com/@b9g/crank/dom?module";

renderer.render(<div id="hello">Hello world</div>, document.body);
```

## Common tools and configurations
The following is an incomplete list of tool configurations to get started with Crank.

### [TypeScript](https://www.typescriptlang.org)

Here’s the configuration you will need to set up automatic JSX transpilation.

```tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx"
    "jsxImportSource": "@b9g/crank"
  }
}
```

The classic transform is supported as well.

```tsconfig.json
{
  "compilerOptions": {
    "target": "esnext",
  }
}
```

Crank is written in TypeScript. Additional information about how to type components and use Crank types are provided in the [working with TypeScript guide](/guides/working-with-typescript).

### Babel
```babelrc.json
```

### ESBuild
```
```

### Vite
```
```

### ESLint
```
```

### Astro.build
```
```
