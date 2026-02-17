---
title: Reusable Logic
---

This guide describes additional APIs as well as design patterns for developers who wish to reuse logic between components or write Crank-specific libraries.

## Additional Context Methods and Properties
Crank provides several additional methods and properties via the `Context` API to help you share logic between components. Some of the APIs demonstrated here are for library authors and should not be used in the course of typical application development.

### context.props
The current props of a component can be accessed via the readonly context property `props`. We recommended that you access props within components via its parameters or context iterators when writing components. The `props` property can be useful when you need to access a component’s current props from within an extension or helper function.

### context.provide and context.consume
Crank allows you to provide data to all of a component’s descendants via the methods `provide` and `consume`. The `provide` method sets a “provision” under a specific key, and the `consume` method retrieves the value set under a specific key by the nearest ancestor.

```ts
function GreetingProvider({greeting, children}) {
  this.provide("greeting", greeting);
  return children;
}

function Greeting({name}) {
  const greeting = this.consume("greeting");
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

Provisions allow libraries to define components which interact with their descendants without rigidly defined component hierarchies or requiring data to be passed manually between components via props. This makes them useful, for instance, when writing multiple components which communicate with each other, like custom `select` and `option` form elements, or drag-and-drop components.

Anything can be passed as a key to the `provide` and `consume` methods, so you can use a symbol to ensure that the provision you pass between your components are private and do not collide with provisions set by others.

**Note:** Crank does not link “providers” and “consumers” in any way, and doesn’t automatically refresh consumer components when the `provide` method is called. It’s up to you to ensure consumers update when providers update.

### Schedule: Execute After Render
**`context.schedule()`**: Execute code immediately after component renders.
You can pass a callback to the `schedule()` method to listen for when the component renders. Callbacks passed to `schedule` fire synchronously after the component renders, with the rendered value of the component as its only argument. Scheduled callbacks fire once per call and callback function per update (think `requestAnimationFrame()`, not `setInterval()`). This means you have to continuously call the `schedule` method for each update if you want to execute some code every time your component commits.

```jsx
function *Component(this, props) {
  for await (props of this) {
    this.schedule((div) => {
      // the div is
      div.innerHTML = props.innerHTML;
    });
    yield <div />;
  }
}
```

### After: Execute When DOM is Live
**`context.after()`**: Execute code after DOM is inserted and accessible.
Similar to the `schedule()` method, this method fires when rendering has finished. Unlike the `schedule()` method, this method fires when a component’s rendered DOM is live. This is useful when you need to do something like calling `focus()` on an `<input>` element or perform DOM measurement calculations. Callbacks fire once per call and callback function per update.

```jsx live
import {renderer} from "@b9g/crank/dom";
function *AutoFocusingInput(props) {
  // this.schedule does not work because it fires before the input element is
  // added to the DOM
  // this.schedule((input) => input.focus());
  this.after((input) => input.focus());
  for (props of this) {
    yield <input {...props}/>;
  }
}

function *Component() {
  let initial = true;
  for ({} of this) {
    yield (
      <div>
        <div>
          {initial || <AutoFocusingInput />}
        </div>
        <div>
          <button onclick={() => this.refresh()}>Refresh</button>
        </div>
      </div>
    );

    initial = false;
  }
}

renderer.render(<Component />, document.body);
```

### Cleanup: Execute on Unmount
**`context.cleanup()`**: Execute code when component is unmounted.
Similarly, you can pass a callback to the `cleanup` method to listen for when the component unmounts. Callbacks passed to `cleanup` fire synchronously when the component is unmounted. Each registered callback fires only once. The callback is called with the last rendered value of the component as its only argument.

## Strategies for Reusing Logic

The following are various patterns you can use to write and reuse logic between components, as well as a description of their tradeoffs. We will be wrapping the global [`window.setInterval`](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setInterval) function in examples to demonstrate each design pattern.

### Global Context Extensions
You can import and extend the Context class’s prototype to globally extend all contexts in your application.

```ts
import {Context} from "@b9g/crank";

const ContextIntervalSymbol = Symbol.for("ContextIntervalSymbol");

Context.prototype.setInterval = function(callback, delay, ...args) {`
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
  this.setInterval(() => this.refresh(() => seconds++), 1000);

  for ({} of this) {
    yield <div>Seconds: {seconds}</div>;
  }
}
```

**Pros:**
- Methods are available to every component automatically.

**Cons:**
- Globally scoped.
- No way to write setup logic.
- No way to respond to props updates.

Global context extensions are useful for creating Crank-specific wrappers around already global or otherwise well-known APIs like `setInterval`, `requestAnimationFrame` or `fetch`.

### Context Helper Utilities
As an alternative, you can write utility functions that accept a context to scope reusable logic per component.


```ts
function createSetInterval(ctx, callback, delay, ...args) {
  const interval = window.setInterval(callback, delay, ...args);
  ctx.cleanup(() => window.clearInterval(interval));
  return interval;
}

function *Counter() {
  let seconds = 0;
  const setInterval = createSetInterval(this);
  setInterval(() => this.refresh(() => seconds++), 1000);

  for ({} of this) {
    yield <div>Seconds: {seconds}</div>;
  }

}
```

**Pros:**
- Locally scoped.
- Explicitly imported and referenced.
- Setup logic can be written directly in the function.

**Cons:**
- Naming these functions can be difficult.
- No way to respond to props updates.

Context helper utilities are useful when you want to write locally-scoped utilities, and are especially well-suited for use-cases which requires setup logic. Possible use-cases include wrappers around stateful APIs like [mutation observers](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) or [HTML drag and drop](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API).

### Higher-order Components

Because Crank components are just functions, we can write functions which both take components as parameters and return wrapped component functions.

```ts
function interval(Component) {
  return function *WrappedComponent() {
    let seconds = 0;
    const interval = window.setInterval(() => this.refresh(() => seconds++), 1000)
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

**Pros:**
- Locally scoped.
- Explicitly imported and referenced.
- Able to respond to new props within the returned component.

**Cons:**
- Naming higher-order functions can be difficult.
- JavaScript doesn’t provide an easy syntax for decorating functions.
- Props passed into the component by the wrapper may clash with the component’s own expected props.

Higher-order components are most useful when you need reusable logic which responds to prop updates or sets only well-known props. Possible use-cases include styled component or animation libraries.

### Async Iterators
Because components can be written as async generator functions, you can integrate utility functions which return async iterators seamlessly with Crank. Async iterators are a great way to model resources because they define a standard way for releasing resources when they’re no longer needed by returning the iterator.

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
- Async iterator utilities are framework-agnostic.
- Uniform way to hold and release resources.

**Cons:**
- Promises and async iterators can cause race conditions and deadlocks, without any language-level features to help you debug them.

If you use async iterators/generators already, Crank is the perfect framework for your application.
