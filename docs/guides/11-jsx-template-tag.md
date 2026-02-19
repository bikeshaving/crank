---
title: JSX Template Tag
---

Crank provides a [tagged template
function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates)
as an alternative to JSX syntax. The main advantage of using a template tag is
that your code can run directly in browsers without having to be transpiled.

**Note:** While the template tag is called `jsx`, it’s also available as `html`
for convenience. The author of Crank would like to remind you that HTML !==
JSX, but sometimes it is easier to pretend JSX is HTML for syntax highlighters
and other tooling.

## A Complete Single-File Application

Here’s a complete HTML page that demonstrates Crank’s JSX template tag with no
build tools required:

```index.html
<!DOCTYPE html>
<html lang="en-US">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>Crank JSX Template Tag Demo</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .app {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .counter {
      text-align: center;
      padding: 20px;
    }
    button {
      background: #007bff;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
      margin: 0 8px;
    }
    button:hover {
      background: #0056b3;
    }
    .count {
      font-size: 48px;
      font-weight: bold;
      margin: 20px 0;
      color: #333;
    }
    .greeting {
      background: #e7f3ff;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
      border-left: 4px solid #007bff;
    }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="module">
    // Import everything from a single module - no build required!
    import {jsx, Fragment, renderer} from "https://cdn.jsdelivr.net/npm/@b9g/crank/standalone.js";

    // A simple greeting component
    function Greeting({name = "World", message = "Welcome"}) {
      return jsx`
        <div class="greeting">
          <h2>${message}, ${name}!</h2>
          <p>This component is built with Crank's JSX template tag.</p>
        </div>
      `;
    }

    // A stateful counter component using generators
    function *Counter() {
      let count = 0;

      // Event handlers using refresh callback pattern
      const increment = () => this.refresh(() => count++);
      const decrement = () => this.refresh(() => count--);
      const reset = () => this.refresh(() => count = 0);

      for ({} of this) {
        yield jsx`
          <div class="counter">
            <h3>Interactive Counter</h3>
            <div class="count">${count}</div>
            <div>
              <button onclick=${decrement}>-1</button>
              <button onclick=${reset}>Reset</button>
              <button onclick=${increment}>+1</button>
            </div>
            <p>
              <small>
                Count is ${count === 0 ? 'zero' : count > 0 ? 'positive' : 'negative'}
              </small>
            </p>
          </div>
        `;
      }
    }

    // Async component that fetches data
    async function RandomDog() {
      const res = await fetch("https://dog.ceo/api/breeds/image/random");
      const data = await res.json();
      return jsx`
        <div style="text-align: center; padding: 15px;">
          <img src=${data.message} alt="A random dog" width="300" />
        </div>
      `;
    }

    // Main application component
    function *App() {
      for ({} of this) {
        yield jsx`
          <div class="app">
            <h1>Crank JSX Template Tag Demo</h1>

            <${Greeting}
              name="Developer"
              message="Hello"
            />

            <${Counter} />

            <button onclick=${() => this.refresh()}>Show me a dog</button>
            <${RandomDog} />
          </div>
        `;
      }
    }

    // Render the application
    renderer.render(jsx`<${App} />`, document.getElementById("root"));

    console.log("Crank application loaded successfully!");
  </script>
</body>
</html>
```

Save this as an HTML file and open it in your browser — no build step required.

## Installation

The `@b9g/crank/standalone` module re-exports everything from the core `@b9g/crank` module, the `jsx` and `html` tag functions from `@b9g/crank/jsx-tag`, and both renderers (`renderer`/`domRenderer` from `@b9g/crank/dom`, `htmlRenderer` from `@b9g/crank/html`). A single import is sufficient for most use cases:

```js live
import {jsx, renderer} from "@b9g/crank/standalone";

function Greeting({name = "World"}) {
  return jsx`<div>Hello ${name}!</div>`;
}

renderer.render(jsx`<${Greeting} />`, document.body);
```

The `html` tag is an alias for `jsx` — they are the same function.

## Tags

String tags are written literally. Component and other expression tags must be interpolated:

```js notoggle
jsx`<div />`                    // host element
jsx`<${Component} />`           // component element
jsx`<${Fragment} />`            // symbol element
```

Component closing tags can be written in three styles:

```js notoggle
// Symmetric — must match the opening tag
jsx`<${Component}>${children}</${Component}>`
// Comment-style — text after // is not checked, serves as documentation
jsx`<${Component}>${children}<//Component>`
// Shorthand — closes the nearest open tag
jsx`<${Component}>${children}<//>`
```

## Props

Props appear after the tag name, before `>` or `/>`:

```js notoggle
// Boolean prop — value is true
jsx`<button disabled>`

// String prop — single or double quotes
jsx`<div class="foo">`
jsx`<div class='foo'>`

// Expression prop — value used directly
jsx`<div onclick=${handler}>`

// Interpolated string prop — expressions coerced to strings
jsx`<div class="prefix ${value} suffix">`

// Spread prop — object entries merged into props
jsx`<div ...${obj}>`
```

Escape sequences (`\n`, `\t`, `\xNN`, `\uNNNN`, `\u{N...}`) are processed within quoted strings, just like JavaScript.

## Children and Comments

Between opening and closing tags, the template accepts text, `${expressions}`, and nested elements. HTML-style comments are also supported — their contents are ignored, including any expressions:

```js notoggle
jsx`
  <div>
    <!-- This comment is ignored -->
    <p>Hello ${name}</p>
    <!-- Even ${expressions} inside comments are discarded -->
  </div>
`
```

## Whitespace

The template tag normalizes whitespace to match JSX conventions:

- A newline and any surrounding whitespace is collapsed — text before a newline has trailing whitespace trimmed, and text after a newline has leading whitespace trimmed.
- A backslash before a newline (`\` at end of line) preserves the preceding whitespace and removes the backslash.
- Trailing whitespace at the end of the template is trimmed.

## Caching

The template tag caches parse results keyed by the raw template strings. On subsequent calls with the same template, the cached AST is reused and only the expression values are updated. This makes repeated renders efficient — the parsing cost is paid once per unique template site.

## Error Messages

Syntax errors include line and column context with a caret pointer:

```
Unexpected text `=></p>`

> 1 | <p class==></p>
     |          ^
```
