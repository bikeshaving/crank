---
title: Crank Style Guide
description: Conventions for writing cranky code. Covers component structure, state, props, events, cleanup, DOM access, async patterns, and the philosophy behind them.
---

Crank’s design philosophy is that JavaScript already has the primitives you need to build UIs. Code that follows these conventions is *cranky*: idiomatic Crank that leans on the language instead of fighting it.

1. **Use the language.** Write vanilla JavaScript. Variables are state, control flow is lifecycle, `async`/`await` is data fetching. Crank adds a thin rendering layer and gets out of the way.
2. **Match the platform.** `class`, `for`, `onclick`, `innerHTML`. The DOM's names, not aliases.
3. **Own the execution.** You control when components re-render. There is no implicit reactivity. Understanding the execution of your components is the job; `this.refresh(() => ...)` makes it legible.
4. **Compose uniformly.** A component should look and behave like a built-in element: props in, events out, children nested. The abstraction boundary is the same as the platform’s.

For full explanations, see the [Components](/guides/components), [Lifecycles](/guides/lifecycles), and [Async Components](/guides/async-components) guides. The [`eslint-plugin-crank`](https://github.com/bikeshaving/crank/tree/main/packages/eslint-plugin-crank) package enforces many of these automatically.

### Component Structure

**Don't** use `while (true)`. The component renders but never sees prop updates, and a missing `yield` causes an infinite loop:

```jsx
function *Counter({count}) {
  while (true) {
    yield <div>{count}</div>; // count is always the initial value
  }
}
```

**Do** iterate over the context with `for...of this`. It yields fresh props on each render and makes infinite loops impossible:

```jsx
function *Counter({count}) {
  for ({count} of this) {
    yield <div>{count}</div>;
  }
}
```

**ESLint rule:** `crank/prefer-props-iterator`

**Don't** put persistent state inside the loop. It resets on every render:

```jsx
function *Timer() {
  const id = setInterval(() => this.refresh(), 1000);
  for ({} of this) {
    let seconds = 0; // reset to 0 every render
    seconds++;
    yield <p>{seconds}s</p>;
  }
  clearInterval(id);
}
```

**Do** use the three-region structure: setup before the loop, render inside it, cleanup after it:

```jsx
function *Timer() {
  // Setup — runs once on mount
  let seconds = 0;
  const id = setInterval(() => this.refresh(() => seconds++), 1000);

  // Render — runs on every update
  for ({} of this) {
    yield <p>{seconds}s</p>;
  }

  // Cleanup — runs once on unmount
  clearInterval(id);
}
```

**Don't** return `undefined` from a component. It produces a runtime warning:

```jsx
function MaybeGreeting({name}) {
  if (name) {
    return <div>Hello {name}</div>;
  }
  // implicit undefined return
}
```

**Do** return `null` for intentional empty output:

```jsx
function MaybeGreeting({name}) {
  if (name) {
    return <div>Hello {name}</div>;
  }
  return null;
}
```

### State Updates

**Don't** mutate state and call `refresh()` as separate steps. It's easy to forget one or the other, especially in longer handlers:

```jsx
function *Counter() {
  let count = 0;
  const onclick = () => {
    count++;
    this.refresh();
  };

  for ({} of this) {
    yield <button onclick={onclick}>Count: {count}</button>;
  }
}
```

**Do** use the `this.refresh(() => ...)` callback form. It runs the mutation and triggers a re-render atomically, so you cannot forget one without the other:

```jsx
function *Counter() {
  let count = 0;
  const onclick = () => this.refresh(() => count++);

  for ({} of this) {
    yield <button onclick={onclick}>Count: {count}</button>;
  }
}
```

Group related mutations in a single callback rather than calling `refresh` multiple times.

**ESLint rule:** `crank/prefer-refresh-callback`

Note: `refresh()` during execution (while `this.isExecuting` is `true`) or after unmount logs an error and does nothing. In practice this rarely comes up; event handlers fire asynchronously after rendering.

There are no stale closures in Crank. Handlers close over `let` variables that are reassigned each iteration, so they always see current values. Inline handlers are fine; Crank does not compare prop references to skip re-renders.

### Props

**Don’t** destructure props in the parameter but skip the `for...of` binding. `name` below is captured once and never updated:

```jsx
function *Greeting({name = "World"}) {
  for ({} of this) {
    yield <p>Hello, {name}</p>;
  }
}
```

**Don't** destructure partially. Any prop missing from the `for...of` binding stays stale:

```jsx
function *Card({title, count}) {
  for ({title} of this) {
    yield <div>{title}: {count}</div>;
  }
}
```

**Do** destructure every prop used in the loop body, with matching defaults in both positions:

```jsx
function *Greeting({name = "World", formal = false}) {
  for ({name = "World", formal = false} of this) {
    const prefix = formal ? "Dear" : "Hello";
    yield <p>{prefix}, {name}</p>;
  }
}
```

**ESLint rule:** `crank/prop-destructuring-consistency`

### Derived Values

**Don’t** recompute expensive work on every render when the inputs have not changed:

```jsx
function *FilteredList({items, threshold}) {
  for ({items, threshold} of this) {
    const filtered = items.filter((item) => item.value > threshold);
    yield (
      <ul>{filtered.map((item) => <li key={item.id}>{item.name}</li>)}</ul>
    );
  }
}
```

**Do** cache the result and compare inputs manually. Save current values after `yield` so they are available as “old” values on the next iteration:

```jsx
function *FilteredList({items, threshold}) {
  let oldItems = null;
  let oldThreshold = null;
  let filtered = [];

  for ({items, threshold} of this) {
    if (items !== oldItems || threshold !== oldThreshold) {
      filtered = items.filter((item) => item.value > threshold);
    }

    yield (
      <ul>{filtered.map((item) => <li key={item.id}>{item.name}</li>)}</ul>
    );

    oldItems = items;
    oldThreshold = threshold;
  }
}
```


### Keys and Rendering Control

Crank matches elements by position in the tree. When the same component appears at the same position with different data, its generator state is reused by default. Keys give you explicit control over when state should be kept and when it should be thrown away.

**Don’t** let stale component state bleed across unrelated data. If a `<UserProfile>` switches from one user to another, generator state from the first user persists (timers keep running, local variables keep their values):

```jsx
function *App({userId}) {
  for ({userId} of this) {
    yield <UserProfile userId={userId} />;
  }
}
```

**Do** use a key tied to the data identity. When the key changes, Crank destroys the old component and creates a fresh one:

```jsx
function *App({userId}) {
  for ({userId} of this) {
    yield <UserProfile key={userId} userId={userId} />;
  }
}
```

Keys are a rendering control mechanism, not list boilerplate. Use them whenever you want to force a fresh component: switching users, resetting forms, or swapping between views that should not share state.

Conditional rendering with `&&` is safe. Falsy values like `false` and `null` preserve their slot in the children array, so siblings do not shift positions.

The parent controls which subtrees re-render. Use `copy` to preserve them:

```jsx
function *Dashboard() {
  let tab = "overview";
  for ({} of this) {
    yield (
      <div>
        <Tabs ontabchange={(ev) => this.refresh(() => tab = ev.detail)} />
        <Sidebar copy />
        {tab === "overview" ? <Overview /> : <Settings />}
      </div>
    );
  }
}
```

### Children and Composition

**Don't** use render props or functions-as-children. Generators already encapsulate state:

```jsx
function *App() {
  for ({} of this) {
    yield (
      <div>
        <DataProvider render={(data) => <Chart data={data} />} />
        <MouseTracker>{(pos) => <Tooltip x={pos.x} y={pos.y} />}</MouseTracker>
      </div>
    );
  }
}
```

**Do** accept `children` and render it in the element tree. For multiple insertion points, use named props as slots:

```jsx
function Layout({header, sidebar, children}) {
  return (
    <div class="layout">
      <header>{header}</header>
      <aside>{sidebar}</aside>
      <main>{children}</main>
    </div>
  );
}
```

If a parent needs to pass dynamic data to its children, use [provisions](/guides/reusable-logic#contextprovide-and-contextconsume) or restructure so the stateful component renders the child directly.

### Provisions

**Don't** use plain strings as provision keys. They risk collisions between unrelated libraries or components:

```jsx
function *App({children}) {
  this.provide("theme", "dark");
  for ({children} of this) {
    yield children;
  }
}

function Toolbar() {
  const theme = this.consume("theme"); // could collide with another library
  return <div class={theme}>Toolbar</div>;
}
```

**Do** use symbols so provisions are private and collision-free:

```jsx
const ThemeKey = Symbol("theme");

function *ThemeProvider({theme, children}) {
  for ({theme, children} of this) {
    this.provide(ThemeKey, theme);
    yield children;
  }
}

function ThemedButton({children}) {
  const theme = this.consume(ThemeKey);
  return <button class={theme}>{children}</button>;
}
```

Note that consumers do not automatically re-render when a provided value changes. When the provider yields new children, descendants re-render naturally as part of the subtree update.

### Cleanup

**Don't** leave timers, listeners, or subscriptions without cleanup. They outlive the component and leak:

```jsx
function *Timer() {
  let s = 0;
  setInterval(() => this.refresh(() => s++), 1000);
  for ({} of this) {
    yield <div>{s}</div>;
  }
}
```

**Do** choose the cleanup approach that fits the situation.

Post-loop cleanup is the simplest option for straightforward cases:

```jsx
function *Timer() {
  let s = 0;
  const id = setInterval(() => this.refresh(() => s++), 1000);

  for ({} of this) {
    yield <p>{s}s</p>;
  }

  clearInterval(id);
}
```

`try`/`finally` ensures cleanup runs even when the component throws:

```jsx
function *Timer() {
  let s = 0;
  const id = setInterval(() => this.refresh(() => s++), 1000);
  try {
    for ({} of this) {
      yield <p>{s}s</p>;
    }
  } finally {
    clearInterval(id);
  }
}
```

`this.cleanup()` is best when teardown logic lives in a helper function outside the component:

```jsx
function createInterval(ctx, callback, delay) {
  const id = setInterval(callback, delay);
  ctx.cleanup(() => clearInterval(id));
  return id;
}

function *Timer() {
  let s = 0;
  createInterval(this, () => this.refresh(() => s++), 1000);

  for ({} of this) {
    yield <p>{s}s</p>;
  }
}
```

**ESLint rule:** `crank/require-cleanup-for-timers`

Note: `cleanup` callbacks persist across renders and fire once on unmount. `schedule` and `after` callbacks are one-shot; they must be re-registered inside the loop on each render.

### Refs and DOM Access

**Don't** use `this.schedule()` for operations that need the element to be live in the document. `schedule` fires after DOM nodes are created but *before* they are inserted:

```jsx
function *AutoFocusInput() {
  this.schedule((el) => el.focus()); // element is not in the document yet

  for ({} of this) {
    yield <input />;
  }
}
```

**Do** capture elements with a `ref` callback and use `this.after()` for focus, measurement, and animations:

```jsx
function *AutoFocusInput() {
  let input = null;
  this.after(() => input && input.focus());

  for ({} of this) {
    yield <input ref={(el) => input = el} />;
  }
}
```

Use `this.schedule()` only for setup that must happen *before* the element is visible, like preventing layout shift or synchronous DOM configuration.

### Lifecycle Callbacks

**Don't** return JSX from `schedule`, `after`, or `cleanup` callbacks. They are side-effect hooks, not render points. Returned elements are silently discarded:

```jsx
function *Component() {
  this.schedule(() => <div />);
  this.after(() => { return <div />; });

  for ({} of this) {
    yield <div />;
  }
}
```

**Do** use lifecycle callbacks for side effects only, and yield in the main generator body:

```jsx
function *Component() {
  this.after((el) => el.focus());

  for ({} of this) {
    yield <input />;
  }
}
```

**ESLint rule:** `crank/no-yield-in-lifecycle-methods`

### Yield vs Return

**Don't** use `return` inside a generator loop. It terminates the generator and restarts it from scratch on the next update, losing all local state:

```jsx
function *Greeting({name}) {
  for ({name} of this) {
    return <div>Hello {name}</div>;
  }
}
```

**Do** use `yield` for normal renders. Reserve `return` for a final value when the component is intentionally done:

```jsx
function *Greeting({name}) {
  for ({name} of this) {
    yield <div>Hello {name}</div>;
  }
}
```

### Async Components

**Don’t** manage loading state manually with flags in a sync generator when an async component would be simpler:

```jsx
function *UserProfile({userId}) {
  let user = null;
  let loading = true;
  fetch(`/api/users/${userId}`)
    .then((res) => res.json())
    .then((data) => this.refresh(() => { user = data; loading = false; }));

  for ({userId} of this) {
    yield loading ? <div>Loading...</div> : <div>{user.name}</div>;
  }
}
```

**Do** use an async function component for one-shot data fetching:

```jsx
async function UserProfile({userId}) {
  const res = await fetch(`/api/users/${userId}`);
  const user = await res.json();
  return <div>{user.name}</div>;
}
```

**Do** use an async generator with `for await...of` to race a loading indicator against async children:

```jsx
async function *DataLoader({children}) {
  for await ({children} of this) {
    yield <div>Loading...</div>;
    yield children;
  }
}
```

For declarative loading states and code splitting, use `Suspense` and `lazy` from `@b9g/crank/async`. See the [Async Components guide](/guides/async-components) for details.

### Error Handling

**Don't** reach for `try`/`catch` around `yield` as a first resort. It creates an error boundary that catches every failure in the child tree, including real bugs:

```jsx
function *Dashboard() {
  for ({} of this) {
    try {
      yield <MainContent />;
    } catch (err) {
      yield <div>Something went wrong</div>;
    }
  }
}
```

**Do** handle errors at the source:

```jsx
async function UserProfile({userId}) {
  const res = await fetch(`/api/users/${userId}`).catch(() => null);
  if (!res?.ok) {
    return <div>Could not load user</div>;
  }
  const user = await res.json();
  return <div>{user.name}</div>;
}
```

### Avoid React-isms

React aliases like `className`, `htmlFor`, and `onClick` happen to work in Crank
because they are writable DOM properties, but cranky code does not use them.

**Don't** use React prop names:

```jsx
function MyForm() {
  return (
    <div>
      <label className="label" htmlFor="name">Name</label>
      <input id="name" onClick={handler} />
    </div>
  );
}
```

**Do** use standard HTML attribute names. They match the DOM and let you paste
HTML directly into components:

```jsx
function MyForm() {
  return (
    <div>
      <label class="label" for="name">Name</label>
      <input id="name" onclick={handler} />
    </div>
  );
}
```

Crank uses `innerHTML` directly as a prop. There is no
`dangerouslySetInnerHTML` wrapper.

The `class` prop accepts objects for conditional classes, and the `style` prop accepts both strings and objects. See [Special Props and Components](/guides/special-props-and-components) for details.

**Don't** reach for a state management library when local variables and provisions will do. A `let` in a generator is state. `this.provide()` and `this.consume()` with symbol keys share it across a subtree. See [Reusable Logic](/guides/reusable-logic) for patterns that scale further.
