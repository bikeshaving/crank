---
title: Working with TypeScript
---

Crank is written in TypeScript, and provides some types out of box so you can type-check your components and elements.

## Typing `this` in Components
Trying to reference `this` in a component without a `this` type annotation will throw a type error in TypeScript‘s strict mode (you’ll see a message like `'this' implicitly has type 'any' because it does not have a type annotation`). Crank exports the `Context` class so you can annotate your components `this` as `Context`:

```tsx
import {Context} from "@bikeshaving/crank";
function *Timer (this: Context) {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);
  try {
    while (true) {
      yield <div>Seconds: {seconds}</div>;
    }
  } finally {
    clearInterval(interval);
  }
}
```

## Typing Component Return Values
You’ll often want to add a return type to your components. Crank exports custom types to help you type the return types of components:

```tsx
import {Element} from "@bikeshaving/crank";
function SyncFn(): Element {
  return <div>Hello world</div>;
}

function *SyncGen(): Generator<Element> {
  while (true) {
    yield <div>Hello world</div>;
  } 
}

async function AsyncFn(): Promise<Element> {
  return <div>Hello world</div>;
}

async function *AsyncGen(): AsyncGenerator<Element> {
  while (true) {
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

The children prop can be typed using the `Children` type provided by Crank. The `Children` type is a broad type which can be `Child` or arbitrarily nested iterables of `Child`. TypeScript doesn’t really provide a way to prevent functions from being used as the `children` prop, but such patterns are strongly discouraged. You should typically treat `children` as an opaque value only to be interpolated into JSX because its value can be almost anything.

```tsx
import {Children} from "@bikeshaving/crank";
function Greeting ({name, children}: {name: string, children: Children}) {
  return (
    <div>
      Message for {name}: {children}
    </div>
  );
}
```

## Typing Event Listeners
If you dispatch custom events, you may want parent event listeners to be typed with the event you bubbled automatically. To do so, you can use module augmentation to extend the `EventMap` interface provided by Crank.

```tsx
declare global {
  module "@bikeshaving/crank" {
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

## Typing Provisions
By default, calls to the context’s `provide` and `consume` methods will be loosely typed. If you want stricter typings of these methods, you can use module augmentation to extend the `ProvisionMap` interface provided by Crank.
