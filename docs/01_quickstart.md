## Installation

Crank is available on npm in the ESModule and CommonJS formats.
```
$ npm install @bikeshaving/crank
```

```
$ yarn add @bikeshaving/crank
```

## JSX
Crank is best used with [JSX](https://facebook.github.io/jsx/) syntax and is designed to work with both the Babel and TypeScript parsers out of the box.

To get JSX to work with Crank, you must import the `createElement` function and reference the function via the `@jsx` comment directive. The parser will then transpile XML-syntax into `createElement` calls.

```jsx
/* @jsx createElement */
import {createElement} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";

renderer.render(<div id="hello">Hello world</div>, document.body);
```

## Parts of a JSX call
- Differences with HTML

## Renderers and Elements
- Crank ships with two renderers:
  - DOM
  - HTML
- Elements are plain-old-javascript objects
- Intrinsic elements
- Behavior of children
  - strings
  - booleans
  - elements
- Element-diffing and commits???

## Simple Components
- Props
- Contexts
- Event handlers

## Stateful Components
- Generator components
- yield vs return
- Contexts are iterable
- `ctx.refresh()`
- Local state as variables
- Updates to props
- Accessing the rendered DOM nodes (refs)
- `try`/`catch`/`finally` for unmounting components and handling errors.

## Async Components
- Async Function Components
- Discuss how renderer.render becomes async
- Racing multiple components.
- Discuss how commits work with async components
- Async Generator Components
- Contexts are async iterable
- Discuss the difference between how generator components vs async generator components resume
- Suspense example

## Special Tags
- Fragment
- Portal
- Copy
  - Implementing pure components

## Custom Renderers
- Environments
- How committing works (post-order tree traversal)

## Differences from React
- Not compatible with React
- for not htmlFor, class not className
- style uses cssText, style object uses snake-case, units are not added automagically `px`
- No dangerouslySetInnerHTML={{__html: ""}}, just use innerHTML
  - Fragments can have innerHTML
- No default values for inputs
- No event handler props
- No refs
- Children can contain any kind of iterable, not just arrays.
- key becomes crank-key
  - array elements don’t need keys
