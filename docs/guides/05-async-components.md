---
title: Async Components
---

So far, every component we've seen has been synchronous - they execute
immediately and return or yield their result right away. But modern web
applications often need to fetch data, wait for user input, or perform other
asynchronous operations.

Crank makes async components as simple as adding the `async` keyword to your
function. You can `await` promises in any component, just like you would in
regular JavaScript functions. Both *async function components* and *async
generator components* are supported.

```jsx live
import {renderer} from "@b9g/crank/dom";
async function Definition({word}) {
  // API courtesy https://dictionaryapi.dev
  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
  const data = await res.json();
  if (!Array.isArray(data)) {
    return <p>No definition found for {word}</p>;
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

When rendering is async, `renderer.render()` and the `refresh()` method will
return promises which settle when rendering has finished.

### Concurrent Updates
The nature of declarative rendering means that async components can be
rerendered while they are still rendering. Therefore, Crank implements a couple
rules to make concurrent updates predictable and performant:

1. There can be only one pending run of an async component at a time for an
   element in the tree. If the same async component is rerendered concurrently
   while a run is pending, another call is enqueued with the updated props.
   ```jsx live
   import {Fragment} from "@b9g/crank";
   import {renderer} from "@b9g/crank/dom";
   // Global log state that the logger component can read
   const logState = {
     entries: [],
     listeners: new Set()
   };

   function addLogEntry(entry) {
     logState.entries.push(entry);
     // Notify all logger components to re-render
     logState.listeners.forEach(refresh => refresh());
   }

   function *RenderLogger() {
     // Subscribe to log updates
     const refreshHandler = () => this.refresh();
     logState.listeners.add(refreshHandler);

     for ({} of this) {
       yield (
         <div style="margin: 10px 0; padding: 10px; background: #f0f8f0; border-radius: 4px; font-family: monospace; font-size: 12px;">
           <strong>Render Log:</strong><br />
           {logState.entries.map((entry, i) => (
             <div key={i}>{entry}</div>
           ))}
         </div>
       );
     }

     // Cleanup subscription when component unmounts
     logState.listeners.delete(refreshHandler);
   }

   async function Delay({message}) {
     // Log when the component actually starts executing
     addLogEntry(`🚀 Started: ${message}`);

     await new Promise((resolve) => setTimeout(resolve, 1000));

     // Log when the component finishes
     addLogEntry(`✅ Completed: ${message}`);

     return <div style="padding: 10px; margin: 5px 0; background: #e7f3ff; border-radius: 4px;">
       {message}
     </div>;
   }

   function *ConcurrentDemo() {
     let demoResult = null;

     const runDemo = async () => {
       // Reset log
       logState.entries = [];
       addLogEntry("🔄 Starting concurrent update demo...");

       // First render starts immediately
       addLogEntry(`📝 Queued: Run 1`);
       await renderer.render(<Delay message="Run 1" />, demoResult);

       // Second render starts after first completes
       addLogEntry(`📝 Queued: Run 2`);
       renderer.render(<Delay message="Run 2" />, demoResult);

       // Third and fourth renders are queued while second is pending
       addLogEntry(`📝 Queued: Run 3`);
       renderer.render(<Delay message="Run 3" />, demoResult);

       addLogEntry(`📝 Queued: Run 4`);
       renderer.render(<Delay message="Run 4" />, demoResult);

       addLogEntry("ℹ️ Note: Run 3 will be skipped!");
     };

     for ({} of this) {
       yield (
         <Fragment>
           <button onclick={runDemo} style="padding: 8px 16px; margin: 10px 0; cursor: pointer;">
             Run Concurrent Update Demo
           </button>
           <RenderLogger />
           <div
             ref={el => demoResult = el}
             style="border: 1px dashed #ccc; padding: 10px; margin: 10px 0; min-height: 50px; background: #fafafa;"
           >
             Click the button to see the demo results here
           </div>
         </Fragment>
       );
     }
   }

   renderer.render(<ConcurrentDemo />, document.body);
   ```
   In the preceding example, you can see in the render log that **Run 3 is
   skipped entirely**. At no point is there more than one simultaneous call to
   the `<Delay>` component, despite the fact that it is rerendered concurrently
   for its second through fourth renders. Because these renderings are
   enqueued, the third rendering is skipped - by the time Run 2 completes, Run
   3's props are obsolete and only Run 4 executes. This behavior allows async
   components to always be kept up-to-date without producing excess calls.

2. If two different async components are rendered in the same position, the
   components are raced. If the earlier component fulfills first, it shows
   until the later component fulfills. If the later component fulfills first,
   the earlier component is never rendered.

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

    As we’ll see later, this “ratcheting” effect becomes useful for rendering
    loading indicators or placeholders for more responsive UIs.

## Async Generator Components
Just as you can write stateful components with sync generator functions, you
can also write stateful async components with async generator functions. Async
generator components work just like sync generator components when using
`for...of` loops, to allow easy refactoring between sync and async.

```jsx live
import {renderer} from "@b9g/crank/dom";
async function *AsyncCounter() {
  let count = 0;
  const onclick = () => this.refresh(() => count++);

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

Async generator components have the same queuing and racing behavior as async
function components, but they can additionally keep state in scope like
generator components.

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

async function *RandomDogLoader({throttle}) {
  for await ({throttle} of this) {
    yield <LoadingIndicator />;
    yield <RandomDog throttle={throttle} />;
  }
}

function *RandomDogApp() {
  let throttle = false;
  const onclick = () => this.refresh(() => throttle = !throttle);

  for ({} of this) {
    yield (
      <Fragment>
        <RandomDogLoader throttle={throttle} />
        <p>
          <button onclick={onclick}>Show me another dog.</button>
        </p>
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

## The Async Module

Starting in Crank 0.7, async components received a major overhaul with a two-pass rendering architecture that enables powerful patterns like racing components and cooperative rendering. To support these patterns, Crank provides an `async` module with utilities for working with async components.

```jsx
import {Suspense, SuspenseList, lazy} from "@b9g/crank/async";
```

### Suspense - Loading States

The `Suspense` component provides declarative loading states for async components:

```jsx live
import {Suspense} from "@b9g/crank/async";
import {renderer} from "@b9g/crank/dom";

// Simulate async data fetching
async function UserProfile({userId}) {
  await new Promise(resolve => setTimeout(resolve, 1500));

  return (
    <div style={{padding: "15px", background: "#e7f3ff", "border-radius": "4px"}}>
      <h4>User #{userId}</h4>
      <p>Email: user{userId}@example.com</p>
      <p>Status: Active</p>
    </div>
  );
}

async function UserPosts({userId}) {
  await new Promise(resolve => setTimeout(resolve, 2000));

  return (
    <div style={{padding: "15px", background: "#f0f8f0", "border-radius": "4px"}}>
      <h4>Recent Posts</h4>
      <ul>
        <li>Post 1 by User #{userId}</li>
        <li>Post 2 by User #{userId}</li>
        <li>Post 3 by User #{userId}</li>
      </ul>
    </div>
  );
}

function *SuspenseDemo() {
  let userId = 1;

  for ({} of this) {
    yield (
      <div>
        <h3>Suspense Demo</h3>
        <button onclick={() => this.refresh(() => userId++)}>
          Load User #{userId + 1}
        </button>

        <Suspense fallback={<div>🔄 Loading user profile...</div>}>
          <UserProfile userId={userId} />
        </Suspense>

        <Suspense fallback={<div>📝 Loading user posts...</div>}>
          <UserPosts userId={userId} />
        </Suspense>
      </div>
    );
  }
}

renderer.render(<SuspenseDemo />, document.body);
```

**Suspense Features:**
- **Timeout support**: `<Suspense timeout={100}>` delays fallback display
- **Nested suspense**: Multiple levels of loading states
- **Error boundaries**: Catches async component errors

### lazy() - Code Splitting Made Simple

The `lazy()` function creates components that load asynchronously, perfect for code splitting and performance optimization:

```jsx live
import {lazy, Suspense} from "@b9g/crank/async";
import {renderer} from "@b9g/crank/dom";

// Create lazy-loaded components
const HeavyChart = lazy(() => import("./chart-component.js"));
const DataTable = lazy(() => import("./data-table.js"));

// Simulate dynamic imports for the demo
const simulateImport = (componentName, delay = 1000) => {
  return new Promise(resolve => {
    setTimeout(() => {
      // Return a simple component for demo purposes
      resolve({
        default: () => (
          <div style={{
            padding: "20px",
            border: "2px solid #007bff",
            "border-radius": "4px",
            background: "#f8f9fa"
          }}>
            ✅ {componentName} loaded successfully!
          </div>
        )
      });
    }, delay);
  });
};

// Override lazy for demo
const DemoChart = lazy(() => simulateImport("Chart Component", 1500));
const DemoTable = lazy(() => simulateImport("Data Table", 2000));

function *LazyDemo() {
  let showChart = false;
  let showTable = false;

  for ({} of this) {
    yield (
      <div>
        <h3>Code Splitting Demo</h3>
        <button onclick={() => this.refresh(() => showChart = !showChart)}>
          {showChart ? "Hide" : "Show"} Chart
        </button>
        <button onclick={() => this.refresh(() => showTable = !showTable)}>
          {showTable ? "Hide" : "Show"} Table
        </button>

        {showChart && (
          <Suspense fallback={<div>📊 Loading chart...</div>}>
            <DemoChart />
          </Suspense>
        )}

        {showTable && (
          <Suspense fallback={<div>📋 Loading table...</div>}>
            <DemoTable />
          </Suspense>
        )}
      </div>
    );
  }
}

renderer.render(<LazyDemo />, document.body);
```

**lazy() Features:**
- **Dynamic imports**: Works with any function that returns a promise
- **Default exports**: Automatically handles `{default: Component}`
- **Error handling**: Integrates with error boundaries
- **Caching**: Loads each component only once

### How lazy() is Implemented

Here's the actual implementation from [`src/async.ts`](https://github.com/bikeshaving/crank/blob/master/src/async.ts):

```typescript
export function lazy<T extends Component>(
  initializer: () => Promise<T | {default: T}>,
): T {
  return async function* LazyComponent(
    this: Context,
    props: any,
  ): AsyncGenerator<Children> {
    let Component = await initializer();
    if (Component && typeof Component === "object" && "default" in Component) {
      Component = Component.default;
    }

    if (typeof Component !== "function") {
      throw new Error(
        "Lazy component initializer must return a Component or a module with a default export that is a Component.",
      );
    }

    for (props of this) {
      yield createElement(Component, props);
    }
  } as unknown as T;
}
```

### Real-world lazy() Patterns

**Route-based code splitting:**
```jsx
const HomePage = lazy(() => import("./pages/Home"));
const AboutPage = lazy(() => import("./pages/About"));
const ContactPage = lazy(() => import("./pages/Contact"));

function *Router() {
  for ({route} of this) {
    yield (
      <Suspense fallback={<PageSkeleton />}>
        {route === "home" && <HomePage />}
        {route === "about" && <AboutPage />}
        {route === "contact" && <ContactPage />}
      </Suspense>
    );
  }
}
```

**Feature-based splitting:**
```jsx
const AdminPanel = lazy(() => import("./features/AdminPanel"));
const UserDashboard = lazy(() => import("./features/UserDashboard"));

function *App({user}) {
  for ({user} of this) {
    yield (
      <div>
        <Header />
        <Suspense fallback={<div>Loading...</div>}>
          {user.isAdmin ? <AdminPanel /> : <UserDashboard />}
        </Suspense>
      </div>
    );
  }
}
```

### SuspenseList - Coordinated Loading

`SuspenseList` coordinates multiple suspense boundaries for better UX:

```jsx live
import {Suspense, SuspenseList} from "@b9g/crank/async";
import {renderer} from "@b9g/crank/dom";

// Components with different loading times
async function FastComponent() {
  await new Promise(resolve => setTimeout(resolve, 500));
  return <div style={{padding: "10px", background: "#d4edda"}}>Fast (500ms)</div>;
}

async function MediumComponent() {
  await new Promise(resolve => setTimeout(resolve, 1500));
  return <div style={{padding: "10px", background: "#fff3cd"}}>Medium (1500ms)</div>;
}

async function SlowComponent() {
  await new Promise(resolve => setTimeout(resolve, 2500));
  return <div style={{padding: "10px", background: "#f8d7da"}}>Slow (2500ms)</div>;
}

function *SuspenseListDemo() {
  let revealOrder = "forwards";
  let tail = "collapsed";
  let key = 0;

  const orders = ["forwards", "backwards", "together"];
  const tails = ["collapsed", "hidden"];

  for ({} of this) {
    yield (
      <div>
        <h3>SuspenseList Demo</h3>

        <div style={{"margin-bottom": "20px"}}>
          <label>
            Reveal Order:{" "}
            <select
              value={revealOrder}
              onchange={(e) => this.refresh(() => {
                revealOrder = e.target.value;
                key++; // Increment key to force new SuspenseList
              })}
            >
              {orders.map(order => <option value={order} key={order}>{order}</option>)}
            </select>
          </label>
          {" "}
          <label>
            Tail:{" "}
            <select
              value={tail}
              onchange={(e) => this.refresh(() => {
                tail = e.target.value;
                key++; // Increment key to force new SuspenseList
              })}
            >
              {tails.map(t => <option value={t} key={t}>{t}</option>)}
            </select>
          </label>
        </div>

        <SuspenseList key={key} revealOrder={revealOrder} tail={tail}>
          <Suspense fallback={<div>⏳ Loading fast...</div>}>
            <FastComponent />
          </Suspense>

          <div style={{margin: "10px 0"}}>
            <Suspense fallback={<div>⏳ Loading slow...</div>}>
              <SlowComponent />
            </Suspense>
          </div>

          <Suspense fallback={<div>⏳ Loading medium...</div>}>
            <MediumComponent />
          </Suspense>
        </SuspenseList>
      </div>
    );
  }
}

renderer.render(<SuspenseListDemo />, document.body);
```

**SuspenseList Features:**

**Reveal Orders:**
- `"forwards"` - Reveal in document order (first to last)
- `"backwards"` - Reveal in reverse order (last to first)
- `"together"` - Wait for all children, then reveal simultaneously

**Tail Behavior:**
- `"collapsed"` - Show only the next pending fallback
- `"hidden"` - Hide all remaining fallbacks once first item loads

### Real-world Patterns

**Dashboard with coordinated loading:**
```jsx
function Dashboard() {
  return (
    <SuspenseList revealOrder="forwards" tail="collapsed">
      <Suspense fallback={<SkeletonHeader />}>
        <Header />
      </Suspense>

      <div className="dashboard-grid">
        <Suspense fallback={<SkeletonChart />}>
          <AnalyticsChart />
        </Suspense>

        <Suspense fallback={<SkeletonTable />}>
          <DataTable />
        </Suspense>
      </div>

      <Suspense fallback={<SkeletonFooter />}>
        <Footer />
      </Suspense>
    </SuspenseList>
  );
}
```

**Progressive image gallery:**
```jsx
function ImageGallery({images}) {
  return (
    <SuspenseList revealOrder="forwards" tail="hidden">
      {images.map(image => (
        <Suspense key={image.id} fallback={<ImageSkeleton />}>
          <LazyImage src={image.url} alt={image.alt} />
        </Suspense>
      ))}
    </SuspenseList>
  );
}
```

### Key Benefits

- **Better UX**: Coordinated loading prevents jarring layout shifts
- **Performance**: Code splitting reduces initial bundle size
- **Flexibility**: Mix and match patterns for your specific needs
- **Crank-native**: Built on Crank's async generator foundation

## Three Async Generator Modes

Async generator components operate in three distinct modes based on how they
iterate over props:

### 1. Sync-like Mode (`for...of` loop)
Async generators using `for...of` behave exactly like sync generator
components. They suspend at each `yield` and wait for children to complete
before resuming.

```jsx
async function *SyncLike({children}) {
  for ({children} of this) {
    const result = yield children; // suspends here, waits for children
    // result is the actual rendered value (DOM node, etc.)
    console.log("Children rendered:", result);
    // this line executes only on the next render
  }
}
```

### 2. Continuous Mode (`for await...of` loop)
Async generators using `for await...of` continuously resume after yielding,
enabling racing and cooperative rendering patterns.

```jsx
async function *Continuous({children}) {
  for await ({children} of this) {
    const promise = yield children; // doesn't suspend, continues immediately
    // promise is always a Promise that resolves when children are rendered
    console.log("Yielded, but continuing...");

    // You can await the promise if needed
    const result = await promise;
    console.log("Children eventually rendered:", result);
    // suspends at the bottom of the loop
  }
}
```

### 3. No-loop Mode (no iterator)
Starting in 0.7, async generators without a props iterator behave exactly like
sync generators - they execute once and suspend at `yield`.

```jsx
async function *NoLoop({children}) {
  // Executes once, then suspends at yield just like sync generators const
  result = yield children; // waits for children to complete
  console.log("Rendered once:", result); // Any code here executes on
  subsequent renders
}
```

This is important, for instance, when converting a sync generator component
which

### Key Differences in Yield Behavior
The most important distinction is what the `yield` expression evaluates to:

- **`for...of` and no-loop**: `yield` returns the actual rendered result (DOM
  nodes, component return values)
- **`for await...of`**: `yield` always returns a Promise that resolves to the
  rendered result

This design allows `for...of` components to easily refactor from sync
generators, while `for await...of` enables advanced async patterns like racing
and cooperative rendering.
