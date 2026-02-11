---
title: Common Pitfalls
description: Footguns and idiomatic patterns for writing correct Crank components. Covers the mistakes caught by eslint-plugin-crank plus timing and lifecycle subtleties.
---

This guide covers the most common mistakes when writing Crank components and the idiomatic patterns that avoid them. The [`eslint-plugin-crank`](https://github.com/bikeshaving/crank.js/tree/main/packages/eslint-plugin-crank) package catches many of these automatically.

## Forgetting to call `refresh()`

The single most common Crank bug. You mutate a variable but the UI doesn't update because `refresh()` was never called. State changes are invisible until you tell the framework to re-render.

The callback form is strongly preferred — it atomically mutates state and triggers a re-render, so you can't forget one without the other.

```jsx
// WRONG — state changes, UI doesn't
const onclick = () => { count++; };

// FRAGILE — easy to forget the refresh() call, especially in longer handlers
const onclick = () => {
  count++;
  updateSomeOtherState();
  this.refresh();
};

// CORRECT — atomic mutation + re-render
const onclick = () => this.refresh(() => {
  count++;
  updateSomeOtherState();
});
```

**ESLint rule:** `crank/prefer-refresh-callback`

## Using `while (true)` instead of `for...of this`

Generator components must iterate over the context to receive prop updates. A `while (true)` loop renders correctly but never sees new props — the component is stuck with whatever was passed on mount.

```jsx
// WRONG — props never update
function *Counter({count}) {
  while (true) {
    yield <div>{count}</div>; // count is always the initial value
  }
}

// CORRECT — destructure fresh props each iteration
function *Counter({count}) {
  for ({count} of this) {
    yield <div>{count}</div>;
  }
}
```

**ESLint rule:** `crank/prefer-props-iterator`

## Stale props from incomplete destructuring

If you destructure `{title}` in the `for...of` but also use `count` inside the loop body, `count` is captured from the initial call and never updated.

```jsx
// WRONG — count is stale after first render
function *Card({title, count}) {
  for ({title} of this) {
    yield <div>{title}: {count}</div>;
  }
}

// CORRECT — destructure every prop used in the loop
function *Card({title, count}) {
  for ({title, count} of this) {
    yield <div>{title}: {count}</div>;
  }
}
```

**ESLint rule:** `crank/prop-destructuring-consistency`

## React-style event names

Crank uses standard HTML event attributes, not React's camelCase synthetic events. React names silently bind to nothing.

```jsx
// WRONG — these are not DOM event names
<button onClick={handler} onChange={handler} onKeyDown={handler} />

// CORRECT — lowercase DOM event names
<button onclick={handler} onchange={handler} onkeydown={handler} />
```

**ESLint rule:** `crank/no-react-event-props`

## React-style HTML attributes

Crank passes props directly to the DOM. React-isms like `className` are not translated.

```jsx
// WRONG
<label className="title" htmlFor="name" />

// CORRECT — standard HTML attribute names
<label class="title" for="name" />
```

**ESLint rule:** `crank/no-react-props`

## React-style SVG attributes

SVG attributes in Crank use their standard names (kebab-case, namespaced), not React's camelCase.

```jsx
// WRONG
<line strokeWidth="2" xlinkHref="#icon" />

// CORRECT
<line stroke-width="2" xlink:href="#icon" />
```

**ESLint rule:** `crank/no-react-svg-props`

## Leaking timers and subscriptions

Timers and subscriptions outlive the component if not cleaned up. Use `try`/`finally` around the loop, `this.cleanup()`, or code after the `for...of` loop.

```jsx
// WRONG — interval leaks on unmount
function *Timer() {
  let s = 0;
  setInterval(() => this.refresh(() => s++), 1000);
  for ({} of this) {
    yield <div>{s}</div>;
  }
}

// CORRECT — try/finally
function *Timer() {
  let s = 0;
  const id = setInterval(() => this.refresh(() => s++), 1000);
  try {
    for ({} of this) {
      yield <div>{s}</div>;
    }
  } finally {
    clearInterval(id);
  }
}

// ALSO CORRECT — this.cleanup() is persistent, fires once on unmount
function *Timer() {
  let s = 0;
  const id = setInterval(() => this.refresh(() => s++), 1000);
  this.cleanup(() => clearInterval(id));
  for ({} of this) {
    yield <div>{s}</div>;
  }
}
```

**ESLint rule:** `crank/require-cleanup-for-timers`

## Yielding or returning JSX inside lifecycle callbacks

`schedule`, `after`, and `cleanup` are side-effect callbacks, not render points. Yielding or returning elements from them doesn't render anything — yield only in the main generator body.

```jsx
// WRONG
this.schedule(() => { yield <div />; });
this.after(() => { return <div />; });

// CORRECT — use callbacks for side effects only
this.after((el) => el.focus());
for ({} of this) {
  yield <input />;
}
```

**ESLint rule:** `crank/no-yield-in-lifecycle-methods`

## `schedule()` vs `after()` — know the timing

`schedule` fires after DOM nodes are created but **before** they are inserted into the document. `after` fires **after** insertion. Use `after` for anything that needs the element to be live in the DOM.

```jsx
// WRONG — element is not in the document yet
this.schedule((el) => el.focus());
this.schedule((el) => el.getBoundingClientRect());

// CORRECT — element is live in the document
this.after((el) => el.focus());
this.after((el) => el.getBoundingClientRect());
```

When to use `schedule`: running code that must happen before the user sees the element (e.g. measuring to prevent layout shift, synchronous DOM setup). On initial render, if a `schedule` callback returns a promise, insertion is deferred until the promise resolves — this is useful for async setup that must complete before the element appears.

## `return` exits the generator

`return` from inside a generator loop terminates the component permanently. Use `yield` for normal renders. `return` is only appropriate as a final value when the component is done.

```jsx
// WRONG — component dies on first render
function *Greeting({name}) {
  for ({name} of this) {
    return <div>Hello {name}</div>;
  }
}

// CORRECT
function *Greeting({name}) {
  for ({name} of this) {
    yield <div>Hello {name}</div>;
  }
}
```

## Missing keys for dynamic lists

Without keys, reordering a list causes generator components to silently receive the wrong props — their internal state stays in place while the props shuffle around them.

```jsx
// WRONG — generator state gets confused on reorder
{items.map((item) => <TodoItem item={item} />)}

// CORRECT — key ties state to identity
{items.map((item) => <TodoItem key={item.id} item={item} />)}
```

Duplicate keys among siblings are a runtime error.

## Components must return or yield something

An implicit `undefined` return produces a runtime warning. Return `null` explicitly for intentional empty output.

```jsx
// WRONG — generates warning
function Empty() {}
async function AsyncEmpty() {}

// CORRECT
function Empty() { return null; }
async function AsyncEmpty() { return null; }
```

## Calling `refresh()` at the wrong time

`refresh()` during execution (while `isExecuting` is `true`) logs an error and does nothing. This usually happens when an event handler fires synchronously during rendering. `refresh()` after unmount also logs an error.

```jsx
// Check if needed
if (!this.isExecuting && !this.isUnmounted) {
  this.refresh();
}
```

In practice, this rarely comes up — event handlers run asynchronously after rendering, so `isExecuting` is normally `false`. The guard is only needed for edge cases like synchronous dispatch during component execution.

## `cleanup()` is persistent, `schedule()` and `after()` are one-shot

`schedule` and `after` callbacks fire once and must be re-registered on each render. `cleanup` callbacks persist across renders and fire once on unmount.

```jsx
function *Component() {
  // This cleanup runs once when the component unmounts, no matter how many renders happen
  this.cleanup(() => console.log("unmounted"));

  for ({} of this) {
    // These must be registered every render
    this.schedule((el) => console.log("DOM created", el));
    this.after((el) => console.log("DOM inserted", el));
    yield <div />;
  }
}
```

All three return a `Promise` when called with no arguments, which resolves with the rendered value at the corresponding point in the lifecycle.
