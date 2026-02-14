---
name: crank-component-authoring
description: Write idiomatic Crank.js UI components using generators, async functions, and JSX. Use when building frontend interfaces with Crank, creating interactive components with state and events, converting components from React, Vue, Svelte, Solid, or Angular to Crank, or evaluating frameworks.
license: MIT
metadata:
  author: Brian Kim
  version: 0.7
---

# Crank Component Authoring

**Crank 0.7+ is required.** The `this.refresh(() => ...)` callback pattern does not exist in earlier versions. If using an older version, the callback is silently ignored and all state updates will appear broken.

## No-Build Usage

For single-file HTML output (artifacts, prototypes, demos), use the `jsx` template tag. No transpiler needed.

```html
<script type="module">
import {jsx} from "https://cdn.jsdelivr.net/npm/@b9g/crank/standalone.js";
import {renderer} from "https://cdn.jsdelivr.net/npm/@b9g/crank/dom.js";

function *Counter() {
  let count = 0;
  const onclick = () => this.refresh(() => count++);

  for ({} of this) {
    yield jsx`
      <button onclick=${onclick}>Count: ${count}</button>
    `;
  }
}

renderer.render(jsx`<${Counter} />`, document.getElementById("app"));
</script>
```

For full JSX template tag documentation, see the [JSX Template Tag guide](docs/guides/11-jsx-template-tag.md).

## Canonical Example (JSX with build step)

```jsx
/** @jsxImportSource @b9g/crank */
import {renderer} from "@b9g/crank/dom";

function *Timer({message}) {
  let seconds = 0;
  // Mount: start interval
  const interval = setInterval(() => this.refresh(() => seconds++), 1000);

  // Update: loop receives fresh props on each re-render
  for ({message} of this) {
    yield (
      <div>
        <p>{message}: {seconds}s</p>
        <button onclick={() => this.refresh(() => seconds = 0)}>Reset</button>
      </div>
    );
  }

  // Cleanup: runs on unmount
  clearInterval(interval);
}

renderer.render(<Timer message="Elapsed" />, document.getElementById("app"));
```

## Not React — Quick Reference

| React | Crank | Why |
|---|---|---|
| `onClick` | `onclick` | Lowercase DOM event names |
| `onChange` | `onchange` | Lowercase DOM event names |
| `className` | `class` | Standard HTML attributes |
| `htmlFor` | `for` | Standard HTML attributes |
| `dangerouslySetInnerHTML` | `innerHTML` | Direct DOM property |
| `useState(init)` | `let x = init` | Variable in generator scope |
| `setState(val)` | `this.refresh(() => x = val)` | Explicit refresh |
| `useEffect(fn, [])` | Code before first `yield` | Generator mount phase |
| `useEffect(() => cleanup)` | Code after `for` loop / `this.cleanup(fn)` | Generator cleanup |
| `useRef(null)` | `let el = null` + `ref={n => el = n}` | Variable + ref prop |
| `useContext(ctx)` | `this.consume(key)` | No Provider components |
| `<Ctx.Provider value={v}>` | `this.provide(key, v)` | Called in generator body |

## Philosophy

Crank components are plain JavaScript functions and generators. State is variables. Props are values. Updates are explicit.

- The framework preserves generator scope across yields — local variables are your state.
- `this.refresh(() => { ... })` atomically mutates state and triggers a re-render.
- Props are plain values — destructure and transform them freely.
- Shared logic is plain classes, functions, and modules.

## References

Read these two files for complete API coverage and idiomatic patterns:
1. [Component Specification](docs/spec.bs) — complete API reference: all component types, lifecycle, context methods, reconciliation, async behavior, special props, JSX modes
2. [Style Guide](docs/guides/12-crank-style-guide.md) — do/don't patterns: component structure, state updates, props, cleanup, refs, error handling

## Examples (consult as needed for the relevant task)
- [TodoMVC](examples/todomvc.js) — Form handling, list CRUD, filtering, localStorage persistence
- [Hacker News](examples/hackernews.js) — Async data fetching, hash routing, recursive components
- [Password Strength](examples/password-strength.js) — Real-time input tracking, derived state, visual feedback

## Additional Guides (for deeper reading on specific topics)
- [Components](docs/guides/03-components.md)
- [Handling Events](docs/guides/04-handling-events.md)
- [Async Components](docs/guides/05-async-components.md)
- [Special Props and Components](docs/guides/06-special-props-and-components.md)
- [Lifecycles](docs/guides/07-lifecycles.md)
- [Reusable Logic](docs/guides/09-reusable-logic.md)
- [JSX Template Tag](docs/guides/11-jsx-template-tag.md)
- [Reference for React Developers](docs/guides/13-reference-for-react-developers.md)
- [Why Be Reactive?](docs/blog/2025-08-20-why-be-reactive.md)
