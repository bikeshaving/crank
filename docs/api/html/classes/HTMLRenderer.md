---
title: HTMLRenderer
module: "@b9g/crank/html"
type: class
publish: true
---

# HTMLRenderer

A renderer that generates HTML strings from Crank elements.

## Syntax

```tsx
import {renderer} from "@b9g/crank/html";

const html = await renderer.render(<App />);
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
- **root** (optional) - `unknown` - Either a `WritableStream<string>` or a Node.js writable stream which the HTML is written to as it is rendered (see [Streaming](#streaming)), or any other object, which is used as a key: rendering again with the same key updates the same tree, so components keep their state between renders.
- **ctx** (optional) - `Context` - An ancestor context for bridging renderers.

**Returns:** The HTML string, or a promise if the tree contains async components. When a stream is passed, the result is always a promise.

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

### Streaming

When a `WritableStream` of strings is passed as the second argument, the HTML is written to the stream as it is rendered, in document order. Everything before an async component is written without waiting for the component, so the browser can start loading stylesheets and scripts and paint the top of the page while the rest is still rendering.

```tsx
import {Fragment, Raw} from "@b9g/crank";
import {renderer} from "@b9g/crank/html";

async function Posts() {
  const posts = await fetchPosts();
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}

function handleRequest(): Response {
  const {readable, writable} = new TextEncoderStream();
  renderer
    .render(
      <Fragment>
        <Raw value="<!DOCTYPE html>" />
        <html>
          <head>
            <title>Posts</title>
            <link rel="stylesheet" href="/styles.css" />
          </head>
          <body>
            <h1>Posts</h1>
            <Posts />
          </body>
        </html>
      </Fragment>,
      writable,
    )
    .catch(console.error);

  return new Response(readable, {
    headers: {"Content-Type": "text/html; charset=utf-8"},
  });
}
```

In this example, everything up to and including `<h1>Posts</h1>` is sent immediately, and the list and the closing tags are sent when `fetchPosts()` resolves.

A Node.js writable stream, such as the response of an `http` server, can be passed directly:

```tsx
import {createServer} from "node:http";
import {renderer} from "@b9g/crank/html";

createServer((req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  Promise.resolve(renderer.render(<App />, res)).catch(console.error);
}).listen(3000);
```

The response is ended when the render finishes, and destroyed if the render fails.

- The promise returned by `render()` still resolves to the complete HTML string.
- The stream is closed when the render finishes, and the tree is unmounted, as it is for a render without a root: a stream cannot be rendered into a second time. If the render fails, the stream is aborted and the promise rejects. HTML which has already been sent cannot be taken back, so a response which fails partway is a truncated document.
- Content is written in document order. A slow component holds back everything after it, even if later components have finished.
- The contents of `<style>` and `<script>` elements, and of elements with an `innerHTML` prop, are written together with the closing tag.
- Writes are not held back for a slow consumer.
- Browsers may wait for a minimum amount of the response before they start parsing it. WebKit on Linux did not begin to parse a page whose first chunk was under a hundred bytes until the response had finished, and did once the chunk was a couple of kilobytes. A real document head is usually large enough.

#### Suspense

A slow component holds back everything after it, unless it is inside a [Suspense](/api/async/components/Suspense) component. When the children of a `Suspense` component take longer than its timeout, the fallback is written in their place and the rest of the document carries on. The children are written after the document when they are ready, and the browser puts them where the fallback was.

```tsx
<body>
  <h1>Posts</h1>
  <Suspense fallback={<p>Loading…</p>}>
    <Posts />
  </Suspense>
  <footer>About</footer>
</body>
```

If `Posts` is slow, this is what is sent, with the last line arriving when `Posts` has rendered:

```html
<body>
  <h1>Posts</h1>
  <?start name="crank-0"><p>Loading…</p><?end>
  <footer>About</footer>
</body>
<template for="crank-0"><ul>…</ul></template>
```

- Browsers which support [`<template for>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/template#out-of-order_patching) replace the fallback themselves. A small inline script, written after each template, does it in the others. The script is written with the `nonce` of the first `<script>` element in the document which has one, so that it runs under a content security policy which requires a nonce.
- If the children are ready within the timeout, they are written in place and there is no fallback or template.
- If the children fail after the fallback has been written, the document is finished without them and the stream is closed normally, and the promise returned by `render()` rejects with the error. When the document is hydrated, the browser renders the children and replaces the fallback.
- The promise resolves to everything which was written, including the templates.
- A fallback is only written where it can be replaced. A `Suspense` component inside a `SuspenseList` waits for its children and writes them in place, in document order. A render to a string rather than a stream waits for the children of every `Suspense` component.
- Hydrate the document after it has loaded, which is when a `type="module"` script runs. See the [hydration guide](/guides/hydration).

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
