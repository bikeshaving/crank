---
title: Reference for React Developers
---

Though Crank is inspired by React, compatibility is a non-goal, and certain concepts may be implemented using different, non-compatible APIs. The following is a reference for React developers to help them map React concepts and APIs to their equivalents in Crank.

## Class-based Components
Crank uses functions exclusively for components; it does not provide a class-based component API. You can emulate most of React’s Component class API with the natural lifecycle of a generator function:

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
      } else {
        yield <Copy />;
      }
    }
  } catch (err) {
    componentDidCatch(err);
  } finally {
    componentWillUnmount(ref);
  }
}
```

This is pseudocode which demonstrates where React’s methods would be called relative to an async generator component. Refer to the [guide on lifecycles](./lifecycles) for more information on using generator functions.

The following are specific equivalents for lifecycle methods.

### `setState` and `forceUpdate`
Crank uses generator functions and local variables for local state. Refer to [the section on stateful components](./guides/components#stateful-components).

Crank is not “reactive” in the same sense as React, in that it does not actually track your component’s local state. You can either use `Context.prototype.refresh` to manually refresh the component, much like React’s `forceUpdate` method, or you can use async generator components, which refresh automatically whenever the returned async generator object yields.

### `defaultProps`
Crank doesn’t have a `defaultProps` implementation. Instead, you can provide default values when destructuring props. [See the guide on default props](./components#default-props).

### `shouldComponentUpdate`
Components themselves do not provide a way to prevent updates to themselves. Instead, you can use `Copy` elements to prevent the rerendering of a specific subtree. [Refer to the description of `Copy` elements](./special-props-and-tags#copy) for more information.

### `componentWillMount` and `componentDidMount`
Setup code for components can be written at the top of generator components. It will not execute until the component is mounted in the tree.

### `getDerivedStateFromProps`, `componentWillUpdate` and `getSnapshotBeforeUpdate`
Code which compares old and new props or state and performs side-effects can be written directly in your components. See the section on [`prop updates`](./components#props-updates/) for examples of comparing old and new props.

### `shouldComponentUpdate`
Crank uses the special `Copy` element to prevent child updates. See the guide on the `Copy` element to see how you might reimplement `React.memo` directly in user space.

### `componentWillUnmount`
You can use `try`/`finally` to run code when the component is unmounted. You can also use the [`Context.prototype.cleanup`] method if you’re writing extensions which don’t run in the main execution of the component.

### `componentDidCatch`
To catch errors which occur in child components, you can use generator components and wrap `yield` operations in a `try`/`catch` block. Refer to [the relevant section in guides](#TK).

## Hooks
Crank does not implement any APIs similar to React Hooks. The following are alternatives to specific hooks.

### `useState` and `useReducer`
Crank uses generator functions and local variables for local state. Refer to [the section on stateful components](#TTKTKTKTKTKTKTK).

### `useEffect` and `useLayoutEffect`
Crank does not have any requirements that rendering should be “pure.” In other words, you can trigger side-effects directly while rendering because Crank does not execute components more times than you might expect. 

### `useMemo` and `useCallback`
Because the execution of generator components is preserved, there is no need to “memoize” or “cache” callbacks or other values. You can simply assign them to a constant variable.

### `useImperativeHandle`
Crank does not yet have a way to access component instances, and parent components should not access child contexts directly. An imperative wrapper which uses web components is planned.

### Custom Hooks
The main appeal of hooks for library authors is that you can encapsulate shared logic in hooks. Refer to [this guide on reusable logic](./reusable-logic) for Crank-specific APIs and strategies.

## Suspense and Concurrent Mode
Crank does not implement any sort of Suspense-like API. As an alternative, you can use async functions and async generator functions directly. See the [guide on async components](./async-components) for an introduction to async components, as well as a demonstration of how you can implement the `Suspense` component directly in user space.

## PropTypes
Crank is written in TypeScript, and you can add type checking to component elements by typing the props parameter of the component function.

## Fragments and array children
  There’s no reason to restrict children in JSX elements to just arrays. You can interpolate ES6 Maps, Sets or any other user-defined iterable into your Crank elements, and Crank will simply render them in an implicit `Fragment`.

## `React.cloneElement`
You can clone elements using the `cloneElement` function.

## `ReactDOM.createPortal`
The `createPortal` function is replaced by a special `Portal` element, whose behavior and expected props varies according to the target rendering environment. Refer to [the guide on the `Portal` element](#KTKTKTKT) for more information.

## `React.memo`
You can use `Copy` elements to implement `React.memo` in user space:
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

See [the guide on component elements](#TKTKTKTK) for more information.

## DOM element props
The following are a list of the differences in APIs when passings props to DOM elements.

### `className` and `htmlFor`
We prefer attribute names, rather than the JS property equivalents when the two diverge. 

```jsx
<label class="my-label" for="my-id">Label</label>
````

### `style`
```jsx
  <div style="color: red"><span style={{"font-size": "16px"}}>Hello</span></div>
```

The `style` prop value can be a `cssText` string, or an object, similar to React. Unlike React, the CSS property names match the case of their CSS equivalents, and we do not add units to numbers.

### Event props
Host elements can be listened to using `onevent` props, but the prop name is always lowercase. Crank also provides an `EventTarget` API for components to add and remove event listeners from the top-level nodes of each component. In both cases, Crank does not use a synthetic event system or polyfill events in any way. See [the guide on events for more information](./handling-events).

### Controlled and Uncontrolled Props
Crank does not have a concept of controlled or uncontrolled props, and does not provide `defaultValue`-style props for DOM elements.

### `dangerouslySetInnerHTML`
Host DOM elements accept an `innerHTML` prop; it does not provide the `dangerouslySetInnerHTML={{__html}}` API from React. Alternatively, you can use the special `Raw` tag to insert HTML strings or even nodes into the tree without a parent. [See the guide on the `Raw` element](./special-props-and-tag#raw) for more information.

## Keys
Crank provides keyed rendering via the `crank-key` prop. The prop was renamed because “key” is a common word and because the prop is not erased from the props object passed into components.

Keys work similarly to the way they do in React. The main difference is that Crank does not warn about unkeyed elements which appear in arrays or iterables.

## Refs
Crank provides the callback-style ref API from React via the `crank-ref` prop. See the [guide on the `crank-ref` prop](./special-props-and-tags#crank-ref). You can also access values many other ways. See the [guide on accessing rendered values](./lifecycles#accessing-rendered-values) for more information.

## React Contexts
Because we refer to the `this` keyword as the component’s “context,” we refer to the equivalent concept of [React Context API](https://reactjs.org/docs/context.html) as “provisions” instead. We use the methods `get` and `set` to define provisions between components. See [the guide on provisions](./reusable-logic#provisions) for more information.
