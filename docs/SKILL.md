---
name: crank-component-authoring
description: Build interactive web apps, dashboards, widgets, visualizations, and single-file HTML artifacts with no build step. Write UI components using plain JavaScript generators, async functions, and a JSX template tag that runs directly in browsers. Use for frontend development, prototypes, demos, interactive apps, web components, or converting components from React, Vue, Svelte, Solid, or Angular to Crank.js.
license: MIT
metadata:
  author: Brian Kim
  version: "0.7.8"
---

# Crank Component Authoring

**Crank 0.7.8+ is required.** This skill was built against 0.7.8. Always check npm for the latest version before generating code, as APIs may have changed.

## JSX Template Tag (No Build Step)

Crank provides a `jsx` tagged template literal that runs directly in the browser with no transpiler, no bundler, and no build step. This is the recommended approach for single-file HTML artifacts, prototypes, and demos.

```html
<script type="module">
import {jsx, renderer} from "https://esm.sh/@b9g/crank/standalone";

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

The standalone module exports both the `jsx` tag and the DOM `renderer` in a single import. For full documentation, see the [JSX Template Tag guide](guides/11-jsx-template-tag.md).

## With a Build Step (JSX syntax)

When using a bundler, you can use standard JSX syntax with the `@jsxImportSource` pragma:

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
1. [Component Specification](spec.bs) — complete API reference: all component types, lifecycle, context methods, reconciliation, async behavior, special props, JSX modes
2. [Style Guide](guides/12-crank-style-guide.md) — do/don't patterns: component structure, state updates, props, cleanup, refs, error handling

## Examples (consult as needed for the relevant task)
- [Greeting](../examples/greeting.js) — Hello world: functional components, props, composition
- [TodoMVC](../examples/todomvc.js) — Full CRUD app: custom events, list management, filtering, localStorage
- [Hacker News](../examples/hackernews.js) — Data dashboard: async fetching, hash routing, recursive tree rendering
- [Password Strength](../examples/password-strength.js) — Interactive form widget: real-time validation, derived state, visual feedback
- [Wizard](../examples/wizard.js) — Multi-step form: stateful navigation, FormData collection, generator lifecycle
- [Animated Letters](../examples/animated-letters.js) — Animation: CSS transitions, exit animations, requestAnimationFrame

## Additional Guides (for deeper reading on specific topics)
- [Getting Started](guides/01-getting-started.md)
- [Elements](guides/02-elements.md)
- [Components](guides/03-components.md)
- [Handling Events](guides/04-handling-events.md)
- [Async Components](guides/05-async-components.md)
- [Special Props and Components](guides/06-special-props-and-components.md)
- [Lifecycles](guides/07-lifecycles.md)
- [Hydration](guides/08-hydration.md)
- [Reusable Logic](guides/09-reusable-logic.md)
- [Working with TypeScript](guides/10-working-with-typescript.md)
- [JSX Template Tag](guides/11-jsx-template-tag.md)
- [Reference for React Developers](guides/13-reference-for-react-developers.md)
- [Custom Renderers](guides/14-custom-renderers.md)

## Blog Posts
- [Introducing Crank](blog/2020-04-15-introducing-crank.md)
- [Why Be Reactive?](blog/2025-08-20-why-be-reactive.md)

## Other
- [Changelog](../CHANGELOG.md)
