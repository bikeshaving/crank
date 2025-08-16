---
title: Custom Renderers
publish: false
---

The core Crank module provides an abstract `Renderer` class which can be extended to target any environment - not just the DOM. You can create renderers for WebGL libraries like Three.js or Pixi.js, terminals, canvas, native mobile platforms, or any other target that can display content.

Starting in Crank 0.7, the custom renderer API has been **stabilized** and documented for public use. Several custom renderers are actively in development, including a terminal renderer and WebGL renderers for Three.js and Pixi.js. This guide covers the concepts and methods you'll need to build your own renderer.

## Why Custom Renderers?

Custom renderers enable Crank to work anywhere you can display content:

```jsx
// Same component code works with any renderer
function *Counter() {
  let count = 0;
  const increment = () => this.refresh(() => count++);

  for ({} of this) {
    yield (
      <view>
        <text>Count: {count}</text>
        <button onclick={increment}>+1</button>
      </view>
    );
  }
}

// Render to DOM
domRenderer.render(<Counter />, document.body);

// Render to terminal
terminalRenderer.render(<Counter />, process.stdout);

// Render to Three.js scene
threeRenderer.render(<Counter />, scene);
```

## Understanding the Rendering Process

Crank's rendering follows a predictable lifecycle:

### 1. **Pre-order traversal**: Components execute top-to-bottom
Components run first to determine what elements to render.

### 2. **Post-order traversal**: Host elements commit bottom-to-top
DOM nodes are created and connected after their children are ready.

### 3. **Batched mutations**: All changes happen at once
This prevents visual inconsistencies, especially with async components.

```
App Component
├── Header Component
│   └── <h1> (commits after Header executes)
└── Counter Component
    ├── <div> (commits after button commits)
    └── <button> (commits first)
```

## Basic Renderer Implementation

Here's a minimal custom renderer that outputs text:

```typescript
import {Renderer} from "@b9g/crank";

class TextRenderer extends Renderer<string, never, string, string> {
  // Create a node for each host element
  create(element) {
    const {tag, props} = element;

    if (tag === "text") {
      return props.children || "";
    }

    return `<${tag}>`;
  }

  // Connect children to their parent
  arrange(element, parent, children) {
    const {tag} = element;
    const content = children.join("");

    if (tag === "text") {
      return content;
    }

    return `<${tag}>${content}</${tag}>`;
  }

  // Process text nodes
  text(text) {
    return text;
  }

  // Return final result
  read(value) {
    return Array.isArray(value) ? value.join("") : value || "";
  }
}

const renderer = new TextRenderer();

// Usage
function Greeting({name}) {
  return (
    <div>
      <text>Hello {name}!</text>
    </div>
  );
}

console.log(renderer.render(<Greeting name="World" />));
// Output: "<div>Hello World!</div>"
```

## Renderer Type Parameters

The `Renderer` class takes four type parameters:

```typescript
class Renderer<TNode, TScope, TRoot, TResult>
```

### Internal Node Type: `TNode`
The type of nodes your renderer creates internally:

```typescript
// DOM renderer uses actual DOM nodes
class DOMRenderer extends Renderer<Node, ...> {
  create(element) {
    return document.createElement(element.tag);
  }
}

// String renderer uses strings as nodes
class StringRenderer extends Renderer<string, ...> {
  create(element) {
    return `<${element.tag}>`;
  }
}
```

### Context Information: `TScope`
Data passed down the element tree for context:

```typescript
interface SVGScope {
  inSVG: boolean;
  namespace?: string;
}

class DOMRenderer extends Renderer<Node, SVGScope, ...> {
  scope(element, scope) {
    if (element.tag === "svg") {
      return {inSVG: true, namespace: "http://www.w3.org/2000/svg"};
    }
    return scope || {inSVG: false};
  }

  create(element, scope) {
    if (scope.inSVG) {
      return document.createElementNS(scope.namespace, element.tag);
    }
    return document.createElement(element.tag);
  }
}
```

### Root Container: `TRoot`
The type of the root container (usually same as `TNode`):

```typescript
// DOM: root is a DOM element
renderer.render(<App />, document.getElementById("root"));

// Terminal: root might be a writable stream
terminalRenderer.render(<App />, process.stdout);
```

### Public Result: `TResult`
What users see when accessing rendered values:

```typescript
// HTML renderer returns strings publicly, but uses objects internally
class HTMLRenderer extends Renderer<InternalNode, never, Element, string> {
  read(value) {
    // Convert internal representation to HTML string
    return this.stringify(value);
  }
}
```

## Core Renderer Methods

### Create Nodes: `create()`
**`create(element, scope): TNode`** - Create new nodes from elements.
**Required.** Creates a node for each host element:

```typescript
create(element, scope) {
  const {tag, props} = element;

  switch (tag) {
    case "view":
      return new ViewNode(props);
    case "text":
      return new TextNode(props.children || "");
    case "button":
      return new ButtonNode(props);
    default:
      throw new Error(`Unknown element: ${tag}`);
  }
}
```

### Arrange Children: `arrange()`  
**`arrange(element, parent, children): unknown`** - Place child nodes into parents.
**Required.** Connects child nodes to their parent:

```typescript
arrange(element, parent, children) {
  // Clear existing children
  parent.clear();

  // Add new children
  for (const child of children) {
    parent.appendChild(child);
  }
}
```

### Update Properties: `patch()`
**`patch(element, node): unknown`** - Update node properties and attributes.
Updates node properties when element props change:

```typescript
patch(element, node) {
  const {props} = element;

  // Update node properties based on element props
  if (props.style) {
    node.setStyle(props.style);
  }

  if (props.onclick) {
    node.setEventListener("click", props.onclick);
  }

  if (props.visible !== undefined) {
    node.setVisible(props.visible);
  }
}
```

### Handle Text: `text()`
**`text(text, scope): TResult`** - Create text nodes from strings.
Processes text content:

```typescript
text(text, scope) {
  // Escape HTML in text content
  return text.replace(/[<>&"]/g, (match) => {
    switch (match) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case '"': return "&quot;";
      default: return match;
    }
  });
}
```

### Raw Content: `raw()`
**`raw(value, scope): TNode | string`** - Handle Raw element content.
Handles `<Raw>` element content:

```typescript
raw(value, scope) {
  if (typeof value === "string") {
    // Parse HTML string into nodes
    return this.parseHTML(value);
  }

  // Return nodes as-is
  return value;
}
```

## Advanced Patterns

### Event Handling
Many renderers need to bridge their event systems to Crank's:

```typescript
class CanvasRenderer extends Renderer<CanvasNode, never, HTMLCanvasElement, CanvasNode> {
  patch(element, node) {
    const {props} = element;

    // Set up event delegation
    if (props.onclick && !node.hasClickListener) {
      node.canvas.addEventListener("click", (event) => {
        if (node.contains(event.offsetX, event.offsetY)) {
          props.onclick(event);
        }
      });
      node.hasClickListener = true;
    }
  }
}
```

### Async Rendering Support
Renderers can support async operations during rendering:

```typescript
class AsyncRenderer extends Renderer<AsyncNode, never, AsyncRoot, AsyncNode> {
  async arrange(element, parent, children) {
    // Wait for all children to be ready
    const resolvedChildren = await Promise.all(
      children.map(child => child.ready())
    );

    // Then arrange them
    parent.setChildren(resolvedChildren);
  }
}
```

### Resource Management
Clean up resources when elements unmount:

```typescript
class ResourceRenderer extends Renderer<ResourceNode, never, Container, ResourceNode> {
  dispose(element, node) {
    // Clean up resources
    node.dispose();

    // Remove event listeners
    node.removeAllListeners();

    // Release memory
    node.texture?.destroy();
  }
}
```

## Real-world Example: Terminal Renderer

Here's a more complete example that renders to a terminal:

```typescript
import {Renderer} from "@b9g/crank";

interface TerminalNode {
  tag: string;
  props: Record<string, any>;
  content: string;
  children: TerminalNode[];
}

class TerminalRenderer extends Renderer<TerminalNode, never, NodeJS.WriteStream, string> {
  create(element) {
    return {
      tag: element.tag,
      props: element.props,
      content: "",
      children: []
    };
  }

  arrange(element, parent, children) {
    const node = parent as TerminalNode;

    if (typeof parent !== "object") {
      // Root-level render
      return this.renderToStream(children, parent);
    }

    node.children = children.filter(child => typeof child === "object");
  }

  patch(element, node) {
    const {props} = element;

    if (element.tag === "text") {
      node.content = props.children || "";
    }
  }

  text(text) {
    return text;
  }

  read(value) {
    if (Array.isArray(value)) {
      return value.map(v => this.nodeToString(v)).join("");
    }
    return typeof value === "object" ? this.nodeToString(value) : String(value);
  }

  private nodeToString(node: TerminalNode): string {
    if (node.tag === "text") {
      return node.content;
    }

    if (node.tag === "bold") {
      const content = node.children.map(child => this.nodeToString(child)).join("");
      return `\x1b[1m${content}\x1b[0m`;
    }

    if (node.tag === "color") {
      const color = node.props.value || "white";
      const colorCode = this.getColorCode(color);
      const content = node.children.map(child => this.nodeToString(child)).join("");
      return `\x1b[${colorCode}m${content}\x1b[0m`;
    }

    return node.children.map(child => this.nodeToString(child)).join("");
  }

  private getColorCode(color: string): string {
    const colors = {
      red: "31", green: "32", yellow: "33", blue: "34",
      magenta: "35", cyan: "36", white: "37"
    };
    return colors[color] || "37";
  }

  private renderToStream(children: any[], stream: NodeJS.WriteStream) {
    const output = children.map(child =>
      typeof child === "object" ? this.nodeToString(child) : String(child)
    ).join("");

    stream.write(output);
  }
}

// Usage
const terminalRenderer = new TerminalRenderer();

function *ProgressBar({progress, total}) {
  for ({progress, total} of this) {
    const percentage = Math.round((progress / total) * 100);
    const filled = Math.round((progress / total) * 20);
    const empty = 20 - filled;

    yield (
      <div>
        <bold>Progress: </bold>
        <color value="green">{"█".repeat(filled)}</color>
        <color value="gray">{"░".repeat(empty)}</color>
        <text> {percentage}%</text>
      </div>
    );
  }
}

terminalRenderer.render(<ProgressBar progress={7} total={10} />, process.stdout);
// Output: Progress: ██████████████░░░░░░ 70%
```

## Using the EventTarget Module

Crank 0.7 extracted the `EventTarget` class into a separate module that's useful for custom renderers:

```typescript
import {EventTarget} from "@b9g/crank/event-target";

class CustomNode extends EventTarget {
  constructor(tag: string) {
    super();
    this.tag = tag;
  }

  // Your custom node implementation can dispatch events
  handleUserInteraction() {
    this.dispatchEvent(new CustomEvent("interaction", {
      detail: {timestamp: Date.now()}
    }));
  }
}

class CustomRenderer extends Renderer<CustomNode, never, CustomNode, CustomNode> {
  create(element) {
    const node = new CustomNode(element.tag);

    // Set up event forwarding
    if (element.props.oninteraction) {
      node.addEventListener("interaction", element.props.oninteraction);
    }

    return node;
  }
}
```

## Best Practices

### 1. Handle Edge Cases
```typescript
arrange(element, parent, children) {
  // Handle empty children
  const validChildren = children.filter(child => child != null);

  // Handle mixed content types
  const processedChildren = validChildren.map(child => {
    return typeof child === "string" ? this.createTextNode(child) : child;
  });

  parent.setChildren(processedChildren);
}
```

### 2. Optimize for Performance
```typescript
patch(element, node) {
  const {props} = element;

  // Only update changed properties
  if (props.style !== node.lastStyle) {
    node.setStyle(props.style);
    node.lastStyle = props.style;
  }
}
```

### 3. Provide Helpful Debugging
```typescript
create(element, scope) {
  try {
    return this.createNode(element.tag, element.props);
  } catch (error) {
    throw new Error(
      `Failed to create ${element.tag}: ${error.message}`
    );
  }
}
```

With a stable API and powerful abstractions, Crank's custom renderer system enables you to bring declarative, component-based development to any platform or environment. The key is understanding the rendering lifecycle and implementing the core methods to bridge Crank's elements to your target platform's capabilities.
