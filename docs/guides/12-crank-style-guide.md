---
title: Crank Style Guide
description: Conventions for writing cranky code. Covers component structure, state, props, events, cleanup, DOM access, async patterns, and the philosophy behind them.
---

Crank is built on the thesis that JavaScript already has all the primitives you need to build UIs. Idiomatic Crank code can humorously be called *cranky*. The following are its four core principles:

1. **Use the language.** Write vanilla JavaScript. Variables are state, control flow handles lifecycle, `fetch()` does data fetching.
2. **Match the platform.** Use DOM names and conventions: `class`, `for`, `onclick`, `innerHTML`, not framework-specific alternatives.
3. **Own the execution.** Avoid complex reactive abstractions. Explicit `this.refresh()` calls make state changes legible.
4. **Compose uniformly.** A component should resemble built-in elements: props in, events out.

For full explanations, see the [Components](03-components.md), [Lifecycles](07-lifecycles.md), and [Async Components](05-async-components.md) guides. Many of the conventions described in this document can be fixed automatically through the [`eslint-plugin-crank`](https://github.com/bikeshaving/crank/tree/main/packages/eslint-plugin-crank) package.

## Do’s and Don’ts

### Component Structure

✅ **Do** use a plain function when the component has no state or lifecycle needs:

```jsx
// ✅ plain function for stateless components
function Greeting({name}) {
  return <div>Hello, {name}</div>;
}
```

❌ **Don’t** use arrow functions for components:

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

❌ **Don't** use `while (true)` for component iteration:

```jsx
function *Counter({label}) {
  let count = 0;
  const onclick = () => this.refresh(() => count++);
  // ❌ label never updates
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

✅ **Do** use the three-region structure of generator components: setup before the loop, render inside it, cleanup after it:

```jsx
function *Timer() {
  // Setup: runs once on mount
  let seconds = 0;
  const id = setInterval(() => this.refresh(() => seconds++), 1000);

  for ({} of this) {
    // Render: runs on every update
    yield <p>{seconds}s</p>;
  }

  // Cleanup: runs once on unmount
  clearInterval(id);
}
```

❌ **Don’t** put persistent state inside the loop. It resets on every render:

```jsx
function *Counter() {
  for ({} of this) {
    // ❌ resets to 0 on every render, counter never advances
    let count = 0;
    const onclick = () => this.refresh(() => count++);
    yield <button onclick={onclick}>Count: {count}</button>;
  }
}
```

❌ **Don’t** assume code after `yield` runs in the current render:

```jsx
function *Logger() {
  for ({} of this) {
    yield <div>Hello</div>;
    // ❌ this runs on the NEXT render, not after the current one
    console.log(document.querySelector("div").textContent);
  }
}

function *Logger() {
  for ({} of this) {
    // ✅ this.after() runs after the current render commits
    this.after(() => console.log(document.querySelector("div").textContent));
    yield <div>Hello</div>;
  }
}

// ✅ for await...of continues past yield immediately
async function *Logger() {
  for await ({} of this) {
    yield <div>Hello</div>;
    // runs right after this render commits
    console.log(document.querySelector("div").textContent);
  }
}
```

❌ **Don’t** `return` from a generator loop unless you want it to restart from scratch on the next update, losing all local state:

```jsx
// ❌ return restarts the generator, state is lost
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

✅ **Do** return `null` for intentionally empty output, never `undefined`:

```jsx
// ❌ implicit undefined return
function MaybeGreeting({name}) {
  if (name) {
    return <div>Hello {name}</div>;
  }
}

// ✅ explicit null
function MaybeGreeting({name}) {
  if (name) {
    return <div>Hello {name}</div>;
  }

  return null;
}
```

❌ **Don't** use `<Fragment>` when `<>` suffices:

```jsx
// ❌ verbose
yield (
  <Fragment>
    <Header />
    <Main />
  </Fragment>
);

// ✅ short syntax
yield (
  <>
    <Header />
    <Main />
  </>
);

// ✅ Fragment when a key is needed
yield items.map((item) => (
  <Fragment key={item.id}>
    <dt>{item.term}</dt>
    <dd>{item.definition}</dd>
  </Fragment>
));
```

### State Updates

❌ **Don’t** mutate state and call `refresh()` as separate steps:

```jsx
function *Counter() {
  let count = 0;
  // ❌ easy to forget one or the other in longer handlers
  const onclick = () => {
    count++;
    this.refresh();
  };

  // ✅ refresh(() => ...) runs mutation and re-render atomically
  const onclick = () => this.refresh(() => count++);

  for ({} of this) {
    yield <button onclick={onclick}>Count: {count}</button>;
  }
}
```

**ESLint rule:** [`crank/prefer-refresh-callback`](https://github.com/bikeshaving/crank/blob/main/packages/eslint-plugin-crank/src/rules/prefer-refresh-callback.ts)

❌ **Don’t** call `refresh()` during execution or after unmount:

```jsx
function *Example() {
  // ❌ no-op during execution, emits a warning
  this.refresh();

  for ({} of this) {
    yield <div />;
  }

  // ❌ no-op after unmount, emits a warning
  this.refresh();
}
```

### Props and Events

❌ **Don’t** destructure props in the parameter but skip them in the `for...of` binding:

```jsx
function *Greeting({name = "World"}) {
  // ❌ name captured once, never updated
  for ({} of this) {
    yield <p>Hello, {name}</p>;
  }
}

function *Greeting({name = "World", formal = false}) {
  // ✅ destructure every prop used in the body, with matching defaults
  for ({name = "World", formal = false} of this) {
    const prefix = formal ? "Dear" : "Hello";
    yield <p>{prefix}, {name}</p>;
  }
}
```

**ESLint rule:** [`crank/prop-destructuring-consistency`](https://github.com/bikeshaving/crank/blob/main/packages/eslint-plugin-crank/src/rules/prop-destructuring-consistency.ts)

❌ **Don’t** use React-style attribute names:

```jsx
// ❌ React aliases: Crank uses standard HTML, SVG, and DOM event names
<label className="label" htmlFor="name">Name</label>
<input onChange={handler} onKeyDown={handler} />
<circle strokeWidth="2" fillOpacity={0.5} />

// ✅ standard DOM names
<label class="label" for="name">Name</label>
<input onchange={handler} onkeydown={handler} />
<circle stroke-width="2" fill-opacity={0.5} />
```

**ESLint rules:** [`crank/no-react-props`](https://github.com/bikeshaving/crank/blob/main/packages/eslint-plugin-crank/src/rules/no-react-props.ts), [`crank/no-react-event-props`](https://github.com/bikeshaving/crank/blob/main/packages/eslint-plugin-crank/src/rules/no-react-event-props.ts), [`crank/no-react-svg-props`](https://github.com/bikeshaving/crank/blob/main/packages/eslint-plugin-crank/src/rules/no-react-svg-props.ts)

❌ **Don’t** pass callback props down through multiple layers:

```jsx
function *App() {
  let todos = [];
  // ❌ couples parent and child, clutters intermediate components
  const ondelete = (id) => this.refresh(() => {
    todos = todos.filter((t) => t.id !== id);
  });

  for ({} of this) {
    yield <TodoList todos={todos} ondelete={ondelete} />;
  }
}
```

✅ **Do** use `dispatchEvent` in children and `addEventListener` in parents. Custom events bubble up the component tree, just like DOM events:

```jsx
class TodoDeleteEvent extends CustomEvent {
  constructor(id) {
    super("tododelete", {bubbles: true, detail: {id}});
  }
}

function *TodoItem({todo}) {
  const ondelete = () => {
    // ✅ events bubble: children dispatch, parents listen
    this.dispatchEvent(new TodoDeleteEvent(todo.id));
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

✅ **Do** use inline event handlers freely:

```jsx
function *Counter() {
  let count = 0;

  for ({} of this) {
    // ✅ no stale closures, let variables are reassigned each iteration
    yield (
      <button onclick={() => this.refresh(() => count++)}>
        Count: {count}
      </button>
    );
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

❌ **Don’t** key by array index:

```jsx
// ❌ equivalent to no key; state shifts when items reorder
yield <ul>{todos.map((t, i) => <TodoItem key={i} todo={t} />)}</ul>;
```

✅ **Do** use stable, unique identifiers as keys so each component tracks its own data across reorders and removals. Positional matching (no keys) is fine for static content:

```jsx
// ✅ stable key, each component tracks its own item
yield <ul>{todos.map((t) => <TodoItem key={t.id} todo={t} />)}</ul>;

// ✅ positional matching is fine for static lists
yield <ul>{items.map((item) => <li>{item.name}</li>)}</ul>;
```

✅ **Do** use `&&`, `||`, and `??` for conditional rendering. The values `true`, `false`, `null`, and `undefined` all render as empty but preserve their slot in the children array, so siblings don’t shift positions:

```jsx
// ✅ falsy values preserve their slot
yield (
  <div>
    {showHeader && <Header />}
    {error || <Main />}
    {customFooter ?? <DefaultFooter />}
  </div>
);
```

✅ **Do** use distinct component functions when you want Crank to treat elements as different types. Swapping the tag unmounts the old instance and mounts a fresh one:

```jsx
function *CreateForm() { /* ... */ }
function *EditForm() { /* ... */ }

function *App({mode}) {
  for ({mode} of this) {
    // switching the tag creates a fresh instance
    yield mode === "create" ? <CreateForm /> : <EditForm />;
  }
}
```

✅ **Do** use an incrementing counter in the outer scope when you need component instance IDs:

```jsx
let nextId = 0;
function *DynamicField({label}) {
  // unique per instance, stable across re-renders
  const id = `field-${nextId++}`;

  for ({label} of this) {
    yield (
      <>
        <label for={id}>{label}</label>
        <input id={id} />
      </>
    );
  }
}
```

### Cleanup

❌ **Don’t** leave timers, listeners, or subscriptions without cleanup. They outlive the component and leak:

```jsx
function *Timer() {
  let s = 0;
  // ❌ no cleanup, interval leaks
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
      yield (
        <div>
          <p>{s}s</p>
          <SomeChild />
        </div>
      );
    }
  } finally {
    clearInterval(id);
  }
}
```

✅ **Do** use `this.cleanup()` when registering teardown from a helper function, or when you want to colocate cleanup with the variable:

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

✅ **Do** use `Symbol.dispose` and `Symbol.asyncDispose` with `using` declarations for automatic resource cleanup. Generator components are naturally compatible with the [Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management) proposal:

```jsx
function *Component() {
  using connection = openConnection();
  // connection[Symbol.dispose]() is called automatically when the generator returns

  for ({} of this) {
    yield <div>{connection.status}</div>;
  }
}

async function *AsyncComponent() {
  await using stream = await openStream();
  // stream[Symbol.asyncDispose]() is called automatically when the generator returns

  for ({} of this) {
    yield <div>{stream.status}</div>;
  }
}
```

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

❌ **Don't** place `this.schedule()` or `this.after()` outside the loop unless you only want them to fire once:

```jsx
function *AutoSave({data}) {
  // ❌ only fires on mount, not on updates
  this.after(() => save(data));

  for ({data} of this) {
    yield <Form data={data} />;
  }
}

function *AutoSave({data}) {
  for ({data} of this) {
    // ✅ fires after every render
    this.after(() => save(data));
    yield <Form data={data} />;
  }
}
```

❌ **Don't** perform DOM operations that require connected nodes in `ref` or `this.schedule()` callbacks:

```jsx
function *AutoFocusInput() {
  for ({} of this) {
    // ❌ ref fires before the node is connected to the document
    yield <input ref={(node) => node.focus()} />;
  }
}

function *AutoFocusInput() {
  // ❌ schedule fires before the node is connected to the document
  this.schedule(() => document.querySelector("input").focus());
  for ({} of this) {
    yield <input />;
  }
}

function *AutoFocusInput() {
  for ({} of this) {
    // ✅ after() fires once the node is connected
    this.after((input) => input.focus());
    yield <input />;
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

// ✅ async function for one-shot fetch
async function UserProfile({userId}) {
  const res = await fetch(`/api/users/${userId}`);
  const user = await res.json();
  return <div>{user.name}</div>;
}
```

✅ **Do** use `Suspense` from `@b9g/crank/async` for loading states. It races a fallback against async children so you don't have to wire up the `for await...of` pattern yourself:

```jsx
import {Suspense} from "@b9g/crank/async";

// ✅ declarative loading state
function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserProfile userId={userId} />
    </Suspense>
  );
}
```

See the [Async Components guide](05-async-components.md) for details on `Suspense`, `SuspenseList`, and `lazy`.

### Error Handling

❌ **Don't** throw errors for expected conditions like validation or missing data. Reserve `try`/`catch` of `yield` for truly unexpected errors:

```jsx
// ❌ throwing for validation
function ContactForm({email}) {
  if (!email.includes("@")) {
    throw new Error("Invalid email");
  }

  return <div>Contact: {email}</div>;
}

function *App() {
  for ({} of this) {
    try {
      yield <ContactForm email={email} />;
    } catch (err) {
      yield <div>{err.message}</div>;
    }
  }
}
```

✅ **Do** handle expected failures with control flow at the source:

```jsx
// ✅ handle expected failures at the source
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

❌ **Don’t** use render props or functions-as-children:

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

❌ **Don't** inspect or transform `children`:

```jsx
// ❌ treating children as data
function Wrapper({children}) {
  return <div>{children.filter((c) => c.props.visible)}</div>;
}

// ✅ forward children as-is
function Wrapper({children}) {
  return <div>{children}</div>;
}
```

✅ **Do** use named props as slots for multiple insertion points:

```jsx
function Card({title, actions, children}) {
  return (
    <div class="card">
      <header>{title}</header>
      <main>{children}</main>
      <footer>{actions}</footer>
    </div>
  );
}
```

❌ **Don’t** use plain strings as provision keys:

```jsx
// ❌ string keys risk collisions across libraries
this.provide("theme", "dark");
const theme = this.consume("theme");

// ✅ symbol keys are private
const ThemeKey = Symbol("theme");
this.provide(ThemeKey, "dark");
const theme = this.consume(ThemeKey);
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

❌ **Don’t** extend `Context.prototype` to share behavior:

```jsx
import {Context} from "@b9g/crank";
// ❌ implicit, globally scoped, can’t run setup logic
Context.prototype.setInterval = function (callback, delay) {
  const id = setInterval(callback, delay);
  this.cleanup(() => clearInterval(id));
  return id;
};

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

✅ **Do** use higher-order components to wrap rendering logic around existing components. For example, a `memo` wrapper uses `<Copy />` to skip re-renders when props haven’t changed:

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

See [Reusable Logic](09-reusable-logic.md) for alternative approaches and tradeoffs.

### TypeScript

✅ **Do** annotate `this: Context<typeof Component>` in generator components:

```tsx
import type {Context} from "@b9g/crank";

// required in strict mode, infers props from the component definition
function *Greeting(
  this: Context<typeof Greeting>,
  {name = "World"}: {name?: string},
) {
  for ({name = "World"} of this) {
    yield <div>Hello, {name}</div>;
  }
}
```

❌ **Don't** define a separate interface for props:

```tsx
// ❌ adds indirection and drifts from the actual parameter
interface GreetingProps {
  name?: string;
}

function *Greeting(
  this: Context<typeof Greeting>,
  {name = "World"}: GreetingProps,
) {
  for ({name = "World"} of this) {
    yield <div>Hello, {name}</div>;
  }
}

// ✅ inline props type
function *Greeting(
  this: Context<typeof Greeting>,
  {name = "World"}: {name?: string},
) {
  for ({name = "World"} of this) {
    yield <div>Hello, {name}</div>;
  }
}

// ✅ use Parameters to extract props from a component elsewhere
type GreetingProps = Parameters<typeof Greeting>[0];
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

❌ **Don’t** redo expensive work on every render when the inputs haven’t changed:

```jsx
function *Report({data}) {
  for ({data} of this) {
    // ❌ recomputes every render
    const summary = computeExpensiveSummary(data);
    yield <div>{summary}</div>;
  }
}

function *Report({data}) {
  let oldData;
  let summary;

  for ({data} of this) {
    // ✅ cache the result, save old values after yield to compare next iteration
    if (data !== oldData) {
      summary = computeExpensiveSummary(data);
    }

    yield <div>{summary}</div>;

    oldData = data;
  }
}
```

✅ **Do** use `copy` to skip re-rendering:

```jsx
// ✅ copy preserves the entire subtree
<Sidebar copy />
```

✅ **Do** use `this.schedule(() => this.refresh())` to render a component twice in one pass:

```jsx
function *Component() {
  for ({} of this) {
    // schedule a second render in the same pass
    this.schedule(() => this.refresh());
    // first render: yield returns the committed output for inspection
    const output = yield <Child />;
    // second render: use the inspected output to produce the final result
    yield <Final data={process(output)} />;
  }
}
```
