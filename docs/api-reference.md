---
title: API Reference
---

TODO: THESE API DOCS ARE OUT OF DATE

## Functions
### createElement

Creates an element with the specified tag, props and children. This function is typically used as a target for JSX transpilers, rather than called directly.

**Parameters:**
- `tag: string | symbol | Component`
- `props: Record<string, any>`
- `...children: Children`

**Return Value:**

An element.

### isElement

**Parameters:**
- `value: unknown` - The value to be tested.

**Return Value:**

A boolean which indicates the value passed in is a Crank Element.

### cloneElement

Clones the passed in element. Throws a `TypeError` if the value passed in is not an element.

**Parameters:**
- `element: Element` - The Element to be cloned.

**Return Value:**

A copy of the element passed in.

## Classes

### Element
Elements are the basic building blocks of Crank applications. They are JavaScript objects which are interpreted by renderers to produce and manage stateful nodes.

**Methods:**
### constructor
Constructs an element. Typicially, you would use the `createElement` function rather than calling this constructor directly.

**Parameters:**
- `tag: Tag` - The tag of the element.
- `props: Record<string, any>` - The props of the element.
- `key: unknown` - A key by which to identify the element during the element diffing process.
- `ref: Function` - A callback which fires with the element’s rendered value whenever the element is rendered.

### Renderer

An abstract class which is subclassed to render to different target environments. This class is responsible for kicking off the rendering process, caching previous trees by root, and creating/mutating/disposing the nodes of the target environment.

**NOTE:** The internal Crank renderer methods and type parameters are documented in the [guide on custom renderers.](./custom-renderers)

**Methods:**
### constructor

Creates a new Renderer. The base `Renderer` constructor accepts no parameters.

### Renderer.prototype.render

**Parameters:**
- `children: Children` - The element tree to render.
- `root?: TRoot` - The renderer specific root to render into.
- `ctx?: Context` - A context which will parent the contexts of all top-level components in the element tree.

### Context
A class which is instantiated and passed to every component function as its `this` value.

**Type Parameters:**
- `TProps` - The expected props of the related component.
- `TResult` - The expected result from rendering the component.

**Properties:**
- `props` - The current props of the component. **Readonly**
- `value` - The current rendered value of the component. **Readonly**

**Methods:**
### Context.prototype[Symbol.iterator]

Returns an iterator of the props passed to the component. Only used in generator components.

### Context.prototype[Symbol.asyncIterator]

Returns an async iterator of the props passed to the component. Only used in generator

### Context.prototype.refresh

Updates the component in place.

**Parameters:**
- `callback?: Function` - Optional callback to execute before refresh

**Return Value:**

The rendered result of the component or a promise thereof if the component or its children execute asynchronously.

### Context.prototype.schedule

Executes the passed in callback when the component renders. The `schedule` method will only fire once for each call and callback.

**Parameters:**
- `callback?: Function` - Optional callback to execute right before the .

### Context.prototype.after

Executes the passed in callback after the component and all its children have finished rendering and committing to the DOM.

**Overloads:**
- `after(): Promise<TResult>` - Returns a promise that resolves with the component's rendered value after completion.
- `after(callback: (value: TResult) => unknown): void` - Executes the callback with the component's rendered value after completion.

**Parameters:**
- `callback?: Function` - Optional callback to be executed with the rendered value.

**Return Value:**

If no callback is provided, returns a Promise that resolves with the component's rendered value. If a callback is provided, returns void.

**Example:**
```tsx
function* MyComponent() {
  for ({} of this) {
    yield <div>Rendering...</div>;

    // Execute after this render cycle completes
    this.after((value) => {
      console.log("Component finished rendering:", value);
    });

    // Or await the completion
    const result = await this.after();
    console.log("Async completion:", result);
  }
}
```

### Context.prototype.cleanup

Executes the passed in callback when the component unmounts. The `cleanup` method will only fire once for each call and callback.

**Parameters:**
- `callback: Function` - The callback to be executed.

### Context.prototype.addEventListener

Adds an event listener to the context. The `addEventListener` method will also attach event listeners to the underlying top-level node or nodes which were created for the component.

**Parameters:**
- `type: string` - The type of the event.
- `listener: Function` - The listener callback.
- `options: Object | boolean` - An object of boolean options which can be set to change the characteristics of the listener. If the options object is a boolean, then that value is used to set the `capture` option for the listener.

  - `capture: boolean` - If true, the event listener will fire during [the capture phase](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture) of event dispatch.
  - `once: boolean` -  If true, the event listener will fire at most once before being removed.
  - `passive: boolean` - If true, calling the `preventDefault` method on the event will have no effect. Using this flag can increase performance. It is most useful for event types like `scroll` which fire frequently and are rarely cancelled.

### Context.prototype.removeEventListener

Removes an event listener by type, listener and capture option.

**Parameters:**
- `type: string` - The type of the event.
- `listener: Function` - The listener callback.
- `options: Object | boolean` - An object of boolean options which can be set to change the characteristics of the listener. If the options object is a boolean, then that value is used to set the `capture` option for the listener.

  - `capture: boolean` - If true, will remove listeners which use the capture option.

### Context.prototype.dispatchEvent

Dispatches an event on the context. Will propagate to parent contexts according to the same event bubbling and capture algorithms used by the DOM.

**Parameters:**
- `ev: Event` - An Event object.

**Return Value:**

The return value is `false` if the event is cancelable and an event listener calls the `preventDefault` method on the event, and `true` otherwise.

### Context.prototype.consume

Retrieves a provision set by an ancestor by key.

**Parameters:**
- `key: unknown` - The key of the provision.

**Return Value:**

The provision by key, or undefined if no provision is found.

### Context.prototype.provide

Sets a provision by key for descendant components.

**Parameters:**
- `key: unknown` - The key of the provision.
- `value: unknown` - The value of the provision.

## Types

### Tag

A type which represents all valid values which can be used for the tag of an element.

**Example:**

```ts
let tag: Tag;

// VALID ASSIGNMENTS
tag = "div";
tag = Symbol("div");
function MyComponent() {
}
tag = MyComponent;

// INVALID ASSIGNMENTS
// @ts-expect-error
tag = 1;
// @ts-expect-error
tag = {};
```

### TagProps

A helper type to map the tag of an element to its expected props.

**Type Parameters:**
- `TTag` - The tag of the associated element.

**Example:**
```ts
function Greeting({name}: {name: string}) {
  return <div>Hello {name}</div>
}

let props: TagProps<typeof Greeting>;

// VALID ASSIGNMENTS
props = {name: "Alice"};

// INVALID ASSIGNMENTS
// @ts-expect-error
props = {name: 1000};
```

### ComponentProps

A helper type to extract props from component functions. Returns an empty object type for components that take no parameters.

**Type Parameters:**
- `T` - The component function to extract props from.

**Example:**
```ts
function Button({variant, children}: {variant: "primary" | "secondary", children: string}) {
  return <button class={`btn-${variant}`}>{children}</button>;
}

type ButtonProps = ComponentProps<typeof Button>;
// ButtonProps is {variant: "primary" | "secondary", children: string}

function NoPropsComponent() {
  return <div>No props needed</div>;
}

type NoProps = ComponentProps<typeof NoPropsComponent>;
// NoProps is {}
```

### ComponentPropsOrProps

A helper type that handles both component functions and regular objects. For functions, it extracts the props type; for other values, it returns the type as-is.

**Type Parameters:**
- `T` - The component function or props object type.

**Example:**
```ts
function MyComponent({name}: {name: string}) {
  return <div>Hello {name}</div>;
}

type ExtractedProps = ComponentPropsOrProps<typeof MyComponent>;
// ExtractedProps is {name: string}

type RegularProps = ComponentPropsOrProps<{id: number}>;
// RegularProps is {id: number}
```

### Child

A type which describes all valid singular values of an element tree.

**Example:**
```ts
let child: Child;

// VALID ASSIGNMENTS
child = "hello";
child = 1;
child = true;
child = false;
child = null;
child = undefined;
child = <div>Hello</div>;

// INVALID ASSIGNMENTS
// @ts-expect-error
child = [<div>Hello</div>, <div>World</div>];
// @ts-expect-error
child = {};
// @ts-expect-error
child = new Promise(() => {});
// @ts-expect-error
child = new RegExp("Hello");
// @ts-expect-error
child = Symbol("Hello");
```

### Children

A type which describes all valid values of an element tree, including arbitrarily nested iterables of such values.

**Example:**
```ts
let children: Children;

// VALID ASSIGNMENTS
children = "hello";
children = 1;
children = true;
children = false;
children = null;
children = undefined;
children = <div>Hello</div>;
children = [<div>Hello</div>, <div>World</div>];
children = new Set([<div>Hello</div>, <div>World</div>]);

// INVALID ASSIGNMENTS
// @ts-expect-error
children = {};
// @ts-expect-error
children = new RegExp("Hello");
// @ts-expect-error
children = Symbol("Hello");
```

### Component

A type which represents all functions which can be used as a component.

**Type Parameters:**
- `TProps` - The expected props of the component

### ElementValue
A helper type which repesents all the possible rendered values of an element.

**Type Parameters:**
- `TNode` - The node type for the element as created by the renderer.

### EventMap

An interface which maps Event type strings to event subclasses. Can be extended via TypeScript module augmentation for strongly typed event listeners.

**Example:**
```ts
declare global {
  module "@bikeshaving/crank" {
    interface EventMap {
      click: MouseEvent;
    }
  }
}
```

### ProvisionMap

An interface which can be extended to provide strongly typed provisions. See `Context.prototype.provide` and `Context.prototype.consume`.

**Example:**
```ts
declare global {
  module "@bikeshaving/crank" {
    interface ProvisionMap {
      greeting: string;
    }
  }
}
```

## Special Tags
### Fragment

A special element tag for grouping multiple children within a parent.

### Copy

A special element tag which copies whatever child appeared previously in the element’s position.

### Portal

A special element tag for creating a new element subtree with a different root, passed via the root prop.

**Props:**
- `root: TRoot` - A root to render into. It should be of the same type as the second argument passed to the `render` method.


### Raw

A special element tag for injecting raw nodes into an element tree via its value prop.

**Props:**
- `value: TNode | string` - A string or a node. If the value is a node, it will be inserted directly into the tree. If the value is a string, the renderer will parse the string and insert the parsed result into the tree.

### Text

A special element tag for creating text nodes with specific content.

**Props:**
- `value: string` - The text content to render.

## Async Module (@b9g/crank/async)

The async module provides React-like components for handling asynchronous operations and coordinating loading states.

### lazy

Creates a lazy-loaded component from an initializer function. The component will be loaded asynchronously when first rendered.

**Parameters:**
- `initializer: () => Promise<Component | {default: Component}>` - Function that returns a Promise resolving to a component or module with a default export.

**Return Value:**

A component that loads the target component on first render.

**Example:**
```tsx
import {lazy, Suspense} from "@b9g/crank/async";

const LazyComponent = lazy(() => import('./MyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent prop="value" />
    </Suspense>
  );
}
```

### Suspense

A component that handles loading states for its async children. Shows a fallback UI while waiting for async components to resolve.

**Props:**
- `children: Children` - The potentially async children to render.
- `fallback: Children` - The UI to show while children are loading.
- `timeout?: number` - Optional timeout in milliseconds before showing fallback (default: 300ms).

**Example:**
```tsx
import {Suspense} from "@b9g/crank/async";

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>} timeout={500}>
      <AsyncComponent />
    </Suspense>
  );
}
```

### SuspenseList

A component that coordinates multiple Suspense components, controlling the order in which they reveal their content and managing their fallback states.

**Props:**
- `revealOrder?: "forwards" | "backwards" | "together"` - Controls the order components are revealed (default: "forwards").
  - `"forwards"`: Reveal components in the order they appear in the tree
  - `"backwards"`: Reveal components in reverse order
  - `"together"`: Wait for all components to load before revealing any
- `tail?: "collapsed" | "hidden"` - Controls fallback visibility (default: "collapsed").
  - `"collapsed"`: Show only the next pending fallback
  - `"hidden"`: Hide all fallbacks
- `timeout?: number` - Default timeout for child Suspense components in milliseconds.
- `children: Children` - The elements containing Suspense components to coordinate.

**Example:**
```tsx
import {Suspense, SuspenseList} from "@b9g/crank/async";

function App() {
  return (
    <SuspenseList revealOrder="forwards" tail="collapsed">
      <Suspense fallback={<div>Loading A...</div>}>
        <ComponentA />
      </Suspense>
      <Suspense fallback={<div>Loading B...</div>}>
        <ComponentB />
      </Suspense>
      <Suspense fallback={<div>Loading C...</div>}>
        <ComponentC />
      </Suspense>
    </SuspenseList>
  );
}
```

**Note:** SuspenseList only coordinates Suspense components that are rendered immediately. Suspense components that are children of other async components will not be coordinated until they are rendered.

## Standalone Module (@b9g/crank/standalone)

The standalone module re-exports all core Crank exports, the JSX template tag functions, and both renderers (`renderer`/`domRenderer` from `@b9g/crank/dom`, `htmlRenderer` from `@b9g/crank/html`) for single-import usage without transpilation.

### jsx

A tagged template function that provides JSX-like syntax in vanilla JavaScript without requiring transpilation.

**Parameters:**
- `template: TemplateStringsArray` - The template strings array from the tagged template.
- `...substitutions: unknown[]` - The interpolated values.

**Return Value:**

An element or elements based on the template content.

**Example:**
```js
import {jsx, renderer} from "@b9g/crank/standalone";

function Greeting({name = "World"}) {
  return jsx`<div>Hello ${name}!</div>`;
}

renderer.render(jsx`<${Greeting} name="Crank" />`, document.body);
```

**Advanced Usage:**
```js
// Component interpolation
const Button = ({children}) => jsx`<button>${children}</button>`;
const element = jsx`<${Button}>Click me<//Button>`;

// Multiple elements
const list = jsx`
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
`;

// With props
const element = jsx`<div class="container" id=${elementId}>${content}</div>`;
```

### html

An alias for the `jsx` template tag, provided for semantic clarity when generating HTML strings.

**Example:**
```js
import {html} from "@b9g/crank/standalone";

const template = html`<div class="card">${content}</div>`;
```
