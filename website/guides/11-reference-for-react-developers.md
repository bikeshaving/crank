---
title: Reference for React Developers
---

Though Crank is inspired by React, compatibility is a non-goal, and certain concepts may be implemented using different, non-compatible APIs. The following is a reference for React developers to help them map React concepts and APIs to their equivalents in Crank.

## Class-based Components
Crank uses functions exclusively for components; it does not provide a class-based component API. You can emulate most of React’s class API with the natural lifecycle of generator functions.

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

The example is pseudocode which demonstrates where React’s class methods would be called relative to an async generator component. Refer to the [guide on lifecycles](./lifecycles) for more information on using generator functions.

The following are specific equivalents for React methods.

### `setState` and `forceUpdate`
Crank uses generator functions and local variables for local state. Refer to [the section on stateful components](./guides/components#stateful-components).

Crank is not “reactive” in the same sense as React, in that it does not actually track your component’s local state. You can either use `Context.prototype.refresh` to manually refresh the component, much like React’s `forceUpdate` method, or you can use async generator components, which refresh automatically whenever the returned async generator yields.

### `defaultProps`
Crank doesn’t have a `defaultProps` implementation. Instead, you can provide default values when destructuring props. [See the guide on default props](./components#default-props).

### `componentWillMount` and `componentDidMount`
Setup code for components can be written at the top of generator components. It will not execute until the component is mounted in the tree.

### `shouldComponentUpdate`
As an alternative to React’s `shouldComponentUpdate` method, you can use `Copy` elements to prevent the rerendering of a specific subtree. Refer to [the description of `Copy` elements](./special-props-and-tags#copy) for more information.

### `getDerivedStateFromProps`, `componentWillUpdate` and `getSnapshotBeforeUpdate`
Code which compares old and new props or state can be written directly in your components. See the section on [`prop updates`](./components#comparing-old-and-new-props) for an example of a component which compares old and new props.

### `componentDidUpdate`
To execute code after rendering, you can use async generator components or [the `schedule` method](./api-reference#schedule). See [the guide on accessing rendered values](./lifecycles#accessing-rendered-values) for more information.

### `componentWillUnmount`
You can use a `try`/`finally` block to run code when a component is unmounted. You can also use [the `cleanup` method](./api-reference#cleanup) if you’re writing extensions which don’t run in the main execution of the component.

### `componentDidCatch`
To catch errors which occur in child components, you can use generator components and wrap `yield` operations in a `try`/`catch` block. Refer to [the relevant guide on catching errors](./lifecycles#catching-errors).

## Hooks
Crank does not implement any APIs similar to React Hooks. The following are alternatives to specific hooks.

### `useState` and `useReducer`
Crank uses generator functions and local variables for local state. Refer to [the section on stateful components](./components#stateful-components).

### `useEffect` and `useLayoutEffect`
Crank does not have any requirements that rendering should be “pure.” In other words, you can trigger side-effects directly while rendering because Crank does not execute components more times than you might expect. 

### `useMemo` and `useCallback`
Because the execution of generator components is preserved, there is no need to “memoize” or “cache” callbacks or other values. You can simply assign them to a constant variable.

### `useImperativeHandle`
Crank does not have a way to access component instances, and parent components should not access child components directly. A wrapper which uses web components for the definition of custom elements with imperative methods and properties is planned.

### Custom Hooks
The main appeal of hooks for library authors is that you can encapsulate entire APIs in one or two hooks. Refer to [the guide on reusable logic](./reusable-logic#strategies-for-reusing-logic) for various patterns and strategies to wrap APIs and logic in Crank.

## Suspense and Concurrent Mode
Crank uses async functions and promises for scheduling and coordinating async processes. See the [guide on async components](./async-components) for an introduction to async components, as well as a demonstration of how you can implement the `Suspense` component directly in user space.

## PropTypes
Crank is written in TypeScript, and you can add type checking to components by typing the props parameter of the component function. See [the guide on TypeScript](./working-with-typescript) for detailed instructions on how to type components.

## Array Children
Crank does not restrict children in JSX elements to just arrays. You can interpolate ES6 maps, sets or any other iterable into your Crank elements. Additionally, Crank does not warn you if elements in the iterable are unkeyed.

## Fragments
The [`Fragment` element](./special-props-and-tags#fragment) works almost exactly the same as it does in React, except in Crank you can also use a callback ref to access its contents.

## `React.cloneElement`
You can clone elements using [the `cloneElement` function](./api-reference#cloneelement).

## `ReactDOM.createPortal`
The `createPortal` function is replaced by the special `Portal` element, whose behavior and expected props varies according to the target rendering environment. Refer to [the guide on the `Portal` element](./special-props-and-tags#portal) for more information.

## `React.memo`
See [the guide on `Copy` elements](./special-props-and-tags#copy) for a demonstration of how you can use the `Copy` tag to implement `React.memo` in user space.

## DOM element props
The following are a list of the differences in APIs when passings props to DOM elements.

### `className` and `htmlFor`
We prefer attribute names rather than the JS property equivalents when the two diverge. 

```jsx
<label class="my-label" for="my-id">Label</label>
````

See [the section on prop naming conventions](./special-props-and-tags#prop-naming-conventions) for more information.

### `style`
The `style` prop value can be an object of CSS declarations. However, unlike React, CSS property names match the case of their CSS equivalents, and we do not add units to numbers. Additionally, Crank allows the style prop to be a CSS string as well.

```jsx
  <div style="color: red"><span style={{"font-size": "16px"}}>Hello</span></div>
```

### Event props
Host elements can be listened to using `onevent` props, but the prop name is always lowercase. Crank also provides an `EventTarget` API for components to add and remove event listeners from the top-level node or nodes of each component. In both cases, Crank does not use a synthetic event system or polyfill events in any way. Refer to [the guide on event handling](./handling-events).

### Controlled and Uncontrolled Props
Crank does not have a concept of controlled or uncontrolled props, and does not provide `defaultValue`-style props for DOM elements. See [the section on form elements](./handling-events#form-elements) for a detailed description of how Crank handles form elements.

### `dangerouslySetInnerHTML`
Host DOM elements accept an `innerHTML` prop; Crank does not provide the `dangerouslySetInnerHTML={{__html}}` API like React. Alternatively, you can use the special `Raw` tag to insert HTML strings or even DOM nodes directly into an element tree without a parent. [See the guide on the `Raw` element](./special-props-and-tag#raw) for more information.

## Keys
Crank provides keyed rendering via the `crank-key` prop. The prop was renamed because “key” is a common word and because the prop is not erased from the props object passed into components.

Keys work similarly to the way they do in React. The main difference is that Crank does not warn about unkeyed elements which appear in arrays or iterables.

## Refs
Crank provides the callback-style ref API from React via the `crank-ref` prop. Unlike React, all elements can be read using the `crank-ref` prop, including Fragments, and . See the [guide on the `crank-ref` prop](./special-props-and-tags#crank-ref).

You can also access values many other ways. See the [guide on accessing rendered values](./lifecycles#accessing-rendered-values) for more information.

## React Contexts
Because we refer to the `this` keyword of components as “the component’s context” (“controller” would have been three more characters), we refer to the equivalent concept of [React’s Context API](https://reactjs.org/docs/context.html) as “provisions” instead. We use the methods `get` and `set` to define provisions between components. See [the guide on provisions](./reusable-logic#provisions) for more information.
