---
skill: crank-component-authoring
description: Write components for the Crank.js framework
version: 0.7
globs:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.ts"
  - "**/*.js"
references:
  - docs/spec.bs
  - docs/guides/03-components.md
  - docs/guides/04-handling-events.md
  - docs/guides/05-async-components.md
  - docs/guides/06-special-props-and-components.md
  - docs/guides/07-lifecycles.md
  - docs/guides/08-reusable-logic.md
  - docs/guides/11-reference-for-react-developers.md
  - docs/guides/12-jsx-template-tag.md
  - docs/blog/2025-08-20-why-be-reactive.md
  - examples/todomvc.js
  - examples/hackernews.js
  - examples/password-strength.js
---

# Crank Component Authoring

Read `docs/spec.md` for the full component specification. This skill summarizes the patterns you need.

## Canonical Example

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
