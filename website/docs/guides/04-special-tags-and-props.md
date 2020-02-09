---
title: Special Props and Tags
---
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
At this point, you have all the knowledge needed to understand Crank’s TodoMVC application. [Check it out here.](https://codesandbox.io/s/crank-todomvc-k6s0x)
