---
title: Lifecycles
---

Component lifecycles in Crank are straightforward: they follow the natural flow of JavaScript generator functions. When a component mounts, the generator starts. When it updates, the generator resumes. When it unmounts, the generator exits.

Most lifecycle logic can be written directly in your generator using normal JavaScript control flow. For DOM-specific tasks that need precise timing, Crank provides three lifecycle methods on the context.

## Core Lifecycle Methods

Before diving into generator patterns, let's understand the three essential lifecycle methods available on the context:

### `schedule(callback)`
Runs immediately after DOM nodes are created, but **before they're inserted into the document**. Useful for immediate DOM setup that doesn't require the element to be live in the document tree.

```jsx
function *Component() {
  this.schedule((element) => {
    // Element exists but is NOT in the document yet
    element.style.opacity = '0';
    console.log('Element created but not inserted:', element);
    console.log('Parent is null:', element.parentNode === null); // true
  });
  
  for ({} of this) {
    yield <div>Hello world</div>;
  }
}
```

### `after(callback)`
Runs after the element is fully rendered and live in the DOM. This is where you'd do things like focusing inputs, measuring elements, or triggering animations that require the element to be visible.

```jsx
function *Component() {
  this.after((element) => {
    // Element is now live in the document
    element.focus();
    console.log('Element is live:', element.getBoundingClientRect());
  });
  
  for ({} of this) {
    yield <input type="text" />;
  }
}
```

### `cleanup(callback)`
Runs when the component is unmounted. Use this for cleaning up event listeners, timers, subscriptions, or performing exit animations.

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
1. `schedule()` callbacks run first (element created but not inserted)
2. `after()` callbacks run second (element live in DOM)  
3. `cleanup()` callbacks run when component unmounts

### When to Use Which Method

This timing difference is crucial for choosing the right method:

**Use `schedule()` for:**
- Setting up properties, styles, or attributes before the user sees the element
- Triggering re-renders (the `this.schedule(() => this.refresh())` pattern)
- DOM setup that doesn't require the element to be part of the document tree
- Preparing elements before they become visible

**Use `after()` for:**
- Focusing elements (requires element to be in the document)
- Measuring dimensions with `getBoundingClientRect()` 
- Triggering animations that need the element to be visible
- Any DOM operations requiring the element to be live in the document tree

The key insight: `schedule()` happens in the perfect "sweet spot" where you can modify elements without visual flicker, while `after()` gives you access to the fully live, measurable element.

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

#### `this.isExecuting`
True when the component is currently executing (between yield points). Useful for avoiding redundant refresh calls:

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

#### `this.isUnmounted`
True after the component has been unmounted. Useful for avoiding work in async operations after unmount:

```jsx
async function *Component() {
  for ({} of this) {
    yield <div>Loading...</div>;
    
    try {
      const data = await fetch('/api/data');
      
      // Check if component was unmounted during the async operation
      if (this.isUnmounted) {
        console.log('Component unmounted, skipping update');
        break;
      }
      
      this.refresh(() => console.log('Got data:', data));
    } catch (error) {
      if (!this.isUnmounted) {
        console.error('Error fetching data:', error);
      }
    }
  }
}
```

These properties help write safer async code by preventing common issues like calling `refresh()` on unmounted components or doing unnecessary work after unmount.

### The `schedule(() => this.refresh())` Pattern

A common pattern is to use `schedule()` to trigger an immediate re-render. This is particularly useful for components that need to render twice - once for initial setup, then again with updated state:

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

The key insight is that `schedule()` runs after DOM nodes are created but **before they're inserted into the document**. This timing makes it the perfect place to trigger another render cycle - you can inspect or modify elements, but the user doesn't see any flicker because nothing has been inserted yet.

**Important:** Since `schedule()` fires before DOM insertion, elements passed to schedule callbacks are not yet part of the document tree. Use `after()` if you need the element to be live in the DOM.

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

On the other hand, the `after()` method runs after the result is completely rendered and live in the DOM. This is necessary for use-cases such as auto-focusing inputs after the first render. The reason for the distinction between `schedule()` and `after()` is that Crank coordinates async rendering so that the rendering of multiple async siblings happens together, meaning there might be some time before a created DOM node is created but before it is added to its intended parent.

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

All `schedule()` callbacks will always fire before `after()` callbacks for a given render.

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

The `cleanup()` method is also useful for refactoring teardown logic.

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

### Promise-based Lifecycle Methods

Starting in 0.7, lifecycle methods return promises when called without arguments, allowing you to await lifecycle events:

```jsx
async function *Component() {
  // Wait for component to be fully mounted
  await this.schedule();
  console.log('Component is now in the DOM');
  
  for ({} of this) {
    yield <div>Mounted component</div>;
    
    // Wait for rendering to complete
    await this.after();
    console.log('Render cycle complete');
  }
  
  // Wait for cleanup to finish
  await this.cleanup();
  console.log('Component cleanup complete');
}
```

### Use Cases for Async Lifecycle

**Async mounting is useful for:**
- Loading animations and transitions
- Waiting for external resources (images, fonts, APIs)
- Coordinating multiple component animations
- Complex initialization sequences

**Async unmounting enables:**
- Smooth exit animations
- Saving component state before destruction
- Coordinated cleanup across multiple components
- User confirmation dialogs for destructive actions

### Server-Side Rendering with CSS Extraction

A powerful use case for async mounting is CSS-in-JS extraction during SSR:

```jsx
import {extractCritical} from '@emotion/server';

function *Root({children}) {
  for ({children} of this) {
    // First render to extract styles
    this.schedule(() => this.refresh());
    
    const html = yield (
      <body>
        {children}
      </body>
    );
    
    // Extract critical CSS from the rendered HTML
    const {html: finalHtml, css} = extractCritical(html);
    
    // Second render with extracted CSS inlined
    yield (
      <html>
        <head>
          <style>{css}</style>
        </head>
        <body innerHTML={finalHtml} />
      </html>
    );
  }
}
```

Async lifecycle methods provide fine-grained control over when and how components appear and disappear, enabling smooth user experiences and complex coordination patterns that would be difficult to achieve with synchronous-only lifecycles.

## Catching Errors

It can be useful to catch errors thrown by components to show the user an error notification or to notify error-logging services. To facilitate this, Crank will cause `yield` expressions to rethrow errors which happen when rendering children. You can take advantage of this behavior by wrapping your `yield` operations in a `try` / `catch` block to catch errors caused by children.

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
