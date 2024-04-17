---
title: Components
---

## Basic Components

So far, we’ve only seen and used *host elements*. By convention, all host elements use lowercase tags like `<a>` or `<div>`, and these elements are rendered as their HTML equivalents.

However, eventually we’ll want to group these elements into reusable *components*. In Crank, all components are defined with plain old JavaScript functions which produce JSX elements. These functions can be referenced as element tags, and component elements are distinguished from host elements through the use of capitalized identifiers. The capitalized identifier is not just a convention but a way to tell JSX compilers to interpret the tag as an identifier rather than a literal string.

The simplest kind of component is a *function component*. When rendered, the function is invoked with the props of the element as its first argument, and the return value of the function is rendered as the element’s children.

```jsx live
import {renderer} from "@b9g/crank/dom";
function Greeting({name}) {
  return <div>Hello, {name}</div>;
}

renderer.render(<Greeting name="World" />, document.body);
```

## Component children
Component elements can have children just like host elements. The `createElement()` function will add children to the props object under the name `children`, and it is up to the component to place the children somewhere in the returned element tree, otherwise it will not appear in the rendered output.

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

The type of children is unknown, e.g. it could be an array, an element, or whatever else the caller passes in.

## Stateful Components
Eventually, you’ll want to write components with local state. In Crank, we use [generator functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*) to do so. These types of components are referred to as *generator components*.

A generator function is declared using `function *` syntax, and its body can contain one or more `yield` expressions.

```jsx live
import {renderer} from "@b9g/crank/dom";

function *Counter() {
  let count = 0;
  while (true) {
    count++;
    yield (
      <div>
        This component has updated {count} time{count !== 1 && "s"}.
      </div>
    );
  }
}

renderer.render(<Counter />, document.body);
renderer.render(<Counter />, document.body);
renderer.render(<Counter />, document.body);
```

By yielding elements rather than returning them, components can be made stateful using variables in the generator’s local scope. Crank uses the same diffing algorithm which reuses DOM nodes to reuse generator objects, so there will only be one execution of a generator component for a given element in the tree.

## The Crank Context
In the preceding example, the component’s local state `count` was updated directly when the generator was re-rendered. This is of limited value insofar as what we usually want want is to update according to events or timers.

Crank allows components to control their own execution by passing in an object called a *context* as the `this` keyword of each component. Contexts provide several utility methods, the most important of which is the `refresh()` method, which tells Crank to update the related component instance in place.

```jsx live
import {renderer} from "@b9g/crank/dom";
function *Timer({message}) {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);

  try {
    while (true) {
      yield (
        <div>{message} {seconds}</div>
      );
    }
  } finally {
    clearInterval(interval);
  }
}

renderer.render(<Timer message="Seconds elapsed:" />, document.body);
```

This `<Timer>` component is similar to the `<Counter>` one, except now the state (the local variable `seconds`) is updated in a `setInterval()` callback, rather than when the component is rerendered. Additionally, the `refresh()` method is called to ensure that the generator is stepped through whenever the `setInterval()` callback fires, so that the rendered DOM actually reflects the updated `seconds` variable. Finally, the `<Timer>` component is passed a display message as a prop.

One important detail about the `Timer` example is that it cleans up after itself with `clearInterval()` in the `finally` block. Behind the scenes, Crank will call the `return()` method on the component’s generator object when it is unmounted.

If you hate the idea of using the `this` keyword, the context is also passed in as the second parameter of components.

```jsx
function *Timer({message}, ctx) {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    ctx.refresh();
  }, 1000);

  try {
    while (true) {
      yield (
        <div>{message} {seconds}</div>
      );
    }
  } finally {
    clearInterval(interval);
  }
}
```

## The Render Loop

The `<Timer>` component works, but it can be improved. Firstly, while the component is stateful, it would not update the message if it was rerendered with new props. Secondly, the `while (true)` loop can iterate infinitely if you forget to add a `yield`, leading to unresponsive pages. To solve both of these issues, Crank contexts are themselves an iterable of props.

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
      <div>{message} {seconds}</div>
    );
  }

  clearInterval(interval);
}

renderer.render(
  <Timer message="Seconds elapsed:" />,
  document.body,
);

setTimeout(() => {
  renderer.render(
    <Timer message="Seconds elapsed (updated in setTimeout):" />,
    document.body,
  );
}, 2500);
```

The loop created by iterating over contexts is called the *render loop*. By replacing the `while` loop with a `for...of` loop, you can get the latest props each time the generator is resumed. It also prevents common development mistakes by throwing errors if you forget to yield, or yield multiple times in a loop. FInally, it also allows you to write cleanup code after the loop without having to wrap the entire loop in a `try`/`finally` block, as you would in a `while` loop.

One Crank idiom you may have noticed is that we define props in function parameters and overwrite them using a destructuring expression. This is an easy way to make sure those variables stay in sync with the current props of the component. For this reason, even if your component has no props, it is idiomatic to destructure props and use a `for...of` loop.

```jsx live
import {renderer} from "@b9g/crank/dom";
function *Counter() {
  let count = 0;
  const onclick = () => {
    count++;
    this.refresh();
  };

  // using an empty destructuring expression means we do not need to declare
  // more variables when there are no props
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
Because we use [object destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#Object_destructuring), you can further assign default values to specific props using JavaScript’s default value syntax.

```jsx live
import {renderer} from "@b9g/crank/dom";
function Greeting({name="World"}) {
  return <div>Hello, {name}</div>;
}

renderer.render(<Greeting />, document.body);
```

For generator components, you should make sure that you use the same default value in both the parameter list and the loop. A mismatch in the default values for a prop between these two positions may cause surprising behavior.

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
