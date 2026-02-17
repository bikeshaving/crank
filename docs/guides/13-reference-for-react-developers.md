---
title: Reference for React Developers
description: A side-by-side reference mapping React patterns to their Crank equivalents. Covers components, state, lifecycle, context, refs, memoization, and async patterns.
---

Crank shares JSX syntax and component concepts with React but differs in how it handles state, lifecycle, and side effects. Where React uses hooks, Crank uses generator functions and plain JavaScript. This guide maps common React patterns to their Crank equivalents.

## Quick Reference

| React | Crank | Notes |
|-------|-------|-------|
| `className` | `class` | Both accepted; standard HTML name preferred |
| `htmlFor` | `for` | Both accepted; standard HTML name preferred |
| `onClick` | `onclick` | Both accepted; lowercase preferred |
| `onChange` | `onchange` | Both accepted; lowercase preferred |
| `useState` | Local variable in generator | State persists in generator closure |
| `useEffect` | `schedule()`, `after()`, `cleanup()` | See [Lifecycle](#lifecycle) |
| `useContext` | `this.consume(key)` | See [Context](#context) |
| `Context.Provider` | `this.provide(key, value)` | No wrapper component needed |
| `useRef` | Local variable + `ref` callback | See [Refs](#refs) |
| `useMemo` | Manual cache in generator | See [Memoization](#memoization) |
| `React.memo` | `Copy` element or `copy` prop | See [Memoization](#memoization) |
| `dangerouslySetInnerHTML` | `innerHTML` | Both accepted; direct prop preferred |
| `strokeWidth` etc. | `stroke-width` etc. | SVG camelCase auto-mapped to kebab-case |
| `React.lazy` | `lazy()` from `@b9g/crank/async` | See [Async Patterns](#async-patterns) |
| `Suspense` | `Suspense` from `@b9g/crank/async` | See [Async Patterns](#async-patterns) |

## Components

### Function Components

Stateless function components are identical in both frameworks:

```jsx
// React
function Greeting({name}) {
  return <div>Hello {name}</div>;
}

// Crank — same
function Greeting({name}) {
  return <div>Hello {name}</div>;
}
```

### Class Components → Generator Functions

React class components map to Crank generator functions. The generator’s closure replaces instance state, and the `for...of` loop over the context replaces `render()`:

```jsx
// React
class Counter extends React.Component {
  state = {count: 0};

  componentDidMount() {
    console.log("Mounted");
  }

  componentWillUnmount() {
    console.log("Unmounting");
  }

  render() {
    return (
      <button onClick={() => this.setState({count: this.state.count + 1})}>
        Count: {this.state.count}
      </button>
    );
  }
}

// Crank
function *Counter() {
  let count = 0;
  console.log("Mounted");

  const onclick = () => this.refresh(() => count++);

  for ({} of this) {
    yield (
      <button onclick={onclick}>
        Count: {count}
      </button>
    );
  }

  console.log("Unmounting");
}
```

Crank distinguishes stateless and stateful components by return type: a function that returns JSX is stateless, while a generator that yields JSX is stateful.

## State

### useState → Local Variables

State in Crank is a local variable in the generator’s closure. Calling `this.refresh()` re-renders the component, and the `for...of` loop yields the next iteration with updated values.

```jsx
// React
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}

// Crank
function *Counter() {
  let count = 0;
  const onclick = () => this.refresh(() => count++);

  for ({} of this) {
    yield <button onclick={onclick}>Count: {count}</button>;
  }
}
```

The callback form of `this.refresh()` runs the mutation immediately before re-rendering, which prevents forgetting to call `refresh()` after a state change.

### Multiple State Variables

Where React requires separate `useState` calls, Crank uses ordinary variable declarations:

```jsx
// React
const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [agreed, setAgreed] = useState(false);

// Crank
function *SignupForm() {
  let name = "";
  let email = "";
  let agreed = false;

  // ...
}
```

### State Update Semantics

The `refresh()` callback runs synchronously, so consecutive mutations compose as expected:

```jsx
// React — setState is batched; both refer to the same snapshot
setCount(count + 1);
setCount(count + 1); // still count + 1

// Crank — mutations are sequential
this.refresh(() => {
  count = count + 1;
  count = count + 1; // count + 2
});
```

## Lifecycle

### Mount Phase

Code before the `for...of` loop runs once when the component mounts:

```jsx
// React
useEffect(() => {
  console.log("Mounted");
}, []);

// Crank
function *Component() {
  console.log("Mounted");

  for ({} of this) {
    yield <div />;
  }
}
```

### Per-Render Side Effects

Crank provides two callback methods for post-render work, with different timing:

- **`this.schedule(cb)`** — runs after DOM nodes are created but *before* they are inserted into the document. Useful for setting up properties without visual flicker.
- **`this.after(cb)`** — runs after the element is live in the DOM. Useful for focusing inputs, measuring layout, or triggering animations.

```jsx
// React
useEffect(() => {
  inputRef.current.focus();
});

// Crank
function *Component() {
  for ({} of this) {
    this.after((el) => el.querySelector("input").focus());
    yield <div><input type="text" /></div>;
  }
}
```

Both methods must be called inside the `for...of` loop to run on each render. They are one-shot: each call registers a callback for the current render only.

### Unmount / Cleanup

Three equivalent approaches:

**Code after the loop** — runs when the component is removed from the tree:
```jsx
function *Timer() {
  const interval = setInterval(() => this.refresh(), 1000);

  for ({} of this) {
    yield <div>Tick</div>;
  }

  clearInterval(interval); // cleanup
}
```

**`try`/`finally`** — also handles errors:
```jsx
function *Timer() {
  const interval = setInterval(() => this.refresh(), 1000);
  try {
    for ({} of this) {
      yield <div>Tick</div>;
    }
  } finally {
    clearInterval(interval);
  }
}
```

**`this.cleanup(cb)`** — useful for abstracting teardown into helper functions:
```jsx
function *Timer() {
  const interval = setInterval(() => this.refresh(), 1000);
  this.cleanup(() => clearInterval(interval));

  for ({} of this) {
    yield <div>Tick</div>;
  }
}
```

### No Dependency Arrays

React’s `useEffect` requires a dependency array to control when side effects re-run. In Crank, the `for...of` loop destructures fresh props on every iteration, and you can compare values yourself:

```jsx
// React
useEffect(() => {
  document.title = `Count: ${count}`;
}, [count]);

// Crank
function *Component({count}) {
  for ({count} of this) {
    this.after(() => document.title = `Count: ${count}`);
    yield <div>{count}</div>;
  }
}
```

## Context

React context requires creating a context object, wrapping descendants in a Provider component, and consuming with `useContext`. Crank uses `this.provide()` and `this.consume()` with any value as a key, and no wrapper component is needed.

```jsx
// React
const ThemeContext = React.createContext("light");

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Toolbar />
    </ThemeContext.Provider>
  );
}

function Toolbar() {
  const theme = useContext(ThemeContext);
  return <div>Theme: {theme}</div>;
}

// Crank
const ThemeKey = Symbol("theme");

function *App() {
  this.provide(ThemeKey, "dark");

  for ({} of this) {
    yield <Toolbar />;
  }
}

function Toolbar() {
  const theme = this.consume(ThemeKey);
  return <div>Theme: {theme}</div>;
}
```

Crank does not automatically re-render consumers when a provided value changes. If a provider updates a value, it is responsible for re-rendering its subtree (which happens naturally when the provider yields new children).

## Refs

React’s `useRef` creates a mutable container that persists across renders. In Crank, a local variable in the generator closure serves the same purpose, and the `ref` callback prop captures the DOM element.

```jsx
// React
function AutoFocus() {
  const inputRef = useRef(null);
  useEffect(() => inputRef.current.focus(), []);
  return <input ref={inputRef} />;
}

// Crank
function *AutoFocus() {
  let input = null;
  this.after(() => input && input.focus());

  for ({} of this) {
    yield <input ref={(el) => input = el} />;
  }
}
```

## Memoization

### useMemo → Manual Cache

In a generator, cached values persist across renders in the closure. You can compare inputs and recompute only when they change:

```jsx
// React
const sorted = useMemo(() => items.sort(compareFn), [items]);

// Crank
function *SortedList({items}) {
  let prevItems = null;
  let sorted = null;

  for ({items} of this) {
    if (items !== prevItems) {
      sorted = [...items].sort(compareFn);
      prevItems = items;
    }

    yield <ul>{sorted.map((item) => <li key={item.id}>{item.name}</li>)}</ul>;
  }
}
```

### useCallback → Function in Generator Scope

Functions created in the generator body persist across renders without any wrapper:

```jsx
// React
const handleClick = useCallback(() => doSomething(id), [id]);

// Crank
function *Component({id}) {
  // handleClick is created once and persists for the component's lifetime
  const handleClick = () => doSomething(id);

  for ({id} of this) {
    yield <button onclick={handleClick}>Click</button>;
  }
}
```

Note that `handleClick` closes over `id`, which is reassigned on each iteration of the `for...of` loop, so it always uses the current value.

### React.memo → Copy

To skip re-rendering a child, use the `Copy` element or the `copy` prop:

```jsx
// React
const MemoizedChild = React.memo(Child);

// Crank — using Copy element
import {Copy} from "@b9g/crank";

function *Parent({data}) {
  let prevData = undefined;

  for ({data} of this) {
    if (data === prevData) {
      yield <Copy />;
    } else {
      prevData = data;
      yield <Child data={data} />;
    }
  }
}

// Crank — using copy prop on a child element
<Child copy={data === prevData} data={data} />
```

## Reusable Logic

### Custom Hooks → Functions Taking Context

React custom hooks are functions that call other hooks. In Crank, the equivalent is a plain function that receives the component’s context as a parameter:

```jsx
// React
function useWindowSize() {
  const [size, setSize] = useState({width: 0, height: 0});
  useEffect(() => {
    const handler = () => setSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
    window.addEventListener("resize", handler);
    handler();
    return () => window.removeEventListener("resize", handler);
  }, []);
  return size;
}

// Crank
function trackWindowSize(ctx) {
  let size = {width: window.innerWidth, height: window.innerHeight};
  const handler = () => {
    ctx.refresh(() => {
      size = {width: window.innerWidth, height: window.innerHeight};
    });
  };

  window.addEventListener("resize", handler);
  ctx.cleanup(() => window.removeEventListener("resize", handler));
  return () => size;
}

// Usage
function *ResponsiveLayout() {
  const getSize = trackWindowSize(this);

  for ({} of this) {
    const {width} = getSize();
    yield <div>{width > 768 ? <DesktopNav /> : <MobileNav />}</div>;
  }
}
```

### Third-Party Library Integration

Here is an example wrapping [TanStack Virtual](https://tanstack.com/virtual/latest) for use in a Crank component:

```typescript
import {Virtualizer, VirtualizerOptions, observeElementOffset, observeElementRect, elementScroll} from "@tanstack/virtual-core";
import type {Context} from "@b9g/crank";

export function createVirtualizer<TItemElement extends Element>(
  ctx: Context,
  options: VirtualizerOptions<Element, TItemElement>,
): Virtualizer<Element, TItemElement> {
  const virtualizer = new Virtualizer({
    observeElementOffset,
    observeElementRect,
    scrollToFn: elementScroll,
    measureElement: (el, instance) => {
      return el.getBoundingClientRect()[
        instance.options.horizontal ? "width" : "height"
      ];
    },
    ...options,
  });

  ctx.after(() => {
    const unmount = virtualizer._didMount();
    ctx.cleanup(() => unmount && unmount());
  });

  const afterUpdate = () => {
    virtualizer._willUpdate();
    ctx.after(afterUpdate);
  };
  ctx.after(afterUpdate);

  return virtualizer;
}
```

The function name is a convention — `createVirtualizer`, `setupVirtualizer`, or `useVirtualizer` all work. The key is that it takes the Crank context as a parameter and uses `ctx.after()` and `ctx.cleanup()` for lifecycle integration.

## Events and Attributes

### Prop Naming

Crank accepts both React-style and standard HTML names. Standard names are preferred because they match the DOM and avoid ambiguity:

| React | Standard (preferred) |
|-------|---------------------|
| `className` | `class` |
| `htmlFor` | `for` |
| `onClick` | `onclick` |
| `onMouseOver` | `onmouseover` |
| `onChange` | `onchange` |

If both `class` and `className` are provided on the same element, `class` takes precedence.

### Style

The `style` prop accepts a string or an object. In object form, camelCase property names are converted to kebab-case, and numeric values receive a `px` suffix (except for unitless properties like `opacity`, `z-index`, and `flex-grow`):

```jsx
// String form
<div style="color: red; font-size: 16px" />

// Object form — camelCase is converted to kebab-case
<div style={{fontSize: 16, backgroundColor: "red"}} />
// Equivalent to: style="font-size: 16px; background-color: red"

// Kebab-case also works
<div style={{"font-size": "16px", "background-color": "red"}} />
```

### Class

The `class` prop accepts a string or an object. The object form provides built-in `clsx`/`classnames` behavior:

```jsx
// String
<div class="btn active" />

// Object — truthy values include the class, falsy values exclude it
<div class={{btn: true, active: isActive, disabled: isDisabled}} />
```

### SVG Props

React uses camelCase for SVG attributes (`strokeWidth`, `fillOpacity`, `textAnchor`). Crank accepts these and converts them to the correct kebab-case attributes, but the standard SVG names are preferred:

```jsx
// React
<circle strokeWidth="2" fillOpacity={0.5} />

// Crank — standard SVG names preferred
<circle stroke-width="2" fill-opacity={0.5} />
```

The `eslint-plugin-crank` package provides `no-react-svg-props` to flag camelCase SVG props.

### innerHTML

Crank uses `innerHTML` directly. React’s `dangerouslySetInnerHTML={{__html: "..."}}` syntax is also accepted and mapped to `innerHTML`:

```jsx
// React
<div dangerouslySetInnerHTML={{__html: htmlString}} />

// Crank — direct prop preferred
<div innerHTML={htmlString} />
```

As with React, be careful with unsanitized user input.

## Forms

### Controlled Inputs

A controlled input binds its value to a generator variable and updates it on change:

```jsx
// React
function SearchBox() {
  const [query, setQuery] = useState("");
  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}

// Crank
function *SearchBox() {
  let query = "";

  for ({} of this) {
    yield (
      <input
        value={query}
        oninput={(e) => this.refresh(() => query = e.target.value)}
      />
    );
  }
}
```

### Uncontrolled Inputs

The `copy` prop with a string value can exclude specific props from being re-applied on subsequent renders. `copy="!value"` tells Crank to re-apply all props *except* `value`, letting the browser manage the input’s value:

```jsx
// React
<input defaultValue="initial" />

// Crank
<input copy="!value" value="initial" />
```

## Async Patterns

### Async Function Components

Crank supports `async` function components, which return a promise that resolves to JSX. This eliminates loading-state boilerplate for simple data fetching:

```jsx
// React
function UserProfile({userId}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId).then((user) => {
      setUser(user);
      setLoading(false);
    });
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  return <div>{user.name}</div>;
}

// Crank
async function UserProfile({userId}) {
  const user = await fetchUser(userId);
  return <div>{user.name}</div>;
}
```

### Suspense and Lazy Loading

Crank provides `Suspense` and `lazy` in the `@b9g/crank/async` module:

```jsx
import {Suspense, lazy} from "@b9g/crank/async";

const LazyComponent = lazy(() => import("./LazyComponent"));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  );
}
```

### Loading Indicators with Async Generators

For more control over loading states, async generator components can race a loading indicator against async children using `for await...of`:

```jsx
async function *DataLoader({children}) {
  for await ({children} of this) {
    yield <div>Loading...</div>;
    yield children;
  }
}
```

The loading indicator displays first. If the async child resolves quickly, the indicator may never appear. If the child takes longer, the indicator shows until the child is ready. See the [Async Components guide](/guides/async-components) for details.

## Error Boundaries

React error boundaries require a class component with `getDerivedStateFromError` and `componentDidCatch`. In Crank, a `try`/`catch` around `yield` catches errors thrown by child components:

```jsx
// React
class ErrorBoundary extends React.Component {
  state = {hasError: false, error: null};

  static getDerivedStateFromError(error) {
    return {hasError: true, error};
  }

  render() {
    if (this.state.hasError) {
      return <div>Error: {this.state.error.message}</div>;
    }
    return this.props.children;
  }
}

// Crank
function *ErrorBoundary({children}) {
  for ({children} of this) {
    try {
      yield children;
    } catch (error) {
      yield <div>Error: {error.message}</div>;
    }
  }
}
```
