---
title: Hydration
---

Hydration is the process of taking server-rendered HTML and making it interactive by attaching JavaScript event handlers and component state. Crank provides robust hydration capabilities that handle complex scenarios while maintaining performance and developer experience.

## Basic Hydration

The DOM renderer provides a `hydrate()` method that attempts to reuse existing DOM nodes instead of creating new ones:

```jsx
import {renderer} from "@b9g/crank/dom";

// Server-rendered HTML exists in the DOM
// <div id="app"><button>Count: 0</button></div>

function *Counter() {
  let count = 0;
  const onclick = () => this.refresh(() => count++);

  for ({} of this) {
    yield (
      <button onclick={onclick}>
        Count: {count}
      </button>
    );
  }
}

// Hydrate instead of render to reuse existing DOM
renderer.hydrate(<Counter />, document.getElementById("app"));
```

During hydration, Crank will:
- Match existing DOM nodes with your component tree
- Attach event listeners without recreating elements  
- Preserve existing DOM structure where possible
- Warn about mismatches in development

## Hydration Warnings

In development, Crank provides comprehensive warnings when server and client rendering don't match:

```jsx
// Server renders: <div>Server time: 2023-01-01</div>
// Client renders: <div>Client time: 2023-01-02</div>
// ⚠️ Warning: Hydration mismatch for text content

function TimeDisplay() {
  return <div>Client time: {new Date().toDateString()}</div>;
}
```

Common causes of hydration mismatches:
- Different data between server and client
- Browser-only APIs like `localStorage` or `window`
- Random values or timestamps
- Different component logic paths

## Fine-grained Hydration Control

The `hydrate` prop provides precise control over which elements participate in hydration:

### Skipping Hydration

Use `hydrate={false}` to skip hydration for elements that should remain static:

```jsx
function App({userContent}) {
  return (
    <div>
      <nav>
        <button onclick={() => console.log("Interactive!")}>
          Menu
        </button>
      </nav>
      
      {/* Skip hydration for user-generated content */}
      <div hydrate={false} innerHTML={userContent} />
      
      {/* Skip hydration for third-party widgets */}
      <div hydrate={false} id="third-party-widget" />
    </div>
  );
}
```

This is particularly useful for:
- Third-party widgets that manage their own DOM
- User-generated HTML content
- Static content that doesn't need interactivity
- Complex visualizations that shouldn't be disturbed

### Forcing Hydration

Use `hydrate={true}` to force hydration for elements that would normally be skipped:

```jsx
import {Portal} from "@b9g/crank";

function Modal({children}) {
  return (
    <Portal root={document.body} hydrate={true}>
      <div class="modal">
        {children}
      </div>
    </Portal>
  );
}
```

Portal children are normally skipped during hydration, but `hydrate={true}` ensures they're included.

### Selective Prop Hydration

Use string values to specify which props should be hydrated:

```jsx
function FormInput({value, placeholder}) {
  return (
    <div>
      {/* Hydrate placeholder but preserve user's current input value */}
      <input 
        hydrate="!value" 
        type="text" 
        placeholder={placeholder}
        value={value}
      />
      
      {/* Only hydrate specific styling props */}
      <div 
        hydrate="class id"
        class="form-group" 
        id="user-input"
        data-analytics="skip-me"
      />
    </div>
  );
}
```

**String hydrate syntax:**
- `hydrate="!value"` - Hydrate all props except `value`
- `hydrate="class id"` - Hydrate only `class` and `id` props  
- Cannot mix bang (`!`) and non-bang syntax in the same string

This is useful for:
- Form inputs where users may have entered data
- Elements with dynamic attributes from analytics scripts
- Preserving third-party modifications to specific props

## Advanced Hydration Patterns

### Conditional Hydration

You can conditionally control hydration based on runtime conditions:

```jsx
function *ConditionalWidget({enableInteractivity}) {
  for ({enableInteractivity} of this) {
    yield (
      <div hydrate={enableInteractivity}>
        <ComplexWidget />
      </div>
    );
  }
}
```

### Hydration with Async Components

Async components work seamlessly with hydration, maintaining their loading states:

```jsx
async function UserProfile({userId}) {
  const user = await fetch(`/api/users/${userId}`).then(r => r.json());
  
  return (
    <div class="user-profile">
      <img src={user.avatar} alt={user.name} />
      <h2>{user.name}</h2>
    </div>
  );
}

function App() {
  return (
    <div>
      {/* Server-rendered with loading state, hydrates to interactive */}
      <UserProfile userId="123" />
    </div>
  );
}
```

### Error Boundaries During Hydration

Handle hydration errors gracefully with error boundaries:

```jsx
function *ErrorBoundary({children}) {
  try {
    for ({children} of this) {
      yield children;
    }
  } catch (error) {
    console.error("Hydration error:", error);
    yield (
      <div class="error-fallback">
        Something went wrong during hydration.
        <button onclick={() => location.reload()}>
          Reload page
        </button>
      </div>
    );
  }
}

function App() {
  return (
    <ErrorBoundary>
      <ComplexApp />
    </ErrorBoundary>
  );
}
```

## Best Practices

### 1. Handle Server-Client Differences

Avoid hydration mismatches by ensuring server and client render the same content:

```jsx
// ❌ Problematic - different server/client values
function BadComponent() {
  return <div>{Date.now()}</div>;
}

// ✅ Better - consistent rendering
function *GoodComponent() {
  let timestamp = Date.now();
  
  for ({} of this) {
    yield <div>{timestamp}</div>;
  }
}

// ✅ Best - handle differences explicitly
function *BestComponent() {
  let mounted = false;
  
  this.after(() => {
    mounted = true;
    this.refresh();
  });
  
  for ({} of this) {
    yield (
      <div>
        {mounted ? Date.now() : "Loading..."}
      </div>
    );
  }
}
```

### 2. Use Selective Hydration

Skip hydration for elements that don't need interactivity:

```jsx
function BlogPost({content, comments}) {
  return (
    <article>
      {/* Static content - skip hydration */}
      <div hydrate={false} innerHTML={content} />
      
      {/* Interactive comments - full hydration */}  
      <CommentSection comments={comments} />
    </article>
  );
}
```

### 3. Progressive Enhancement

Design components to work without JavaScript, then enhance with hydration:

```jsx
function *SearchForm() {
  let enhanced = false;
  
  this.after(() => {
    enhanced = true;
    this.refresh();
  });
  
  for ({query} of this) {
    if (enhanced) {
      // Enhanced behavior with JavaScript
      const onSubmit = (e) => {
        e.preventDefault();
        performClientSearch(query);
      };
      
      yield (
        <form onSubmit={onSubmit}>
          <input name="q" value={query} />
          <button>Search</button>
          <div id="live-results" />
        </form>
      );
    } else {
      // Basic form that works without JavaScript
      yield (
        <form action="/search" method="GET">
          <input name="q" defaultValue={query} />
          <button>Search</button>
        </form>
      );
    }
  }
}
```

### 4. Handle Hydration Timing

Be careful with code that runs during hydration vs. after:

```jsx
function *Component() {
  // This runs during server-side rendering AND hydration
  console.log("Component executing");
  
  this.after(() => {
    // This runs only after hydration completes
    console.log("Component hydrated");
    document.title = "Page is interactive";
  });
  
  for ({} of this) {
    yield <div>Content</div>;
  }
}
```

## Debugging Hydration Issues

### Enable Verbose Warnings

In development, hydration warnings help identify mismatches:

```jsx
// Crank automatically warns about hydration mismatches in development
// Look for warnings like:
// "Hydration mismatch: expected button, got div"
// "Hydration mismatch: expected 'Hello', got 'Hi'"
```

### Inspect Hydration State

Use browser devtools to inspect the hydration process:

```jsx
function DebuggingComponent() {
  this.after((el) => {
    console.log("Element hydrated:", el);
    console.log("Hydration complete");
  });
  
  return <div>Check console for hydration info</div>;
}
```

### Test Without JavaScript

Test your server-rendered output with JavaScript disabled to ensure it works before hydration:

```bash
# Disable JavaScript in browser devtools
# Or use curl to fetch server-rendered HTML
curl http://localhost:3000/ > server-output.html
```

Hydration transforms static server-rendered HTML into fully interactive applications while maintaining performance and user experience. By understanding Crank's hydration system and following these patterns, you can build applications that load fast and become interactive seamlessly.