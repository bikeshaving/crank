---
title: impl
module: "@b9g/crank/html"
type: object
publish: true
---

# impl

The HTML render adapter implementation for string-based rendering.

## Syntax

```ts
const impl: Partial<RenderAdapter<TextNode, string, TextNode, string>>
```

## Description

The `impl` object (short for "implementation") contains the adapter methods for converting Crank elements to HTML strings. It implements a subset of the [RenderAdapter](/api/core/interfaces/RenderAdapter) interface.

Unlike the DOM adapter which creates real nodes, the HTML adapter works with simple `TextNode` objects that hold string values. The final HTML is assembled by joining these strings.

## Implemented methods

### scope()

Computes the XML namespace scope for child elements.

```ts
scope({tag, props, scope}): string | undefined
```

- Returns `"http://www.w3.org/2000/svg"` for `<svg>` elements
- Returns `"http://www.w3.org/1998/Math/MathML"` for `<math>` elements
- Returns `undefined` (exits namespace) for `<foreignObject>` elements
- Otherwise inherits the parent scope

### create()

Creates an empty TextNode container.

```ts
create(): TextNode  // Returns {value: ""}
```

### text()

Creates a TextNode with escaped text content.

```ts
text({value}): TextNode
```

Escapes HTML entities (`&`, `<`, `>`, `"`, `'`) to prevent XSS.

### read()

Extracts the final HTML string from an ElementValue.

```ts
read(value: ElementValue<TextNode>): string
```

### arrange()

Assembles the final HTML string for an element.

```ts
arrange({tag, tagName, node, props, children}): void
```

- Generates opening and closing tags
- Handles void elements (no closing tag)
- Formats attributes from props
- Handles `innerHTML` prop

## Handled props

The `arrange()` method handles these props specially:

| Prop | Behavior |
|------|----------|
| `style` | Converts object to CSS string, or uses string directly |
| `class` / `className` | Handles string or conditional object |
| `innerHTML` / `dangerouslySetInnerHTML` | Uses value directly instead of children |
| `htmlFor` | Rendered as `for` attribute |
| Event handlers (`on*`) | Ignored (client-only) |
| `prop:*` | Ignored (DOM properties only) |
| `attr:*` | Renders as attribute without prefix |

## Void elements

These elements are rendered without closing tags:

`area`, `base`, `br`, `col`, `command`, `embed`, `hr`, `img`, `input`, `keygen`, `link`, `meta`, `param`, `source`, `track`, `wbr`

## Examples

### Understanding output

```tsx
import {renderer} from "@b9g/crank/html";

// Input
const html = await renderer.render(
  <div class="container" style={{color: "red"}}>
    <span>Hello & goodbye</span>
  </div>
);

// Output (formatted for readability)
// <div class="container" style="color:red;">
//   <span>Hello &amp; goodbye</span>
// </div>
```

### Conditional classes

```tsx
// Input
<div class={{"active": true, "disabled": false}} />

// Output
// <div class="active"></div>
```

### Void elements

```tsx
// Input
<div>
  <input type="text" />
  <br />
  <img src="photo.jpg" />
</div>

// Output
// <div><input type="text"><br><img src="photo.jpg"></div>
```

### innerHTML

```tsx
// Input
<div innerHTML="<strong>Bold</strong>" />

// Output (innerHTML not escaped)
// <div><strong>Bold</strong></div>
```

## See also

- [HTMLRenderer](/api/html/classes/HTMLRenderer)
- [RenderAdapter](/api/core/interfaces/RenderAdapter)
- [renderer](/api/html/objects/renderer)
