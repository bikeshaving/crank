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

### `Portal`
A special element tag for creating a new element subtree with a different root, passed via the root prop.

**Props:**
- root - TODO

### `Copy`
A special element tag which copies whatever child appeared previously in the element’s position.

### `Raw`
A special element tag for injecting raw nodes into an element tree via its value prop.

**Props:**
- value - TODO

## Functions
### `createElement`
**Parameters:**
- `tag: string | symbol | Component` - TODO
- `props: Record<string, any>` - TODO
- `...children: Children` - TODO

Creates an element with the specified tag, props and children. This function is typically used as a target for JSX transpilers, rather than called directly.

### `isElement`
**Parameters:**
- `value: unknown` - The value to be tested.

Returns true if the value passed in is a Crank Element.

### `cloneElement`
**Parameters:**
- `element: Element` - The Element to be cloned.

Clones the passed in element.

**Remarks:**
Throws a `TypeError` if the value passed in is not an element.

## Classes
### `Element`
Elements are the basic building blocks of Crank applications. They are JavaScript objects which are interpreted by renderers to produce and manage stateful nodes.

#### Properties
- `tag`
- `props`
- `key`
- `ref`

#### Methods
- [`constructor`](#Element.constructor)

### `Renderer`
An abstract class which is subclassed to render to different target environments. This class is responsible for kicking off the rendering process, caching previous trees by root, and creating/mutating/disposing the nodes of the target environment.

**Type Parameters:**
- `TNode`
- `TScope`
- `TRoot`
- `TResult`

#### Methods
- `constructor`
  Creates a new Renderer. The base `Renderer` constructor accepts no parameters.

- `render`
  **Parameters:**
  - `children: Children`
  - `root?: TRoot`
  - `ctx?: Context`

**NOTE:** The internal Crank renderer methods documented in the [guide on custom renderers.](./custom-renderers)

### `Context`
A class which is instantiated and passed to every component function as its `this` value.

**Type Parameters:**
- `TProps` - The expected props of the related component.
- `TResult` - The expected result from rendering the component.

#### Properties
- `props` - **Readonly** The current props of the component.
- `value` - **Readonly** The current rendered value of the component.

#### Methods
- `[Symbol.iterator]`
- `[Symbol.asyncIterator]`
- `get`
- `set`
- `refresh`
- `schedule`
- `cleanup`
- `addEventListener`
- `removeEventListener`
- `dispatchEvent`
