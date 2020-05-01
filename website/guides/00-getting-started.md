---
title: Installation
---

Crank is available on [NPM](https://npmjs.org/@bikeshaving/crank) and on the unpkg CDN, in the ESModule and CommonJS formats.

## In the browser (no build tool)

You can use Crank directly in your browser, without a build step, like this. 

```html
<!-- Don't do this in production! -->
<script src="https://unpkg.com/babel-standalone/babel.min.js"></script>
<script type="module">
  import {createElement} from "https://unpkg.com/@bikeshaving/crank?module";
  import {renderer} from "https://unpkg.com/@bikeshaving/crank/dom?module";
  window.createElement = createElement;
  window.renderer = renderer;
</script>
<script type="text/babel">
  /** @jsx createElement */
  renderer.render(<div id="hello">Hello world</div>, document.body);
</script>
```

(Don't do this in production! Transpiling JSX and importing Crank in the user's browser at runtime hurts performance. It's better to transpile JSX and bundle Crank ahead of time, during a build step on your own computer. But this is an easy way to try out Crank.)

## Use JSX with Babel and Parcel

Crank is designed to be used with a JSX transpiler. In this example, we'll set up [Babel](https://babeljs.io/) and [Parcel](https://parceljs.org/).

```shell
$ npm install @bikeshaving/crank
$ npm install --save-dev parcel-bundler
```

Create a `.babelrc` file like this:

```
{
  "presets": [
    "@babel/preset-react"
  ]
}
```

Create an `index.html` file like this:

```html
<html>
<body>
<script src="src/index.js"></script>
</body>
</html>
```

Create a `src` folder containing `index.js` like this:

```jsx
/** @jsx createElement */
import {createElement} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";

function Greeting({name = "World"}) {
  return (
    <div>Hello {name}</div>
  );
}

renderer.render(<Greeting />, document.body);
```

Add these scripts to the `scripts` section of your `package.json`.

```js
  "scripts": {
    "start": "parcel index.html --open",
    "build": "parcel build index.html"
  },
```

Then you can `npm run start` to view your app in the browser.

[Try on CodeSandbox](https://codesandbox.io/s/a-simple-crank-component-mhciu)

### Use JSX in Node.js for Server-Side Rendering

In Node, we need to `import` Crank in CommonJS (`cjs`) format, and use the `html` renderer to generate HTML as a string.

After setting up JSX according to the steps above, create this file as `ssr.js`

```js
/** @jsx createElement */
import {createElement} from "@bikeshaving/crank/cjs/index.js";
import {renderer} from "@bikeshaving/crank/cjs/html.js";

function Greeting({name = "World"}) {
  return (
    <div>Hello {name}</div>
  );
}

console.log(renderer.render(<Greeting />));
```

```shell
$ npx parcel build ssr.js
$ node dist/ssr.js
<div>Hello World</div>
```

## Alternative: Use HTM instead of JSX

If you'd like to avoid transpiling JSX, you can use [HTM](https://github.com/developit/htm) instead. HTM is less beautiful than JSX, but it's easier to set up.

```html
<script type="module">
  import {createElement} from "https://unpkg.com/@bikeshaving/crank?module";
  import {renderer} from "https://unpkg.com/@bikeshaving/crank/dom?module";
  import htm from 'https://unpkg.com/htm?module'
  const h = htm.bind(createElement);

  function Greeting({name = "World"}) {
    return h`
      <div>Hello ${name}</div>
    `;
  }

  renderer.render(h`<${Greeting} />`, document.body);
</script>
```

Or, in Node:

```shell
$ npm install htm @bikeshaving/crank
```

```js
const {createElement} = require("@bikeshaving/crank/cjs/index.js");
const {renderer} = require("@bikeshaving/crank/cjs/html.js");
const h = require("htm").bind(createElement);

function Greeting({name = "World"}) {
  return h`
    <div>Hello ${name}</div>
  `;
}

console.log(renderer.render(h`<${Greeting} />`));
```

