# Crank.js
A JavaScript framework for writing JSX-driven components with functions, generators and promises.

I wrote a blog post describing the motivations and journey behind making Crank [here](#TKTKTK). Crank is in an early beta, and some APIs may be changed.

## Features
### JSX-based elements
Crank uses the same JSX syntax and element diffing algorithm popularized by React, so you can write declarative code which looks like HTML directly in your JavaScript. The portability of elements means you can reuse the same code to render DOM nodes on the client and HTML strings on the server.

### Components as functions and generators
Crank uses functions and generators for components exclusively. No fancy classes, hooks, proxies or template languages are needed, and you can take advantage of the natural lifecycle of generators to write stateful setup, update and teardown logic all in the same scope.

### Promises today
Crank provides first-class support for promises by allowing components to be defined as async functions and generators. You can `await` the rendering of async components just like any other async function, and you can even race renderings to create user interfaces with deferred loading states.


## Getting Started
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

If your environment does not support ESModules (you’ll probably see a message like `SyntaxError: Unexpected token export`), you can import the CommonJS versions of the library like so:

```jsx
/* @jsx createElement */
import {createElement} from "@bikeshaving/crank/cjs";
import {renderer} from "@bikeshaving/crank/cjs/dom";

renderer.render(<div id="hello">Hello world</div>, document.body);
```

## Key Examples
### A Simple Component
```jsx
/* @jsx createElement */
import {createElement} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";

function Greeting ({name = "World"}) {
  return (
    <div>Hello {name}</div>
  );
}

renderer.render(<Greeting />, document.getElementById("app"));
```

[Try on CodeSandbox](https://codesandbox.io/s/a-simple-crank-component-gnknz)

### A Stateful Component
```jsx
/* @jsx createElement */
import {createElement} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";

function *Timer () {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);
  try {
    while (true) {
      yield <div>Seconds: {seconds}</div>;
    }
  } finally {
    clearInterval(interval);
  }
}

renderer.render(<Timer />, document.getElementById("app"));
```

[Try on CodeSandbox](https://codesandbox.io/s/a-stateful-crank-component-hh8zx)

### An Async Component
```jsx
/* @jsx createElement */
import {createElement} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";

async function IPAddress () {
  const res = await fetch("https://api.ipify.org");
  const address = await res.text();
  return <div>Your IP Address: {address}</div>;
}

renderer.render(<IPAddress />, document.getElementById("app"));
```

[Try on CodeSandbox](https://codesandbox.io/s/an-async-crank-component-ru02q)

### A Loading Component

```jsx
/* @jsx createElement */
import {createElement} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";

async function Fallback ({wait = 1000, children}) {
  await new Promise((resolve) => setTimeout(resolve, wait));
  return <Fragment>{children}</Fragment>;
}

async function *Suspense () {
  for await (const {fallback, children} of this) {
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
      <img src={data.message} alt="A Random Dog" width="300" />
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
        <div>
          <button>Show me another dog.</button>
        </div>
        <Suspense fallback={<div>Fetching a good boy…</div>}>
          <RandomDog throttle={throttle} />
        </Suspense>
      </Fragment>
    );
  }
}

renderer.render(<RandomDogs />, document.getElementById("app"));
```

[Try on CodeSandbox](https://codesandbox.io/s/a-loading-crank-component-pci9d)

## Concepts
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

![Image of JSX element](#TKTKTK)
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

## Components
So far, we’ve only rendered intrinsic elements directly, but eventually, we’ll want to group parts of the element tree into reusable *components.* In Crank, all components are functions which are passed props and produce elements; there is no class-based interface. These functions are called by creating elements with the functions as tags (`<Component />`).

### Basic Components
```js
function Greeting ({name}) {
  return <div>Hello, {name}</div>;
}

renderer.render(<Greeting name="Andrew" />, document.body);
console.log(document.body.innerHTML); // <div>Hello Andrew</div>
```

The simplest kind of component you can write is a *synchronous function component*. When the renderer renders these components, the tag function is called with the props object of the element as its first argument, and the return value, usually an element, is then recursively rendered by the renderer.

As seen in the example above, you can use [object destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#Object_destructuring) on the props parameter for convenience. Additionally, you can assign default values to each prop using JavaScript’s default value syntax:

```js
function Greeting ({name = "Nemo"}) {
  return <div>Hello, {name}</div>;
}

renderer.render(<Greeting />, document.body);
// <div>Hello Nemo</div>
```

Component elements can take children just like intrinsic elements can. The `createElement` function will add children to props under the property named `children`, and it is up to the component to place the children somewhere in the returned element tree. If you don’t use the `children` prop, the `children` passed in will not be rendered.

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
renderer.render(null, document.body);
console.log(document.body.innerHTML);
// ""
renderer.render(<Counter />, document.body);
// <div>You have updated this component 1 time</div>
```

Because we’re now yielding elements rather than returning them, we can make components stateful using local variables. Every time the component is updated, Crank steps through the generator once, pausing at the next `yield`. The yielded expressions, usually elements, are then recursively rendered by the renderer, just as if it were returned in a sync component. Crank uses the same diffing algorithm used to reuse DOM nodes to reuse generator objects, allowing you to encapsulate local state and reset it when necessary.

### The `this` keyword
`Counter` is a stateful component whose local state only changes when it is updated, but we may want to write components which update themselves based on timers or events. Crank allows components to control themselves by passing in a custom object called a *context* as the `this` keyword of each component. Contexts provide several utility methods, most important of which is `this.refresh`, which tells Crank to update the component in place. For generator components, this means that the renderer will resume the generator so it can yield another value.

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

This `Timer` component is similar to the `Counter` one, except now the state (the local variable `seconds`) is updated in the callback passed to `setInterval`, rather than when the component is updated. `this.refresh` is called to ensure that the outer generator is stepped through, so that the rendered DOM actually reflects the updated state.

### Cleanup with `try`/`finally`
One important detail about the `Timer` example above is that it cleans up after itself with `clearInterval`. Crank will call `return` on the generator object which your component returns, so when your component is removed, the finally block executes and `clearInterval` is called. In this way, you can use the natural lifecycle of a generator to write setup and teardown logic for components, all within the same variable scope.

### Prop updates
The generator components we’ve seen so far haven’t used the props object, but they can accept props as the first parameter just like regular function components.

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

This mostly works, except we have a bug where the component kept yielding the initial message even though a new message was passed in via props. In generator components, we can make sure props are kept up to date by iterating over the `this` object:

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

By replacing the `while (true)` loop with a `for…of` loop which iterates over the `this` object, you can get the latest props passed to the generator. This is possible because contexts are an iterable of the props passed to components. The generator is then expected to yield once per iteration of the context in response to new props.

One Crank idiom we see in the example above is the overwriting of variables declared via the generator’s parameters (`message`) with the `for…of` loop. This allows those variables to always remain in sync with the current props passed to each component. However, there is no reason you have to always overwrite old props in the `for` expression, meaning you can assign new props to a different variable and compare them against the old props:

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

The fact that state is just local variables allows us to blur the lines between props and state, in a way that is easy to understand and without finicky lifecycle methods like `componentWillUpdate` from React. With generators and `for` loops, comparing old and new props is as easy as comparing adjacent elements of an array.

## Interactive components with event listeners
Components produce elements, which are in turn rendered to DOM nodes. Most applications require event listeners to be attached to these nodes so that application state can be updated according to user input. To facilitate this, the Crank context implements the same `EventTarget` interface used by the DOM, and automatically registers and tears down these listeners as elements are inserted and removed. By combining event listeners with local variables and the `this.refresh` method, you can write interactive components.

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

The local state `count` is now updated in the event listener, which triggers when the yielded button is actually clicked. The `this.addEventListener` method only attaches to the top-level node which each component renders, so if you want to listen to events on a nested node, you must use event delegation:

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

Because the event listener is attached to the outer `div`, we have to filter events by `ev.target.tagName` to make sure we’re not incrementing `count` based on clicks which don’t target the `button`.

### Dispatching events
You can also add event listeners to regular function components, but because function components can’t have local state, it doesn’t really make sense to update the component using `this.refresh`. However, one important use-case for adding event listeners to function components is to listen for events and then bubble custom events to parents using `this.dispatchEvent`.

```jsx
function MyButton (props) {
  this.addEventListener("click", () => {
    this.dispatchEvent(new CustomEvent("mybutton.click", {
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
  this.addEventListener("mybutton.click", (ev) => {
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

`MyButton` is a button which bubbles a [`CustomEvent`](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) whose type is `"mybutton.click"`, with data about which button was clicked as the `detail` of the event. This event is not bubbled to parent DOM nodes but to parent component contexts, and in the example, it propagates to the component context of `MyApp`. Using custom events and event bubbling allows you to encapsulate state transitions within parent components without resorting to complicated state management solutions like `Redux` or `Vuex`.

### Accessing rendered values
Sometimes, the declarative rendering of DOM nodes is not enough, and you’ll want to access the actual DOM nodes you’ve rendered, to make measurements or call imperative methods like `el.focus()`, for instance. To facilitate this, Crank will pass rendered DOM nodes back into the generator, so `yield` expressions can themselves be read. The following component is focused whenever it is updated.

```jsx
function *MyInput (props) {
  setTimeout(() => this.refresh());
  for (props of this) {
    const input = yield <input {...props}/>;
    input.focus();
  }
}
```

Because generator components pause at yield, we defer a `this.refresh` call using `setTimeout` when the component is initialized.

### Returning from a generator
Usually, you’ll yield in generator components so that they can continue to respond to updates, but you may want to also `return` a final state. Unlike function components, which are called and returned once for each update, once a generator component returns, it will never update again.

```jsx
function *Stuck({message}) {
  return <div>{message}</div>;
}

renderer.render(<Stuck message="Hello" />, document.body);
console.log(document.body.innerHTML); // <div>Hello</div>
renderer.render(<Stuck message="Goodbye" />, document.body);
console.log(document.body.innerHTML); // <div>Hello</div>
renderer.render(<Stuck message="Passing in new props is useless" />, document.body);
console.log(document.body.innerHTML); // <div>Hello</div>
```

### Catching errors from child components
We all make mistakes, and it can be useful to catch errors in our components so we can show the user something or notify error-logging services. To facilitate this, Crank will throw errors from child components back into parent components, causing the most recent yield to throw the error. You can therefore wrap your `yield` operators in a `try`/`catch` block to catch errors from children.

```jsx
function Thrower () { 
  throw new Error("Hi");
}

function *Catcher () {
  try {
    yield <Thrower />;
  } catch (err) {
    return <div>There was a problem with your application: {err.message}</div>;
  }
}
```

### The power of local variables
As you can see, Crank leverages local variables within generators instead of requiring separate concepts like `state` and `refs` from React. If you add in event listeners and the natural lifecycle provided by generator functions, it almost feels like the early days of JavaScript, when we made interactive pages by creating global variables and mutating them with global event listeners. Crank brings that same simplicity back to JavaScript development, except thanks to JSX and generators, the variables and callbacks are now fully encapsulated.

## Special Props and Tags
The element diffing algorithm used by Crank is both declarative and efficient, but there are times when you might want to tweak the way it works in one way or another. Crank provides one special prop `crank-key` and three special tags `Fragment`, `Portal` and `Copy` which provide special rendering behaviors.

### `crank-key`
By default, Crank will use an element’s tag and position to determine if it represents an update or a change to the tree. Because elements often represent stateful DOM nodes or components, it can be useful to “key” the children of an element as a hint to Crank that an element has been added, moved or removed. In Crank, we do this with the special prop `crank-key`:

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

Keys are scoped to an element’s children. When rendering iterables, it’s useful to key elements of the iterable, because it’s common for elements to be added, removed or rearranged. Both intrinsic and component elements can be keyed with `crank-key`, but the prop is erased from the props object before the props object is passed to the component.

```jsx
function *Shuffler() {
  let nextId = 0;
  const els = Array(4).fill(null).map((_, i) => <span crank-key={i}>{i}</span>);
  while (true) {
    yield <div>{els}</div>;
    els.reverse();
  }
}

renderer.render(<Shuffler />, document.body);
console.log(document.body.innerHTML);
// "<div><span>0</span><span>1</span><span>2</span><span>3</span></div>";

const span0 = document.body.firstChild.firstChild;

renderer.render(<Shuffler />, document.body);
console.log(document.body.innerHTML);
// "<div><span>3</span><span>2</span><span>1</span><span>0</span></div>";

console.log(document.firstChild.lastChild === el0); // true
renderer.render(<Shuffler />, document.body);
console.log(document.body.innerHTML);
// "<div><span>0</span><span>1</span><span>2</span><span>3</span></div>";

console.log(document.firstChild.firstChild === el0); // true
```

## Special Tags
Crank provides a couple element tags which have special meaning when rendering. In actuality, these tags are symbols and behave similarly to string tags, except they affect the diffing algorithm to allow you to render multiple elements into a parent, render into multiple roots, or skip rendering altogether.

### Fragment
Crank provides a `Fragment` tag, which allows you to render multiple siblings in a parent without wrapping them in another DOM node. Under the hood, iterables which appear in an element tree are actually implicitly wrapped in a Fragment element by the renderer.

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
Sometimes you may want to render into multiple DOM nodes from the same component tree. You can do this with the `Portal` tag, passing in a DOM node via a `root` prop. The Portal’s children will be rendered into the specified root. This is useful when writing modals or working with pages where you need to render into multiple entry-points. `renderer.render` actually wraps its first argument in an implicit Portal element if the argument is not a Portal element already. Events dispatched from a Portal’s children via `this.dispatchEvent` will still bubble into parent component contexts.

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
It‘s often fine to rerender Crank components, because elements are diffed, persistent between renders, and unnecessary mutations are avoided. However, sometimes you might want to prevent a child from updating when the parent rerenders, perhaps because a certain prop hasn’t changed, because you want to batch updates from the parent, or because you want to improve performance. To do this, you can use the `Copy` tag to indicate to Crank that you don’t want to update a previously rendered element or any of its children.

```jsx
function equals(oldProps, newProps) {
  for (const name in {...oldProps, ...newProps}) {
    if (oldProps[name] !== newProps[name]) {
      return false;
    }
  }

  return true;
}

function Pure(Component) {
  return function *Wrapped({props}) {
    for (const newProps of this) {
      if (equals(props, newProps)) {
        yield <Copy />;
      } else {
        yield <Component {...newProps} />;
      }

      props = newProps;
    }
  };
}
```

In the example above, `Pure` is a higher-order component, a function which takes a component and returns a component which compares new and old props and yields a copy if old and new props are shallowly equal. Copy elements can appear anywhere in an element tree to prevent rerenderings, and the only prop Copy elements take is the `crank-key` prop, which allows you to do advanced optimizations where you move parts of the tree around.

### TodoMVC
At this point, you have all the knowledge needed to understand Crank’s TodoMVC application. Check it out here.

### Asynchronous Components
So far, every component we’ve seen has worked synchronously, and Crank will respect this as an intentional decision made by the developer by rendering the components synchronously from start to finish. However, modern JavaScript includes promises and `async`/`await`, allowing you to write concurrently executing code as if it were synchronous. To facilitate this, Crank allows components to be asynchronous functions as well.

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

When a Crank renderer runs a component which returns a promise, rendering becomes asynchronous as well. This means that `renderer.render` itself will return a promise which fulfills when all components in the element tree have fulfilled at least once.

### Concurrent updates
Renderers don’t have to await pending components, async components can be updated concurrently based on the calls to render and the component tree, so Crank implements a couple rules to make concurrent updates predictable and performant.

1. There can only be one pending run of an element per slot at a time. If a component is updated concurrently while it is still pending, another update is enqueued with the latest props.

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

Despite rendering concurrently, at no point is there more than one outstanding call to the `Delay` component at a time. As you can see, by the time the third render (`p3`) fulfills, the fourth rendering has taken effect. This is because components use only the latest of enqueued updates when rerendering, other pending updates are simply dropped.

2. If two different async components are rendered into the same slot of an element tree, the components will race. If the earlier component wins, it shows until the later component fulfills. If the later component wins, the earlier component will never be rendered.

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

### Components with async children 
When Crank encounters an async component anywhere in the render tree, the entire rendering process also becomes asynchronous. Therefore, async child components make parent components asynchronous, and depending on the kind of component, parents will communicate updates to asynchronous children in different ways.

For instance, sync function components will transparently pass updates along to async children, so that when a renderer updates a sync function component concurrently, its async children will also update concurrently. On the other hand, sync generator components which yield async elements will not resume until those async elements have fulfilled. This is because sync generators expect to be resumed after their children have rendered, and the actual DOM nodes which are rendered are passed back into the generator, but we wouldn’t have those available if the generator was concurrently resumed before the async children had fulfilled.

### Async generator functions
Just as you can write stateful components with synchronous generator functions, you can also write stateful async components with async generator functions.

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

`AsyncLabeledCounter` is an async version of the `LabeledCounter` example introduced earlier, and demonstrates several key differences between sync and async generator components. First, rather than using `while` or `for…of` loops, we now use a `for await…of` loop. This is possible because Crank contexts are not just an iterable of props, but also an async iterable of props. Second, you’ll notice that the async generator yields multiple times per iteration over `this`. While this is possible for sync generators, it wouldn’t necessarily make sense to do so because generators suspend at each yield, and upon resuming the props would be stale. In contrast, async generator components are continuously resumed. Therefore, to suspend the async generator component between updates, we rely on the `for await…of` loop, which pauses at the bottom when there are no pending updates.

### Responsive Loading Indicators
The async components we’ve seen so far have been all or nothing, in the sense that the renderer cannot show anything until all components in the tree have fulfilled. This can be a problem when you have an async call which takes longer than expected; it would be nice if parts of the element tree could be shown without waiting, and if components which have yet to fulfill could be replaced with a loading indicator. Because loading indicators which show immediately can paradoxically make your app seem less responsive, we can use the async rules described above along with async generator functions to show loading indicators which wait before showing.

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

The above example shows how we could implement Suspense, a proposed custom React component which allows async components with fallback states. As you can see, in Crank, no special tags are needed, and the functionality to write this complex async logic is all available to the user. Best of all, we can use `async`/`await` directly in our components.

## Custom Renderers
**Under construction**

## Differences from React
Though Crank is very much inspired by and similar to React, exact compatibility is a non-goal, and we’ve used this as opportunity to “fix” a lot of pain points with React which bothered us over the years. The following is a list of differences with React, as well as justifications for why we chose to implement features differently.

- No Component class, no hooks.
  Crank uses generator functions, async functions and the JavaScript runtime to implement much of what React implements. Here for instance, is the old React class-based API implemented with a single async generator function:
  ```jsx
  async function *ReactComponent(props) {
    let state = componentWillMount(props);
    let ref = yield render(props, state);
    state = componentDidMount(props, state, ref);
    try {
      for await (const newProps of this) {
        if (shouldComponentUpdate(props, newProps, state, ref)) {
          state = componentWillUpdate(props, newProps, state, ref);
          ref = yield render(props, state);
          state = componentDidUpdate(props, newProps, state, ref);
          props = newProps;
        }
      }
    } catch (err) {
      componentDidCatch(err);
    } finally {
      componentWillUnmount(ref);
    }
  }
  ```
- No `setState` or `useState`
  React has always tightly coupled component updates with the concept of local state. Because Crank uses generator functions, state is just local variables which is modified by local functions, and you can call `this.refresh()` to update the UI to match state. Decoupling these two concerns allows for more nuanced updates to components without `shouldComponentUpdate` hacks, and is easier to reason about than relying on the framework to provide local state.
- No `Suspense`
  The project known as React `Suspense` is likely both a boondoggle and vaporware. It relies on the unusual mechanism of throwing promises, has the hard requirement of a caching mechanism, and is generally difficult to reason about. By leveraging async functions and async generators, Crank allows you to implement the `Suspense` element in user-space. No argument from the React team about the necessity of `Suspense` will ever justify it over the convenience provided by being able to use the `await` operator directly in components. 
- JSX looks like HTML.
  - `for` not `htmlFor`, `class` not `className`
  Crank does not place any restrictions on the names of JSX props. This means that you can write JSX like `<label class="my-label" for="my-id">Label</label>`.
  - style can be a `cssText` string, style object uses snake-case, and `px` is not magically added to numbers.
  ```jsx
    <div style="color: red"><span style={{"font-size": "16px"}}>Hello</span></div>
  ```
- No “controlled”/“uncontrolled”, “value”/“defaultValue” components. If you don’t want your component to be updated, don’t update it.
- No `dangerouslySetInnerHTML={{__html}}` props.
  Just use the `innerHTML` prop. React doesn’t do anything to make setting `innerHTML` safe; they just make you type more and search for the exact spelling of `dangerouslySetInnerHTML` every month or so.
  - Fragments can have `innerHTML`. Fragment behavior can be overridden by renderers, and both the DOM and HTML renderers allow fragments to accept an innerHTML prop, allowing arbitrarily HTML to be written without a parent.
- Portals are just a special element tag. Their behavior is defined by renderers, and all element trees are wrapped implicitly or explicitly in a root portal.
- No `componentDidUpdate` or `React.memo`.
  Crank uses the special `Copy` element to prevent child updates.
- No `React.cloneElement`
  Elements are just plain-old JavaScript objects, and there is no need to use a special method to copy them. You can re-use the same elements within generators, mutate them, or use spread syntax to shallowly copy them. Crank will handle reused elements gracefully.
- No event props
  Event props in React are terrible for the following reasons:
  - The EventTarget API takes more than just a function, it also takes options which allow you to register event listeners in the `capture` phase, register `passive` listeners, or register event listeners `once`. React has attempted to allow event handlers to be registered in the capture phase by adding props like `onClickCapture`, but embedding all these options in the prop name would be madness (`onClickCaptureOncePassive`). By emulating the event target API, Crank provides the full power of the `EventTarget` API.
  - Stop doxxing event listeners. Event listeners are difficult to name and make the most sense as anonymous functions which are made meaningful by the `type` it’s associated with. React developers often adopt a naming scheme to cache event listeners on component instances like `this.handleClick` to avoid `PureComponent`/`componentDidUpdate` de-optimizations, but if they only had to be defined once, we wouldn’t have to do this. Generator functions naturally allow components to define anonymous event listeners once when the component mounts, and the event target API provided by Crank automatically unregisters these listeners when components are thrown away. This means you never have to reason about when these functions are redefined or what they are capturing in their closures.
  - Custom events are events, and they can be prevented or bubbled like regular DOM events.
    When attempting to define custom event handler props in React, React developers will typically mimic the component props API and allow callbacks to be passed into the component, which the component author will then call directly when they want to trigger the event. This is a painful to do, because you often have to make sure the callback is defined on props, because they are usually optional, and then React developers will also arbitrarily pass data to the callback which is not an event, making custom `onWhatever` props disanalogous with DOM event props, because DOM event props call callbacks with an event. There is no standard for what event-like callback props are called with in React, and there is no way for components to allow parents to prevent default behavior by calling `ev.preventDefault` as you would with a regular DOM event. Worst of all, these props must be passed directly from parent to child, so if a component wants to listen to an event in a deeply nested component, event handlers must either be passed using React contexts, or passed explicitly through each component layer, at each layer renamed to make sense for each nested component API.
    Crank avoids this sitution by mimicking the DOM EventTarget API, and allowing developers to create and bubble real `Event` or `CustomEvent` objects with `this.dispatchEvent`. These events can be namespaced, typed, and components can allow parents to cancel events.
- No refs
  React’s `ref` API has undergone multiple revisions over the years and it’s only gotten more confusing/difficult to use. Crank passes rendered DOM nodes and strings back into generator functions, so you can access them by reading the result of `yield` expressions in generators. You can assign these “refs” to local variables and treat them as you would any local variable without worry.
- Children can contain any kind of iterable, not just arrays.
  There’s no reason to restrict children in JSX elements to just arrays. You can interpolate ES6 Maps, Sets or any other user-defined iterable into your Crank elements, and Crank will simply render them in an implicit `Fragment`.
- Keys
  - key has been named to `crank-key`.
    In React, the `key` prop is special and erased from the props visible to components. Insofar as `key` is a common word, Crank namespaces `key` as `crank-key`.
  - The elements of iterables don’t require unique keys.
    Pestering the user to add unique keys to every element of an array is not something Crank will ever do, insofar as most of the time, developers just set the `key` to an `index` into the array. If the developer needs state to be preserved, they will eventually discover that it isn’t preserved in the course of normal development and add a key.
- No render props
  Crank strongly discourages the React idiom of passing a function as children (or any other prop for that matter. “Render props” produce ugly and non-sensical syntax, and were a direct response to the lack of composability of React class components. Most if not all “render prop” patterns are easier to implement in Crank with the use of higher-order components which are passed component functions and props and produce elements of their own accord.
- Contexts
  A feature equivalent to React Contexts is planned but not yet implemented.

## TypeScript
Crank is written in TypeScript, and provides some types out of box so you can type-check your components and JSX calls.
### Typing `this` in components
Trying to reference `this` in a component without a type annotation for `this` will throw a type error in TypeScript‘s strict mode (you’ll see a message like `'this' implicitly has type 'any' because it does not have a type annotation`). TypeScript exports the `Context` class so you can annotate your components with `Context` as `this`:

```tsx
function *Timer (this: Context) {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);
  try {
    while (true) {
      yield <div>Seconds: {seconds}</div>;
    }
  } finally {
    clearInterval(interval);
  }
}
```

### Typing props
You can type the props object passed to components. This allows JSX calls which use your component as a tag to be type-checked.

```tsx
function Greeting ({name}: {name: string}) {
  return (
    <div>Hello {name}</div>
  );
}

const el = <Greeting name="Brian" />; // works fine
const el1 = <Greeting name={1} />; // throws a type error
```

The children prop can be typed using the `Children` type provided by Crank. TypeScript doesn’t really provide a way to prevent functions from being used as the `children` prop, but such patterns are strongly discouraged. You should typically treat `children` as an opaque value only to be interpolated into JSX.
```tsx
import {Children} from "@bikeshaving/crank";
function Greeting ({name, children}: {name: string, children: Children}) {
  return (
    <div>
      Message for {name}: {children}
    </div>
  );
}
```

### Typing the return types of components
You’ll often want to add a return type to your components. Crank exports custom types to help you type the return types of components:

```tsx
import {Element} from "@bikeshaving/crank";
function SyncFn(): Element {
  return <div>Hello world</div>;
}

function *SyncGen(): Generator<Element> {
  while (true) {
    yield <div>Hello world</div>;
  } 
}

async function AsyncFn(): Promise<Element> {
  return <div>Hello world</div>;
}

async function *AsyncGen(): AsyncGenerator<Element> {
  while (true) {
    yield <div>Hello world</div>;
  } 
}
```

`Element` is just the type returned by JSX/`createElement`. As you can see, you still have to modify the return type of functions based on whether the function is async or a generator. You can also use the type `Child` which represents any valid value in an element tree. 

```tsx
function *SyncGen(): Generator<Child> {
  yield true;
  yield false;
  yield null;
  yield undefined;
  yield 0;
  yield 9001;
  yield "Hello world";
  yield <div>Hello world</div>;
}
```

Anything assignable to `Child` can be part of the element tree.

### Typing event listeners
If you dispatch custom events, you’re going to want parent event listeners to be typed with the event you bubbled automatically. To do so, you can extend a global `EventMap` type provided by Crank.

```tsx
declare global {
	module crank {
		interface EventMap {
			"mybutton.click": CustomEvent<{id: string}>;
		}
	}
}


function MyButton (props) {
  this.addEventListener("click", () => {
    this.dispatchEvent(new CustomEvent("mybutton.click", {
      bubbles: true,
      detail: {id: props.id},
    }));
  });

  return (
    <button {...props} />
  );
}
```

## API Reference
## `@bikeshaving/crank`
### `createElement`
### `Element`
### `Child`
### `Context`
### `Renderer`
## `@bikeshaving/crank/dom`
### `DOMRenderer`
### `renderer`
## `@bikeshaving/crank/html`
### `HTMLRenderer`
### `renderer`
