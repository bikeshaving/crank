## Installation

Crank is available on [NPM](https://npmjs.org/@bikeshaving/crank) in the ESModule and CommonJS formats.

```
$ npm install @bikeshaving/crank
```

```
$ yarn add @bikeshaving/crank
```

## Basic Usage
```jsx
/* @jsx createElement */
import {createElement} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";

renderer.render(<div id="hello">Hello world</div>, document.body);
```

### JSX and Elements
*Note for React developers: JSX and Elements in Crank work almost exactly as they do in React. If you’re familiar with these concepts in React you may want to skip ahead to the [section on components](#TK).*

Crank is best used with [JSX](https://facebook.github.io/jsx/), an XML-like syntax extension to JavaScript. Crank is designed to work with both the Babel and TypeScript parsers out-of-box; all you need to do is import the `createElement` function and reference it via a `@jsx` comment directive (`/* @jsx createElement */`). The parser will then transpile JSX into `createElement` calls. For example, in the code below, the expression assigned to `element1` desugars to the expression assigned to `element2`:

```jsx
/* @jsx createElement */
import {createElement} from "@bikeshaving/crank";

const element1 = <div id="element">An element</div>;
const element2 = createElement("div", {id: "element"}, "An element");
```

The `createElement` function called when by JSX returns an *element*, a simple JavaScript object used to represent trees of stateful values. These elements are used by renderers to create DOM nodes, html strings, scene graphs, or whatever else a developer can think of to render. Crank ships with two renderers for web development, one which produces DOM nodes, available through the module `@bikeshaving/crank/dom`, and one which produces HTML strings, available through the module `@bikeshaving/crank/html`. You can use these modules to render interactive UI components on the client and HTML strings on the server respectively.

### The parts of an element.

![Image of JSX element](#TKTKTK)

An element has three main parts, a *tag*, *props* and *children*. They roughly correspond to the way tags, attributes and content work in HTML, and for the most part, you can copy and paste HTML as JSX expressions in JavaScript and have them work the same way. The main difference is that with JSX, tags, props and children aren’t restricted to strings, they can be almost any JavaScript value, allowing you to use elements seamlessly within JavaScript.

### Tags
By convention, JSX parsers treat capitalized tags as variables and lower-cased tags as strings. When a tag is a string, this signifies to Crank that the element should be handled by the renderer. In Crank, we call elements with string tags *intrinsic elements*. As we’ll see later, elements can also have tags which are functions, necessarily uppercased, in which case, the behavior is defined by the execution of the referenced function and not the renderer. These elements are called *component elements*.

### Props
The attributes passed to elements via JSX are collected into a single object whose keys are the names of attributes and whose values are 

### Children
As with HTML, elements can have contents, typically referred to as *children*. Elements therefore form a tree of values which is recursively rendered by the renderer. Elements are branch nodes in the tree. Almost any value in JavaScript can be a child of an element. The values `null`, `undefined`, and booleans are erased from the tree when rendered, while strings and numbers are rendered as text. Crank also allows any iterable to be interpolated into children as well, so, for instance, you can interpolate an array of children as the contents of an element as well.

```jsx
const arr = [1, 2, 3];
const set = new Set(["a", "b", "c"]);
renderer.render(<div>{arr} {set}</div>, document.body);
// produces the HTML <div>123 abc</div>
```

## Element diffing
Crank uses the same “virtual DOM” diffing algorithm made popular by React to allow for declarative code which produces minimal DOM updates. When a tree of elements is updated, each child of an element is checked against the child which was previously in that same “slot.” If both old and new are elements and the tags don’t match, the renderer will blow away the subtree the element represents and create a new tree.

## Simple Components
All Crank components are functions take props and produce elements. There is no class-based interface. The simplest kind of component you can write is a synchronous function component. To use this function, you create an element with the function as the tag. When called as an element, the function will be passed a props object of the element as the first parameter. You can use [object destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#Object_destructuring)

```js
function Greeting ({name}) {
  return <div>Hello, {name}</div>;
}

renderer.render(<Greeting name={Andrew} />, document.body);
// <div>Hello Andrew</div>
```

You can assign default values to each prop using JavaScript’s default value syntax.

```js
function Greeting ({name="Nemo"}) {
  return <div>Hello, {name}</div>;
}

renderer.render(<Greeting />, document.body);
// <div>Hello Nemo</div>
```

Component elements can take children just like intrinsic elements can.

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
// <div>Message for Nemo: <span>Howdy</span></div>
```

Unlike with intrinsic elements, component elements are required to place children themselves. If you don’t use the `children` prop, it will not be rendered.

## Stateful Components
Eventually, you’re going to want to create a components with local state. In Crank, these components are still just functions, except now they’re generator functions, and instead of returning elements we yield them. Because we’re now yielding elements rather than returning them, we can keep local state in the component using local variables.

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
// <div>You have updated this component 1 time</div>
renderer.render(<Counter />, document.body);
// <div>You have updated this component 2 times</div>
renderer.render(<Counter />, document.body);
renderer.render(<Counter />, document.body);
renderer.render(<Counter />, document.body);
// <div>You have updated this component 5 times</div>
```

### The `this` keyword.
So far, the renderer has handled updating the Counter, but you may want to write components which update themselves. Crank adds a way to control components by passing in a custom `this` to each component. The `this` object is called a components “context,” and the context object has utility methods allowing the component to control updating from within. The most important method is `this.refresh`, which allows a component to update without a parent or a renderer doing it for the component.

Combined with `window.setInterval`, we can now create a counter which updates every second:

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

This component is similar to the `Counter` one, except now the local variable is updated in a callback passed to `setInterval`, rather than when the component is updated. `this.refresh` is also called to ensure that the actual DOM is updated to reflect the updated state. Whether the component is updated by a parent, or updated internally, you can be assured that `seconds` will be Finally, it’s important to make sure that the `setInterval` callback doesn’t continue to fire after the component is removed from the tree, so we wrap the `yield` loop in a `try`/`finally` call. Crank will call `return` on the generator returned by the component, so that the finally branch executes and `clearInterval` is called. In this way, we can use the natural lifecycle of a generator to setup and teardown logic, all within the same scope.

### Prop updates
The generator components we’ve seen so far haven’t used the props object like regular function components, but they can:
```jsx
function *Counter ({message}) {
  let count = 0;
  while (true) {
    count++;
    yield (
      <div>{message} {count}</div>
    );
  }
}
renderer.render(<Counter message="The count is now:" />, document.body);
// <div>The count is now: 1</div>
renderer.render(<Counter message="The count is now:" />, document.body);
// <div>The count is now: 2</div>
renderer.render(<Counter message="What if I update the message:" />, document.body);
// <div>The count is now: 3</div>
// WOOPS!
```

This mostly works, except we have a bug where the component kept the initial message even though the message had changed. To keep props up to date, Crank contexts are iterable, so that when you `for of` the `this` object, you get the latest props passed to the generator.

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
```

One idiom in Crank is to reuse and overwrite the variables declared in the generator parameters. Here, `message` is declared in the destructuring of props at the top of the function and then reassigned in the for-loop, so it is always in sync with the current props passed to the component. However, there is no reason you have to do always overwrite props, so just like state, you can store previous props and compare them against the current props easily.

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
// <div>Hello Alice</div>
renderer.render(<Greeting name="Alice" />, document.body);
// <div>Hello again Alice</div>
renderer.render(<Greeting name="Bob" />, document.body);
// <div>Goodbye Alice and hello Bob</div>
renderer.render(<Greeting name="Bob" />, document.body);
// <div>Hello again Bob</div>
```

The fact that state is just local variables allows us to blur the lines between `props` and `state`, in a way that is easy to understand and without verbose lifecycle methods like `componentWillReceiveProps` or whatever.

## Event handlers and Refs
Components produce elements, which are in turn rendered to DOM nodes. Most applications require event listeners to be attached to these nodes so that application state can be updated according to user input.

The Crank context implements the same `EventTarget` interface used by the DOM, and automatically registers and tears down these listeners as elements rendered and removed. Combined with local variables and `this.refresh` you can write interactive components.

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
`this.addEventListener` adds and removes event listeners to the underlying nodes as they’re rendered, if they’re also event targets, and removes all event listeners when the component is unrendered. The event listeners are only attached to the top-level node or nodes which each component renders, so if you want to listen to events on a nested node, you must use event delegation.

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
Because the event listener is attached to the outer `div`, we have to filter events by `ev.target.tagName` to make sure we’re not incrementing `count` based on clicks outside of the button .

You can also add event listeners to regular function components, but because function components are stateless, you can’t update the component from the listener callback. However, one important use-case is using function components with custom events and `this.dispatchEvent` to bubble events to parents.

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

`MyButton` is a custom button which bubbles a custom event whose type is `"custombutton.click"` with the `id` of the button as data, whenever the button is clicked. This event is not bubbled to parent DOM nodes but to parent component contexts, and in this case it propagates to the component context of `MyApp`. Using custom events and event bubbling allows you to encapsulate state transitions within your app, without resorting to complicated state management solutions like `Redux` or `Vuex`.

### Accessing the rendered values (refs)
Sometimes, the declarative rendering of DOM nodes is not enough, and you’ll want to access the actual DOM ndoes you’ve rendered, to call imperative methods to focus/blur them, for instance. Crank will pass rendered DOM nodes back to the generator, so `yield` expressions can themselves be read to access the rendered DOM nodes.

TODO: don’t use setTimeout here, something like a commit event is more appropriate here.
```jsx
function *MyInput (props) {
  let el;
  setTimeout(() => {
    el.focus();
  }, 0);
  el = yield <input {...props}/>;
  for (props of this) {
    yield <input {...props}/>;
  }
}
```

### Catching errors in children

### The power of local variables
As you can see, Crank leverages local variables within generators to emulate `props`, `state` and `refs`. If you add event listeners and the natural lifecycle provided by genrator functions, you can do replicate pretty much every feature which would have been normally handled with classes, hooks, decorators, proxies, compilers or whatever other  mechanisms ramework developers can concoct to represent local, reactive state. Crank is almost like a throwback to the early days of JavaScript, when we used global varibles and event listeners to add interactivity to relatively static pages, but thanks to the function scope provided by generator functions, these variables are now local.

### Async Components
So far, every component we’ve seen has worked synchronusly, and Crank will respect this as a decision made by the developer by running the rendering of these components synchronously. However, modern JavaScript includes promises and `async`/`await`, allowing developers to use async code. Crank therefore allows functions to be asynchronous as well.

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

When a Crank renderer encounters a component which returns a promise, rendering becomes asynchronous as well, and nothing will be rendered until all children have fulfilled. This means you can use `async`/`await` directly in your function components. renderer.render itself will return a promise which fulfills when all child components have fulfilled at least once.

### Concurrency and rendering
Components do not necessarily have to await pending async components before updating them, so Crank implements a couple rules to handle concurrent updates to async components.

Rule 1. There can only be one inflight component per element slot

Rule 2. When async components fulfill they will always update with the most currently available props

Rule 3. Async components which attempt to render to the same position will race

### Async components and sync function components
### Loading states and async generator components

- Contexts are async iterable
- Discuss the difference between how generator components vs async generator components resume
- Suspense example
## Special Props
### crank-key
### innerHTML

## Special Tags
Crank implements a couple special element tags which have special meaning when rendering to the DOM. Under the hood, these tags are symbols and behave similarly to string tags, but affect the way element diffing works.

### Fragment
Similar to React, Crank has a special `Fragment` element tag, allowing components to render multiple siblings into a parent without wrapping the siblings in another DOM node. Iterables which appear in the element tree are actually all implicitly wrapped in a `Fragment` element.

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
```

### Portal

Sometimes you may want to render into multiple DOM nodes from the same component tree. You can do this with the `Portal` tag, and referencing a DOM node via the `root` prop. The `Portal`’s children will be rendered into the root passed as a prop. This is useful when writing modals or working with a pages where you need to render into multiple entry-points. `renderer.render` actually wraps its first argument in an implicit `Portal` element if the value is not a `Portal` element already. Events from the `Portal` elements children will still bubble up into parent components.

```jsx
/* @jsx createElement */
import {createElement, Portal} from "@bikeshaving/crank";
import {renderer} from "@bikeshaving/crank/dom";
const root1 = document.createElement("div");
root1.id = "root1";
const root2 = document.createElement("div");
root2.id = "root2";
document.body.appendChild(root1);
document.body.appendChild(root2);
function MyComponent() {
  return (
    <div>
      <div>This div is rendered into root1</div>
      <Portal root={document.getElementById("root2")}>
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
It‘s often fine to rerender Crank components, because the underlying DOM nodes are diffed and unnecessary mutations are avoided. However, sometimes you might want to prevent a child from updating when the parent rerenders, perhaps because a certain prop hasn’t changed, or perhaps because you want to batch updates from the parent. To do this, you can use the `Copy` tag, and create `Copy` elements to

## Custom Renderers
⚠️ Docs under construction ⚠️

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
  - Stop doxxing event listeners. Event listeners are difficult to name and make the most sense as anonymous functions which are made meaningful by the event listener type. React developers often adopt a naming scheme to cache evnet listeners on component instances like `this.handleClick` to avoid `PureComponent` or `componentDidUpdate` de-optimizations, but it‘s best to let these event handlers be anonymous, and only define them once. Generator functions naturally allow components to define anonymous event listeners at the top of the function. These functions are only defined once and are the same for the entire lifecycle of the component.
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

## API Reference
### `createElement`
### `Renderer`
### `Child`
### `Context` (the `this` object passed to components)
