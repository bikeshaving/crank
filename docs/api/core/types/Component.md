---
title: Component
module: "@b9g/crank"
type: type
publish: true
---

# Component

A type representing all functions that can be used as Crank components.

## Syntax

```ts
type Component<TProps extends Record<string, unknown> = any> = (
  this: Context<TProps>,
  props: TProps,
  ctx: Context<TProps>,
) =>
  | Children
  | PromiseLike<Children>
  | Iterator<Children, Children | void, any>
  | AsyncIterator<Children, Children | void, any>;
```

## Type parameters

- **TProps** - The expected props type for the component (defaults to `any`)

## Description

Components in Crank are functions that receive props and return renderable content. Unlike class-based frameworks, all Crank components are functions. The `Component` type encompasses four patterns:

### Sync function components

Return [Children](/api/core/types/Children) directly. Re-executed on every render.

```tsx
function Greeting({name}) {
  return <p>Hello, {name}!</p>;
}
```

### Async function components

Return a Promise of Children. The component suspends until resolved.

```tsx
async function UserProfile({id}) {
  const user = await fetchUser(id);
  return <div>{user.name}</div>;
}
```

### Sync generator components

Yield Children and maintain state between renders. Use `for...of` on context to receive prop updates.

```tsx
function* Counter() {
  let count = 0;
  for (const props of this) {
    yield <button onclick={() => { count++; this.refresh(); }}>
      {count}
    </button>;
  }
}
```

### Async generator components

Combine async operations with stateful rendering. Use `for await...of` on context.

```tsx
async function* LiveData({url}) {
  for await (const {url} of this) {
    const data = await fetch(url).then(r => r.json());
    yield <pre>{JSON.stringify(data)}</pre>;
  }
}
```

## Function parameters

All components receive:

1. **this** - The [Context](/api/core/classes/Context) object (when called as a component)
2. **props** - The props passed to the component
3. **ctx** - The same Context (for arrow functions that can't use `this`)

## Examples

### Typed component

```tsx
import type {Component, Context} from "@b9g/crank";

interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: Children;
}

const Button: Component<ButtonProps> = function({onClick, disabled, children}) {
  return (
    <button onclick={onClick} disabled={disabled}>
      {children}
    </button>
  );
};
```

### Using context parameter

```tsx
// Arrow functions can't use `this`, so use the ctx parameter
const Timer = async function*(_props, ctx: Context) {
  let count = 0;
  const id = setInterval(() => {
    count++;
    ctx.refresh();
  }, 1000);

  ctx.cleanup(() => clearInterval(id));

  for await (const _ of ctx) {
    yield <div>{count}</div>;
  }
};
```

### Higher-order component

```tsx
import type {Component} from "@b9g/crank";

function withLogging<P>(
  WrappedComponent: Component<P>
): Component<P> {
  return function*(props) {
    console.log("Mounting", WrappedComponent.name);
    this.cleanup(() => console.log("Unmounting", WrappedComponent.name));

    for (const props of this) {
      yield <WrappedComponent {...props} />;
    }
  };
}
```

## See also

- [Context](/api/core/classes/Context)
- [Children](/api/core/types/Children)
- [Components Guide](/guides/components)
- [Async Components Guide](/guides/async-components)
