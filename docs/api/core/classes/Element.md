---
title: Element
module: "@b9g/crank"
type: class
publish: true
---

# Element

The fundamental building block of Crank applications. Elements are JavaScript objects that represent virtual nodes in your UI tree.

## Syntax

```tsx
import {createElement} from "@b9g/crank";

const el = createElement("div", {class: "app"}, "Hello");
el.tag;   // "div"
el.props; // {class: "app", children: "Hello"}
```

## Constructor

```ts
new Element(tag, props)
```

### Parameters

- **tag** - `TTag` - The element's tag (string, symbol, or component function)
- **props** - `TagProps<TTag>` - The element's properties

## Instance properties

### tag

`TTag`

The tag of the element. Can be:
- A string for host elements (e.g., `"div"`, `"span"`)
- A symbol for special tags (e.g., `Portal`, `Copy`)
- A component function

### props

`TagProps<TTag>`

An object containing the element's properties. These correspond to JSX attributes and include the `children` prop.

### $$typeof

`symbol`

An internal symbol (`Symbol.for("crank.Element")`) used to identify Crank elements. This property is defined on the prototype, not per instance.

## Description

Elements are lightweight objects that describe what you want to render. They are not the actual rendered output but rather a description that renderers interpret to create and update the real UI.

Unlike React, Crank elements are mutable and can be directly instantiated, though using [createElement](/api/core/functions/createElement) is preferred as it handles special props and children normalization.

Elements are designed for cross-version and cross-realm compatibility through the `$$typeof` symbol property.

## Examples

### Basic element structure

```tsx
import {createElement} from "@b9g/crank";

const element = createElement("div", {class: "container"}, "Hello");

console.log(element.tag);   // "div"
console.log(element.props); // {class: "container", children: "Hello"}
```

### Direct instantiation

```tsx
import {Element} from "@b9g/crank";

// Direct instantiation is possible but not recommended
const element = new Element("div", {class: "container", children: "Hello"});
```

### Type-specific elements

```tsx
import type {Element} from "@b9g/crank";
import {Portal} from "@b9g/crank";

// Specific element types for TypeScript
let div: Element<"div">;
let portal: Element<typeof Portal>;
let component: Element<typeof MyComponent>;

// General element types
let host: Element<string | symbol>;
let any: Element; // Element<Tag>
```

## See also

- [createElement](/api/core/functions/createElement)
- [isElement](/api/core/functions/isElement)
- [Tag](/api/core/types/Tag)
- [Elements Guide](/guides/elements)
