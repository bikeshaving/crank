---
title: Getting Started
---

<!-- Try to use absolute links so this can be copied to the package README. -->

## Try Crank

The fastest way to try Crank is via the [online playground](https://crank.js.org/playground). In addition, many of the code examples in these guides feature live previews.

## Installation

The Crank package is available on [NPM](https://npmjs.org/@b9g/crank) through
the [@b9g organization](https://www.npmjs.com/org/b9g) (short for
b*ikeshavin*g).

```shell
$ npm i @b9g/crank
```

### Importing Crank with the **classic** JSX transform.
```jsx
/** @jsx createElement */
/** @jsxFrag Fragment */
import {createElement, Fragment} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";

renderer.render(<div id="hello">Hello world</div>, document.body);
```

### Importing Crank with the **automatic** JSX transform.
```jsx
/** @jsxImportSource @b9g/crank */
import {renderer} from "@b9g/crank/dom";

renderer.render(<div id="hello">Hello world</div>, document.body);
```

If you do not wish to use the `@jsx` comment pragmas, you will likely have to configure your tools to support JSX. See below for common tools and configurations.

### Importing the JSX template tag.

Starting in version `0.5`, the Crank package ships a [tagged template function](/guides/jsx-template-tag) which parses the template tag with similar syntax and semantics as the JSX transform. This allows you to write Crank components in vanilla JavaScript.

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
    "jsx": "react-jsx",
    "jsxImportSource": "@b9g/crank"
  }
}
```

The classic transform is supported as well.

```tsconfig.json
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "createElement",
    "jsxFragmentFactory": "Fragment"
  }
}
```

```tsx
import type {Context} from "@b9g/crank";
function *Timer(this: Context) {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);
  for ({} of this) {
    yield <div>Seconds: {seconds}</div>;
  }

  clearInterval(interval);
}
```

Crank is written in TypeScript. Refer to [the guide on TypeScript](/guides/working-with-typescript) for more information about Crank types.

### [Babel](https://babeljs.io)

Babel is a popular open-source JavaScript compiler which allows you to write code with modern syntax (including JSX) and run it in environments which do not support the syntax.

Here is how to get Babel to transpile JSX for Crank.

Automatic transform:
```.babelrc.json
{
  "plugins": [
    "@babel/plugin-syntax-jsx",
    [
      "@babel/plugin-transform-react-jsx",
      {
        "runtime": "automatic",
        "importSource": "@b9g/crank",

        "throwIfNamespace": false,
        "useSpread": true
      }
    ]
  ]
}
```

Classic transform:
```.babelrc.json
{
  "plugins": [
    "@babel/plugin-syntax-jsx",
    [
      "@babel/plugin-transform-react-jsx",
      {
        "runtime": "class",
        "pragma": "createElement",
        "pragmaFrag": "''",
        "throwIfNamespace": false,
        "useSpread": true
      }
    ]
  ]
}
```

### ESLint
ESLint is a popular open-source tool for analyzing and detecting problems in JavaScript code.

Crank provides a configuration preset for working with ESLint under the package name `eslint-plugin-crank`.

```bash
npm i eslint eslint-plugin-crank
```

In your eslint configuration:

```.eslintrc.json
{
  "extends": ["plugin:crank/recommended"]
}
```

### [Astro](https://astro.build)

Astro.js is a modern static site builder and framework.

Crank provides an [Astro integration](https://docs.astro.build/en/guides/integrations-guide/) to enable server-side rendering and client-side hydration with Astro.

```bash
npm i astro-crank
```

In your `astro.config.mjs`.

```astro.config.mjs
import {defineConfig} from "astro/config";
import crank from "astro-crank";

// https://astro.build/config
export default defineConfig({
  integrations: [crank()],
});
```

## Shovel

A full-stack framework is in the works for Crank. Stay tuned.
