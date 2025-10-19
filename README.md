<div align="center">
<img src="logo.svg" alt="Crank.js Logo" width="200" height="200" />

# Crank.js
The Just JavaScript Framework
</div>

## Get Started

The fastest way to try Crank is via the [online playground](https://crank.js.org/playground).

Other links:
- [crank.js.org](https://crank.js.org)
- [Deep Wiki](https://deepwiki.com/bikeshaving/crank)
- [Examples](https://github.com/bikeshaving/crank/tree/main/examples)

## Motivation
**A framework that feels like JavaScript.**

While other frameworks invent new paradigms and force you to learn
framework-specific APIs, Crank embraces the language features you already know.
No hooks to memorize, no dependency arrays to debug, no cache invalidation to
manage.

### Pure JavaScript, No Compromises

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

### Why Developers Choose Crank

- **Intuitive**: Use `async`/`await` for loading states and `function*` for lifecycles — no new APIs to learn
- **Fast**: Outperforms React in benchmarks while weighing just 5KB with zero dependencies
- **Flexible**: Write components in vanilla JavaScript with template literals, or use JSX
- **Clean**: State lives in function scope, lifecycle code goes where it belongs, no mysterious re-render bugs
- **Future-proof**: Built on stable JavaScript features, not evolving framework abstractions

### The "Just JavaScript" Promise, Delivered

Other frameworks claim to be "just JavaScript" but ask you to think in terms of
effects, dependencies, and framework-specific patterns. Crank actually delivers
on that promise — your components are literally just functions that use standard
JavaScript control flow.

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
(https://unpkg.com/@b9g/crank?module), [esm.sh](https://esm.sh)
(https://esm.sh/@b9g/crank), and [esm.run](https://esm.run/@b9g/crank)  for usage in ESM-ready environments.

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
    <div>
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
    <div>
      <a href={data.message} target="_blank" style="text-decoration: none; color: inherit;">
        <img
          src={data.message}
          alt="A Random Dog"
          width="300"
        />
        <div>
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
      <div>
        <RandomDogLoader throttle={throttle} />
        <div>
          <button>
            Show me another dog!
          </button>
          <div>
            {throttle ? "Slow mode" : "Fast mode"}
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

## API Reference

### Core Exports

```javascript
import {
  createElement,
  Fragment,
  Copy,
  Portal,
  Raw,
  Text,
  Context
} from "@b9g/crank";

import {renderer} from "@b9g/crank/dom"; // Browser DOM
import {renderer} from "@b9g/crank/html"; // Server-side HTML

import {jsx, html} from "@b9g/crank/standalone"; // Template tag (no build)

import {Suspense, SuspenseList, lazy} from "@b9g/crank/async";
```

---

### Component Types

**Function Component** - Stateless
```javascript
function Greeting({name = "World"}) {
  return <div>Hello {name}</div>;
}
```

**Generator Component** - Stateful with `function*`
```javascript
function* Counter() {
  let count = 0;
  const onclick = () => this.refresh(() => count++);

  for ({} of this) {
    yield <button onclick={onclick}>Count: {count}</button>;
  }
}
```

**Async Component** - Uses `async` for promises
```javascript
async function UserProfile({userId}) {
  const user = await fetch(`/api/users/${userId}`).then(r => r.json());
  return <div>Hello, {user.name}!</div>;
}
```

**Async Generator Component** - Stateful + async
```javascript
async function* DataLoader({url}) {
  for ({url} of this) {
    const data = await fetch(url).then(r => r.json());
    yield <div>{data.message}</div>;
  }
}
```

---

### Context API

The context is available as `this` in components (or as 2nd parameter).

```javascript
function Component(props, ctx) {
  console.log(this === ctx); // true
  return props.children;
}
```

#### Properties

**`this.props`** - Current props (readonly)

**`this.isExecuting`** - Whether the component is currently executing

**`this.isUnmounted`** - Whether the component is unmounted

#### Methods

**`this.refresh(callback?)`** - Trigger re-render
```javascript
this.refresh();                    // Simple refresh
this.refresh(() => count++);       // With state update (v0.7+)
```

**`this.schedule(callback)`** - Execute after render
```javascript
this.schedule(() => {
  console.log("Component rendered");
});
```

**`this.cleanup(callback)`** - Register cleanup on unmount
```javascript
function* Component() {
  const interval = setInterval(() => this.refresh(), 1000);
  this.cleanup(() => clearInterval(interval));

  for ({} of this) {
    yield <div>Tick</div>;
  }
}
```

**`this.addEventListener(type, listener, options?)`** - Listen to events
```javascript
this.addEventListener("click", (e) => console.log("Clicked!"));
```

**`this.dispatchEvent(event)`** - Dispatch events
```javascript
this.dispatchEvent(new CustomEvent("mybuttonclick", {
  bubbles: true,
  detail: {id: props.id}
}));
```

**`this.provide(key, value)`** / **`this.consume(key)`** - Context API
```javascript
// Provider
function* ThemeProvider() {
  this.provide("theme", "dark");
  for ({} of this) {
    yield this.props.children;
  }
}

// Consumer
function ThemedButton() {
  const theme = this.consume("theme");
  return <button class={theme}>Click me</button>;
}
```

#### Iteration

**`for ({} of this)`** - Render loop (sync)
```javascript
function* Component() {
  for ({} of this) {
    yield <div>{this.props.message}</div>;
  }
}
```

**`for await ({} of this)`** - Async render loop for racing trees
```javascript
async function* AsyncComponent() {
  for await ({} of this) {
    // Multiple yields race - whichever completes first shows
    yield <Loading />;
    yield <Content />;
  }
}
```

---

### Special Props

**`key`** - Unique identifier for reconciliation
```javascript
{items.map(item => <li key={item.id}>{item.name}</li>)}
```

**`ref`** - Access rendered DOM element
```javascript
<audio ref={(el) => (audio = el)} />

// Forward refs through components
function MyInput({ref, ...props}) {
  return <input ref={ref} {...props} />;
}
```

**`copy`** - Prevent/control re-rendering
```javascript
// Boolean: prevent rendering when truthy
<li copy={!el.hasChanged}>{el.value}</li>

// string: copy specific props
<input copy="!value" type="text" />        // Copy all except value
<div copy="class id" />                    // Copy only class and id
<div copy="children" />                    // Copy children
```

**`hydrate`** - Control SSR hydration
```javascript
<div hydrate={false}>                      // Skip hydration
<Portal hydrate={true}>                    // Force hydration
<input hydrate="!value" />                 // Hydrate all except value
```

**`class`** - String or object (v0.7+)
```javascript
<button class="btn active" />

<button class={{
  btn: true,
  'btn-active': isActive,
  'btn-disabled': isDisabled
}} />
```

**`style`** - CSS string or object
```javascript
<div style="color: red; font-size: 16px" />
<div style={{"font-size": "16px", color: "blue"}} />
```

**`innerHTML`** - Raw HTML string (⚠️ XSS risk)
```javascript
<div innerHTML="<strong>Bold</strong>" />
```

**Event Props** - Lowercase event handlers
```javascript
<button onclick={handler} />
<input onchange={handler} oninput={handler} />
<form onsubmit={handler} />
```

**Prop Naming** - HTML-friendly names supported
```javascript
<label class="my-label" for="my-id">Label</label>
// Instead of className and htmlFor
```

---

### Special Element Tags

**`<Fragment>`** - Render children without wrapper
```javascript
import {Fragment} from "@b9g/crank";

<Fragment>
  <div>Child 1</div>
  <div>Child 2</div>
</Fragment>

// Or use: <>...</>
// The Fragment tag is the empty string
```

**`<Copy />`** - Prevent element re-rendering
```javascript
import {Copy} from "@b9g/crank";

function memo(Component) {
  return function* Wrapped(props) {
    yield <Component {...props} />;
    for (const newProps of this) {
      if (equals(props, newProps)) {
        yield <Copy />;  // Reuse previous render
      } else {
        yield <Component {...newProps} />;
      }
      props = newProps;
    }
  };
}
```

**`<Portal>`** - Render into different DOM node
```javascript
import {Portal} from "@b9g/crank";

const modalRoot = document.getElementById("modal-root");

function Modal({children}) {
  return (
    <Portal root={modalRoot}>
      <div class="modal">
        {children}
      </div>
    </Portal>
  );
}
```

**`<Raw>`** - Insert raw HTML or DOM nodes
```javascript
import {Raw} from "@b9g/crank";

function MarkdownViewer({markdown}) {
  const html = marked(markdown);
  return <div><Raw value={html} /></div>;
}

// Or insert DOM node
<Raw value={domNode} />
```

**`<Text>`** - Explicit text node creation (v0.7+)
```javascript
import {Text} from "@b9g/crank";

<Text value="Hello world" />

// Access Text nodes in lifecycle
function* Component() {
  this.schedule((node) => {
    if (node instanceof Text) {
      console.log("Text node:", node);
    }
  });
  for ({} of this) {
    yield "Text content";  // Becomes a Text node
  }
}
```

---

### Async Utilities (v0.7+)

**`lazy(loader)`** - Lazy-load components
```javascript
import {lazy} from "@b9g/crank/async";

const LazyComponent = lazy(() => import("./MyComponent.js"));

<Suspense fallback={<div>Loading...</div>}>
  <LazyComponent />
</Suspense>
```

**`Suspense`** - Declarative loading states
```javascript
import {Suspense} from "@b9g/crank/async";

<Suspense fallback={<div>Loading...</div>}>
  <AsyncComponent />
</Suspense>
```

**`SuspenseList`** - Coordinate multiple async components
```javascript
import {SuspenseList} from "@b9g/crank/async";

<SuspenseList>
  <Suspense fallback={<div>Loading 1...</div>}>
    <Item1 />
  </Suspense>
  <Suspense fallback={<div>Loading 2...</div>}>
    <Item2 />
  </Suspense>
</SuspenseList>
```

---

### Lifecycle Patterns

**Mount** - Code before first `yield`
```javascript
function* Component() {
  console.log("Mounting...");
  const interval = setInterval(() => this.refresh(), 1000);

  for ({} of this) {
    yield <div>Tick</div>;
  }

  clearInterval(interval);  // Cleanup
}
```

**Update** - Code inside render loop
```javascript
function* Component() {
  for ({} of this) {
    console.log("Updated with:", this.props);
    yield <div>{this.props.message}</div>;
  }
}
```

**Cleanup** - Code after loop or via `this.cleanup()`
```javascript
function* Component() {
  const interval = setInterval(() => this.refresh(), 1000);
  this.cleanup(() => clearInterval(interval));

  for ({} of this) {
    yield <div>Tick</div>;
  }
}
```

---

### Advanced Patterns

**Higher-Order Components**
```javascript
function withLogger(Component) {
  return function* WrappedComponent(props) {
    console.log("Rendering with:", props);
    for ({} of this) {
      yield <Component {...props} />;
    }
  };
}
```

**Hooks**
```javascript
function useInterval(ctx, callback, delay) {
  let interval = setInterval(callback, delay);
  ctx.cleanup(() => clearInterval(interval);
  return (newDelay) => {
    delay = newDelay;
    clearInterval(interval);
    interval = setInterval(callback, delay);
  };
}
```

**Context Extensions** (⚠️ Prefer hooks over global extensions)
```javascript
import {Context} from "@b9g/crank";

Context.prototype.setInterval = function(callback, delay) {
  const interval = setInterval(callback, delay);
  this.cleanup(() => clearInterval(interval));
};

// Use in components
function* Timer() {
  let seconds = 0;
  this.setInterval(() => this.refresh(() => seconds++), 1000);

  for ({} of this) {
    yield <div>Seconds: {seconds}</div>;
  }
}
```

**Racing Components**
```javascript
async function* DataComponent({url}) {
  for await ({url} of this) {
    yield <Spinner />;
    yield <Data data={data} />;
  }
}
```

---

### TypeScript Support

```typescript
import type {Context} from "@b9g/crank";
import {ComponentProps} from "@b9g/crank";  // v0.7+

// Component with typed props
interface Props {
  name: string;
  age?: number;
}

function Greeting({name, age}: Props) {
  return <div>Hello {name}, age {age}</div>;
}

// Generator with typed context
function* Greeting(this: Context<typeof Greeting>, {name}: {name: string}) {
  for ({name} of this) {
    yield <div>Hello {name}</div>;
  }
}

// Extract component props type
function Button({variant}: {variant: "primary" | "secondary"}) {
  return <button class={`btn-${variant}`}>Click</button>;
}

type ButtonProps = ComponentProps<typeof Button>;
```

For comprehensive guides and documentation, visit [crank.js.org](https://crank.js.org)

