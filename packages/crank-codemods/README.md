# @b9g/crank-codemods

> **Note:** This package is unpublished and a work in progress. The API may change without notice.

Codemods for converting between Crank.js JSX syntax and tagged template syntax.

## Usage

### jscodeshift CLI

```bash
jscodeshift -t node_modules/@b9g/crank-codemods/dist/jsx-to-template.js src/
jscodeshift -t node_modules/@b9g/crank-codemods/dist/template-to-jsx.js src/
```

### Programmatic

```ts
import {jsxToTemplate, templateToJSX} from "@b9g/crank-codemods";

const template = jsxToTemplate('<div>Hello {name}</div>');
const jsx = templateToJSX('jsx`<div>Hello ${name}</div>`');
```
