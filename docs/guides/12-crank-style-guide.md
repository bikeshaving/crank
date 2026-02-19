---
title: Crank Style Guide
description: Conventions for writing cranky code. Covers component structure, state, props, events, cleanup, DOM access, async patterns, and the philosophy behind them.
---

The key thesis of Crank is that JavaScript already has the primitives needed to build UIs.
Code which follows the conventions of Crank can humorously be called *cranky*, as in “This file solves the problem in a cranky way. Very nice.” Idiomatic Crank is code that leans on the language instead of fighting it. The following are the four core principles behind cranky code:

1. **Use the language.** Write vanilla JavaScript. Variables are state, control flow is lifecycle, `fetch()` is data fetching.
2. **Match the platform.** `class`, `for`, `onclick`, `innerHTML`. Use DOM’s names, not aliases, and adopt browser stylistic conventions.
3. **Own the execution.** Avoid unnecessary reactivity. Understanding the execution of components is your job: `this.refresh(() => ...)` makes it legible.
4. **Compose uniformly.** A component should resemble built-in elements: props in, events out.

For full explanations, see the [Components](/guides/components), [Lifecycles](/guides/lifecycles), and [Async Components](/guides/async-components) guides. Many of the conventions described in this document can be fixed automatically through the [`eslint-plugin-crank`](https://github.com/bikeshaving/crank/tree/main/packages/eslint-plugin-crank) package.

## Do’s and Don’ts

### Component Structure

✅ **Do** use `for...of this` for component iteration. `while (true)` renders correctly but never sees prop updates, and a missed `yield` causes the page to hang:

```jsx
function *Counter({count}) {
  // ❌ count is always the initial value
  while (true) {
    yield <div>{count}</div>;
  }
}

function *Counter({count}) {
  // ✅ for...of yields fresh props each render
  for ({count} of this) {
    yield <div>{count}</div>;
  }
}
```

**ESLint rule:** [`crank/prefer-props-iterator`](https://github.com/bikeshaving/crank/blob/main/packages/eslint-plugin-crank/src/rules/prefer-props-iterator.ts)

❌ **Don’t** put persistent state inside the loop. It resets on every render:

```jsx
function *Timer() {
  const id = setInterval(() => this.refresh(), 1000);
  for ({} of this) {
    // ❌ state inside the loop resets every render
    let seconds = 0; // reset to 0 every render
    seconds++;
    yield <p>{seconds}s</p>;
  }

  clearInterval(id);
}
```

✅ **Do** use the three-region structure of generator components: setup before the loop, render inside it, cleanup after it:

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

✅ **Do** return `null` for intentionally empty output, never `undefined`:

```jsx
// ❌ implicit undefined return
function MaybeGreeting({name}) {
  if (name) {
    return <div>Hello {name}</div>;
  }
}

function MaybeGreeting({name}) {
  if (name) {
    return <div>Hello {name}</div>;
  }
  // ✅ explicit null
  return null;
}
```

### State Updates

❌ **Don’t** mutate state or call `refresh()` as separate steps. It’s easy to forget one or the other, especially in longer handlers:

```jsx
function *Counter() {
  let count = 0;
  const onclick = () => {
    // ❌ separate mutation and refresh
    count++;
    this.refresh();
  };

  for ({} of this) {
    yield <button onclick={onclick}>Count: {count}</button>;
  }
}
```

✅ **Do** use the `this.refresh(() => ...)` callback form. It runs the mutation and triggers a re-render atomically, so you cannot forget one without the other. Group related mutations in a single callback rather than calling `refresh` multiple times:

```jsx
function *Counter() {
  let count = 0;
  const onclick = () => this.refresh(() => count++);

  for ({} of this) {
    yield <button onclick={onclick}>Count: {count}</button>;
  }
}

function *Form() {
  let name = "";
  let email = "";
  const onsubmit = (ev) => {
    ev.preventDefault();
    const data = new FormData(ev.target);
    // ✅ one refresh, multiple mutations
    this.refresh(() => {
      name = data.get("name");
      email = data.get("email");
    });
  };

  for ({} of this) {
    yield (
      <form onsubmit={onsubmit}>
        <input name="name" value={name} />
        <input name="email" value={email} />
        <button type="submit">Save</button>
        <p>{name} ({email})</p>
      </form>
    );
  }
}
```

**ESLint rule:** [`crank/prefer-refresh-callback`](https://github.com/bikeshaving/crank/blob/main/packages/eslint-plugin-crank/src/rules/prefer-refresh-callback.ts)

❌ **Don’t** call `refresh()` during execution or after unmount. It’s a no-op in both cases and will emit warnings:

```jsx
function *Example() {
  // ❌ refresh() during execution is a no-op
  this.refresh();

  for ({} of this) {
    yield <div />;
  }

  // ❌ refresh() after unmount is a no-op
  this.refresh();
}
```

Check `this.isExecuting` or `this.isUnmounted` if you need to suppress the warnings.

✅ **Do** use inline event handlers freely. There are no stale closures in Crank — handlers close over `let` variables that are reassigned each iteration, so they always see current values:

```jsx
function *Counter() {
  let count = 0;

  for ({} of this) {
    // ✅ always sees current count — no stale closure
    yield (
      <button onclick={() => this.refresh(() => count++)}>
        Count: {count}
      </button>
    );
  }
}
```

### Props

❌ **Don’t** destructure props in the parameter but skip in the `for...of` binding. `name` below is captured once and never updated:

```jsx
function *Greeting({name = "World"}) {
  // ❌ props captured once, never updated
  for ({} of this) {
    yield <p>Hello, {name}</p>;
  }
}
```

❌ **Don’t** destructure partially. Any prop missing from the `for...of` binding stays stale:

```jsx
function *Card({title, count}) {
  // ❌ count stays stale
  for ({title} of this) {
    yield <div>{title}: {count}</div>;
  }
}
```

✅ **Do** destructure every prop used in the loop body, with matching defaults in both positions:

```jsx
function *Greeting({name = "World", formal = false}) {
  // ✅ all props destructured with matching defaults
  for ({name = "World", formal = false} of this) {
    const prefix = formal ? "Dear" : "Hello";
    yield <p>{prefix}, {name}</p>;
  }
}
```

**ESLint rule:** [`crank/prop-destructuring-consistency`](https://github.com/bikeshaving/crank/blob/main/packages/eslint-plugin-crank/src/rules/prop-destructuring-consistency.ts)

### Derived Values

❌ **Don’t** redo expensive work on every render when the inputs haven’t changed:

```jsx
function *Report({data}) {
  for ({data} of this) {
    // ❌ recomputes every render
    const summary = computeExpensiveSummary(data);
    yield <div>{summary}</div>;
  }
}
```

✅ **Do** cache the result and compare inputs manually. Save current values after `yield` so they’re available as “old” values on the next iteration:

```jsx
function *Report({data}) {
  // Remember to make state lexically scoped
  let oldData;
  let summary;

  for ({data} of this) {
    // ✅ cached with manual comparison
    if (data !== oldData) {
      summary = computeExpensiveSummary(data);
    }

    yield <div>{summary}</div>;

    oldData = data;
  }
}
```

### Keys and Rendering Control

✅ **Do** use keys to control component identity. Crank matches elements by position, so the same component at the same position reuses its generator state by default. Keys force a fresh component when data identity changes:

```jsx
// ❌ stale state bleeds across users
yield <UserProfile userId={userId} />;

// ✅ key forces a fresh component
yield <UserProfile key={userId} userId={userId} />;
```

✅ **Do** key list items by stable identity. Without keys, Crank matches by position — reordering or filtering a list causes state to bleed between items:

```jsx
// ❌ positional matching — removing an item shifts state to the wrong component
yield <ul>{todos.map((t) => <TodoItem todo={t} />)}</ul>;

// ✅ stable key — each component tracks its own item
yield <ul>{todos.map((t) => <TodoItem key={t.id} todo={t} />)}</ul>;
```

✅ **Do** use `&&` for conditional rendering. Falsy values like `false` and `null` preserve their slot in the children array, so siblings don't shift positions:

```jsx
// ✅ falsy values preserve their slot
yield (
  <div>
    {showHeader && <Header />}
    <Main />
  </div>
);
```

✅ **Do** use `copy` to preserve subtrees when the child doesn't need to re-render:

```jsx
function *Dashboard() {
  let tab = "overview";
  for ({} of this) {
    yield (
      <div>
        <Tabs ontabchange={(ev) => this.refresh(() => tab = ev.detail)} />
        {/* ✅ copy preserves subtrees */}
        <Sidebar copy />
        {tab === "overview" ? <Overview /> : <Settings />}
      </div>
    );
  }
}
```

### Children and Composition

❌ **Don’t** use render props or functions-as-children. Generators already encapsulate state:

```jsx
function *App() {
  for ({} of this) {
    yield (
      <div>
        {/* ❌ render props and functions-as-children */}
        <DataProvider render={(data) => <Chart data={data} />} />
        <MouseTracker>{(pos) => <Tooltip x={pos.x} y={pos.y} />}</MouseTracker>
      </div>
    );
  }
}
```

✅ **Do** treat `children` as opaque — accept it and forward it into the element tree without inspecting or transforming it. For multiple insertion points, use named props as slots:

```jsx
function Layout({header, sidebar, children}) {
  return (
    <div class="layout">
      <header>{header}</header>
      <aside>{sidebar}</aside>
      {/* ✅ children forwarded as opaque */}
      <main>{children}</main>
    </div>
  );
}
```

If a parent needs to pass dynamic data to its children, use [provisions](/guides/reusable-logic#contextprovide-and-contextconsume) or restructure so the stateful component renders the child directly.

### Provisions

❌ **Don’t** use plain strings as provision keys. They risk collisions between unrelated libraries or components:

```jsx
function *App({children}) {
  // ❌ string keys risk collisions
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

✅ **Do** use symbols so provisions are private and collision-free:

```jsx
// ✅ symbol keys are private
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

✅ **Do** use provisions when siblings or distant descendants need shared data without prop drilling:

```jsx
// ✅ provisions for shared data without prop drilling
const LocaleKey = Symbol("locale");

function *App({locale, children}) {
  for ({locale, children} of this) {
    this.provide(LocaleKey, locale);
    yield children;
  }
}

function Price({amount}) {
  const locale = this.consume(LocaleKey);
  return <span>{amount.toLocaleString(locale)}</span>;
}
```

### Cleanup

❌ **Don’t** leave timers, listeners, or subscriptions without cleanup. They outlive the component and leak:

```jsx
function *Timer() {
  let s = 0;
  // ❌ no cleanup — interval leaks
  setInterval(() => this.refresh(() => s++), 1000);
  for ({} of this) {
    yield <div>{s}</div>;
  }
}
```

✅ **Do** choose the cleanup approach that fits the situation.

Post-loop cleanup is the simplest option for straightforward cases:

```jsx
function *Timer() {
  let s = 0;
  const id = setInterval(() => this.refresh(() => s++), 1000);

  for ({} of this) {
    yield <p>{s}s</p>;
  }

  // ✅ post-loop cleanup
  clearInterval(id);
}
```

`try`/`finally` ensures cleanup runs even when the component throws:

```jsx
function *Timer() {
  let s = 0;
  const id = setInterval(() => this.refresh(() => s++), 1000);
  // ✅ try/finally for error safety
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
  // ✅ this.cleanup() in a helper
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

**ESLint rule:** [`crank/require-cleanup-for-timers`](https://github.com/bikeshaving/crank/blob/main/packages/eslint-plugin-crank/src/rules/require-cleanup-for-timers.ts)

Note: `cleanup` callbacks persist across renders and fire once on unmount. `schedule` and `after` callbacks are one-shot; they must be re-registered inside the loop on each render.

### Refs and DOM Access

❌ **Don’t** use `this.schedule()` for operations that need the element to be live in the document. `schedule` fires after DOM nodes are created but *before* they are inserted:

```jsx
function *AutoFocusInput() {
  // ❌ schedule fires before element is in the document
  this.schedule((el) => el.focus()); // element is not in the document yet

  for ({} of this) {
    yield <input />;
  }
}
```

✅ **Do** capture elements with a `ref` callback and use `this.after()` for focus, measurement, and animations:

```jsx
function *AutoFocusInput() {
  let input = null;
  // ✅ ref + after() for live DOM access
  this.after(() => input && input.focus());

  for ({} of this) {
    yield <input ref={(el) => input = el} />;
  }
}
```

Use `this.schedule()` only for setup that must happen *before* the element is visible, like preventing layout shift or synchronous DOM configuration.

The `ref` callback fires once on the first commit for host elements (`<div>`, `<input>`, etc.) only. It does not fire on fragments, portals, or component elements. For components, `ref` is passed as a regular prop, just like `key`. Components that wrap a host element should forward `ref` to their root element so callers can access the underlying DOM node:

```jsx
function MyInput({ref, class: cls, ...props}) {
  // ✅ forward ref to the root element
  return <input ref={ref} class={"my-input " + cls} {...props} />;
}
```

### Events

❌ **Don’t** pass callback props down through multiple layers. It couples children to their parents and clutters intermediate components:

```jsx
function *App() {
  let todos = [];
  const ondelete = (id) => this.refresh(() => {
    todos = todos.filter((t) => t.id !== id);
  });

  for ({} of this) {
    // ❌ callback props couple parent and child
    yield <TodoList todos={todos} ondelete={ondelete} />;
  }
}
```

✅ **Do** use `dispatchEvent` in children and `addEventListener` in parents. Custom events bubble up the component tree, just like DOM events:

```jsx
function *TodoItem({todo}) {
  const ondelete = () => {
    // ✅ events bubble — children dispatch, parents listen
    this.dispatchEvent(new CustomEvent("tododelete", {
      bubbles: true,
      detail: {id: todo.id},
    }));
  };

  for ({todo} of this) {
    yield (
      <li>
        {todo.title}
        <button onclick={ondelete}>Delete</button>
      </li>
    );
  }
}

function *App() {
  let todos = [];

  this.addEventListener("tododelete", (ev) => {
    this.refresh(() => {
      todos = todos.filter((t) => t.id !== ev.detail.id);
    });
  });

  for ({} of this) {
    yield <ul>{todos.map((t) => <TodoItem key={t.id} todo={t} />)}</ul>;
  }
}
```

This mirrors how the DOM works: children signal intent via events, parents decide how to respond. No callback prop drilling required.

### Yield vs Return

✅ **Do** use `yield` for normal renders. `return` inside a generator loop terminates it and restarts from scratch on the next update, losing all local state. Reserve `return` for a final value when the component is intentionally done:

```jsx
// ❌ return restarts the generator
function *Greeting({name}) {
  for ({name} of this) {
    return <div>Hello {name}</div>;
  }
}

// ✅ yield preserves state
function *Greeting({name}) {
  for ({name} of this) {
    yield <div>Hello {name}</div>;
  }
}
```

### Async Components

❌ **Don’t** manage loading state manually with flags in a sync generator when an async component would be simpler:

```jsx
function *UserProfile({userId}) {
  let user = null;
  // ❌ manual loading flags in a sync generator
  let loading = true;
  fetch(`/api/users/${userId}`)
    .then((res) => res.json())
    .then((data) => this.refresh(() => { user = data; loading = false; }));

  for ({userId} of this) {
    yield loading ? <div>Loading...</div> : <div>{user.name}</div>;
  }
}
```

✅ **Do** use an async function component for one-shot data fetching:

```jsx
// ✅ async function for one-shot fetch
async function UserProfile({userId}) {
  const res = await fetch(`/api/users/${userId}`);
  const user = await res.json();
  return <div>{user.name}</div>;
}
```

✅ **Do** use an async generator with `for await...of` to race a loading indicator against async children:

```jsx
// ✅ async generator races loading against children
async function *DataLoader({children}) {
  for await ({children} of this) {
    yield <div>Loading...</div>;
    yield children;
  }
}
```

For declarative loading states and code splitting, use `Suspense` and `lazy` from `@b9g/crank/async`. See the [Async Components guide](/guides/async-components) for details.

### Error Handling

❌ **Don’t** reach for `try`/`catch` around `yield` as a first resort. It creates an error boundary that catches every failure in the child tree, including real bugs:

```jsx
function *Dashboard() {
  for ({} of this) {
    // ❌ error boundary catches everything, including bugs
    try {
      yield <MainContent />;
    } catch (err) {
      yield <div>Something went wrong</div>;
    }
  }
}
```

✅ **Do** handle errors at the source:

```jsx
// ✅ handle errors at the source
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

✅ **Do** use standard HTML attribute names, not React aliases. They match the DOM and let you paste HTML directly into components:

```jsx
// ❌ React prop names
function MyForm() {
  return (
    <div>
      <label className="label" htmlFor="name">Name</label>
      <input id="name" onClick={handler} />
    </div>
  );
}

// ✅ standard HTML attributes
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

The same applies to SVG attributes — use the standard kebab-case names:

```jsx
// ❌
<circle strokeWidth="2" fillOpacity={0.5} />

// ✅
<circle stroke-width="2" fill-opacity={0.5} />
```

**ESLint rule:** [`crank/no-react-svg-props`](https://github.com/bikeshaving/crank/blob/main/packages/eslint-plugin-crank/src/rules/no-react-svg-props.ts)

The `class` prop accepts objects for conditional classes, and the `style` prop accepts both strings and objects. See [Special Props and Components](/guides/special-props-and-components) for details.

### Reusable Logic

❌ **Don’t** extend `Context.prototype` to share behavior globally. It’s implicit, globally scoped, and can’t run setup logic:

```jsx
import {Context} from "@b9g/crank";
// ❌ global monkey-patching
Context.prototype.setInterval = function (callback, delay) {
  const id = window.setInterval(callback, delay);
  this.cleanup(() => clearInterval(id));
};
```

✅ **Do** write plain helper functions that accept a context. They compose, they’re explicit, and they’re just JavaScript:

```jsx
// ✅ plain helper function
function useInterval(ctx, callback, delay) {
  const id = setInterval(callback, delay);
  ctx.cleanup(() => clearInterval(id));
  return id;
}

function *Timer() {
  let seconds = 0;
  useInterval(this, () => this.refresh(() => seconds++), 1000);

  for ({} of this) {
    yield <p>{seconds}s</p>;
  }
}
```

Higher-order components and async iterators are also valid strategies: HOCs are useful when reusable logic needs to respond to prop updates, and async iterators are framework-agnostic. See [Reusable Logic](/guides/reusable-logic) for all four patterns with tradeoffs.
