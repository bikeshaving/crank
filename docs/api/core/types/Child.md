---
title: Child
module: "@b9g/crank"
type: type
publish: true
---

# Child

A type representing all valid non-iterable values in an element tree.

## Syntax

```ts
type Child = Element | string | number | boolean | null | undefined;
```

## Description

The `Child` type describes all primitive values that can appear as children in a Crank element tree, excluding iterables. These values are handled as follows during rendering:

| Value | Rendering behavior |
|-------|-------------------|
| `Element` | Rendered as a component or host element |
| `string` | Rendered as a text node |
| `number` | Converted to string, rendered as text |
| `boolean` | Ignored (renders nothing) |
| `null` | Ignored (renders nothing) |
| `undefined` | Ignored (renders nothing) |

Booleans being ignored allows for common conditional patterns:

```tsx
{showError && <ErrorMessage />}
```

When `showError` is `false`, the expression evaluates to `false` which renders nothing.

## Examples

### Basic usage

```tsx
function Example() {
  return (
    <div>
      {/* string */}
      Hello

      {/* number */}
      {42}

      {/* Element */}
      <span>World</span>

      {/* boolean - renders nothing */}
      {true}

      {/* null - renders nothing */}
      {null}

      {/* undefined - renders nothing */}
      {undefined}
    </div>
  );
}
```

### Conditional rendering

```tsx
function UserGreeting({user, isLoggedIn}) {
  return (
    <div>
      {/* Boolean short-circuit - renders nothing when false */}
      {isLoggedIn && <span>Welcome back, {user.name}!</span>}

      {/* Ternary with null */}
      {user.isPremium ? <PremiumBadge /> : null}
    </div>
  );
}
```

### Type checking

```tsx
import type {Child} from "@b9g/crank";

function isChild(value: unknown): value is Child {
  return (
    value == null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    isElement(value)
  );
}
```

## See also

- [Children](/api/core/types/Children)
- [Element](/api/core/classes/Element)
- [isElement](/api/core/functions/isElement)
