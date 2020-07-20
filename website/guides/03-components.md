---
title: Components
---

So far, we’ve only seen and used host elements, but eventually, we’ll want to group parts of the element tree into reusable *components.* In Crank, all components are functions; there is no class-based component API.

## Basic Components
The simplest kind of component is a *function component*. When rendered, the function is invoked with the props of the element as its first argument, and the return value of the function is recursively rendered as the element’s children.

```js
function Greeting({name}) {
  return <div>Hello, {name}</div>;
}

renderer.render(<Greeting name="World" />, document.body);
console.log(document.body.innerHTML); // "<div>Hello World</div>"
```

Component elements can be passed children just as host elements can. The `createElement` function will add children to the props object under the name `children`, and it is up to the component to place these children somewhere in the returned element tree. If you don’t use the `children` prop, it will not appear in the rendered output.

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
Eventually, you’ll want to write components with local state. In Crank, we use [generator functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*) to do so. These types of components are referred to as *generator components*.

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

By yielding elements rather than returning them, we can make components stateful using variables in the generator’s local scope. Every time a generator component is rendered, Crank resumes the generator, pausing at the next `yield`. The yielded expression, usually an element, is then recursively rendered, just as if it were returned from a function component. Furthermore, Crank uses the same diffing algorithm which reuses DOM nodes to reuse generator objects, so that the execution of generator components are preserved between renders.

### Contexts
In the preceding example, the `Counter` component’s local state changes when it is rerendered, but we may want to write components which update themselves instead according to timers or events. Crank allows components to control themselves by passing in an object called a *context* as the `this` keyword of each component. Contexts provide several utility methods, most important of which is the `refresh` method, which tells Crank to update the related component instance in place.

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

This `Timer` component is similar to the `Counter` one, except now the state (the local variable `seconds`) is updated in the callback passed to `setInterval`, rather than when the component is rerendered. Additionally, the `refresh` method is called to ensure that the generator is stepped through whenever the `setInterval` callback fires, so that the rendered DOM actually reflects the updated `seconds` variable.

One important detail about the `Timer` example is that it cleans up after itself with `clearInterval`. Crank will call the `return` method on generator components when the element is unmounted, so that the finally block executes and `clearInterval` is called. In this way, you can use the natural lifecycle of a generator to write setup and teardown logic for components, all within the same scope.

### Props Updates
The generator components we’ve seen so far haven’t used props. Generator components can accept props as its first parameter just like regular function components.

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

renderer.render(
  <LabeledCounter message="What if I update the message:" />,
  document.body,
);

// WOOPS!
console.log(document.body.innerHTML); // "<div>The count is now: 3</div>"
```

This mostly works, except now we have a bug where the component kept yielding the initial message even though a new message was passed in via props. To fix this, we can make sure props are kept up to date by iterating over the context:

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
renderer.render(
  <Counter message="What if I update the message:" />,
  document.body,
);
console.log(document.body.innerHTML);
// "<div>What if I update the message: 2</div>"
```

By replacing the `while` loop with a `for…of` loop which iterates over `this`, you can get the latest props each time the generator is resumed. This is possible because contexts are an iterable of the latest props passed to elements.

### Comparing Old and New Props

One idiom we see in the preceding example is that we overwrite the variables declared via the generator’s parameters with the destructuring expression in the `for…of` statement. This is an easy way to make sure those variables stay in sync with the current props of the component. However, there is no requirement that you must always overwrite old props in the `for` expression, meaning you can assign new props to a different variable and compare them against the old ones:

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

## Default Props
You may have noticed in the preceding examples that we used [object destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#Object_destructuring) on the props parameter for convenience. You can further assign default values to a specific prop by using JavaScript’s default value syntax.

```jsx
function Greeting({name="World"}) {
  return <div>Hello, {name}</div>;
}

renderer.render(<Greeting />, document.body); // "<div>Hello World</div>"
```

This works well for function components, but for generator components, you should make sure that you use the same default value in both the parameter list and the `for` statement.

```jsx
function *Greeting({name="World"}) {
  for ({name="World"} of this) {
    yield <div>Hello, {name}</div>;
  }
}
```

A mismatch in the default values for a prop between these two positions may cause surprising behavior.
