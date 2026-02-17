---
title: Hydration
---

Hydration is the process of taking server-rendered HTML and making it
interactive by attaching JavaScript event handlers and component state. Crank
provides robust hydration capabilities that handle complex scenarios while
maintaining performance and developer experience.

## Basic Hydration

The DOM renderer provides a `hydrate()` method that attempts to reuse existing
DOM nodes instead of creating new ones:

```jsx
import {renderer} from "@b9g/crank/dom";

// Server-rendered HTML exists in the DOM
// <div id="app"><button>Count: 0</button></div>

function *Counter() {
  let count = 0;
  const onclick = () => this.refresh(() => count++);

  for ({} of this) {
    yield (
      <button onclick={onclick}>
        Count: {count}
      </button>
    );
  }
}

// Hydrate instead of render to reuse existing DOM
renderer.hydrate(<Counter />, document.getElementById("app"));
```

During hydration, Crank will:
- Match existing DOM nodes with your component tree
- Attach event listeners without recreating elements
- Preserve existing DOM structure where possible
- Warn about mismatches in development

Unlike React, hydration will always choose the client render. The server render
will be blown away if there mismatches.

## Hydration Warnings

In development, Crank provides comprehensive warnings when server and client rendering don’t match:

```jsx
// Because this component renders differently on client and server you will
// receive a warning
function TimeDisplay() {
  return <div>Client time: {new Date().toDateString()}</div>;
}
```

## The hydrate prop
You can control hydration and squash warnings with the special `hydrate` prop:

### Skipping Hydration

Use `hydrate={false}` to skip hydration for elements that should remain static:

```jsx
function App({userContent}) {
  return (
    <div>
      <nav>
        <button onclick={() => console.log("Interactive!")}>
          Menu
        </button>
      </nav>

      {/* Skip hydration for user-generated content */}
      <div hydrate={false} innerHTML={userContent} />

      {/* Skip hydration for third-party widgets */}
      <div hydrate={false} id="third-party-widget" />
    </div>
  );
}
```

This is particularly useful for:
- Third-party widgets that manage their own DOM
- User-generated HTML content
- Static content that doesn’t need interactivity
- Complex visualizations that shouldn’t be disturbed

### Forcing Hydration

Use `hydrate={true}` to force hydration for nested portals:

```jsx
import {Portal} from "@b9g/crank";

function Modal({children}) {
  return (
    <Portal root={document.body} hydrate={true}>
      <div class="modal">
        {children}
      </div>
    </Portal>
  );
}
```

Portal children are normally skipped during hydration, but `hydrate={true}`
ensures their children are included.

### Selective Prop Hydration

Use string values to specify which props should not emit hydration errors:
- `hydrate="!data-timestamp"`: Hydrate all props except `data-timestamp`
- `hydrate="class id"`: Hydrate only `class` and `id` props
- `hydrate="!children"`: Hydrate this element but not its children.

You cannot mix bang (`!`) and non-bang syntax. Doing so will cause a warning.
```jsx
function FormInput({value, placeholder}) {
  return (
    <div>
      <input
        hydrate="!value"
        type="text"
        placeholder={placeholder}
        value={value}
      />
      <div
        hydrate="class id"
        class="form-group"
        id="user-input"
        data-analytics="skip-me"
      />
    </div>
  );
}
```

```jsx
let colorScheme =
  typeof window !== "undefined"
    ? sessionStorage.getItem("color-scheme") ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light")
    : "light";

export function *ColorSchemeToggle() {
  const toggleScheme = () => this.refresh(() => {
    colorScheme = colorScheme === "dark" ? "light" : "dark";
    sessionStorage.setItem("color-scheme", colorScheme);
  });

  if (typeof window !== "undefined") {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const systemListener = (event: MediaQueryListEvent) =>
      this.refresh(() => colorScheme = event.matches ? "dark" : "light");
    mediaQuery.addEventListener("change", systemListener);
    this.cleanup(() => {
      mediaQuery.removeEventListener("change", systemListener);
    });
  }

  for ({} of this) {
    if (typeof document !== "undefined") {
      const action = colorScheme === "dark" ? "remove" : "add";
      document.body.classList[action]("color-scheme-light");
    }

    // we do not want to hydrate the children or aria-checked because the
    // server did not have access to the DOM and it might be mismatched
    yield (
      <button
        onclick={toggleScheme}
        role="switch"
        aria-label="Set dark mode"
        aria-checked={colorScheme === "dark"}
        hydrate="!aria-checked !children"
      >
        Switch to {colorScheme === "dark" ? "light" : "dark"} mode
      </button>
    );
  }
}
```
