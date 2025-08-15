---
title: Special Props and Tags
---

While most props are passed directly to DOM elements or components, Crank reserves certain prop names for special framework behavior. These special props control element diffing, rendering optimization, and framework features.

Additionally, Crank provides special element tags that modify how elements are rendered or diffed. This guide covers both special props and special tags.

## Special Props
The following prop names have special behavior in Crank:

### key
The `key` prop helps Crank identify which elements have been added, moved, or removed when rendering lists. Without keys, Crank matches elements by position, which can cause issues when list items are reordered or inserted.

Keys are especially important for stateful components or elements with form inputs, where you want to preserve state when the list changes.

```jsx live
import {renderer} from "@b9g/crank/dom";

let nextId = 0;
function *ID() {
  const id = nextId++;
  for ({} of this) {
    yield <div>Id: {id}</div>;
  }
}

function *List() {
  let reversed = false;
  const onclick = () => this.refresh(() => reversed = !reversed);

  for ({} of this) {
    yield (
      <div>
        {
          reversed ? (
            <>
              <ID key="d" />
              <ID key="c" />
              <ID key="b" />
              <ID key="a" />
            </>
          ) : (
            <>
              <ID key="a" />
              <ID key="b" />
              <ID key="c" />
              <ID key="d" />
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

All elements in the element tree can be keyed. They are scoped to siblings, and can be any JavaScript value. The most common use-case is when rendering iterables, as the iterable can be rearranged.

```jsx live
import {renderer} from "@b9g/crank/dom";

function *Shuffler() {
  let nextId = 0;
  const els = Array.from({length: 4}, (_, i) => <span key={i}>{i}</span>);
  for ({} of this) {
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

### ref
Sometimes, you may want to access the rendered value of a specific element in the element tree. To do this, you can pass a callback as the `ref` prop. This callback is called with the rendered value of the element when the element has committed.

```jsx live
import {renderer} from "@b9g/crank/dom";

function *MyPlayer() {
  let audio;
  for ({} of this) {
    yield (
      <div>
        <button onclick={() => audio.play()}>Play sound</button>
        <audio
          src="/static/t-rex-roar.mp3"
          controls={false}
          ref={(el) => (audio = el)}
        />
      </div>
    );
  }
}

renderer.render(<MyPlayer />, document.body);
```

Ref callbacks fire once the first time a host element is rendered. They do not work on fragment elements. For component elements, the `ref` prop must be explicitly passed to a component's child. This is useful when writing elements which wrap a host element.

```jsx
function MyInput({ref, class, ...props}) {
  return <input ref={ref} class={"my-input-class " + class} ...props />
}
```

### copy

The `copy` prop is used to prevent the re-rendering of any element and its children. It can be a boolean or a string that specifies which props to copy from the previous render.

#### Boolean copy prop

A truthy value indicates that the element should not re-render. It can be used to prevent rendering, or for performance reasons.

```jsx
function* List({elements}) {
  for ({elements} of this) {
    yield (
      <ul>
        {elements.map((el) => {
          // The copy prop will prevent non-initial renders from updating the DOM.
          return (
            <li copy={!el.hasChanged}>
              {el.value}
            </li>
          );
        })}
      </ul>
    );
  }
}
```

#### String copy prop (0.7+)

Starting in Crank 0.7, the `copy` prop can be a string to specify which props should be copied from the previous render. This provides fine-grained control over what gets updated.

```jsx
// Copy all props except value (useful for leaving the value uncontrolled)
<input copy="!value" type="text" placeholder="Enter text..." />

// Copy only specific props
<div copy="class id" class="container" id="main" data-test="foo" />

// Copy children from previous render
<div copy="children" class="dynamic-class">
  {/* children will be preserved from previous render */}
</div>
```

**String copy syntax:**
- `copy="!value"` - Copy all props except `value`
- `copy="class children"` - Copy only `class` and `children` props
- Cannot mix bang (`!`) and non-bang syntax in the same string

### hydrate

The `hydrate` prop provides fine-grained control over server-side rendering hydration. It works similarly to the `copy` prop but specifically for hydration behavior.

```jsx
// Disable hydration for entire subtree
<div hydrate={false}>
  {/* This content won't be hydrated, stays as server-rendered */}
</div>

// Include portal children in hydration  
<Portal hydrate={true}>
  {/* Portal children will be hydrated */}
</Portal>

// Selective prop hydration (like copy prop)
<input hydrate="!value" type="text" placeholder="Will hydrate" />
<div hydrate="class id" class="hydrated" id="main" data-skip="ignored" />
```

**Hydrate prop behavior:**
- `hydrate={false}` - Skip hydration entirely for this element and children
- `hydrate={true}` - Force hydration (useful for portals)
- `hydrate="!value"` - Hydrate all props except `value`
- `hydrate="class id"` - Hydrate only `class` and `id` props

This is particularly useful when you have server-rendered content that should remain static, or when dealing with third-party widgets that shouldn't be disturbed during hydration.

For comprehensive hydration patterns, best practices, and advanced techniques, see the [Hydration guide](/guides/hydration).

### children
The `children` prop passed to components is special because it is not usually set with JSX's `key="value"` prop syntax, but by the contents between the opening and closing tags. It is the responsibility of the component to make sure the `children` passed in are rendered in its yielded or returned element tree.

```jsx
function Component({children}) {
  console.log(children);
  return (
    <div>{children}</div>
  );
}

renderer.render(<Component>Hello world</Component>, document.body);
// logs "Hello world"

renderer.render(
  <Component>
    <div>1</div>
    <div>2</div>
    <div>3</div>
  </Component>,
  document.body,
);
// logs an array of virtual elements representing the child divs.
```


## Special DOM Props

The following props are specific to host elements for the HTML and DOM renderers.

### style
The style prop can be used to add inline styles to an element. It can either be a CSS string, in which case it works exactly as it does in HTML, or it can also be an object, in which case CSS properties can be set individually. The latter is helpful, for example, if you have an outside process that handles animating CSS styles and you don't want to reset them during a component re-render.

```jsx
<div style="color: red"><span style={{"font-size": "16px"}}>Hello</span></div>
```

**Note:** Unlike other frameworks like React, Crank does not camel-case style names or add pixel units to numbers.

### innerHTML
The `innerHTML` prop can be used to set the element’s children with an HTML string.

Be careful when using the `innerHTML` prop, as passing unsanitized text inputs can lead to security vulnerabilities.

As an alternative, you can also use [the special `Raw` element tag](#raw), which allows to inject raw HTML or even actual DOM nodes into the element tree, without requiring a parent host element.

### class

The `class` prop accepts both strings and objects for convenient class name management.

#### String class prop
```jsx
<label class="my-label active" for="my-id">Label</label>
```

#### Object class prop (0.7+)
Starting in Crank 0.7, the `class` prop can accept an object for basic `clsx`/`classnames` behavior:

```jsx
function *Button() {
  let isActive = false;
  let isDisabled = false;

  for ({} of this) {
    yield (
      <button
        class={{
          btn: true,
          'btn-active': isActive,
          'btn-disabled': isDisabled,
          'btn-large': true
        }}
        onclick={() => this.refresh(() => isActive = !isActive)}
      >
        Toggle
      </button>
    );
  }
}

// Equivalent to: class="btn btn-large" (when inactive)
// Or: class="btn btn-active btn-large" (when active)
```

**Benefits of object class prop:**
- Conditional classes without string concatenation
- Uses `classList.add()` and `classList.remove()` under the hood
- Preserves classes added by third-party scripts
- Prevents clobbering of external class modifications

### Prop Naming Conventions
Crank strives to make copying and pasting HTML into your components as easy as possible, and to this extent it allows you to use `class` and `for` as props in your elements instead of `className` and `htmlFor`.

```jsx
<label class="my-label" for="my-id">Label</label>
```

You can still use the `className` and `htmlFor` props as well, but using the former names is preferred. This philosophy also extends to SVG elements, and you can use props like `clip-path` and `stroke-width` without having to camel case them.

## Special Tags

Crank provides five special element tags which modify renderer behavior, affecting element diffing and rendering output in various ways.

### Fragment
Crank provides a `<Fragment>` tag, which allows you to render multiple children into a parent without wrapping them in another DOM node. Under the hood, iterables which appear in the element tree are also implicitly wrapped in a `<Fragment>` element by the renderer.

```jsx
import {Fragment} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";
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

It‘s often fine to rerender Crank components, because elements are diffed, persistent between renders, and unnecessary mutations usually avoided. However, you might want to prevent a child from updating when the parent rerenders, perhaps because a certain prop hasn’t changed, because you want to batch updates from the parent, or as a performance optimization. To do this, you can use the `<Copy>` tag to indicate to Crank that you don’t want to update a previously rendered element in that same position.

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
  return function *Wrapped(props) {
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

In this example, `memo` is a higher-order component, a function which takes a component and returns a component. This wrapper component compares old and new props and yields a `<Copy>` element if every prop is shallowly equal. A `<Copy>` element can appear anywhere in an element tree to prevent rerenderings, and the only props `<Copy>` elements take are the `key` and `ref` props, which work as expected.

### Portal
Sometimes you may want to render into a DOM node which isn’t the current parent element, or even a part of the currently rendered DOM tree, as in the case of modals. You can do this with the `<Portal>` tag, passing in a DOM node as its `root` prop. The `<Portal>` element’s children will be rendered into the specified root element, just as if `renderer.render()` was called with the root value as its second argument.

```jsx live
import {Portal} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";
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
Sometimes, you may want to insert raw HTML or actual DOM nodes directly into the element tree. Crank allows you to do this with the `<Raw>` element. The `<Raw>` element takes a `value` prop, which can be . For the DOM renderer, if `value` is an HTML string, the renderer will parse and insert the resulting DOM nodes. If the value is already a DOM node, Crank will insert them in place.

```jsx
import {Raw} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";
// TODO: live preview doesn't work for this example because unpkg is 500ing
import marked from "marked";

function MarkdownViewer({markdown=""}) {
  const html = marked(markdown);
  return (
    <div>
      <Raw value={html} />
    </div>
  );
}

renderer.render(<MarkdownViewer markdown="*hello* **world**" />);
```

Be careful when using `<Raw>` elements, as passing unsanitized text inputs can lead to security vulnerabilities.

### Text

The `<Text>` element provides explicit control over text node creation. Starting in Crank 0.7, renderers return actual `Text` nodes instead of strings, and the `<Text>` element allows you to create these nodes explicitly.

```jsx
import {Text} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";

// Explicit text node creation
function Component() {
  return <Text value="Hello world" />;
}

// Components can access Text nodes directly
function *InteractiveText() {
  this.schedule((node) => {
    if (node instanceof Text) {
      node.textContent = "Updated!";
      console.log("Got actual Text node:", node);
    }
  });

  for ({} of this) {
    yield "Initial text"; // This becomes a Text node
  }
}

// Each string gets its own Text node (no more concatenation)
function MultipleTexts() {
  return (
    <div>
      {"First "}{"Second "}{"Third"} // Three separate Text nodes
    </div>
  );
}
```

**Benefits of explicit Text elements:**
- Direct access to DOM Text nodes in lifecycle callbacks
- Better performance during reconciliation and hydration
- Improved text node tracking and manipulation
- No automatic string concatenation - each string becomes its own node

The `<Text>` element is particularly useful when you need precise control over text content or when integrating with libraries that manipulate text nodes directly.
