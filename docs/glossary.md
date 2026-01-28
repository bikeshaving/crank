# Glossary

A reference of key terms and concepts in Crank.js.

---

## Core Concepts

### Element
A JavaScript object representing a unit of the component tree. Elements contain a tag (string, symbol, or component function) and props. They are descriptions that renderers interpret to create actual nodes—not nodes themselves.

### Component
A function that returns or yields children. Components can be:
- Regular functions (stateless)
- Async functions (one-time async)
- Generator functions (stateful)
- Async generators (stateful + async)

All components receive props as a parameter and a `Context` as their `this` value.

### Children
Valid values that can appear in the element tree: elements, strings, numbers, booleans, null, undefined, or any arbitrarily nested iterable of these.

### Context
The object passed to every component as its `this` value. Provides:
- Access to `props`
- Lifecycle methods (`refresh`, `schedule`, `after`, `cleanup`)
- Iteration over prop updates (for generator components)
- Data sharing (`provide`, `consume`)
- Event handling (extends `EventTarget`)

### Renderer
The class responsible for converting element trees into nodes in a target environment (DOM, HTML strings, Canvas, Terminal, etc.). Maintains a cache of element trees by root and coordinates diffing and committing.

### RenderAdapter
An interface defining how elements map to nodes in a specific environment. Contains methods like `create`, `patch`, `arrange`, `remove`, `text`, `raw`, `adopt`, `scope`, `read`, and `finalize`.

---

## Component Types

### Generator Component
A component using `function*` syntax. Uses a render loop pattern to yield UI multiple times:

```jsx
function *Counter() {
  let count = 0;
  for ({} of this) {
    yield <div>{count}</div>;
  }
}
```

State is stored in local variables that persist between yields.

### Async Component
A component using `async function` that can await promises:

```jsx
async function UserProfile({id}) {
  const user = await fetchUser(id);
  return <div>{user.name}</div>;
}
```

### Async Generator Component
Combines generators and async:

```jsx
async function *LiveData() {
  for await ({} of this) {
    const data = await fetchData();
    yield <div>{data}</div>;
  }
}
```

---

## Special Tags

### Fragment
A special tag (empty string `""`) that groups children without creating a wrapper node:

```jsx
<>
  <div>One</div>
  <div>Two</div>
</>
```

### Portal
Renders children into a DOM node outside the current parent:

```jsx
<Portal root={document.getElementById("modal-root")}>
  <Modal />
</Portal>
```

### Copy
Prevents re-rendering of an element and its children:

```jsx
<Copy><ExpensiveComponent /></Copy>
// or as a prop
<div copy={true}>...</div>
```

### Raw
Injects raw HTML or DOM nodes directly:

```jsx
<Raw value="<strong>Bold</strong>" />
```

Use with caution—can be a security risk with untrusted content.

---

## Special Props

### key
Identifies elements during diffing. Essential for preserving state in dynamic lists:

```jsx
{items.map(item => <Item key={item.id} {...item} />)}
```

### ref
Callback that receives the rendered value after commit:

```jsx
<input ref={(el) => el.focus()} />
```

### copy
Controls which props are copied from the previous render:
- `copy={true}` — copy all props
- `copy="class id"` — copy only these props
- `copy="!value"` — copy all except value

### hydrate
Controls server-side rendering hydration. Uses the same syntax as `copy`.

---

## Lifecycle Methods

### refresh()
Re-executes the component:

```jsx
this.refresh(); // trigger re-render
this.refresh(() => count++); // update state then re-render
```

### schedule(callback)
Runs after nodes are created but before insertion into DOM:

```jsx
this.schedule(() => {
  // DOM nodes exist but aren't visible yet
});
```

### after(callback)
Runs after the component is fully rendered and live in DOM:

```jsx
this.after(() => {
  // Element is now in the document
  inputRef.focus();
});
```

### cleanup(callback)
Runs when the component unmounts:

```jsx
this.cleanup(() => {
  clearInterval(interval);
});
```

---

## Data Flow

### Provision
Ancestor components can provide values that descendants consume:

```jsx
// Ancestor
const ThemeKey = Symbol("theme");
this.provide(ThemeKey, "dark");

// Descendant
const theme = this.consume(ThemeKey); // "dark"
```

### Props Iterator
Generator components iterate over prop updates:

```jsx
function *MyComponent(initialProps) {
  for (const props of this) {
    // props contains the latest values
    yield <div>{props.value}</div>;
  }
}
```

---

## Rendering Phases

### Diffing
Comparing the new element tree with the previous one to determine changes. Uses position and tag matching; `key` props help track moved elements.

### Commit
Applying mutations to the target environment through RenderAdapter methods.

### Hydration
Adopting server-rendered nodes into the client-side tree, reusing existing DOM instead of creating new nodes.

### Unmounting
Removing a component from the tree. Triggers cleanup callbacks and removes associated nodes.

---

## Async Patterns

### Suspense
Displays a fallback while children are loading:

```jsx
import {Suspense} from "@b9g/crank/async";

<Suspense fallback={<Loading />}>
  <AsyncComponent />
</Suspense>
```

### Lazy
Creates a lazy-loaded component:

```jsx
import {lazy} from "@b9g/crank/async";

const HeavyComponent = lazy(() => import("./HeavyComponent"));
```

---

## Internal Concepts

### Retainer
Internal data structure that mirrors the element tree. Stores references to elements, context state, children, values, and flags. Not part of the public API.

### Scope
Context data passed down by the RenderAdapter (e.g., XML namespace for SVG/MathML). Different from provisions—determined by the adapter, not components.

### Host Element
The actual node in the target environment (e.g., a DOM element) as opposed to the element description.

### Intrinsic Element
An element with a string tag that maps directly to a host element (e.g., `"div"`, `"span"`).
