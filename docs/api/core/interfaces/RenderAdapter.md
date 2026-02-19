---
title: RenderAdapter
module: "@b9g/crank"
type: interface
publish: true
---

# RenderAdapter

Interface for adapting the rendering process to a specific target environment.

## Syntax

```tsx
import {Renderer} from "@b9g/crank";
import type {RenderAdapter} from "@b9g/crank";

const adapter: Partial<RenderAdapter<MyNode, void>> = {
  create({tag, props}) { /* return a new node */ },
  text({value}) { /* return a text node */ },
  patch({node, props, oldProps}) { /* update node properties */ },
  arrange({node, children}) { /* arrange children in parent */ },
  // ...
};

const renderer = new Renderer(adapter);
```

## Type parameters

- **TNode** - The type of nodes in your target environment
- **TScope** - Additional context data passed down the component tree
- **TRoot** - The type of the root container (defaults to `TNode`)
- **TResult** - The type returned when reading element values (defaults to `ElementValue<TNode>`)

## Methods

### create()

```ts
create(data: {
  tag: string | symbol;
  tagName: string;
  props: Record<string, any>;
  scope: TScope | undefined;
  root: TRoot | undefined;
}): TNode
```

Creates a new node for the given element tag and props.

Called when Crank encounters a new element that needs to be rendered for the first time.

### adopt()

```ts
adopt(data: {
  tag: string | symbol;
  tagName: string;
  props: Record<string, any>;
  node: TNode | undefined;
  scope: TScope | undefined;
  root: TRoot | undefined;
}): Array<TNode> | undefined
```

Adopts existing nodes during hydration.

Called when hydrating server-rendered content. Returns an array of child nodes if the provided node matches the expected tag, or `undefined` if hydration should fail.

### text()

```ts
text(data: {
  value: string;
  scope: TScope | undefined;
  oldNode: TNode | undefined;
  hydrationNodes: Array<TNode> | undefined;
  root: TRoot | undefined;
}): TNode
```

Creates or updates a text node.

Called when rendering text content. Should create a new text node or update an existing one.

### scope()

```ts
scope(data: {
  tag: string | symbol;
  tagName: string;
  props: Record<string, any>;
  scope: TScope | undefined;
  root: TRoot | undefined;
}): TScope | undefined
```

Computes scope context for child elements.

Used to pass rendering context like theme, namespaces, or coordinate systems down the tree.

### raw()

```ts
raw(data: {
  value: string | TNode;
  scope: TScope | undefined;
  hydrationNodes: Array<TNode> | undefined;
  root: TRoot | undefined;
}): ElementValue<TNode>
```

Handles raw values (strings or nodes) that bypass normal element processing.

Called when rendering `Raw` elements for direct node or HTML insertion.

### patch()

```ts
patch(data: {
  tag: string | symbol;
  tagName: string;
  node: TNode;
  props: Record<string, any>;
  oldProps: Record<string, any> | undefined;
  scope: TScope | undefined;
  root: TRoot | undefined;
  copyProps: Set<string> | undefined;
  isHydrating: boolean;
  quietProps: Set<string> | undefined;
}): void
```

Updates a node's properties.

Called when element props change. Should efficiently update only changed properties.

### arrange()

```ts
arrange(data: {
  tag: string | symbol;
  tagName: string;
  node: TNode;
  props: Record<string, any>;
  children: Array<TNode>;
  oldProps: Record<string, any> | undefined;
  scope: TScope | undefined;
  root: TRoot | undefined;
}): void
```

Arranges child nodes within their parent.

Called after children are rendered to organize them in the correct order.

### remove()

```ts
remove(data: {
  node: TNode;
  parentNode: TNode;
  isNested: boolean;
  root: TRoot | undefined;
}): void
```

Removes a node from its parent.

Called when an element is being unmounted. The `isNested` parameter indicates if this is a child of an already-removed element.

### read()

```ts
read(value: ElementValue<TNode>): TResult
```

Reads the final rendered value from an ElementValue.

Allows transforming the internal node representation into the public API.

### finalize()

```ts
finalize(root: TRoot): void
```

Performs final rendering to the root container.

Called after the entire render cycle is complete. Use for triggering actual rendering in non-immediate environments (canvas, WebGL, etc.).

## Examples

### Basic adapter implementation

```tsx
import type {RenderAdapter} from "@b9g/crank";

interface TerminalNode {
  type: string;
  text?: string;
  children: TerminalNode[];
  styles: Record<string, any>;
}

const terminalAdapter: Partial<RenderAdapter<TerminalNode, void>> = {
  create({tag, props}) {
    return {
      type: tag as string,
      children: [],
      styles: props.style || {},
    };
  },

  text({value}) {
    return {
      type: "text",
      text: value,
      children: [],
      styles: {},
    };
  },

  patch({node, props, oldProps}) {
    if (props.style !== oldProps?.style) {
      Object.assign(node.styles, props.style);
    }
  },

  arrange({node, children}) {
    node.children = children;
  },

  remove({node, parentNode, isNested}) {
    if (!isNested) {
      const index = parentNode.children.indexOf(node);
      if (index > -1) {
        parentNode.children.splice(index, 1);
      }
    }
  },

  read(value) {
    return value;
  },
};
```

### Using scope for namespaces

```tsx
const domAdapter: Partial<RenderAdapter<Node, string>> = {
  scope({tag, props, scope}) {
    // Handle XML namespaces
    if (tag === "svg") {
      return "http://www.w3.org/2000/svg";
    }
    if (tag === "math") {
      return "http://www.w3.org/1998/Math/MathML";
    }
    return props.xmlns || scope;
  },

  create({tag, scope, root}) {
    const doc = root?.ownerDocument || document;
    if (scope) {
      return doc.createElementNS(scope, tag as string);
    }
    return doc.createElement(tag as string);
  },
  // ... other methods
};
```

## See also

- [Renderer](/api/core/classes/Renderer)
- [DOMRenderer](/api/dom/classes/DOMRenderer)
- [Custom Renderers Guide](/guides/custom-renderers)
