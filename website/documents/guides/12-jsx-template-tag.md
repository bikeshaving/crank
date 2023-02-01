---
title: JSX Template Tag
---

Crank provides a [tagged template
function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates)
as an alternative to JSX syntax. The main advantage of using a template tag is
that your code can run directly in browsers without having to be transpiled.

```html
<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>TODO: Replace me</title>
  </head>
  <body>
    <div id="root" />
    <script type="module">
import {jsx} from "https://unpkg.com/@b9g/crank/standalone?module";
import {renderer} from "https://unpkg.com/@b9g/crank/dom?module";

function Greeting({name="World"}) {
  return jsx`
    <div>Hello ${name}</div>
  `;
}

renderer.render(
  jsx`<${Greeting} name="Alice" />`,
  document.getElementById("root"),
);
    </script>
  </body>
</html>
```

A Crank application as a single HTML file. No transpilation required.

The JSX tag function can be imported from the module `"@b9g/crank/standalone"`.
This module exports everything from the root `@b9g/crank` module as well as the
`jsx` tag function, which is defined in the module `"@b9g/crank/jsx-tag"`.

The modules are structured like this to prevent. Due to limitations with template tags, component
references in tags must be interpolated.

```jsx
import {jsx} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/dom";

function Greeting({name="World"}) {
  return jsx`
    <div>Hello ${name}</div>
  `;
}

renderer.render(<Greeting name="Alice" />, document.body);
// Notice the ${} is necessary. JSX Syntax wins here.
renderer.render(jsx`<${Greeting} name="Bob" />`, document.body);
```

## Comparing JSX syntax to JSX template tags

JSX syntax
