---
title: HTMLRenderer
module: "@b9g/crank/html"
type: class
publish: true
---

# HTMLRenderer

A renderer that generates HTML strings from Crank elements.

## Syntax

```ts
class HTMLRenderer extends Renderer<TextNode, undefined, any, string> {
  constructor();

  render(
    children: Children,
    root?: any,
    ctx?: Context
  ): Promise<string> | string;
}
```

## Constructor

```ts
new HTMLRenderer()
```

Creates a new HTMLRenderer instance. In most cases, you should use the pre-instantiated [renderer](/api/html/objects/renderer) export instead.

## Instance methods

### render()

```ts
render(children, root?, ctx?): Promise<string> | string
```

Renders an element tree to an HTML string.

**Parameters:**
- **children** - `Children` - The element tree to render.
- **root** (optional) - `any` - Typically unused for HTML rendering.
- **ctx** (optional) - `Context` - An ancestor context for bridging renderers.

**Returns:** The HTML string, or a promise if the tree contains async components.

## Description

HTMLRenderer is used for server-side rendering (SSR). It converts Crank elements into HTML strings that can be:

- Sent to the browser for initial page load
- Hydrated on the client with [DOMRenderer.hydrate()](/api/dom/classes/DOMRenderer)
- Used for static site generation
- Embedded in emails or other non-browser contexts

The renderer:
- Escapes text content to prevent XSS
- Handles void elements (br, img, input, etc.) correctly
- Converts style objects to CSS strings
- Handles class objects (conditional classes)
- Ignores event handlers and refs (client-only)

## Examples

### Basic server-side rendering

```tsx
import {renderer} from "@b9g/crank/html";

function App() {
  return (
    <html>
      <head>
        <title>My App</title>
      </head>
      <body>
        <div id="root">
          <h1>Hello, World!</h1>
        </div>
      </body>
    </html>
  );
}

const html = await renderer.render(<App />);
// Send html to client
```

### With async components

```tsx
import {renderer} from "@b9g/crank/html";

async function UserList() {
  const users = await fetchUsers();
  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}

// render() returns a Promise for async components
const html = await renderer.render(<UserList />);
```

### Express.js integration

```tsx
import express from "express";
import {renderer} from "@b9g/crank/html";

const app = express();

app.get("/", async (req, res) => {
  const html = await renderer.render(<App />);

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>My App</title>
        <script src="/client.js" defer></script>
      </head>
      <body>
        <div id="root">${html}</div>
      </body>
    </html>
  `);
});
```

### Static site generation

```tsx
import {writeFile} from "fs/promises";
import {renderer} from "@b9g/crank/html";

async function generateSite() {
  const pages = [
    {path: "/index.html", component: <HomePage />},
    {path: "/about/index.html", component: <AboutPage />},
    {path: "/contact/index.html", component: <ContactPage />},
  ];

  for (const {path, component} of pages) {
    const html = await renderer.render(component);
    await writeFile(`./public${path}`, wrapInDocument(html));
  }
}
```

### Hydration setup

```tsx
// server.tsx
import {renderer} from "@b9g/crank/html";

function App() {
  return <div class="app">Interactive content</div>;
}

const html = await renderer.render(<App />);
// Send to client...

// client.tsx
import {renderer} from "@b9g/crank/dom";

function App() {
  return <div class="app">Interactive content</div>;
}

// Hydrate instead of render to preserve server HTML
renderer.hydrate(<App />, document.getElementById("root"));
```

## See also

- [renderer](/api/html/objects/renderer)
- [impl](/api/html/objects/impl)
- [DOMRenderer](/api/dom/classes/DOMRenderer)
- [Hydration Guide](/guides/hydration)
