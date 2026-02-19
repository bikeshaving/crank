---
title: lazy
module: "@b9g/crank/async"
type: function
publish: true
---

# lazy

Creates a lazy-loaded component that loads on first render.

## Syntax

```ts
const MyComponent = lazy(() => import("./MyComponent"));
```

## Type parameters

- **T** - The component type being lazy-loaded

## Parameters

- **initializer** - `() => Promise<T | {default: T}>` - A function that returns a Promise resolving to either a component function or a module with a `default` export.

## Return value

`T` - A component that loads and renders the target component on first render.

## Description

`lazy` creates a component that delays loading its implementation until it's first rendered. This is useful for code splitting, where you want to reduce the initial bundle size by loading components only when needed.

The initializer function is called once when the lazy component first renders. It should return a Promise that resolves to either:
- A component function directly
- A module object with a `default` property containing the component

Lazy components work seamlessly with [Suspense](/api/async/components/Suspense) to show loading states while the component code is being fetched.

## Examples

### Basic usage with dynamic import

```tsx
import {lazy} from "@b9g/crank/async";
import {Suspense} from "@b9g/crank/async";

// Create a lazy-loaded component
const HeavyChart = lazy(() => import("./HeavyChart"));

function Dashboard() {
  return (
    <Suspense fallback={<div>Loading chart...</div>}>
      <HeavyChart data={chartData} />
    </Suspense>
  );
}
```

### Code splitting routes

```tsx
import {lazy} from "@b9g/crank/async";
import {Suspense} from "@b9g/crank/async";

// Lazy load route components
const HomePage = lazy(() => import("./pages/Home"));
const AboutPage = lazy(() => import("./pages/About"));
const SettingsPage = lazy(() => import("./pages/Settings"));

function* Router() {
  let route = "home";

  for (const props of this) {
    yield (
      <Suspense fallback={<PageSkeleton />}>
        {route === "home" && <HomePage />}
        {route === "about" && <AboutPage />}
        {route === "settings" && <SettingsPage />}
      </Suspense>
    );
  }
}
```

### With named exports

```tsx
import {lazy} from "@b9g/crank/async";

// For modules with named exports, wrap the import
const Modal = lazy(async () => {
  const module = await import("./components");
  return module.Modal; // Return the component directly
});

// Or use default exports in your modules
const Modal = lazy(() => import("./Modal")); // Module has: export default Modal
```

### Preloading

```tsx
import {lazy} from "@b9g/crank/async";

// Store the import function for preloading
const importSettings = () => import("./Settings");
const Settings = lazy(importSettings);

function App() {
  const preloadSettings = () => {
    // Start loading before user navigates
    importSettings();
  };

  return (
    <nav>
      <a href="/settings" onmouseenter={preloadSettings}>
        Settings
      </a>
    </nav>
  );
}
```

### Error handling

```tsx
import {lazy} from "@b9g/crank/async";
import {Suspense} from "@b9g/crank/async";

const FailingComponent = lazy(() =>
  import("./MightFail").catch(() => ({
    default: function ErrorFallback() {
      return <div>Failed to load component</div>;
    },
  }))
);

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FailingComponent />
    </Suspense>
  );
}
```

## See also

- [Suspense](/api/async/components/Suspense)
- [Component](/api/core/types/Component)
- [Async Components Guide](/guides/async-components)
