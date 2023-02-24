---
title: Getting Started
---

## Try Crank
The fastest way to try Crank is via the [playground](/playground). Additionally, many of the code examples in these guides are editable and runnable.

## Installation
```shell
$ npm install @b9g/crank
```

The Crank package is available on [NPM](https://npmjs.org/@b9g/crank) through the [@b9g organization](https://www.npmjs.com/org/b9g) (short for b*ikeshavin*g).

```jsx
/** @jsx createElement */
import {createElement} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";
renderer.render(<div id="hello">Hello world</div>, document.body);
```

It is also available on CDNs like [unpkg](https://unpkg.com) (https://unpkg.com/@b9g/crank?module) and [esm.sh](https://esm.sh) (https://esm.sh/@b9g/crank) for usage in ESM-ready environments.

```jsx live
/** @jsx createElement */

// This is an ESM-ready environment!
import {createElement} from "https://unpkg.com/@b9g/crank/crank?module";
import {renderer} from "https://unpkg.com/@b9g/crank/dom?module";

renderer.render(<div id="hello">Hello world</div>, document.body);
```

## Transpiling JSX
Crank works with [JSX](https://facebook.github.io/jsx/), a well-supported, XML-like syntax extension to JavaScript. The hardest part about setting up a Crank project will probably be configuring your favorite web tools to transpile JSX in a way Crank understands; luckily, this section will walk you through the latest in JSX transforms and configurations.

### Two types of JSX transpilation
Historically speaking, there are two ways to transform JSX: the *classic* and *automatic* transforms. Crank supports both formats.

The classic transform turns JSX elements into `createElement()` calls.

```jsx
/** @jsx createElement */
import {createElement} from "@b9g/crank";

const el = <div id="element">An element</div>;
// Transpiles to:

const el = createElement("div", {id: "element"}, "An element");
// Identifiers like `createElement`, `Fragment` must be manually imported.
```

The automatic transform turns JSX elements into function calls from an automatically imported namespace.

```jsx
/** @jsxImportSource @b9g/crank */

const profile = (
  <div>
    <img src="avatar.png" class="profile" />
    <h3>{[user.firstName, user.lastName].join(" ")}</h3>
  </div>
);

// Transpiles to:
import { jsx as _jsx } from "@b9g/crank/jsx-runtime";
import { jsxs as _jsxs } from "@b9g/crank/jsx-runtime";

const profile = _jsxs("div", {
  children: [
    _jsx("img", {
      src: "avatar.png",
      "class": "profile",
    }),
    _jsx("h3", {
      children: [user.firstName, user.lastName].join(" "),
    }),
  ],
});

```

The automatic transform has the benefit of not requiring manual imports.

## Common tools and configurations
The following is an incomplete list of tool configurations to get started with JSX.

#### [TypeScript](https://www.typescriptlang.org)

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
    TKTKTKTKTKTK
  }
}
```

Crank is written in TypeScript. Additional information about how to type components and use Crank types are provided in the [working with TypeScript guide](/guides/working-with-typescript).

#### Babel
```babelrc.json
```
You can install the “babel-preset-crank” package to set this up automatically.

#### ESBuild
```
```

#### Vite
```
```

#### ESLint
```
```

Crank provides 

#### Astro.build
```
```

## Avoiding JSX transpilation
```jsx
import {renderer} from "@b9g/crank/dom";
```

If you do not want to use JSX, you can use the JavaScript friendly tagged template function instead.

