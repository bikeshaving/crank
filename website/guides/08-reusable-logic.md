---
title: Reusable Logic
---

This guide describes additional APIs as well as design patterns for developers who wish to reuse logic between components, or write Crank-specific libraries.

## Additional `Context` methods and properties 
Crank provides several additional methods and properties via the `Context` API to help you share logic between components. Most of the APIs demonstrated here are for library authors and should not be used in the course of typical application development.

### `Context.prototype.props`
The current props of a component can be accessed via the readonly context property `props`. We recommended that you access props within components via component parameters or context iterators, but the `props` property can be useful when you need to access a component’s current props from within a plugin or extension.
 
```tsx
EXAMPLE TK
```

### `Context.prototype.value`
Similarly, the most recently rendered value of a component is accessible via the readonly context property `value`. Again, we recommended that you access rendered values via the many methods described in [accessing rendered values](#KTKTKTKTK), but it can be useful to access the current value directly when writing helper context methods.

```tsx
EXAMPLE TK
```

### Provisions
Crank allows you to provide data to all of a component’s descendants via the methods `Context.prototype.get` and `Context.prototype.set`. The `set` method sets a “provision” under a specific key, and the `get` method.

```ts
function GreetingProvider({greeting, children}) {
  this.set("greeting", greeting);
  return children;
}

function Greeting({name}) {
  const greeting = this.get("greeting");
  return <p>{greeting}, {name}</p>;
}

function* App() {
  return (
    <div>
      <Greeting name="Brian" />
    </div>
  );
}

renderer.render(
  <GreetingProvider greeting="Hello">
    <App />
  </GreetingProvider>,
  document.body,
);

console.log(document.body); // "<div><p>Hello, Brian</p></div>"
```

Provisions allow libraries to define components which interact with their descendants without rigidly defined component hierarchies or requiring the library user to pass data manually between components as props. This makes them useful, for instance, when writing multiple components which communicate with each other, like custom `select` and `option` form elements, or drag-and-drop components.

Anything can be passed as a key to the `get` and `set` methods, so you can use a symbol to ensure that the provision you pass between components are private and do not collide with contexts set by others.

**Warning:** This API is more unstable than others, and the method names and behavior of components which use this method may change.

Crank does not link “providers” and “consumers” in any way, and doesn’t automatically refresh components when `set` is called, so it’s up to you to make sure consumers update when providers update.

### `Context.prototype.schedule`
You can pass a callback to the `schedule` method to listen for when the component commits. This can be deferred if the component runs asynchronously or has async children.

```ts
EXAMPLE TKKTKTKTK
```

Callbacks passed to `schedule` fire synchronously after the component commits, with the rendered value of the component as its only parameter. They only fire once per call and callback function (think `requestAnimationFrame`, not `setInterval`). This means you have to continuously call the `schedule` method for each update if you want to execute some code every time your component commits.

### `Context.prototype.cleanup`
Similarly, you can pass a callback to the `cleanup` method to listen for when the component unmounts.

```ts
EXAMPLE TKTKTKTKTK
```

All `cleanup` callbacks fire synchronously when the component is removed, and only once per registered callback function.

## Strategies for Reusing Logic
The following are various patterns you can use to write and reuse logic between components, as well as a description of their tradeoffs. We will be wrapping [`window.setInterval`](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setInterval) in examples to demonstrate each design pattern.

### Global Context Extensions
You can import and extend the Context class’s prototype to globally extend all contexts in your application.

```ts
import {Context} from "@bikeshaving/crank";

const ContextIntervalSymbol = Symbol.for("ContextIntervalSymbol");

Context.prototype.setInterval = function(callback, delay, ...args) {
  const interval = window.setInterval(callback, delay, ...args);
  if (typeof this[ContextIntervalSymbol] === "undefined") {
    this[ContextIntervalSymbol] = new Set();
    this.cleanup(() => {
      for (const interval of this[ContextIntervalSymbol]) {
        window.clearInterval(interval);
      }
    });
  }

  this[ContextIntervalSymbol].add(interval);
};

Context.prototype.clearInterval = function(interval) { 
  if (typeof this[ContextIntervalSymbol] !== "undefined") {
    this[ContextIntervalSymbol].delete(interval);
  }

  window.clearInterval(interval);
}

function *Counter() {
  let seconds = 0;
  this.setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);

  while (true) {
    yield <div>Seconds: {seconds}</div>;
  }
}
```

In this example, we define the methods `setInterval` and `clearInterval` directly the `Context` prototype. The example also demonstrates caching intervals on a set which is hidden using an unexported symbol. You can use symbols to hide the internal state of your global context extensions from users.

**Pros:**
- Methods are available to every component automatically.

**Cons:**
- Globally scoped.
- No way to write setup logic.
- No way to respond to props updates.

Global context extensions are useful for creating Crank-specific wrappers around already global, well-known APIs like `setInterval`, `requestAnimationFrame` or `fetch`.

### Context helper factories
As an alternative to global context extensions, you can write factory functions which are passed contexts to scope your logic per component.

```ts
function createSetInterval(ctx, callback, delay, ...args) {
  const interval = window.setInterval(callback, delay, ...args);
  ctx.cleanup(() => window.clearInterval(interval));
  return interval;
}

function *Counter() {
  let seconds = 0;
  const setInterval = createSetInterval(this);
  setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);

  while (true) {
    yield <div>Seconds: {seconds}</div>;
  }

}
```

Instead of defining the `setInterval` method globally, we define it locally by passing the context of the component into the `createSetInterval` function.

**Pros:**
- Locally scoped.
- Explicitly imported and referenced.
- Setup logic can be written directly in the factory function.

**Cons:**
- Naming factory functions can be difficult.
- No way to respond to props updates.

Context helper factories are useful when you want to write locally-scoped factories, especially if they require setup logic. Good use-cases include context-aware state management utilities or wrappers around stateful APIs like [mutation observers](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) or [HTML drag and drop](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API).

### Higher-order components
Because Crank components are just functions, you can write functions which both take components as parameters and return wrapped component functions.

```ts
function interval(Component) {
  return function *WrappedComponent() {
    let seconds = 0;
    const interval = window.setInterval(() => {
      seconds++;
      this.refresh();
    }, 1000)
    try {
      for (const props of this) {
        yield <Component seconds={seconds} {...props}/>;
      }
    } finally {
      window.clearInterval(interval);
    }
  };
}

const Counter = interval((props) => <div>Seconds: {props.seconds}</div>);
```

The interval function takes a component function and returns a component which passes the number of seconds as a prop, as well as refreshing the component whenever the interval is fired.

**Pros:**
- Locally scoped.
- Explicitly imported and referenced.
- Able to respond to new props within the returned component.

**Cons:**
- Naming higher-order functions can be difficult.
- JavaScript doesn’t provide an easy syntax for decorating functions.
- Props that the higher-order component pass in may clash with the component’s own expected props.

The main advantage of higher-order components is that you can respond to props in your utilities just like you would with a component. Higher-order components are most useful when you need reusable logic which refreshes a component, like animation utilities, or modify only well-known props, like styled component libraries.

### Async iterators
Because components can be written as async generator functions, you can integrate utility functions which return async iterators seamlessly with Crank.

```ts
async function *createInterval(delay) {
  let available = true;
  let resolve;
  const interval = window.setInterval(() => {
    if (resolve) {
      resolve(Date.now());
      resolve = undefined;
    } else {
      available = true;
    }
  }, delay);

  try { 
    while (true) {
      if (available) {
        available = false;
        yield Date.now(); 
      } else {
        yield new Promise((resolve1) => (resolve = resolve1));
      }
    }
  } finally {
    window.clearInterval(interval);
  }
}

async function *Counter() {
  let seconds = 0;
  for await (const _ of createInterval(1000)) {
    yield <div>Seconds: {seconds}</div>;
    seconds++;
  }
}
```

**Pros:**
- The utilities you write are framework-agnostic.
- Uniform logic to dispose of resources.

**Cons:**
- Promises and async iterators can cause race conditions and deadlocks, without any language-level features to help you debug them.

If you use async iterators/generators already, Crank is the perfect framework for your application.
