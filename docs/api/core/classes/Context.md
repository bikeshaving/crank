---
title: Context
module: "@b9g/crank"
type: class
publish: true
---

# Context

The context object passed to component functions, providing access to props, lifecycle methods, and component state management.

## Syntax

```ts
class Context<T = any, TResult = any> extends EventTarget {
  readonly props: T;
  readonly isExecuting: boolean;
  readonly isUnmounted: boolean;

  refresh(callback?: () => unknown): Promise<TResult> | TResult;
  schedule(callback?: (value: TResult) => unknown): Promise<TResult> | void;
  after(callback?: (value: TResult) => unknown): Promise<TResult> | void;
  cleanup(callback?: (value: TResult) => unknown): Promise<TResult> | void;
  provide<K>(key: K, value: ProvisionMap[K]): void;
  consume<K>(key: K): ProvisionMap[K];

  [Symbol.iterator](): Generator<T>;
  [Symbol.asyncIterator](): AsyncGenerator<T>;
}
```

## Instance properties

### props

`T` (readonly)

The current props of the component. This always reflects the latest props passed to the component.

### isExecuting

`boolean` (readonly)

Whether the component is currently executing. Useful for preventing recursive refresh calls.

### isUnmounted

`boolean` (readonly)

Whether the component has been unmounted. Check this before performing async operations that might complete after unmount.

## Instance methods

### refresh()

```ts
refresh(callback?: () => unknown): Promise<TResult> | TResult
```

Manually triggers a re-render of the component.

**Parameters:**
- **callback** (optional) - A function to call before the refresh starts. If it returns a promise, the refresh waits for it.

**Returns:** The rendered result, or a promise if async.

### schedule()

```ts
schedule(): Promise<TResult>;
schedule(callback: (value: TResult) => unknown): void;
```

Registers a callback that fires when the component's children are created. Fires once per update.

**Parameters:**
- **callback** (optional) - Called with the rendered value when children are ready.

**Returns:** A promise if no callback provided, otherwise void.

### after()

```ts
after(): Promise<TResult>;
after(callback: (value: TResult) => unknown): void;
```

Registers a callback that fires when the component's children are fully rendered (after DOM updates).

**Parameters:**
- **callback** (optional) - Called with the rendered value after rendering completes.

**Returns:** A promise if no callback provided, otherwise void.

### cleanup()

```ts
cleanup(): Promise<TResult>;
cleanup(callback: (value: TResult) => unknown): void;
```

Registers a callback that fires when the component unmounts. The callback can be async to defer unmounting.

**Parameters:**
- **callback** (optional) - Called with the rendered value on unmount.

**Returns:** A promise if no callback provided, otherwise void.

### provide()

```ts
provide<K>(key: K, value: ProvisionMap[K]): void
```

Provides a value to descendant components via context.

**Parameters:**
- **key** - The context key (typically a symbol)
- **value** - The value to provide

### consume()

```ts
consume<K>(key: K): ProvisionMap[K]
```

Consumes a value from an ancestor component's context.

**Parameters:**
- **key** - The context key to look up

**Returns:** The provided value, or undefined if not found.

## Iteration

Context objects are iterable and async-iterable, yielding props on each update. This enables generator-based components.

### Sync iteration (for...of)

```tsx
function* Counter() {
  let count = 0;
  for (const props of this) {
    yield <div>{count++}</div>;
  }
}
```

### Async iteration (for await...of)

```tsx
async function* AsyncComponent() {
  for await (const props of this) {
    const data = await fetchData(props.id);
    yield <div>{data}</div>;
  }
}
```

## Event handling

Context extends EventTarget, allowing components to dispatch and listen for events.

```tsx
function* Button() {
  this.addEventListener("click", (ev) => {
    console.log("Button clicked");
  });

  for (const {children} of this) {
    yield <button>{children}</button>;
  }
}
```

## Examples

### Complete lifecycle example

```tsx
function* Timer({interval = 1000}) {
  let count = 0;
  const id = setInterval(() => {
    count++;
    this.refresh();
  }, interval);

  // Cleanup on unmount
  this.cleanup(() => clearInterval(id));

  for (const props of this) {
    yield <div>Count: {count}</div>;
  }
}
```

### Using context for data passing

```tsx
const ThemeContext = Symbol.for("theme");

function* ThemeProvider({theme, children}) {
  for (const {theme, children} of this) {
    this.provide(ThemeContext, theme);
    yield children;
  }
}

function ThemedButton({children}) {
  const theme = this.consume(ThemeContext);
  return <button style={{background: theme.primary, color: "white"}}>{children}</button>;
}
```

### Async operations with cleanup

```tsx
async function* DataFetcher({url}) {
  for await (const {url} of this) {
    if (this.isUnmounted) break;

    try {
      const response = await fetch(url);
      const data = await response.json();
      yield <div>{JSON.stringify(data)}</div>;
    } catch (error) {
      yield <div>Error: {error.message}</div>;
    }
  }
}
```

## See also

- [Component](/api/core/types/Component)
- [Lifecycles Guide](/guides/lifecycles)
- [Components Guide](/guides/components)
