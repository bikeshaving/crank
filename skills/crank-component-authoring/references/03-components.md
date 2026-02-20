---
title: Components
description: Build powerful components in Crank using functions and generators. Learn stateful components, props handling, and how to leverage JavaScript’s control flow.
---

## Basic Components

Host elements use lowercase tags like `<div>` and render as their HTML equivalents. *Components* are functions referenced with capitalized tags — the capitalization tells the JSX compiler to treat the tag as an identifier, not a string.

The simplest kind is a *function component*. The function receives props as its first argument and its return value is rendered as children.

```jsx live
import {renderer} from "@b9g/crank/dom";
function Greeting({name}) {
  return <div>Hello, {name}</div>;
}

renderer.render(<Greeting name="World" />, document.body);
```

## Component children
Children passed between tags appear as `props.children`. The component must place them in the returned tree — otherwise they won’t render.

```jsx live
import {renderer} from "@b9g/crank/dom";

function Details({summary, children}) {
  return (
    <details>
      <summary>{summary}</summary>
      {children}
    </details>
  );
}

renderer.render(
  <Details summary="Greeting">
    <div>Hello world</div>
  </Details>,
  document.body,
);
```

The type of children is unknown, e.g. it could be an array, an element, or
whatever else the caller passes in.

## Stateful Components

Crank uses [generator functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*) for stateful components. A generator pauses at each `yield` and resumes where it left off when you call `next()`:

```js
function *fibonacci() {
  let a = 0, b = 1;
  while (true) {
    yield a;
    [a, b] = [b, a + b];
  }
}

const fib = fibonacci();
fib.next(); // {value: 0}
fib.next(); // {value: 1}
fib.next(); // {value: 1}
fib.next(); // {value: 2}
```

The variables `a` and `b` persist between calls — the generator’s scope is its state. Crank components work the same way: yield JSX instead of numbers, and the framework calls `next()` when the component re-renders:

```jsx live
import {renderer} from "@b9g/crank/dom";

function *Counter() {
  let count = 0;
  while (true) {
    count++;
    yield (
      <div>
        This component has updated {count} time{count !== 1 && "s"}.
      </div>
    );
  }
}

renderer.render(<Counter />, document.body);
renderer.render(<Counter />, document.body);
renderer.render(<Counter />, document.body);
```

However, `while (true)` is fragile — a missing `yield` freezes the page. A better pattern iterates over the component’s *context* (`this`), which yields fresh props on each render:

```jsx live
import {renderer} from "@b9g/crank/dom";

function *Counter() {
  let count = 0;
  for ({} of this) {
    count++;
    yield (
      <div>
        This component has updated {count} time{count !== 1 && "s"}.
      </div>
    );
  }
}

renderer.render(<Counter />, document.body);
renderer.render(<Counter />, document.body);
renderer.render(<Counter />, document.body);
```

The `for...of` loop cannot infinite-loop (it blocks at `yield`), and it automatically receives new props on each re-render.

### Why `for ({} of this)`?

The destructuring in `for ({name} of this)` reassigns the parameter variables from the function head, keeping them current without declaring new ones:

- **TypeScript types flow through.** The `for...of` reuses the parameter bindings — no extra annotations.
- **No lint issues.** No shadowed or undeclared variables.
- **One source of truth.** Props are declared in the parameter list and updated in one place.

When a component has no props, `for ({} of this)` advances the iterator with an empty destructuring pattern.

## Self-Updating Components with refresh()

Components update themselves with the `refresh()` method:

```jsx live
import {renderer} from "@b9g/crank/dom";

function *Timer() {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);

  for ({} of this) {
    yield <p>{seconds} second{seconds !== 1 && "s"}</p>;
  }

  clearInterval(interval);
}

renderer.render(<Timer />, document.body);
```

### The refresh() Callback Pattern

`refresh()` accepts a callback that runs before re-rendering, so you can’t forget to pair mutation with refresh:

```jsx live
import {renderer} from "@b9g/crank/dom";

function *Timer({message = "Seconds elapsed:"}) {
  let seconds = 0;
  const interval = setInterval(() => this.refresh(() => seconds++), 1000);

  for ({message} of this) {
    yield (
      <div>{message} {seconds}</div>
    );
  }

  clearInterval(interval);
}

renderer.render(<Timer />, document.body);
```

For event handlers: `const onclick = () => this.refresh(() => count++);`

### Alternative Context Syntax

The context is also passed as the second parameter, for arrow functions or if you prefer not to use `this`:

```jsx
function *Timer({message}, ctx) {
  let seconds = 0;
  const interval = setInterval(() => ctx.refresh(() => seconds++), 1000);

  for ({message} of ctx) {
    yield (
      <div>{message} {seconds}</div>
    );
  }

  clearInterval(interval);
}
```

## Default Props
Use JavaScript’s default value syntax in the destructuring pattern:

```jsx live
import {renderer} from "@b9g/crank/dom";
function Greeting({name="World"}) {
  return <div>Hello, {name}</div>;
}

renderer.render(<Greeting />, document.body);
```

For generator components, you should make sure that you use the same default value in both the parameter list and the loop. A mismatch in the default values for a prop between these two positions may cause surprising behavior.

```jsx live
import {renderer} from "@b9g/crank/dom";
function *Greeting({name="World"}) {
  yield <div>Hello, {name}</div>;
  for ({name="World"} of this) {
    yield <div>Hello again, {name}</div>;
  }
}

renderer.render(<Greeting />, document.body);
renderer.render(<Greeting />, document.body);
```
