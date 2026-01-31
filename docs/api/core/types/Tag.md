---
title: Tag
module: "@b9g/crank"
type: type
publish: true
---

# Tag

A union type representing all valid values for an element tag.

## Syntax

```ts
type Tag = string | symbol | Component;
```

## Description

The `Tag` type defines what can be used as the first argument to [createElement](/api/core/functions/createElement) or as a JSX tag. It encompasses three categories:

### String tags (host elements)

Standard HTML or SVG element names like `"div"`, `"span"`, `"svg"`, etc. These are rendered as actual DOM elements by the DOM renderer.

```tsx
<div>Content</div>
<input type="text" />
```

### Symbol tags (special tags)

Built-in special tags that have special rendering behavior:

- [Fragment](/api/core/special-tags/Fragment) - Groups elements without a wrapper
- [Portal](/api/core/special-tags/Portal) - Renders into a different root
- [Copy](/api/core/special-tags/Copy) - Preserves previous content
- [Text](/api/core/special-tags/Text) - Explicit text nodes
- [Raw](/api/core/special-tags/Raw) - Raw HTML injection

```tsx
<Fragment>
  <div>One</div>
  <div>Two</div>
</Fragment>
```

### Component functions

Functions that return renderable content. Can be sync, async, or generator functions.

```tsx
function Greeting({name}) {
  return <div>Hello, {name}!</div>;
}

<Greeting name="World" />
```

## Examples

### Type narrowing

```tsx
import type {Tag} from "@b9g/crank";
import {Fragment} from "@b9g/crank";

function getTagName(tag: Tag): string {
  if (typeof tag === "function") {
    return tag.name || "Anonymous";
  } else if (typeof tag === "string") {
    return tag;
  } else {
    // tag is symbol
    return tag.description || "Anonymous";
  }
}

getTagName("div");      // "div"
getTagName(Fragment);   // "crank.Fragment" (fragment is empty string actually)
getTagName(MyComponent); // "MyComponent"
```

### Generic element types

```tsx
import type {Element, Tag} from "@b9g/crank";

// Element with any tag
let element: Element<Tag>;

// Element with string tag only (host elements)
let hostElement: Element<string>;

// Element with specific tag
let divElement: Element<"div">;
```

## See also

- [Element](/api/core/classes/Element)
- [Component](/api/core/types/Component)
- [createElement](/api/core/functions/createElement)
