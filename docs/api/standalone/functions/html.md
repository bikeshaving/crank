---
title: html
module: "@b9g/crank/standalone"
type: function
publish: true
---

# html

An alias for the [jsx](/api/standalone/functions/jsx) template tag function.

## Syntax

```js
html`<div />`
html`<div>text</div>`
html`<div class=${className}>${children}</div>`
```

See [jsx](/api/standalone/functions/jsx) for complete syntax documentation.

## Return value

[Element](/api/core/classes/Element) - A Crank element ready to be rendered.

## Description

`html` is simply an alias for `jsx`. Both functions are identical in behavior. The `html` name is provided for developers who prefer it semantically or are coming from libraries like `htm` or `lit-html`.

```ts
import {jsx, html} from "@b9g/crank/standalone";

jsx === html; // true
```

## Examples

### Basic usage

```tsx
import {html} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/dom";

function App() {
  return html`
    <div class="app">
      <h1>Hello, World!</h1>
    </div>
  `;
}

renderer.render(html`<${App} />`, document.getElementById("root"));
```

### Coming from lit-html

If you're familiar with lit-html or similar libraries, `html` may feel more natural:

```tsx
import {html} from "@b9g/crank/standalone";

// Similar pattern to lit-html
const template = (name) => html`<p>Hello, ${name}!</p>`;
```

## See also

- [jsx](/api/standalone/functions/jsx)
- [createElement](/api/core/functions/createElement)
- [JSX Template Tag Guide](/guides/jsx-template-tag)
