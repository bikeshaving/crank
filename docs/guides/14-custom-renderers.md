---
title: Custom Renderers
---

Crank’s custom renderer API allows you to render components to any target
environment beyond the DOM. Whether you’re building games with Canvas/WebGL,
creating terminal UIs, generating images, building emails, or interfacing with
any other graphics system, Crank’s `RenderAdapter` interface provides the
foundation.

## Overview

A custom renderer consists of two main parts:

1. **RenderAdapter** - A set of functions which determine how elements map to
   your target environment
2. **Renderer() class** - An class which you subclass which orchestrates the
   rendering process and manages the component tree

```typescript
import {Renderer, type RenderAdapter} from "@b9g/crank";

export const adapter: RenderAdapter<MyNode, MyScope> = {
  create: ({tag, props}) => new MyNode(tag, props),
  patch: ({node, props}) => node.update(props),
  arrange: ({node, children}) => node.replaceChildren(children),
  // ... other methods
};

export class MyRenderer extends Renderer<MyNode, MyScope, MyRoot> {
  constructor() {
    super(adapter);
  }
}

export const renderer = new MyRenderer();
```

A module which implements a custom renderer should by convention export an
adapter, the subclass, and an instance of the subclass for convenience.

## RenderAdapter Interface

The `RenderAdapter` interface defines how Crank elements are turned into nodes
in your target environment. Each method handles a specific part of the element
lifecycle.

### Type Parameters

It’s highly recommended to use TypeScript to write a custom renderer, as this
will help you understand the types of values which are passed to your
RenderAdapter methods. The `Renderer` class takes the following type
parameters.

- `TNode` - The type representing nodes in your target environment.
- `TScope` - Context data passed down the component tree (e.g., coordinate
  systems, themes). The DOM renderer passes down xmlns info so that SVG
  elements are properly created.
- `TRoot` - The root container type (defaults to `TNode`).
- `TResult` - The type returned when reading element values (defaults to
  `ElementValue<TNode>`).

### Core Methods
#### `create(data): TNode`
Creates a new node when an element is rendered for the first time.

```typescript
create({tag, props, scope}) {
  switch (tag) {
    case "sprite":
      return new PIXI.Sprite(props.texture);
    case "container":
      return new PIXI.Container();
    default:
      throw new Error(`Unknown tag: ${tag}`);
  }
}
```

**Parameters:**
- `tag` - Element tag (string or symbol)
- `tagName` - String representation for debugging
- `props` - Element props object
- `scope` - Current scope context

#### `patch(data): void`
Updates a node’s properties when props change. This is where you implement
prop-to-attribute mapping, event listener binding, and property
synchronization.

```typescript
patch: ({node, props, oldProps}) {
  for (const [key, value] of Object.entries(props)) {
    if (oldProps?.[key] !== value) {
      if (key.startsWith("on")) {
        // Handle events
        const eventName = key.slice(2).toLowerCase();
        node.removeAllListeners(eventName);
        if (value) node.on(eventName, value);
      } else if (key === "texture") {
        node.texture = resolveTexture(value);
      } else {
        node[key] = value;
      }
    }
  }
}
```

**Parameters:**
- `node` - The node to update
- `props` - New props object
- `oldProps` - Previous props (undefined on first render)
- `tag` Element tag (string or symbol)
- `scope` Current scope context
- `copyProps` A set of props which should not be updated because the user has
  provided a copy with meta-prop syntax.
- `isHydrating` Whether you are currently hydrating
- `quietProps` A set of props which should not cause hydration warnings because
  the user has provided a hydrate with meta-prop syntax.

#### `arrange(data): void`
Organizes child nodes within their parent after child elements are rendered.
The remove method handles the removal of nodes, so this method is primarily
about re-ordering existing nodes in the tree.

```typescript
arrange({node, children}) {
  node.removeChildren(); // Clear existing
  children.forEach((child, index) => node.addChildAt(child, index));
}
```

**Parameters:**
- `node` - The parent node
- `children` - Array of child nodes in correct order
- `tag`,
- `props`
- `oldProps`

#### `remove(data): void`
Removes a node when an element is unmounted.

```typescript
remove({node, parentNode, isNested}) => {
  // Clean up resources
  node.destroy?.();

  // Remove from parent (unless nested removal)
  if (!isNested && parentNode.children.includes(node)) {
    parentNode.removeChild(node);
  }
}
```

#### `text(data): TNode`
Creates or updates text nodes.

```typescript
text: ({value, oldNode}) => {
  if (oldNode && oldNode.text !== value) {
    oldNode.text = value;
    return oldNode;
  }

  return new Text(value);
}
```

#### `raw(data): ElementValue<TNode>`
Handles raw values that bypass normal element processing.

```typescript
raw: ({value, scope}) => {
  if (typeof value === "string") {
    return parseMarkup(value); // Convert string to nodes
  }
  return value; // Pass through nodes directly
}
```

**Parameters:**
- `node` - The node which has been removed
- `parentNode` - The parent node which this node is being removed from
- `isNested` - Whether this removal is nested in another removal.
  Depending on your target environment, you may only need to remove the
  top-level node from its parent and leave the remaining nodes untouched.

#### `adopt(data): Array<TNode> | undefined`

Adopts existing nodes during hydration (for server-side rendering or state
restoration).

#### `scope(data): TScope | undefined`
Computes scope context for child elements. Useful for passing coordinate
systems, themes, or namespaces down the tree. This method is only called once
when elements are created.

```typescript
scope({tag, props, scope}) => {
  if (tag === "viewport") {
    return {
      ...scope,
      transform: new Transform(props.x, props.y, props.scale)
    };
  }
  return scope;
}
```

#### `read(value): TResult`
Transforms the internal node representation into the public API.
```typescript
read: (value) => {
  if (Array.isArray(value)) {
    return value.map(node => node.getPublicAPI());
  }
  return value?.getPublicAPI();
}
```

#### `finalize(root): void`
Performs final rendering operations (e.g., triggering a render pass).
```typescript
finalize: (root) => {
  if (root instanceof PIXI.Application) {
    root.render();
  }
}
```

<!--
## Complete Example: Canvas Renderer
Here’s a complete example of a custom renderer for HTML5 Canvas:

```tsx live
import {Renderer, RenderAdapter, ElementValue } from "@b9g/crank";

// Node types for our canvas environment
interface CanvasNode {
  type: string;
  props: Record<string, any>;
  children: CanvasNode[];
  x: number;
  y: number;
  width: number;
  height: number;
  render(ctx: CanvasRenderingContext2D): void;
}

class CanvasRect implements CanvasNode {
  type = "rect";
  children: CanvasNode[] = [];

  constructor(
    public props: Record<string, any>,
    public x = 0,
    public y = 0,
    public width = 100,
    public height = 100
  ) {}

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.props.fill || "black";
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Render children
    this.children.forEach(child => child.render(ctx));
  }
}

class CanvasText implements CanvasNode {
  type = "text";
  children: CanvasNode[] = [];

  constructor(
    public text: string,
    public x = 0,
    public y = 0,
    public width = 0,
    public height = 20
  ) {}

  render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "black";
    ctx.fillText(this.text, this.x, this.y);
  }
}

// Scope type for coordinate transformations
interface CanvasScope {
  offsetX: number;
  offsetY: number;
  scale: number;
}

const canvasAdapter: RenderAdapter<CanvasNode, CanvasScope, HTMLCanvasElement> = {
  create({tag, props, scope}) {
    const x = (props.x || 0) + (scope?.offsetX || 0);
    const y = (props.y || 0) + (scope?.offsetY || 0);

    switch (tag) {
      case "rect":
        return new CanvasRect(props, x, y, props.width, props.height);
      case "text":
        return new CanvasText(props.children || "", x, y);
      default:
        throw new Error(`Unknown canvas tag: ${tag}`);
    }
  },

  patch({node, props, oldProps, scope}) {
    // Update position with scope offset
    node.x = (props.x || 0) + (scope?.offsetX || 0);
    node.y = (props.y || 0) + (scope?.offsetY || 0);

    // Update other properties
    Object.assign(node.props, props);

    if (node.type === "rect") {
      node.width = props.width || node.width;
      node.height = props.height || node.height;
    }
  },

  arrange({node, children}) {
    node.children = children;
  },

  remove({node, parentNode}) {
    const index = parentNode.children.indexOf(node);
    if (index !== -1) {
      parentNode.children.splice(index, 1);
    }
  },

  text({value, oldNode}) {
    if (oldNode && oldNode.type === "text") {
      (oldNode as CanvasText).text = value;
      return oldNode;
    }
    return new CanvasText(value);
  },

  scope({tag, props, scope}) {
    if (tag === "group") {
      return {
        offsetX: (scope?.offsetX || 0) + (props.x || 0),
        offsetY: (scope?.offsetY || 0) + (props.y || 0),
        scale: (scope?.scale || 1) * (props.scale || 1)
      };
    }
    return scope;
  },

  finalize(canvas) {
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render the root node and all children
    const rootNode = (canvas as any).__crankRoot;
    if (rootNode) {
      rootNode.render(ctx);
    }
  }
};

class CanvasRenderer extends Renderer<CanvasNode, CanvasScope, HTMLCanvasElement> {
  constructor() {
    super(canvasAdapter);
  }

  render(children, canvas) {
    // Store root for finalize method
    const result = super.render(children, canvas);
    if (result && !Array.isArray(result)) {
      (canvas as any).__crankRoot = result;
    }

    return result;
  }
}

export const canvasRenderer = new CanvasRenderer();

// Usage
const canvas = document.getElementById("canvas") as HTMLCanvasElement;

function* CanvasApp() {
  let x = 0;

  let prevFrame;
  const nextFrame = () => this.refresh(() => {
    x = (x + 1) % (canvas.width - 100);
    prevFrame = requestAnimationFrame(nextFrame);
  });

  prevFrame = requestAnimationFrame(nextFrame);
  for ({} of this) {
    yield (
      <group x={x} y={50}>
        <rect width={100} height={100} fill="red" />
        <text x={0} y={120}>
          Position: {x}
        </text>
      </group>
    );
  }

  cancelAnimationFrame(prevFrame);
}

// Render with animation
canvasRenderer.render(<CanvasApp />, canvas);
```
-->

## JSX Type Definitions
To get proper TypeScript support, define JSX types for your custom elements:

```typescript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Canvas elements
      rect: {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        fill?: string;
        children?: any;
      };

      text: {
        x?: number;
        y?: number;
        children?: string | number;
      };

      group: {
        x?: number;
        y?: number;
        scale?: number;
        children?: any;
      };
    }
  }
}
```

## Advanced Patterns

### Bridge Components

Create components that bridge between different renderers:

```typescript
function* PixiApplication({children, ...props}) {
  const app = new PIXI.Application(props);
  document.body.appendChild(app.view);

  for ({children, ...props} of this) {
    pixiRenderer.render(children, app.stage, this);
  }
}
```

The third parameter to `render()` allows you to connect the contexts of your
child renderer with your parent renderer.

```typescript
function* GameUI() {
  const gameState = new GameState();
  // You can add provision for child Canvas components to read
  this.provide("gameState", gameState);
  for ({} of this) {
    yield (
      <>
        {/* DOM UI */}
        <div className="ui">
          <Score value={gameState.score} />
          <button onclick={() => gameState.restart()}>
            Restart
          </button>
        </div>

        {/* Canvas Game components will read the provisions */}
        <GameCanvas />
      </>
    );
  }
}
```
