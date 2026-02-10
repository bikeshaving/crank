# Crank Component Specification

<div class="note">

This document specifies the component model for Crank.js. It defines how the framework invokes components, manages their lifecycle, handles async rendering, and propagates errors. It is intended as a reference for implementors and tooling authors.

This specification is a living document and may be updated as the framework evolves.

</div>

## 1. Component Invocation

A component is a function. The framework calls it with:

- **`this`** bound to a `Context` object
- **First argument**: the current props object
- **Second argument**: the same `Context` object (for arrow functions and destructuring)

```ts
(this: Context, props: TProps, ctx: Context) => Children | Promise<Children> | Iterator<Children> | AsyncIterator<Children>
```

The framework distinguishes component types by return value, not declaration syntax.

| Type | Returns | Stateful |
|---|---|---|
| Function | `Children` | No — re-called on every update. |
| Generator | `Iterator<Children>` | Yes — lexical scope preserved across yields. |
| Async function | `Promise<Children>` | No — re-called on every update. |
| Async generator | `AsyncIterator<Children>` | Yes — lexical scope preserved across yields. |

### 1.1 Function Components

The framework calls the function on every update. The return value is rendered as children. Function components never block.

### 1.2 Generator Components

The framework calls the function once and stores the returned iterator. On each subsequent update, the framework calls `next(previousResult)` where `previousResult` is the rendered result of the previous yield. The framework preserves the generator's lexical scope across yields by retaining the iterator for as long as the component element occupies the same position in the element tree. Generator components block while their children render — `previousResult` is always a settled value, never a promise. The framework calls `return()` on unmount.

### 1.3 Async Function Components

The framework calls the function on every update. The component blocks while its own async execution is pending, but does not block while its children render. See section 4 for enqueuing behavior.

### 1.4 Async Generator Components

The framework calls the function once and stores the returned async iterator. Async generators operate in three modes:

**`for...of` mode** (sync iterator): The component blocks while children render, identical to sync generators. `yield` evaluates to the settled rendered result.

**`for await...of` mode** (async iterator): The framework enters a pull-based loop. The component resumes continuously — it does not block while children render. `yield` evaluates to a `Promise` that resolves to the rendered result. The component suspends at the bottom of the loop until new props are available or `refresh()` is called. This mode enables racing patterns: multiple yields per update produce successive element trees that are raced via the chasing algorithm (section 4.3).

**No-loop mode** (no iterator): The component blocks while children render, identical to sync generators.

## 2. Context

The framework provides a `Context` object to each component instance.

### 2.1 Properties

| Property | Type | Description |
|---|---|---|
| `props` | `TProps` (readonly) | Current props of the associated element. |
| `isExecuting` | `boolean` (readonly) | `true` during the synchronous call to the component function or `iterator.next()`. Set to `false` before children are diffed. |
| `isUnmounted` | `boolean` (readonly) | `true` after the component has been unmounted. |

### 2.2 Methods

| Method | Signature |
|---|---|
| `refresh` | `(callback?: () => unknown) => Promise<TResult> \| TResult` |
| `schedule` | `(callback?: (value: TResult) => unknown) => Promise<TResult> \| void` |
| `after` | `(callback?: (value: TResult) => unknown) => Promise<TResult> \| void` |
| `cleanup` | `(callback?: (value: TResult) => unknown) => Promise<TResult> \| void` |
| `provide` | `(key: unknown, value: unknown) => void` |
| `consume` | `(key: unknown) => unknown` |
| `addEventListener` | Standard `EventTarget` API |
| `removeEventListener` | Standard `EventTarget` API |
| `dispatchEvent` | `(event: Event) => boolean` |

- `refresh(callback?)` — Enqueues a re-execution of the component. If a callback is provided, the framework runs it before re-executing. If called while `isExecuting` is `true`, the framework logs an error and returns the current value.
- `schedule(callback?)` — The framework calls the callback after DOM nodes are created but before they are inserted into the document. Callbacks are deduplicated per function identity.
- `after(callback?)` — The framework calls the callback after DOM nodes are inserted into the document. Callbacks are deduplicated per function identity.
- `cleanup(callback?)` — The framework calls the callback when the component unmounts, before children are unmounted. If the callback returns a promise, the framework defers child unmounting until it resolves.
- `provide(key, value)` — Stores a value on this context, retrievable by descendants via `consume`.
- `consume(key)` — Walks up the context tree and returns the value from the nearest ancestor that called `provide` with the same key.
- `dispatchEvent(event)` — Dispatches an event on the context. The framework also invokes the matching `on*` prop on the component element, if present.

When called with no arguments, `schedule`, `after`, and `cleanup` return a `Promise` that resolves with the rendered value.

## 3. Props Iteration

The `Context` implements both `Symbol.iterator` and `Symbol.asyncIterator`.

### 3.1 Synchronous (`for...of`)

Each iteration yields the current props object. If the iterator is advanced twice without the component yielding, the framework throws a runtime error.

### 3.2 Asynchronous (`for await...of`)

Each iteration yields the current props object. If new props are not yet available, the iteration awaits until the framework provides them. When a component enters this mode, the framework switches to a pull-based execution model where children render without blocking the generator.

## 4. Async Rendering

### 4.1 Blocking

Each component type has different blocking behavior. The "block" duration determines how long the framework waits before accepting the next update for that component.

| Type | Blocks for own execution | Blocks for children |
|---|---|---|
| Function | No | No |
| Generator | No (sync) | Yes |
| Async function | Yes | No |
| Async generator (`for...of`) | Yes | Yes |
| Async generator (`for await...of`) | Yes | No |

When a component is blocked, the framework separates the block duration (the component's own execution) from the value duration (the full render including children). The enqueuing algorithm (4.2) advances based on the block, not the value.

### 4.2 Enqueuing

When an async component is re-rendered while a previous execution is still pending, the framework enqueues at most one additional execution. The framework maintains two slots per component: **inflight** and **enqueued**.

1. If no inflight execution exists, the framework starts one immediately.
2. If an inflight execution exists but no enqueued execution, the framework creates an enqueued execution that waits for the inflight to settle, then runs with the latest props.
3. If both inflight and enqueued executions exist, the framework updates the stored props but does not create a third execution. The enqueued execution will use whatever props are current when it starts.

When the inflight execution settles, the enqueued execution is promoted to inflight. This guarantees at most one concurrent execution per component element, and that the final render always reflects the latest props.

For async generator components in `for await...of` mode, the framework uses hitching instead of enqueuing: concurrent updates resolve to the current inflight execution rather than scheduling a new one, because the generator resumes continuously on its own.

### 4.3 Chasing (Ratcheting)

When different async element trees are rendered into the same position and settle out of order, the framework ensures that later renders always win. It does this by racing each render's child values against the next render's child values using `Promise.race`.

This produces a ratcheting effect: if an earlier render settles first, its result is displayed until the later render settles. If the later render settles first, the earlier render's result is never displayed. This guarantees rendering is monotonic — the DOM always reflects the most recently initiated render that has settled.

### 4.4 Fallbacks

When a new async element is rendered into a position where a previous element has already committed, the framework preserves the previously rendered content until the new element settles for the first time. This prevents the DOM from going blank while async elements are pending. The fallback chain is cleared once the element commits.

## 5. Execution Order

### 5.1 Per Update

1. The framework sets `isExecuting` to `true`.
2. The framework calls the component function (for function components) or `iterator.next(previousResult)` (for generators).
3. The framework sets `isExecuting` to `false`.
4. The framework diffs the yielded/returned children against the previous tree.
5. The framework commits DOM mutations.
6. The framework fires `schedule` callbacks (DOM created, not yet inserted).
7. The framework inserts DOM nodes into the document.
8. The framework fires `after` callbacks (DOM live in document).

### 5.2 On Unmount

1. The framework fires `cleanup` callbacks. If any return promises, child unmounting is deferred until they resolve.
2. For generators: the framework calls `return()` on the iterator.
3. Children are unmounted recursively.

## 6. Error Handling

### 6.1 Error Injection

When a child component throws during rendering, the framework calls `throw(error)` on the nearest ancestor generator's iterator. This causes the `yield` expression in the ancestor to throw the error. If the generator catches the error (via `try`/`catch` around `yield`), it may yield a recovery element tree and rendering continues. If uncaught, the error propagates up the context tree to the next ancestor generator.

### 6.2 Async Error Handling

For async generator components in `for await...of` mode, the framework tracks whether the promise returned by `yield` is being observed (via `.then()` or `.catch()`). If the promise is **unobserved** ("floating") and a child error occurs, the framework injects the error via `throw(error)` on the iterator. If the promise is **observed**, the framework rejects the promise, allowing the component to catch the error via `await`.

### 6.3 Generator Return on Error

If a generator component does not catch an injected error, the framework does not call `return()` — the iterator is already done because the uncaught `throw()` terminates it. The `finally` block of the generator, if present, still executes as part of the iterator protocol.

## 7. Events

The framework maps `on*` props to DOM event listeners. Both lowercase (`onclick`) and camelCase (`onClick`) event prop names are supported; camelCase names are normalized to lowercase before registration.

`dispatchEvent` on a component context also invokes the matching `on*` prop on the component's element.

## 8. DOM Attributes

The framework passes props directly as DOM attributes using standard HTML names (`class`, `for`, `innerHTML`, `tabindex`). It does not translate React-style names (`className`, `htmlFor`, `dangerouslySetInnerHTML`).

Style props accept an object with CSS property names. Both kebab-case (`font-size`) and camelCase (`fontSize`) are supported; camelCase names are converted to kebab-case. Numeric values are automatically suffixed with `px` for properties that accept length units.

## 9. Special Elements

| Element | Tag | Behavior |
|---|---|---|
| `Fragment` | `""` | The framework renders children without a wrapper node. Non-string iterables are implicitly wrapped in a Fragment. |
| `Copy` | `Symbol.for("crank.Copy")` | The framework preserves the previously rendered content at this position. |
| `Portal` | `Symbol.for("crank.Portal")` | The framework renders children into the DOM node specified by the `root` prop. |
| `Raw` | `Symbol.for("crank.Raw")` | The framework injects the raw HTML string or DOM node from the `value` prop. |

## 10. Special Props

| Prop | Type | Behavior |
|---|---|---|
| `key` | `any` | The framework uses keys for reconciliation. Keyed children are matched by key, not position. Duplicate keys among siblings produce a runtime error. |
| `ref` | `(node) => unknown` | The framework calls this with the rendered DOM node after commit. |
| `copy` | `boolean \| string` | `true`: the framework preserves the entire subtree. String: the framework selectively copies/excludes props (`"class disabled"` or `"!class"`). |
| `hydrate` | `boolean \| string` | `true`: the framework hydrates from existing DOM. String: selective hydration of specific props. |
| `children` | `unknown` | Child content passed between opening and closing tags. |

The framework strips all special props before passing the remaining props to the renderer.

## 11. JSX

### 11.1 JSX Import Source

```jsx
/** @jsxImportSource @b9g/crank */
```

```json
{ "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "@b9g/crank" } }
```

### 11.2 Template Tags

The `jsx` and `html` tagged template literals from `@b9g/crank/standalone` produce Crank elements without a JSX compiler.
