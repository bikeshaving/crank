---
title: Getting Started
---

## Installation
Crank is available on [NPM](https://npmjs.org/@bikeshaving/crank) in the ESModule and CommonJS formats.

```shell
$ npm install @b9g/crank
```

```jsx
/** @jsx createElement */
import {createElement} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";

renderer.render(<div id="hello">Hello world</div>, document.body);
```

## Scaffolding
