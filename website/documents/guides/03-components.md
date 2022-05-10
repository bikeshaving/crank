---
title: Components
---

So far, we’ve only seen and used host elements, but eventually, we’ll want to group these elements into reusable *components*. Crank uses plain old JavaScript functions to define components, and we will see how it uses the different kinds of function types to allow developers to write reusable, stateful and interactive components.

## Basic Components
The simplest kind of component is a *function component*. When rendered, the function is invoked with the props of the element as its first argument, and the return value of the function is recursively rendered as the element’s children.

```jsx live
import {createElement} from "https://unpkg.com/@b9g/crank/crank";
import {renderer} from "https://unpkg.com/@b9g/crank/dom";
function Greeting({name}) {
  return <div>Hello, {name}</div>;
}

renderer.render(<Greeting name="World" />, document.body);
```

Component elements can be passed children just as host elements can. The `createElement()` function will add children to the props object under the name `children`, and it is up to the component to place them somewhere in the returned element tree. If you don’t use the `children` prop, it will not appear in the rendered output.

```jsx live
import {createElement} from "https://unpkg.com/@b9g/crank/crank";
import {renderer} from "https://unpkg.com/@b9g/crank/dom";

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

By yielding elements rather than returning them, we can make components stateful using variables in the generator’s local scope. Crank uses the same diffing algorithm which reuses DOM nodes to reuse generator objects, so that their executions are preserved between renders. Every time a generator component is rendered, Crank resumes the generator and executes the generator until the next `yield`. The yielded expression, usually an element, is then rendered as the element’s children, just as if it were returned from a function component.

### Contexts
In the preceding example, the `Counter` component’s local state changed when it was rerendered, but we may want to write components which update themselves according to timers or events instead. Crank allows components to control their own execution by passing in an object called a *context* as the `this` keyword of each component. Component contexts provide several utility methods, most important of which is the `refresh` method, which tells Crank to update the related component instance in place.

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

This `Timer` component is similar to the `Counter` one, except now the state (the local variable `seconds`) is updated in a `setInterval()` callback, rather than when the component is rerendered. Additionally, the `refresh()` method is called to ensure that the generator is stepped through whenever the `setInterval()` callback fires, so that the rendered DOM actually reflects the updated `seconds` variable.

One important detail about the `Timer` example is that it cleans up after itself with `clearInterval()` in the `finally` block. Behind the scenes, Crank will call the `return()` method on an element’s generator object when it is unmounted.

### Props Updates
The generator components we’ve seen so far haven’t used props. Generator components can accept props as their first parameter just like regular function components.

```jsx
function *LabeledCounter({message}) {
  let count = 0;
  while (true) {
    count++;
    yield <div>{message} {count}</div>;
  }
}

renderer.render(
  <LabeledCounter message="The count is now:" />,
  document.body,
);

console.log(document.body.innerHTML); // "<div>The count is now: 1</div>"

renderer.render(
  <LabeledCounter message="The count is now:" />,
  document.body,
);

console.log(document.body.innerHTML); // "<div>The count is now: 2</div>"

renderer.render(
  <LabeledCounter message="Le décompte est maintenant:" />,
  document.body,
);

// WOOPS!
console.log(document.body.innerHTML); // "<div>The count is now: 3</div>"
```

This mostly works, except we have a bug where the component keeps yielding elements with the initial message even though a new message was passed in via props. We can make sure props are kept up to date by iterating over the context:

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

renderer.render(
  <Counter message="The count is now:" />,
  document.body,
);

console.log(document.body.innerHTML); // "<div>The count is now: 1</div>"

renderer.render(
  <Counter message="Le décompte est maintenant:" />,
  document.body,
);

console.log(document.body.innerHTML); // "<div>Le décompte est maintenant: 2</div>"
```

By replacing the `while` loop with a `for…of` loop which iterates over `this`, you can get the latest props each time the generator is resumed. This is possible because contexts are an iterable of the latest props passed to components.

### Comparing Old and New Props

One Crank idiom we see in the preceding example is that we overwrite the variables declared via the generator’s parameters with the destructuring expression in the `for…of` statement. This is an easy way to make sure those variables stay in sync with the current props of the component. However, there is no requirement that you must always overwrite old props in the `for` expression, meaning you can assign new props to a different variable and compare them against the old props.

```jsx live
import {createElement} from "https://unpkg.com/@b9g/crank/crank";
import {renderer} from "https://unpkg.com/@b9g/crank/dom";

function *Greeting({name}) {
  yield <div>Hello {name}.</div>;
  for (const {name: newName} of this) {
    if (name === newName) {
      yield (
        <div>Hello again {newName}.</div>
      );
    } else {
      yield (
        <div>Goodbye {name} and hello {newName}.</div>
      );
    }

    name = newName;
  }
}

function *App() {
  let i = 0;
  for ({} of this) {
    const name = (Math.floor(i++ / 2) % 2) === 0 ? "Alice" : "Bob";
    yield (
      <div>
        <Greeting name={name} />
        <button onclick={() => this.refresh()}>Rerender</button>
      </div>
    );
  }
}

renderer.render(<App />, document.body);
```

The fact that state is just local variables allows us to blur the lines between props and state, in a way that is easy to understand and without lifecycle methods like `componentWillUpdate` from React. With generators and `for` loops, comparing old and new props is as easy as comparing adjacent elements of an array.

## Default Props
You may have noticed in the preceding examples that we used [object destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#Object_destructuring) on the props parameter for convenience. You can further assign default values to specific props by using JavaScript’s default value syntax.

```jsx
function Greeting({name="World"}) {
  return <div>Hello, {name}</div>;
}

renderer.render(<Greeting />, document.body); // "<div>Hello World</div>"
```

This syntax works well for function components, but for generator components, you should make sure that you use the same default value in both the parameter list and the `for` statement.

```jsx
function *Greeting({name="World"}) {
  yield <div>Hello, {name}</div>;
  for ({name="World"} of this) {
    yield <div>Hello again, {name}</div>;
  }
}
```

A mismatch in the default values for a prop between these two positions may cause surprising behavior.
