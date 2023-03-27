---
id: elements
title: Elements and Renderers
---

**Note:** If you’re familiar with how elements work in React, you may want to skip ahead to [the guide on components](./components). Elements in Crank work almost exactly like they do in React.

## Transpiling JSX
Crank works with [JSX](https://facebook.github.io/jsx/), a well-supported, XML-like syntax extension to JavaScript.

### Two types of JSX transpilation
Historically speaking, there are two ways to transform JSX: the *classic* and *automatic* transforms. Crank supports both formats.

The classic transform turns JSX elements into `createElement()` calls.

```jsx
/** @jsx createElement */
import {createElement} from "@b9g/crank";

const el = <div id="element">An element</div>;
// Transpiles to:

const el = createElement("div", {id: "element"}, "An element");
// Identifiers like `createElement`, `Fragment` must be manually imported.
```

The automatic transform turns JSX elements into function calls from an automatically imported namespace.

```jsx
/** @jsxImportSource @b9g/crank */

const profile = (
  <div>
    <img src="avatar.png" class="profile" />
    <h3>{[user.firstName, user.lastName].join(" ")}</h3>
  </div>
);

// Transpiles to:
import { jsx as _jsx } from "@b9g/crank/jsx-runtime";
import { jsxs as _jsxs } from "@b9g/crank/jsx-runtime";

const profile = _jsxs("div", {
  children: [
    _jsx("img", {
      src: "avatar.png",
      "class": "profile",
    }),
    _jsx("h3", {
      children: [user.firstName, user.lastName].join(" "),
    }),
  ],
});

```

The automatic transform has the benefit of not requiring manual imports.

## Renderers

Crank ships with two renderer subclasses for the two common web development use-cases: one for managing DOM nodes, available through the module `@b9g/crank/dom`, and one for creating HTML strings, available through the module `@b9g/crank/html`. You can use these modules to render interactive user interfaces in the browser and HTML responses on the server.

```jsx
import {renderer as DOMRenderer} from "@b9g/crank/dom";
import {renderer as HTMLRenderer} from "@b9g/crank/html";

const el = <div id="hello">Hello world</div>;
const node = document.createElement("div");
DOMRenderer.render(el, node);
console.log(node.innerHTML); // <div id="element">Hello world</div>

const html = HTMLRenderer.render(el);
console.log(html); // <div id="element">Hello world</div>
```

## The Parts of an Element

<!-- TODO: Make this a JSX element -->
![Image of a JSX element](/static/parts-of-jsx.svg)

An element can be thought of as having three main parts: a *tag*, *props* and *children*. These roughly correspond to the syntax for HTML, and for the most part, you can copy-paste HTML into JSX-flavored JavaScript and have things work as you would expect. The main difference is that JSX has to be well-balanced like XML, so void tags must have a closing slash (`<hr/>` not `<hr>`). Also, if you forget to close an element or mismatch opening and closing tags, the parser will throw an error, whereas HTML can be unbalanced or malformed and mostly still work.

### Tags
Tags are the first part of a JSX element expression, and can be thought of as the “name” or “type” of the element. JSX transpilers pass the tag of an element to the resulting `createElement()` call as its first argument.

```jsx
const intrinsicEl = <div />;
// transpiles to:
const intrinsicEl1 = createElement("div", null);

const componentEl = <Component />;
// transpiles to:
const componentEl1 = createElement(Component, null);
```

By convention, JSX parsers treat lowercase tags (`<br />`) as strings and capitalized tags (`<Break />`) as variables. When a tag is a string, this signifies that the element will be handled by the renderer. We call these types of elements *host* or *intrinsic* elements, and for both of the web renderers, these correspond exactly to actual HTML elements, like `<div>` or `<input>`.

As we’ll see later, elements can also have tags which are functions, in which case the behavior of the element is defined not by the renderer but by the execution of the referenced function. Elements with function tags are called *component elements*.

### Props
JSX transpilers combine the attribute-like `key="value"` syntax to a single object for each element. We call this object the *props* object, short for “properties.”

```jsx
const myClass = "my-class";
const el = <div id="my-id" class={myClass} />;
// transpiles to:
const el1 = createElement("div", {id: "my-id", "class": myClass});

console.log(el.props); // {id: "my-id", "class": "my-class"}
```

The value of each prop is a string if the string-like syntax is used (`key="value"`), or it can be an interpolated JavaScript expression by placing the value in curly brackets (`key={value}`). You can use props to “pass” values into host and component elements, similar to how you “pass” arguments into functions when invoking them.

If you already have an object that you want to use as props, you can use the special JSX `...` syntax to “spread” it into an element. This works similarly to [ES6 spread syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax).

```jsx
const props = {id: "1", src: "https://example.com/image", alt: "An image"};
const el = <img {...props} id="2" />;
// transpiles to:
const el1 = createElement("img", {...props, id: "2"});
```

### Children
As with HTML, Crank elements can have contents, surrounded by opening and closing tags. These contents are referred to as the element’s *children.* Because elements can have children which are also elements, they form a tree of nodes which we call the *element tree*.

```jsx
const list = (
  <ul>
    <li>Element 1</li>
    <li>Element 2</li>
  </ul>
);

// transpiles to:
const list1 = createElement("ul", null,
  createElement("li", null, "Element 1"),
  createElement("li", null, "Element 2"),
);

console.log(list.props.children.length); // 2
```

By default, JSX parsers interpret the contents of elements as strings. So for instance, in the JSX expression `<p>Hello world</p>`, the children of the `<p>` element would be the string `"Hello world"`.

However, just as with prop values, you can use curly brackets to interpolate JavaScript expressions into an element’s children. Besides elements and strings, almost every value in JavaScript can participate in an element tree. Numbers are rendered as strings, and the values `null`, `undefined`, `true` and `false` are erased, allowing you to render things conditionally using boolean expressions.

```jsx
const el = <div>{"a"}{1 + 1}{true}{false}{null}{undefined}</div>;
console.log(el.props.children); // ["a", 2, true, false, null, undefined]
renderer.render(el, document.body);
console.log(document.body.innerHTML); // <div>a2</div>
```

Crank also allows arbitrarily nested iterables of values to be interpolated as children, so, for instance, you can insert arrays or sets of elements into element trees.

```jsx
const arr = [1, 2, 3];
const set = new Set(["a", "b", "c"]);
renderer.render(<div>{arr} {set}</div>, document.body);
console.log(document.body.innerHTML); // "<div>123 abc</div>"
```

## Element Diffing
Crank uses the same “virtual DOM” diffing algorithm made popular by React, where we compare elements by tag and position to reuse DOM nodes. This approach allows you to write declarative code which focuses on producing the right tree, while the framework does the dirty work of mutating the DOM efficiently.

```jsx
renderer.render(
  <div>
    <span>1</span>
  </div>,
  document.body,
);

const div = document.body.firstChild;
const span = document.body.firstChild.firstChild;
renderer.render(
  <div>
    <span>1</span>
    <span>2</span>
  </div>,
  document.body,
);

console.log(document.body.firstChild === div); // true
console.log(document.body.firstChild.firstChild === span); // true
```

**Note:** The documentation tries to avoid the terms “virtual DOM” or “DOM diffing” insofar as the core renderer can be extended to target multiple environments; instead, we use the terms “virtual elements” and “element diffing” to mean mostly the same thing.
