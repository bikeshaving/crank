---
title: Lifecycles
description: Component lifecycles in Crank follow the natural flow of generator functions. Setup, render, update, and cleanup all happen in predictable regions of your code.
---

Component lifecycles in Crank follow the natural flow of generator functions. There are no special lifecycle methods to memorize — setup, render, update, and cleanup are regions of your generator function.

## Generator Regions

A generator component has three regions:

```jsx
function *Component({prop}) {
  // 1. Setup: runs once on mount
  let count = 0;
  const interval = setInterval(() => this.refresh(() => count++), 1000);

  for ({prop} of this) {
    // 2. Render: runs on every update
    yield <div>{prop}: {count}</div>;
  }

  // 3. Cleanup: runs on unmount
  clearInterval(interval);
}
```

**Setup** (before the loop): Runs once when the component mounts. Initialize state, set up subscriptions, create intervals.

**Render** (inside the loop): Runs on every update. The `for...of this` loop receives fresh props each iteration. Code before `yield` prepares the current render; code after `yield` runs before the next render begins.

**Cleanup** (after the loop): Runs when the component unmounts. The `for...of` loop exits naturally when the component is removed from the tree, so any code after the loop runs as teardown.

## Prop Comparison

Because code after `yield` runs before the next render, you can compare old and new props by saving the current value after each yield:

```jsx live
import {renderer} from "@b9g/crank/dom";

function *UpdateDemo({count}) {
  let oldCount = null;

  for ({count} of this) {
    yield (
      <div>
        <p>
          Current: {count}
          {oldCount != null && ` | Previous: ${oldCount}`}
        </p>
      </div>
    );

    oldCount = count;
  }
}

function *App() {
  let count = 0;

  for ({} of this) {
    yield (
      <div>
        <button onclick={() => this.refresh(() => count++)}>
          Increment (count: {count})
        </button>
        <UpdateDemo count={count} />
      </div>
    );
  }
}

renderer.render(<App />, document.body);
```

## DOM Lifecycle Methods

The generator regions cover most lifecycle needs. But sometimes you need precise timing around DOM operations — knowing when nodes are created, when they're inserted, and when they're removed.

### ref: Capture a Host Element

The `ref` prop accepts a callback that receives the underlying DOM node after the element and its children are created, but **before insertion into the parent**:

```jsx
function *Canvas() {
  let canvas = null;

  for ({} of this) {
    yield <canvas ref={(el) => canvas = el} width="300" height="150" />;
  }
}
```

`ref` only fires on host elements (`<div>`, `<canvas>`, etc.), not on component elements. For component elements, `ref` is passed as a regular prop — forward it to the root host element:

```jsx
function MyInput({ref, class: cls, ...props}) {
  return <input ref={ref} class={"my-input " + cls} {...props} />;
}
```

### schedule(): Before Insertion

`schedule(callback)` runs after DOM nodes are created but **before they're inserted into the document**. The callback receives the element value. Use it to set up properties before the user sees the element, or to trigger an immediate re-render:

```jsx
function *FadeIn() {
  this.schedule((el) => {
    // Element exists but is NOT in the document yet — no flicker
    el.style.opacity = "0";
  });

  for ({} of this) {
    yield <div>Hello world</div>;
  }
}
```

### after(): After Insertion

`after(callback)` runs after the element is inserted and live in the DOM. The callback receives the element value. Use it for focus, measurement, or animations that require the element to be visible:

```jsx
function *AutoFocusInput() {
  let input = null;
  this.after(() => input && input.focus());

  for ({} of this) {
    yield <input ref={(el) => input = el} />;
  }
}
```

### cleanup(): On Unmount

`cleanup(callback)` runs when the component unmounts. The callback receives the element value. Use it for teardown that lives outside the component function:

```jsx live
import {renderer} from "@b9g/crank/dom";

function addGlobalEventListener(ctx, type, listener, options) {
  window.addEventListener(type, listener, options);
  ctx.cleanup(() => window.removeEventListener(type, listener, options));
}

function *KeyboardListener() {
  let key = "";
  const listener = (ev) => this.refresh(() => key = ev.key);

  addGlobalEventListener(this, "keypress", listener);
  for ({} of this) {
    yield <div>Last key pressed: {key || "N/A"}</div>
  }
}

renderer.render(<KeyboardListener />, document.body);
```

For cleanup that lives inside the component, code after the `for...of` loop is usually sufficient (see [Generator Regions](#generator-regions)).

### Execution Order

For any given render:
1. `ref` callbacks fire (host nodes created, children arranged, not yet inserted)
2. `schedule()` callbacks run (same timing — nodes exist, not inserted)
3. Host nodes are inserted into the document
4. `after()` callbacks run (nodes live in DOM)
5. `cleanup()` callbacks run on unmount

### Promise-based API

All three methods return promises when called without arguments, for use in async generator components:

```jsx
async function *Component() {
  await this.schedule(); // wait for DOM creation
  await this.after();    // wait for DOM insertion
  await this.cleanup();  // wait for unmount
}
```

## Context State Properties

### isExecuting

`this.isExecuting` is `true` when the component is currently executing (between yield points). Useful for avoiding redundant refresh calls from event handlers:

```jsx
function *Component() {
  const handleClick = () => {
    if (!this.isExecuting) {
      this.refresh();
    }
  };

  for ({} of this) {
    yield <button onclick={handleClick}>Click me</button>;
  }
}
```

### isUnmounted

`this.isUnmounted` is `true` after the component has been unmounted. Useful for guarding async work:

```jsx
function *Component() {
  const fetchData = async () => {
    const data = await fetch("/api/data");
    if (!this.isUnmounted) {
      this.refresh();
    }
  };

  for ({} of this) {
    yield <div />;
  }
}
```

## The Two-Pass Render Pattern

Use `schedule()` to trigger an immediate re-render, so a component renders twice — once for setup, then again with updated state:

```jsx
function *MeasuredComponent() {
  let width = 0;

  this.after((element) => {
    const newWidth = element.offsetWidth;
    if (width !== newWidth) {
      this.refresh(() => width = newWidth);
    }
  });

  for ({} of this) {
    yield (
      <div>
        Width: {width}px
        {width > 500 ? <LargeLayout /> : <SmallLayout />}
      </div>
    );
  }
}
```

## Setup, Update, and Teardown

Here is a practical example showing all three generator regions working together:

```jsx live
import {renderer} from "@b9g/crank/dom";

function *Blinker({seconds}) {
  // Setup
  let blinking = false;
  const blink = async () => {
    this.refresh(() => blinking = true);
    await new Promise((r) => setTimeout(r, 100));
    this.refresh(() => blinking = false);
  };

  let interval = setInterval(blink, seconds * 1000);
  let oldSeconds = seconds;

  for ({seconds} of this) {
    // Update: recreate interval if prop changed
    if (seconds !== oldSeconds) {
      blinking = false;
      clearInterval(interval);
      interval = setInterval(blink, seconds * 1000);
      oldSeconds = seconds;
    }

    yield (
      <p style={{"background-color": blinking ? "red" : null, color: blinking ? "white" : null}}>
        {blinking && "!!!"}
      </p>
    );
  }

  // Teardown
  clearInterval(interval);
}

function *App() {
  let seconds = 1;
  const onChange = (ev) => this.refresh(() => seconds = ev.target.value);

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

## Error Boundaries

Crank rethrows child errors at the `yield` point. Wrap `yield` in `try`/`catch` to catch errors from children:

```jsx live
import {renderer} from "@b9g/crank/dom";

function *Thrower({shouldThrow}) {
  for ({shouldThrow} of this) {
    if (shouldThrow) {
      throw new Error("Component error triggered!");
    }

    yield <div style={{color: "green"}}>Component working fine</div>;
  }
}

function *ErrorDemo() {
  let shouldThrow = false;

  for ({} of this) {
    try {
       yield (
         <div>
           <button onclick={() => this.refresh(() => shouldThrow = !shouldThrow)}>
             {shouldThrow ? "Fix Component" : "Break Component"}
           </button>
           <Thrower shouldThrow={shouldThrow} />
         </div>
       );
     } catch (err) {
       yield (
         <div style={{color: "red", border: "1px solid red", padding: "10px", "border-radius": "4px"}}>
           <div>Error: {err.message}</div>
           <button onclick={() => this.refresh(() => shouldThrow = false)}>
             Reset Component
           </button>
         </div>
       );
     }
  }
}

renderer.render(<ErrorDemo />, document.body);
```

## Returning from Generator Components

When you `return` from a generator component, the returned value is rendered and the component scope is discarded — just like a function component. The component cannot persist local state across returns.

```jsx live
import {renderer} from "@b9g/crank/dom";

function *Countdown() {
  yield <div>3…</div>;
  yield <div>2…</div>;
  yield <div>1…</div>;
  return <div>Done!</div>;
}

function *App() {
  for ({} of this) {
    yield (
      <div>
        <Countdown />
        <button onclick={() => this.refresh()}>Next</button>
      </div>
    );
  }
}

renderer.render(<App />, document.body);
```
