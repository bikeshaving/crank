---
title: Web Components
description: Publish Crank components as framework-agnostic custom elements with the CrankHTMLElement base class — static configuration, a render method, and the full Crank lifecycle.
---

The `@b9g/crank/web-components` module provides `CrankHTMLElement`, a base class for writing Web Components with Crank. Subclass it, declare configuration as static fields, and define a `render` method. `render` is a normal Crank component — same forms, same lifecycle — except `this` is the element and the context arrives as an argument.

```jsx
import {CrankHTMLElement} from "@b9g/crank/web-components";

class XBlinkElement extends CrankHTMLElement {
  static shadowDOM = true;

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
| `observedAttributes` | `string[]` | Attributes that trigger a re-render. Read by the platform. |
| `events` | `readonly string[]` | Emitted event types; generates `on<type>` handler properties. |
| `shadowDOM` | `boolean` or `ShadowRootInit` | Omitted/`false`: light DOM (the default). `true`: an open shadow root. An object: that exact `attachShadow` configuration. |
| `formAssociated` | `boolean` | Opts into form association. Read by the platform. |

Light DOM is the default; opt into shadow DOM for encapsulation or slots.

## The render method

`render` receives `props` — the current `observedAttributes` values, as raw strings or null — and the Crank context, and may take any of Crank's four component forms:

```jsx
render(props, ctx) { return <span>{props.label}</span>; }   // sync function
async render(props, ctx) { /* ... */ }                      // async function
*render(props, ctx) { for (props of ctx) yield /* ... */; } // generator
async *render(props, ctx) { /* ... */ }                     // async generator
```

Use a generator when you need state across renders. The full Crank lifecycle applies through the context: `refresh`, `schedule`, `after`, and `cleanup`.

A sync render produces content immediately on connect. The async forms show nothing until they resolve, so prefer a sync render with a loading state.

## Attributes, properties, and updates

Attributes arrive as props, raw and uncoerced. Properties are the element's own accessors, exactly as on a built-in element — coercion, defaults, and reflection are whatever the getter and setter do:

```jsx
get color() {
  return this.getAttribute("color") ?? "black";
}

set color(v) {
  this.setAttribute("color", v);
}
```

For state beyond attributes, the base adds one instance method, `requestUpdate()`: a microtask-batched re-render request. A reactive property is an accessor whose setter calls it:

```jsx
set items(v) {
  this.#items = v;
  this.requestUpdate();
}
```

Properties assigned before the element upgrades are re-applied through their accessors on first connect, so pre-upgrade code works.

## Events

The element is an `EventTarget`; components emit events with `this.dispatchEvent`. `static events` additionally generates an `on<type>` accessor per declared type — a faithful event-handler IDL attribute like `onclick`: assigning a function registers a listener, `null` removes it, and listener order interleaves with `addEventListener` by registration order.

```jsx
class XMarqueeElement extends CrankHTMLElement {
  static events = ["bounce", "finish"];
  // ...
}

// consumers:
el.onbounce = (ev) => console.log("bounced");
el.onbounce = null;
```

In TypeScript, type the generated handlers by merging `EventHandlers` into the subclass — the tuple form types names, and an event map types each handler's payload:

```tsx
import {CrankHTMLElement} from "@b9g/crank/web-components";
import type {EventHandlers} from "@b9g/crank/web-components";

interface XMarqueeElement
  extends EventHandlers<{events: typeof XMarqueeElement.events}> {}
class XMarqueeElement extends CrankHTMLElement {
  static events = ["bounce", "finish"] as const;
}
```

## Styling

Styles are rendered. A shadow-DOM component includes a `<style>` element in its output, and shadow encapsulation scopes it to the element:

```jsx
class XMarqueeElement extends CrankHTMLElement {
  static shadowDOM = true;

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

The base owns the custom-element reactions and maps them onto the component lifecycle; you never override the callbacks.

| Reaction | What happens |
|---|---|
| construction (upgrade) | The shadow root is attached (a declarative shadow root from server-rendered HTML is reused). No render. |
| first `connectedCallback` | Pre-set properties are upgraded, styles adopted, and the first render happens synchronously. |
| `attributeChangedCallback` | Re-renders with new props, unless the value is unchanged. |
| `disconnectedCallback` | A microtask distinguishes a move from a removal: a reconnected element stays mounted; a removed one unmounts and runs `cleanup`. |

Each element is its own Crank root: provisions and errors do not cross the element boundary.

## Errors

An error thrown from `render` has no caller to catch it, so the base dispatches a cancelable `error` event on the element (an `ErrorEvent` carrying the thrown value), matching `<img>` and `window`. Call `preventDefault()` to mark it handled; otherwise the error is reported to the global scope — nothing is silently swallowed.

```jsx
el.addEventListener("error", (ev) => {
  report(ev.error);
  ev.preventDefault();
});
```

Inside the component, ordinary Crank error handling applies — catch at the `yield` and render a fallback.

## Form association

Set `static formAssociated = true` and the platform enables form participation; the base's whole contribution is a re-render on each form callback. `ElementInternals` is yours — call `attachInternals()` and use it in `render`, so the form value and validity are outputs of the same state as the rendered DOM. The data-carrying callbacks (`formResetCallback`, `formStateRestoreCallback`) have render-inducing defaults; `super` them and apply the payload:

```jsx
formStateRestoreCallback(state, mode) {
  super.formStateRestoreCallback(state, mode);
  this.#value = state;
}
```

## Server rendering

Server-side rendering and hydration of custom elements are not yet supported. An element upgraded on a page with a server-declared shadow root (`<template shadowrootmode>`) reuses that root rather than failing, and then client-renders into it.
