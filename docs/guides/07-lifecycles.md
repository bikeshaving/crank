---
title: Lifecycles
description: Master component lifecycles in Crank using generator functions. Learn cleanup patterns, resource management, and how to handle component unmounting naturally.
---

Component lifecycles in Crank are straightforward: they follow the natural flow of JavaScript generator functions. Unlike other frameworks that require special lifecycle methods, Crank lets you write lifecycle logic using normal JavaScript.

## The Natural Generator Lifecycle

Generator components have a simple, predictable lifecycle that mirrors the generator execution:

### Mount Phase
When a component first renders, the generator function starts executing until it hits the first `yield`:

```jsx
import {renderer} from "@b9g/crank/dom";

function *LifecycleDemo() {

  // mount phase for logic before rendering
  let count = 0;

  // This `for...of` loop IS the component lifecycle
  for ({} of this) {
    // code which executes after we received props
    yield (
      <div>
        <p>Count: {count}</p>
        <button onclick={() => this.refresh(() => count++)}>
          Increment
        </button>
      </div>
    );
    // code which executes before we receive new props
  }

  // code which executes before we unmount
}

renderer.render(<LifecycleDemo />, document.body);
```

### Update Phase
When `this.refresh()` is called, the generator resumes from where it paused (after the `yield`) and continues to the next iteration of the loop. This gives you two important spaces for update logic:

```jsx live
import {renderer} from "@b9g/crank/dom";

function *UpdateDemo({count}) {
  let oldCount = null; // What the count was in the previous render

  for ({count} of this) {
    yield (
      <div>
        <p>
          Current: {count}
          {oldCount != null && ` | Previous: ${oldCount}`}
        </p>
      </div>
    );

    oldCount = count; // Save current props as "old" for next comparison
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

The key insight: you have TWO execution spaces in each loop iteration:
- **Before `yield`**: Set up for the current render
- **After `yield`**: Only runs when re-rendering - save current state as “old” state for comparison

Here’s a practical example using prop comparison for memoization:

```jsx
import {renderer} from "@b9g/crank/dom";

function *ExpensiveComponent({items, threshold}) {
  let oldItems = [];
  let oldThreshold = 0;
  let cachedResult = null;

  for ({items, threshold} of this) {
    // Check if we can use cached result
    const itemsChanged = JSON.stringify(items) !== JSON.stringify(oldItems);
    const thresholdChanged = threshold !== oldThreshold;

    if (!cachedResult || itemsChanged || thresholdChanged) {
      // Simulate expensive calculation
      cachedResult = items
        .filter(item => item.value > threshold)
        .map(item => `${item.name}: ${item.value}`)
        .join(', ');
    }

    yield (
      <div>
        <h3>Filtered Items (threshold: {threshold})</h3>
        <p>{cachedResult || "No items match"}</p>
      </div>
    );

    // Save current props as "old" for next comparison
    oldItems = [...items];
    oldThreshold = threshold;
  }
}

function *App() {
  let threshold = 50;
  const items = [
    {name: "Item A", value: 25},
    {name: "Item B", value: 75},
    {name: "Item C", value: 100}
  ];

  const updateThreshold = () => this.refresh(() =>
    threshold = threshold === 50 ? 30 : 50
  );

  for ({} of this) {
    yield (
      <div>
        <button onclick={updateThreshold}>
          Toggle Threshold ({threshold})
        </button>
        <ExpensiveComponent items={items} threshold={threshold} />
      </div>
    );
  }
}

renderer.render(<App />, document.body);
```

### Unmount Phase
When the component is removed from the tree, the generator exits the `for...of` loop and any code after it runs as cleanup:

```jsx
function *Timer({message}, ctx) {
  let seconds = 0;
  const interval = setInterval(() => ctx.refresh(() => seconds++), 1000);

  for ({message} of ctx) {
    yield (
      <div>{message} {seconds}</div>
    );
  }
  // When the component unmounts, the props iterator returns and code after the
  // loop can run
  clearInterval(interval);
}
```

## Why You Need Extra Lifecycle Methods

The natural generator lifecycle is perfect for most logic, but sometimes you need more precise timing around DOM operations. The `for...of` loop pauses at each `yield`, which means:

- **After `yield`**: The element description exists, but DOM nodes might not be created yet
- **You need to know**: When DOM nodes are created, when they’re inserted, and when they’re removed

For these DOM-specific timings, Crank provides the `ref` prop and three lifecycle methods:

### Ref: Capture a Host Element

The `ref` prop accepts a callback that receives the underlying DOM node. It fires once on first commit, after the element and its children are created but **before insertion into the parent**. Use it to capture a reference for later use:

```jsx
function *AutoFocusInput() {
  let input = null;
  this.after(() => input && input.focus());

  for ({} of this) {
    yield <input ref={(el) => input = el} />;
  }
}
```

`ref` only fires on host elements (`<div>`, `<input>`, etc.), not on component elements, fragments, or portals. For component elements, `ref` is passed as a regular prop — just like `key`. A component that wraps a host element should forward `ref` to its root element:

```jsx
function MyInput({ref, class: cls, ...props}) {
  return <input ref={ref} class={"my-input " + cls} {...props} />;
}
```

### Schedule: DOM Created but Not Inserted

**`schedule(callback)`** runs immediately after DOM nodes are created, but **before they’re inserted into the document**. Useful for immediate DOM setup that doesn’t require the element to be live in the document tree.

```jsx
function *Component() {
  this.schedule((el) => {
    // Element exists but is NOT in the document yet
    el.style.opacity = '0';
  });

  for ({} of this) {
    yield <div>Hello world</div>;
  }
}
```

### After: DOM Inserted and Live

**`after(callback)`** runs after the element is fully rendered and live in the DOM. This is where you’d do things like focusing inputs, measuring elements, or triggering animations that require the element to be visible.

```jsx
function *Component() {
  this.after((el) => {
    // Element is now live in the document
    el.focus();
    console.log('Element is live:', element.getBoundingClientRect());
  });

  for ({} of this) {
    yield <input type="text" />;
  }
}
```

### Cleanup: DOM Removed and Unmounted

**`cleanup(callback)`** runs when the component is unmounted. Use this for cleaning up event listeners, timers, subscriptions, or performing exit animations.

```jsx
function *Component() {
  const interval = setInterval(() => console.log('tick'), 1000);

  this.cleanup(() => {
    clearInterval(interval);
    console.log('Component cleaned up');
  });

  for ({} of this) {
    yield <div>Timer running...</div>;
  }
}
```

### Execution Order
For any given render:
1. `ref` callbacks fire first (host element created, children arranged, but not yet inserted into parent)
2. `schedule()` callbacks run next (same timing window — element exists but is not inserted)
3. Host nodes are inserted into the document (`arrange`)
4. `after()` callbacks run last (element live in DOM)
5. `cleanup()` callbacks run when component unmounts

### When to Use Which Method

This timing difference is crucial for choosing the right method:

**Use `schedule()` for:**
- Setting up properties, styles, or attributes before the user sees the element
- Triggering re-renders (the `this.schedule(() => this.refresh())` pattern)
- DOM setup that doesn’t require the element to be part of the document tree
- Preparing elements before they become visible

**Use `after()` for:**
- Focusing elements (requires element to be in the document)
- Measuring dimensions with `getBoundingClientRect()`
- Triggering animations that need the element to be visible
- Any DOM operations requiring the element to be live in the document tree

The key insight: `schedule()` happens in the perfect “sweet spot” where you can modify elements without visual flicker, while `after()` gives you access to the fully live, measurable element.

### Promise-based API (0.7+)
All three methods return promises when called without arguments:

```jsx
async function *Component() {
  await this.schedule(); // Wait for DOM creation
  await this.after();    // Wait for DOM insertion
  // ... component logic
  await this.cleanup();  // Wait for cleanup (on unmount)
}
```

### Context State Properties (0.7+)

The context provides two boolean properties to check component state:

#### Execution State: `isExecuting`
**`this.isExecuting`** is true when the component is currently executing (between yield points). Useful for avoiding redundant refresh calls:

```jsx
function *Component() {
  const handleClick = () => {
    // Avoid calling refresh if component is already executing
    if (!this.isExecuting) {
      this.refresh(() => console.log('Refreshing'));
    }
  };

  for ({} of this) {
    yield <button onclick={handleClick}>Click me</button>;
  }
}
```

#### Mount State: `isUnmounted`
**`this.isUnmounted`** is true after the component has been unmounted. Useful for avoiding work in async operations after unmount:

```jsx
function *SearchComponent() {
  let searchTerm = '';
  let searchTimeout = null;

  const performSearch = (term) => {
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Debounce search requests
    searchTimeout = setTimeout(() => {
      // Check if component is still mounted before making the request
      if (!this.isUnmounted) {
        console.log(`Searching for: ${term}`);
        // Simulate API call that would call this.refresh() when complete
      }
    }, 300);
  };

  const handleInput = (ev) => {
    this.refresh(() => {
      searchTerm = ev.target.value;
      performSearch(searchTerm);
    });
  };

  for ({} of this) {
    yield (
      <div>
        <input 
          type="text" 
          value={searchTerm}
          oninput={handleInput}
          placeholder="Search..."
        />
        <p>Search term: {searchTerm}</p>
      </div>
    );
  }

  // Cleanup timeout on unmount
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
}
```

These properties help write safer async code by preventing common issues like calling `refresh()` on unmounted components or doing unnecessary work after unmount.

## The Two-Pass Render Pattern

A common pattern is to use `schedule()` to trigger an immediate re-render, so a component renders twice — once for initial setup, then again with updated state:

```jsx
function *TwoPassComponent() {
  let secondPass = false;

  if (!secondPass) {
    // Schedule a refresh to happen after this render
    this.schedule(() => this.refresh(() => secondPass = true));
  }

  for ({} of this) {
    if (!secondPass) {
      yield <div>First render - setting up...</div>;
    } else {
      yield <div>Second render - ready!</div>;
    }
  }
}
```

This pattern is especially powerful for:

**CSS-in-JS extraction during SSR:**
```jsx
function *SSRComponent({children}) {
  for ({children} of this) {
    // First render to extract styles
    this.schedule(() => this.refresh());

    const html = yield <div>{children}</div>;

    // Extract CSS from the rendered HTML
    const {html: finalHtml, css} = extractCritical(html);

    // Second render with extracted CSS
    yield (
      <>
        <style>{css}</style>
        <div innerHTML={finalHtml} />
      </>
    );
  }
}
```

**Progressive enhancement:**
```jsx
function *ProgressiveComponent() {
  let hydrated = false;

  // After initial render, mark as hydrated and re-render
  this.schedule(() => this.refresh(() => hydrated = true));

  for ({} of this) {
    if (hydrated) {
      yield <InteractiveVersion />;
    } else {
      yield <StaticVersion />;
    }
  }
}
```

**Measuring and adjusting:**
```jsx
function *ResponsiveComponent() {
  let width = 0;

  this.schedule((element) => {
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

## Setup, update and teardown logic

The execution of Crank components is well-defined and well-behaved, so there are no restrictions around where you need to place side-effects. This means much of setup, update and teardown logic can be placed directly in components.

```jsx live
import {renderer} from "@b9g/crank/dom";

function *Blinker({seconds}) {
  // setup logic can go at the top of the scope
  let blinking = false;
  const blink = async () => {
    this.refresh(() => blinking = true);
    await new Promise((r) => setTimeout(r, 100));
    this.refresh(() => blinking = false);
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
      <p style={{"background-color": blinking ? "red" : null, color: blinking ? "white" : null}}>
        {blinking && "!!!"}
      </p>
    );
  }

  // cleanup logic can go at the end of the loop
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

## Working with the DOM

Logic which needs to happen after rendering, such as doing direct DOM manipulations or taking measurements, can be done directly after a `yield` in async generator components which use `for await...of` loops, because the component is continuously resumed until the bottom of the `for await` loop. Conveniently, the `yield` expression will evaluate to the rendered result of the component.

```jsx
async function *Component(this, props) {
  for await (props of this) {
    const div = yield <div />;
    // logic which manipulates the div can go here.
    div.innerHTML = props.innerHTML;
  }
}
```

Unfortunately, this approach will not work for code in `for...of` loops. In a `for...of` loop, the behavior of `yield` works such that the component will suspend at the `yield` for each render, and this behavior holds for both sync and async generator components. This behavior is necessary for sync generator components, because there is nowhere else to suspend, and is mimicked in async generator components, to make refactoring between sync and async generator components easier.

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

For `for...of` components, use the `schedule()` and `after()` lifecycle methods [described above](#schedule-dom-created-but-not-inserted) to access rendered DOM elements reliably.

## Cleanup logic
While you can use context iterators to write cleanup logic after `for...of` and `for await...of` loops, this does not account for errors in components, and it does work if you are not using a render loop. To solve these issues, you can use `try`/`finally` block. When a generator component is removed from the tree, Crank calls the `return` method on the component’s generator object.

You can think of it as whatever `yield` expression your component was suspended on being replaced by a `return` statement. This means any loops your component was in when the generator suspended are broken out of, and code after the yield does not execute.

```jsx
import {renderer} from "@b9g/crank/dom";

function *Cleanup() {
  try {
    for ({} of this) {
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

[The same best practices](https://eslint.org/docs/rules/no-unsafe-finally) which apply to `try` / `finally` statements in regular functions apply to generator components. In short, you should not yield or return anything in the `finally` block. Crank will not use the yielded or returned values and doing so might cause your components to inadvertently swallow errors or suspend in unexpected locations.

To write cleanup logic which can be abstractd outside the component function, you can use the `cleanup()` method on the context. This method is similar to `after()` and `schedule()` in that it takes a callback.


```jsx live
import {renderer} from "@b9g/crank/dom";
function addGlobalEventListener(ctx, type, listener, options) {
  window.addEventListener(type, listener, options);
  // ctx.cleanup allows you to write cleanup logic outside the component
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

## Async Mount and Unmount

Starting in Crank 0.7, both mounting and unmounting can be asynchronous, enabling powerful patterns like coordinated animations, lazy loading, and complex initialization sequences.

### Async Unmount

You can make cleanup operations asynchronous by passing async functions to the `cleanup()` method. This is particularly useful for exit animations:

```jsx live
import {renderer} from "@b9g/crank/dom";

function *FadeOutComponent() {
  // Register async cleanup for smooth exit animation
  this.cleanup(async (element) => {
    element.style.transition = 'opacity 300ms ease-out';
    element.style.opacity = '0';

    // Wait for animation to complete before unmounting
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log('Component faded out and unmounted');
  });

  for ({} of this) {
    yield (
      <div style={{
        padding: '20px',
        background: '#007bff',
        color: 'white',
        'border-radius': '4px',
        opacity: '1'
      }}>
        I will fade out when unmounted!
      </div>
    );
  }
}

function *App() {
  let showComponent = true;
  const toggle = () => this.refresh(() => showComponent = !showComponent);

  for ({} of this) {
    yield (
      <div>
        <button onclick={toggle}>
          {showComponent ? 'Hide' : 'Show'} Component
        </button>
        {showComponent && <FadeOutComponent />}
      </div>
    );
  }
}

renderer.render(<App />, document.body);
```

You can coordinate staggered animations across siblings by passing different delay values to child components’ `cleanup()` callbacks.

### Async Mount

The `schedule()` method can also be asynchronous, allowing components to defer their initial mounting:

```jsx
function *LazyLoadComponent({src}) {
  // Async mounting - component waits until image loads
  this.schedule(async (img) => {
    return new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
  });

  for ({src} of this) {
    yield <img src={src} alt="Lazy loaded" />;
  }
}
```

### Complex Coordination

Async mount and unmount enable sophisticated coordination patterns:

```jsx
function *Modal({children, onClose}) {
  // Async mount: slide in from top
  this.schedule(async (modal) => {
    modal.style.transform = 'translateY(-100%)';
    modal.style.transition = 'transform 200ms ease-out';

    // Force reflow, then animate in
    modal.offsetHeight;
    modal.style.transform = 'translateY(0)';

    await new Promise(resolve => setTimeout(resolve, 200));
  });

  // Async unmount: slide out to top
  this.cleanup(async (modal) => {
    modal.style.transform = 'translateY(-100%)';
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  for ({children, onClose} of this) {
    yield (
      <div style={{
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center'
      }}>
        <div style={{
          background: 'white',
          color: '#333',
          padding: '2rem',
          'border-radius': '8px',
          'max-width': '500px',
          width: '90%'
        }}>
          {children}
          <button onclick={onClose} style={{'margin-top': '1rem'}}>
            Close
          </button>
        </div>
      </div>
    );
  }
}
```

## Catching Errors

It can be useful to catch errors thrown by components to show the user an error notification or to notify error-logging services. To facilitate this, Crank will cause `yield` expressions to rethrow errors which happen when rendering children. You can take advantage of this behavior by wrapping your `yield` operations in a `try` / `catch` block to catch errors caused by children.

```jsx live
import {renderer} from "@b9g/crank/dom";

function *Thrower({shouldThrow}) {
  for ({shouldThrow} of this) {
    if (shouldThrow) {
      throw new Error("Component error triggered!");
    }

    yield <div style={{color: 'green'}}>✅ Component working fine</div>;
  }
}

function *ErrorDemo() {
  let shouldThrow = false;

  for ({} of this) {
    try {
       yield (
         <div>
           <button onclick={() => this.refresh(() => shouldThrow = !shouldThrow)}>
             {shouldThrow ? 'Fix Component' : 'Break Component'}
           </button>
           <Thrower shouldThrow={shouldThrow} />
         </div>
       );
     } catch (err) {
       yield (
         <div style={{color: 'red', border: '1px solid red', padding: '10px', 'border-radius': '4px'}}>
           <div>❌ Error: {err.message}</div>
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

## Returning values from generator components

When you return from a generator component, the returned value is rendered and the component scope is thrown away, same as would happen when using a function component. This means that the component cannot have local variables which persist across returns.

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
