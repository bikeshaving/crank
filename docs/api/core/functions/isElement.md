---
title: isElement
module: "@b9g/crank"
type: function
publish: true
---

# isElement

Checks if a value is a Crank element.

## Syntax

```ts
isElement(value)
```

## Parameters

- **value** - `any` - The value to check.

## Return value

`boolean` - `true` if the value is a Crank element, `false` otherwise.

## Description

`isElement` is a type guard function that checks whether a given value is a valid Crank element. It does this by checking for the presence of a special `$$typeof` symbol property that all Crank elements have.

This function is useful for validating input, implementing higher-order components, or building utilities that work with element trees.

The `$$typeof` property is defined on the Element prototype and uses `Symbol.for("crank.Element")`, which allows cross-realm and cross-version compatibility.

## Examples

### Basic usage

```tsx
import {createElement, isElement} from "@b9g/crank";

const element = createElement("div", null, "Hello");
console.log(isElement(element)); // true

console.log(isElement("string")); // false
console.log(isElement(null)); // false
console.log(isElement({tag: "div"})); // false (plain object, not an Element)
```

### Type narrowing

```tsx
import {isElement} from "@b9g/crank";
import type {Element} from "@b9g/crank";

function processChild(child: unknown) {
  if (isElement(child)) {
    // TypeScript knows child is Element here
    console.log(child.tag);
    console.log(child.props);
  } else if (typeof child === "string") {
    console.log("Text:", child);
  }
}
```

### Validating component children

```tsx
import {createElement, isElement} from "@b9g/crank";

function* TabContainer({children}) {
  const tabs = [];
  for (const child of children) {
    if (isElement(child) && child.tag === Tab) {
      tabs.push(child);
    }
  }
  // ... render tabs
}
```

## See also

- [Element](/api/core/classes/Element)
- [createElement](/api/core/functions/createElement)
- [Child](/api/core/types/Child)
