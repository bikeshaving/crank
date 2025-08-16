---
title: Components
---

## Basic Components

So far, we’ve only seen and used *host elements*. By convention, all host
elements use lowercase tags like `<a>` or `<div>`, and these elements are
rendered as their HTML equivalents.

However, eventually we’ll want to group these elements into reusable
*components*. In Crank, all components are defined with plain old JavaScript
functions which produce JSX elements. These functions can be referenced as
element tags, and component elements are distinguished from host elements
through the use of capitalized identifiers. The capitalized identifier is not
just a convention but a way to tell JSX compilers to interpret the tag as an
identifier rather than a literal string.

The simplest kind of component is a *function component*. When rendered, the
function is invoked with the props of the element as its first argument, and
the return value of the function is rendered as the element’s children.

```jsx live
import {renderer} from "@b9g/crank/dom";
function Greeting({name}) {
  return <div>Hello, {name}</div>;
}

renderer.render(<Greeting name="World" />, document.body);
```

## Component children
Component elements can have children just like host elements. The
`createElement()` function will add children to the props object under the name
`children`, and it is up to the component to place the children somewhere in
the returned element tree, otherwise it will not appear in the rendered output.

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

The type of children is unknown, e.g. it could be an array, an element, or
whatever else the caller passes in.

## Stateful Components

Function components are great for displaying data, but what about components
that need to remember things or respond to user interactions? For example, a
counter that tracks clicks, or a form that manages input state.

In Crank, we use [generator
functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*)
to create stateful components. Generator functions are declared using `function
*` syntax and can pause and resume execution using `yield`.

Here's a simple example to illustrate the concept:

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

In this example, each time `<Counter />` is rendered, the generator resumes
where it left off, increments the count, and yields a new element. The local
variable `count` persists between renders because it's stored in the
generator's scope.

However, there's a problem with the `while (true)` approach: if you forget to
add a `yield`, your component will run forever and freeze the page. A better
pattern is to use the component's context as an iterator.

## The Crank Context

Crank provides each component with a *context* object, available as the `this`
keyword. This context gives you access to props, lifecycle methods, and most
importantly, the ability to re-render your component on demand.

### The Props Iterator Pattern

The safest way to write generator components is to iterate over the context
itself, which yields the component's props on each render:

```jsx live
import {renderer} from "@b9g/crank/dom";

function *Counter() {
  let count = 0;
  // Iterate over props - safe and prevents infinite loops
  for ({} of this) {
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

This pattern is much safer than `while (true)` because:
- It automatically receives new props when the component is re-rendered
- It's impossible to create infinite loops by forgetting `yield`
- It makes your components responsive to prop changes

But so far, our components only update when re-rendered from above. What if you
want to update based on user interactions, timers, or other events?

## Self-Updating Components with refresh()

For components that need to update themselves—like timers, animations, or user
interactions—Crank provides the `refresh()` method:

```jsx live
import {renderer} from "@b9g/crank/dom";

function *Timer() {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);

  for ({} of this) {
    yield <p>{seconds} second{seconds !== 1 && "s"}</p>;
  }

  clearInterval(interval);
}

renderer.render(<Timer />, document.body);
```

This `<Timer>` component updates its own state in the `setInterval()` callback
and calls `refresh()` to trigger a re-render. The props iterator receives the
new render and yields updated content. After the component unmounts, the code
after the for loop runs for cleanup.

### The refresh() Callback Pattern

One issue with the code above is that it's easy to forget to call `refresh()`
after a state update. Starting in Crank 0.7, the `refresh()` method can accept
an optional callback function that executes immediately before re-rendering:

```jsx live
import {renderer} from "@b9g/crank/dom";

function *Timer({message = "Seconds elapsed:"}) {
  let seconds = 0;
  const interval = setInterval(() => this.refresh(() => seconds++), 1000);

  for ({message} of this) {
    yield (
      <div>{message} {seconds}</div>
    );
  }

  clearInterval(interval);
}

renderer.render(<Timer />, document.body);
```

This pattern is particularly useful for event handlers:

**Without callback:**
```jsx
const onclick = () => {
  count++;
  // Oops! Forgot to call this.refresh() - UI won't update
};
```

**With callback:**
```jsx
const onclick = () => this.refresh(() => count++);
```

Using the callback pattern consistently makes it impossible to forget to call
`refresh()` and provides a clean, functional approach to state updates.

### Alternative Context Syntax

If you prefer not to use the `this` keyword, the context is also passed as the
second parameter:

```jsx
function *Timer({message}, ctx) {
  let seconds = 0;
  const interval = setInterval(() => ctx.refresh(() => seconds++), 1000);

  for ({message} of ctx) {
    yield (
      <div>{message} {seconds}</div>
    );
  }

  clearInterval(interval);
}
```

## Default Props
Because we use [object
destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#Object_destructuring),
you can further assign default values to specific props using JavaScript’s
default value syntax.

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
