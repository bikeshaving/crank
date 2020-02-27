---
title: Asynchronous Components
---

So far, every component we’ve seen has worked synchronously, and Crank will respect this as an intentional decision made by the developer by rendering the components synchronously from start to finish. However, modern JavaScript includes promises and `async`/`await`, allowing you to write concurrently executing code as if it were synchronous. To facilitate this, Crank allows components to be asynchronous functions as well.

```jsx
async function IPAddress () {
  const res = await fetch("https://api.ipify.org");
  const address = await res.text();
  return <div>Your IP Address: {address}</div>;
}

(async () => {
  await renderer.render(<IPAddress />, document.body);
})();
```

When a Crank renderer runs a component which returns a promise, rendering becomes asynchronous as well. This means that `renderer.render` itself will return a promise which fulfills when all components in the element tree have fulfilled at least once.

### Concurrent updates
Renderers don’t have to await pending components, async components can be updated concurrently based on the calls to render and the component tree, so Crank implements a couple rules to make concurrent updates predictable and performant.

1. There can only be one pending run of an element per slot at a time. If a component is updated concurrently while it is still pending, another update is enqueued with the latest props.

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

Despite rendering concurrently, at no point is there more than one outstanding call to the `Delay` component at a time. As you can see, by the time the third render (`p3`) fulfills, the fourth rendering has taken effect. This is because components use only the latest of enqueued updates when rerendering, other pending updates are simply dropped.

2. If two different async components are rendered into the same slot of an element tree, the components will race. If the earlier component wins, it shows until the later component fulfills. If the later component wins, the earlier component will never be rendered.

```jsx
async function Slow () {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return <span>Slow</span>;
}

async function Fast () {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return <span>Fast</span>;
}

(async () => {
  const p1 = renderer.render(<div><Fast /></div>, document.body);
  const p2 = renderer.render(<div><Slow /></div>, document.body);
  await p1;
  console.log(document.body.innerHTML); // <div><span>Fast</span></div>
  await p2;
  console.log(document.body.innerHTML); // <div><span>Slow</span></div>
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log(document.body.innerHTML); // <div><span>Slow</span></div>
})();

(async () => {
  const p1 = renderer.render(<div><Slow /></div>, document.body);
  const p2 = renderer.render(<div><Fast /></div>, document.body);
  await p1;
  console.log(document.body.innerHTML); // <div><span>Fast</span></div>
  await p2;
  console.log(document.body.innerHTML); // <div><span>Fast</span></div>
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log(document.body.innerHTML); // <div><span>Fast</span></div>
})();
```

### Components with async children 
When Crank encounters an async component anywhere in the render tree, the entire rendering process also becomes asynchronous. Therefore, async child components make parent components asynchronous, and depending on the kind of component, parents will communicate updates to asynchronous children in different ways.

For instance, sync function components will transparently pass updates along to async children, so that when a renderer updates a sync function component concurrently, its async children will also update concurrently. On the other hand, sync generator components which yield async elements will not resume until those async elements have fulfilled. This is because sync generators expect to be resumed after their children have rendered, and the actual DOM nodes which are rendered are passed back into the generator, but we wouldn’t have those available if the generator was concurrently resumed before the async children had fulfilled.

### Async generator functions
Just as you can write stateful components with synchronous generator functions, you can also write stateful async components with async generator functions.

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

`AsyncLabeledCounter` is an async version of the `LabeledCounter` example introduced earlier, and demonstrates several key differences between sync and async generator components. First, rather than using `while` or `for…of` loops, we now use a `for await…of` loop. This is possible because Crank contexts are not just an iterable of props, but also an async iterable of props. Second, you’ll notice that the async generator yields multiple times per iteration over `this`. While this is possible for sync generators, it wouldn’t necessarily make sense to do so because generators suspend at each yield, and upon resuming the props would be stale. In contrast, async generator components are continuously resumed. Therefore, to suspend the async generator component between updates, we rely on the `for await…of` loop, which pauses at the bottom when there are no pending updates.

### Responsive Loading Indicators
The async components we’ve seen so far have been all or nothing, in the sense that the renderer cannot show anything until all components in the tree have fulfilled. This can be a problem when you have an async call which takes longer than expected; it would be nice if parts of the element tree could be shown without waiting, and if components which have yet to fulfill could be replaced with a loading indicator. Because loading indicators which show immediately can paradoxically make your app seem less responsive, we can use the async rules described above along with async generator functions to show loading indicators which wait before showing.

```jsx
async function Fallback ({wait = 1000, children}) {
  await new Promise((resolve) => setTimeout(resolve, wait));
  return <Fragment>{children}</Fragment>;
}

async function *Suspense ({fallback, children}) {
  for await ({fallback, children} of this) {
    yield <Fallback>{fallback}</Fallback>;
    yield <Fragment>{children}</Fragment>;
  }
}

async function RandomDog ({throttle=false}) {
  if (throttle) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const res = await fetch("https://dog.ceo/api/breeds/image/random");
  const data = await res.json();
  return (
    <a href={data.message}>
      <img src={data.message} width="250" />
    </a>
  );
}

function *RandomDogs () {
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
        <button>Show me another dog.</button>
        <Suspense fallback={<div>Fetching a good boy…</div>}>
          <RandomDog throttle={throttle} />
        </Suspense>
      </Fragment>
    );
  }
}
```

The above example shows how we could implement Suspense, a proposed custom React component which allows async components with fallback states. As you can see, in Crank, no special tags are needed, and the functionality to write this complex async logic is all available to the user. Best of all, we can use `async`/`await` directly in our components.
