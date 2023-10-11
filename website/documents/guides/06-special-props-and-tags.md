---
title: Special Props and Tags
---

Crank provides certain APIs in the form of special props or element tags. The following is an overview of these props and tags.

## Special Props
The following props apply to all elements, regardless of tag or renderer.

### crank-key
By default, Crank uses an element’s tag and position to determine if it represents an update or a change to the tree. Because elements often represent stateful DOM nodes or components, it can be useful to *key* the children of an element to hint to the renderer that an element has been added, moved or removed from a parent. In Crank, we do this with the special prop `crank-key`:

```jsx live
import {createElement} from "https://unpkg.com/@b9g/crank/crank";
import {renderer} from "https://unpkg.com/@b9g/crank/dom";

let nextId = 0;
function *ID() {
  const id = nextId++;
  for ({} of this) {
    yield <div>Id: {id}</div>;
  }
}

function *List() {
  let reversed = false;
  const onclick = () => {
    reversed = !reversed;
    this.refresh();
  };
  for ({} of this) {
    yield (
      <div>
        {
          reversed ? (
            <>
              <ID crank-key="d" />
              <ID crank-key="c" />
              <ID crank-key="b" />
              <ID crank-key="a" />
            </>
          ) : (
            <>
              <ID crank-key="a" />
              <ID crank-key="b" />
              <ID crank-key="c" />
              <ID crank-key="d" />
            </>
          )
        }
        <button onclick={onclick}>Reverse! Reverse!</button>
      </div>
    );
  }
}

renderer.render(<List />, document.body);
```

Keys are scoped to an element’s children, and can be any JavaScript value. When rendering iterables, it’s useful to key elements of the iterable, because it’s common for the values of rendered iterables to added, moved or removed.

```jsx live
import {createElement} from "https://unpkg.com/@b9g/crank/crank";
import {renderer} from "https://unpkg.com/@b9g/crank/dom";

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

All elements in the element tree can be keyed. If the element is a component element, the `crank-key` prop is erased from the props object passed to the component.

### crank-ref
Sometimes, you may want to access the rendered value of a specific element in the element tree. To do this, you can pass a callback as the `crank-ref` prop. This callback is called with the rendered value of the element when the element has committed.

```jsx live
import {createElement} from "https://unpkg.com/@b9g/crank/crank";
import {renderer} from "https://unpkg.com/@b9g/crank/dom";

function *MyPlayer() {
  let audio;
  for ({} of this) {
    yield (
      <div>
        <button onclick={() => audio.play()}>Play sound</button>
        <audio
          src="/static/t-rex-roar.mp3"
          controls={false}
          c-ref={(el) => (audio = el)}
        />
      </div>
    );
  }
}

renderer.render(<MyPlayer />, document.body);
```

Refs can be attached to any element in the element tree, and the value passed to the callback will vary according the type of the element and the specific renderer.

### children
The `children` prop passed to components is special because it is not usually set with JSX’s `key="value"` prop syntax, but by the contents between the opening and closing tags. Crank places no limitations on the types of values that can be passed into components as children, but patterns like [render props](https://reactjs.org/docs/render-props.html) from the React community, where a callback is passed as the child of a component, should be avoided.

The actual type of the `children` prop will vary according to the number of children passed in. If a component element has no children (`<Component/>`), the `children` prop will be undefined, if it has one child (`<Component><Child/></Component>`), the `children` prop will be set to that child, and if it has multiple children (`<Component><Child/><Child/></Component>`), the `children` prop will be set to an array of those children. We do this to reduce runtime memory costs. All props have to be retained between renders, and most elements contain only zero or one child, so avoiding the allocation of an extra array for every element in the tree can noticeably reduce memory requirements.

Therefore, the `children` prop should be treated as a black box, only to be rendered somewhere within a component’s returned or yielded children. Attempting to iterate over or manipulate the passed in children of a component is an anti-pattern, and you should use [event dispatch](./handling-events#dispatching-events) or [provisions](./reusable-logic#provisions) to coordinate ancestor and descendant components.

## Special DOM Props

The following props are specific to host elements for the HTML and DOM renderers.

### style
The style prop can be used to add inline styles to an element. It can either be a CSS string, in which case it works exactly as it does in HTML, or it can also be an object, in which case CSS properties can be set individually. The latter is helpful, for example, if you have an outside process that handles animating CSS styles and you don't want to reset them during a component re-render.

```jsx
<div style="color: red"><span style={{"font-size": "16px"}}>Hello</span></div>
```

**Note:** Unlike other JSX frameworks, Crank does not camel-case style names or add pixel units to numbers.

### innerHTML
The `innerHTML` prop can be used to set the element’s children with an HTML string.

Be careful when using the `innerHTML` prop, as passing unsanitized text inputs can lead to security vulnerabilities.

As an alternative, you can also use [the special `Raw` element tag](#raw), which allows to inject raw HTML or even actual DOM nodes into the element tree, without requiring a parent host element.

### Prop Naming Conventions
Crank strives to make copying and pasting HTML into your components as easy as possible, and to this extent it allows you to use `class` and `for` as props in your elements instead of `className` and `htmlFor`.

```jsx
<label class="my-label" for="my-id">Label</label>
```

You can still use the `className` and `htmlFor` props as well, but using the former names is preferred. This philosophy also extends to SVG elements, and you can use props like `clip-path` and `stroke-width` without having to camel case them.

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

### Copy
It‘s often fine to rerender Crank components, because elements are diffed, persistent between renders, and unnecessary mutations usually avoided. However, you might want to prevent a child from updating when the parent rerenders, perhaps because a certain prop hasn’t changed, because you want to batch updates from the parent, or as a performance optimization. To do this, you can use the `Copy` tag to indicate to Crank that you don’t want to update a previously rendered element in that same position.

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

In this example, `memo` is a higher-order component, a function which takes a component and returns a component. This wrapper component compares old and new props and yields a `Copy` element if every prop is shallowly equal. A `Copy` element can appear anywhere in an element tree to prevent rerenderings, and the only props `Copy` elements take are the `crank-key` and `crank-ref` props, which work as expected.

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

This tag is useful for creating modals or tooltips, which usually need to be rendered into separate DOM elements at the bottom of the page for visibility reasons. Events dispatched from a `Portal` element‘s child components via the `dispatchEvent` method will still bubble into parent components.

### Raw
Sometimes, you may want to insert raw HTML or actual DOM nodes directly into the element tree. Crank allows you to do this with the `Raw` element. The `Raw` element takes a `value` prop which is interpreted by the renderer. For the DOM renderer, if `value` is an HTML string, the renderer will parse and insert the resulting DOM nodes. If the value is already a DOM node, Crank will insert them in place.

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

Be careful when using `Raw` elements, as passing unsanitized text inputs can lead to security vulnerabilities.
