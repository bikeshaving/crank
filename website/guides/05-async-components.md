---
title: Async Components
---

## Async Function Components
So far, every component we’ve seen has worked synchronously, and Crank will respect this as an intentional decision by the developer by keeping the entire process of rendering synchronous from start to finish. However, modern JavaScript includes promises and `async`/`await`, which allow you to write concurrently executing code as if it were synchronous. To facilitate these features, Crank allows components to be asynchronous functions as well, and we call these components, *async function components*.

```jsx
async function IPAddress () {
  const res = await fetch("https://api.ipify.org");
  const address = await res.text();
  return <div>Your IP Address: {address}</div>;
}

(async () => {
  await renderer.render(<IPAddress />, document.body);
  console.log(document.body.innerHTML); // <div>Your IP Address: 127.0.0.1</div>
})();
```

When Crank renders an async component anywhere in the tree, the entire process becomes asynchronous. Concretely, this means that `renderer.render` or `this.refresh` calls return a promise which fulfills when rendering has finished. It also means that no actual DOM updates will be triggered until this moment.

### Concurrent Updates
Because async function components can be rerendered while they are still pending, Crank implements a couple rules to make concurrent updates predictable and performant:

1. There can only be one pending run of an async function component at the same time for an element in the tree. If the same async component is rerendered concurrently while it is still pending, another call is enqueued with the latest props.

```jsx
async function Delay ({message}) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return <div>{message}</div>;
}

(async () => {
  const p1 = renderer.render(<Delay message="Run 1" />, document.body);
  console.log(document.body.innerHTML); // ""
  await p1;
  console.log(document.body.innerHTML); // "<div>Run 1</div>"
  const p2 = renderer.render(<Delay message="Run 2" />, document.body);
  // These renders are enqueued because the second render is still pending.
  const p3 = renderer.render(<Delay message="Run 3" />, document.body);
  const p4 = renderer.render(<Delay message="Run 4" />, document.body);
  console.log(document.body.innerHTML); // "<div>Run 1</div>"
  await p2;
  console.log(document.body.innerHTML); // "<div>Run 2</div>"
  // By the time the third render fulfills, the fourth render has already completed.
  await p3;
  console.log(document.body.innerHTML); // "<div>Run 4</div>"
  await p4;
  console.log(document.body.innerHTML); // "<div>Run 4</div>"
})();
```

In the preceding example, at no point is there more than one simultaneous call to the `Delay` component, despite the fact that it is rerendered concurrently for its second through fourth renders. And because these renderings are enqueued, only the second and fourth renderings have any effect. This is because the element is busy with the second render by the time the third and fourth renderings are requested, and then, only the fourth rendering is actually executed because third rendering’s props are obsolete by the time the component is ready to update again. This behavior allows async components to always be kept up-to-date without producing excess calls to the function.

2. If two different async components are rendered in the same position, the components are raced. If the earlier component fulfills first, it shows until the later component fulfills. If the later component fulfills first, the earlier component is never rendered.

```jsx
async function Fast() {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return <span>Fast</span>;
}

async function Slow() {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return <span>Slow</span>;
}

(async () => {
  const p1 = renderer.render(<div><Fast /></div>, document.body);
  const p2 = renderer.render(<div><Slow /></div>, document.body);
  await p1;
  console.log(document.body.innerHTML); // "<div><span>Fast</span></div>"
  await p2;
  console.log(document.body.innerHTML); // "<div><span>Slow</span></div>"
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log(document.body.innerHTML); // "<div><span>Slow</span></div>"
})();

(async () => {
  const p1 = renderer.render(<div><Slow /></div>, document.body);
  const p2 = renderer.render(<div><Fast /></div>, document.body);
  await p1;
  console.log(document.body.innerHTML); // "<div><span>Fast</span></div>"
  await p2;
  console.log(document.body.innerHTML); // "<div><span>Fast</span></div>"
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log(document.body.innerHTML); // "<div><span>Fast</span></div>"
})();
```

As we’ll see later, this ratcheting effect becomes useful for rendering fallback states for async components.

<!--
TODO: this section is too hard to understand and requires code examples so we’re removing it for now.
### Async Children
When Crank encounters an async component anywhere in the element tree, the entire rendering process becomes asynchronous. Therefore, async child components make parent components asynchronous, and sync function and generator components behave differently when they produce async children. On the one hand, sync function components transparently pass updates along to async children, so that when a renderer updates a sync function component concurrently, its async children will also enqueue an update immediately. On the other hand, sync generator components which produce async elements will not resume until those async children have fulfilled. This is because sync generators expect to be resumed after their children have rendered, and the actual DOM nodes which are created are passed back into the generator, but they wouldn’t be available if the generator was concurrently resumed before the async children had settled.
-->

## Async Generator Components
Just as you can write stateful components with sync generator functions, you can also write stateful *async* components with *async generator functions*.

```jsx
async function *AsyncLabeledCounter ({message}) { 
  let count = 0;
  for await ({message} of this) {
    yield <div>Loading...</div>;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    count++;
    yield <div>{message} {count}</div>;
  }
}

(async () => {
  await renderer.render(
    <AsyncLabeledCounter message="The count is now: " />,
    document.body,
  );
  console.log(document.body.innerHTML); //<div>Loading...</div>
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log(document.body.innerHTML); //<div>The count is now: 1</div>
  await renderer.render(
    <AsyncLabeledCounter message="The count is now: " />,
    document.body,
  );
  console.log(document.body.innerHTML); //<div>Loading...</div>
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log(document.body.innerHTML); //<div>The count is now: 2</div>
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log(document.body.innerHTML); //<div>The count is now: 2</div>
})();
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
