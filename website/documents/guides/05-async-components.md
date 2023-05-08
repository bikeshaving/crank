---
title: Async Components
---

So far, every component we’ve seen has been a sync function or sync generator component. Crank processes element trees containing synchronous components instantly, ensuring that by the time `renderer.render()` or `this.refresh()` completes execution, rendering will have finished, and the DOM will have been updated.

Nevertheless, a JavaScript component framework would not be complete without a way to work with promises. Luckily, Crank also allows any component to be async the same way you would make any function asynchronous, by adding an `async` before the `function` keyword. Both *async function* and *async generator components* are supported. This feature means you can `await` promises in the process of rendering in virtually any component.

```jsx live
import {renderer} from "@b9g/crank/dom";
async function Definition({word}) {
  // API courtesy https://dictionaryapi.dev
  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
  const data = await res.json();
  const {phonetic, meanings} = data[0];
  const {partOfSpeech, definitions} = meanings[0];
  const {definition} = definitions[0];
  return <>
    <p>{word} <code>{phonetic}</code></p>
    <p><b>{partOfSpeech}.</b> {definition}</p>
    {/*<pre>{JSON.stringify(data, null, 4)}</pre>*/}
  </>;
}

await renderer.render(<Definition word="framework" />, document.body);
```

When rendering is async, `renderer.render()` and `this.refresh()` will return promises which settle when rendering has finished.

### Concurrent Updates
The nature of declarative rendering means that async components can be rerendered while they are still pending. Therefore, Crank implements a couple rules to make concurrent updates predictable and performant:

1. There can only be one pending run of an async component at the same time for an element in the tree. If the same async component is rerendered concurrently while it is still pending, another call is enqueued with the updated props.

```jsx live
import {renderer} from "@b9g/crank/dom";
async function Delay ({message}) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return <div>{message}</div>;
}

renderer.render(<Delay message="Run 1" />, document.body);
await p1;
renderer.render(<Delay message="Run 2" />, document.body);
// These renders are enqueued because the second render is still pending.
// The third render is dropped because when the second run fulfills, there is
// already a fourth run which provides the latest props.
renderer.render(<Delay message="Run 3" />, document.body);
renderer.render(<Delay message="Run 4" />, document.body);
```

In the preceding example, at no point is there more than one simultaneous call to the `<Delay>` component, despite the fact that it is rerendered concurrently for its second through fourth renders. And because these renderings are enqueued, only the second and fourth renderings have any effect. This is because the element is busy with the second render by the time the third and fourth renderings are requested, and then, only the fourth rendering is actually executed because third rendering’s props are obsolete by the time the component is ready to update again. This behavior allows async components to always be kept up-to-date without producing excess calls.

2. If two different async components are rendered in the same position, the components are raced. If the earlier component fulfills first, it shows until the later component fulfills. If the later component fulfills first, the earlier component is never rendered.

```jsx live
import {renderer} from "@b9g/crank/dom";

async function Fast() {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return <span>Fast</span>;
}

async function Slow() {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return <span>Slow</span>;
}

// TODO: flip the order of these calls and watch the behavior.
renderer.render(<Fast />, document.body);
renderer.render(<Slow />, document.body);
```

As we’ll see later, this “ratcheting” effect becomes useful for rendering fallback states for async components.

## Async Generator Components
Just as you can write stateful components with sync generator functions, you can also write *stateful* async components with async generator functions.

```jsx live
import {renderer} from "@b9g/crank/dom";
renderer.render(<Dictionary />, document.body);
```

`AsyncLabeledCounter` is an async version of the `LabeledCounter` example introduced in [the section on props updates](./components#props-updates). This example demonstrates several key differences between sync and async generator components. Firstly, rather than using `while` or `for…of` loops as with sync generator components, we now use [a `for await…of` loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of). This is possible because contexts are not just an *iterable* of props, but also an *async iterable* of props as well.

Secondly, you’ll notice that the async generator yields multiple times per iteration over `this`, once to show a loading message and once to show the actual count. While it is possible for sync generators components to yield multiple times per iteration over `this`, it wouldn’t necessarily make sense to do so because generators suspend at each yield, and upon resuming a second time within the same loop, the props would be stale. In contrast, async generator components are continuously resumed. Rather than suspending at each yield, we rely on the `for await…of` loop, which suspends at its end until the next update.

### Loading Indicators
The async components we’ve seen so far have been all or nothing, in the sense that Crank can’t show anything until all promises in the tree have fulfilled. This can be a problem when you have an async call which takes longer than expected. It would be nice if parts of the element tree could be shown without waiting, to create responsive user experiences.

However, because loading indicators which show immediately can paradoxically make your app seem less responsive, we use the async rules described previously along with async generator functions to show loading indicators which appear only when certain components take too long.

```jsx
async function LoadingIndicator() {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return <div>Fetching a good boy...</div>;
}

async function RandomDog({throttle = false}) {
  const res = await fetch("https://dog.ceo/api/breeds/image/random");
  const data = await res.json();
  if (throttle) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return (
    <a href={data.message}>
      <img src={data.message} alt="A Random Dog" width="300" />
    </a>
  );
}

async function *RandomDogLoader({throttle}) {
  for await ({throttle} of this) {
    yield <LoadingIndicator />;
    yield <RandomDog throttle={throttle} />;
  }
}

function *RandomDogApp() {
  let throttle = false;
  this.addEventListener("click", (ev) => {
    if (ev.target.tagName === "BUTTON") {
      throttle = !throttle;
      this.refresh();
    }
  });

  while (true) {
    yield (
      <Fragment>
        <div>
          <button>Show me another dog.</button>
        </div>
        <RandomDogLoader throttle={throttle} />
      </Fragment>
    );
  }
}

renderer.render(<RandomDogApp />, document.body);
```

In this example, the `RandomDogLoader` component is an async generator component which races the `LoadingIndicator` component with the `RandomDog` component. Because the async generator component resumes continuously, both components are rendered, and according to the second rule of async components, the loading indicator only shows if the `RandomDog` component takes longer than the `LoadingIndicator` component, which fulfills at a fixed interval of one second.

The preceding example hints at how we could abstract this pattern to implement the `Suspense` component from React.

```jsx
async function Fallback({timeout = 1000, children}) {
  await new Promise((resolve) => setTimeout(resolve, timeout));
  return children;
}

async function *Suspense({timeout, fallback, children}) {
  for await ({timeout, fallback, children} of this) {
    yield <Fallback timeout={timeout}>{fallback}</Fallback>;
    yield <Fragment>{children}</Fragment>;
  }
}

(async () => {
  await renderer.render(
    <Suspense fallback={<Spinner />}>
      <ProfilePage />
    </Suspense>,
    document.body,
  );
})();
```

No special tags are needed for async loading states, and the functionality to write this logic is implemented using the same element diffing algorithm that governs synchronous components. Additionally, this approach is more flexible in the sense that you can extend it; for instance, you can add another yield to the `for await…of` loop to show a second fallback state which waits ten seconds, to inform the user that something went wrong or that servers are slow to respond.
