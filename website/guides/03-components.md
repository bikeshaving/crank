---
title: Components
---

So far, we’ve only seen and used intrinsic elements, but eventually, we’ll want to group parts of the element tree into reusable *components.* In Crank, all components are just functions; there is no class-based interface.

## Basic Components
```js
function Greeting({name}) {
  return <div>Hello, {name}</div>;
}

renderer.render(<Greeting name="World" />, document.body);
console.log(document.body.innerHTML); // "<div>Hello World</div>"
```

The simplest kind of component you can write is a *sync function component*. When rendered, the function is invoked with the props object of the element as its first parameter, and the return value, usually an element, is recursively rendered by the renderer as the element’s children.

As seen in the example above, you can use [object destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#Object_destructuring) on the props parameter for convenience. Additionally, you can assign default values to each prop using JavaScript’s default value syntax:

```js
function Greeting({name="World"}) {
  return <div>Hello, {name}</div>;
}

renderer.render(<Greeting />, document.body); // "<div>Hello World</div>"
```

Component elements can take children just as intrinsic elements can. The `createElement` function will add children to the props object under the name `children`, and it is up to the component to place the children somewhere in the returned element tree. If you don’t use the `children` prop, the `children` passed in will not be rendered.

```js
function Greeting({name, children}) {
  return (
    <div>
      Message for {name}: {children}
    </div>
  );
}

renderer.render(
  <Greeting name="Nemo">
    <span>Howdy!</span>
  </Greeting>,
  document.body,
);

console.log(document.body.innerHTML); // "<div>Message for Nemo: <span>Howdy</span></div>"
```

## Stateful Components
Eventually, you’re going to want to write components with local state. In Crank, we use [generator functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*) to do so.

```jsx
function *Counter() {
  let count = 0;
  while (true) {
    count++;
    yield (
      <div>
        You have updated this component {count} {count === 1 ? "time" : "times"}
      </div>
    );
  }
}

renderer.render(<Counter />, document.body);
console.log(document.body.innerHTML);
// "<div>You have updated this component 1 time</div>"
renderer.render(<Counter />, document.body);
console.log(document.body.innerHTML);
// "<div>You have updated this component 2 times</div>"
renderer.render(<Counter />, document.body);
renderer.render(<Counter />, document.body);
renderer.render(<Counter />, document.body);
console.log(document.body.innerHTML);
// "<div>You have updated this component 5 times</div>"
renderer.render(null, document.body);
console.log(document.body.innerHTML);
// ""
renderer.render(<Counter />, document.body);
console.log(document.body.innerHTML);
// "<div>You have updated this component 1 time</div>"
```

Because we’re now yielding elements rather than returning them, we can make components stateful using variables in the local scope. Every time the component is updated, Crank resumes the generator, pausing at the next `yield`. The yielded expressions, usually elements, are then recursively rendered by the renderer, just as if it were returned in a sync function component. Furthermore, Crank uses the same diffing algorithm which reuses DOM nodes to reuse generator objects, so that the execution of the generator is preserved between renders. This allows local state to be encapsulated within the generator’s scope.

### Contexts 
The `Counter` component’s local state only changes when it is rerendered, but we may want to write components which update themselves based on timers or events. Crank allows components to control themselves by passing in a custom object called a *context* as the `this` value of each component. These contexts provide several utility methods, most important of which is `this.refresh`, which tells Crank to update the component in place. For generator components, this means that the generator associated with the context will resume so it can yield another value.

```jsx
function *Timer() {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);

  try {
    while (true) {
      yield (
        <div>Seconds elapsed: {seconds}</div>
      );
    }
  } finally {
    clearInterval(interval);
  }
}
```

This `Timer` component is similar to the `Counter` one, except now the state (the local variable `seconds`) is updated in the callback passed to `setInterval`, rather than when the component is rerendered. The `this.refresh` method is called to ensure that the generator is stepped through each interval, so that the rendered DOM actually reflects the updated `seconds` variable.

One important detail about the `Timer` example is that it cleans up after itself with `clearInterval`. Crank will call the `return` method on generator components when the element is removed from the tree, so that the finally block executes and `clearInterval` is called. In this way, you can use the natural lifecycle of a generator to write setup and teardown logic for components, all within the same scope.

### Prop updates
The generator components we’ve seen so far haven’t used the props object. Generator components can accept props as its first parameter just like regular function components.

```jsx
function *LabeledCounter({message}) {
  let count = 0;
  while (true) {
    count++;
    yield <div>{message} {count}</div>;
  }
}

renderer.render(<LabeledCounter message="The count is now:" />, document.body);
console.log(document.body.innerHTML); // "<div>The count is now: 1</div>"
renderer.render(<LabeledCounter message="The count is now:" />, document.body);
console.log(document.body.innerHTML); // "<div>The count is now: 2</div>"
renderer.render(<LabeledCounter message="What if I update the message:" />, document.body);
// WOOPS!
console.log(document.body.innerHTML); // "<div>The count is now: 3</div>"
```

This mostly works, except we have a bug where the component kept yielding the initial message even though a new message was passed in via props. To fix this, we can make sure props are kept up to date by iterating over the context:

```jsx
function *Counter({message}) {
  let count = 0;
  for ({message} of this) {
    count++;
    yield (
      <div>{message} {count}</div>
    );
  }
}

renderer.render(<Counter message="The count is now:" />, document.body);
console.log(document.body.innerHTML); // "<div>The count is now: 1</div>"
renderer.render(<Counter message="What if I update the message:" />, document.body);
console.log(document.body.innerHTML); // "<div>What if I update the message: 2</div>"
```

By replacing the `while (true)` loop with a `for…of` loop which iterates over `this`, you can get the latest props each time the generator is resumed. This is possible because contexts are an iterable of the latest props passed to elements.

One idiom we see in the example above is the overwriting of variables declared via the generator’s parameters (`message`) with the `for…of` loop. This allows those variables to always remain in sync with the current props passed to each component. However, there is no reason you have to always overwrite old props in the `for` expression, meaning you can assign new props to a different variable and compare them against the old ones:

```jsx
function *Greeting({name}) {
  yield <div>Hello {name}</div>;
  for (const {name: newName} of this) {
    if (name !== newName) {
      yield (
        <div>Goodbye {name} and hello {newName}</div>
      );
    } else {
      yield <div>Hello again {newName}</div>;
    }

    name = newName;
  }
}

renderer.render(<Greeting name="Alice" />, document.body);
console.log(document.body.innerHTML); // "<div>Hello Alice</div>"
renderer.render(<Greeting name="Alice" />, document.body);
console.log(document.body.innerHTML); // "<div>Hello again Alice</div>"
renderer.render(<Greeting name="Bob" />, document.body);
console.log(document.body.innerHTML); // "<div>Goodbye Alice and hello Bob</div>"
renderer.render(<Greeting name="Bob" />, document.body);
console.log(document.body.innerHTML); // "<div>Hello again Bob</div>"
```

The fact that state is just local variables allows us to blur the lines between props and state, in a way that is easy to understand and without lifecycle methods like `componentWillUpdate` from React. With generators and `for` loops, comparing old and new props is as easy as comparing adjacent elements of an array.

## Interactive components
Components produce elements, which can be rendered as DOM nodes. Most applications require event listeners to be attached to these nodes so that application state can be updated according to user input. To facilitate this, Crank provides two APIs for listening to events on rendered children:

### The EventTarget interface
Crank contexts implement the same `EventTarget` interface used by the DOM, and automatically registers and tears down these listeners as DOM nodes are added and removed. You can write interactive components by combining event listeners with local variables and the `this.refresh` method.

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

The local state `count` is now updated in the event listener, which triggers when the rendered button is actually clicked. The `this.addEventListener` method only attaches to the top-level node which each component renders, so if you want to listen to events on a nested node, you must use event delegation:

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

### DOM onevent props
As an alternative to event targets, Crank also allows you to attach event callbacks directly on rendered children using event props. These props start with `on`, are all lowercase, and correspond exactly to the properties specified by the DOM’s [GlobalEventHandlers mixin](https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers).

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

The props-based onevent API and the context-based EventTarget API both have their advantages. On the one hand, using onevent props means you don’t have to filter events by target, and can register them on the exact children you’d like to listen to. On the other hand, using `this.addEventListener` allows you to register `passive` listeners, or listeners which trigger during the capturing phase. Crank supports both API styles for convenience and flexibility.

### Dispatching events
Crank contexts implement the full EventTarget interface, meaning you can use `this.dispatchEvent` and the [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) constructor to bubble events to parent components:

```jsx
function MyButton(props) {
  this.addEventListener("click", () => {
    this.dispatchEvent(new CustomEvent("mybutton.click", {
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
  this.addEventListener("mybutton.click", (ev) => {
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

`MyButton` is a function component which wraps a `button` element. It bubbles a `CustomEvent` whose type is `"mybutton.click"` when it is pressed, and whose `detail` property contains data about the id of the clicked button. This event is not bubbled to parent DOM nodes but to parent component contexts, and in the example, it propagates to the context of `MyApp`. Using custom events and event bubbling allows you to encapsulate state transitions within component hierarchies without resorting to state management solutions like Redux from React.
