---
title: Components
---

So far, we’ve only seen and used *host elements*, lower-case elements like `<a>` or `<div>`, which correspond to HTML. Now we’ll want to group these elements into reusable *components*. Crank uses plain old JavaScript functions to define components. The type of the function determines the component’s behavior.

## Basic Components
The simplest kind of component is a *function component*. When rendered, the function is invoked with the props of the element as its first argument, and the return value of the function is rendered as the element’s children.

```jsx live
import {renderer} from "@b9g/crank/dom";
function Greeting({name}) {
  return <div>Hello, {name}</div>;
}

renderer.render(<Greeting name="World" />, document.body);
```

## Component children
Components can be passed children just like host elements. The `createElement()` function will add children to the props object under the name `children`, and it is up to the component to place the children somewhere in the returned element tree, otherwise it will not appear in the rendered output.

```jsx live
import {renderer} from "@b9g/crank/dom";

function Details({summary, children}) {
  return (
    <details>
      <summary>{summary}</summary>
      {children}
    </details>
  );
}

renderer.render(
  <Details summary="Greeting">
    <div>Hello world</div>
  </Details>,
  document.body,
);
```

The type of children is unknown, i.e. it could be an array, an element, or whatever else the caller passes in.

## Stateful Components
Eventually, you’ll want to write components with local state. In Crank, we use [generator functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*) to do so. These types of components are referred to as *generator components*.

```jsx live
import {renderer} from "@b9g/crank/dom";

function *Counter() {
  let count = 0;
  while (true) {
    count++;
    yield (
      <div>
        You have updated this component {count} time{count !== 1 && "s"}.
      </div>
    );
  }
}

renderer.render(<Counter />, document.body);
renderer.render(<Counter />, document.body);
renderer.render(<Counter />, document.body);
```

By yielding elements rather than returning them, we can make components stateful using variables in the generator’s local scope. Crank uses the same diffing algorithm which reuses DOM nodes to reuse generator objects, so there will only be one execution of a generator component per rendered element.

## The Crank Context
In the preceding example, the component’s local state was updated directly when the generator was executed. This is of limited value insofar as what we usually want want is to update according to events or timers.

Crank allows components to control their own execution by passing in an object called a *context* as the `this` keyword of each component. Contexts provide several utility methods, the most important of which is the `refresh()` method, which tells Crank to update the related component instance in place.

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

This `<Timer />` component is similar to the `<Counter />` one, except now the state (the local variable `seconds`) is updated in a `setInterval()` callback, rather than when the component is rerendered. Additionally, the `refresh()` method is called to ensure that the generator is stepped through whenever the `setInterval()` callback fires, so that the rendered DOM actually reflects the updated `seconds` variable.

One important detail about the `Timer` example is that it cleans up after itself with `clearInterval()` in the `finally` block. Behind the scenes, Crank will call the `return()` method on an element’s generator object when it is unmounted.

## The Render Loop

The generator components we’ve seen so far haven’t used props. They’ve also used while (true) loops, which was done mainly for learning purposes. In actuality, Crank contexts are iterables of props, so you can `for...of` iterate through them.

```jsx live
import {renderer} from "@b9g/crank/dom";
function *Timer({message}) {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);

  for ({message} of this) {
    yield (
      <div>{message}: {seconds}</div>
    );
  }

  clearInterval(interval);
}

renderer.render(
  <Timer message="Seconds elapsed" />,
  document.body,
);

setTimeout(() => {
  renderer.render(
    <Timer message="Hello from the timeout" />,
    document.body,
  );
}, 4500);
```

The loop created by iterating over contexts is called the *render loop*. By replacing the `while` loop with a `for...of` loop which iterates over `this`, you can get the latest props each time the generator is resumed.

The render loop has additional advantages over while loops. For instance, you can place cleanup code directly after the loop. The render loop will also throw errors if it has been iterated without a yield, to prevent infinite loops.

One Crank idiom you may have noticed is that we define props in component parameters, and overwrite them using a destructuring expression in the `for...of` statement. This is an easy way to make sure those variables stay in sync with the current props of the component.

Even if your component has no props, it is idiomatic to use a render loop.

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
        Button presed {count} time{count !== 1 && "s"}.
      </button>
    );
  }
}

renderer.render(<Counter />, document.body);
```

## Default Props
You may have noticed in the preceding examples that we used [object destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#Object_destructuring) on the props parameter for convenience. You can further assign default values to specific props using JavaScript’s default value syntax.

```jsx
function Greeting({name="World"}) {
  return <div>Hello, {name}</div>;
}

renderer.render(<Greeting />, document.body); // "<div>Hello World</div>"
```

This syntax works well for function components, but for generator components, you should make sure that you use the same default value in both the parameter list and the loop. A mismatch in the default values for a prop between these two positions may cause surprising behavior.

```jsx live
import {renderer} from "@b9g/crank/dom";
function *Greeting({name="World"}) {
  yield <div>Hello, {name}</div>;
  for ({name="World"} of this) {
    yield <div>Hello again, {name}</div>;
  }
}

renderer.render(<Greeting />, document.body);
```
