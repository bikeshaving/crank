---
title: Working with TypeScript
---

Crank is written in TypeScript and provides excellent type safety out of the box. This guide covers the types and patterns you'll need to build type-safe Crank applications.

## Typing Component Context

Generator components use `this` to access the component context. In TypeScript's strict mode, you'll need to provide a type annotation for `this`. Crank exports the `Context` type for this purpose:

```tsx
import {Context} from "@b9g/crank";
function *Timer (this: Context, props: {}, ctx: Context) {
  let seconds = 0;
  const interval = setInterval(() => this.refresh(() => seconds++), 1000);
  
  for ({} of this) {
    yield <div>Seconds: {seconds}</div>;
  }
  
  clearInterval(interval);
}
```

## Typing Component Return Values
You’ll often want to add a return type to your components. Crank exports custom types to help you type the return types of components:

```tsx
import {Element} from "@b9g/crank";
function SyncFn(): Element {
  return <div>Hello world</div>;
}

function *SyncGen(): Generator<Element> {
  for ({} of this) {
    yield <div>Hello world</div>;
  }
}

async function AsyncFn(): Promise<Element> {
  return <div>Hello world</div>;
}

async function *AsyncGen(): AsyncGenerator<Element> {
  for ({} of this) {
    yield <div>Hello world</div>;
  }
}
```

`Element` is just the type returned by JSX expressions/`createElement`. As you can see, you still have to modify the return type of functions based on whether the function is async or a generator. You can also use the type `Child` which represents any valid value in an element tree.

```tsx
function *SyncGen(): Generator<Child> {
  yield true;
  yield false;
  yield null;
  yield undefined;
  yield 0;
  yield 9001;
  yield "Hello world";
  yield <div>Hello world</div>;
}
```

Anything assignable to `Child` can be part of the element tree, and almost anything can be assigned to `Child`.

## Typing Props
You can type the props object passed to components. This allows JSX elements which use your component as a tag to be type-checked.

```tsx
function Greeting ({name}: {name: string}) {
  return (
    <div>Hello {name}</div>
  );
}

const el = <Greeting name="Brian" />; // compiles
const el1 = <Greeting name={1} />; // throws a type error
```

### ComponentProps Helper Type

Starting in Crank 0.7, you can use the `ComponentProps` helper type to extract the props type from any component. This is useful when you need to reference a component's props in other type definitions or when creating higher-order components.

```tsx
import {ComponentProps} from "@b9g/crank";

function Button({variant, children}: {variant: "primary" | "secondary", children: string}) {
  return <button class={`btn btn-${variant}`}>{children}</button>;
}

// Extract Button's props type
type ButtonProps = ComponentProps<typeof Button>;
// Equivalent to: {variant: "primary" | "secondary", children: string}

// Use in higher-order components
function withLoading<T extends ComponentProps<any>>(Component: (props: T) => any) {
  return function LoadingWrapper({loading, ...props}: T & {loading: boolean}) {
    if (loading) return <div>Loading...</div>;
    return <Component {...props} />;
  };
}

const LoadingButton = withLoading(Button);
```

The children prop can be typed using the `Children` type provided by Crank. The `Children` type is a broad type which can be `Child` or arbitrarily nested iterables of `Child`. TypeScript doesn’t really provide a way to prevent functions from being used as the `children` prop, but such patterns are strongly discouraged. You should typically treat `children` as an opaque value only to be interpolated into JSX because its value can be almost anything.

```tsx
import {Children} from "@b9g/crank";
function Greeting ({name, children}: {name: string, children: Children}) {
  return (
    <div>
      Message for {name}: {children}
    </div>
  );
}
```

## Typing Event Listeners
If you dispatch custom events, you may want parent event listeners to be typed with the event you bubbled automatically. To do so, you can use module augmentation to extend the `EventMap` interface from the global `Crank` module.

```tsx
declare global {
  module Crank {
    interface EventMap {
      "mybutton.click": CustomEvent<{id: string}>;
    }
  }
}


function MyButton (props) {
  this.addEventListener("click", () => {
    this.dispatchEvent(new CustomEvent("mybutton.click", {
      bubbles: true,
      detail: {id: props.id},
    }));
  });

  return (
    <button {...props} />
  );
}
```

When importing the DOM or HTML renderers, the `EventMap` will be extended with [the `GlobalEventHandlersMap` interface](https://github.com/microsoft/TypeScript/blob/master/lib/lib.dom.d.ts#L5682).

## Typing Provisions
By default, calls to the context’s `provide` and `consume` methods will be loosely typed. If you want stricter typings of these methods, you can use module augmentation to extend the `ProvisionMap` interface from the global `Crank` module.

```tsx
declare global {
  module Crank {
    interface ProvisionMap {
      greeting: string;
    }
  }
}

function GreetingProvider(
  {greeting, children}: {greeting: string, children?: unknown},
) {
  this.provide("greeting", greeting);
  return children;
}

function Greeting({name}: {name: string}) {
  const greeting = this.consume("greeting");
  return <p>{greeting}, {name}</p>;
}
```
