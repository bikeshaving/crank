---
title: JSX Template Tag
---

Crank provides a [tagged template
function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates)
as an alternative to JSX syntax. The main advantage of using a template tag is
that your code can run directly in browsers without having to be transpiled.

## A single-file Crank application.

```index.html
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

## Installation

The JSX tag function can be imported from the module `@b9g/crank/standalone`. This module exports everything from the root `@b9g/crank` module as well as the `jsx` tag function, which is defined in the module `@b9g/crank/jsx-tag`.

```js live
import {Fragment, jsx} from "@b9g/crank/standalone";
import {jsx as jsx1} from "@b9g/crank/jsx-tag";
import {renderer} from "@b9g/crank/dom";

renderer.render(jsx`
  <${Fragment}>,
    <div>Hello world</div>
  <//Fragment>
`, document.body);

// console.log(jsx === jsx1);
```

In the future, we may use environment detection to automatically exports the correct `renderer`, which would make the `standalone` module truly “standalone.”

## JSX Syntax

The JSX template tag function is designed to replicate as much of JSX syntax and semantics as possible.

Just like JSX syntax, the template version supports components, but they must be explicitly interpolated.

```js
import {jsx} from "@b9g/crank/standalone";
function Component() {
  /* ... */
}

const syntaxEl = <Component />;
const templateEl = jsx`<${Component} />`;
```

Component closing tags can be done in one of three styles:

```js
const symmetricEl = jsx`<${Component}>{children}</${Component}>`;
// the closing tag is not checked for symmetry and is basically a comment
const commentEl = jsx`<${Component}>{children}<//Component>`;
// double slash closing tags are not checked for symmetry
const asymmetricEl = jsx`<${Component}>{children}<//>``;
```
