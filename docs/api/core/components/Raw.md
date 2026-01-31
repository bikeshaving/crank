---
title: Raw
module: "@b9g/crank"
type: component
publish: true
---

# Raw

A component for injecting raw HTML strings or DOM nodes directly into the rendered output.

## Syntax

```jsx
<Raw value={htmlString} />
<Raw value={domNode} />
<Raw value={arrayOfNodes} />
```

## Description

Raw elements bypass Crank's normal element processing and inject content directly. This is useful for:

- Rendering HTML from a CMS or markdown processor
- Inserting pre-built DOM nodes
- Integrating with third-party libraries that create DOM elements

**Security Warning**: When using Raw with HTML strings from untrusted sources, you must sanitize the content to prevent XSS attacks.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string \| object` | HTML string or DOM node(s) to inject |

## Examples

### Rendering HTML strings

```tsx
import {Raw} from "@b9g/crank";

function RichContent({html}) {
  return (
    <div class="content">
      <Raw value={html} />
    </div>
  );
}

// Usage
<RichContent html="<strong>Bold</strong> and <em>italic</em>" />
```

### Markdown rendering

```tsx
import {Raw} from "@b9g/crank";
import {marked} from "marked";

function Markdown({content}) {
  const html = marked(content);
  return (
    <article class="markdown-body">
      <Raw value={html} />
    </article>
  );
}

// Usage
<Markdown content="# Hello\n\nThis is **markdown**." />
```

### Injecting DOM nodes

```tsx
import {Raw} from "@b9g/crank";

function* Chart({data}) {
  let chartNode = null;

  this.schedule(() => {
    // Create chart using D3 or similar
    chartNode = createD3Chart(data);
    this.refresh();
  });

  this.cleanup(() => {
    if (chartNode) {
      chartNode.remove();
    }
  });

  for (const {data} of this) {
    yield (
      <div class="chart-container">
        {chartNode ? <Raw value={chartNode} /> : <p>Loading chart...</p>}
      </div>
    );
  }
}
```

### SVG injection

```tsx
import {Raw} from "@b9g/crank";

const svgIcon = `
  <svg viewBox="0 0 24 24" width="24" height="24">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
  </svg>
`;

function Icon() {
  return <Raw value={svgIcon} />;
}
```

### With sanitization

```tsx
import {Raw} from "@b9g/crank";
import DOMPurify from "dompurify";

function SafeHTML({html}) {
  // Always sanitize untrusted HTML!
  const clean = DOMPurify.sanitize(html);
  return <Raw value={clean} />;
}
```

### Array of nodes

```tsx
import {Raw} from "@b9g/crank";

function* MultipleNodes() {
  const nodes = [
    document.createElement("span"),
    document.createElement("span"),
  ];
  nodes[0].textContent = "First";
  nodes[1].textContent = "Second";

  yield <Raw value={nodes} />;
}
```

## In custom renderers

The adapter's `raw()` method handles Raw elements:

```tsx
const adapter = {
  raw({value, scope}) {
    if (typeof value === "string") {
      // Parse HTML string
      const container = document.createElement("div");
      container.innerHTML = value;
      return Array.from(container.childNodes);
    }
    // Return node(s) directly
    return Array.isArray(value) ? value : [value];
  },
  // ... other methods
};
```

## See also

- [Text](/api/core/components/Text)
- [RenderAdapter](/api/core/interfaces/RenderAdapter)
- [Special Props and Tags Guide](/guides/special-props-and-tags)
