---
title: Special Props and Tags
---

## Special Props

The following props apply to all elements, regardless of tag or renderer.

### `crank-key`
By default, Crank will use an element’s tag and position to determine if it represents an update or a change to the tree. Because elements often represent stateful DOM nodes or components, it can be useful to *key* the children of an element to hint to renderers that an element has been added, moved or removed. In Crank, we do this with the special prop `crank-key`:

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
// "<div><span>Id: 1</span><span>Id: 2</span><span>Id: 3</span><div>"

renderer.render(
  <div>
    <ID crank-key="c" />
    <ID crank-key="b" />
    <ID crank-key="a" />
  </div>,
  document.body,
);

console.log(document.body.innerHTML);
// "<div><span>Id: 3</span><span>Id: 2</span><span>Id: 1</span><div>"
```

Keys are scoped to an element’s children, and can be any JavaScript value. When rendering iterables, it’s useful to key elements of the iterable, because it’s common for the contents of rendered iterables to added, moved or removed. All elements in the element tree can be keyed.

```jsx
function *Shuffler() {
  let nextId = 0;
  const els = Array.from({length: 4}, (_, i) => <span crank-key={i}>{i}</span>);
  while (true) {
    yield <div>{els}</div>;
    els.reverse();
  }
}

renderer.render(<Shuffler />, document.body);
console.log(document.body.innerHTML);
// "<div><span>0</span><span>1</span><span>2</span><span>3</span></div>";

const span = document.body.firstChild.firstChild;

renderer.render(<Shuffler />, document.body);
console.log(document.body.innerHTML);
// "<div><span>3</span><span>2</span><span>1</span><span>0</span></div>";

console.log(document.firstChild.lastChild === span); // true
renderer.render(<Shuffler />, document.body);
console.log(document.body.innerHTML);
// "<div><span>0</span><span>1</span><span>2</span><span>3</span></div>";

console.log(document.firstChild.firstChild === span); // true
```

### `crank-ref`
Sometimes, you may want to access the rendered value of a specific element in the element tree. To do this, you can pass a callback as the `crank-ref` prop. This callback is called with the rendered value of the element when the element has committed.

```tsx
function *MyPlayer() {
  let audio;
  while (true) {
    yield (
      <div>
        <button onclick={() => audio.play()}>Play sound</button>
        <audio
          src="https://interactive-examples.mdn.mozilla.net/media/examples/t-rex-roar.mp3"
          controls={false}
          crank-ref={(el) => (audio = el)}
        />
      </div>
    );
  }
}
```

Refs can be attached to any element in the element tree, and the value passed to the callback will vary according the type of the element and the renderer.

### `children`
The `children` prop passed to components is special because it is not usually set with JSX’s `key="value"` prop syntax, but by the contents between the opening and closing tags. Crank places no limitations on the types of values that can be passed into components as children, but patterns like [render props](https://reactjs.org/docs/render-props.html) from the React community, where a callback is passed as the child of a component, should be avoided.

The actual type of the `children` prop will vary according to the number of children passed in. If a component element has no children (`<Component />`), the `children` prop will be undefined, if it has one child (`<Component><Child /></Component>`), the `children` prop will be set to that child, and if it has multiple children (`<Component><Child /><Child /></Component>`), the `children` prop will be set to an array of those children. We do this to avoid an array allocation; all props have to be retained between renders, and avoiding allocating an extra array for every element in the tree can noticeably reduce the runtime memory costs of applications.

Therefore, the `children` prop should be treated as a black box, only to be rendered somewhere within a component’s returned or yielded children. Attempting to iterate over or manipulate the passed in children of a component is an anti-pattern, and you should use [event bubbling](#TKTKTKT) or [provisions](#TTKTKTK) to coordinate ancestor and descendant components.

## Special DOM Props

The following props are specific to host elements for the HTML and DOM renderers.

### style
The style prop can be used to add inline styles to an element. It can either be a CSS string, in which case it works exactly as it does in HTML, or it can also be an object, in which case CSS declarations can be set individually.

```jsx
<div style="color: red"><span style={{"font-size": "16px"}}>Hello</span></div>
```

**Note:** Unlike other JSX frameworks, Crank does not camel-case style names or add pixel units to numbers.

### innerHTML
The innerHTML prop can be used to set the `innerHTML` of an element.

Be careful when using the `innerHTML` prop, as passing unsanitized text inputs can lead to security vulnerabilities. As an alternative, you can also use [the special `Raw` element tag](#TKTKTK), which allows to inject raw HTML or even actual DOM nodes into the element tree, without requiring a parent host element.

### `class` vs `className`, `for` vs `htmlFor`
Crank strives to make copying and pasting HTML into your components as easy as possible, and to this extent it allows you to use `class` and `for` as props in your elements.

```jsx
<label class="my-label" for="my-id">Label</label>
```

You can still use `className` and `htmlFor` as well, but using the former prop names is much more convenient.

## Special Tags

Crank provides four element tags which have special meaning to the renderer, and affect element diffing and rendering output in various ways.

### Fragment
Crank provides a `Fragment` tag, which allows you to render multiple children into a parent without wrapping them in another DOM node. Under the hood, iterables which appear in the element tree are also implicitly wrapped in a `Fragment` element by the renderer.

```jsx
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
console.log(document.body.innerHTML);
// "<div>Sibling 1</div><div>Sibling 2</div>"
```

Internally, the `Fragment` is the empty string, and you can use the empty string directly when calling `createElement` yourself without having to reference the `Crank` namespace.

```jsx
function Siblings() {
  return createElement("", null, [
    <div>Sibling 1</div>,
    <div>Sibling 2</div>,
  ]);
}

renderer.render(<Siblings />, document.body);
console.log(document.body.innerHTML);
// "<div>Sibling 1</div><div>Sibling 2</div>"
```

### Portal
Sometimes you may want to render into a DOM node which isn’t the current parent element, or even a part of the currently rendered DOM tree. You can do this with the `Portal` tag, passing in a DOM node as its `root` prop. The Portal’s children will be rendered into the specified root element, just as if Renderer.render was called with the root value as its second argument.

```jsx
/** @jsx createElement */
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

This tag is useful for instance when creating modals or tooltips, which usually need to be rendered into separate DOM elements at the bottom of the page for visibility reasons. Events dispatched from a `Portal` element‘s child contexts via the `dispatchEvent` method will still bubble into parent components.

### Copy
It‘s often fine to rerender Crank components, because elements are diffed, persistent between renders, and unnecessary mutations usually avoided. However, you might want to prevent a child from updating when the parent rerenders, perhaps because a certain prop hasn’t changed, because you want to batch updates from the parent, or as a performance optimization. To do this, you can use the `Copy` tag to indicate to Crank that you don’t want to update a previously rendered element in its position.

```jsx
function equals(props, newProps) {
  for (const name in {...props, ...newProps}) {
    if (props[name] !== newProps[name]) {
      return false;
    }
  }

  return true;
}

function memo(Component) {
  return function *Wrapped({props}) {
    yield <Component {...props} />;
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

In this example, `memo` is a higher-order component, a function which takes a component and returns a component which compares new and old props and yields a `Copy` element if old and new props are shallowly equal. A `Copy` element can appear anywhere in an element tree to prevent rerenderings, and the only prop `Copy` elements take is the `crank-key` prop, allowing you to copy elements by key rather than position.

### Raw
Sometimes, you may want to insert raw HTML or actual DOM nodes directly into the element tree. Crank allows you to do this with the `Raw` element. The `Raw` element takes a `value` prop which is interpreted by the renderer. For the DOM renderer, if `value` is an HTML string, the renderer will parse and insert the resulting DOM nodes, and if it’s already a DOM node Crank will insert them in place. Be careful when using `Raw` elements, as passing unsanitized text inputs can lead to security vulnerabilities.

```jsx
/** @jsx createElement */
import {createElement, Raw} from "@bikeshaving/crank";
import marked from "marked";
function MarkdownViewer({markdown=""}) {
  const html = marked(markdown);
  return (
    <div>
      <Raw value={html} />
    </div>
  );
}
```
