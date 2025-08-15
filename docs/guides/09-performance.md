---
title: Performance
publish: false
---

Crank is designed for performance out of the box. In most cases, you won't need special optimizations - Crank's element diffing, minimal re-renders, and efficient async handling handle the majority of performance concerns automatically.

This guide covers the performance patterns that matter when you're building larger applications or have identified specific bottlenecks. Remember: **measure first, optimize second**.

## Understanding Crank's Performance Model

Crank's performance comes from several key design decisions:

### Element Diffing
Crank diffs element trees rather than virtual DOM, making updates predictable and efficient:

```jsx
function *Timer() {
  let seconds = 0;
  const interval = setInterval(() => this.refresh(() => seconds++), 1000);

  for ({} of this) {
    // Only the text node updates - the button element is preserved
    yield (
      <div>
        <button>Click me</button>
        <span>Seconds: {seconds}</span>
      </div>
    );
  }

  clearInterval(interval);
}
```

### Minimal Re-renders
Components only re-render when explicitly told to via `refresh()` or prop changes:

```jsx
function *OptimizedCounter() {
  let count = 0;

  // Event handler doesn't cause parent to re-render
  const onclick = () => this.refresh(() => count++);

  for ({} of this) {
    yield <button onclick={onclick}>Count: {count}</button>;
  }
}
```

### Efficient Async Handling
Crank's two-pass rendering prevents expensive DOM thrashing during async operations:

```jsx
async function DataComponent({userId}) {
  // Multiple async siblings render together, not independently
  const [user, posts] = await Promise.all([
    fetchUser(userId),
    fetchUserPosts(userId)
  ]);

  return (
    <div>
      <UserProfile user={user} />
      <UserPosts posts={posts} />
    </div>
  );
}
```

### Cooperative DOM Rendering
Crank won't remove DOM nodes it doesn't control, making it safe to integrate with third-party libraries:

```jsx
function *Widget() {
  this.after((div) => {
    // Third-party library adds nodes to the div
    new ThirdPartyWidget(div);
  });

  for ({} of this) {
    yield (
      <div class="widget-container">
        <h2>My Widget</h2>
        {/* Third-party nodes added here will remain in the DOM */}
      </div>
    );
  }
}
```

This makes Crank perfect for progressive enhancement and integration with existing applications.

## When to Optimize (And When Not To)

**Optimize when you have:**
- Actual performance problems your users are experiencing
- Large lists with hundreds/thousands of items
- Expensive calculations that run frequently
- Heavy DOM manipulation or complex animations
- Network requests that could be batched or cached

**Don't optimize when:**
- Your app is already fast enough for users
- The code becomes significantly more complex
- You're guessing at bottlenecks without measuring
- The optimization saves microseconds, not milliseconds

**Golden rule:** Measure first, then optimize. Use browser DevTools to identify actual bottlenecks.

## Performance Optimization Techniques

### 1. Skip Unnecessary Renders with `copy`

Use the `copy` prop to prevent elements from re-rendering when their content hasn't changed:

```jsx
function *ExpensiveList({items}) {
  for ({items} of this) {
    yield (
      <ul>
        {items.map(item => (
          <li key={item.id} copy={!item.hasChanged}>
            <ExpensiveItem item={item} />
          </li>
        ))}
      </ul>
    );
  }
}
```

### 2. Selective Prop Copying

Use string `copy` props when you have a specific need to avoid updating certain props:

```jsx
function *FormInput({value, ...props}) {
  for ({value, ...props} of this) {
    yield (
      // Useful when you want to preserve user input while updating other props
      <input copy="!value" value={value} {...props} />
    );
  }
}
```

Note: This is a specialized technique - in most cases, regular prop updates work fine.

### 3. Memoization with Copy Elements

Implement React-style memoization using `<Copy>` elements:

```jsx
import {Copy} from "@b9g/crank";

function shallowEqual(props, newProps) {
  for (const key in {...props, ...newProps}) {
    if (props[key] !== newProps[key]) return false;
  }
  return true;
}

function memo(Component) {
  return function *Memoized(props) {
    yield <Component {...props} />;

    for (const newProps of this) {
      if (shallowEqual(props, newProps)) {
        yield <Copy />; // Skip re-render
      } else {
        yield <Component {...newProps} />;
      }
      props = newProps;
    }
  };
}

const ExpensiveComponent = memo(function({data}) {
  // Expensive computation here
  return <ComplexVisualization data={data} />;
});
```

### 4. Optimize List Rendering

Always use keys for dynamic lists to enable efficient reordering:

```jsx
function *TodoList({todos}) {
  for ({todos} of this) {
    yield (
      <ul>
        {todos.map(todo => (
          // Key enables efficient reordering/insertion/deletion
          <TodoItem key={todo.id} todo={todo} />
        ))}
      </ul>
    );
  }
}
```

### 5. Batch State Updates

Use `refresh()` callbacks to batch multiple state updates:

```jsx
function *DataDashboard() {
  let data = {};
  let loading = false;
  let error = null;

  const loadData = async () => {
    // Batch all state updates in a single refresh
    this.refresh(() => {
      loading = true;
      error = null;
    });

    try {
      const result = await fetchData();
      this.refresh(() => {
        data = result;
        loading = false;
      });
    } catch (err) {
      this.refresh(() => {
        error = err;
        loading = false;
      });
    }
  };

  for ({} of this) {
    yield (
      <Dashboard
        data={data}
        loading={loading}
        error={error}
        onLoad={loadData}
      />
    );
  }
}
```

### 6. Efficient Event Handling

Leverage event delegation and avoid creating new functions on each render:

```jsx
function *ItemList({items}) {
  // Create handler once, reuse across renders
  const handleClick = (event) => {
    const itemId = event.target.closest('[data-id]')?.dataset.id;
    if (itemId) {
      this.dispatchEvent(new CustomEvent('itemclick', {detail: itemId}));
    }
  };

  for ({items} of this) {
    yield (
      // Single event listener handles all item clicks
      <ul onclick={handleClick}>
        {items.map(item => (
          <li key={item.id} data-id={item.id}>
            {item.name}
          </li>
        ))}
      </ul>
    );
  }
}
```

## Advanced Performance Patterns

### Lazy Loading with Suspense

Use the async module for efficient code splitting:

```jsx
import {lazy, Suspense} from "@b9g/crank/async";

// Component loads only when needed
const HeavyChart = lazy(() => import("./HeavyChart.js"));

function Dashboard({showChart}) {
  if (!showChart) {
    return <div>Dashboard without chart</div>;
  }

  return (
    <Suspense fallback={<div>Loading chart...</div>}>
      <HeavyChart />
    </Suspense>
  );
}
```

### Virtual Scrolling

Implement efficient virtual scrolling for large lists:

```jsx
function *VirtualList({items, itemHeight = 50, containerHeight = 400}) {
  let scrollTop = 0;

  const onScroll = (event) => {
    this.refresh(() => {
      scrollTop = event.target.scrollTop;
    });
  };

  for ({items, itemHeight, containerHeight} of this) {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleCount + 1, items.length);
    const visibleItems = items.slice(startIndex, endIndex);

    yield (
      <div
        style={{height: `${containerHeight}px`, overflow: 'auto'}}
        onscroll={onScroll}
      >
        <div style={{height: `${items.length * itemHeight}px`, position: 'relative'}}>
          {visibleItems.map((item, i) => {
            const index = startIndex + i;
            return (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  top: `${index * itemHeight}px`,
                  height: `${itemHeight}px`,
                  width: '100%'
                }}
              >
                <ListItem item={item} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}
```

### Debounced Updates

Implement debouncing for expensive operations:

```jsx
function *SearchInput() {
  let query = "";
  let results = [];
  let debounceTimer = null;

  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      this.refresh(() => results = []);
      return;
    }

    const searchResults = await fetch(`/api/search?q=${searchQuery}`)
      .then(r => r.json());

    // Only update if query hasn't changed
    if (searchQuery === query) {
      this.refresh(() => results = searchResults);
    }
  };

  const onInput = (event) => {
    const newQuery = event.target.value;

    this.refresh(() => {
      query = newQuery;

      // Debounce search requests
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => performSearch(newQuery), 300);
    });
  };

  for ({} of this) {
    yield (
      <div>
        <input
          type="text"
          value={query}
          oninput={onInput}
          placeholder="Search..."
        />
        <SearchResults results={results} />
      </div>
    );
  }
}
```

### Memory Management

Properly clean up resources to prevent memory leaks:

```jsx
function *ResourceManager() {
  let resources = new Set();

  // Clean up all resources when component unmounts
  this.cleanup(() => {
    resources.forEach(resource => resource.dispose());
    resources.clear();
  });

  const createResource = () => {
    const resource = new ExpensiveResource();
    resources.add(resource);

    // Auto-cleanup when resource is no longer needed
    resource.onDispose(() => resources.delete(resource));

    return resource;
  };

  for ({} of this) {
    yield <ResourceConsumer onCreate={createResource} />;
  }
}
```

## Performance Anti-patterns

### 1. Premature Optimization vs. Real Problems

```jsx
// 🤔 Probably unnecessary - this optimization isn't worth the complexity
function *OverEngineered({color}) {
  const baseStyle = "font-size: 16px";

  for ({color} of this) {
    const style = color ? `${baseStyle}; color: ${color}` : baseStyle;
    yield <div style={style}>Content</div>;
  }
}

// ✅ Simple and fine - string building is straightforward
function *JustRight({color}) {
  for ({color} of this) {
    yield <div style={`color: ${color}; font-size: 16px`}>Content</div>;
  }
}

// 🎯 Optimize when it actually matters - like expensive computations
function *WorthOptimizing({items}) {
  let cachedItems = null;
  let cachedData = null;

  for ({items} of this) {
    // Only recalculate if items actually changed
    if (cachedItems !== items) {
      cachedData = items.map(item => performExpensiveCalculation(item));
      cachedItems = items;
    }

    yield <DataVisualization data={cachedData} />;
  }
}
```

### 2. Avoid Unnecessary Async Components

```jsx
// ❌ Bad - unnecessary async wrapper
async function *BadWrapper({children}) {
  for ({children} of this) {
    yield children; // No async work needed
  }
}

// ✅ Good - sync component for simple wrapping
function *GoodWrapper({children}) {
  for ({children} of this) {
    yield <div class="wrapper">{children}</div>;
  }
}
```

### 3. Avoid Excessive Refresh Calls

```jsx
// ❌ Bad - multiple refresh calls
function *BadComponent() {
  let state = {a: 1, b: 2, c: 3};

  const updateAll = () => {
    this.refresh(() => state.a = 10);
    this.refresh(() => state.b = 20); // Causes extra renders
    this.refresh(() => state.c = 30);
  };

  // Component renders 3 times unnecessarily
}

// ✅ Good - single batched update
function *GoodComponent() {
  let state = {a: 1, b: 2, c: 3};

  const updateAll = () => {
    this.refresh(() => {
      state.a = 10;
      state.b = 20;
      state.c = 30;
    });
  };

  // Component renders once
}
```

## Performance Monitoring

### 1. Use Browser DevTools

Monitor Crank performance with standard browser tools:

```jsx
function *MonitoredComponent() {
  this.after(() => {
    performance.mark('component-rendered');
    console.log('Component render time:', performance.now());
  });

  for ({} of this) {
    performance.mark('component-start');
    yield <ExpensiveComponent />;
  }
}
```

### 2. Custom Performance Metrics

Track component-specific performance:

```jsx
function *PerformanceTracker({children, name}) {
  const startTime = performance.now();

  this.after(() => {
    const endTime = performance.now();
    console.log(`${name} render time:`, endTime - startTime);
  });

  for ({children, name} of this) {
    yield children;
  }
}

// Usage
<PerformanceTracker name="Dashboard">
  <Dashboard />
</PerformanceTracker>
```

### 3. Memory Usage Tracking

Monitor memory usage in development:

```jsx
function *MemoryTracker() {
  this.after(() => {
    if (performance.memory) {
      console.log('Memory usage:', {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      });
    }
  });

  for ({} of this) {
    yield <App />;
  }
}
```

By understanding these performance patterns and avoiding common pitfalls, you can build Crank applications that scale efficiently and provide smooth user experiences. Remember to profile your specific use cases and optimize based on actual performance measurements rather than premature optimization.
