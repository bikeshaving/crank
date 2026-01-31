---
title: Copy
module: "@b9g/crank"
type: component
publish: true
---

# Copy

A component that preserves whatever was previously rendered in the element's position.

## Syntax

```jsx
<Copy />
<Copy key={key} />
<MyComponent copy />
```

## Description

Copy elements preserve the previously rendered content at their position in the tree. This is a performance optimization that prevents re-rendering of a subtree when you know it hasn't changed.

Copy is particularly useful for:

- Preventing expensive re-renders of static content
- Preserving component state when parent re-renders
- Optimizing lists where only some items change

Copy elements can also be keyed, in which case the previously rendered keyed element will be copied to the new position.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `key` | `any` | Optional key to copy a specific keyed element |

## Alternative: copy prop

You can also use the `copy` prop on any element for the same effect:

```tsx
<MyComponent copy />
```

## Examples

### Basic usage

```tsx
import {Copy} from "@b9g/crank";

function* Dashboard() {
  let activeTab = "overview";

  for (const props of this) {
    yield (
      <div class="dashboard">
        <Tabs
          active={activeTab}
          onSelect={(tab) => {
            activeTab = tab;
            this.refresh();
          }}
        />

        {/* Only re-render the active tab */}
        {activeTab === "overview" ? <Overview /> : <Copy />}
        {activeTab === "analytics" ? <Analytics /> : <Copy />}
        {activeTab === "settings" ? <Settings /> : <Copy />}
      </div>
    );
  }
}
```

### With static content

```tsx
function* App() {
  let count = 0;

  for (const props of this) {
    yield (
      <div>
        {/* Header never re-renders */}
        {count === 0 ? <Header /> : <Copy />}

        <main>
          <p>Count: {count}</p>
          <button onclick={() => { count++; this.refresh(); }}>
            Increment
          </button>
        </main>
      </div>
    );
  }
}
```

### Using the copy prop

```tsx
function* ExpensiveComponent() {
  // Initial expensive computation
  const data = expensiveComputation();

  for (const props of this) {
    yield <div>{/* render data */}</div>;
  }
}

function* Parent() {
  let unrelatedState = 0;

  for (const props of this) {
    yield (
      <div>
        <ExpensiveComponent copy />
        <p>Unrelated: {unrelatedState}</p>
        <button onclick={() => { unrelatedState++; this.refresh(); }}>
          Update
        </button>
      </div>
    );
  }
}
```

### Keyed copies

```tsx
import {Copy} from "@b9g/crank";

function* TabPanel({tabs, activeId}) {
  for (const {tabs, activeId} of this) {
    yield (
      <div class="tab-panel">
        {tabs.map((tab) => (
          tab.id === activeId
            ? <TabContent key={tab.id} tab={tab} />
            : <Copy key={tab.id} />
        ))}
      </div>
    );
  }
}
```

### Element identity preservation

```tsx
function* App() {
  let state = 0;

  for (const props of this) {
    const element = <ExpensiveChild data={computeData()} />;

    yield (
      <div>
        {/* Using same element reference prevents re-render */}
        {element}
        <button onclick={() => { state++; this.refresh(); }}>
          Update
        </button>
      </div>
    );
  }
}
```

## See also

- [Fragment](/api/core/components/Fragment)
- [Lifecycles Guide](/guides/lifecycles)
- [Special Props and Tags Guide](/guides/special-props-and-tags)
