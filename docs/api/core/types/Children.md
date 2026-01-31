---
title: Children
module: "@b9g/crank"
type: type
publish: true
---

# Children

A type representing all valid values for an element tree, including arbitrarily nested iterables.

## Syntax

```ts
type Children = Child | ChildIterable;

interface ChildIterable extends Iterable<Child | ChildIterable> {}
```

## Description

The `Children` type is the most general type for describing what a component can return or what can be passed as children to an element. It extends [Child](/api/core/types/Child) to also include iterables of children, which can be nested to any depth.

This is the type you should use for:
- The `children` prop type
- Component return types
- Generator yield types

Arrays and other iterables are automatically wrapped in [Fragment](/api/core/special-tags/Fragment) elements during rendering.

## Examples

### Using as children prop type

```tsx
import type {Children} from "@b9g/crank";

interface ContainerProps {
  children: Children;
  className?: string;
}

function Container({children, className}: ContainerProps) {
  return <div class={className}>{children}</div>;
}

// Usage with various children types
<Container>Single child</Container>
<Container>{["Array", " of ", "children"]}</Container>
<Container>{null}</Container>
```

### Component return types

```tsx
import type {Children} from "@b9g/crank";

// Sync component
function Greeting({name}): Children {
  return <p>Hello, {name}!</p>;
}

// Async component
async function AsyncGreeting({name}): Promise<Children> {
  const data = await fetchData();
  return <p>{data.greeting}, {name}!</p>;
}

// Generator component
function* Counter(): Generator<Children> {
  let count = 0;
  for (const _ of this) {
    yield <p>Count: {count++}</p>;
  }
}
```

### Nested iterables

```tsx
function NestedList({items}) {
  // Nested arrays are flattened during rendering
  const rows = items.map((group) =>
    group.map((item) => <li key={item.id}>{item.name}</li>)
  );

  return <ul>{rows}</ul>;
}
```

### Mapping data to elements

```tsx
function TodoList({todos}) {
  // Array.map returns Children (an array of elements)
  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>
          <input type="checkbox" checked={todo.done} />
          {todo.text}
        </li>
      ))}
    </ul>
  );
}
```

## See also

- [Child](/api/core/types/Child)
- [Component](/api/core/types/Component)
- [Fragment](/api/core/special-tags/Fragment)
