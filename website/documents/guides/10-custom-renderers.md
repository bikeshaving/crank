---
title: Custom Renderers
publish: false
---

## THIS INFORMATION IS OUT OF DATE

The core Crank module provides an abstract `Renderer` class which can be extended to produce more than just DOM nodes or HTML strings, allowing you to target alternative environments such as WebGL libraries like Three.js or Pixi.js, terminals, smartphones or smart TVs. This guide provides an overview of the concepts and internal methods which you will need to know when implementing a custom renderer yourself. Alternatively, you can read through the [DOM](https://github.com/bikeshaving/crank/blob/master/src/dom.ts?ts=2) and [HTML](https://github.com/bikeshaving/crank/blob/master/src/html.ts?ts=2) renderer implementations to learn by example.

**Warning:** The custom renderer API is currently unstable both because of its performance-sensitive nature and because the exact complications of rendering to a wide variety of environments are not yet fully known. If you maintain a Crank renderer, you *will* have to deal with breaking changes as Crank is optimized and as new renderer requirements are discovered.

## The Lifecycle of an Element

Crank does not provide lifecycle methods or hooks as part of its public interface, instead opting to rely on the natural lifecycle of generator functions. However, we use common lifecycle terms like *mounting*, *updating*, *unmounting* and *committing* internally to conceptualize the process of rendering.

Rendering is essentially a depth-first walk of an element tree, where we recursively compare new elements to what was previously rendered. When elements are new to the tree, we *mount* the element, when elements have been seen before, we *update* the element, and when elements no longer exist in the tree, they are *unmounted.*

*Committing* is the part of the rendering process where we actually perform the operations which create, mutate and dispose of nodes. Elements are committed in a *post-order traversal* of the tree, meaning that by the time a specific element is committed, all of its children will already have been committed as well. This is done so that rendering side-effects happen all at once, even if there are async components in the tree, leading to a more consistent and performant user experience. By contrast, components can be thought of as executing in a *pre-order traversal* of the tree, because the only way to get the children of a component element is to execute the component.

## Renderer Type Parameters

**Note:** Renderer development is considerably more abstract than application development, and using the TypeScript types provided by Crank can make this process much easier to understand. Therefore, this guide both assumes familiarity with TypeScript and uses TypeScript syntax in its examples.

The `Renderer` class takes four type parameters which describe the types of values as they flow in and out of the custom renderer methods.

```ts
class Renderer<
  TNode,
  TScope = unknown,
  TRoot = TNode,
  TResult = ElementValue<TNode>
>
```

### TNode

`TNode` is the most important type: it is the type of the node associated with each host element. For instance, for the basic DOM renderer, TNode is the [DOM Node interface](https://developer.mozilla.org/en-US/docs/Web/API/Node).

### TScope

`TScope` is the type of the *scope*, a renderer-specific concept for arbitrary data which is passed down the tree between host elements. Scopes are useful for passing contextual information down the tree to be used when nodes are created; for instance, the DOM renderer uses the scope to pass down information about whether we’re currently rendering in an SVG element.

### TRoot
`TRoot` is the type of the root node. This is the type of the second parameter passed to the `Renderer.render` method, and the `root` prop passed to `Portal` elements. It is usually the same type as `TNode` but can vary according to renderer requirements.

### TResult

`TResult` describes the type of values made visible to renderer consumers. Any time Crank exposes an internal node, for instance, via the `crank-ref` callback, or as the result of yield expressions in generator components, the renderer can intercept this access and provide something other than the internal nodes, allowing renderers to hide implementation details and provide results which make more sense for a specific environment.

For example, the HTML string renderer has an internal node representation, but converts these nodes to strings before they’re exposed to consumers. This is because the internal nodes must be a referentially unique object which is mutated during rendering, while JavaScript strings are referentially transparent and immutable. Therefore, the `TResult` type of the HTML renderer is `string`.

## Methods
The following is a description of the signatures of internal renderer methods and when they’re executed. When creating a custom renderer, you are expected to override these methods via inheritance.

### Renderer.prototype.create

```ts
create(
  el: Element<string | symbol>, scope: TScope
): TNode;
```

The `create` method is called for each host element the first time the element is committed. This method is passed the current host element and scope, and should return the node which will be associated with the host element. This node will remain constant for an element for as long as the element is rendered.

By default, this method will throw a `Not Implemented` error, so custom renderers should always implement this method.

### Renderer.prototype.read

```ts
read(value: Array<TNode | string> | TNode | string | undefined): TResult;
```

The renderer exposes rendered values in the following places:

- As the return value of the renderer’s `render` method.
- As the return value of the context’s `refresh` method.
- As the argument passed to `crank-ref` props
- As the argument passed to the context’s `schedule` and `cleanup` callbacks
- Via the context’s `value` getter method
- As the yield value of generator components

When an element or elements are read in this way, we call the `read` method to give renderers a final chance to manipulate what is exposed, so as to hide internal implementation details and return something which makes sense for the target environment. The parameter passed to the `read` method can be a node, a string, an array of nodes and strings, or `undefined`. The return value is what is actually exposed.

This method is optional. By default, read is an identity function which returns the value passed in.

### Renderer.prototype.patch

```ts
patch(el: Element<string | symbol>, node: TNode): unknown;
```

The `patch` method is called for each host element whenever it is committed. This method is passed the current host element and its related node, and its return value is ignored. This method is usually where you would mutate the internal node according to the props of the host element.

Implementation of this method is optional for renderers.

### Renderer.prototype.arrange

```ts
arrange(
  el: Element<string | symbol>,
  parent: TNode | TRoot,
  children: Array<TNode | string>,
): unknown;
```

The `arrange` method is called whenever an element’s children have changed. It is called with the current host element, the host element’s related node, and the rendered values of all the element’s descendants as an array. In addition to when a host element commits, the `arrange` method may also be called when a child refreshes or otherwise causes a host element’s rendered children to change. Because the `arrange` method is called for every root/portal element, the parent can be of type `TRoot` as well as `TNode`.

This method is where the magic happens, and is where you connect the nodes of your target environment into an internal tree.

### Renderer.prototype.scope

```ts
scope(el: Element<string | symbol>, scope: TScope | undefined): TScope;
```

The `scope` method is called for each host or portal element as elements are mounted or updated. Unlike the other custom renderer methods, the `scope` method is called during the pre-order traversal of the tree, much as components are. The `scope` method is passed the current host element and scope as parameters, and the return value becomes the scope argument passed to the `create` and `scope` method calls for descendant host elements.

By default, the `scope` method returns `undefined`, meaning the scope will be `undefined` throughout your application.

### Renderer.prototype.escape

```ts
escape(text: string, scope: TScope): string;
```

The `escape` method is called whenever a string is encountered in the element tree. It is mainly useful when creating string-based renderers like an HTML or XML renderer, because most rendering targets like the DOM provide text node interfaces which sanitize inputs by default.

One important detail is that `escape` should not return text nodes or anything besides a string. We defer this step to the `arrange` method because this allows the renderer to normalize a host element’s children by concatenating adjacent strings.

By default, the `escape` method returns the string which was passed in.

### Renderer.prototype.parse

```ts
parse(text: string, scope: TScope): TNode | string;
```

When the renderer encounters a `Raw` element whose `value` prop is a string, it calls the `parse` method with that string and the current scope. The return value should be the parsed node, or it can be a string as well, in which case parse will be handled like a string child by parents.

By default, the `parse` method returns the string which was passed in.

### Renderer.prototype.dispose

```ts
dispose(el: Element<string | symbol>, node: TNode): unknown
```

The `dispose` method is called whenever a host element is unmounted. It is called with the host element and its related node. You can use this method to manually release a node or clean up event listeners for garbage collection purposes.

This method is optional and its return value is ignored.

### Renderer.prototype.complete

```ts
complete(root: TRoot): unknown;
```

The `complete` method is called at the end of every render execution, when all elements have been committed and all other renderer methods have been called. It is useful, for instance, if your rendering target needs some final code to execute before any mutations take effect.

This method is optional and its return value is ignored.
