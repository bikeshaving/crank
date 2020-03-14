---
title: Differences from React
---
Though Crank is very much inspired by and similar to React, exact compatibility is a non-goal, and we’ve used this as opportunity to “fix” a lot of pain points with React which bothered us over the years. The following is a list of differences with React, as well as justifications for why we chose to implement features differently.

## No Component class, no hooks.
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

## No `setState` or `useState`
React has always tightly coupled component updates with the concept of local state. Because Crank uses generator functions, state is just local variables which is modified by local functions, and you can call `this.refresh()` to update the UI to match state. Decoupling these two concerns allows for more nuanced updates to components without `shouldComponentUpdate` hacks, and is easier to reason about than relying on the framework to provide local state.

## No `Suspense`
The project known as React `Suspense` is likely both a boondoggle and vaporware. It relies on the unusual mechanism of throwing promises, has the hard requirement of a caching mechanism, and is generally difficult to reason about. By leveraging async functions and async generators, Crank allows you to implement the `Suspense` element in user-space. No argument from the React team about the necessity of `Suspense` will ever justify it over the convenience provided by being able to use the `await` operator directly in components. 

## JSX looks like HTML.
###`for` not `htmlFor`, `class` not `className`
Crank does not place any restrictions on the names of JSX props. This means that you can write JSX like `<label class="my-label" for="my-id">Label</label>`.
## style can be a `cssText` string, style object uses snake-case, and `px` is not magically added to numbers.
```jsx
  <div style="color: red"><span style={{"font-size": "16px"}}>Hello</span></div>
```
## No “controlled”/“uncontrolled”, “value”/“defaultValue” components.
If you don’t want your component to be updated, don’t update it.
## No `dangerouslySetInnerHTML={{__html}}` props.
Just use the `innerHTML` prop. React doesn’t do anything to make setting `innerHTML` safe; they just make you type more and search for the exact spelling of `dangerouslySetInnerHTML` every month or so.
## Fragments can have `innerHTML`.
TKTKTK update for Raw
Fragment behavior can be overridden by renderers, and both the DOM and HTML renderers allow fragments to accept an innerHTML prop, allowing arbitrarily HTML to be written without a parent.
## Portals are just a special element tag.
Their behavior is defined by renderers, and all element trees are wrapped implicitly or explicitly in a root portal.
### No `componentDidUpdate` or `React.memo`.
Crank uses the special `Copy` element to prevent child updates.
## No `React.cloneElement`
Elements are just plain-old JavaScript objects, and there is no need to use a special method to copy them. You can re-use the same elements within generators, mutate them, or use spread syntax to shallowly copy them. Crank will handle reused elements gracefully.
## No event props
Event props in React are terrible for the following reasons:
 The EventTarget API takes more than just a function, it also takes options which allow you to register event listeners in the `capture` phase, register `passive` listeners, or register event listeners `once`. React has attempted to allow event handlers to be registered in the capture phase by adding props like `onClickCapture`, but embedding all these options in the prop name would be madness (`onClickCaptureOncePassive`). By emulating the event target API, Crank provides the full power of the `EventTarget` API.
## Stop doxxing event listeners.
Event listeners are difficult to name and make the most sense as anonymous functions which are made meaningful by the `type` it’s associated with. React developers often adopt a naming scheme to cache event listeners on component instances like `this.handleClick` to avoid `PureComponent`/`componentDidUpdate` de-optimizations, but if they only had to be defined once, we wouldn’t have to do this. Generator functions naturally allow components to define anonymous event listeners once when the component mounts, and the event target API provided by Crank automatically unregisters these listeners when components are thrown away. This means you never have to reason about when these functions are redefined or what they are capturing in their closures.
## Custom events are events, and they can be prevented or bubbled like regular DOM events.
When attempting to define custom event handler props in React, React developers will typically mimic the component props API and allow callbacks to be passed into the component, which the component author will then call directly when they want to trigger the event. This is a painful to do, because you often have to make sure the callback is defined on props, because they are usually optional, and then React developers will also arbitrarily pass data to the callback which is not an event, making custom `onWhatever` props disanalogous with DOM event props, because DOM event props call callbacks with an event. There is no standard for what event-like callback props are called with in React, and there is no way for components to allow parents to prevent default behavior by calling `ev.preventDefault` as you would with a regular DOM event. Worst of all, these props must be passed directly from parent to child, so if a component wants to listen to an event in a deeply nested component, event handlers must either be passed using React contexts, or passed explicitly through each component layer, at each layer renamed to make sense for each nested component API.

Crank avoids this sitution by mimicking the DOM EventTarget API, and allowing developers to create and bubble real `Event` or `CustomEvent` objects with `this.dispatchEvent`. These events can be namespaced, typed, and components can allow parents to cancel events.
## No refs
  React’s `ref` API has undergone multiple revisions over the years and it’s only gotten more confusing/difficult to use. Crank passes rendered DOM nodes and strings back into generator functions, so you can access them by reading the result of `yield` expressions in generators. You can assign these “refs” to local variables and treat them as you would any local variable without worry.
## Children can contain any kind of iterable, not just arrays.
  There’s no reason to restrict children in JSX elements to just arrays. You can interpolate ES6 Maps, Sets or any other user-defined iterable into your Crank elements, and Crank will simply render them in an implicit `Fragment`.
## Keys
### key has been named to `crank-key`.
In React, the `key` prop is special and erased from the props visible to components. Insofar as `key` is a common word, Crank namespaces `key` as `crank-key`.
### The elements of iterables don’t require unique keys.
Pestering the user to add unique keys to every element of an array is not something Crank will ever do, insofar as most of the time, developers just set the `key` to an `index` into the array. If the developer needs state to be preserved, they will eventually discover that it isn’t preserved in the course of normal development and add a key.
## No render props
Crank strongly discourages the React idiom of passing a function as children (or any other prop for that matter. “Render props” produce ugly and non-sensical syntax, and were a direct response to the lack of composability of React class components. Most if not all “render prop” patterns are easier to implement in Crank with the use of higher-order components which are passed component functions and props and produce elements of their own accord.
## Contexts
A feature equivalent to React Contexts is planned but not yet implemented.
