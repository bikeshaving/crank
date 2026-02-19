---
title: Crank Style Guide
description: Conventions for writing cranky code. Covers component structure, state, props, events, cleanup, DOM access, async patterns, and the philosophy behind them.
---

The key thesis behind Crank is that JavaScript already has all the primitives you need to build UIs. Code which follows this principle can humorously be called *cranky*, as in "This file solves the problem in a cranky way. Very nice." The following are the four core principles behind idiomatic Crank code:

1. **Use the language.** Write vanilla JavaScript. Variables are state, control flow is lifecycle, `fetch()` does data fetching.
2. **Match the platform.** Prefer props like `class`, `for`, `onclick`, `innerHTML`. Use DOM names and conventions.
3. **Own the execution.** Avoid unnecessary reactive abstractions. Understanding the execution of components is your job and `this.refresh(() => ...)` makes it legible.
4. **Compose uniformly.** A component should resemble built-in elements: props in, events out.

For full explanations, see the [Components](/guides/components), [Lifecycles](/guides/lifecycles), and [Async Components](/guides/async-components) guides. Many of the conventions described in this document can be fixed automatically through the [`eslint-plugin-crank`](https://github.com/bikeshaving/crank/tree/main/packages/eslint-plugin-crank) package.

## Do's and Don'ts

### Component Structure

✅ **Do** use a plain function when the component has no state or lifecycle needs:

```jsx
// ✅ plain function for stateless components
function Greeting({name}) {
  return <div>Hello, {name}</div>;
}
```

❌ **Don't** use arrow functions for components. They can't be generators and don't have their own `this`, so they can't access the component context:

```jsx
// ❌ arrow functions can't be generators or access this
const Counter = () => {
  // this.refresh is not available
  return <div />;
};

// ✅ function declarations work with this and generators
function *Counter() {
  for ({} of this) {
    yield <div />;
  }
}
```

✅ **Do** use `for...of this` for component iteration. A `while (true)` loop renders correctly but never sees prop updates, and a missed `yield` causes the page to hang:

```jsx
function *Counter({label}) {
  let count = 0;
  const onclick = () => this.refresh(() => count++);
  // ❌ while (true) — label never updates
  while (true) {
    yield <button onclick={onclick}>{label}: {count}</button>;
  }
}

function *Counter({label}) {
  let count = 0;
  const onclick = () => this.refresh(() => count++);
  // ✅ for...of receives fresh props each render
  for ({label} of this) {
    yield <button onclick={onclick}>{label}: {count}</button>;
  }
}

// ✅ for ({} of this) when the component has no props
function *Counter() {
  let count = 0;
  const onclick = () => this.refresh(() => count++);
  for ({} of this) {
    yield <button onclick={onclick}>{count}</button>;
  }
}
```

**ESLint rule:** [`crank/prefer-props-iterator`](https://github.com/bikeshaving/crank/blob/main/packages/eslint-plugin-crank/src/rules/prefer-props-iterator.ts)

❌ **Don't** put persistent state inside the loop. It resets on every render:

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

❌ **Don't** `return` from a generator loop unless you want it to restart from scratch on the next update, losing all local state:

```jsx
// ❌ return restarts the generator — state is lost
function *Greeting({name}) {
  for ({name} of this) {
    return <div>Hello {name}</div>;
  }
}

// ✅ yield preserves state across renders
function *Greeting({name}) {
  for ({name} of this) {
    yield <div>Hello {name}</div>;
  }
}
```

### State Updates

❌ **Don't** mutate state or call `refresh()` as separate steps. It's easy to forget one or the other, especially in longer handlers:

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

❌ **Don't** call `refresh()` during execution or after unmount. It's a no-op in both cases and will emit warnings:

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

❌ **Don't** destructure props in the parameter but skip in the `for...of` binding. `name` below is captured once and never updated:

```jsx
function *Greeting({name = "World"}) {
  // ❌ props captured once, never updated
  for ({} of this) {
    yield <p>Hello, {name}</p>;
  }
}
```

❌ **Don't** destructure partially. Any prop missing from the `for...of` binding stays stale:

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

✅ **Do** use standard SVG attribute names, not React's camelCase rewrites:

```jsx
// ❌
<circle strokeWidth="2" fillOpacity={0.5} />

// ✅
<circle stroke-width="2" fill-opacity={0.5} />
```

**ESLint rule:** [`crank/no-react-svg-props`](https://github.com/bikeshaving/crank/blob/main/packages/eslint-plugin-crank/src/rules/no-react-svg-props.ts)

### Events

❌ **Don't** use camelCased event props. Crank passes event attributes directly to the DOM:

```jsx
// ❌ React-style camelCase
<input onChange={handler} onKeyDown={handler} />

// ✅ DOM event names
<input onchange={handler} onkeydown={handler} />
```

❌ **Don't** pass callback props down through multiple layers. It couples children to their parents and clutters intermediate components:

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

### Identity

✅ **Do** use keys to control component identity. Crank matches elements by position, so the same component at the same position reuses its generator state by default. Keys force a fresh component when data identity changes:

```jsx
// ❌ stale state bleeds across users
yield <UserProfile userId={userId} />;

// ✅ key forces a fresh component
yield <UserProfile key={userId} userId={userId} />;
```

❌ **Don't** omit keys or key list items by array index. Without stable keys, Crank matches by position — reordering or filtering a list causes state to bleed between items:

```jsx
// ❌ no keys — removing an item shifts state to the wrong component
yield <ul>{todos.map((t) => <TodoItem todo={t} />)}</ul>;

// ❌ array index is equally unstable
yield <ul>{todos.map((t, i) => <TodoItem key={i} todo={t} />)}</ul>;
```

✅ **Do** key list items by stable identity:

```jsx
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

✅ **Do** use distinct component functions when you want Crank to treat elements as different types. Swapping the tag unmounts the old instance and mounts a fresh one:

```jsx
function *CreateForm() { /* ... */ }
function *EditForm() { /* ... */ }

function *App() {
  for ({mode} of this) {
    // switching the tag creates a fresh instance
    yield mode === "create" ? <CreateForm /> : <EditForm />;
  }
}
```

### Cleanup

❌ **Don't** leave timers, listeners, or subscriptions without cleanup. They outlive the component and leak:

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

✅ **Do** clean up after the loop when setup and teardown are both visible in the component body:

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

✅ **Do** wrap the loop in `try`/`finally` when the component might throw:

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

✅ **Do** use `this.cleanup()` when registering teardown from a helper function:

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

### DOM Access

✅ **Do** use `ref` callbacks to capture host elements for later use:

```jsx
function *Measurable() {
  let el = null;
  for ({} of this) {
    // ✅ ref fires once on first commit
    yield <div ref={(node) => el = node} />;
  }
}
```

✅ **Do** forward `ref` to the root host element in wrapper components so callers can access the underlying DOM node:

```jsx
function MyInput({ref, class: cls, ...props}) {
  // ✅ forward ref to the root element
  return <input ref={ref} class={"my-input " + cls} {...props} />;
}
```

✅ **Do** use `this.after()` for DOM operations that need the element to be live, like focus, measurement, and animations. It is one-shot and must be re-registered each render:

```jsx
function *AutoFocusInput() {
  for ({} of this) {
    // ✅ after() fires once the element is in the document
    this.after((input) => input.focus());
    yield <input />;
  }
}
```

### Async Components

❌ **Don't** manage loading state manually with flags in a sync generator when an async component would be simpler:

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

✅ **Do** use `Suspense` and `lazy` from `@b9g/crank/async` for declarative loading states and code splitting. See the [Async Components guide](/guides/async-components) for details.

### Error Handling

❌ **Don't** reach for `try`/`catch` around `yield` as a first resort. It creates an error boundary that catches every failure in the child tree, including real bugs:

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

### Composition

❌ **Don't** use render props or functions-as-children. Generators already encapsulate state:

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

❌ **Don't** use plain strings as provision keys. They risk collisions between unrelated libraries or components:

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

### Reusable Logic

❌ **Don't** extend `Context.prototype` to share behavior globally. It's implicit, globally scoped, and can't run setup logic:

```jsx
import {Context} from "@b9g/crank";
// ❌ global monkey-patching
Context.prototype.setInterval = function (callback, delay) {
  const id = window.setInterval(callback, delay);
  this.cleanup(() => clearInterval(id));
};
```

✅ **Do** write plain helper functions that accept a context. They compose, they're explicit, and they're just JavaScript:

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

✅ **Do** use higher-order components to wrap rendering logic around existing components. For example, a `memo` wrapper uses `<Copy />` to skip re-renders when props haven't changed:

```jsx
import {Copy} from "@b9g/crank";

// ✅ higher-order component
function memo(Component) {
  return function *Memoized(props) {
    yield <Component {...props} />;
    for (const newProps of this) {
      if (shallowEqual(props, newProps)) {
        yield <Copy />;
      } else {
        yield <Component {...newProps} />;
      }

      props = newProps;
    }
  };
}
```

See [Reusable Logic](/guides/reusable-logic) for alternative approaches and tradeoffs.

### TypeScript

✅ **Do** annotate `this: Context<typeof Component>` in generator components. It's required in strict mode and infers the props type from the component definition:

```tsx
import type {Context} from "@b9g/crank";

function *Timer(this: Context<typeof Timer>) {
  let seconds = 0;
  const id = setInterval(() => this.refresh(() => seconds++), 1000);

  for ({} of this) {
    yield <div>{seconds}s</div>;
  }

  clearInterval(id);
}
```

✅ **Do** type props inline in the function parameter:

```tsx
function *Greeting(
  this: Context<typeof Greeting>,
  {name = "World"}: {name?: string},
) {
  for ({name = "World"} of this) {
    yield <div>Hello, {name}</div>;
  }
}
```

✅ **Do** use `Children` for the children prop type, including named slots:

```tsx
import {Children} from "@b9g/crank";

function Layout({header, sidebar, children}: {
  header: Children,
  sidebar: Children,
  children: Children,
}) {
  return (
    <div class="layout">
      <header>{header}</header>
      <aside>{sidebar}</aside>
      <main>{children}</main>
    </div>
  );
}
```

✅ **Do** augment `EventMap` and `ProvisionMap` for typed events and provisions:

```tsx
declare global {
  module Crank {
    interface EventMap {
      "tododelete": CustomEvent<{id: string}>;
    }

    interface ProvisionMap {
      theme: "light" | "dark";
    }
  }
}
```

### Performance

❌ **Don't** redo expensive work on every render when the inputs haven't changed:

```jsx
function *Report({data}) {
  for ({data} of this) {
    // ❌ recomputes every render
    const summary = computeExpensiveSummary(data);
    yield <div>{summary}</div>;
  }
}
```

✅ **Do** cache the result and compare inputs manually. Save current values after `yield` so they're available as "old" values on the next iteration:

```jsx
function *Report({data}) {
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
