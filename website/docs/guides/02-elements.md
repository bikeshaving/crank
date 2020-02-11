---
id: elements
title: Elements
---
### JSX, Elements and Renderers

> Note for React developers: If you’re familiar with how JSX and elements work in React, you may want to skip ahead to the section on components. JSX and elements in Crank work almost exactly as they do in React.

Crank is best used with [JSX](https://facebook.github.io/jsx/), an XML-based syntax extension to JavaScript. Crank is designed to work with both the Babel and TypeScript parsers out-of-box; all you need to do is enable JSX parsing, import the `createElement` function from Crank, and include a `@jsx` comment directive (`/* @jsx createElement */`). The parser will then transpile JSX into `createElement` calls. For example, in the code below, the JSX expression assigned to `el` desugars to the `createElement` call assigned to `el1`.

```jsx
/* @jsx createElement */
import {createElement} from "@bikeshaving/crank";

const el = <div id="element">An element</div>;
// transpiles to:
const el1 = createElement("div", {id: "element"}, "An element");
```

The `createElement` function returns an *element*, a plain old JavaScript object. Elements on their own don’t do anything special; instead, Crank provides special classes called *renderers* which interpret elements to produce DOM nodes, HTML strings, scene graphs, or whatever else a developer can think of. Crank ships with two renderers for web development, one for creating and updating DOM nodes, available through the module `@bikeshaving/crank/dom`, and one which creating HTML strings, available through the module `@bikeshaving/crank/html`. You can use these modules to render interactive user interfaces on the client and HTML responses on the server.

```jsx
/* @jsx createElement */
import {createElement} from "@bikeshaving/crank";
import {renderer as DOMRenderer} from "@bikeshaving/crank/dom";
import {renderer as HTMLRenderer} from "@bikeshaving/crank/html";

const el = <div id="hello">Hello world</div>;
const node = document.createElement("div");
DOMRenderer.render(el, node);
console.log(node.innerHTML); // <div id="element">Hello world</div>
console.log(HTMLRenderer.renderToString(el)); // <div id="element">Hello world</div>
```

The two renderers have slightly different APIs, with DOM renderers statefully mutating a DOM node which is passed in as the second argument to the `render` method, and HTML renderers turning Crank elements into strings using the `renderToString` method. The exact methods and behaviors of a renderer will vary depending on its specific use-case and environment.

### The parts of an element.

![Image of JSX element](./static/parts-of-jsx.svg)
An element has three main parts, a *tag*, *props* and *children*. These roughly correspond to tags, attributes and content, the parts of an HTML element, and for the most part, you can copy-paste HTML into JavaScript and have things work as you would expect. The main difference is that JSX has to be well-balanced like XML, so void tags must have a closing slash (`<input />` not `<input>`). Also, if you forget to close an element, the parser will throw an error, while HTML can be unbalanced or malformed and still mostly work. The advantage of using JSX is that it allows arbitrary JavaScript expressions to be interpolated into elements as the tag, props or children, allowing you to use syntax which looks like HTML/XML seamlessly within JavaScript.

### Tags
```jsx
const intrinsicEl = <div />;
// transpiles to:
const intrinsicEl1 = createElement("div");

const componentEl = <Component />;
// transpiles to:
const componentEl1 = createElement(Component);
```

By convention, JSX parsers treat lower-cased tags as strings and capitalized tags as variables. When a tag is a string, this signifies that the element will be handled by the renderer. In Crank, we call elements with string tags *intrinsic elements*, and for both of the web renderers, these elements correspond to the actual HTML tags like `div` or `input`. As we’ll see later, elements can also have tags which are functions, in which case the behavior of the element is defined by the execution of the referenced function and not the renderer. These elements are called *component elements*. Insofar as tags can be functions, JSX can be thought of as just another way to invoke a function, except the execution of the function is deferred till rendering. Tags are transpiled to the first argument of the `createElement` call.

### Props
```jsx
const myClass = "my-class";
const el = <div id="my-id" class={myClass} />;
// transpiles to:
const el1 = createElement("div", {id: "my-id", "class": myClass});

console.log(el.props); // {id: "my-id", "class": "my-class"}
```

The attribute-like `key="value"` syntax in JSX is transpiled to a single object literal for each element. We call this object the *props* object, short for “properties,” and for each key, the values of this object are strings if the standard HTML attribute syntax is used (`id="my-id"`) or any interpolated JavaScript value if the value is placed within curly brackets (`id={myId}`). Props are used by both intrinsic and component elements to pass values around; to continue the analogy of JSX being a function invocation, props can be thought of as named arguments passed to each call. The props object is transpiled to the second argument of the transpiled `createElement` call.

### Children
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

As with HTML, Crank elements can have contents, and these contents are referred to as *children*. Insofar as an element can have children which are also elements, elements form a tree of nodes.

```jsx
const el = <div>{"a"}{1 + 1}{true}{false}{null}{undefined}</div>;
console.log(el.props.children); // ["a", 2, true, false, null, undefined]
renderer.render(el, document.body);
console.log(document.body.innerHTML); // <div>a2</div>
```

By default, the contents of JSX are interpreted as strings, but you can use curly brackets just as we did with props to interpolate arbitrary JavaScript expressions into an element’s children. Almost every value in JavaScript can participate in the element tree. Strings and numbers are rendered as text, while the values `null`, `undefined`, `true` and `false` are erased to allow you to render things conditionally. Crank also allows iterables of values to be inserted as well, so, for instance, you can interpolate an array or a set into elements as well.

```jsx
const arr = [1, 2, 3];
const set = new Set(["a", "b", "c"]);
renderer.render(<div>{arr} {set}</div>, document.body);
console.log(document.body.innerHTML); // <div>123 abc</div>
```

## Element diffing
Crank uses the same “virtual DOM” diffing algorithm made popular by React. This allows you to write declarative code which focuses on producing the right element tree, while Crank does the dirty work of managing state and mutating the DOM. The renderer will cache the previous element tree by each DOM element rendered into, so that DOM nodes can be re-used between renders.

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
