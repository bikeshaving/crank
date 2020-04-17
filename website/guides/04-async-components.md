---
title: Asynchronous Components
---

## Async function components
So far, every component we’ve seen has worked synchronously, and Crank will respect this as an intentional decision by rendering your components synchronously from start to finish. However, modern JavaScript includes promises and `async`/`await`, allowing you to write concurrently executing code as if it were synchronous. To facilitate this style of code, Crank allows components to be asynchronous functions as well.

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

When a Crank renderer runs a component which returns a promise, the process of rendering becomes asynchronous as well. Concretely, this means that `renderer.render` itself will return a promise which fulfills when all async calls in the element tree have fulfilled at least once, and nothing will be added to the DOM until this happens.

### Concurrent updates
Because rendering can happen concurrently while async function components in the tree are still pending, Crank implements a couple rules to make concurrent updates predictable and performant:

1. There can only be one pending run of an element at the same time for the same tag and position. If the same async component is rerendered concurrently while it is still pending, another call is enqueued with the latest props.

```jsx
async function Delay ({message}) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return <div>{message}</div>;
}

(async () => {
  const p1 = renderer.render(<Delay message="Run 1" />, document.body);
  console.log(document.body.innerHTML); // ""
  await p1;
  console.log(document.body.innerHTML); // "Run 1"
  const p2 = renderer.render(<Delay message="Run 2" />, document.body);
  // this render is skipped because the second render is still pending
  const p3 = renderer.render(<Delay message="Run 3" />, document.body);
  const p4 = renderer.render(<Delay message="Run 4" />, document.body);
  console.log(document.body.innerHTML); // "Run 1"
  await p2;
  console.log(document.body.innerHTML); // "Run 2"
  await p3;
  console.log(document.body.innerHTML); // "Run 4"
  await p4;
  console.log(document.body.innerHTML); // "Run 4"
})();
```

In the example above, at no point is there more than one simultaneous call to the `Delay` component, despite the fact that it is rerendered concurrently for its second through fourth renders. And because these renderings happen synchronously, only the second and fourth renderings have any effect. This is because the element is busy with the second render by the time the third and fourth renderings are requested, and then only the fourth rendering is enqueued because third rendering’s props are obsolete by the time the component is ready to rerender. This behavior allows async components to always be kept up-to-date without producing excess calls to your async functions.

2. If two different async components are rendered in the same position, the components are raced. If the earlier component fulfills first, it shows until the later component fulfills. If the later component fulfills first, the earlier component is never rendered. This ratcheting effect becomes useful for rendering fallback states for async components, as we’ll see later.

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

### Components with async children 
When Crank encounters an async component anywhere in the element tree, the entire rendering process becomes asynchronous. Therefore, async child components make parent components asynchronous, and sync function and generator components behave differently when they produce async children. On the one hand, sync function components transparently pass updates along to async children, so that when a renderer updates a sync function component concurrently, its async children will also enqueue an update immediately. On the other hand, sync generator components which produce async elements will not resume until those async children have fulfilled. This is because sync generators expect to be resumed after their children have rendered, and the actual DOM nodes which are created are passed back into the generator, but they wouldn’t be available if the generator was concurrently resumed before the async children had settled.

## Async generator components
Just as you can write stateful components with sync generator functions, you can also write stateful async components with async generator functions.

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

`AsyncLabeledCounter` is an async version of the `LabeledCounter` example introduced in the section on sync generator components, and demonstrates several key differences between sync and async generator components. First, rather than using `while` or `for…of` loops as with sync generator components, we now use a `for await…of` loop. This is possible because Crank contexts are not just an *iterable* of props, but also an *async iterable* of props as well. Second, you’ll notice that the async generator yields multiple times per iteration over `this`, once to show a loading message and once to show the actual count. While it is possible for sync generators to yield multiple times per iteration over `this`, it wouldn’t necessarily make sense to do so because generators suspend at each yield, and upon resuming a second time within the same loop, the props would be stale. In contrast, async generator components are continuously resumed; Rather than suspending at each yield, we rely on the `for await…of` loop, which pauses at the bottom for the next rendering.

## Responsive Loading Indicators
The async components we’ve seen so far have been all or nothing, in the sense that Crank can’t show anything until all components in the tree have fulfilled. This can be a problem when you have an async call which takes longer than expected. It would be nice if parts of the element tree could be shown without waiting, to create responsive user experiences. However, because loading indicators which show immediately can paradoxically make your app seem less responsive, we can use the async rules described above along with async generator functions to show loading indicators which appear only when certain promises take too long to settle.

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

In this example, the `RandomDogLoader` component is an async generator component which races the `LoadingIndicator` component with the `RandomDog` component. Because the async generator component resumes continuously, both components are executed, and according to the second rule, only the second component shows if it fulfills faster than the first component, which fulfills at a fixed interval of one second.

The above example hints at how we could abstract this pattern to implement a `Suspense` component, a proposed custom API in React which allows async components with fallback states:

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

As you can see, with Crank, no special tags are needed for async loading states, and the functionality to write this complex logic is implemented using the same element diffing algorithm that governs synchronous components. This approach is also more flexible in the sense that you can extend it for instance, to include a second fallback state which fulfills after ten seconds, which might inform the user that something went wrong or that servers are slow to respond. Best of all, you can use async/await directly in your components!
