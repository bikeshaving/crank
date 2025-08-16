---
title: Getting Started
---

<!-- Try to use absolute links so this can be copied to the package README. -->

## Try Crank

The fastest way to try Crank is via the [online
playground](https://crank.js.org/playground). No setup required - just start
writing components! Many examples in these guides also feature live previews
you can edit directly.

## Quick Start

### 1. Install Crank

```shell
npm i @b9g/crank
```

### 2. Choose Your Setup

Crank works with any JSX setup. Here are the most common approaches:

**Option A: Automatic JSX Transform** (recommended for new projects)
```jsx
/** @jsxImportSource @b9g/crank */
import {renderer} from "@b9g/crank/dom";

function Greeting({name = "World"}) {
  return <div>Hello {name}!</div>;
}

renderer.render(<Greeting name="Crank" />, document.body);
```

**Option B: Classic JSX Transform** (works with older setups)
```jsx
/** @jsx createElement */
/** @jsxFrag Fragment */
import {createElement, Fragment} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";

function Greeting({name = "World"}) {
  return <div>Hello {name}!</div>;
}

renderer.render(<Greeting name="Crank" />, document.body);
```

**Option C: No Build Required**
```js
import {jsx} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/dom";

function Greeting({name = "World"}) {
  return jsx`<div>Hello ${name}!</div>`;
}

renderer.render(jsx`<${Greeting} name="Crank" />`, document.body);
```

### 3. Configure Your Tools

Most modern tools support JSX out of the box. See the [tool
configurations](#common-tool-configurations) section below for specific setup
instructions.

## Using CDNs
Crank is also available on CDNs like [unpkg](https://unpkg.com)
(https://unpkg.com/@b9g/crank?module) and [esm.sh](https://esm.sh)
(https://esm.sh/@b9g/crank) for usage in ESM-ready environments.

```jsx live
/** @jsx createElement */
import {createElement} from "https://unpkg.com/@b9g/crank/crank?module";
import {renderer} from "https://unpkg.com/@b9g/crank/dom?module";

renderer.render(
  <div id="hello">
    Running on <a href="https://unpkg.com">unpkg.com</a>
  </div>,
  document.body,
);
```

## Common tool configurations
The following is an incomplete list of configurations to get started with Crank.

### [TypeScript](https://www.typescriptlang.org)

TypeScript is a typed superset of JavaScript.

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

Crank is written in TypeScript. Refer to [the guide on TypeScript](/guides/working-with-typescript) for more information about Crank types.

```tsx
import type {Context} from "@b9g/crank";
function *Timer(this: Context) {
  let seconds = 0;
  const interval = setInterval(() => this.refresh(() => seconds++), 1000);
  for ({} of this) {
    yield <div>Seconds: {seconds}</div>;
  }

  clearInterval(interval);
}
```

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

### [ESLint](https://eslint.org)

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

## Key Examples

### A Simple Component

```jsx live
import {renderer} from "@b9g/crank/dom";

function Greeting({name = "World"}) {
  return (
    <div>Hello {name}</div>
  );
}

renderer.render(<Greeting />, document.body);
```

### A Stateful Component

```jsx live
import {renderer} from "@b9g/crank/dom";

function *Timer() {
  let seconds = 0;
  const interval = setInterval(() => this.refresh(() => seconds++), 1000);

  for ({} of this) {
    yield <div>Seconds: {seconds}</div>;
  }

  clearInterval(interval);
}

renderer.render(<Timer />, document.body);
```

### An Async Component

```jsx live
import {renderer} from "@b9g/crank/dom";
async function Definition({word}) {
  // API courtesy https://dictionaryapi.dev
  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
  const data = await res.json();
  if (!Array.isArray(data)) {
    return <p>No definition found for {word}</p>;
  }

  const {phonetic, meanings} = data[0];
  const {partOfSpeech, definitions} = meanings[0];
  const {definition} = definitions[0];
  return <>
    <p>{word} <code>{phonetic}</code></p>
    <p><b>{partOfSpeech}.</b> {definition}</p>
  </>;
}

await renderer.render(<Definition word="framework" />, document.body);
```

### A Loading Component

```jsx live
import {Fragment} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";

async function LoadingIndicator() {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return <div>Fetching a good boy...</div>;
}

async function RandomDog({throttle = false}) {
  const res = await fetch("https://dog.ceo/api/breeds/image/random");
  const data = await res.json();
  if (throttle) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return (
    <a href={data.message}>
      <img src={data.message} alt="A Random Dog" width="300" />
    </a>
  );
}

async function *RandomDogLoader({throttle}) {
  for await ({throttle} of this) {
    yield <LoadingIndicator />;
    yield <RandomDog throttle={throttle} />;
  }
}

function *RandomDogApp() {
  let throttle = false;
  const onclick = () => this.refresh(() => throttle = !throttle);

  for ({} of this) {
    yield (
      <Fragment>
        <RandomDogLoader throttle={throttle} />
        <p>
          <button onclick={onclick}>Show me another dog.</button>
        </p>
      </Fragment>
    );
  }
}

renderer.render(<RandomDogApp />, document.body);
```

## What's New in Crank 0.7

Crank 0.7 is a major release that introduces powerful new features while
maintaining full backward compatibility. Here are the highlights:

### Foolproof State Updates
The `refresh()` method now accepts a callback function, making it impossible to
forget to re-render after updating state:

```jsx
// Before: Easy to forget refresh()
const onclick = () => {
  count++;
  this.refresh(); // Oops, might forget this!
};

// Now: Impossible to forget
const onclick = () => this.refresh(() => count++);
```

This pattern is especially useful in event handlers and timer callbacks.

### Advanced Async Patterns
The new `async` module provides React-like APIs with Crank's unique async
capabilities:

```jsx
import {lazy, Suspense} from "@b9g/crank/async";

const LazyComponent = lazy(() => import("./component.js"));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  );
}
```

### TypeScript Improvements
New helper types like `ComponentProps<T>` make it easier to work with component
types:

```tsx
import {ComponentProps} from "@b9g/crank";

function Button({variant}: {variant: "primary" | "secondary"}) {
  return <button class={`btn-${variant}`}>Click me</button>;
}

// Extract Button's props type automatically
type ButtonProps = ComponentProps<typeof Button>;
```

These features maintain full backward compatibility while providing modern
development patterns for building scalable applications.
