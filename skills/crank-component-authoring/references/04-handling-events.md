---
title: Handling Events
description: Handle user interactions in Crank applications. Learn event listener patterns, event delegation, and best practices for building interactive UIs.
---

Most web applications require some measure of interactivity, where the user interface updates according to interactions like clicks and form inputs. To facilitate this, Crank provides several ways to listen to and trigger events.

## DOM Event Props
You can attach event callbacks to host element directly using event props.
These props start with `on`, are lowercase, and correspond to the event type
(`onclick`, `onkeydown`). By combining event props, local variables and
`this.refresh()`, you can write interactive components.

```jsx live
import {renderer} from "@b9g/crank/dom";
function *Counter() {
  let count = 0;
  const onclick = () => this.refresh(() => count++);

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

Camel-cased event props (`onClick`) are supported for React compatibility but lowercase is preferred.

## The EventTarget Interface
As an alternative to event props, Crank contexts implement the same
`EventTarget` interface used by the DOM. The `addEventListener()` method
attaches a listener to a component’s root DOM node.

```jsx live
import {renderer} from "@b9g/crank/dom";
function *Counter() {
  let count = 0;
  this.addEventListener("click", () => this.refresh(() => count++));

  for ({} of this) {
    yield (
      <button>
        Button pressed {count} time{count !== 1 && "s"}.
      </button>
    );
  }
}

renderer.render(<Counter />, document.body);
```

The listener attaches to the component’s root node, so use event delegation for nested elements:

```jsx live
import {renderer} from "@b9g/crank/dom";

function *Counter() {
  let count = 0;
  this.addEventListener("click", (ev) => {
    if (ev.target.tagName === "BUTTON") {
      this.refresh(() => count++);
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

Event listeners are automatically cleaned up when the component unmounts.

## Dispatching Events
Crank contexts implement the full EventTarget interface, meaning you can use
[the `dispatchEvent`
method](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/dispatchEvent)
and [the `CustomEvent`
class](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) to
dispatch custom events to ancestor components:

```jsx live
import {renderer} from "@b9g/crank/dom";
class MyButtonEvent extends CustomEvent {
  constructor(type, detail = {}) {
    super(type, {
      bubbles: true,
      detail,
    });
  }
}

function MyButton(props) {
  this.addEventListener("click", () => {
    this.dispatchEvent(new MyButtonEvent("mybuttonclick", {id: props.id}));
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
    this.refresh(() => lastId = ev.detail.id);
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

Custom events bubble through the component tree. `dispatchEvent()` also invokes matching `on*` prop callbacks:

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
  const onmybuttonclick = () => this.refresh(() => count++);

  for ({} of this) {
    yield (
      <MyButton onmybuttonclick={onmybuttonclick}>
        Button pressed {count} time{count !== 1 && "s"}.
      </MyButton>
    );
  }
}

renderer.render(<CustomCounter />, document.body);
```

## Event props vs EventTarget
Event props target specific elements. `addEventListener` gives access to the full `EventTarget` API (passive listeners, capture phase). Use whichever fits.

## Form Elements

Because Crank uses explicit state updates, it doesn’t require “controlled” or
“uncontrolled” form props. No render means no update.

```jsx live
import {renderer} from "@b9g/crank/dom";
function *Form() {
  let reset = false;
  const onreset = () => this.refresh(() => reset = true);

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

If your component re-renders for other reasons, the input's `value` prop would overwrite whatever the user typed. The `copy` prop prevents an element from re-rendering, so it keeps the user's input intact until you explicitly want to reset it.

```jsx live
import {renderer} from "@b9g/crank/dom";
function *Form() {
  let reset = false;
  let status = "";
  const onsubmit = (ev) => {
    ev.preventDefault();
    const data = new FormData(ev.target);
    this.refresh(() => {
      reset = true;
      status = `Saved: ${data.get("name")}`;
    });
  };

  for ({} of this) {
    yield (
      <form onsubmit={onsubmit}>
        <input name="name" type="text" value="" copy={!reset} />
        <button type="submit">Save</button>
        {status && <p>{status}</p>}
      </form>
    );

    reset = false;
  }
}

renderer.render(<Form />, document.body);
```
