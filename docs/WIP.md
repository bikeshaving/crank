# Crank.js
## Installation
Crank is available on [NPM](https://npmjs.org/@bikeshaving/crank) in the ESModule and CommonJS formats.

```
$ npm install @bikeshaving/crank
```

```jsx
/* @jsx createElement */
import {createElement} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";

renderer.render(<div id="hello">Hello world</div>, document.body);
```

If you want to play around with Crank, here’s a Code Sandbox template.

## Basic Usage
### JSX, Elements and Renderers
Crank is best used with [JSX](https://facebook.github.io/jsx/), an XML-based syntax extension to JavaScript. Crank is designed to work with both the Babel and TypeScript parsers out-of-box; all you need to do is enable the parsing of JSX, import the `createElement` function, and reference it via a `@jsx` comment directive (`/* @jsx createElement */`). The parser will then transpile JSX into `createElement` calls. For example, in the code below, the JSX expression assigned to `el` desugars to the `createElement` call assigned to `el1`.

```jsx
/* @jsx createElement */
import {createElement} from "@bikeshaving/crank";

const el = <div id="element">An element</div>;
// transpiles to:
const el1 = createElement("div", {id: "element"}, "An element");
```

The `createElement` function which is called when using JSX returns an *element*, a plain old JavaScript object. Elements on their own don’t do anything special; instead, in Crank, special classes called “renderers” interpret elements to produce DOM nodes, HTML strings, scene graphs, or whatever else a developer can think of. Crank ships with two renderers for web development, one which produces DOM nodes, available through the module `@bikeshaving/crank/dom`, and one which produces HTML strings, available through the module `@bikeshaving/crank/html`. You can use these modules to render interactive user interfaces on the client and HTML strings on the server.

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

The two renderers have slightly different APIs, with DOM renderers statefully mutating a DOM node which is passed as the second argument to its `render` method, and HTML renderers turning Crank elements into strings using a `renderToString` method. The exact methods and behaviors of a renderer will vary depending on its specific use-case. Because elements are just objects, we can re-use the same element across different environments to do different things.

### The parts of an element.

Note for React developers: If you’re familiar with how elements and JSX work in React, you may want to skip ahead to the section on components. Elements and JSX in Crank work almost exactly as they do in React.

![Image of JSX element](#TKTKTK)
An element has three main parts, a *tag*, *props* and *children*. These roughly correspond to tags, attributes and content, the parts of an HTML element, and for the most part, you can copy-paste HTML into JavaScript and have things work as you would expect. The main difference is that JSX has to be well-balanced like XML, so HTML void elements must have a closing slash (`<input />` not `<input>`), and if you forget to close a tag, the JavaScript parser will throw an error, while HTML can be unbalanced or even malformed and still work. The advantage of using JSX is that the syntax allows arbitrary JavaScript expressions to be interpolated into elements as the tag, props or children, allowing you to use elements seamlessly with regular JavaScript code.

### Tags
```jsx
const intrinsicEl = <div />;
// transpiles to:
const intrinsicEl1 = createElement("div");

const componentEl = <Component />;
// transpiles to:
const componentEl1 = createElement(Component);
```

By convention, JSX parsers treat capitalized tags as variables and lower-cased tags as strings. When a tag is a string, this signifies that the element will be handled by the renderer. In Crank, we call elements with string tags *intrinsic elements*, and for both of the web renderers, these elements correspond to all the HTML tags available like `div` or `input`. As we’ll see later, elements can also have tags which are functions, in which case, the behavior of the element is defined by the execution of the referenced function and not the renderer. These elements are called *component elements*.

### Props
```jsx
const myClass = "my-class";
const el = <div id="my-id" class={myClass} />;
// transpiles to:
const el1 = createElement("div", {id: "my-id", "class": myClass});

console.log(el.props); // {id: "my-id", "class": "my-class"}
```

The attribute-like `key="value"` syntax in JSX is transpiled to a single object literal for each element. We call this object the “props” object, short for “properties.” The values of this object are strings if the standard HTML attribute syntax is used (`id="my-id"`) or any JavaScript expression if placed within curly brackets (`id={myId}`). Props are used by both intrinsic and component elements to pass values around.

### Children
```jsx
const list = (
  <ul>
    <li>Element 1</li>
    <li>Element 2</li>
  </ul>
);
// transpiles to:
const list1 = createElement("ul", null, [
  createElement("li", null, "Element 1"),
  createElement("li", null, "Element 2"),
]);
console.log(list.props.children.length); // 2
```

As with HTML, Crank elements can have contents, and these contents are referred to as *children*. Insofar as an element can have children which are also elements, elements form a virtual tree of nodes. Renderers will then walk this tree in the course of rendering to produce values.

Similar to props, you can use curly brackets to interpolate arbitrary JavaScript expressions into an element’s children. JSX passes each child to the `createElement` function, and Crank will in turn collect each child in a special prop named `children`.

```jsx
const el = <div>{"a"}{1 + 1}{true}{false}{null}{undefined}</div>;
console.log(el.props.children); // ["a", 2, true, false, null, undefined]
renderer.render(el, document.body);
console.log(document.body.innerHTML); // <div>a2</div>
```

Almost every value in JavaScript can participate in the element tree and be interpreted by renderers. Strings and numbers are rendered as text, while the values `null`, `undefined`, `true` and `false` are erased to allow you to render things conditionally. Crank also allows iterables of values to be inserted as well, so, for instance, you can interpolate an array or a set into elements as well.

```jsx
const arr = [1, 2, 3];
const set = new Set(["a", "b", "c"]);
renderer.render(<div>{arr} {set}</div>, document.body);
console.log(document.body.innerHTML); // <div>123 abc</div>
```

## Element diffing
Crank uses the same “virtual DOM” diffing algorithm made popular by React. This allows you to write declarative code which focuses on producing the right element tree with the right props and children, while Crank renderers do the dirty work of mutating the DOM. When a tree of elements is updated, each child of an element is checked against the child which was previously rendered in that same “slot.” If an old and new element rendered to the same slot have tags which match, the DOM nodes which that element represents is updated in place, while if the tags don’t match, the renderer will blow away the node and any children and start afresh. This is done recursively for every element in the tree, making it easy to manage a stateful tree of DOM nodes in a declarative manner. To do this at the top level, stateful renderers like the DOM renderer store the previously rendered tree for each DOM node which was rendered into using `renderer.render`.

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

## Components
So far, we’ve only rendered intrinsic elements directly, but eventually, we will want to group parts of this element tree into reusable “components.” In Crank, all components are functions which take props and produce elements; there is no class-based interface. These functions are called by referencing them as the tags of elements which are then rendered.

### Function Components
```js
function Greeting ({name}) {
  return <div>Hello, {name}</div>;
}

renderer.render(<Greeting name="Andrew" />, document.body);
console.log(document.body.innerHTML); // <div>Hello Andrew</div>
```

The simplest kind of component you can write is a *synchronous function component*. When the renderer renders a component element, the tag function is called with the props object of the element as its first argument, and the return value, usually an element, is recursively walked by the renderer.

As seen in the example above, you can use [object destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#Object_destructuring) on the props parameter for convenience. Additionally, you can assign default values to each prop using JavaScript’s default value syntax:

```js
function Greeting ({name="Nemo"}) {
  return <div>Hello, {name}</div>;
}

renderer.render(<Greeting />, document.body);
// <div>Hello Nemo</div>
```

Component elements can take children just like intrinsic elements can. The `createElement` function will add children to props under the property named `children`, and it is up to the component to place the passed-in children somewhere in the returned element tree. If you don’t use the `children` prop, the `children` passed in will not be rendered.

```js
function Greeting ({name="Nemo", children}) {
  return (
    <div>
      Message for {name}: {children}
    </div>
  );
}

renderer.render(
  <Greeting>
    <span>Howdy!</span>
  </Greeting>,
  document.body,
);

console.log(document.body.innerHTML); // <div>Message for Nemo: <span>Howdy</span></div>
```

## Generator Components
Eventually, you’re going to want to create components with local state. In Crank, we use [generator functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*) to do so.

```jsx
function *Counter () {
  let count = 0;
  while (true) {
    count++;
    yield (
      <div>
        You have updated this component {count} {count === 1 ? "time" : "times"}
      </div>
    );
  }
}

renderer.render(<Counter />, document.body);
console.log(document.body.innerHTML);
// <div>You have updated this component 1 time</div>
renderer.render(<Counter />, document.body);
console.log(document.body.innerHTML);
// <div>You have updated this component 2 times</div>
renderer.render(<Counter />, document.body);
renderer.render(<Counter />, document.body);
renderer.render(<Counter />, document.body);
console.log(document.body.innerHTML);
// <div>You have updated this component 5 times</div>
```

Because we’re now yielding elements rather than returning them, we can make components stateful using local variables. Every time the component is updated, Crank steps through the generator once, pausing after the next `yield`. The yielded expressions, usually elements, are then walked and recursively rendered by the renderer.

### The `this` keyword.
So far, we’ve only seen a stateful component whose local state updates when it is rerendered, but you may want to write components which update themselves. Crank allows components to control themselves by passing in a custom class called a “context” as the `this` keyword of each component. Contexts provide several utility methods, but the most important is `this.refresh`, which tells the renderer to update the component again. For generator components, this means that the renderer will resume the generator so it can yield another value.

```jsx
function *Timer () {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);

  try {
    while (true) {
      yield (
        <div>Seconds elapsed: {seconds}</div>
      );
    }
  } finally {
    clearInterval(interval);
  }
}
```

This `Timer` component is similar to the `Counter` one, except now the state (the local variable `seconds`) is updated in the callback passed to `setInterval`, rather than when the component is updated. `this.refresh` is also called to ensure that the outer generator is stepped through, so that the rendered DOM actually reflects the updated state.

### Cleanup with `try`/`finally`
One important detail about the `Timer` example is that it cleans up after itself, `clearInterval` is called in `finally` block so that the `setInterval` callback doesn’t continue to run after the component is removed. Crank will return the generator object returned by the generator function, so when the component is removed from a rendered element tree, the finally branch above executes and `clearInterval` is called. In this way, you can use the natural lifecycle of a generator to write setup and teardown logic for components, all within the same variable scope.

### Prop updates
The generator components we’ve seen so far haven’t used the props object like we’ve seen with regular function components, but they can accept props as well.

```jsx
function *LabeledCounter ({message}) {
  let count = 0;
  while (true) {
    count++;
    yield <div>{message} {count}</div>;
  }
}
renderer.render(<LabeledCounter message="The count is now:" />, document.body);
console.log(document.body.innerHTML); // <div>The count is now: 1</div>
renderer.render(<LabeledCounter message="The count is now:" />, document.body);
console.log(document.body.innerHTML); // <div>The count is now: 2</div>
renderer.render(<LabeledCounter message="What if I update the message:" />, document.body);
console.log(document.body.innerHTML); // <div>The count is now: 3</div>
// WOOPS!
```

This mostly works, except we have a probable bug where the component kept yielding the initial message even though a new message was passed in. In generator components, we can make sure props are up to date by iterating over the `this` object:

```jsx
function *Counter ({message}) {
  let count = 0;
  for ({message} of this) {
    count++;
    yield (
      <div>{message} {count}</div>
    );
  }
}

renderer.render(<Counter message="The count is now:" />, document.body);
console.log(document.body.innerHTML); // <div>The count is now: 1</div>
renderer.render(<Counter message="What if I update the message:" />, document.body);
console.log(document.body.innerHTML); // <div>What if I update the message: 2</div>
```

By replacing the `while (true)` loop with a `for…of` loop which iterates over the `this` object, you can get the latest props passed to the generator. The generator should `yield` once per iteration of `this` in response to new props.

One Crank idiom we see in the above example is reusing and overwriting the variables declared via the generator’s parameters. In the component, `message` is declared in the destructuring of props at the top of the generator function and then reassigned by the `for` loop’s expression, so it is always in sync with the current props passed to the component. However, there is no reason you have to always overwrite props in the `for` expression, so one thing you can do is assign new props to a different variable and compare them against the old props.

```jsx
function *Greeting ({name}) {
  yield <div>Hello {name}</div>;
  for (const {name: newName} of this) {
    if (name !== newName) {
      yield (
        <div>Goodbye {name} and hello {newName}</div>
      );
    } else {
      yield <div>Hello again {newName}</div>;
    }

    name = newName;
  }
}

renderer.render(<Greeting name="Alice" />, document.body);
console.log(document.body.innerHTML);
// <div>Hello Alice</div>
renderer.render(<Greeting name="Alice" />, document.body);
console.log(document.body.innerHTML);
// <div>Hello again Alice</div>
renderer.render(<Greeting name="Bob" />, document.body);
console.log(document.body.innerHTML);
// <div>Goodbye Alice and hello Bob</div>
renderer.render(<Greeting name="Bob" />, document.body);
console.log(document.body.innerHTML);
// <div>Hello again Bob</div>
```

The fact that state is just local variables allows us to blur the lines between props and state, in a way that is easy to understand and without verbose lifecycle methods like `componentWillReceiveProps` from React. With generator functions and `for` loops, comparing old and new props is as easy as comparing adjacent elements of an array.

## Interactive components with event listeners
Components produce elements, which are in turn rendered to DOM nodes. Most applications require event listeners to be attached to these nodes so that application state can be updated according to user input. To facilitate this, the Crank context implements the same `EventTarget` interface used by the DOM, and automatically registers and tears down these listeners as elements are rendered and removed. By combining event listeners with local variables and the `this.refresh` method, you can write interactive components.

```jsx
function *Clicker () {
  let count = 0;
  this.addEventListener("click", () => {
    count++;
    this.refresh();
  });

  while (true) {
    yield (
      <button>I have been clicked {count} times</button>
    );
  }
}

```

`this.addEventListener` adds and removes event listeners to the underlying nodes as they’re rendered, and removes all event listeners when the component is unrendered. The event listeners are only attached to top-level node or the nodes which each component renders, so if you want to listen to events on a nested node, you must use event delegation:

```jsx
function *Clicker () {
  let count = 0;
  this.addEventListener("click", (ev) => {
    if (ev.tagName === "BUTTON") {
      count++;
      this.refresh();
    }
  });

  while (true) {
    yield (
      <div>
        The button has been clicked {count} {count === 1 ? "time" : "times"}.
        <button>Click me</button>
      </div>
    );
  }
}
```

Because the event listener is attached to the outer `div`, we have to filter events by `ev.target.tagName` to make sure we’re not incrementing `count` based on clicks which don’t target the button.

### Event listeners and sync function components
You can also add event listeners to regular function components, but because function components are stateless, it doesn’t really make sense to update the component using `this.refresh`. However, one important use-case for adding event listeners to function components is to listen for events and then bubble custom events to parents using `this.dispatchEvent`.

```jsx
function MyButton ({props}) {
  this.addEventListener("click", () => {
    this.dispatchEvent(new CustomEvent("custombutton.click", {
      bubbles: true,
      detail: {id: props.id},
    }));
  });

  return (
    <button {...props} />
  );
}

function *MyApp () {
  let lastId;
  this.addEventListener("custombutton.click", (ev) => {
    lastId = ev.detail.id;
    this.refresh();
  });
  while (true) {
    yield (
      <div>
        <MyButton id="button1">Button 1</MyButton>
        <MyButton id="button2">Button 2</MyButton>
        <MyButton id="button3">Button 3</MyButton>
        <div>Last pressed id: {lastId == null ? "N/A" : lastId}</div>
      </div>
    );
  }
}
```

`MyButton` is a custom button which bubbles a custom event whose type is `"custombutton.click"` with the `id` of the button as the `detail` of the event whenever the button is clicked. This event is not bubbled to parent DOM nodes but to parent component contexts, and in the example it propagates to the component context of `MyApp`. Using custom events and event bubbling allows you to encapsulate state transitions within parent components, without resorting to complicated state management solutions like `Redux` or `Vuex`.

### Accessing rendered values
Sometimes, the declarative rendering of DOM nodes is not enough, and you’ll want to access the actual DOM nodes you’ve rendered, to call imperative methods like `el.focus()`, for instance. To facilitate this, Crank will pass rendered DOM nodes back into the generator, so `yield` expressions can themselves be read or assigned to variables to access the rendered DOM nodes. The followig component is focused whenever it is updated (though not for the first render).

```jsx
function *MyInput (props) {
  let input;
  input = yield <input {...props}/>;
  for (props of this) {
    input.focus();
    input = yield <input {...props}/>;
  }
}
```

### Catching errors from child components

### The power of local variables
As you can see, Crank leverages local variables within generators instead of requiring separate concepts like `state` and `refs` from React. If you add in event listeners and the natural lifecycle provided by generator functions, you can replicate pretty much every feature which would have been normally handled with classes, hooks, decorators, proxies, compilers or whatever other  mechanisms framework developers concoct to represent stateful components. In a sense, Crank is almost like a throwback to the early days of JavaScript, when we used global variables and event listeners to add interactivity to relatively static pages. Because generator functions provide their own scope, this pattern can now be done locally within a generator. 

## Special Props and Tags
The element diffing algorithm used by Crank is both efficient and allows you to declare updates to complex stateful tree declaratively. However, there are times when you might want to tweak the way rendering works by moving nodes, rendering multiple elements into the same node without a parent, rendering into multiple nodes, or preventing children from being updated. Crank provides one special prop `crank-key` and three special element tags called `Fragment`, `Portal` and `Copy`, to allow you to do this declaratively.

### `crank-key`
By default, Crank will use the element diffing algorithm by tag to determine if a newly rendered element represents an update or a new element. Because elements often represent stateful DOM nodes or components, it can be useful to “key” the children of an element, to hint to renderers that an element has added, moved or removed. In Crank, we do this with the special prop `crank-key`:

```jsx
let nextId = 0;
function *ID() {
  const id = nextId++;
  while (true) {
    yield <span>Id: {id}</span>;
  }
}

renderer.render(
  <div>
    <ID crank-key="a" />
    <ID crank-key="b" />
    <ID crank-key="c" />
  </div>,
  document.body,
);
console.log(document.body.innerHTML);
//<div><span>Id: 1</span><span>Id: 2</span><span>Id: 3</span><div>

renderer.render(
  <div>
    <ID crank-key="c" />
    <ID crank-key="b" />
    <ID crank-key="a" />
  </div>,
  document.body,
);

console.log(document.body.innerHTML);
//<div><span>Id: 3</span><span>Id: 2</span><span>Id: 1</span><div>
```

Keys are scoped by element. When rendering iterables, it’s useful to key elements of the iterable, in case elements are added, removed, or rearranged.

```jsx
function *Shuffler() {
  let nextId = 0;
  const els = [];
  while (true) {
    const id = nextId++;
    els.push(<span id={"el" + id} crank-key={id} />);
    yield <div>{els}</div>;
    els.reverse();
  }
}

renderer.render(<Shuffler />, document.body);
console.log(document.body.innerHTML);
// "<div><span id="el0"></span></div>";

const el0 = document.getElementById("el0");

renderer.render(<Shuffler />, document.body);
console.log(document.body.innerHTML);
// "<div><span id="el0"></span><span id="el1"></span></div>";

renderer.render(<Shuffler />, document.body);
console.log(document.body.innerHTML);
// "<div><span id="el2"></span><span id="el1"></span><span id="el0"></span></div>";

console.log(document.getElementById("el0") === el0); // true
```

## Special Tags
Crank implements a couple special element tags which have special meaning when rendering to the DOM. Under the hood, these tags are symbols and behave similarly to string tags, except they affect the way element diffing and rendering works.

### Fragment
Crank has a special `Fragment` element tag which allows you to render multiple siblings into a parent without wrapping the siblings in another DOM node. Under the hood, iterables which appear in an element tree are actually implicitly wrapped in a `Fragment` element by the renderer.

```jsx
/* @jsx createElement */
import {createElement, Fragment} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";
function Siblings() {
  return (
    <Fragment>
      <div>Sibling 1</div>
      <div>Sibling 2</div>
    </Fragment>
  );
}

renderer.render(<Siblings />, document.body);
console.log(document.body.innerHTML); // <div>Sibling 1</div><div>Sibling 2</div>
```

### Portal
Sometimes you may want to render into multiple DOM nodes from the same component tree. You can do this with the `Portal` tag, passing in a DOM node via the `root` prop. The `Portal`’s children will be rendered into the root by passing a prop. This is useful when writing modals or working with pages where you need to render into multiple entry-points. `renderer.render` actually wraps its first argument in an implicit `Portal` element if the value is not a `Portal` element already. Events dispatched from a Portal’s children via `this.dispatchEvent` will still bubble into parent components.

```jsx
/* @jsx createElement */
import {createElement, Portal} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";
const root1 = document.createElement("div");
const root2 = document.createElement("div");
function MyComponent() {
  return (
    <div>
      <div>This div is rendered into root1</div>
      <Portal root={root2}>
        <div>This div is rendered into root2</div>
      </Portal>
    </div>
  );
}
renderer.render(<MyComponent />, root1);
console.log(root1.innerHTML);
// "<div><div>This div is rendered into root1</div></div>"
console.log(root2.innerHTML);
// "<div>This div is rendered into root2</div>"
```

### Copy
It‘s often fine to rerender Crank components, because elements are diffed, persistent between renders, and unnecessary mutations are avoided. However, sometimes you might want to prevent a child from updating when the parent rerenders, perhaps because a certain prop hasn’t changed, or perhaps because you want to batch updates from the parent. To do this, you can use the `Copy` tag to indicate to Crank that you don’t want to update a previously rendered element or any of its children.

TODO: Show an example

### Asynchronous Components
So far, every component we’ve seen has worked synchronusly, and Crank will respect this as a decision made by the developer by rendering these components synchronously. However, modern JavaScript includes promises and `async`/`await`, allowing developers to use async code. Crank therefore allows components to be asynchronous functions as well.

```jsx
async function IPAddress () {
  const res = await fetch("https://api.ipify.org");
  const address = await res.text();
  return <div>Your IP Address: {address}</div>;
}

(async () => {
  await renderer.render(<IPAddress />, document.body);
})();
```

When a Crank renderer runs a component which returns a promise, rendering becomes asynchronous as well, and the renderer returns a promise which fulfills when all children have recursively fulfilled. This means renderer.render itself will return a promise which fulfills when all child components have fulfilled.

### Concurrent updates to async components
Renderers and parent components don’t have to await pending async components, they can rerender components concurrently, so Crank implements a couple rules to make concurrent updates to async components predictable.

1. There can only be one pending run of an element per slot at a time.
2. If a component is updated concurrently, another update is enqueued with the latest props.

```jsx
async function Delay ({message}) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return <div>{message}</div>;
}

(async () => {
  const p1 = renderer.render(<Delay message="Run 1">, document.body);
  console.log(document.body.innerHTML); // ""
  await p1;
  console.log(document.body.innerHTML); // "Run 1"
  const p2 = renderer.render(<Delay message="Run 2" />, document.body);
  const p3 = renderer.render(<Delay message="Run 3" />, document.body);
  const p4 = renderer.render(<Delay message="Run 4" />, document.body);
  console.log(document.body.innerHTML); // "Run 1"
  await p2;
  console.log(document.body.innerHTML); // "Run 2"
  await p3;
  console.log(document.body.innerHTML); // "Run 4"
  await p4;
  console.log(document.body.innerHTML); // "Run 4"
})();
```

As you can see, by the time the third render (`p3`) fulfills, the fourth rendering has taken effect. This is because components only use the latest of enqueued updates when rerendering, other pending updates are simply dropped.

3. If a different component is rendered into a slot with a pending component run, the components will race. If the earlier rendered component wins, it shows until the latest component run fulfills. If the later component wins the race, the earlier component will never be rendered.

```jsx
async function Slow () {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return <span>Slow</span>;
}

async function Fast () {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return <span>Fast</span>;
}

(async () => {
  const p1 = renderer.render(<div><Fast /></div>, document.body);
  const p2 = renderer.render(<div><Slow /></div>, document.body);
  await p1;
  console.log(document.body.innerHTML); // <div><span>Fast</span></div>
  await p2;
  console.log(document.body.innerHTML); // <div><span>Slow</span></div>
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log(document.body.innerHTML); // <div><span>Slow</span></div>
})();

(async () => {
  const p1 = renderer.render(<div><Slow /></div>, document.body);
  const p2 = renderer.render(<div><Fast /></div>, document.body);
  await p1;
  console.log(document.body.innerHTML); // <div><span>Fast</span></div>
  await p2;
  console.log(document.body.innerHTML); // <div><span>Fast</span></div>
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log(document.body.innerHTML); // <div><span>Fast</span></div>
})();
```

### Async components and children
When Crank encounters an async component in the render tree, the entire rendering process also becomes asynchronous. Parent components also become asynchronous, depending on the kind of component. Synchronous function components will transparently pass updates along to async components, so that when a renderer updates a synchronous component with async children concurrently, that async component will be called as if it was being rendered directly.

On the other hand, synchronous generator components which yield async elements will not resume until those async elements have fulfilled. This is because synchronous generators expect to be resumed after their children have rendered, and the actual DOM nodes which are rendered are passed back into the generator, but we wouldn’t have those available if the generator was concurrently resumed before the async children had fulfilled.

### Async generator functions and loading states
The async components we’ve seen so far have been all or nothing, in the sense that the renderer cannot show anything until all components in the tree have fulfilled. This can be a problem when you have an async call which takes longer than expected; it would be nice if parts of the element tree could be shown without waiting, and if components which have yet to fulfill could be replaced with a spinner.

Just as you can write stateful components with synchronous generator syntax, you can also write stateful async components with async generator syntax.

```jsx
async function *AsyncLabeledCounter ({message}) { 
  let count = 0;
  for await ({message} of this) {
    yield <div>Loading...</div>;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    count++;
    yield <div>{message} {count}</div>;
  }
}
(async () => {
  await renderer.render(
    <AsyncLabeledCounter message="The count is now: " />,
    document.body,
  );
  console.log(document.body.innerHTML); //<div>Loading...</div>
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log(document.body.innerHTML); //<div>The count is now: 1</div>
  await renderer.render(
    <AsyncLabeledCounter message="The count is now: " />,
    document.body,
  );
  console.log(document.body.innerHTML); //<div>Loading...</div>
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log(document.body.innerHTML); //<div>The count is now: 2</div>
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log(document.body.innerHTML); //<div>The count is now: 2</div>
})();
```

`AsyncLabeledCounter` is an async version of the `LabeledCounter` example introduced earlier, and demonstrates several key differences between sync generator components and async generator components. First, rather than using `while` or `for…of` loops, we now use a `for await…of` loop. This is possible because Crank contexts are async iterable of props, just as they are iterables of props. Second, you’ll notice that the async generators yield multiple times per iteration over `this`. While this is possible for sync generators, it wouldn’t necessarily make sense to do so because generators suspend at each yield, and upon resuming the props would be stale. In contrast, async generator components continuously resume after yielding. This explains why we don’t really use a `while` loop in an async generator function, we have to use a `for await…of` loop so the async generator can pause at the bottom of the loop. As we can see, this allows us to yield loading indicators before awaiting a promise.

### Responsive Loading Indicators
Much has been written about loading indicators, and how we shouldn’t show them immediately because showing too many of them when the UI loads quickly can paradoxically make your UI seem less responsive. In Crank, we can use the async rules described for async functions above along with async generator functions to show loading indicators which wait a bit before showing.

```jsx
async function Fallback ({wait = 1000, children}) {
  await new Promise((resolve) => setTimeout(resolve, wait));
  return <Fragment>{children}</Fragment>;
}

async function *Suspense ({fallback, children}) {
  for await ({fallback, children} of this) {
    yield <Fallback>{fallback}</Fallback>;
    yield <Fragment>{children}</Fragment>;
  }
}

async function RandomDog ({throttle=false}) {
  if (throttle) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const res = await fetch("https://dog.ceo/api/breeds/image/random");
  const data = await res.json();
  return (
    <a href={data.message}>
      <img src={data.message} width="250" />
    </a>
  );
}

function *RandomDogs () {
  let throttle = false;
  this.addEventListener("click", (ev) => {
    if (ev.target.tagName === "BUTTON") {
      throttle = !throttle;
      this.refresh();
    }
  });

  while (true) {
    yield (
      <Fragment>
        <button>Show me another dog.</button>
        <Suspense fallback={<div>Fetching a good boy…</div>}>
          <RandomDog throttle={throttle} />
        </Suspense>
      </Fragment>
    );
  }
}
```
The above example shows how we could implement Suspense, a proposed custom React element which allows async components with fallback states. As you can see, in Crank, no special tags are needed, and the functionality to write async components is all available to the user. Best of all, we don’t need any special APIs, we can use `async`/`await` directly in our components.

## Custom Renderers
⚠️ Docs coming soon ⚠️

## Differences from React
Though Crank is very much inspired by and similar to React, exact compatibility is a non-goal, and we’ve used this as opportunity to “fix” a lot of pain points with React which bothered us over the years. The following is a list of differences with React, as well as justifications for why we chose to implement features differently.

- No Component class, no hooks.
  Crank uses generator functions, 
- No `setState` or `useState`
  React has always tightly coupled component updates with state updates. Because Crank uses generator functions, state is just local variables which is modified by local functions, and the developer can call `this.refresh()` to update the UI to match state.
- No `Suspense`
  The project known as React `Suspense` is unsound and likely a huge boondoggle. It relies on the unusual mechanism of throwing promises, requires a caching mechanism, is difficult to reason about. By leveraging async functions and async function generators, Crank allows you to implement the `Suspense` element in user-space. No argument from the React team about the necessity of `Suspense` will ever justify it over the developer convenience provided by being able to use the `await` operator in components. 
- JSX looks like HTML.
  - `for` not `htmlFor`, `class` not `className`
  Crank does not place any restrictions on the names of JSX props. This means that you can write JSX like `<label class="my-label" for="my-id">Label</label>`.
  - style can be a `cssText` string, style object uses snake-case, units are not added automagically `px`.
- No “controlled”/“uncontrolled” components. Crank uses event targets .
- No `dangerouslySetInnerHTML={{__html}}` props.
  Just use the `innerHTML` prop. React doesn’t do anything to make setting `innerHTML` safe; they just make you type more and search for the exact spelling of `dangerouslySetInnerHTML` every month or so.
  - Fragments can have `innerHTML`. Fragment behavior can be overridden by renderers, and both the DOM and HTML renderers allow fragments to accept an innerHTML prop, allowing arbitrarily HTML to be written without a parent.
  - Portals are just elements. Their behavior is defined by renderers, and all element trees are wrapped implicitly or explicitly in a root portal. For DOM and HTML renderers
- No event handler props
  Event handler props in React are terrible for the following reasons:
  - The EventTarget API takes more than just a single function, it also takes options which allow you to register event listeners in the `capture` phase, register `passive` listeners, or register event listeners `once`. React has attempted to allow event handlers to be registered in the capture phase by adding props like `onClickCapture` or whatever, but embedding all these options in the prop name would be madness (`onClickCaptureOncePassive`). 
  - Stop doxxing event listeners. Event listeners are difficult to name and make the most sense as anonymous functions which are made meaningful by the event listener type. React developers often adopt a naming scheme to cache event listeners on component instances like `this.handleClick` to avoid `PureComponent` or `componentDidUpdate` de-optimizations. If they only had to be defined once, we wouldn’t have to do this. Generator functions naturally allow components to define anonymous event listeners once when the component mounts, and the event target API provided by Crank automatically unregisters these listeners when components are thrown away. This means you never have to reason about when these functions are redefined or what their capturing with their closures.
  - Custom events are events, and they can be prevented or bubbled like regular DOM events.
    When attempting to define custom event handler props in React, typically React developers mimick the component props API and allow callbacks to be passed into the component, which the component author will then call directly when they want to trigger the event. This is a painful to do, because you often have to make sure the callback is defined on props, because they are usually optional, and then React developers will also arbitrarily pass data to the callback which is not an event, making custom `onWhatever` props disanalogous with DOM event props, because DOM event props call callbacks with a (virtual) event. There is no standard for what event callbacks are called with in React, and there is no way for components to allow parents to prevent default behavior by calling `ev.preventDefault` as you would with a regular DOM event. Worst of all, these props must be passed directly from parent to child, so if a component wants to listen to an event in a deeply nested component, event handlers must either be passed using contexts, or passed explicitly through each component layer, and must be named and make sense for each nested API.
    Crank avoids this sitution by mimicking the DOM EventTarget API, and allowing developers to create and bubble real `Event` or `CustomEvent` objects with `this.dispatchEvent`. These events can be namespaced, typed, and components can allow parents to cancel events to allow for controlled/uncontrolled behavior.
- No refs
  React’s `ref` API has undergone multiple revisions over the years and it’s only gotten more confusing/difficult to use. Crank passes rendered DOM nodes and strings back into generator functions, so you can access them by reading the result of `yield` expressions in generators. You can assign these “refs” to local variables and treat them as you would any local variable without worry.
- Children can contain any kind of iterable, not just arrays.
  There’s no reason to restrict children in Crank to just arrays. You can interpolate ES6 Maps, Sets or any other user-defined iterable into your Crank elements, and Crank will simply render them in an implicit `Fragment`.
- Keys
  - key has been named to `crank-key`.
    In React, the `key` prop is special and erased from the props visible to components. Insofar as `key` is a common word, Crank namespaces `key` as `crank-key`. Almost all special props and events in Crank are namespaced to avoid collisions with web components or user code.
  - The elements of iterables don’t require unique keys.
    Pestering the user to add unique keys to every element of an array is not something Crank will ever do, insofar as most of the time, developers just set the `key` to an `index` into the array. If the developer needs state to be preserved. Additionally, duplicate keys are simply erased. If the developer needs state to be preserved between updates, between elements which are dynamic or move around, they will discover this in the course of normal development.
- No render props
  Crank strongly discourages the React idiom of passing a function as children (or any other prop for that matter. “Render props” produce ugly and non-sensical syntax, and were a direct response to the lack of composability of React class components. Most if not all “render prop” patterns are easier to implement in Crank with the use of higher-order components which are passed component functions and produce elements based on the props passed in.
- Contexts
  A feature equivalent to React Contexts is planned but not yet implemented.

## TypeScript
Crank is written in TypeScript and exports several types to help you write strongly-typed components.
TODO: document how to use crank with TypeScript.

## API Reference
TODO: document this
### `createElement`
### `Element`
### `Context` (the `this` object passed to components)
### `Child`
### `DOMRenderer`
### `HTMLRenderer`
