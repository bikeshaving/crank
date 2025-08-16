<div align="center">

<img src="logo.svg" alt="Crank.js Logo" width="200" height="200" />

# Crank.js

The Just JavaScript Framework

</div>

## Try Crank

The fastest way to try Crank is via the [online playground](https://crank.js.org/playground). In addition, many of the code examples in these guides feature live previews.

## Why Crank?
**Finally, a framework that feels like JavaScript.**

While other frameworks invent new paradigms and force you to learn
framework-specific APIs, Crank embraces the language features you already know.
No hooks to memorize, no dependency arrays to debug, no cache invalidation to
manage.

## Pure JavaScript, No Compromises

```javascript
// Async components just work
async function UserProfile({userId}) {
  const user = await fetchUser(userId);
  return <div>Hello, {user.name}!</div>;
}

// Lifecycle logic with generators feels natural
function* Timer() {
  let seconds = 0;
  const interval = setInterval(() => this.refresh(() => seconds++), 1000);
  for ({} of this) {
    yield <div>Seconds: {seconds}</div>;
  }
  clearInterval(interval); // Cleanup just works
}
```

## Why Developers Choose Crank

- **🎯 Intuitive**: Use `async`/`await` for loading states and `function*` for lifecycle—no new APIs to learn
- **⚡ Fast**: Outperforms React in benchmarks while weighing just 5KB with zero dependencies
- **🔧 Flexible**: Write components in vanilla JavaScript with template literals, or use JSX
- **🧹 Clean**: State lives in function scope, lifecycle code goes where it belongs, no mysterious re-render bugs
- **🌊 Future-proof**: Built on stable JavaScript features, not evolving framework abstractions

## The "Just JavaScript" Promise, Delivered

Other frameworks claim to be "just JavaScript" but ask you to think in terms of
effects, dependencies, and framework-specific patterns. Crank actually delivers
on that promise—your components are literally just functions that use standard
JavaScript control flow.

Ready to write components that feel like the JavaScript you know and love?

## Installation

The Crank package is available on [NPM](https://npmjs.org/@b9g/crank) through
the [@b9g organization](https://www.npmjs.com/org/b9g) (short for
b*ikeshavin*g).

```shell
npm i @b9g/crank
```

### Importing Crank with the **automatic** JSX transform.

```jsx live
/** @jsxImportSource @b9g/crank */
import {renderer} from "@b9g/crank/dom";

renderer.render(
  <p>This paragraph element is transpiled with the automatic transform.</p>,
  document.body,
);
```

### Importing Crank with the **classic** JSX transform.

```jsx live
/** @jsx createElement */
/** @jsxFrag Fragment */
import {createElement, Fragment} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";

renderer.render(
  <p>This paragraph element is transpiled with the classic transform.</p>,
  document.body,
);
```

You will likely have to configure your tools to support JSX, especially if you
do not want to use `@jsx` comment pragmas. See below for common tools and
configurations.

### Importing the JSX template tag.

Starting in version `0.5`, the Crank package ships a [tagged template
function](/guides/jsx-template-tag) which provides similar syntax and semantics
as the JSX transform. This allows you to write Crank components in vanilla
JavaScript.

```js live
import {jsx} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/dom";

renderer.render(jsx`
  <p>No transpilation is necessary with the JSX template tag.</p>
`, document.body);
```

### ECMAScript Module CDNs
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
function *Timer(this: Context) {
  let seconds = 0;
  const interval = setInterval(() => this.refresh(() => seconds++), 1000);
  for ({} of this) {
    yield <div>Seconds: {seconds}</div>;
  }

  clearInterval(interval);
}
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
  return (
    <div style="padding: 20px; text-align: center; background: #f8f9fa; border: 2px dashed #6c757d; border-radius: 8px; color: #6c757d;">
      🐕 Fetching a good boy...
    </div>
  );
}

async function RandomDog({throttle = false}) {
  const res = await fetch("https://dog.ceo/api/breeds/image/random");
  const data = await res.json();
  if (throttle) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return (
    <div style="text-align: center; padding: 10px; background: #fff; border: 1px solid #dee2e6; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <a href={data.message} target="_blank" style="text-decoration: none; color: inherit;">
        <img
          src={data.message}
          alt="A Random Dog"
          width="300"
          style="border-radius: 8px; display: block; margin: 0 auto;"
        />
        <div style="margin-top: 8px; color: #6c757d; font-size: 14px;">
          Click to view full size
        </div>
      </a>
    </div>
  );
}

async function *RandomDogLoader({throttle}) {
  // for await can be used to race component trees
  for await ({throttle} of this) {
    yield <LoadingIndicator />;
    yield <RandomDog throttle={throttle} />;
  }
}

function *RandomDogApp() {
  let throttle = false;
  this.addEventListener("click", (ev) => {
    if (ev.target.tagName === "BUTTON") {
      this.refresh(() => throttle = !throttle);
    }
  });

  for ({} of this) {
    yield (
      <div style="max-width: 400px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <RandomDogLoader throttle={throttle} />
        <div style="text-align: center; margin-top: 20px;">
          <button style="padding: 12px 24px; font-size: 16px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer;">
            Show me another dog!
          </button>
          <div style="margin-top: 10px; font-size: 14px; color: #6c757d;">
            {throttle ? "🐌 Slow mode enabled" : "⚡ Fast mode"}
          </div>
        </div>
      </div>
    );
  }
}

renderer.render(<RandomDogApp />, document.body);
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

Crank is written in TypeScript. Refer to [the guide on
TypeScript](https://crank.js.org/guides/working-with-typescript) for more
information about Crank types.

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
