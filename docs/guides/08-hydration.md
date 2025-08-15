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

In development, Crank provides comprehensive warnings when server and client rendering don't match:

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
- Static content that doesn't need interactivity
- Complex visualizations that shouldn't be disturbed

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

Use string values to specify which props should be hydrated:

```jsx
function FormInput({value, placeholder}) {
  return (
    <div>
      {/* Hydrate placeholder but preserve user's current input value */}
      <input
        hydrate="!value"
        type="text"
        placeholder={placeholder}
        value={value}
      />

      {/* Only hydrate specific styling props */}
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

**String hydrate syntax:**
- `hydrate="!data-timestamp"` - Hydrate all props except `data-timestamp`
- `hydrate="class id"` - Hydrate only `class` and `id` props
- Cannot mix bang (`!`) and non-bang syntax in the same string
- `hydrate="!children" - Hydrate this element but not its children.

This is useful for:
- Form inputs where users may have entered data
- Elements with dynamic attributes from analytics scripts
- Preserving third-party modifications to specific props
