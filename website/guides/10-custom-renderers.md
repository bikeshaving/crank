---
title: Custom Renderers
---

The core Crank module provides an abstract `Renderer` class which can be extended to produce more than just DOM nodes or HTML strings, allowing you to target alternative environments such as WebGL-based canvas libraries, terminals, smartphones or smart TVs. This guide provides an overview of the concepts and internal methods which you will need to know when implementing a custom renderer yourself. Alternatively, you can read through the [DOM](https://github.com/bikeshaving/crank/blob/master/src/dom.ts?ts=2) and [HTML](https://github.com/bikeshaving/crank/blob/master/src/html.ts?ts=2) renderer implementations to learn by example.

**Warning:** The custom renderer API is currently unstable both because of its performance-sensitive nature and because the exact complications of rendering to a wide variety of environments are not yet fully known. If you maintain a Crank renderer, you *will* have to deal with breaking changes as Crank is optimized and as new renderer requirements are discovered.

## The Lifecycle of an Element

Crank does not provide lifecycle methods or hooks as part of its public interface, instead opting to rely on the natural lifecycle of generator functions. However, we use common lifecycle terms like *mounting*, *updating*, *unmounting* and *committing* internally to conceptualize the process of rendering.

Rendering is essentially a depth-first walk of an element tree, where we recursively compare new elements to what was previously rendered. When elements are new to the tree, we “mount” the element, when elements have been seen before, we “update” the element, and when elements no longer exist in the tree, they are “unmounted.”

“Committing” is the part of rendering process where we actually perform the operations which create, mutate and dispose of nodes. Elements are committed in a *post-order traversal* of the tree, meaning that by the time a specific element is committed, all of its children will have already committed as well. This is done so that rendering side-effects happen all at once, even if there are async components in the tree, which leads to a more consistent and performant user experience. By contrast, components can be thought of as executing in a *pre-order traversal* of the tree, because the only way to get the children of a component element is to execute its component.

## Renderer Type Parameters

**Note:** Renderer development is considerably more abstract than application development, and using the TypeScript types provided by Crank can make this process much easier to understand. Therefore, this guide both assumes familiarity with TypeScript and uses TypeScript syntax in its examples.

The renderer class takes four type parameters which describe the types of values as they flow in and out of the custom renderer methods.

```ts
class Renderer<
  TNode extends object,
  TScope = unknown,
  TRoot extends object = TNode,
  TResult = ElementValue<TNode>
>
```

- `TNode` is the most important type: it is the type of the node associated with each host element. For instance, for the basic DOM renderer, TNode is the [DOM Node interface](https://developer.mozilla.org/en-US/docs/Web/API/Node).
- `TScope` is the type of the *scope*, a renderer-specific concept for arbitrary data which can passed down the tree between host elements. Scopes are useful for passing contextual information down the tree to be used when nodes are created; for instance, the DOM renderer uses the scope to pass down information about whether we’re currently rendering in an SVG element.
- `TRoot` is the type of the root node. This is the type of the second parameter passed to the `Renderer.render` method, and the `root` prop passed to `Portal` elements. It is usually the same type as `TNode` but can vary according to renderer requirements.
- `TResult` describes the type of values made visible to renderer consumers. Any time Crank exposes an internal node, for instance, via the `crank-ref` callback, or as the result of yield expressions in generator components, the renderer can intercept this access and provide something other than the internal nodes, allowing renderers to hide implementation details and provide results which make more sense for a specific environment.
  For example, the HTML string renderer has an internal node representation, but converts these nodes to strings before they’re exposed to consumers. This is done because the internal nodes must be referentially unique and mutated during rendering, while JavaScript strings are referentially transparent and immutable. Therefore, the `TResult` of the `HTMLRenderer` subclass is `string`.

## Methods
The following is a description of the signatures of internal renderer methods and when they’re executed.

### Renderer.prototype.create

```ts
create(
  tag: string | symbol, props: Record<string, any>, scope: TScope
): TNode;
```

The `create` method is called for each host element the first time the element is committed. The tag and props parameters are the tag and props of the host element which initiated this call, and the scope is the current scope of the element. The return value is the node which will be associated with the host element.

By default, this method will throw a `Not Implemented` error, so custom renderers should always implement this method.

By default, escape returns the same string that was passed in.

### Renderer.prototype.patch
```ts
patch(
  tag: string | symbol, props: Record<string, any>, node: TNode, scope: TScope,
): unknown;
```

The `patch` method is called for each host element whenever it is committed. The tag and props are the tag and props of the associated host element, the node is the value produced by the `create` method when the value was mounted, and the scope is the current scope of the element.

This method is useful for mutating nodes whenever the host element is committedk. It is optional and its return value is ignored.

### Renderer.prototype.arrange
```ts
arrange(
  tag: string | symbol, props: Record<string, any>, parent: TNode | TRoot, children: Array<TNode | string>
): unknown;
```

The `arrange` method is called for each host element whenever it is committed. The tag and props are the tag and props of the associated host element, the parent is the value created by the create method for a host node. The `arrange` is also called for every root/portal element, so parent can be the second parameter passed to `Renderer.render`, or the `root` prop passed to `Portal` elements. The `children` of `arrange` is always an array of nodes and strings, which are determined by the related parent element’s children.

In addition to being called when a host or portal element is committed, the `arrange` method can also be called as the last step of a component `refresh`. Because the component’s children may have changed, the nearest ancestor host or portal element has to be rearranged so that the parent node can handle the new children.

This method is where the magic happens, and is useful for connecting the nodes of your target environment in tree form. If your target environment has a separate It is optional and the return value is ignored.

### Renderer.prototype.scope
```ts
scope(
  tag: string | symbol, props: Record<string, any>, scope: TScope | undefined
): TScope;
```

The `scope` method is called for each host or portal element as elements are mounted or updated. Unlike the other custom renderer methods, the `scope` method is called during the pre-order traversal of the tree, much like components are. The `scope` method is passed the tag and props of the relevant host element, as well as the current scope, and the return value becomes the scope which is passed to the `create` and `scope` methods which are called for child elements.

### Renderer.prototype.escape
```ts
escape(text: string, scope: TScope): string;
```

The `escape` method is called whenever a string is encountered in the element tree. It is mainly useful when creating string-based renderers like HTML or XML string renderers, because most rendering targets like the DOM provide text node interfaces which sanitize inputs by default. One important detail is that `escape` should not return text nodes or anything besides a string. We defer this step to the `arrange` method because this allows us to normalize a host element’s children by concatenating adjacent strings before it is passed to `arrange`.

By default, the `escape` method returns the string which was passed in.

### Renderer.prototype.parse
```ts
parse(text: string, scope: TScope): TNode | string;
```

When a `Raw` element is committed, if its `value` prop is a string, we call the `parse` method with that string and the current scope. The return value is the parsed node, or it can be a string as well, in which case parse will be handled like a string child by parents. The `escape` method will not be called on the return value.

By default, the `parse` method returns the string which was passed in.

### Renderer.prototype.dispose
```ts
dispose(
  tag: string | symbol, props: Record<string, any>, node: TNode
): unknown
```

When a host element is unmounted, we call the `dispose` method with the related host element’s tag, props and node. This method is useful if you need to manually release a node or remove event listeners from it for garbage collection purposes.

This method is optional and its return value is ignored.

### Renderer.prototype.complete
```ts
complete(root: TRoot): unknown;
```

The `complete` method is called at the end of every render execution, when all elements have been committed and all other renderer methods have been called. It is useful, if your rendering target needs to be manually rerendered before any node mutations or rearrangements take effect.

This method is optional and its return value is ignored.

### Renderer.prototype.read
```ts
read(value: Array<TNode | string> | TNode | string | undefined): TResult;
```

The renderer will expose rendered values in the following places:

- As the return value of `Renderer.prototype.render`
- As the return value of `Context.prototype.refresh`
- As the argument passed to `crank-ref` props
- As the argument passed to `Context.prototype.schedule` and `Context.prototype.cleanup`
- Via the `Context.prototype.value` getter
- As the yield value of generator components

When an element or elements are read in this way, we call the `read` method to give renderers a chance to manipulate what is exposed so as to hide internal implementation details and return something which makes sense for the target environment. The parameter passed to read can be a node, a string, undefined, or an array of nodes and strings. The return value is what is actually exposed.

This method is optional. By default, read is an identity function which returns the value passed in.
