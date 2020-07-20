---
title: API Reference
---

## Types
### `Tag`

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

### `TagProps`

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

### `Child`

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

### `Children`

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

### `Component`

A type which represents all functions which can be used as a component.

**Type Parameters:**
- `TProps` - The expected props of the component

### `ElementValue`
A helper type which repesents all the possible rendered values of an element.

**Type Parameters:**
- `TNode` - The node type for the element as created by the renderer.

### `EventMap`

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

### `ProvisionMap`

An interface which can be extended to provide strongly typed provisions. See `Context.prototype.get` and `Context.prototype.set`.

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
### `Fragment`

A special element tag for grouping multiple children within a parent.

### `Copy`

A special element tag which copies whatever child appeared previously in the element’s position.

### `Portal`

A special element tag for creating a new element subtree with a different root, passed via the root prop.

**Props:**
- `root: TRoot` - A root to render into. It should be of the same type as the second argument passed to the `render` method.


### `Raw`

A special element tag for injecting raw nodes into an element tree via its value prop.

**Props:**
- `value: TNode | string` - A string or a node. If the value is a node, it will be inserted directly into the tree. If the value is a string, the renderer will parse the string and insert the parsed result into the tree.

## Functions
### `createElement`

Creates an element with the specified tag, props and children. This function is typically used as a target for JSX transpilers, rather than called directly.

**Parameters:**
- `tag: string | symbol | Component`
- `props: Record<string, any>`
- `...children: Children`

**Return Value:**

An element.

### `isElement`

**Parameters:**
- `value: unknown` - The value to be tested.

**Return Value:**

A boolean which indicates the value passed in is a Crank Element.

### `cloneElement`

Clones the passed in element. Throws a `TypeError` if the value passed in is not an element.

**Parameters:**
- `element: Element` - The Element to be cloned.

**Return Value:**

A copy of the element passed in.

## Classes

### `Element`

Elements are the basic building blocks of Crank applications. They are JavaScript objects which are interpreted by renderers to produce and manage stateful nodes.

#### Methods
#### `constructor`
Constructs an element. Typicially, you would use the `createElement` function rather than calling this constructor directly.

**Parameters:**
- `tag: Tag` - The tag of the element.
- `props: Record<string, any>` - The props of the element.
- `key: unknown` - A key by which to identify the element during the element diffing process.
- `ref: Function` - A callback which fires with the element’s rendered value whenever the element is rendered.

### `Renderer`

An abstract class which is subclassed to render to different target environments. This class is responsible for kicking off the rendering process, caching previous trees by root, and creating/mutating/disposing the nodes of the target environment.

**NOTE:** The internal Crank renderer methods documented in the [guide on custom renderers.](./custom-renderers)

**Type Parameters:**
- `TNode`
- `TScope`
- `TRoot`
- `TResult`

#### Methods
#### `constructor`

Creates a new Renderer. The base `Renderer` constructor accepts no parameters.

#### `render`

**Parameters:**
- `children: Children` - The element tree to render.
- `root?: TRoot` - The renderer specific root to render into.
- `ctx?: Context` - A context which will parent the contexts of all top-level components in the element tree.

### `Context`
A class which is instantiated and passed to every component function as its `this` value.

**Type Parameters:**
- `TProps` - The expected props of the related component.
- `TResult` - The expected result from rendering the component.

#### Properties
- `props` - The current props of the component. **Readonly**
- `value` - The current rendered value of the component. **Readonly**

#### Methods
#### `[Symbol.iterator]`

Returns an iterator of the props passed to the component. Only used in generator components.

#### `[Symbol.asyncIterator]`

Returns an async iterator of the props passed to the component. Only used in generator

#### `refresh`

Updates the component in place.

#### `schedule`

Executes the passed in callback when the component renders. The `schedule` method will only fire once for each call and callback.

**Parameters:**
- `callback: Function` - The callback to be executed.

#### `cleanup`

Executes the passed in callback when the component unmounts. The `cleanup` method will only fire once for each call and callback.

**Parameters:**
- `callback: Function` - The callback to be executed.

#### `addEventListener`

Adds an event listener to the context. The `addEventListener` method will also attach event listeners to the underlying top-level node or nodes which were created for the component.

**Parameters:**
- `type: string` - The type of the event.
- `listener: Function` - The listener callback.
- `options: Object | boolean` - An object of boolean options which can be set to change the characteristics of the listener. If the options object is a boolean, then that value is used to set the `capture` option for the listener.
  - `capture: boolean` - If true, the event listener will fire during [the capture phase](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture) of event dispatch.
  - `once: boolean` -  If true, the event listener will fire at most once before being removed.
  - `passive: boolean` - If true, calling the `preventDefault` method on the event will have no effect. Using this flag can increase performance. It is most useful for event types like `scroll` which fire frequently and are rarely cancelled.

#### `removeEventListener`

Removes an event listener by type, listener and capture option.

**Parameters:**
- `type: string` - The type of the event.
- `listener: Function` - The listener callback.
- `options: Object | boolean` - An object of boolean options which can be set to change the characteristics of the listener. If the options object is a boolean, then that value is used to set the `capture` option for the listener.
  - `capture: boolean` - If true, will remove listeners which use the capture option.

#### `dispatchEvent`

Dispatches an event on the context. Will propagate to parent contexts according to the same event bubbling and capture algorithms used by the DOM.

**Parameters:**
- `ev: Event` - An Event object.

**Return Value:**

The return value is `false` if the event is cancelable and an event listener calls the `preventDefault` method on the event, and `true` otherwise.

#### `get`

Retrieves a provision set by an ancestor by key.

**Parameters:**
- `key: unknown` - The key of the provision.

**Return Value:**

The provision by key, or undefined if no provision is found.

#### `set`

Sets a provision by key for descendant components.

**Parameters:**
- `key: unknown` - The key of the provision.
- `value: unknown` - The value of the provision.
