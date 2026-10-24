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
| `observedAttributes` | `readonly string[]` | Attributes that trigger a re-render. Read by the platform. |
| `events` | `readonly string[]` | Emitted event types; generates `on<type>` handler properties. |
| `shadow` | `ShadowRootInit` or `null` | The options passed to `attachShadow`; defaults to `{mode: "open"}`. `null`: no shadow root (light DOM). |
| `formAssociated` | `boolean` | Opts into form association. Read by the platform. |

Each element renders into an open shadow root by default, so `<slot>` projects the element's children and its styles stay scoped. Set `shadow` to change the root's options; it is passed to `attachShadow` as is, so it needs a `mode`:

```jsx
static shadow = {mode: "closed"};
static shadow = {mode: "open", delegatesFocus: true};
```

In TypeScript, annotate the field: `static shadow: ShadowRootInit = {mode: "closed"};`.

Set `shadow` to `null` to render into the element itself (light DOM). Page CSS then reaches the content and ID references like `<label for>` resolve, but there are no slots: a light-DOM element generates all of its content from state, so it takes no children. Content written inside it, such as fallback text for when JavaScript is off, is shown until the element upgrades and then replaced. Children passed to it from a Crank tree are reported as an error. Use light DOM for leaf elements, like a formatted price or a relative time:

```jsx
class XMoneyElement extends CrankHTMLElement {
  static shadow = null;
  static observedAttributes = ["amount"];

  render({amount}) {
    return `$${(Number(amount) / 100).toFixed(2)}`;
  }
}
```

## The render method

`render` receives `props` — the current `observedAttributes` values, as raw strings or null — and the Crank context, and may take any of Crank's four component forms:

```jsx
render(props, ctx) { return <span>{props.label}</span>; }   // sync function
async render(props, ctx) { /* ... */ }                      // async function
*render(props, ctx) { for (props of ctx) yield /* ... */; } // generator
async *render(props, ctx) { /* ... */ }                     // async generator
```

Use a generator when you need state across renders. The full Crank lifecycle applies through the context: `refresh`, `schedule`, `after`, and `cleanup`.

A sync render produces content immediately on connect. The async forms show nothing until they resolve, so prefer a sync render with a loading state, or render the element on the server.

## Attributes, properties, and updates

Attributes arrive as props, raw and uncoerced, keyed by attribute name (`props["scroll-amount"]`). A boolean attribute is present when its prop is not null: test `props.paused != null`, since a present attribute's value is often `""`. Properties are the element's own accessors, exactly as on a built-in element — coercion, defaults, and reflection are whatever the getter and setter do:

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

From the element's own setters and methods, call `this.requestUpdate()`: setting several properties in a row renders once, and it works before the element is connected. Inside `render`, for timers and listeners the component sets up, use `ctx.refresh()` as in any Crank component.

Properties assigned before the element upgrades are re-applied through their accessors on first connect, so pre-upgrade code works.

To wait for a render, await `updateComplete`. It resolves when no update is pending and the latest render has settled, async renders included, and it waits through updates requested in the meantime. Render errors go to the `error` event (below), not to this promise:

```jsx
el.setAttribute("count", "5");
await el.updateComplete;
```

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

Use lowercase event names: React and Svelte map an `onfoo` prop on a custom element to a `foo` listener. A type which already has a built-in handler property, like `change` or `input`, needs no generated one, so the element keeps the platform's.

## TypeScript

Pass the class itself as `CrankHTMLElement`'s type argument, as with `Context<typeof Component>`. It types the generated handlers from `static events` and, through `AttributeProps`, the props `render` receives from `static observedAttributes`. A complete element:

```tsx
import type {Context} from "@b9g/crank";
import {CrankHTMLElement} from "@b9g/crank/wc";
import type {AttributeProps, EventHandlers} from "@b9g/crank/wc";

type Props = AttributeProps<typeof XMarqueeElement>;

class XMarqueeElement extends CrankHTMLElement<typeof XMarqueeElement> {
  // `as const` keeps the names literal, so handlers and props are typed.
  static events = ["bounce", "finish"] as const;
  static observedAttributes = ["scrollamount"] as const;
  static shadow: ShadowRootInit = {mode: "open", delegatesFocus: true};

  #items: Array<string> = [];
  get items() {
    return this.#items;
  }

  set items(value) {
    this.#items = value;
    this.requestUpdate();
  }

  // TypeScript does not infer an override's parameters, so annotate them.
  *render({scrollamount}: Props, ctx: Context<Props>) {
    for ({scrollamount} of ctx) {
      yield (
        <div class="track" data-speed={scrollamount}>
          {this.items.map((item) => <span>{item}</span>)}
        </div>
      );
    }
  }
}

const el = new XMarqueeElement();
el.onbounce = (ev) => {}; // typed
el.onnope = () => {}; // error
```

For typed event payloads, pass an event map in place of the class:

```tsx
class XPickerElement extends CrankHTMLElement<{
  events: {pick: CustomEvent<number>};
}> {
  static events = ["pick"];
}

picker.onpick = (ev) => ev.detail.toFixed();
```

A class meant to be subclassed annotates `static events` instead of using `as const`, since a subclass cannot widen a literal tuple, and passes its event names as the type argument. A subclass which adds events merges `EventHandlers` for them:

```tsx
class XMarqueeElement extends CrankHTMLElement<{
  events: readonly ["bounce", "finish"];
}> {
  static events: ReadonlyArray<string> = ["bounce", "finish"];
}

interface XFancyMarqueeElement
  extends EventHandlers<{events: readonly ["sparkle"]}> {}
class XFancyMarqueeElement extends XMarqueeElement {
  static events = [...XMarqueeElement.events, "sparkle"];
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
| first `connectedCallback` | Pre-set properties are upgraded and the first render happens synchronously. A declarative shadow root from the server is hydrated; light DOM content is replaced once the first render commits. While the page is still parsing, the first render waits for `DOMContentLoaded`. |
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

On the server the renderer constructs a real instance of the class, applies props the way the DOM renderer would (properties the element defines are assigned, everything else becomes an attribute), and renders `render` in a root of its own, as in a browser: the async forms and nested elements work, and provisions and errors do not cross the element boundary. A light-DOM element renders its content as children; a shadow-DOM element renders a declarative shadow root, followed by its light children for its slots to project:

```html
<x-card>
  <template shadowrootmode="open"><b><slot></slot></b></template>
  <x-money amount="4999">$49.99</x-money>
</x-card>
```

The server tag prints the element's props as attributes, as for any element, so attributes an element sets on itself while rendering are not included. State an element needs to render its server content in the browser must come from attributes, since properties are not in the HTML. A parent element which passes a child its state as a property should be defined before the child, so the child does not render without it.

Define elements in a module script (`<script type="module">`), which runs after the page is parsed. An element defined by a classic script before the parser reaches it still hydrates, but while the page is parsing, its first render waits for `DOMContentLoaded`.

In the browser, the rule is to hydrate only content which unambiguously came from a server:

- **Shadow DOM elements hydrate.** A declarative shadow root (`<template shadowrootmode>`) is only ever produced by server rendering, so its presence says to adopt it. The server's nodes are kept, not replaced, so focus, input and other state from before the upgrade survive.
- **Light DOM elements do not.** Their existing children could be server output, fallback content written by hand, or another framework's content, and current web component conventions offer no way to tell. So the element treats them as a placeholder: it shows them until its first render commits, then replaces them.

If a clear signal for light DOM hydration emerges, adopting it will not change pages which lack it.

A Crank app which hydrates the page adopts each custom element. It leaves a light DOM element's contents to the element and hydrates only the light children it passes to a shadow DOM element. It can tell them apart only once an element is defined, so define your elements before hydrating the page; an undefined element's contents are hydrated as the app's own.

`CrankHTMLElement` loads where there is no DOM. It extends a small stand-in for `HTMLElement` which backs attributes, `attachShadow`, `attachInternals` (whose form methods do nothing), and events, but not a node tree, so construction and `render` must not reach for the node tree or layout: `closest`, `querySelector`, `ownerDocument`, `style`, `focus` and the like throw on the server. `localName`, `id`, `className`, `hidden`, `dataset` and other attribute-backed properties work. Guard browser-only registration:

```js
globalThis.customElements?.define("x-money", XMoneyElement);
```

A closed shadow root cannot be hydrated, because only `ElementInternals` exposes it and that belongs to the author: the browser empties it on upgrade and the element renders fresh.
