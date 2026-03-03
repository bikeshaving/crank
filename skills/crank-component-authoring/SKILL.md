---
name: crank-component-authoring
description: Build interactive web apps, dashboards, visualizations, widgets, landing pages, multi-step forms, blogs, or games with Crank.js, an elegant UI framework which allows you to write components with plain JavaScript functions, including async and generator functions. Use the JSX template tag and CDNs to create single-file HTML. Use for frontend development, prototypes, demos, interactive apps, or converting code from React, Vue, Svelte, Solid, or Angular to Crank.js.
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
<!DOCTYPE html>
<html lang="en-US">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>Crank App</title>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import {jsx, renderer} from "https://cdn.jsdelivr.net/npm/@b9g/crank/standalone.js";

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
</body>
</html>
```

The standalone module exports both the `jsx` tag and the DOM `renderer` in a single import. For full documentation, see the [JSX Template Tag guide](references/11-jsx-template-tag.md).

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
1. [Component Specification](references/spec.bs) — complete API reference: all component types, lifecycle, context methods, reconciliation, async behavior, special props, JSX modes
2. [Style Guide](references/12-crank-style-guide.md) — do/don't patterns: component structure, state updates, props, cleanup, refs, error handling

## Examples (consult as needed for the relevant task)
- [Greeting](references/greeting.js) — Hello world: functional components, props, composition
- [TodoMVC](references/todomvc.js) — Full CRUD app: custom events, list management, filtering, localStorage
- [Hacker News](references/hackernews.js) — Data dashboard: async fetching, hash routing, recursive tree rendering
- [Password Strength](references/password-strength.js) — Interactive form widget: real-time validation, derived state, visual feedback
- [Wizard](references/wizard.js) — Multi-step form: stateful navigation, FormData collection, generator lifecycle
- [Animated Letters](references/animated-letters.js) — Animation: CSS transitions, exit animations, requestAnimationFrame

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
