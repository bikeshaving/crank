# Components
So far, we’ve only rendered intrinsic elements directly, but eventually, we’ll want to group parts of the element tree into reusable *components.* In Crank, all components are functions which are passed props and produce elements; there is no class-based interface. These functions are called by creating elements with the functions as tags (`<Component />`).

### Basic Components
```js
function Greeting ({name}) {
  return <div>Hello, {name}</div>;
}

renderer.render(<Greeting name="Andrew" />, document.body);
console.log(document.body.innerHTML); // <div>Hello Andrew</div>
```

The simplest kind of component you can write is a *synchronous function component*. When the renderer renders these components, the tag function is called with the props object of the element as its first argument, and the return value, usually an element, is then recursively rendered by the renderer.

As seen in the example above, you can use [object destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#Object_destructuring) on the props parameter for convenience. Additionally, you can assign default values to each prop using JavaScript’s default value syntax:

```js
function Greeting ({name = "Nemo"}) {
  return <div>Hello, {name}</div>;
}

renderer.render(<Greeting />, document.body);
// <div>Hello Nemo</div>
```

Component elements can take children just like intrinsic elements can. The `createElement` function will add children to props under the property named `children`, and it is up to the component to place the children somewhere in the returned element tree. If you don’t use the `children` prop, the `children` passed in will not be rendered.

```js
function Greeting ({name="Nemo", children}) {
  return (
    <div>
      Message for {name}: {children}
    </div>
  );
}

renderer.render(
  <Greeting>
    <span>Howdy!</span>
  </Greeting>,
  document.body,
);

console.log(document.body.innerHTML); // <div>Message for Nemo: <span>Howdy</span></div>
```

## Generator Components
Eventually, you’re going to want to create components with local state. In Crank, we use [generator functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*) to do so.

```jsx
function *Counter () {
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
// <div>You have updated this component 1 time</div>
renderer.render(<Counter />, document.body);
console.log(document.body.innerHTML);
// <div>You have updated this component 2 times</div>
renderer.render(<Counter />, document.body);
renderer.render(<Counter />, document.body);
renderer.render(<Counter />, document.body);
console.log(document.body.innerHTML);
// <div>You have updated this component 5 times</div>
renderer.render(null, document.body);
console.log(document.body.innerHTML);
// ""
renderer.render(<Counter />, document.body);
// <div>You have updated this component 1 time</div>
```

Because we’re now yielding elements rather than returning them, we can make components stateful using local variables. Every time the component is updated, Crank steps through the generator once, pausing at the next `yield`. The yielded expressions, usually elements, are then recursively rendered by the renderer, just as if it were returned in a sync component. Crank uses the same diffing algorithm used to reuse DOM nodes to reuse generator objects, allowing you to encapsulate local state and reset it when necessary.

### The `this` keyword
`Counter` is a stateful component whose local state only changes when it is updated, but we may want to write components which update themselves based on timers or events. Crank allows components to control themselves by passing in a custom object called a *context* as the `this` keyword of each component. Contexts provide several utility methods, most important of which is `this.refresh`, which tells Crank to update the component in place. For generator components, this means that the renderer will resume the generator so it can yield another value.

```jsx
function *Timer () {
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

This `Timer` component is similar to the `Counter` one, except now the state (the local variable `seconds`) is updated in the callback passed to `setInterval`, rather than when the component is updated. `this.refresh` is called to ensure that the outer generator is stepped through, so that the rendered DOM actually reflects the updated state.

### Cleanup with `try`/`finally`
One important detail about the `Timer` example above is that it cleans up after itself with `clearInterval`. Crank will call `return` on the generator object which your component returns, so when your component is removed, the finally block executes and `clearInterval` is called. In this way, you can use the natural lifecycle of a generator to write setup and teardown logic for components, all within the same variable scope.

### Prop updates
The generator components we’ve seen so far haven’t used the props object, but they can accept props as the first parameter just like regular function components.

```jsx
function *LabeledCounter ({message}) {
  let count = 0;
  while (true) {
    count++;
    yield <div>{message} {count}</div>;
  }
}

renderer.render(<LabeledCounter message="The count is now:" />, document.body);
console.log(document.body.innerHTML); // <div>The count is now: 1</div>
renderer.render(<LabeledCounter message="The count is now:" />, document.body);
console.log(document.body.innerHTML); // <div>The count is now: 2</div>
renderer.render(<LabeledCounter message="What if I update the message:" />, document.body);
console.log(document.body.innerHTML); // <div>The count is now: 3</div>
// WOOPS!
```

This mostly works, except we have a bug where the component kept yielding the initial message even though a new message was passed in via props. In generator components, we can make sure props are kept up to date by iterating over the `this` object:

```jsx
function *Counter ({message}) {
  let count = 0;
  for ({message} of this) {
    count++;
    yield (
      <div>{message} {count}</div>
    );
  }
}

renderer.render(<Counter message="The count is now:" />, document.body);
console.log(document.body.innerHTML); // <div>The count is now: 1</div>
renderer.render(<Counter message="What if I update the message:" />, document.body);
console.log(document.body.innerHTML); // <div>What if I update the message: 2</div>
```

By replacing the `while (true)` loop with a `for…of` loop which iterates over the `this` object, you can get the latest props passed to the generator. This is possible because contexts are an iterable of the props passed to components. The generator is then expected to yield once per iteration of the context in response to new props.

One Crank idiom we see in the example above is the overwriting of variables declared via the generator’s parameters (`message`) with the `for…of` loop. This allows those variables to always remain in sync with the current props passed to each component. However, there is no reason you have to always overwrite old props in the `for` expression, meaning you can assign new props to a different variable and compare them against the old props:

```jsx
function *Greeting ({name}) {
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
console.log(document.body.innerHTML);
// <div>Hello Alice</div>
renderer.render(<Greeting name="Alice" />, document.body);
console.log(document.body.innerHTML);
// <div>Hello again Alice</div>
renderer.render(<Greeting name="Bob" />, document.body);
console.log(document.body.innerHTML);
// <div>Goodbye Alice and hello Bob</div>
renderer.render(<Greeting name="Bob" />, document.body);
console.log(document.body.innerHTML);
// <div>Hello again Bob</div>
```

The fact that state is just local variables allows us to blur the lines between props and state, in a way that is easy to understand and without finicky lifecycle methods like `componentWillUpdate` from React. With generators and `for` loops, comparing old and new props is as easy as comparing adjacent elements of an array.

## Interactive components with event listeners
Components produce elements, which are in turn rendered to DOM nodes. Most applications require event listeners to be attached to these nodes so that application state can be updated according to user input. To facilitate this, the Crank context implements the same `EventTarget` interface used by the DOM, and automatically registers and tears down these listeners as elements are inserted and removed. By combining event listeners with local variables and the `this.refresh` method, you can write interactive components.

```jsx
function *Clicker () {
  let count = 0;
  this.addEventListener("click", () => {
    count++;
    this.refresh();
  });

  while (true) {
    yield (
      <button>I have been clicked {count} times</button>
    );
  }
}

```

The local state `count` is now updated in the event listener, which triggers when the yielded button is actually clicked. The `this.addEventListener` method only attaches to the top-level node which each component renders, so if you want to listen to events on a nested node, you must use event delegation:

```jsx
function *Clicker () {
  let count = 0;
  this.addEventListener("click", (ev) => {
    if (ev.tagName === "BUTTON") {
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

Because the event listener is attached to the outer `div`, we have to filter events by `ev.target.tagName` to make sure we’re not incrementing `count` based on clicks which don’t target the `button`.

### Dispatching events
You can also add event listeners to regular function components, but because function components can’t have local state, it doesn’t really make sense to update the component using `this.refresh`. However, one important use-case for adding event listeners to function components is to listen for events and then bubble custom events to parents using `this.dispatchEvent`.

```jsx
function MyButton (props) {
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

function *MyApp () {
  let lastId;
  this.addEventListener("mybutton.click", (ev) => {
    lastId = ev.detail.id;
    this.refresh();
  });
  while (true) {
    yield (
      <div>
        <MyButton id="button1">Button 1</MyButton>
        <MyButton id="button2">Button 2</MyButton>
        <MyButton id="button3">Button 3</MyButton>
        <div>Last pressed id: {lastId == null ? "N/A" : lastId}</div>
      </div>
    );
  }
}
```

`MyButton` is a button which bubbles a [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) whose type is `"mybutton.click"`, with data about which button was clicked as the `detail` of the event. This event is not bubbled to parent DOM nodes but to parent component contexts, and in the example, it propagates to the component context of `MyApp`. Using custom events and event bubbling allows you to encapsulate state transitions within parent components without resorting to complicated state management solutions like `Redux` or `Vuex`.

### Accessing rendered values
Sometimes, the declarative rendering of DOM nodes is not enough, and you’ll want to access the actual DOM nodes you’ve rendered, to make measurements or call imperative methods like `el.focus()`, for instance. To facilitate this, Crank will pass rendered DOM nodes back into the generator, so `yield` expressions can themselves be read. The following component is focused whenever it is updated.

```jsx
function *MyInput (props) {
  setTimeout(() => this.refresh());
  for (props of this) {
    const input = yield <input {...props}/>;
    input.focus();
  }
}
```

Because generator components pause at yield, we defer a `this.refresh` call using `setTimeout` when the component is initialized.

### Returning from a generator
Usually, you’ll yield in generator components so that they can continue to respond to updates, but you may want to also `return` a final state. Unlike function components, which are called and returned once for each update, once a generator component returns, it will never update again.

```jsx
function *Stuck({message}) {
  return <div>{message}</div>;
}

renderer.render(<Stuck message="Hello" />, document.body);
console.log(document.body.innerHTML); // <div>Hello</div>
renderer.render(<Stuck message="Goodbye" />, document.body);
console.log(document.body.innerHTML); // <div>Hello</div>
renderer.render(<Stuck message="Passing in new props is useless" />, document.body);
console.log(document.body.innerHTML); // <div>Hello</div>
```

### Catching errors from child components
We all make mistakes, and it can be useful to catch errors in our components so we can show the user something or notify error-logging services. To facilitate this, Crank will throw errors from child components back into parent components, causing the most recent yield to throw the error. You can therefore wrap your `yield` operators in a `try`/`catch` block to catch errors from children.

```jsx
function Thrower () { 
  throw new Error("Hi");
}

function *Catcher () {
  try {
    yield <Thrower />;
  } catch (err) {
    return <div>There was a problem with your application: {err.message}</div>;
  }
}
```

### The power of local variables
As you can see, Crank leverages local variables within generators instead of requiring separate concepts like `state` and `refs` from React. If you add in event listeners and the natural lifecycle provided by generator functions, it almost feels like the early days of JavaScript, when we made interactive pages by creating global variables and mutating them with global event listeners. Crank brings that same simplicity back to JavaScript development, except thanks to JSX and generators, the variables and callbacks are now fully encapsulated.

