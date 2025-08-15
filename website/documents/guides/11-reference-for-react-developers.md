---
title: React to Crank Migration Guide
---

This comprehensive guide covers everything you need to convert React codebases to Crank. It's organized by migration patterns rather than API comparisons, making it practical for systematic conversion.

## Quick Reference: Key Differences

Before diving into specifics, here are the major differences to keep in mind:

| React | Crank | Notes |
|-------|-------|-------|
| `className` | `class` | Use HTML attribute names |
| `htmlFor` | `for` | Use HTML attribute names |
| `onClick` | `onclick` | Lowercase event props |
| `onChange` | `onchange` | Lowercase event props |
| `useState` | Generator + local variables | State persists in closure |
| `useEffect` | Lifecycle methods | `schedule()`, `after()`, `cleanup()` |
| `useContext` | `this.consume()` | Different method names |
| `Context.Provider` | `this.provide()` | Different method names |
| `defaultValue` | `copy="!value"` | Uncontrolled inputs pattern |
| `dangerouslySetInnerHTML` | `innerHTML` | Direct prop |

## Converting Component Types

### Function Components

React function components convert directly:

```jsx
// React
function Greeting({name}) {
  return <div>Hello {name}</div>;
}

// Crank - identical!
function Greeting({name}) {
  return <div>Hello {name}</div>;
}
```

### Class Components

Convert React class components to generator functions:

```jsx
// React
class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {count: 0};
  }
  
  componentDidMount() {
    console.log('Mounted');
  }
  
  componentWillUnmount() {
    console.log('Unmounting');
  }
  
  increment = () => {
    this.setState({count: this.state.count + 1});
  }
  
  render() {
    return (
      <button onClick={this.increment}>
        Count: {this.state.count}
      </button>
    );
  }
}

// Crank
function *Counter() {
  let count = 0;
  
  // componentDidMount equivalent
  console.log('Mounted');
  
  const increment = () => this.refresh(() => count++);
  
  for ({} of this) {
    yield (
      <button onclick={increment}>
        Count: {count}
      </button>
    );
  }
  
  // componentWillUnmount equivalent
  console.log('Unmounting');
}
```

### Components with Complex State

```jsx
// React
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

// Crank
function *UserComponent() {
  let user = null;
  let loading = false;
  let error = null;
  
  const updateState = (updates) => {
    this.refresh(() => {
      Object.assign({user, loading, error}, updates);
      user = updates.user ?? user;
      loading = updates.loading ?? loading;
      error = updates.error ?? error;
    });
  };
  
  // Use updateState({loading: true}) instead of setLoading(true)
}
```

## NO HOOKS! 🎉

**The best part about migrating from React to Crank? You get to DELETE all your hooks!**

Crank doesn't have hooks because **you don't need them**. Generator functions give you persistent state, natural lifecycles, and direct control over your component logic. No more:

- ❌ Dependency arrays you forget to update
- ❌ Stale closure problems  
- ❌ Rules of hooks restrictions
- ❌ `useCallback` and `useMemo` everywhere
- ❌ Complex custom hooks for simple logic
- ❌ `useEffect` cleanup functions
- ❌ Hook order dependencies

**Instead, you get FREEDOM:**

- ✅ **Write vanilla JavaScript** - loops, variables, functions, promises
- ✅ **Natural lifecycles** - code runs when you expect it to
- ✅ **No artificial restrictions** - put logic wherever it makes sense
- ✅ **No memoization needed** - values persist naturally in closure scope
- ✅ **Simple async patterns** - just use `async`/`await`

## Converting Hooks to Vanilla JavaScript

### useState → Local Variables

```jsx
// React
const [count, setCount] = useState(0);
const increment = () => setCount(count + 1);

// Crank
function *Component() {
  let count = 0;
  const increment = () => this.refresh(() => count++);
  
  for ({} of this) {
    // component body
  }
}
```

### useEffect

```jsx
// React - componentDidMount
useEffect(() => {
  console.log('Mounted');
}, []);

// Crank
function *Component() {
  console.log('Mounted'); // Runs on mount
  
  for ({} of this) {
    yield <div>Content</div>;
  }
}

// React - componentDidUpdate
useEffect(() => {
  console.log('Updated');
});

// Crank
function *Component() {
  for ({} of this) {
    this.after(() => console.log('Updated')); // Runs after each render
    yield <div>Content</div>;
  }
}

// React - componentWillUnmount
useEffect(() => {
  const timer = setInterval(() => {}, 1000);
  return () => clearInterval(timer);
}, []);

// Crank
function *Component() {
  const timer = setInterval(() => {}, 1000);
  
  for ({} of this) {
    yield <div>Content</div>;
  }
  
  clearInterval(timer); // Cleanup on unmount
}
```

### useContext

```jsx
// React
const ThemeContext = React.createContext();

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Child />
    </ThemeContext.Provider>
  );
}

function Child() {
  const theme = useContext(ThemeContext);
  return <div>Theme: {theme}</div>;
}

// Crank
function *App() {
  this.provide("theme", "dark");
  
  for ({} of this) {
    yield <Child />;
  }
}

function Child() {
  const theme = this.consume("theme");
  return <div>Theme: {theme}</div>;
}
```

### useMemo and useCallback → Just Delete Them!

```jsx
// React - artificial memoization complexity
const expensiveValue = useMemo(() => computeExpensive(data), [data]);
const handleClick = useCallback(() => doSomething(id), [id]);
const memoizedStyle = useMemo(() => ({color: theme}), [theme]);

// Crank - pure vanilla JavaScript simplicity
function *Component({data, id, theme}) {
  // Expensive computation? Just cache it naturally!
  let cachedData = null;
  let expensiveValue = null;
  
  // Create functions once, use forever
  const handleClick = () => doSomething(id);
  const style = {color: theme};
  
  for ({data, id, theme} of this) {
    // Natural memoization - no hooks needed
    if (cachedData !== data) {
      expensiveValue = computeExpensive(data);
      cachedData = data;
    }
    
    yield <div onclick={handleClick} style={style}>{expensiveValue}</div>;
  }
}
```

**Why this works:**
- **Functions are created once** and persist in the generator closure
- **Variables naturally cache** values between renders
- **No dependency arrays** - you control exactly when things update
- **No stale closures** - the `for...of` loop gives you fresh props
- **Just vanilla JavaScript** - no framework magic needed!

### Custom Hooks → Regular Functions and Classes

```jsx
// React - forced into hook patterns
function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);
  const increment = useCallback(() => setCount(c => c + 1), []);
  const decrement = useCallback(() => setCount(c => c - 1), []);
  return {count, increment, decrement};
}

function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    return localStorage.getItem(key) ?? defaultValue;
  });
  
  const setStoredValue = useCallback((newValue) => {
    setValue(newValue);
    localStorage.setItem(key, newValue);
  }, [key]);
  
  return [value, setStoredValue];
}

// Crank - just write normal JavaScript!
class Counter {
  constructor(initialValue = 0) {
    this.count = initialValue;
  }
  
  increment() {
    this.count++;
  }
  
  decrement() {
    this.count--;
  }
}

class LocalStorage {
  static get(key, defaultValue) {
    return localStorage.getItem(key) ?? defaultValue;
  }
  
  static set(key, value) {
    localStorage.setItem(key, value);
  }
}

// Or simple functions
function createCounter(initialValue = 0) {
  return {
    count: initialValue,
    increment() { this.count++; },
    decrement() { this.count--; }
  };
}

// Use in components - no hook restrictions!
function *CounterComponent() {
  const counter = createCounter(0);
  let stored = LocalStorage.get('count', 0);
  
  const save = () => {
    LocalStorage.set('count', counter.count);
    this.refresh();
  };
  
  for ({} of this) {
    yield (
      <div>
        <p>Count: {counter.count}</p>
        <button onclick={() => { counter.increment(); this.refresh(); }}>+</button>
        <button onclick={() => { counter.decrement(); this.refresh(); }}>-</button>
        <button onclick={save}>Save</button>
      </div>
    );
  }
}
```

#### Real-World Example: Third-Party Library Integration

Here's how to integrate third-party libraries without hooks. This virtualizer utility wraps TanStack Virtual for use in Crank components:

```typescript
// virtualizer.ts - Utility function, not a hook!
import { Virtualizer, VirtualizerOptions, observeElementOffset } from "@tanstack/virtual-core";
import type { Context } from "@b9g/crank";

export function useVirtualizer<TItemElement extends Element>(
  ctx: Context,
  options: VirtualizerOptions<Element, TItemElement>
): Virtualizer<Element, TItemElement> {
  const virtualizer = new Virtualizer({
    observeElementOffset,
    observeElementRect,
    scrollToFn: elementScroll,
    measureElement: (el, instance) => {
      return el.getBoundingClientRect()[
        instance.options.horizontal ? "width" : "height"
      ];
    },
    ...options,
  });
  
  // Setup lifecycle integration with Crank
  ctx.after(() => {
    const unmount = virtualizer._didMount();
    ctx.cleanup(() => unmount && unmount());
  });
  
  // Sync virtualizer updates with Crank's render cycle
  const afterUpdate = () => {
    virtualizer._willUpdate();
    ctx.after(afterUpdate);
  };
  ctx.after(afterUpdate);
  
  return virtualizer;
}

// Usage in a Crank component
function *VirtualList({ items }) {
  const virtualizer = useVirtualizer(this, {
    count: items.length,
    getScrollElement: () => document.getElementById('scroll-container'),
    estimateSize: () => 35,
  });
  
  for ({ items } of this) {
    yield (
      <div id="scroll-container" style={{ height: '400px', overflow: 'auto' }}>
        <div style={{ 
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative' 
        }}>
          {virtualizer.getVirtualItems().map(virtualItem => (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              Item {virtualItem.index}: {items[virtualItem.index]}
            </div>
          ))}
        </div>
      </div>
    );
  }
}
```

**Key Points:**
- The "hook" is just a regular function that takes the Crank context as first parameter
- No special React lifecycle management - just vanilla JavaScript working with Crank's lifecycle methods
- `ctx.after()` for DOM-ready operations, `ctx.cleanup()` for cleanup
- Direct instantiation of the Virtualizer class - no wrapper complexity needed
- The function name `useVirtualizer` is just convention - it could be `createVirtualizer` or `setupVirtualizer`
```

**For more complex reusable logic patterns, see the [Reusable Logic guide](/guides/reusable-logic)** - no hooks needed!

## Converting Props and Events

### HTML Attribute Names

**Always use HTML attribute names, not React's camelCase versions:**

```jsx
// React
<label className="my-label" htmlFor="my-input">
  <input onChange={handleChange} onClick={handleClick} />
</label>

// Crank
<label class="my-label" for="my-input">
  <input onchange={handleChange} onclick={handleClick} />
</label>
```

### Event Handling

**All event props are lowercase:**

```jsx
// React
<button 
  onClick={handleClick}
  onMouseOver={handleHover}
  onFocus={handleFocus}
  onChange={handleChange}
>

// Crank
<button 
  onclick={handleClick}
  onmouseover={handleHover}
  onfocus={handleFocus}
  onchange={handleChange}
>
```

### Style Props

```jsx
// React
<div style={{fontSize: '16px', backgroundColor: 'red'}}>

// Crank - now supports camelCase too!
<div style={{fontSize: '16px', backgroundColor: 'red'}}>

// Crank - or use CSS strings
<div style="font-size: 16px; background-color: red;">
```

### Class Names

```jsx
// React - className only
<div className={`btn ${isActive ? 'active' : ''}`}>

// Crank - class prop with object support
<div class={{btn: true, active: isActive}}>

// Crank - or strings
<div class={`btn ${isActive ? 'active' : ''}`}>
```

## Form Handling

### Controlled vs Uncontrolled Inputs

**React's controlled/uncontrolled concept doesn't exist in Crank. Use `copy` prop instead:**

```jsx
// React - uncontrolled input
<input defaultValue="initial" />

// Crank - uncontrolled input (preserves user changes)
<input copy="!value" value="initial" />

// React - controlled input
const [value, setValue] = useState('');
<input value={value} onChange={e => setValue(e.target.value)} />

// Crank - controlled input
function *Component() {
  let value = '';
  
  for ({} of this) {
    yield (
      <input 
        value={value} 
        onchange={e => this.refresh(() => value = e.target.value)} 
      />
    );
  }
}
```

### Form Patterns

```jsx
// React
function ContactForm() {
  const [formData, setFormData] = useState({name: '', email: ''});
  
  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };
  
  return (
    <form>
      <input name="name" value={formData.name} onChange={handleChange} />
      <input name="email" value={formData.email} onChange={handleChange} />
    </form>
  );
}

// Crank
function *ContactForm() {
  let formData = {name: '', email: ''};
  
  const handleChange = (e) => {
    this.refresh(() => {
      formData = {...formData, [e.target.name]: e.target.value};
    });
  };
  
  for ({} of this) {
    yield (
      <form>
        <input name="name" value={formData.name} onchange={handleChange} />
        <input name="email" value={formData.email} onchange={handleChange} />
      </form>
    );
  }
}
```

## Async Patterns

### Data Fetching

```jsx
// React
function UserProfile({userId}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchUser(userId).then(user => {
      setUser(user);
      setLoading(false);
    });
  }, [userId]);
  
  if (loading) return <div>Loading...</div>;
  return <div>{user.name}</div>;
}

// Crank
async function UserProfile({userId}) {
  const user = await fetchUser(userId);
  return <div>{user.name}</div>;
}

// Usage with Suspense
function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserProfile userId={123} />
    </Suspense>
  );
}
```

### Code Splitting

```jsx
// React
const LazyComponent = React.lazy(() => import('./LazyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  );
}

// Crank
import {lazy, Suspense} from "@b9g/crank/async";

const LazyComponent = lazy(() => import('./LazyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  );
}
```

## Advanced Patterns

### Error Boundaries

```jsx
// React
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    console.log(error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    
    return this.props.children;
  }
}

// Crank
function *ErrorBoundary({children}) {
  for ({children} of this) {
    try {
      yield children;
    } catch (error) {
      console.log(error);
      yield <h1>Something went wrong.</h1>;
    }
  }
}
```

### Higher-Order Components

```jsx
// React
function withLoading(WrappedComponent) {
  return function WithLoadingComponent(props) {
    if (props.loading) {
      return <div>Loading...</div>;
    }
    return <WrappedComponent {...props} />;
  };
}

// Crank
function withLoading(WrappedComponent) {
  return function *WithLoadingComponent(props) {
    for (props of this) {
      if (props.loading) {
        yield <div>Loading...</div>;
      } else {
        yield <WrappedComponent {...props} />;
      }
    }
  };
}
```

### Render Props

```jsx
// React
function MouseTracker({render}) {
  const [mouse, setMouse] = useState({x: 0, y: 0});
  
  const handleMouseMove = (e) => {
    setMouse({x: e.clientX, y: e.clientY});
  };
  
  return (
    <div onMouseMove={handleMouseMove}>
      {render(mouse)}
    </div>
  );
}

// Crank
function *MouseTracker({render}) {
  let mouse = {x: 0, y: 0};
  
  const handleMouseMove = (e) => {
    this.refresh(() => {
      mouse = {x: e.clientX, y: e.clientY};
    });
  };
  
  for ({render} of this) {
    yield (
      <div onmousemove={handleMouseMove}>
        {render(mouse)}
      </div>
    );
  }
}
```

## Special Props Conversion

### Key Props

```jsx
// React and Crank - identical
{items.map(item => <Item key={item.id} data={item} />)}
```

### Ref Props

```jsx
// React
const inputRef = useRef(null);
<input ref={inputRef} />

// Crank
function *Component() {
  let inputRef = null;
  
  for ({} of this) {
    yield <input ref={el => inputRef = el} />;
  }
}
```

### innerHTML

```jsx
// React
<div dangerouslySetInnerHTML={{__html: htmlString}} />

// Crank
<div innerHTML={htmlString} />
```

## Performance Optimization

### React.memo equivalent

```jsx
// React
const ExpensiveComponent = React.memo(({data}) => {
  return <div>{expensiveOperation(data)}</div>;
});

// Crank
function *ExpensiveComponent({data}) {
  let lastData = null;
  let cachedResult = null;
  
  for ({data} of this) {
    if (data === lastData) {
      yield <Copy />;
    } else {
      cachedResult = <div>{expensiveOperation(data)}</div>;
      lastData = data;
      yield cachedResult;
    }
  }
}
```

### Preventing Re-renders

```jsx
// React - useMemo to prevent re-renders
const memoizedChild = useMemo(() => 
  <ExpensiveChild data={data} />, [data]
);

// Crank - copy prop to prevent re-renders
<ExpensiveChild copy={!hasChanged} data={data} />
```

## Migration Checklist

When converting a React component to Crank:

### 1. Component Structure
- [ ] Convert class components to generator functions
- [ ] Replace `useState` with local variables
- [ ] Replace `useEffect` with lifecycle methods
- [ ] Move setup code to top of generator
- [ ] Move cleanup code to bottom of generator

### 2. Props and Events
- [ ] Change `className` to `class`
- [ ] Change `htmlFor` to `for`
- [ ] Lowercase all event props (`onClick` → `onclick`)
- [ ] Update style objects to use CSS property names
- [ ] Replace `dangerouslySetInnerHTML` with `innerHTML`

### 3. Form Handling
- [ ] Replace `defaultValue` with `copy="!value"`
- [ ] Update controlled inputs to use `onchange` (lowercase)
- [ ] Wrap state updates in `this.refresh(() => ...)`

### 4. Context API
- [ ] Replace `Context.Provider` with `this.provide()`
- [ ] Replace `useContext` with `this.consume()`

### 5. Async Patterns
- [ ] Convert data fetching to async functions
- [ ] Wrap with `<Suspense>` for loading states
- [ ] Use `lazy()` for code splitting

### 6. Performance
- [ ] Replace `React.memo` with manual comparison or `<Copy>`
- [ ] Use `copy` prop for preventing unnecessary re-renders
- [ ] Remove `useMemo`/`useCallback` (not needed in Crank)

## Common Gotchas

### 1. Event Handler Binding
```jsx
// React - need to bind or use arrow functions
class MyComponent extends React.Component {
  handleClick = () => { /* this is bound */ }
}

// Crank - handlers naturally have access to generator scope
function *MyComponent() {
  const handleClick = () => { /* naturally has access to component scope */ };
}
```

### 2. State Updates
```jsx
// React - setState is async
this.setState({count: this.state.count + 1});
this.setState({count: this.state.count + 1}); // Still count + 1!

// Crank - updates are synchronous within refresh callback
this.refresh(() => {
  count = count + 1;
  count = count + 1; // Actually count + 2
});
```

### 3. Effect Dependencies
```jsx
// React - need dependency arrays
useEffect(() => {
  doSomething(prop);
}, [prop]); // Easy to forget dependencies

// Crank - no dependency arrays needed
function *Component({prop}) {
  for ({prop} of this) {
    this.after(() => doSomething(prop)); // Always gets latest prop
    yield <div />;
  }
}
```

This guide covers all the major patterns needed to convert React codebases to Crank systematically. Keep it handy as your complete migration reference!