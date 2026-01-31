---
title: Portal
module: "@b9g/crank"
type: special-tag
publish: true
---

# Portal

A special tag for rendering children into a different root container.

## Syntax

```jsx
<Portal root={container}>{children}</Portal>
```

## Description

Portal allows you to render children into a DOM node that exists outside the parent component's DOM hierarchy. This is useful for:

- Modals and dialogs that need to render at the document body level
- Tooltips and popovers that need to escape overflow:hidden containers
- Rendering into multiple roots from a single component tree

When you use `renderer.render()`, the children are implicitly wrapped in a Portal element with the root set to the second argument.

Portal elements are opaque to their parents - they return `undefined` as their element value, so parent arrange operations don't see the portal's children.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `root` | `object` | The container to render children into |
| `children` | `Children` | The elements to render into the root |

## Examples

### Basic modal

```tsx
import {Portal} from "@b9g/crank";

function Modal({isOpen, children}) {
  if (!isOpen) {
    return null;
  }

  return (
    <Portal root={document.body}>
      <div class="modal-overlay">
        <div class="modal-content">
          {children}
        </div>
      </div>
    </Portal>
  );
}

function App() {
  return (
    <div class="app">
      <Modal isOpen={true}>
        <h2>Modal Title</h2>
        <p>This renders at document.body level</p>
      </Modal>
    </div>
  );
}
```

### Tooltip escaping overflow

```tsx
import {Portal} from "@b9g/crank";

function* Tooltip({children, content}) {
  let isVisible = false;
  let position = {x: 0, y: 0};

  const show = (e) => {
    isVisible = true;
    position = {x: e.clientX, y: e.clientY};
    this.refresh();
  };

  const hide = () => {
    isVisible = false;
    this.refresh();
  };

  for (const {children, content} of this) {
    yield (
      <span onmouseenter={show} onmouseleave={hide}>
        {children}
        {isVisible && (
          <Portal root={document.body}>
            <div
              class="tooltip"
              style={`position: fixed; left: ${position.x}px; top: ${position.y}px;`}
            >
              {content}
            </div>
          </Portal>
        )}
      </span>
    );
  }
}
```

### Multiple roots

```tsx
import {Portal} from "@b9g/crank";

function* MultiRootApp() {
  const sidebar = document.getElementById("sidebar");
  const main = document.getElementById("main");

  for (const props of this) {
    yield (
      <>
        <Portal root={sidebar}>
          <Navigation />
        </Portal>
        <Portal root={main}>
          <Content />
        </Portal>
      </>
    );
  }
}
```

### Event propagation

Events dispatched on elements inside a Portal still propagate through the Crank component tree, not the DOM tree:

```tsx
function App() {
  const handleClick = () => console.log("Caught in App!");

  return (
    <div onclick={handleClick}>
      <Portal root={document.body}>
        {/* Click events here will still trigger handleClick */}
        <button>Click me</button>
      </Portal>
    </div>
  );
}
```

## See also

- [Fragment](/api/core/special-tags/Fragment)
- [Renderer](/api/core/classes/Renderer)
- [Special Props and Tags Guide](/guides/special-props-and-tags)
