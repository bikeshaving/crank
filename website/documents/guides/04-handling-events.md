---
title: Handling Events
---

Most web applications require some measure of interactivity, where the user interface updates according to input. To facilitate this, Crank provides several ways to listen to and trigger events.

## DOM Event Props
You can attach event callbacks to host element directly using event props. These props start with `on`, are all lowercase, and correspond to the event type (`onclick`, `onkeydown`). By combining event props, local variables and `this.refresh()`, you can write interactive components.

```jsx
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

When using this method, you do not have to call the `removeEventListener()` method if you merely want to remove event listeners when the component is unmounted. This is done automatically.

The context’s `addEventListener()` method attaches to the top-level node or nodes which each component renders, so if you want to listen to events on a nested node, you must use event delegation.

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

Because the event listener is attached to the outer `div`, we have to filter events by `ev.target.tagName` in the listener to make sure we’re not incrementing `count` based on clicks which don’t target the `button` element.

## Event props vs EventTarget
The props-based event API and the context-based EventTarget API both have their advantages. On the one hand, using event props means you can listen to exactly the element you’d like to listen to.

On the other hand, using the `addEventListener` method allows you to take full advantage of the EventTarget API, which includes registering passive event listeners, or listeners which are dispatched during the capture phase. Additionally, the EventTarget API can be used without referencing or accessing the child elements which a component renders, meaning you can use it to listen to elements nested in other components.

Crank supports both API styles for convenience and flexibility.

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

`MyButton` is a function component which wraps a `button` element. It dispatches a `CustomEvent` whose type is `"mybuttonclick"` when it is pressed, and whose `detail` property contains data about the ID of the clicked button. This event is not triggered on the underlying DOM nodes; instead, it can be listened for by parent component contexts using event capturing and bubbling, and in the example, the event propagates and is handled by the `MyApp` component. Using custom events and event bubbling allows you to encapsulate state transitions within component hierarchies without the need for complex state management solutions used in other frameworks like Redux or VueX.

The preceding example also demonstrates a slight difference in the way the `addEventListener` method works in function components compared to generator components. With generator components, listeners stick between renders, and will continue to fire until the component is unmounted. However, with function components, because the `addEventListener` call would be invoked every time the component is rerendered, we remove and add listeners for each render. This allows function components to remain stateless while still listening for and dispatching events.

## Form Elements

Because Crank uses explicit state updates, it doesn’t have a concept of “controlled” vs “uncontrolled” props like `value`/`defaultValue` in React. No refresh means no render.

```jsx live
import {renderer} from "@b9g/crank/dom";
function *App() {
  let reset = true;
  this.addEventListener("click", ev => {
    if (ev.target.tagName === "BUTTON") {
      reset = true;
      this.refresh();
    }
  });

  for ({} of this) {
    yield (
      <div>
        <input type="text" value="" />
        <p>
          <button>Reset</button>
        </p>
      </div>
    );

    reset = false;
  }
}

renderer.render(<App />, document.body);
```

You can use the `$static` prop to prevent an element from updating.

```jsx live
import {renderer} from "@b9g/crank/dom";
function *
```
