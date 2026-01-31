---
title: Fragment
module: "@b9g/crank"
type: special-tag
publish: true
---

# Fragment

A special tag for grouping multiple children without adding a wrapper element to the DOM.

## Syntax

```ts
const Fragment: "" = "";
```

## Description

Fragment allows you to return multiple elements from a component without wrapping them in an additional DOM node. This is useful when:

- You need to return sibling elements from a component
- You want to avoid unnecessary wrapper divs
- You're building layouts that require specific parent-child relationships (like tables or flex containers)

Fragment is simply the empty string (`""`), so you can use `""` directly in createElement calls or JSX configuration.

Non-string iterables (arrays) in the element tree are automatically wrapped in Fragment elements during rendering.

## Examples

### Basic usage

```tsx
import {Fragment} from "@b9g/crank";

function Columns() {
  return (
    <Fragment>
      <td>Column 1</td>
      <td>Column 2</td>
      <td>Column 3</td>
    </Fragment>
  );
}

// Usage in a table
function Table() {
  return (
    <table>
      <tr>
        <Columns />
      </tr>
    </table>
  );
}
```

### Short syntax with empty tag

```tsx
// Using </> shorthand (requires JSX configuration)
function List() {
  return (
    <>
      <li>Item 1</li>
      <li>Item 2</li>
    </>
  );
}

// Or using closing // syntax
function List() {
  return jsx`
    <Fragment>
      <li>Item 1</li>
      <li>Item 2</li>
    <//Fragment>
  `;
}
```

### With keys

```tsx
function Glossary({items}) {
  return (
    <dl>
      {items.map((item) => (
        // Fragments can have keys for list rendering
        <Fragment key={item.id}>
          <dt>{item.term}</dt>
          <dd>{item.description}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
```

### Array children (implicit fragments)

```tsx
function List({items}) {
  // Arrays are automatically wrapped in Fragments
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

### Avoiding wrapper elements

```tsx
// Instead of this (adds unnecessary div):
function BadComponent() {
  return (
    <div>
      <Header />
      <Content />
      <Footer />
    </div>
  );
}

// Use Fragment (no extra DOM node):
function GoodComponent() {
  return (
    <Fragment>
      <Header />
      <Content />
      <Footer />
    </Fragment>
  );
}
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `key` | `any` | Optional key for list reconciliation |
| `children` | `Children` | The elements to render |

## See also

- [Portal](/api/core/special-tags/Portal)
- [Children](/api/core/types/Children)
- [Special Props and Tags Guide](/guides/special-props-and-tags)
