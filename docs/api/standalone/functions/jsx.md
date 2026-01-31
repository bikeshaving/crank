---
title: jsx
module: "@b9g/crank/standalone"
type: function
publish: true
---

# jsx

A template tag function for writing JSX-like syntax without a build step.

## Syntax

```js
jsx`<div />`
jsx`<div>text</div>`
jsx`<div class="foo">${children}</div>`
jsx`<div class=${className}>${children}</div>`
jsx`<${Component} prop=${value}>${children}<//Component>`
```

## Parameters

Interpolations (`${}`) in the template can appear in several positions:

- **Tags** - `<${Component}>` - Component functions or element names
- **Attributes** - `attr=${value}` - Prop values
- **Children** - `>${children}<` - Elements, strings, or arrays
- **Spreads** - `...${props}` - Object to spread as props

## Return value

[Element](/api/core/classes/Element) - A Crank element ready to be rendered.

## Description

The `jsx` template tag lets you write JSX-like syntax using JavaScript template literals. It parses the template at runtime and creates Crank elements, providing a build-free alternative to JSX transforms.

### Syntax features

- **HTML-like syntax**: Write elements like `<div>`, `<span>`, etc.
- **Component interpolation**: Use `${Component}` as tags
- **Expression interpolation**: Use `${}` for values in attributes and children
- **Self-closing tags**: `<br />` works as expected
- **Closing tag shorthand**: Use `<//>` to close any tag or `<//TagName>` for explicit closing
- **Comments**: HTML comments `<!-- comment -->` are stripped
- **Spread props**: `...${props}` in attributes
- **Whitespace handling**: Intelligent whitespace normalization

### Caching

Parse results are cached by template string identity, so repeated calls with the same template are efficient.

## Examples

### Basic usage

```tsx
import {jsx} from "@b9g/crank/standalone";

// Simple element
const div = jsx`<div class="container">Hello, World!</div>`;

// With expressions
const name = "Crank";
const greeting = jsx`<h1>Hello, ${name}!</h1>`;

// With attributes
const input = jsx`<input type="text" placeholder="Enter name" />`;
```

### Components

```tsx
import {jsx} from "@b9g/crank/standalone";

function Button({children, onClick}) {
  return jsx`<button onclick=${onClick}>${children}</button>`;
}

// Use component with ${} interpolation
const app = jsx`
  <div>
    <${Button} onClick=${() => alert("Clicked!")}>
      Click me
    <//Button>
  </div>
`;
```

### Closing tag shorthand

```tsx
import {jsx} from "@b9g/crank/standalone";

// Use </> to close any element
const element = jsx`
  <div>
    <span>Content</span>
  <//>
`;

// Or <//${Component}> for explicit closing
function Card({children}) {
  return jsx`<div class="card">${children}</div>`;
}

const app = jsx`
  <${Card}>
    <h2>Title</h2>
    <p>Content</p>
  <//Card>
`;
```

### Spread props

```tsx
import {jsx} from "@b9g/crank/standalone";

const buttonProps = {
  class: "btn btn-primary",
  disabled: false,
  onclick: () => console.log("clicked"),
};

const button = jsx`<button ...${buttonProps}>Click</button>`;
```

### Conditional rendering

```tsx
import {jsx} from "@b9g/crank/standalone";

function Greeting({name, showWelcome}) {
  return jsx`
    <div>
      ${showWelcome && jsx`<p>Welcome!</p>`}
      <p>Hello, ${name}!</p>
    </div>
  `;
}
```

### Lists

```tsx
import {jsx} from "@b9g/crank/standalone";

function TodoList({items}) {
  return jsx`
    <ul>
      ${items.map(item => jsx`
        <li key=${item.id}>${item.text}</li>
      `)}
    </ul>
  `;
}
```

### Complete application

```tsx
import {jsx} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/dom";

function* Counter() {
  let count = 0;

  for (const props of this) {
    yield jsx`
      <div>
        <p>Count: ${count}</p>
        <button onclick=${() => { count++; this.refresh(); }}>
          Increment
        </button>
      </div>
    `;
  }
}

renderer.render(
  jsx`<${Counter} />`,
  document.getElementById("root")
);
```

### With async components

```tsx
import {jsx} from "@b9g/crank/standalone";

async function UserProfile({id}) {
  const user = await fetchUser(id);
  return jsx`
    <div class="profile">
      <img src=${user.avatar} alt=${user.name} />
      <h2>${user.name}</h2>
      <p>${user.bio}</p>
    </div>
  `;
}
```

## Escaping

Use backslash to escape special characters:

```tsx
// Escaped newline (preserved whitespace before)
const text = jsx`
  Line 1 \
  Line 2
`;

// Literal ${
const literal = jsx`<p>Use \${} for interpolation</p>`;
```

## Error handling

The parser throws `SyntaxError` for invalid templates:

```tsx
// Throws: Unmatched opening tag "div"
jsx`<div>`;

// Throws: Unmatched closing tag "span"
jsx`<div></span>`;
```

## See also

- [html](/api/standalone/functions/html)
- [createElement](/api/core/functions/createElement)
- [JSX Template Tag Guide](/guides/jsx-template-tag)
