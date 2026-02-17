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
    import {jsx, Fragment, renderer} from "https://unpkg.com/@b9g/crank/standalone?module";

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
    async function *TimeDisplay() {
      for ({} of this) {
        const now = new Date();
        yield jsx`
          <div style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 4px; margin: 20px 0;">
            <p><strong>Current time:</strong> ${now.toLocaleString()}</p>
            <p><small>This updates every 30 seconds</small></p>
          </div>
        `;

        // Wait 30 seconds before next update
        await new Promise(resolve => setTimeout(resolve, 30000));
        this.refresh();
      }
    }

    // Main application component
    function App() {
      return jsx`
        <div class="app">
          <h1>🎯 Crank JSX Template Tag Demo</h1>

          <${Greeting}
            name="Developer"
            message="Hello"
          />

          <${Counter} />

          <${TimeDisplay} />

          <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
            <p>
              <strong>✨ Features demonstrated:</strong>
            </p>
            <ul>
              <li>No transpilation required - runs directly in the browser</li>
              <li>JSX-like syntax with template literals</li>
              <li>Stateful components using generator functions</li>
              <li>Event handling with refresh callbacks</li>
              <li>Async components with automatic re-rendering</li>
              <li>Direct import from unpkg CDN</li>
            </ul>
            <p>
              <small>
                View source to see the complete implementation.
                Everything fits in a single HTML file!
              </small>
            </p>
          </div>
        </div>
      `;
    }

    // Render the application
    renderer.render(jsx`<${App} />`, document.getElementById("root"));

    console.log("🎉 Crank application loaded successfully!");
    console.log("📝 Note: 'html' is an alias for 'jsx' - they're the same function");
  </script>
</body>
</html>
```

This complete example shows how you can build a fully functional Crank application with:
- **No build tools** - runs directly in modern browsers
- **Direct CDN imports** - no local dependencies required
- **Rich interactivity** - stateful components, async updates, event handling
- **Modern syntax** - using the `html` template tag (alias for `jsx`)

Simply save this as an HTML file and open it in your browser to see it in action!

## Installation

The JSX tag function can be imported from the module `@b9g/crank/standalone`. This module re-exports everything from the core `@b9g/crank` module, the `jsx` and `html` tag functions from `@b9g/crank/jsx-tag`, and both renderers:

- `renderer` / `domRenderer` — the DOM renderer (from `@b9g/crank/dom`)
- `htmlRenderer` — the HTML renderer (from `@b9g/crank/html`)

This means a single import is sufficient for most use cases:

```js live
import {jsx, renderer} from "@b9g/crank/standalone";

function Greeting({name = "World"}) {
  return jsx`<div>Hello ${name}!</div>`;
}

renderer.render(jsx`<${Greeting} />`, document.body);
```

The `html` tag is an alias for `jsx` — they are the same function.

## JSX Syntax

The JSX template tag function is designed to replicate as much of JSX syntax and semantics as possible.

Just like JSX syntax, the template version supports components, but they must be explicitly interpolated.

```js notoggle
import {jsx} from "@b9g/crank/standalone";
function Component() {
  /* ... */
}

const syntaxEl = <Component />;
const templateEl = jsx`<${Component} />`;
```

Component closing tags can be done in one of three styles:

```js notoggle
const symmetricEl = jsx`<${Component}>{children}</${Component}>`;
// the closing tag is not checked for symmetry and is basically a comment
const commentEl = jsx`<${Component}>{children}<//Component>`;
// double slash closing tags are not checked for symmetry
const asymmetricEl = jsx`<${Component}>{children}<//>``;
```

## Error Messages

Syntax errors in template literals include line and column context with a caret pointer, making mistakes easy to spot:

```
Unexpected text `=></p>`

> 1 | <p class==></p>
     |          ^
```
