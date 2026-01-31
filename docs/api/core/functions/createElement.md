---
title: createElement
module: "@b9g/crank"
type: function
publish: true
---

# createElement

Creates a Crank element with the specified tag, props, and children.

## Syntax

```js
createElement(tag)
createElement(tag, props)
createElement(tag, props, child1)
createElement(tag, props, child1, /* …, */ childN)
```

## Parameters

- **tag**
  - : The element tag. Can be a string (for host elements like `"div"`), a symbol (for special tags like `Portal`), or a component function.

- **props** *(optional)*
  - : The element's properties as an object. Pass `null` or `undefined` for no props.

- **child1**, …, **childN** *(optional)*
  - : Child elements to render inside this element. Can be elements, strings, numbers, or nested arrays.

## Return value

An [Element](/api/core/classes/Element) object that can be rendered.

## Description

`createElement` is the primary function for creating Crank elements. It is typically used as the JSX factory function when using a transpiler, but can also be called directly.

The function handles several special behaviors:
- Extracts special props (`key`, `ref`, `copy`) from the props object
- Assigns children to `props.children` (single child or array)
- Handles deprecated prop prefixes and logs warnings

When using JSX, the transpiler automatically converts JSX syntax to `createElement` calls:

```tsx
// This JSX:
<div class="container">Hello</div>

// Becomes:
createElement("div", {class: "container"}, "Hello")
```

## Examples

### Basic usage

```tsx
import {createElement} from "@b9g/crank";

// Create a simple element
const div = createElement("div", {class: "container"}, "Hello, World!");

// Create an element with multiple children
const list = createElement("ul", null,
  createElement("li", null, "Item 1"),
  createElement("li", null, "Item 2"),
);
```

### Using with components

```tsx
import {createElement} from "@b9g/crank";

function Greeting({name}) {
  return createElement("p", null, `Hello, ${name}!`);
}

const element = createElement(Greeting, {name: "World"});
```

### With special props

```tsx
import {createElement} from "@b9g/crank";

// Using key for list reconciliation
const items = data.map((item) =>
  createElement("li", {key: item.id}, item.text)
);

// Using ref to get DOM node reference
const input = createElement("input", {
  ref: (el) => console.log("Input element:", el),
});
```

## See also

- [Element](/api/core/classes/Element)
- [cloneElement](/api/core/functions/cloneElement)
- [Component](/api/core/types/Component)
- [Elements Guide](/guides/elements)
