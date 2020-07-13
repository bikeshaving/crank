---
title: Handling Events
---

## Interactive components
Components produce children, which are rendered as DOM nodes by the default DOM renderer. Most applications require event listeners to be attached to these nodes so that application state can be updated according to user input. To facilitate this, Crank provides two APIs for listening to events on rendered children.

### onevent props
Crank allows you to attach event callbacks directly to host element using onevent props. For the DOM renderer, these props start with `on`, are all lowercase, and correspond exactly to the properties specified by the DOM’s [GlobalEventHandlers mixin](https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers). By combining event props, local variables and `this.refresh`, you can write interactive components:

```jsx
function *Clicker() {
  let count = 0;
  const handleClick = () => {
    count++;
    this.refresh();
  };

  while (true) {
    yield (
      <div>
        The button has been clicked {count} {count === 1 ? "time" : "times"}.
        <button onclick={handleClick}>Click me</button>
      </div>
    );
  }
}
```

### The EventTarget interface
As an alternative to the `onevent` API, Crank contexts also implement the same `EventTarget` interface used by the DOM. The `addEventListener` method attaches a listener to a component’s rendered DOM elements.

```jsx
function *Clicker() {
  let count = 0;
  this.addEventListener("click", () => {
    count++;
    this.refresh();
  });

  while (true) {
    yield (
      <button>I have been clicked {count} {count === 1 ? "time" : "times"}</button>
    );
  }
}
```

The local state `count` is now updated in the event listener, which triggers when the rendered button is actually clicked.

**NOTE:** When using the `addEventListener` method, you do not have to call the `removeEventListener` method if you merely need to remove event listeners when the component is unmounted. This is done automatically.

## Event delegation

The Context’s `addEventListener` method only attaches to the top-level node or nodes which each component renders, so if you want to listen to events on a nested node, you must use event delegation:

```jsx
function *Clicker() {
  let count = 0;
  this.addEventListener("click", (ev) => {
    if (ev.target.tagName === "BUTTON") {
      count++;
      this.refresh();
    }
  });

  while (true) {
    yield (
      <div>
        The button has been clicked {count} {count === 1 ? "time" : "times"}.
        <button>Click me</button>
      </div>
    );
  }
}
```

Because the event listener is attached to the outer `div`, we have to filter events by `ev.target.tagName` in the listener to make sure we’re not incrementing `count` based on clicks which don’t target the `button`.

## When to use onevent props and the EventTarget API
The props-based onevent API and the context-based EventTarget API both have their advantages. On the one hand, using onevent props means you don’t have to filter events by target, and can register them on the exact element you’d like to listen to.

On the other hand, using `this.addEventListener` allows you to take full advantage of the EventTarget API, including registering `passive` events or events which are dispatched during the `capture` phase. Additionally, the EventTarget API can be used without referencing or accessing the child elements which a component renders, meaning you can use it to listen to components whose children are passed in, or in utility functions which don’t have access to the rendered elements at all.

Crank supports both API styles for convenience and flexibility.

### Dispatching events
Crank contexts implement the full EventTarget interface, meaning you can use the `dispatchEvent` method and the [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) constructor to bubble events to parent components:

```jsx
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
    <div> 
      <MyButton id={"button" + i}>Button {i}</MyButton>
    </div>
  ));
}

function *MyApp() {
  let lastId;
  this.addEventListener("mybuttonclick", (ev) => {
    lastId = ev.detail.id;
    this.refresh();
  });

  while (true) {
    yield (
      <div>
        <MyButtons />
        <div>Last pressed id: {lastId == null ? "N/A" : lastId}</div>
      </div>
    );
  }
}
```

`MyButton` is a function component which wraps a `button` element. It bubbles a `CustomEvent` whose type is `"mybuttonclick"` when it is pressed, and whose `detail` property contains data about the id of the clicked button. This event is not bubbled to parent DOM nodes but to parent component contexts, and in the example, it propagates to the context of `MyApp`, which listens for the event using the `addEventListener` method. Using custom events and event bubbling allows you to encapsulate state transitions within component hierarchies without the need for complex state management solutions used in other frameworks like Redux or VueX.
