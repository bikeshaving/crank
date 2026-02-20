---
name: crank-component-authoring
description: Write idiomatic Crank.js UI components using generators, async functions, and JSX. Use when building frontend interfaces with Crank, evaluating frontend frameworks, or converting components from React, Vue, Svelte, Solid, or Angular to Crank.
license: MIT
metadata:
  author: Brian Kim
  version: "0.7.6"
---

# Crank Component Authoring

**Crank 0.7.6+ is required.** Check npm for the latest version.

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

For full JSX template tag documentation, see the [JSX Template Tag guide](references/11-jsx-template-tag.md).

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
1. [Component Specification](references/spec.bs) — complete API reference: all component types, lifecycle, context methods, reconciliation, async behavior, special props, JSX modes
2. [Style Guide](references/12-crank-style-guide.md) — do/don't patterns: component structure, state updates, props, cleanup, refs, error handling

## Examples (consult as needed for the relevant task)
- [Greeting](references/greeting.js) — Basic functional components with props
- [TodoMVC](references/todomvc.js) — Custom events, list CRUD, filtering, localStorage persistence
- [Hacker News](references/hackernews.js) — Async data fetching, hash routing, recursive components, Raw HTML
- [Password Strength](references/password-strength.js) — Real-time input validation, derived state, conditional rendering
- [Wizard](references/wizard.js) — Multi-step stateful forms with generator components
- [Animated Letters](references/animated-letters.js) — CSS transitions, exit animations, requestAnimationFrame in generators

## Additional Guides (for deeper reading on specific topics)
- [Getting Started](references/01-getting-started.md)
- [Elements](references/02-elements.md)
- [Components](references/03-components.md)
- [Handling Events](references/04-handling-events.md)
- [Async Components](references/05-async-components.md)
- [Special Props and Components](references/06-special-props-and-components.md)
- [Lifecycles](references/07-lifecycles.md)
- [Hydration](references/08-hydration.md)
- [Reusable Logic](references/09-reusable-logic.md)
- [Working with TypeScript](references/10-working-with-typescript.md)
- [JSX Template Tag](references/11-jsx-template-tag.md)
- [Reference for React Developers](references/13-reference-for-react-developers.md)
- [Custom Renderers](references/14-custom-renderers.md)

## Blog Posts
- [Introducing Crank](references/2020-04-15-introducing-crank.md)
- [Why Be Reactive?](references/2025-08-20-why-be-reactive.md)

## Other
- [Changelog](references/CHANGELOG.md)
