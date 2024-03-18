---
title: Lifecycles
---

Crank uses generator functions to define component lifecycles. Internally, this is achieved by calling the [`next()`, `return()` and `throw()` methods of generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator#instance_methods) returned from components. As a developer, this means you can use standard JavaScript control flow to execute code during the lifecycle of a component. For parts of the lifecycle which cannot be placed in the generator body itself, Crank provides the lifecycle methods `schedule()`, `flush()` and `cleanup()` on the context.

## Setup, update and teardown logic

The execution of Crank components is well-defined and well-behaved, so there are no restrictions around where you need to place side-effects. This means much of setup, update and teardown logic can be placed directly in components.

```jsx live
import {renderer} from "@b9g/crank/dom";

function *Blinker({seconds}) {
  // setup logic can go at the top of the scope
  let blinking = false;
  const blink = async () => {
    blinking = true;
    this.refresh();
    await new Promise((r) => setTimeout(r, 100));
    blinking = false;
    this.refresh();
  };

  let interval = setInterval(blink, seconds * 1000);
  let oldSeconds = seconds;

  for ({seconds} of this) {
    // update logic can go directly in the loop
    if (seconds !== oldSeconds) {
      blinking = false;
      clearInterval(interval);
      interval = setInterval(blink, seconds * 1000);
      oldSeconds = seconds;
    }

    console.log(blinking);

    yield (
      <p style={{"background-color": blinking ? "red" : null}}>
        {blinking && "!!!"}
      </p>
    );
  }

  // cleanup logic can go at the end of the loop
  clearInterval(interval);
}

function *App() {
  let seconds = 1;
  const onChange = (ev) => {
    seconds = ev.target.value;
    this.refresh();
  };

  for ({} of this) {
    yield (
      <div>
        <label for="seconds">Seconds:</label>{" "}
        <input
          id="seconds"
          value={seconds}
          type="number"
          min="0.25"
          max="5"
          step="0.25"
          onchange={onChange}
        />
        <Blinker seconds={seconds} />
      </div>
    );
  }
}

renderer.render(<App />, document.body);
```

## Working with the DOM

Logic which needs to happen after rendering, such as doing direct DOM manipulations or taking measurements, can be done directly after a `yield` in async generator components whic use `for await...of` loops, because the component is continuously resumed until the bottom of the `for await` loop. Conveniently, the `yield` expression will evaluate to the rendered result of the component.

```jsx
async function *Component(this, props) {
  for await (props of this) {
    const div = yield <div />;
    // logic which manipulates the div can go here.
    div.innerHTML = props.innerHTML;
  }
}
```

Unfortunately, this approach will not work for code in `for...of` loops. In a `for...of` loop, the behavior of `yield` works such that the component will suspend at the `yield` for each render, and this behavior holds for both sync and async generator components. This is necessary for sync generator components, because there is nowhere else to suspend, and is mimicked in async generator components, to make refactoring between sync and async generator components easier.

```jsx
// The following behavior happens in both sync and async generator components
// so long as they use a `for...of` and not a `for await...of` loop.

function *Component(this, props) {
  let div = null;

  const onclick = () => {
    // If the component is only rendered once, div will still be null.
    console.log(div);
  };
  for ({} of this) {
    // This does not work in sync components because the function is paused
    // exactly at the yield. Only after rendering a second time will cause the
    // div variable to be assigned.
    div = yield <button onclick={div}>Click me</button>;
    // Any code below the yield will not run until the next render.
  }
}
```

Thankfully, the Crank context provides two callback-based methods which allow you to run code after rendering has completed: `schedule()` and `flush()`.

The `schedule()` method behaves like code which runs in an async generator’s `for await...of` loop. It runs immediately after the children DOM nodes are created:

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

On the other hand, the `flush()` method runs after the result is completely rendered and live in the DOM. This is required for DOM methods like the `focus()` method for auto-focusing after render. The reason for the distinction between `schedule()` and `flush()` is that Crank allows rendering to be async, and coordinates async rendering so that the rendering of multiple async siblings happens together, meaning there might be some time before a created DOM node is added to its intended parent.


```jsx live
import {renderer} from "@b9g/crank/dom";
function *AutoFocusingInput(props) {
  // this.schedule does not work because it fires before the input element is
  // added to the DOM
  // this.schedule((input) => input.focus());
  this.flush((input) => input.focus());
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

## Cleanup logic
While you can use context iterators to write cleanup logic after `for...of` and `for await...of` loops, this does not handle errors, and this cleanup logic cannot be written outside of component functions. To solve the first issue, you can use `try`/`finally`. When a generator component is removed from the tree, Crank calls the `return` method on the component’s generator object. You can think of it as whatever `yield` expression your component was suspended on being replaced by a `return` statement. This means any loops your component was in when the generator suspended are broken out of, and code after the yield does not execute.

You can take advantage of this behavior by wrapping your `yield` loops in a `try`/`finally` block to release any resources that your component may have used.

```jsx
import {renderer} from "@b9g/crank/dom";

function *Cleanup() {
  try {
    while (true) {
      yield "Hi";
    }
  } finally {
    console.log("finally block executed");
  }
}

renderer.render(<Cleanup />, document.body);
console.log(document.body); // "Hi"
renderer.render(null, document.body);
// "finally block executed"
console.log(document.body); // ""
```

[The same best practices](https://eslint.org/docs/rules/no-unsafe-finally) which apply to `try`/`finally` statements in regular functions apply to generator components. In short, you should not yield or return anything in the `finally` block. Crank will not use the yielded or returned values and doing so might cause your components to inadvertently swallow errors or suspend in unexpected locations.

To write cleanup logic which can be abstractd outside the component function, you can use the `cleanup()` method on the context. This method is similar to `flush() and `schedule()` in that it takes a callback.


```jsx live
import {renderer} from "@b9g/crank/dom";
function addGlobalEventListener(ctx, type, listener, options) {
  window.addEventListener(type, listener, options);
  // ctx.cleanup allows you to write cleanup logic outside the component
  ctx.cleanup(() => window.removeEventListener(type, listener, options));
}

function *KeyboardListener() {
  let key = "";
  const listener = (ev) => {
    key = ev.key;
    this.refresh();
  };

  addGlobalEventListener(this, "keypress", listener);
  for ({} of this) {
    yield <div>Last key pressed: {key || "N/A"}</div>
  }
}

renderer.render(<KeyboardListener />, document.body);
```

## Catching Errors

It can be useful to catch errors thrown by components to show the user an error notification or to notify error-logging services. To facilitate this, Crank will cause `yield` expressions to rethrow errors which happen when rendering children. You can take advantage of this behavior by wrapping your `yield` operations in a `try`/`catch` block to catch errors caused by children.

```jsx live
import {renderer} from "@b9g/crank/dom";
function Thrower() {
  if (Math.random() > 0.5) {
    throw new Error("Oops");
  }

  return <div>No errors</div>;
}

function *Catcher() {
  for ({} of this) {
    try {
       yield (
         <div>
           <Thrower />
           <button onclick={() => this.refresh()}>Rerender</button>
         </div>
       );
     } catch (err) {
       yield (
         <div>
           <div>Error: {err.message}</div>
           <button onclick={() => this.refresh()}>Retry</button>
         </div>
       );
     }
  }
}

renderer.render(<Catcher />, document.body);
```

## Returning values from generator components

When you return from a generator component, the returned value is rendered and the component scope is thrown away, same as would happen when using a function component. This means that while the component cannot have local variables, but represent sequences of renderings.

```jsx live
import {renderer} from "@b9g/crank/dom";
function *Component() {
  yield <div>1</div>;
  yield <div>2</div>;
  return <div>3</div>;
}

function *App() {
  for ({} of this) {
    yield (
      <div>
        <Component />
        <button onclick={() => this.refresh()}>Refresh</button>
      </div>
    );
  }
}

renderer.render(<App />, document.body);
```
