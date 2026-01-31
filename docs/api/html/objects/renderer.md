---
title: renderer
module: "@b9g/crank/html"
type: object
publish: true
---

# renderer

A pre-instantiated HTMLRenderer for convenient server-side rendering.

## Syntax

```ts
const renderer: HTMLRenderer
```

## Description

The `renderer` export is a pre-created instance of [HTMLRenderer](/api/html/classes/HTMLRenderer). This is the recommended way to do server-side rendering in Crank.

## Examples

### Basic usage

```tsx
import {renderer} from "@b9g/crank/html";

function App() {
  return <h1>Hello, World!</h1>;
}

const html = await renderer.render(<App />);
console.log(html); // "<h1>Hello, World!</h1>"
```

### Full HTML document

```tsx
import {renderer} from "@b9g/crank/html";

function Document({children, title}) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <div id="root">{children}</div>
        <script src="/client.js" defer />
      </body>
    </html>
  );
}

function App() {
  return (
    <main>
      <h1>Welcome</h1>
      <p>This is server-rendered.</p>
    </main>
  );
}

const html = await renderer.render(
  <Document title="My App">
    <App />
  </Document>
);

// Add doctype manually
const fullHtml = "<!DOCTYPE html>" + html;
```

### With data fetching

```tsx
import {renderer} from "@b9g/crank/html";

async function BlogPost({slug}) {
  const post = await fetchPost(slug);
  return (
    <article>
      <h1>{post.title}</h1>
      <div innerHTML={post.content} />
    </article>
  );
}

const html = await renderer.render(<BlogPost slug="hello-world" />);
```

### Streaming (manual)

```tsx
import {renderer} from "@b9g/crank/html";

async function* streamPage(res) {
  // Send head immediately
  res.write("<!DOCTYPE html><html><head>...</head><body>");

  // Render and send body
  const body = await renderer.render(<App />);
  res.write(body);

  // Close document
  res.write("</body></html>");
  res.end();
}
```

## See also

- [HTMLRenderer](/api/html/classes/HTMLRenderer)
- [impl](/api/html/objects/impl)
- [Hydration Guide](/guides/hydration)
