---
title: Text
module: "@b9g/crank"
type: special-tag
publish: true
---

# Text

A special tag for explicitly creating text nodes.

## Syntax

```jsx
<Text value="Hello, World!" />
<Text value={dynamicText} />
```

## Description

Text elements create text nodes in the rendered output. While strings in the element tree are automatically converted to text nodes, the Text tag allows you to create text nodes explicitly when needed.

In practice, you rarely need to use Text directly since Crank automatically wraps string children in Text elements during rendering. However, it can be useful for:

- Programmatic text node creation
- Understanding how Crank's internals work
- Edge cases where explicit text nodes are needed

## Props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string` | The text content to render |

## Examples

### Explicit text node

```tsx
import {Text, createElement} from "@b9g/crank";

// These are equivalent:
const implicit = createElement("div", null, "Hello, World!");
const explicit = createElement("div", null,
  createElement(Text, {value: "Hello, World!"})
);
```

### Automatic conversion

```tsx
function Greeting({name}) {
  // Strings are automatically wrapped in Text elements
  return <div>Hello, {name}!</div>;
}

// Internally becomes something like:
// <div>
//   <Text value="Hello, " />
//   <Text value={name} />
//   <Text value="!" />
// </div>
```

### Understanding text handling

```tsx
// All of these render the same way:

// 1. Direct string
<div>Hello</div>

// 2. String expression
<div>{"Hello"}</div>

// 3. Number (converted to string)
<div>{42}</div>

// 4. Explicit Text element
<div><Text value="Hello" /></div>
```

### Text in custom renderers

When building custom renderers, the adapter's `text()` method handles Text elements:

```tsx
const adapter = {
  text({value, oldNode}) {
    // Create or update a text node
    if (oldNode && oldNode.text !== value) {
      oldNode.text = value;
      return oldNode;
    }
    return {type: "text", text: value};
  },
  // ... other methods
};
```

## See also

- [Raw](/api/core/special-tags/Raw)
- [Child](/api/core/types/Child)
- [RenderAdapter](/api/core/interfaces/RenderAdapter)
