---
title: Async Components
---

So far, every component we’ve seen has been a synchronous function or generator component. Crank processes synchronous components immediately, ensuring that by the time `renderer.render()` or the `refresh()` method completes execution, rendering will have finished.

Nevertheless, a JavaScript framework would not be complete without a way to work with promises. To this end, Crank simply allows any component to be async the same way you would make any function asynchronous: by making the function asynchronous. Both *async function* and *async generator components* are supported. This means you can `await` promises in any component.

```jsx live
import {renderer} from "@b9g/crank/dom";
async function Definition({word}) {
  // API courtesy https://dictionaryapi.dev
  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
  const data = await res.json();
  if (data[0] == null) {
    return <p>{word} not found</p>;
  }

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

When rendering is async, `renderer.render()` and the `refresh()` method will return promises which settle when rendering has finished.

### Concurrent Updates
The nature of declarative rendering means that async components can be rerendered while they are still rendering. Therefore, Crank implements a couple rules to make concurrent updates predictable and performant:

1. There can be only one pending run of an async component at a time for an element in the tree. If the same async component is rerendered concurrently while a run is pending, another call is enqueued with the updated props.
   ```jsx live
   import {renderer} from "@b9g/crank/dom";
   async function Delay ({message}) {
     await new Promise((resolve) => setTimeout(resolve, 1000));
     return <div>{message}</div>;
   }

   await renderer.render(<Delay message="Run 1" />, document.body);
   renderer.render(<Delay message="Run 2" />, document.body);
   // The third and fourth renders are queued because the second render is still pending.
   renderer.render(<Delay message="Run 3" />, document.body);
   renderer.render(<Delay message="Run 4" />, document.body);
   ```
   In the preceding example, at no point is there more than one simultaneous call to the `<Delay>` component, despite the fact that it is rerendered concurrently for its second through fourth renders. And because these renderings are enqueued, the third rendering is skipped. This is because the element is busy with the second render by the time the third and fourth renderings are requested, and then, only the fourth rendering is actually executed because third rendering’s props are obsolete by the time the component is ready to update again. This behavior allows async components to always be kept up-to-date without producing excess calls.

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

    As we’ll see later, this “ratcheting” effect becomes useful for rendering loading indicators or placeholders for more responsive UIs.

## Async Generator Components
Just as you can write stateful components with sync generator functions, you can also write stateful async components with async generator functions. Async generator components work just like sync generator components when using `for...of` loops, to allow easy refactoring between sync and async.

```jsx live
import {renderer} from "@b9g/crank/dom";
async function *AsyncCounter() {
  let count = 0;
  const onclick = () => {
    count++;
    this.refresh();
  };

  for ({} of this) {
    await new Promise((r) => setTimeout(r, 1000));
    yield (
      <button onclick={onclick}>
        Button presed {count} time{count !== 1 && "s"}.
      </button>
    );
  }
}

renderer.render(<AsyncCounter />, document.body);
```

## Racing Components

The async components we’ve seen so far have been all or nothing, in the sense that nothing is rendered until the components have fulfilled. Nevertheless, it is often useful to show loading indicators or placeholders while these promises are pending, which appear only if a pending render is taking too long. In Crank, we do this by racing async components. Async components can be raced within an async generator component using the context as an async iterator (`for await...of`). By using an async iterator rather than the iterator, you can render multiple times for each update. This is possible because the update suspends and resumes based on the loop and not at each yield.

```jsx live
import {Fragment} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";

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

async function *RandomDogLoader({throttle}, ctx) {
  for await ({throttle} of ctx) {
    // Each time the component is rendered, both LoadingIndicator and RandomDog are raced
    yield <LoadingIndicator />;
    yield <RandomDog throttle={throttle} />;
  }
}

function *RandomDogApp({}, ctx) {
  let throttle = false;
  ctx.addEventListener("click", (ev) => {
    if (ev.target.tagName === "BUTTON") {
      throttle = !throttle;
      ctx.refresh();
    }
  });

  for ({} of ctx) {
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

In this example, the `<RandomDogLoader>` component is an async generator component which races the `<LoadingIndicator>` component with the `<RandomDog>` component. Because the async generator component resumes continuously, both components are rendered, and according to the second rule of async components, the loading indicator only shows if the `<RandomDog>` component takes longer than the `<LoadingIndicator>` component, which fulfills at a fixed interval of one second.

The preceding example hints at how we could abstract this pattern to implement the `Suspense` component from React.

```jsx
async function Fallback({timeout = 1000, children}) {
  await new Promise((resolve) => setTimeout(resolve, timeout));
  return children;
}

async function *Suspense({timeout, fallback, children}, ctx) {
  for await ({timeout, fallback, children} of ctx) {
    yield <Fallback timeout={timeout}>{fallback}</Fallback>;
    yield <Fragment>{children}</Fragment>;
  }
}

await renderer.render(
  <Suspense fallback={<Spinner />}>
    <ProfilePage />
  </Suspense>,
  document.body,
);
```

No special tags are needed for async loading states, and the functionality to write this logic is implemented using the same element diffing algorithm that governs synchronous components and DOM elements. Additionally, this approach is more flexible in the sense that you can extend it. For instance, you can add another yield to the `for await...of` loop to show a second fallback state which waits ten seconds, to inform the user that something went wrong or that servers are slow to respond.

## Three Async Generator Modes

As you can see, async generator components operate in two modes, *dependent*, where the component is suspended at each `yield` operator, and *independent*, where the component is continuously resumed at each `yield`. A component’s mode of operation is determined by whether it’s in a `for...of` or `for...await of` loop on the context. The `for...of` loop exactly mimics sync generator components for ease of refactoring, while the `for...await of` loop allows for more complicated rendering behavior.

```jsx
async function *Dependent({children}) {
  for ({children} of this) {
    yield children; // suspends at the yield
    // this line will not execute until the component is rerendered
    console.log("hello");
  }
}

async function *Independent({children} {
  for await ({children} of this) {
    yield children;
    // this line will run after the component has yielded
    console.log("hello");
    // suspends at the bottom of the loop
  }
}
```

Unlike sync generator components, if the component does not use a render loop, the component will continuously resume. In other words, an async generator component which uses a `while (true)` is run in an independent mode. Async generator components are designed this way so that you can return async iterators from components.

```jsx
async function *Independent({children}) {
  while (true) {
    yield children;
    // suspends only at each promise
    await new Promise((r) => setTimeout(r, 1000));
  }
}
```
