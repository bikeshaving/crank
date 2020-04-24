---
title: Special Props and Tags
---

The element diffing algorithm used by Crank is both declarative and efficient, but there are times when you might want to tweak the way it works. Crank provides special props and tags which produce different rendering behaviors.

## Special Props
### crank-key
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

Keys are scoped to an element’s children. When rendering iterables, it’s useful to key elements of the iterable, because in this case it’s common for elements to be added, removed or rearranged. Both host and component elements can be keyed with `crank-key`.

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

## Special Tags
Crank provides several element tags which have special meaning when rendering. In actuality, these tags are symbols and behave similarly to string tags, except they affect the diffing algorithm and output.

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

### Portal
Sometimes you may want to render into multiple DOM nodes from the same element tree. You can do this with the `Portal` tag, passing in a DOM node as its `root` prop. The Portal’s children will be rendered into the specified root. This is useful when writing modals or working with pages where you need to render into multiple entry-points. Events dispatched from a `Portal` element‘s child contexts via `this.dispatchEvent` will still bubble into parent component contexts.

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

In the example above, `memo` is a higher-order component, a function which takes a component and returns a component which compares new and old props and yields a `Copy` element if old and new props are shallowly equal. A `Copy` element can appear anywhere in an element tree to prevent rerenderings, and the only prop `Copy` elements take is the `crank-key` prop, allowing you to copy elements by key rather than position.

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
