---
title: cloneElement
module: "@b9g/crank"
type: function
publish: true
---

# cloneElement

Creates a shallow copy of an element with a new props object.

## Syntax

```ts
cloneElement(el)
```

## Parameters

- **el** - `Element<TTag>` - The element to clone.

## Return value

`Element<TTag>` - A new element with the same tag and a shallow copy of the props.

## Description

`cloneElement` creates a new element with the same tag as the original but with a new props object (shallow copy). This is useful when you need to create a modified version of an element without mutating the original.

The function throws a `TypeError` if the provided value is not a valid Crank element.

## Examples

### Basic usage

```tsx
import {createElement, cloneElement} from "@b9g/crank";

const original = createElement("div", {class: "original", id: "myDiv"});
const cloned = cloneElement(original);

// cloned has the same tag and props as original, but is a new object
console.log(cloned.tag); // "div"
console.log(cloned.props.class); // "original"
console.log(cloned === original); // false
console.log(cloned.props === original.props); // false
```

### Modifying cloned elements

```tsx
import {createElement, cloneElement} from "@b9g/crank";

const original = createElement("button", {class: "btn", disabled: false});
const cloned = cloneElement(original);

// Modify the cloned element's props
cloned.props.disabled = true;
cloned.props.class = "btn btn-disabled";

// Original is unchanged
console.log(original.props.disabled); // false
```

## See also

- [createElement](/api/core/functions/createElement)
- [Element](/api/core/classes/Element)
- [isElement](/api/core/functions/isElement)
