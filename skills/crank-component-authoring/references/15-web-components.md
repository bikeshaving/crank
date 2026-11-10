---
title: Web Components
description: Publish Crank components as framework-agnostic custom elements with the CrankHTMLElement base class — static configuration, a render method, and the full Crank lifecycle.
---

The `@b9g/crank/wc` module provides `CrankHTMLElement`, a base class for writing Web Components with Crank. Subclass it, declare configuration as static fields, and define a `render` method. `render` is a normal Crank component — same forms, same lifecycle — except `this` is the element and the context arrives as an argument.

```jsx
import {CrankHTMLElement} from "@b9g/crank/wc";

class XBlinkElement extends CrankHTMLElement {
  *render(props, ctx) {
    let on = true;
    const id = setInterval(() => {
      ctx.refresh(() => on = !on);
    }, 750);
    ctx.cleanup(() => clearInterval(id));

    for ({} of ctx) {
      yield (
        <span style={`visibility: ${on ? "visible" : "hidden"}`}>
          <slot />
        </span>
      );
    }
  }
}

customElements.define("x-blink", XBlinkElement);
```

```html
<x-blink>Under Construction</x-blink>
```

The element works in any page or framework — the consumer never knows Crank is inside.

## When to use web components

Within a Crank application, prefer plain components. Define a custom element when:

1. **Framework-agnostic wrappers.** Publishing a component for consumers outside Crank — React, Vue, plain HTML, a CMS — as a tag that works anywhere.
2. **Imperative methods.** A component whose consumers need to call methods — `play()`/`pause()`, `show()`, `focus()` — wants to be an element: methods live on the instance like a built-in's, reachable through a ref from any framework.
3. **Shadow DOM.** Slots and encapsulated styles are element features, so a component built around them — projecting consumer content with `<slot>`, or shipping styles that cannot leak in or out — belongs in a custom element.

## Configuration

Configuration is static fields; behavior is methods and accessors. No constructor is needed.

| Static field | Type | Meaning |
|---|---|---|
| `props` | `Record<string, PropType>` | The element's properties and their types. See below. |
| `events` | `Record<string, EventType>` | Emitted events by type, each with its event class; generates `on<type>` handler properties. |
| `shadow` | `ShadowRootInit` or `null` | The options passed to `attachShadow`; defaults to `{mode: "open"}`. `null`: no shadow root (light DOM). |
| `formAssociated` | `boolean` | Opts into form association. Read by the platform. |

Each element renders into an open shadow root by default, so `<slot>` projects the element's children and its styles stay scoped. Set `shadow` to change the root's options; it is passed to `attachShadow` as is, so it needs a `mode`:

```jsx
static shadow = {mode: "closed"};
static shadow = {mode: "open", delegatesFocus: true};
```

In TypeScript, annotate the field: `static shadow: ShadowRootInit = {mode: "closed"};`.

Set `shadow` to `null` to render into the element itself (light DOM). Page CSS then reaches the content and ID references like `<label for>` resolve, but there are no slots: a light-DOM element generates its content from state. It renders that content in front of its children and leaves them alone, whether they were passed from a Crank tree or written in the HTML. Fallback content for when JavaScript is off therefore stays, so hide it with CSS once the element is defined: `x-time:defined > .fallback { display: none }`. Use light DOM for leaf elements, like a formatted price or a relative time:

```jsx
class XMoneyElement extends CrankHTMLElement {
  static shadow = null;
  static props = {amount: Number};

  render({amount}) {
    return `$${((amount ?? 0) / 100).toFixed(2)}`;
  }
}
```

## The render method

`render` receives `props`, the current value of each prop declared in `static props`, and the Crank context, and may take any of Crank's four component forms:

```jsx
render(props, ctx) { return <span>{props.label}</span>; }   // sync function
async render(props, ctx) { /* ... */ }                      // async function
*render(props, ctx) { for (props of ctx) yield /* ... */; } // generator
async *render(props, ctx) { /* ... */ }                     // async generator
```

Use a generator when you need state across renders. The full Crank lifecycle applies through the context: `refresh`, `schedule`, `after`, and `cleanup`.

A sync render commits on connect. An async render commits when it settles, and until then the element shows what it already has: a declarative shadow root rendered on the server, or for a light DOM element, its children. A shadow DOM element with no server content shows nothing until its render settles, since its light children are not projected before the shadow root has a slot.

## Props

Declare the element's properties in `static props`, with a type for each:

```jsx
class XMarqueeElement extends CrankHTMLElement {
  static props = {
    label: String,
    speed: Number,
    paused: Boolean,
    size: ["medium", "small", "large"],
    items: null,
  };

  render({label, speed, paused, size, items}) {
    // ...
  }
}
```

Each declared prop becomes an accessor on the element and a prop `render` receives. `String`, `Number`, `Boolean` and keyword props reflect to the attribute of the same name, lowercased, as built-in elements do. The attribute is the storage: the getter reads and converts it, the setter writes it, and the attribute change re-renders the element. `el.speed = 5` and `el.setAttribute("speed", "5")` are the same operation.

| Type | Reading | Writing |
|---|---|---|
| `String` | The attribute, or `""` when missing. | Stringified. |
| `Number` | The parsed number, or `0` when missing or not a number. | Stringified. `NaN` and `Infinity` throw. |
| `Boolean` | Whether the attribute is present. | Adds or removes the attribute. |
| `["a", "b"]` | The matching keyword, case-insensitively, or the first when missing or unknown. | The matching keyword's declared spelling. |
| `null` | The value set on the element. | Stored on the element and re-renders it. Never an attribute. |

A missing number reads as `0` and a missing string as `""`, as on built-in elements, so a default belongs in `render`: `speed || 6`. The element never writes a default to the attribute. Setting a reflected prop to `null` or `undefined` removes the attribute.

Props declared `null` hold arrays, objects and anything else without an attribute form. Setting one calls `requestUpdate()`. On the server they reach `render` but not the markup, and there is no JSON parsing of attributes.

A Crank parent sets declared props as properties, so `<x-marquee speed={5} items={list} />` goes through the accessors. Properties assigned before the element upgrades are applied through them on first connect, so pre-upgrade code works. The base never overwrites an accessor you define yourself, so for custom conversion declare the prop as `null` and write a getter and setter that call `requestUpdate()`.

For state beyond props, the base adds one instance method, `requestUpdate()`: a microtask-batched re-render request. From the element's own setters and methods, call `this.requestUpdate()`: setting several properties in a row renders once, and it works before the element is connected. Inside `render`, for timers and listeners the component sets up, use `ctx.refresh()` as in any Crank component.

To wait for a render, await `updateComplete`. It resolves when no update is pending and the latest render has settled, async renders included, and it waits through updates requested in the meantime. Render errors go to the `error` event (below), not to this promise:

```jsx
el.speed = 5;
await el.updateComplete;
```

## Events

The element is an `EventTarget`; components emit events with `this.dispatchEvent`. `static events` lists the events the element emits, each with its event class, and generates an `on<type>` accessor per entry — a faithful event-handler IDL attribute like `onclick`: assigning a function registers a listener, `null` removes it, and listener order interleaves with `addEventListener` by registration order. The class is only used for typing; the element dispatches whatever it constructs.

```jsx
class XMarqueeElement extends CrankHTMLElement {
  static events = {bounce: Event, finish: Event};
  // ...
}

// consumers:
el.onbounce = (ev) => console.log("bounced");
el.onbounce = null;
```

Use lowercase event names: React and Svelte map an `onfoo` prop on a custom element to a `foo` listener. A type which already has a built-in handler property, like `change` or `input`, needs no generated one, so the element keeps the platform's.

## TypeScript

Pass the class itself as `CrankHTMLElement`'s type argument, as with `Context<typeof Component>`. It types the generated handlers from `static events` and, through `ElementProps`, the element's properties and the props `render` receives from `static props`. A complete element:

```tsx
import type {Context} from "@b9g/crank";
import {CrankHTMLElement} from "@b9g/crank/wc";
import type {ElementProps} from "@b9g/crank/wc";

class XMarqueeElement extends CrankHTMLElement<typeof XMarqueeElement> {
  static events = {bounce: CustomEvent<number>, finish: Event};
  static props = {
    speed: Number,
    // `as const` keeps the keywords literal, so they are typed as a union.
    size: ["medium", "small", "large"] as const,
    items: null,
  };
  static shadow: ShadowRootInit = {mode: "open", delegatesFocus: true};

  // TypeScript does not infer an override's parameters, so annotate them.
  *render(
    {speed, size, items}: ElementProps<typeof XMarqueeElement>,
    ctx: Context,
  ) {
    for ({speed, size, items} of ctx) {
      yield (
        <div class={`track ${size}`} data-speed={speed || 6}>
          {(items as Array<string>).map((item) => <span>{item}</span>)}
        </div>
      );
    }
  }
}

const el = new XMarqueeElement();
el.speed = 5; // number
el.size = "small"; // the keyword union
el.onbounce = (ev) => ev.detail.toFixed(); // CustomEvent<number>
el.onfinish = (ev) => {}; // Event
el.onnope = () => {}; // error
```

`ElementProps` gives `string`, `number`, `boolean`, the keyword union, or `unknown` for `null`. Narrow `null` props in `render` or write your own typed accessor.

Each handler's `ev` is typed by the class in `static events`. `CustomEvent<number>` written as a value is an instantiation expression: TypeScript 4.7 and later accept a type argument on a generic class in value position, and at runtime it is just `CustomEvent`. Any event class works, like `MouseEvent` or a class of your own.

A subclass which adds events spreads the base's table and merges `EventHandlers` for its own, since the base's type argument is already fixed:

```tsx
import type {EventHandlers} from "@b9g/crank/wc";

interface XFancyMarqueeElement
  extends EventHandlers<{events: typeof XFancyMarqueeElement.events}> {}
class XFancyMarqueeElement extends XMarqueeElement {
  static events = {...XMarqueeElement.events, sparkle: CustomEvent<string>};
}
```

## Styling

Styles are rendered. A component includes a `<style>` element in its output, and the shadow root scopes it to the element:

```jsx
class XMarqueeElement extends CrankHTMLElement {
  render() {
    return (
      <>
        <style>{`
          .track {
            display: inline-block;
            white-space: nowrap;
            animation: scroll linear infinite;
          }
        `}</style>
        <div class="track">
          <slot />
        </div>
      </>
    );
  }
}
```

Light-DOM elements have no style encapsulation; use ordinary page CSS, scoped by the tag name.

## Lifecycle

The base owns the custom-element reactions and maps them onto the component lifecycle. Don't override them, except the two form callbacks you need to act on (see below), and call `super` when you do.

| Reaction | What happens |
|---|---|
| construction (upgrade) | The shadow root is attached, or an open declarative shadow root from server-rendered HTML is reused. No render. |
| first `connectedCallback` | Pre-set properties are upgraded and the first render happens synchronously. A declarative shadow root from the server is hydrated; a light DOM element renders in front of its children. While the page is still parsing, the first render waits for `DOMContentLoaded`. |
| `attributeChangedCallback` | Re-renders with new props, unless the value is unchanged. |
| `disconnectedCallback` | A microtask distinguishes a move from a removal: a reconnected element stays mounted; a removed one unmounts and runs `cleanup`. |

Each element is its own Crank root: provisions and errors do not cross the element boundary.

## Errors

An error thrown from `render` has no caller to catch it, so the base dispatches a cancelable `error` event on the element (an `ErrorEvent` carrying the thrown value), matching `<img>` and `window`. Call `preventDefault()` to mark it handled; otherwise the error is reported to the global scope, so none is silently swallowed. A failed render is unmounted, and the next update renders afresh. An error from a re-render the component starts itself with `ctx.refresh()` is thrown to that call, as in any Crank component. On the server, an error thrown from an element's `render` makes the whole `HTMLRenderer.render` call throw, or reject when the render is async.

```jsx
el.addEventListener("error", (ev) => {
  report(ev.error);
  ev.preventDefault();
});
```

The event follows the platform's model for uncaught exceptions, which `reportError` dispatches to `window` the same way, and the built-in `onerror` handler property and attribute receive it. An element which fires its own `error` events, like a media element reporting a failed load, can tell them apart: a render error is always an `ErrorEvent` carrying the thrown value as `ev.error`, while load errors are plain `Event`s.

```jsx
el.addEventListener("error", (ev) => {
  if (ev instanceof ErrorEvent) {
    // a render error
  }
});
```

Inside the component, ordinary Crank error handling applies — catch at the `yield` and render a fallback.

## Form association

Set `static formAssociated = true` and the platform enables form participation; the base's whole contribution is a re-render on each form callback. `ElementInternals` is yours — call `attachInternals()` and use it in `render`, so the form value and validity are outputs of the same state as the rendered DOM. The two callbacks you need to act on, `formResetCallback` (reset your value) and `formStateRestoreCallback` (apply the restored state), re-render by default; `super` them and do the rest. The re-render is batched to a microtask, so state you set after calling `super` is what it renders:

```jsx
formStateRestoreCallback(state, mode) {
  super.formStateRestoreCallback(state, mode);
  this.#value = state;
}
```

## Server rendering

The HTML renderer renders custom elements too. Register each class with it, the server's equivalent of `customElements.define`:

```jsx
import {HTMLRenderer} from "@b9g/crank/html";
import {XMoneyElement, XCardElement} from "./elements.js";

const renderer = new HTMLRenderer();
renderer.define("x-money", XMoneyElement);
renderer.define("x-card", XCardElement);

const html = await renderer.render(
  <x-card>
    <x-money amount="4999" />
  </x-card>
);
```

On the server the renderer constructs a real instance of the class, gives it its props (declared props go through their accessors, so reflected ones become attributes; of the rest, objects and arrays are assigned as properties and other values become attributes), and renders `render` in a root of its own, as in a browser: the async forms and nested elements work, and provisions and errors do not cross the element boundary. A shadow-DOM element renders a declarative shadow root, followed by its light children for its slots to project. A light-DOM element prints only its tag and the children passed to it, and renders its own content when it upgrades in the browser:

```html
<x-card>
  <template shadowrootmode="open"><b><slot></slot></b></template>
  <x-money amount="4999"></x-money>
</x-card>
```

Content that must be in the HTML, for search engines or for readers without JavaScript, belongs in a shadow DOM element.

The server tag prints the element's props as attributes, as for any element, so attributes an element sets on itself while rendering are not included. Reflected props are therefore in the HTML, and the upgraded element reads them back before its first render, so it renders with what the server had.

A prop declared `null` is not in the HTML. An element given one on the server prints a `defer-hydration` attribute, and in the browser it does not render while that attribute is present. Assigning one of those props removes the attribute and renders the element, so a Crank parent, or any parent which sets properties, needs nothing more. A shadow DOM element keeps the server's nodes meanwhile and adopts them on that first render, so there is no empty flash and no second render. This is the `defer-hydration` community protocol, under which a parent may also remove the attribute itself once the properties are in place:

```js
el.items = items;
el.removeAttribute("defer-hydration");
```

Define elements in a module script (`<script type="module">`), which runs after the page is parsed. An element defined by a classic script before the parser reaches it still hydrates, but while the page is parsing, its first render waits for `DOMContentLoaded`.

In the browser, a shadow DOM element hydrates its declarative shadow root (`<template shadowrootmode>`), which only server rendering produces. The server's nodes are kept, not replaced, so focus, input and other state from before the upgrade survive. A light DOM element has no server content to hydrate: it renders on upgrade, in front of its children.

A Crank app which hydrates the page treats a custom element as any element and hydrates the children it passes. That holds for any custom element with light children, defined by Crank or not. A Crank element's own content is not among those children, and it renders it again when the page's hydration has placed the element.

`CrankHTMLElement` loads where there is no DOM. It extends a small stand-in for `HTMLElement` which backs attributes, `attachShadow`, `attachInternals` (whose form methods do nothing), and events, but not a node tree, so construction and `render` must not reach for the node tree or layout: `closest`, `querySelector`, `ownerDocument`, `style`, `focus` and the like throw on the server. `localName`, `id`, `className`, `hidden`, `dataset` and other attribute-backed properties work. Guard browser-only registration:

```js
globalThis.customElements?.define("x-money", XMoneyElement);
```

A closed shadow root cannot be hydrated, because only `ElementInternals` exposes it and that belongs to the author: the browser empties it on upgrade and the element renders fresh.
