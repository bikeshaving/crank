---
title: Suspense
module: "@b9g/crank/async"
type: component
publish: true
---

# Suspense

A component that displays fallback content while its children are loading.

## Syntax

```ts
async function* Suspense(props: {
  children: Children;
  fallback: Children;
  timeout?: number;
}): AsyncGenerator<Children>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `Children` | required | The content to display when loading is complete |
| `fallback` | `Children` | required | The content to display while children are loading |
| `timeout` | `number` | `300` | Time in milliseconds before showing fallback |

## Description

Suspense provides a way to display fallback content (like a loading spinner) while waiting for async children to resolve. It's commonly used with:

- [lazy](/api/async/functions/lazy) components for code splitting
- Async components that fetch data
- Any Promise-based rendering

The `timeout` prop controls how long Suspense waits before showing the fallback. This prevents flash of loading content for fast operations.

When used within a [SuspenseList](/api/async/components/SuspenseList), Suspense coordinates with siblings to control reveal order and fallback behavior, inheriting the timeout from the parent SuspenseList if not specified.

## Examples

### Basic usage

```tsx
import {Suspense} from "@b9g/crank/async";

async function UserProfile({id}) {
  const user = await fetchUser(id);
  return (
    <div class="profile">
      <img src={user.avatar} />
      <h2>{user.name}</h2>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<div class="skeleton">Loading...</div>}>
      <UserProfile id={123} />
    </Suspense>
  );
}
```

### With lazy components

```tsx
import {lazy, Suspense} from "@b9g/crank/async";

const HeavyEditor = lazy(() => import("./HeavyEditor"));

function* App() {
  let showEditor = false;

  for (const props of this) {
    yield (
      <div>
        <button onclick={() => { showEditor = true; this.refresh(); }}>
          Open Editor
        </button>

        {showEditor && (
          <Suspense fallback={<div>Loading editor...</div>}>
            <HeavyEditor />
          </Suspense>
        )}
      </div>
    );
  }
}
```

### Custom timeout

```tsx
import {Suspense} from "@b9g/crank/async";

function App() {
  return (
    <div>
      {/* Show fallback immediately */}
      <Suspense timeout={0} fallback={<Spinner />}>
        <SlowComponent />
      </Suspense>

      {/* Wait 500ms before showing fallback */}
      <Suspense timeout={500} fallback={<Spinner />}>
        <FastComponent />
      </Suspense>
    </div>
  );
}
```

### Nested Suspense boundaries

```tsx
import {Suspense} from "@b9g/crank/async";

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Header />
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>
      <Suspense fallback={<ContentSkeleton />}>
        <MainContent />
      </Suspense>
    </Suspense>
  );
}
```

### Error boundaries

```tsx
import {Suspense} from "@b9g/crank/async";

function* ErrorBoundary({children}) {
  try {
    for (const {children} of this) {
      yield children;
    }
  } catch (error) {
    yield <div class="error">Something went wrong: {error.message}</div>;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <AsyncComponent />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Loading states with transitions

```tsx
import {Suspense} from "@b9g/crank/async";

function* TabPanel() {
  let activeTab = "overview";

  for (const props of this) {
    yield (
      <div>
        <nav>
          <button onclick={() => { activeTab = "overview"; this.refresh(); }}>
            Overview
          </button>
          <button onclick={() => { activeTab = "details"; this.refresh(); }}>
            Details
          </button>
        </nav>

        <Suspense
          fallback={<TabSkeleton />}
          timeout={200}
        >
          {activeTab === "overview" && <Overview />}
          {activeTab === "details" && <Details />}
        </Suspense>
      </div>
    );
  }
}
```

## See also

- [SuspenseList](/api/async/components/SuspenseList)
- [lazy](/api/async/functions/lazy)
- [Async Components Guide](/guides/async-components)
