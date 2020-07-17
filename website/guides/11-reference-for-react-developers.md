---
title: Reference for React Developers
---

Though Crank is inspired by React, compatibility is a non-goal, and certain concepts may be implemented using different, non-compatible APIs. The following is a reference for React developers to help them map React concepts APIs to their equivalents in Crank.

## Class Components
Crank uses functions exclusively for components; it does not provide a class-based component API. You can emulate most of React’s Component class API with the natural lifecycle of an async generator function:

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

This is pseudocode which demonstrates where the methods of React would be called relative to an async generator component. Refer to the [guide on lifecycles](./lifecycles) for more information on using generator functions.

### `setState`
Crank uses generator functions and local variables for local state. Refer to [the section on stateful components](#TTKTKTKTKTKTKTK).

### `forceUpdate`
Crank is not “reactive” in the same sense as React, in that it does not actually know when your component’s local state is updated. You can either use `Context.prototype.refresh` to manually refresh the component, much like `forceUpdate`, or you can use async generator components, which refresh automatically whenever the async generator object fulfills.

### `defaultProps`
Crank doesn’t have a `defaultProps` implementation. Instead, you can provide default values when destructuring props.

### `shouldComponentUpdate`
Components themselves do not provide a way to prevent updates to themselves. Instead, you can use `Copy` elements to prevent the rerendering of a specific subtree. [Refer to the description of `Copy` elements](#TTKTKTK) for more information.

### `componentWillMount` and `componentDidMount`
Setup code can simply be written at the top of a generator component.

### `getDerivedStateFromProps`, `componentWillUpdate` and `getSnapshotBeforeUpdate`
Code which compares old and new props or state and performs side-effects can be written directly in your components. See the section on [`prop updates`](#TK) for examples of comparing old and new props. Additionally, check out the [`Context.prototoype.schedule`](#TKTKTK), which takes a callback which is called whenever the component commits.

### `componentWillUnmount`
You can use `try`/`finally` to run code when the component is unmounted. You can also use the [`Context.prototype.cleanup`] method if you’re writing extensions which don’t run in the main execution of the component.

### `componentDidUpdate`
Crank uses the special `Copy` element to prevent child updates. See the guide on the `Copy` element to see how you might reimplement `React.memo` directly in user space.

### Error Boundaries/`componentDidCatch`
To catch errors which occur in child components, you can use generator components and wrap `yield` operations in a `try`/`catch` block. Refer to [the relevant section in guides](#TK).

## Hooks
Crank does not implement any APIs similar to React Hooks. The following are alternatives to specific hooks.

### `useState` and `useReducer`
Crank uses generator functions and local variables for local state. Refer to [the section on stateful components](#TTKTKTKTKTKTKTK).

### `useEffect` and `useLayoutEffect`
Crank does not have any requirements that rendering should be “pure.” In other words, you can trigger side-effects directly while rendering because Crank does not execute components more times than you might expect. 

### `useMemo` and `useCallback`
TTKTK

### `useImperativeHandle`
Crank does not yet have a way to access component instances, and parent components should not access child contexts directly. An imperative wrapper which uses web components is planned.

### Custom Hooks
The main appeal of hooks for library authors is that you can encapsulate shared logic in hooks. Refer to the [guide on reusable logic](./reusable-logic) for some patterns for reusing logic between components.

## Suspense and Concurrent Mode
Crank does not implement any sort of Suspense-like API. As an alternative, you can use async functions and async generator functions directly. See the [guide on async components](./async-components) for an introduction to async components, as well as a demonstration of how you can implement the `Suspense` component directly in user space.

## `PropTypes`
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

### `htmlFor` and `className`
Crank does not place any restrictions on the names of props. This means that you can write JSX like `<label class="my-label" for="my-id">Label</label>`.

### The `style` prop.
```jsx
  <div style="color: red"><span style={{"font-size": "16px"}}>Hello</span></div>
```

The `style` prop value can be a `cssText` string, or an object, similar to React. Unlike React, the CSS property names match the case of their CSS equivalents, and we do not add units to numbers.

### `onevent` props
Crank provides `onevent` props, but they work using the DOM `onevent` props. Crank also provides an `EventTarget` API for components which adds and removes event listeners from the top-level nodes of each component. In both cases, Crank does not use a synthetic event API or shim events. See [the guide on events for more information](#TKTKTKTKTK).

### Controlled and Uncontrolled Props
Crank does not have a concept of controlled or uncontrolled props, and does not provide `defaultValue`-style props for DOM elements. Instead, Crank renderers adopt the convention that renderers only mutate the props specified in the . For instance

### `dangerouslySetInnerHTML`
Crank elements accept an `innerHTML` prop. Alternatively, you can use the special `Raw` tag to insert arbitrary HTML strings or even nodes in the tree. [See the guide on the `Raw` element](#TKTK) for more information.

## Keys
Crank provides keyed rendering via the `crank-key` prop. The prop was renamed because “key” is a common word and because the prop is not passed directly into child objects.

Keys work similarly to the way they do in React. The main difference is that Crank does not require elements which appear in arrays or iterables to be keyed.

## Refs
Crank provides the callback ref API from React via the `crank-ref` prop. Crank does not TKTKTKT

## React Contexts
Because we refer to the `this` keyword as the component’s “context,” we refer to the equivalent concept of [React Contexts](#TK) as “provisions” instead.
