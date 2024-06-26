---
title: Handling Events
---

Most web applications require some measure of interactivity, where the user interface updates according to interactions like clicks and form inputs. To facilitate this, Crank provides several ways to listen to and trigger events.

## DOM Event Props
You can attach event callbacks to host element directly using event props. These props start with `on`, are lowercase, and correspond to the event type (`onclick`, `onkeydown`). By combining event props, local variables and `this.refresh()`, you can write interactive components.

```jsx live
import {renderer} from "@b9g/crank/dom";
function *Counter() {
  let count = 0;
  const onclick = () => {
    count++;
    this.refresh();
  };

  for ({} of this) {
    yield (
      <button onclick={onclick}>
        Button pressed {count} time{count !== 1 && "s"}.
      </button>
    );
  }
}

renderer.render(<Counter />, document.body);
```

Camel-cased event props are supported for compatibility reasons starting in 0.6.

## The EventTarget Interface
As an alternative to event props, Crank contexts implement the same `EventTarget` interface used by the DOM. The `addEventListener()` method attaches a listener to a component’s root DOM node.

```jsx live
import {renderer} from "@b9g/crank/dom";
function *Counter() {
  let count = 0;
  this.addEventListener("click", () => {
    count++;
    this.refresh();
  });

  for ({} of this) {
    yield (
      <button onclick={onclick}>
        Button pressed {count} time{count !== 1 && "s"}.
      </button>
    );
  }
}

renderer.render(<Counter />, document.body);
```

The context’s `addEventListener()` method attaches to the top-level node or nodes which each component renders, so if you want to listen to events on a nested node, you must use event delegation. For instance, in the following example, we have to filter events by target to make sure we’re not incrementing `count` based on clicks to the outer `div`.

```jsx live
import {renderer} from "@b9g/crank/dom";

function *Counter() {
  let count = 0;
  this.addEventListener("click", (ev) => {
    if (ev.target.tagName === "BUTTON") {
      count++;
      this.refresh();
    }
  });

  for ({} of this) {
    yield (
      <div>
        <p>The button has been clicked {count} time{count !== 1 && "s"}.</p>
        <button>Increment</button>
      </div>
    );
  }
}

renderer.render(<Counter />, document.body);
```

While the `removeEventListener()` method is implemented, you do not have to call the `removeEventListener()` method if you merely want to remove event listeners when the component is unmounted.

## Dispatching Events
Crank contexts implement the full EventTarget interface, meaning you can use [the `dispatchEvent` method](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent) and [the `CustomEvent` class](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) to dispatch custom events to ancestor components:

```jsx live
import {renderer} from "@b9g/crank/dom";
function MyButton(props) {
  this.addEventListener("click", () => {
    this.dispatchEvent(new CustomEvent("mybuttonclick", {
      bubbles: true,
      detail: {id: props.id},
    }));
  });

  return (
    <button {...props} />
  );
}

function MyButtons() {
  return [1, 2, 3, 4, 5].map((i) => (
    <p>
      <MyButton id={"button" + i}>Button {i}</MyButton>
    </p>
  ));
}

function *MyApp() {
  let lastId;
  this.addEventListener("mybuttonclick", (ev) => {
    lastId = ev.detail.id;
    this.refresh();
  });

  for ({} of this) {
    yield (
      <div>
        <MyButtons />
        <p>
          {lastId == null
          ? "No buttons have been pressed."
          : `The last pressed button had an id of ${lastId}`}
        </p>
      </div>
    );
  }
}

renderer.render(<MyApp />, document.body);
```

`<MyButton />` is a function component which wraps a `<button>` element. It dispatches a `CustomEvent` whose type is `"mybuttonclick"` when it is pressed, and whose `detail` property contains data about the pressed button. This event is not triggered on the underlying DOM nodes; instead, it can be listened for by parent component contexts using event capturing and bubbling, and in the example, the event propagates and is handled by the `MyApp` component.

The `dispatchEvent()` will also call any prop callbacks if they are found.

```jsx live
import {renderer} from "@b9g/crank/dom";

function MyButton(props) {
  this.addEventListener("click", () => {
    this.dispatchEvent(new CustomEvent("mybuttonclick", {
      bubbles: true,
      detail: {id: props.id},
    }));
  });

  return (
    <button {...props} />
  );
}

function *CustomCounter() {
  let count = 0;
  const onmybuttonclick = () => {
    count++;
    this.refresh();
  };

  for ({} of this) {
    yield (
      <button onmybuttonclick={onmybuttonclick}>
        Button pressed {count} time{count !== 1 && "s"}.
      </button>
    );
  }
}

renderer.render(<CustomCounter />, document.body);
```

Using custom events and event bubbling allows you to encapsulate state transitions within component hierarchies without the need for complex state management solutions in a way that is DOM-compatible.

## Event props vs EventTarget
The props-based event API and the context-based EventTarget API both have their advantages. On the one hand, using event props means you can listen to exactly the element you’d like to listen to. On the other hand, using the `addEventListener` method allows you to take full advantage of the EventTarget API, which includes registering passive event listeners, or listeners which are dispatched during the capture phase. Crank supports both API styles for convenience and flexibility.

## Form Elements

Because Crank uses explicit state updates, it doesn’t require “controlled” or “uncontrolled” form props. No render means no update.

```jsx live
import {renderer} from "@b9g/crank/dom";
function *Form() {
  let reset = false;
  const onreset = () => {
    reset = true;
    this.refresh();
  };

  const onsubmit = (ev) => {
    ev.preventDefault();
  };

  for ({} of this) {
    yield (
      <form onsubmit={onsubmit}>
        <input type="text" value="" />
        <p>
          <button onclick={onreset}>Reset</button>
        </p>
      </form>
    );
  }
}

renderer.render(<Form />, document.body);
```

If your component needs to update for other reasons, you can use the special `copy` prop to prevent the input element from updating. The `copy` prop is a boolean which prevents an element and children from rerendering.

```jsx live
import {renderer} from "@b9g/crank/dom";
function *Form() {
  let reset = false;
  const onreset = () => {
    reset = true;
    this.refresh();
  };

  const onsubmit = (ev) => {
    ev.preventDefault();
  };

  setInterval(() => {
    this.refresh();
  }, 1000);

  for ({} of this) {
    const currentReset = reset;
    reset = false;
    yield (
      <form onsubmit={onsubmit}>
        <input type="text" value="" copy={currentReset} />
        <p>
          <button onclick={onreset}>Reset</button>
        </p>
      </form>
    );
  }
}

renderer.render(<Form />, document.body);
```
