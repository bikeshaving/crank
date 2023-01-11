const NOOP = () => {};
const IDENTITY = <T>(value: T): T => value;

function wrap<T>(value: Array<T> | T | undefined): Array<T> {
	return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function unwrap<T>(arr: Array<T>): Array<T> | T | undefined {
	return arr.length === 0 ? undefined : arr.length === 1 ? arr[0] : arr;
}

type NonStringIterable<T> = Iterable<T> & object;

/**
 * Ensures a value is an array.
 *
 * This function does the same thing as wrap() above except it handles nulls
 * and iterables, so it is appropriate for wrapping user-provided element
 * children.
 */
function arrayify<T>(
	value: NonStringIterable<T> | T | null | undefined,
): Array<T> {
	return value == null
		? []
		: Array.isArray(value)
		? value
		: typeof value === "string" ||
		  typeof (value as any)[Symbol.iterator] !== "function"
		? [value]
		: [...(value as NonStringIterable<T>)];
}

function isIteratorLike(
	value: any,
): value is Iterator<unknown> | AsyncIterator<unknown> {
	return value != null && typeof value.next === "function";
}

function isPromiseLike(value: any): value is PromiseLike<unknown> {
	return value != null && typeof value.then === "function";
}

/**
 * A type which represents all valid values for an element tag.
 */
export type Tag = string | symbol | Component;

/**
 * A helper type to map the tag of an element to its expected props.
 *
 * @template TTag - The tag associated with the props. Can be a string, symbol
 * or a component function.
 */
export type TagProps<TTag extends Tag> = TTag extends string
	? JSX.IntrinsicElements[TTag]
	: TTag extends Component<infer TProps>
	? TProps
	: Record<string, unknown>;

/***
 * SPECIAL TAGS
 *
 * Crank provides a couple tags which have special meaning for the renderer.
 ***/

/**
 * A special tag for grouping multiple children within the same parent.
 *
 * All non-string iterables which appear in the element tree are implicitly
 * wrapped in a fragment element.
 *
 * This tag is just the empty string, and you can use the empty string in
 * createElement calls or transpiler options directly to avoid having to
 * reference this export.
 */
export const Fragment = "";
export type Fragment = typeof Fragment;

// TODO: We assert the following symbol tags as any because TypeScript support
// for symbol tags in JSX doesn’t exist yet.
// https://github.com/microsoft/TypeScript/issues/38367

/**
 * A special tag for rendering into a new root node via a root prop.
 *
 * This tag is useful for creating element trees with multiple roots, for
 * things like modals or tooltips.
 *
 * Renderer.prototype.render() will implicitly wrap top-level element trees in
 * a Portal element.
 */
export const Portal = Symbol.for("crank.Portal") as any;
export type Portal = typeof Portal;

/**
 * A special tag which preserves whatever was previously rendered in the
 * element’s position.
 *
 * Copy elements are useful for when you want to prevent a subtree from
 * rerendering as a performance optimization. Copy elements can also be keyed,
 * in which case the previously rendered keyed element will be copied.
 */
export const Copy = Symbol.for("crank.Copy") as any;
export type Copy = typeof Copy;

/**
 * A special tag for injecting raw nodes or strings via a value prop.
 *
 * If the value prop is a string, Renderer.prototype.parse() will be called on
 * the string and the result will be set as the element’s value.
 */
export const Raw = Symbol.for("crank.Raw") as any;
export type Raw = typeof Raw;

/**
 * Describes all valid values of an element tree, excluding iterables.
 *
 * Arbitrary objects can also be safely rendered, but will be converted to a
 * string using the toString() method. We exclude them from this type to catch
 * potential mistakes.
 */
export type Child = Element | string | number | boolean | null | undefined;

/**
 * An arbitrarily nested iterable of Child values.
 *
 * We use a recursive interface here rather than making the Children type
 * directly recursive because recursive type aliases were added in TypeScript
 * 3.7.
 *
 * You should avoid referencing this type directly, as it is mainly exported to
 * prevent TypeScript errors.
 */
export interface ChildIterable extends Iterable<Child | ChildIterable> {}

/**
 * Describes all valid values of an element tree, including arbitrarily nested
 * iterables of such values.
 */
export type Children = Child | ChildIterable;

/**
 * Represents all functions which can be used as a component.
 *
 * @template [TProps=*] - The expected props for the component.
 */
export type Component<TProps extends Record<string, unknown> = any> = (
	this: Context<TProps>,
	props: TProps,
) =>
	| Children
	| PromiseLike<Children>
	// The return type of iterators must include void because TypeScript will
	// infer generators which return implicitly as having a void return type.
	| Iterator<Children, Children | void, any>
	| AsyncIterator<Children, Children | void, any>;

type ChildrenIteratorResult = IteratorResult<Children, Children | void>;

/**
 * A type to keep track of keys. Any value can be a key, though null and
 * undefined are ignored.
 */
type Key = unknown;

const ElementSymbol = Symbol.for("crank.Element");

// To maximize compatibility between Crank versions, starting with 0.2.0, any
// changes to the Element properties will be considered a breaking change.
export interface Element<TTag extends Tag = Tag> {
	/**
	 * @internal
	 * A unique symbol to identify elements as elements across versions and
	 * realms, and to protect against basic injection attacks.
	 * https://overreacted.io/why-do-react-elements-have-typeof-property/
	 *
	 * This property is defined on the element prototype rather than per
	 * instance, because it is the same for every Element.
	 */
	$$typeof: typeof ElementSymbol;

	/**
	 * The tag of the element. Can be a string, symbol or function.
	 */
	tag: TTag;

	/**
	 * An object containing the “properties” of an element. These correspond to
	 * the attribute syntax from JSX.
	 */
	props: TagProps<TTag>;

	/**
	 * A value which uniquely identifies an element from its siblings so that it
	 * can be added/updated/moved/removed by key rather than position.
	 *
	 * Passed in createElement() as the prop "c-key".
	 */
	key: Key;

	/**
	 * A callback which is called with the element’s result when it is committed.
	 *
	 * Passed in createElement() as the prop "c-ref".
	 */
	ref: ((value: unknown) => unknown) | undefined;

	/**
	 * A possible boolean which indicates that element should NOT be rerendered.
	 * If the element has never been rendered, this property has no effect.
	 *
	 * Passed in createElement() as the prop "c-static".
	 */
	static_: boolean | undefined;
}

/**
 * Elements are the basic building blocks of Crank applications. They are
 * JavaScript objects which are interpreted by special classes called renderers
 * to produce and manage stateful nodes.
 *
 * @template {Tag} [TTag=Tag] - The type of the tag of the element.
 *
 * @example
 * // specific element types
 * let div: Element<"div">;
 * let portal: Element<Portal>;
 * let myEl: Element<MyComponent>;
 *
 * // general element types
 * let host: Element<string | symbol>;
 * let component: Element<Component>;
 *
 * Typically, you use a helper function like createElement to create elements
 * rather than instatiating this class directly.
 */
export class Element<TTag extends Tag = Tag> {
	constructor(
		tag: TTag,
		props: TagProps<TTag>,
		key: Key,
		ref?: ((value: unknown) => unknown) | undefined,
		static_?: boolean | undefined,
	) {
		this.tag = tag;
		this.props = props;
		this.key = key;
		this.ref = ref;
		this.static_ = static_;
	}
}

// See Element interface
Element.prototype.$$typeof = ElementSymbol;

export function isElement(value: any): value is Element {
	return value != null && value.$$typeof === ElementSymbol;
}

/**
 * Creates an element with the specified tag, props and children.
 *
 * This function is usually used as a transpilation target for JSX transpilers,
 * but it can also be called directly. It additionally extracts special props so
 * they aren’t accessible to renderer methods or components, and assigns the
 * children prop according to any additional arguments passed to the function.
 */
export function createElement<TTag extends Tag>(
	tag: TTag,
	props?: TagProps<TTag> | null | undefined,
	...children: Array<unknown>
): Element<TTag> {
	let key: Key;
	let ref: ((value: unknown) => unknown) | undefined;
	let static_ = false;
	const props1 = {} as TagProps<TTag>;
	if (props != null) {
		for (const name in props) {
			switch (name) {
				case "crank-key":
				case "c-key":
				case "$key":
					// We have to make sure we don’t assign null to the key because we
					// don’t check for null keys in the diffing functions.
					if (props[name] != null) {
						key = props[name];
					}
					break;
				case "crank-ref":
				case "c-ref":
				case "$ref":
					if (typeof props[name] === "function") {
						ref = props[name];
					}
					break;
				case "crank-static":
				case "c-static":
				case "$static":
					static_ = !!props[name];
					break;
				default:
					props1[name] = props[name];
			}
		}
	}

	if (children.length > 1) {
		props1.children = children;
	} else if (children.length === 1) {
		props1.children = children[0];
	}

	return new Element(tag, props1, key, ref, static_);
}

/** Clones a given element, shallowly copying the props object. */
export function cloneElement<TTag extends Tag>(
	el: Element<TTag>,
): Element<TTag> {
	if (!isElement(el)) {
		throw new TypeError("Cannot clone non-element");
	}

	return new Element(el.tag, {...el.props}, el.key, el.ref);
}

/*** ELEMENT UTILITIES ***/

// WHAT ARE WE DOING TO THE CHILDREN???
/**
 * All values in the element tree are narrowed from the union in Child to
 * NarrowedChild during rendering, to simplify element diffing.
 */
type NarrowedChild = Element | string | undefined;

function narrow(value: Children): NarrowedChild {
	if (typeof value === "boolean" || value == null) {
		return undefined;
	} else if (typeof value === "string" || isElement(value)) {
		return value;
	} else if (typeof (value as any)[Symbol.iterator] === "function") {
		return createElement(Fragment, null, value);
	}

	return value.toString();
}

/**
 * A helper type which repesents all possible rendered values of an element.
 *
 * @template TNode - The node type for the element provided by the renderer.
 *
 * When asking the question, what is the “value” of a specific element, the
 * answer varies depending on the tag:
 *
 * For host elements, the value is the nodes created for the element.
 *
 * For fragments, the value is usually an array of nodes.
 *
 * For portals, the value is undefined, because a Portal element’s root and
 * children are opaque to its parent.
 *
 * For components, the value can be any of the above, because the value of a
 * component is determined by its immediate children.
 *
 * Rendered values can also be strings or arrays of nodes and strings, in the
 * case of component or fragment elements with strings or multiple children.
 *
 * All of these possible values are reflected in this utility type.
 */
export type ElementValue<TNode> =
	| Array<TNode | string>
	| TNode
	| string
	| undefined;

/**
 * Takes an array of element values and normalizes the output as an array of
 * nodes and strings.
 *
 * @returns Normalized array of nodes and/or strings.
 *
 * Normalize will flatten only one level of nested arrays, because it is
 * designed to be called once at each level of the tree. It will also
 * concatenate adjacent strings and remove all undefined values.
 */
function normalize<TNode>(
	values: Array<ElementValue<TNode>>,
): Array<TNode | string> {
	const result: Array<TNode | string> = [];
	let buffer: string | undefined;
	for (let i = 0; i < values.length; i++) {
		const value = values[i];
		if (!value) {
			// pass
		} else if (typeof value === "string") {
			buffer = (buffer || "") + value;
		} else if (!Array.isArray(value)) {
			if (buffer) {
				result.push(buffer);
				buffer = undefined;
			}

			result.push(value);
		} else {
			// We could use recursion here but it’s just easier to do it inline.
			for (let j = 0; j < value.length; j++) {
				const value1 = value[j];
				if (!value1) {
					// pass
				} else if (typeof value1 === "string") {
					buffer = (buffer || "") + value1;
				} else {
					if (buffer) {
						result.push(buffer);
						buffer = undefined;
					}

					result.push(value1);
				}
			}
		}
	}

	if (buffer) {
		result.push(buffer);
	}

	return result;
}

/**
 * @internal
 * The internal nodes which are cached and diffed against new elements when
 * rendering element trees.
 */
class Retainer<TNode> {
	/**
	 * The element associated with this retainer.
	 */
	declare el: Element;
	/**
	 * The context associated with this element. Will only be defined for
	 * component elements.
	 */
	declare ctx: ContextImpl<TNode> | undefined;
	/**
	 * The retainer children of this element. Retainers form a tree which mirrors
	 * elements. Can be a single child or undefined as a memory optimization.
	 */
	declare children: Array<RetainerChild<TNode>> | RetainerChild<TNode>;
	/**
	 * The value associated with this element.
	 */
	declare value: ElementValue<TNode>;
	/**
	 * The cached child values of this element. Only host and component elements
	 * will use this property.
	 */
	declare cachedChildValues: ElementValue<TNode>;
	/**
	 * The child which this retainer replaces. This property is used when an
	 * async retainer tree replaces previously rendered elements, so that the
	 * previously rendered elements can remain visible until the async tree
	 * fulfills. Will be set to undefined once this subtree fully renders.
	 */
	declare fallbackValue: RetainerChild<TNode>;

	declare inflightValue: Promise<ElementValue<TNode>> | undefined;
	declare onNextValues: Function | undefined;
	constructor(el: Element) {
		this.el = el;
		this.ctx = undefined;
		this.children = undefined;
		this.value = undefined;
		this.cachedChildValues = undefined;
		this.fallbackValue = undefined;
		this.inflightValue = undefined;
		this.onNextValues = undefined;
	}
}

/**
 * The retainer equivalent of ElementValue
 */
type RetainerChild<TNode> = Retainer<TNode> | string | undefined;

/**
 * Finds the value of the element according to its type.
 *
 * @returns The value of the element.
 */
function getValue<TNode>(ret: Retainer<TNode>): ElementValue<TNode> {
	if (typeof ret.fallbackValue !== "undefined") {
		return typeof ret.fallbackValue === "object"
			? getValue(ret.fallbackValue)
			: ret.fallbackValue;
	} else if (ret.el.tag === Portal) {
		return;
	} else if (typeof ret.el.tag !== "function" && ret.el.tag !== Fragment) {
		return ret.value;
	}

	return unwrap(getChildValues(ret));
}

/**
 * Walks an element’s children to find its child values.
 *
 * @returns A normalized array of nodes and strings.
 */
function getChildValues<TNode>(ret: Retainer<TNode>): Array<TNode | string> {
	if (ret.cachedChildValues) {
		return wrap(ret.cachedChildValues);
	}

	const values: Array<ElementValue<TNode>> = [];
	const children = wrap(ret.children);
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (child) {
			values.push(typeof child === "string" ? child : getValue(child));
		}
	}

	const values1 = normalize(values);
	const tag = ret.el.tag;
	if (typeof tag === "function" || (tag !== Fragment && tag !== Raw)) {
		ret.cachedChildValues = unwrap(values1);
	}
	return values1;
}

// TODO: Document the interface and methods
export interface RendererImpl<
	TNode,
	TScope,
	TRoot extends TNode = TNode,
	TResult = ElementValue<TNode>,
> {
	scope<TTag extends string | symbol>(
		scope: TScope | undefined,
		tag: TTag,
		props: TagProps<TTag>,
	): TScope | undefined;

	create<TTag extends string | symbol>(
		tag: TTag,
		props: TagProps<TTag>,
		scope: TScope | undefined,
	): TNode;

	// TODO: Think about the name of this method
	hydrate<TTag extends string | symbol>(
		tag: TTag,
		node: TNode | TRoot,
		props: TagProps<TTag>,
	): {
		props: Record<string, unknown>;
		children: Array<TNode | string>;
	};

	/**
	 * Called when an element’s rendered value is exposed via render, schedule,
	 * refresh, refs, or generator yield expressions.
	 *
	 * @param value - The value of the element being read. Can be a node, a
	 * string, undefined, or an array of nodes and strings, depending on the
	 * element.
	 *
	 * @returns Varies according to the specific renderer subclass. By default,
	 * it exposes the element’s value.
	 *
	 * This is useful for renderers which don’t want to expose their internal
	 * nodes. For instance, the HTML renderer will convert all internal nodes to
	 * strings.
	 */
	read(value: ElementValue<TNode>): TResult;

	/**
	 * Called for each string in an element tree.
	 *
	 * @param text - The string child.
	 * @param scope - The current scope.
	 *
	 * @returns The escaped string.
	 *
	 * Rather than returning Text nodes as we would in the DOM case, for example,
	 * we delay that step for Renderer.prototype.arrange. We do this so that
	 * adjacent strings can be concatenated, and the actual element tree can be
	 * rendered in normalized form.
	 */
	escape(text: string, scope: TScope | undefined): string;

	/**
	 * Called for each Raw element whose value prop is a string.
	 *
	 * @param text - The string child.
	 * @param scope - The current scope.
	 *
	 * @returns The parsed node or string.
	 */
	parse(text: string, scope: TScope | undefined): ElementValue<TNode>;

	patch<TTag extends string | symbol, TName extends string>(
		tag: TTag,
		node: TNode,
		name: TName,
		value: TagProps<TTag>[TName],
		oldValue: TagProps<TTag>[TName] | undefined,
		scope: TScope,
	): unknown;

	arrange<TTag extends string | symbol>(
		tag: TTag,
		node: TNode,
		props: TagProps<TTag>,
		children: Array<TNode | string>,
		oldProps: TagProps<TTag> | undefined,
		oldChildren: Array<TNode | string> | undefined,
	): unknown;

	dispose<TTag extends string | symbol>(
		tag: TTag,
		node: TNode,
		props: TagProps<TTag>,
	): unknown;

	flush(root: TRoot): unknown;
}

const defaultRendererImpl: RendererImpl<unknown, unknown, unknown, unknown> = {
	create() {
		throw new Error("Not implemented");
	},
	hydrate() {
		throw new Error("Not implemented");
	},
	scope: IDENTITY,
	read: IDENTITY,
	escape: IDENTITY,
	parse: IDENTITY,
	patch: NOOP,
	arrange: NOOP,
	dispose: NOOP,
	flush: NOOP,
};

const _RendererImpl = Symbol.for("crank.RendererImpl");
/**
 * An abstract class which is subclassed to render to different target
 * environments. This class is responsible for kicking off the rendering
 * process and caching previous trees by root.
 *
 * @template TNode - The type of the node for a rendering environment.
 * @template TScope - Data which is passed down the tree.
 * @template TRoot - The type of the root for a rendering environment.
 * @template TResult - The type of exposed values.
 */
export class Renderer<
	TNode extends object = object,
	TScope = unknown,
	TRoot extends TNode = TNode,
	TResult = ElementValue<TNode>,
> {
	/**
	 * @internal
	 * A weakmap which stores element trees by root.
	 */
	declare cache: WeakMap<object, Retainer<TNode>>;

	declare [_RendererImpl]: RendererImpl<TNode, TScope, TRoot, TResult>;
	constructor(impl: Partial<RendererImpl<TNode, TScope, TRoot, TResult>>) {
		this.cache = new WeakMap();
		this[_RendererImpl] = {
			...(defaultRendererImpl as RendererImpl<TNode, TScope, TRoot, TResult>),
			...impl,
		};
	}

	/**
	 * Renders an element tree into a specific root.
	 *
	 * @param children - An element tree. You can render null with a previously
	 * used root to delete the previously rendered element tree from the cache.
	 * @param root - The node to be rendered into. The renderer will cache
	 * element trees per root.
	 * @param bridge - An optional context that will be the ancestor context of all
	 * elements in the tree. Useful for connecting different renderers so that
	 * events/provisions properly propagate. The context for a given root must be
	 * the same or an error will be thrown.
	 *
	 * @returns The result of rendering the children, or a possible promise of
	 * the result if the element tree renders asynchronously.
	 */
	render(
		children: Children,
		root?: TRoot | undefined,
		bridge?: Context | undefined,
	): Promise<TResult> | TResult {
		let ret: Retainer<TNode> | undefined;
		const ctx = bridge && (bridge[_ContextImpl] as ContextImpl<TNode>);
		if (typeof root === "object" && root !== null) {
			ret = this.cache.get(root);
		}

		let oldProps: Record<string, any> | undefined;
		if (ret === undefined) {
			ret = new Retainer(createElement(Portal, {children, root}));
			ret.value = root;
			ret.ctx = ctx;
			if (typeof root === "object" && root !== null && children != null) {
				this.cache.set(root, ret);
			}
		} else if (ret.ctx !== ctx) {
			throw new Error("Context mismatch");
		} else {
			oldProps = ret.el.props;
			ret.el = createElement(Portal, {children, root});
			if (typeof root === "object" && root !== null && children == null) {
				this.cache.delete(root);
			}
		}

		const impl = this[_RendererImpl];
		const childValues = diffChildren(
			impl,
			root,
			ret,
			ctx,
			impl.scope(undefined, Portal, ret.el.props),
			ret,
			children,
			// TODO: pass in hydration children
		);

		// We return the child values of the portal because portal elements
		// themselves have no readable value.
		if (isPromiseLike(childValues)) {
			return childValues.then((childValues) =>
				commitRootRender(impl, root, ctx, ret!, childValues, oldProps),
			);
		}

		return commitRootRender(impl, root, ctx, ret, childValues, oldProps);
	}

	// Hydration is a recursive process like rendering except we don’t create new
	// nodes. How should it be implemented? In internal terms, we need to create
	// Retainer nodes but we should skip most RendererImpl methods, or change the
	// way they work.
	//
	// In terms of the RendererImpl methods:
	//
	// We should definitely skip calling create().
	//
	// We probably should skip patch() and arrange().
	//
	// It will probably be necessary to call scope() and escape(), to handle SVG
	// namespaces and HTML text escaping.
	//
	// The read() method should work but isn’t directly tied to rendering or
	// hydration.
	//
	// I’m not sure how to handle Raw nodes and the parse() method. And the
	// dispose() method is probably unnnecessary because host elements should not
	// be removed during hydration.
	//
	// This could be implemented with a flag that is passed through all the
	// recursive functions. I thought we could put hydration data in the scope
	// system, but it turns out the state we need to keep track of is a little
	// more complicated, and scope is not passed to methods like arrange().
	//
	// The happy path for hydration is that it calls all component functions,
	// attaches event listeners to the current DOM, and compares Element, Text
	// and raw nodes against their virtual representations (raw nodes can allow
	// the creation of Comment nodes, for instance). I would rather not have
	// special logic for all these cases, so I’m thinking of creating a method
	// like arrange() for the hydration case.
	//
	// Alternatively, we could add a RendererImpl method which “reverses”
	// children from DOM nodes, so that we can pass them into the patch() and
	// arrange() methods. The idea would be to create a function which is passed
	// a node, and returns virtual props and children to compare against.
	hydrate(
		children: Children,
		root: TRoot,
		bridge?: Context | undefined,
	): Promise<TResult> | TResult {
		let ret: Retainer<TNode> | undefined;
		// Renderer.render() lets you pass a ctx to connect the Context trees of
		// two renderers. Should Renderer.hydrate() do the same?
		const ctx = bridge && (bridge[_ContextImpl] as ContextImpl<TNode>);
		ret = this.cache.get(root);

		let oldProps: Record<string, any> | undefined;
		if (ret === undefined) {
			ret = new Retainer(createElement(Portal, {children, root}));
			ret.value = root;
			if (typeof root === "object" && root !== null && children != null) {
				this.cache.set(root, ret);
			}
		} else {
			// TODO: Should hydration be allowed with previously rendered roots?
			// What is the use-case?
			// If hydrate is called with previously rendered roots, we should just
			// return render.
			oldProps = ret.el.props;
			ret.el = createElement(Portal, {children, root});
			if (typeof root === "object" && root !== null && children == null) {
				this.cache.delete(root);
			}
		}

		const impl = this[_RendererImpl];
		const childValues = diffChildren(
			impl,
			root,
			ret,
			ctx,
			impl.scope(undefined, Portal, ret.el.props),
			ret,
			children,
		);

		// We return the child values of the portal because portal elements
		// themselves have no readable value.
		if (isPromiseLike(childValues)) {
			return childValues.then((childValues) =>
				commitRootRender(impl, root, ctx, ret!, childValues, oldProps),
			);
		}

		return commitRootRender(impl, root, ctx, ret, childValues, oldProps);
	}
}

/*** PRIVATE RENDERER FUNCTIONS ***/
function commitRootRender<TNode, TRoot extends TNode, TResult>(
	renderer: RendererImpl<TNode, unknown, TRoot, TResult>,
	root: TRoot | undefined,
	ctx: ContextImpl<TNode> | undefined,
	ret: Retainer<TNode>,
	childValues: Array<TNode | string>,
	oldProps: Record<string, any> | undefined,
): TResult {
	// element is a host or portal element
	if (root != null) {
		renderer.arrange(
			Portal,
			root,
			ret.el.props,
			childValues,
			oldProps,
			wrap(ret.cachedChildValues),
		);
		flush(renderer, root);
	}

	ret.cachedChildValues = unwrap(childValues);
	if (root == null) {
		unmount(renderer, ret, ctx, ret);
	}

	return renderer.read(ret.cachedChildValues);
}

function diffChildren<TNode, TScope, TRoot extends TNode, TResult>(
	renderer: RendererImpl<TNode, TScope, TRoot, TResult>,
	root: TRoot | undefined,
	host: Retainer<TNode>,
	ctx: ContextImpl<TNode, TScope, TRoot, TResult> | undefined,
	scope: TScope | undefined,
	parent: Retainer<TNode>,
	children: Children,
): Promise<Array<TNode | string>> | Array<TNode | string> {
	const oldRetained = wrap(parent.children);
	const newRetained: typeof oldRetained = [];
	const newChildren = arrayify(children);
	const values: Array<Promise<ElementValue<TNode>> | ElementValue<TNode>> = [];
	let graveyard: Array<Retainer<TNode>> | undefined;
	let childrenByKey: Map<Key, Retainer<TNode>> | undefined;
	let seenKeys: Set<Key> | undefined;
	let isAsync = false;
	let oi = 0;
	let oldLength = oldRetained.length;
	for (let ni = 0, newLength = newChildren.length; ni < newLength; ni++) {
		// length checks to prevent index out of bounds deoptimizations.
		let ret = oi >= oldLength ? undefined : oldRetained[oi];
		let child = narrow(newChildren[ni]);
		{
			// aligning new children with old retainers
			let oldKey = typeof ret === "object" ? ret.el.key : undefined;
			let newKey = typeof child === "object" ? child.key : undefined;
			if (newKey !== undefined && seenKeys && seenKeys.has(newKey)) {
				console.error("Duplicate key", newKey);
				newKey = undefined;
			}

			if (oldKey === newKey) {
				if (childrenByKey !== undefined && newKey !== undefined) {
					childrenByKey.delete(newKey);
				}

				oi++;
			} else {
				childrenByKey = childrenByKey || createChildrenByKey(oldRetained, oi);
				if (newKey === undefined) {
					while (ret !== undefined && oldKey !== undefined) {
						oi++;
						ret = oldRetained[oi];
						oldKey = typeof ret === "object" ? ret.el.key : undefined;
					}

					oi++;
				} else {
					ret = childrenByKey.get(newKey);
					if (ret !== undefined) {
						childrenByKey.delete(newKey);
					}

					(seenKeys = seenKeys || new Set()).add(newKey);
				}
			}
		}

		// Updating
		let value: Promise<ElementValue<TNode>> | ElementValue<TNode>;
		if (typeof child === "object") {
			if (child.tag === Copy) {
				value = getInflightValue(ret);
			} else {
				let oldProps: Record<string, any> | undefined;
				let static_ = false;
				if (typeof ret === "object" && ret.el.tag === child.tag) {
					oldProps = ret.el.props;
					ret.el = child;
					if (child.static_) {
						value = getInflightValue(ret);
						static_ = true;
					}
				} else {
					if (typeof ret === "object") {
						(graveyard = graveyard || []).push(ret);
					}

					const fallback = ret;
					ret = new Retainer<TNode>(child);
					ret.fallbackValue = fallback;
				}

				if (static_) {
					// pass
				} else if (child.tag === Raw) {
					// what do we pass in here?
					value = updateRaw(renderer, ret, scope, oldProps);
				} else if (child.tag === Fragment) {
					value = updateFragment(
						renderer,
						root,
						host,
						ctx,
						scope,
						ret,
						// TODO: pass in hydration children
					);
				} else if (typeof child.tag === "function") {
					value = updateComponent(
						renderer,
						root,
						host,
						ctx,
						scope,
						ret,
						oldProps,
						// TODO: pass in hydration children
					);
				} else {
					// TODO: pass in a hydration flag
					value = updateHost(renderer, root, ctx, scope, ret, oldProps);
				}
			}

			const ref = child.ref;
			// TODO: we have to make sure committing is done in order for hydration
			// purposes.
			if (isPromiseLike(value)) {
				isAsync = true;
				if (typeof ref === "function") {
					value = value.then((value) => {
						ref(renderer.read(value));
						return value;
					});
				}
			} else {
				if (typeof ref === "function") {
					ref(renderer.read(value));
				}
			}
		} else {
			// child is a string or undefined
			if (typeof ret === "object") {
				(graveyard = graveyard || []).push(ret);
			}

			if (typeof child === "string") {
				value = ret = renderer.escape(child, scope);
			} else {
				ret = undefined;
			}
		}

		values[ni] = value;
		newRetained[ni] = ret;
	}

	// cleanup remaining retainers
	for (; oi < oldLength; oi++) {
		const ret = oldRetained[oi];
		if (typeof ret === "object" && typeof ret.el.key === "undefined") {
			(graveyard = graveyard || []).push(ret);
		}
	}

	if (childrenByKey !== undefined && childrenByKey.size > 0) {
		(graveyard = graveyard || []).push(...childrenByKey.values());
	}

	parent.children = unwrap(newRetained);
	if (isAsync) {
		let childValues1 = Promise.all(values).finally(() => {
			if (graveyard) {
				for (let i = 0; i < graveyard.length; i++) {
					unmount(renderer, host, ctx, graveyard[i]);
				}
			}
		});

		let onChildValues!: Function;
		childValues1 = Promise.race([
			childValues1,
			new Promise<any>((resolve) => (onChildValues = resolve)),
		]);

		if (parent.onNextValues) {
			parent.onNextValues(childValues1);
		}

		parent.onNextValues = onChildValues;
		return childValues1.then((childValues) => {
			parent.inflightValue = parent.fallbackValue = undefined;
			return normalize(childValues);
		});
	} else {
		if (graveyard) {
			for (let i = 0; i < graveyard.length; i++) {
				unmount(renderer, host, ctx, graveyard[i]);
			}
		}

		if (parent.onNextValues) {
			parent.onNextValues(values);
			parent.onNextValues = undefined;
		}

		parent.inflightValue = parent.fallbackValue = undefined;
		// We can assert there are no promises in the array because isAsync is false
		return normalize(values as Array<ElementValue<TNode>>);
	}
}

function createChildrenByKey<TNode>(
	children: Array<RetainerChild<TNode>>,
	offset: number,
): Map<Key, Retainer<TNode>> {
	const childrenByKey = new Map<Key, Retainer<TNode>>();
	for (let i = offset; i < children.length; i++) {
		const child = children[i];
		if (typeof child === "object" && typeof child.el.key !== "undefined") {
			childrenByKey.set(child.el.key, child);
		}
	}

	return childrenByKey;
}

function getInflightValue<TNode>(
	child: RetainerChild<TNode>,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (typeof child !== "object") {
		return child;
	}

	const ctx: ContextImpl<TNode> | undefined =
		typeof child.el.tag === "function" ? child.ctx : undefined;
	if (ctx && ctx.f & IsUpdating && ctx.inflightValue) {
		return ctx.inflightValue;
	} else if (child.inflightValue) {
		return child.inflightValue;
	}

	return getValue(child);
}

function updateRaw<TNode, TScope>(
	renderer: RendererImpl<TNode, TScope, TNode, unknown>,
	ret: Retainer<TNode>,
	scope: TScope | undefined,
	oldProps: Record<string, any> | undefined,
): ElementValue<TNode> {
	const props = ret.el.props;
	if (typeof props.value === "string") {
		if (!oldProps || oldProps.value !== props.value) {
			ret.value = renderer.parse(props.value, scope);
		}
	} else {
		ret.value = props.value;
	}

	return ret.value;
}

function updateFragment<TNode, TScope, TRoot extends TNode>(
	renderer: RendererImpl<TNode, TScope, TRoot, unknown>,
	root: TRoot | undefined,
	host: Retainer<TNode>,
	ctx: ContextImpl<TNode, TScope, TRoot> | undefined,
	scope: TScope | undefined,
	ret: Retainer<TNode>,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	const childValues = diffChildren(
		renderer,
		root,
		host,
		ctx,
		scope,
		ret,
		ret.el.props.children,
		// TODO: pass in hydrating children
	);

	if (isPromiseLike(childValues)) {
		ret.inflightValue = childValues.then((childValues) => unwrap(childValues));
		return ret.inflightValue;
	}

	return unwrap(childValues);
}

function updateHost<TNode, TScope, TRoot extends TNode>(
	renderer: RendererImpl<TNode, TScope, TRoot, unknown>,
	root: TRoot | undefined,
	ctx: ContextImpl<TNode, TScope, TRoot> | undefined,
	scope: TScope | undefined,
	ret: Retainer<TNode>,
	oldProps: Record<string, any> | undefined,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	const el = ret.el;
	const tag = el.tag as string | symbol;
	if (el.tag === Portal) {
		root = ret.value = el.props.root;
	}

	scope = renderer.scope(scope, tag, el.props);
	const childValues = diffChildren(
		renderer,
		root,
		ret,
		ctx,
		scope,
		ret,
		ret.el.props.children,
		// TODO: pass hydration nodes
	);

	if (isPromiseLike(childValues)) {
		ret.inflightValue = childValues.then((childValues) =>
			commitHost(renderer, scope, ret, childValues, oldProps),
		);

		return ret.inflightValue;
	}

	return commitHost(renderer, scope, ret, childValues, oldProps);
}

function commitHost<TNode, TScope>(
	renderer: RendererImpl<TNode, TScope, TNode, unknown>,
	scope: TScope,
	ret: Retainer<TNode>,
	childValues: Array<TNode | string>,
	oldProps: Record<string, any> | undefined,
): ElementValue<TNode> {
	const tag = ret.el.tag as string | symbol;
	let value = ret.value as TNode;
	let props = ret.el.props;
	let copied: Set<string> | undefined;
	if (tag !== Portal) {
		if (ret.value == null) {
			// This assumes that renderer.create does not return nullish values.
			value = ret.value = renderer.create(tag, props, scope);
		}

		for (const propName in {...oldProps, ...props}) {
			const propValue = props[propName];
			if (propValue === Copy) {
				// TODO: The Copy tag doubles as a way to skip the patching of a prop.
				// Not sure about this feature. Should probably be removed.
				(copied = copied || new Set()).add(propName);
			} else if (propName !== "children") {
				renderer.patch(
					tag,
					value,
					propName,
					propValue,
					oldProps && oldProps[propName],
					scope,
				);
			}
		}
	}

	if (copied) {
		props = {...ret.el.props};
		for (const name of copied) {
			props[name] = oldProps && oldProps[name];
		}

		ret.el = new Element(tag, props, ret.el.key, ret.el.ref);
	}

	renderer.arrange(
		tag,
		value,
		props,
		childValues,
		oldProps,
		wrap(ret.cachedChildValues),
	);
	ret.cachedChildValues = unwrap(childValues);
	if (tag === Portal) {
		flush(renderer, ret.value);
		return;
	}

	return value;
}

function flush<TRoot>(
	renderer: RendererImpl<unknown, unknown, TRoot>,
	root: TRoot,
	initiator?: ContextImpl,
) {
	renderer.flush(root);
	if (typeof root !== "object" || root === null) {
		return;
	}

	const flushMap = flushMaps.get(root as any);
	if (flushMap) {
		if (initiator) {
			const flushMap1 = new Map<ContextImpl, Set<Function>>();
			for (let [ctx, callbacks] of flushMap) {
				if (!ctxContains(initiator, ctx)) {
					flushMap.delete(ctx);
					flushMap1.set(ctx, callbacks);
				}
			}

			if (flushMap1.size) {
				flushMaps.set(root as any, flushMap1);
			} else {
				flushMaps.delete(root as any);
			}
		} else {
			flushMaps.delete(root as any);
		}

		for (const [ctx, callbacks] of flushMap) {
			const value = renderer.read(getValue(ctx.ret));
			for (const callback of callbacks) {
				callback(value);
			}
		}
	}
}

function unmount<TNode, TScope, TRoot extends TNode, TResult>(
	renderer: RendererImpl<TNode, TScope, TRoot, TResult>,
	host: Retainer<TNode>,
	ctx: ContextImpl<TNode, TScope, TRoot, TResult> | undefined,
	ret: Retainer<TNode>,
): void {
	if (typeof ret.el.tag === "function") {
		ctx = ret.ctx as ContextImpl<TNode, TScope, TRoot, TResult>;
		unmountComponent(ctx);
	} else if (ret.el.tag === Portal) {
		host = ret;
		renderer.arrange(
			Portal,
			host.value as TNode,
			host.el.props,
			[],
			host.el.props,
			wrap(host.cachedChildValues),
		);
		flush(renderer, host.value);
	} else if (ret.el.tag !== Fragment) {
		if (isEventTarget(ret.value)) {
			const records = getListenerRecords(ctx, host);
			for (let i = 0; i < records.length; i++) {
				const record = records[i];
				ret.value.removeEventListener(
					record.type,
					record.callback,
					record.options,
				);
			}
		}

		renderer.dispose(ret.el.tag, ret.value as TNode, ret.el.props);
		host = ret;
	}

	const children = wrap(ret.children);
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (typeof child === "object") {
			unmount(renderer, host, ctx, child);
		}
	}
}

/*** CONTEXT FLAGS ***/
/**
 * A flag which is true when the component is initialized or updated by an
 * ancestor component or the root render call.
 *
 * Used to determine things like whether the nearest host ancestor needs to be
 * rearranged.
 */
const IsUpdating = 1 << 0;

/**
 * A flag which is true when the component is synchronously executing.
 *
 * Used to guard against components triggering stack overflow or generator error.
 */
const IsSyncExecuting = 1 << 1;

/**
 * A flag which is true when the component is in the render loop.
 */
const IsInRenderLoop = 1 << 2;

/**
 * A flag which is true when the component starts the render loop but has not
 * yielded yet.
 *
 * Used to make sure that components yield at least once per loop.
 */
const NeedsToYield = 1 << 3;

/**
 * A flag used by async generator components in conjunction with the
 * onAvailable callback to mark whether new props can be pulled via the context
 * async iterator. See the Symbol.asyncIterator method and the
 * resumeCtxIterator function.
 */
const PropsAvailable = 1 << 4;

/**
 * A flag which is set when a component errors.
 *
 * NOTE: This is mainly used to prevent some false positives in component
 * yields or returns undefined warnings. The reason we’re using this versus
 * IsUnmounted is a very troubling test (cascades sync generator parent and
 * sync generator child) where synchronous code causes a stack overflow error
 * in a non-deterministic way. Deeply disturbing stuff.
 */
const IsErrored = 1 << 6;

/**
 * A flag which is set when the component is unmounted. Unmounted components
 * are no longer in the element tree and cannot refresh or rerender.
 */
const IsUnmounted = 1 << 7;

/**
 * A flag which indicates that the component is a sync generator component.
 */
const IsSyncGen = 1 << 8;

/**
 * A flag which indicates that the component is an async generator component.
 */
const IsAsyncGen = 1 << 9;

/**
 * A flag which is set while schedule callbacks are called.
 */
const IsScheduling = 1 << 10;

/**
 * A flag which is set when a schedule callback calls refresh.
 */
const IsSchedulingRefresh = 1 << 11;

export interface Context extends Crank.Context {}

/**
 * An interface which can be extended to provide strongly typed provisions.
 * See Context.prototype.consume and Context.prototype.provide.
 */
export interface ProvisionMap extends Crank.ProvisionMap {}

const provisionMaps = new WeakMap<ContextImpl, Map<unknown, unknown>>();

const scheduleMap = new WeakMap<ContextImpl, Set<Function>>();

const cleanupMap = new WeakMap<ContextImpl, Set<Function>>();

// keys are roots
const flushMaps = new WeakMap<object, Map<ContextImpl, Set<Function>>>();

/**
 * @internal
 * The internal class which holds context data.
 */
class ContextImpl<
	TNode = unknown,
	TScope = unknown,
	TRoot extends TNode = TNode,
	TResult = unknown,
> {
	/** A bitmask. See CONTEXT FLAGS above. */
	declare f: number;

	/** The actual context associated with this impl. */
	declare owner: Context<unknown, TResult>;

	/**
	 * The renderer which created this context.
	 */
	declare renderer: RendererImpl<TNode, TScope, TRoot, TResult>;

	/** The root node as set by the nearest ancestor portal. */
	declare root: TRoot | undefined;

	/**
	 * The nearest ancestor host or portal retainer.
	 *
	 * When refresh is called, the host element will be arranged as the last step
	 * of the commit, to make sure the parent’s children properly reflects the
	 * components’s children.
	 */
	declare host: Retainer<TNode>;

	/** The parent context impl. */
	declare parent: ContextImpl<TNode, TScope, TRoot, TResult> | undefined;

	/** The value of the scope at the point of element’s creation. */
	declare scope: TScope | undefined;

	/** The internal node associated with this context. */
	declare ret: Retainer<TNode>;

	/**
	 * The iterator returned by the component function.
	 *
	 * Existence of this property implies that the component is a generator
	 * component. It is deleted when a component is returned.
	 */
	declare iterator:
		| Iterator<Children, Children | void, unknown>
		| AsyncIterator<Children, Children | void, unknown>
		| undefined;

	// The following properties are used to implement the
	declare inflightBlock: Promise<unknown> | undefined;
	declare inflightValue: Promise<ElementValue<TNode>> | undefined;
	declare enqueuedBlock: Promise<unknown> | undefined;
	declare enqueuedValue: Promise<ElementValue<TNode>> | undefined;

	// The following callbacks are used to implement the async generator render
	// loop behavior.
	declare onProps: ((props: Record<string, any>) => unknown) | undefined;
	declare onPropsRequested: Function | undefined;
	constructor(
		renderer: RendererImpl<TNode, TScope, TRoot, TResult>,
		root: TRoot | undefined,
		host: Retainer<TNode>,
		parent: ContextImpl<TNode, TScope, TRoot, TResult> | undefined,
		scope: TScope | undefined,
		ret: Retainer<TNode>,
	) {
		this.f = 0;
		this.owner = new Context(this);
		this.renderer = renderer;
		this.root = root;
		this.host = host;
		this.parent = parent;
		this.scope = scope;
		this.ret = ret;

		this.iterator = undefined;
		this.inflightBlock = undefined;
		this.inflightValue = undefined;
		this.enqueuedBlock = undefined;
		this.enqueuedValue = undefined;
		this.onProps = undefined;
		this.onPropsRequested = undefined;
	}
}

const _ContextImpl = Symbol.for("crank.ContextImpl");

type ComponentProps<T> = T extends (props: infer U) => any ? U : T;
/**
 * A class which is instantiated and passed to every component as its this
 * value. Contexts form a tree just like elements and all components in the
 * element tree are connected via contexts. Components can use this tree to
 * communicate data upwards via events and downwards via provisions.
 *
 * @template [TProps=*] - The expected shape of the props passed to the
 * component. Used to strongly type the Context iterator methods.
 * @template [TResult=*] - The readable element value type. It is used in
 * places such as the return value of refresh and the argument passed to
 * schedule and cleanup callbacks.
 */
export class Context<TProps = any, TResult = any> implements EventTarget {
	/**
	 * @internal
	 */
	declare [_ContextImpl]: ContextImpl<unknown, unknown, unknown, TResult>;

	// TODO: If we could make the constructor function take a nicer value, it
	// would be useful for testing purposes.
	constructor(impl: ContextImpl<unknown, unknown, unknown, TResult>) {
		this[_ContextImpl] = impl;
	}

	/**
	 * The current props of the associated element.
	 *
	 * Typically, you should read props either via the first parameter of the
	 * component or via the context iterator methods. This property is mainly for
	 * plugins or utilities which wrap contexts.
	 */
	get props(): ComponentProps<TProps> {
		return this[_ContextImpl].ret.el.props;
	}

	// TODO: Should we rename this???
	/**
	 * The current value of the associated element.
	 *
	 * Typically, you should read values via refs, generator yield expressions,
	 * or the refresh, schedule, cleanup, or flush methods. This property is
	 * mainly for plugins or utilities which wrap contexts.
	 */
	get value(): TResult {
		return this[_ContextImpl].renderer.read(getValue(this[_ContextImpl].ret));
	}

	*[Symbol.iterator](): Generator<ComponentProps<TProps>> {
		const ctx = this[_ContextImpl];
		if (ctx.f & IsAsyncGen) {
			throw new Error("Use for await…of in async generator components");
		}

		try {
			ctx.f |= IsInRenderLoop;
			while (!(ctx.f & IsUnmounted)) {
				if (ctx.f & NeedsToYield) {
					throw new Error("Context iterated twice without a yield");
				} else {
					ctx.f |= NeedsToYield;
				}

				yield ctx.ret.el.props!;
			}
		} finally {
			ctx.f &= ~IsInRenderLoop;
		}
	}

	async *[Symbol.asyncIterator](): AsyncGenerator<ComponentProps<TProps>> {
		const ctx = this[_ContextImpl];
		if (ctx.f & IsSyncGen) {
			throw new Error("Use for…of in sync generator components");
		}

		try {
			// await an empty promise to prevent the IsInRenderLoop flag from
			// returning false positives in the case of async generator components
			// which immediately enter the loop
			ctx.f |= IsInRenderLoop;
			while (!(ctx.f & IsUnmounted)) {
				if (ctx.f & NeedsToYield) {
					throw new Error("Context iterated twice without a yield");
				} else {
					ctx.f |= NeedsToYield;
				}

				if (ctx.f & PropsAvailable) {
					ctx.f &= ~PropsAvailable;
					yield ctx.ret.el.props;
				} else {
					const props = await new Promise((resolve) => (ctx.onProps = resolve));
					if (ctx.f & IsUnmounted) {
						break;
					}

					yield props as ComponentProps<TProps>;
				}

				if (ctx.onPropsRequested) {
					ctx.onPropsRequested();
					ctx.onPropsRequested = undefined;
				}
			}
		} finally {
			ctx.f &= ~IsInRenderLoop;
			if (ctx.onPropsRequested) {
				ctx.onPropsRequested();
				ctx.onPropsRequested = undefined;
			}
		}
	}

	/**
	 * Re-executes a component.
	 *
	 * @returns The rendered value of the component or a promise thereof if the
	 * component or its children execute asynchronously.
	 *
	 * The refresh method works a little differently for async generator
	 * components, in that it will resume the Context’s props async iterator
	 * rather than resuming execution. This is because async generator components
	 * are perpetually resumed independent of updates, and rely on the props
	 * async iterator to suspend.
	 */
	refresh(): Promise<TResult> | TResult {
		const ctx = this[_ContextImpl];
		if (ctx.f & IsUnmounted) {
			console.error("Component is unmounted");
			return ctx.renderer.read(undefined);
		} else if (ctx.f & IsSyncExecuting) {
			console.error("Component is already executing");
			return this.value;
		}

		const value = enqueueComponentRun(ctx);
		if (isPromiseLike(value)) {
			return (value as Promise<any>).then((value) => ctx.renderer.read(value));
		}

		return ctx.renderer.read(value);
	}

	/**
	 * Registers a callback which fires when the component commits. Will only
	 * fire once per callback and update.
	 */
	schedule(callback: (value: TResult) => unknown): void {
		const ctx = this[_ContextImpl];
		let callbacks = scheduleMap.get(ctx);
		if (!callbacks) {
			callbacks = new Set<Function>();
			scheduleMap.set(ctx, callbacks);
		}

		callbacks.add(callback);
	}

	/**
	 * Registers a callback which fires when the component’s children are
	 * rendered into the root. Will only fire once per callback and render.
	 */
	flush(callback: (value: TResult) => unknown): void {
		const ctx = this[_ContextImpl];
		if (typeof ctx.root !== "object" || ctx.root === null) {
			return;
		}

		let flushMap = flushMaps.get(ctx.root);
		if (!flushMap) {
			flushMap = new Map<ContextImpl, Set<Function>>();
			flushMaps.set(ctx.root, flushMap);
		}

		let callbacks = flushMap.get(ctx);
		if (!callbacks) {
			callbacks = new Set<Function>();
			flushMap.set(ctx, callbacks);
		}

		callbacks.add(callback);
	}

	/**
	 * Registers a callback which fires when the component unmounts. Will only
	 * fire once per callback.
	 */
	cleanup(callback: (value: TResult) => unknown): void {
		const ctx = this[_ContextImpl];
		let callbacks = cleanupMap.get(ctx);
		if (!callbacks) {
			callbacks = new Set<Function>();
			cleanupMap.set(ctx, callbacks);
		}

		callbacks.add(callback);
	}

	consume<TKey extends keyof ProvisionMap>(key: TKey): ProvisionMap[TKey];
	consume(key: unknown): any;
	consume(key: unknown): any {
		for (
			let ctx = this[_ContextImpl].parent;
			ctx !== undefined;
			ctx = ctx.parent
		) {
			const provisions = provisionMaps.get(ctx);
			if (provisions && provisions.has(key)) {
				return provisions.get(key)!;
			}
		}
	}

	provide<TKey extends keyof ProvisionMap>(
		key: TKey,
		value: ProvisionMap[TKey],
	): void;
	provide(key: unknown, value: any): void;
	provide(key: unknown, value: any): void {
		const ctx = this[_ContextImpl];
		let provisions = provisionMaps.get(ctx);
		if (!provisions) {
			provisions = new Map();
			provisionMaps.set(ctx, provisions);
		}

		provisions.set(key, value);
	}

	addEventListener<T extends string>(
		type: T,
		listener: MappedEventListenerOrEventListenerObject<T> | null,
		options?: boolean | AddEventListenerOptions,
	): void {
		const ctx = this[_ContextImpl];
		let listeners: Array<EventListenerRecord>;
		if (!isListenerOrListenerObject(listener)) {
			return;
		} else {
			const listeners1 = listenersMap.get(ctx);
			if (listeners1) {
				listeners = listeners1;
			} else {
				listeners = [];
				listenersMap.set(ctx, listeners);
			}
		}

		options = normalizeListenerOptions(options);
		let callback: MappedEventListener<T>;
		if (typeof listener === "object") {
			callback = () => listener.handleEvent.apply(listener, arguments as any);
		} else {
			callback = listener;
		}

		const record: EventListenerRecord = {type, listener, callback, options};
		if (options.once) {
			record.callback = function (this: any) {
				const i = listeners.indexOf(record);
				if (i !== -1) {
					listeners.splice(i, 1);
				}

				return callback.apply(this, arguments as any);
			};
		}

		if (
			listeners.some(
				(record1) =>
					record.type === record1.type &&
					record.listener === record1.listener &&
					!record.options.capture === !record1.options.capture,
			)
		) {
			return;
		}

		listeners.push(record);

		// TODO: is it possible to separate out the EventTarget delegation logic
		for (const value of getChildValues(ctx.ret)) {
			if (isEventTarget(value)) {
				value.addEventListener(record.type, record.callback, record.options);
			}
		}
	}

	removeEventListener<T extends string>(
		type: T,
		listener: MappedEventListenerOrEventListenerObject<T> | null,
		options?: EventListenerOptions | boolean,
	): void {
		const ctx = this[_ContextImpl];
		const listeners = listenersMap.get(ctx);
		if (listeners == null || !isListenerOrListenerObject(listener)) {
			return;
		}

		const options1 = normalizeListenerOptions(options);
		const i = listeners.findIndex(
			(record) =>
				record.type === type &&
				record.listener === listener &&
				!record.options.capture === !options1.capture,
		);

		if (i === -1) {
			return;
		}

		const record = listeners[i];
		listeners.splice(i, 1);

		// TODO: is it possible to separate out the EventTarget delegation logic
		for (const value of getChildValues(ctx.ret)) {
			if (isEventTarget(value)) {
				value.removeEventListener(record.type, record.callback, record.options);
			}
		}
	}

	dispatchEvent(ev: Event): boolean {
		const ctx = this[_ContextImpl];
		const path: Array<ContextImpl> = [];
		for (
			let parent = ctx.parent;
			parent !== undefined;
			parent = parent.parent
		) {
			path.push(parent);
		}

		// We patch the stopImmediatePropagation method because ev.cancelBubble
		// only informs us if stopPropagation was called and there are no
		// properties which inform us if stopImmediatePropagation was called.
		let immediateCancelBubble = false;
		const stopImmediatePropagation = ev.stopImmediatePropagation;
		setEventProperty(ev, "stopImmediatePropagation", () => {
			immediateCancelBubble = true;
			return stopImmediatePropagation.call(ev);
		});
		setEventProperty(ev, "target", ctx.owner);

		// The only possible errors in this block are errors thrown by callbacks,
		// and dispatchEvent will only log these errors rather than throwing
		// them. Therefore, we place all code in a try block, log errors in the
		// catch block, and use an unsafe return statement in the finally block.
		//
		// Each early return within the try block returns true because while the
		// return value is overridden in the finally block, TypeScript
		// (justifiably) does not recognize the unsafe return statement.
		try {
			setEventProperty(ev, "eventPhase", CAPTURING_PHASE);
			for (let i = path.length - 1; i >= 0; i--) {
				const target = path[i];
				const listeners = listenersMap.get(target);
				if (listeners) {
					setEventProperty(ev, "currentTarget", target.owner);
					for (const record of listeners) {
						if (record.type === ev.type && record.options.capture) {
							try {
								record.callback.call(target.owner, ev);
							} catch (err) {
								console.error(err);
							}

							if (immediateCancelBubble) {
								return true;
							}
						}
					}
				}

				if (ev.cancelBubble) {
					return true;
				}
			}

			{
				setEventProperty(ev, "eventPhase", AT_TARGET);
				setEventProperty(ev, "currentTarget", ctx.owner);
				const propCallback = ctx.ret.el.props["on" + ev.type];
				if (propCallback != null) {
					propCallback(ev);
					if (immediateCancelBubble || ev.cancelBubble) {
						return true;
					}
				}

				const listeners = listenersMap.get(ctx);
				if (listeners) {
					for (const record of listeners) {
						if (record.type === ev.type) {
							try {
								record.callback.call(ctx.owner, ev);
							} catch (err) {
								console.error(err);
							}

							if (immediateCancelBubble) {
								return true;
							}
						}
					}

					if (ev.cancelBubble) {
						return true;
					}
				}
			}

			if (ev.bubbles) {
				setEventProperty(ev, "eventPhase", BUBBLING_PHASE);
				for (let i = 0; i < path.length; i++) {
					const target = path[i];
					const listeners = listenersMap.get(target);
					if (listeners) {
						setEventProperty(ev, "currentTarget", target.owner);
						for (const record of listeners) {
							if (record.type === ev.type && !record.options.capture) {
								try {
									record.callback.call(target.owner, ev);
								} catch (err) {
									console.error(err);
								}

								if (immediateCancelBubble) {
									return true;
								}
							}
						}
					}

					if (ev.cancelBubble) {
						return true;
					}
				}
			}
		} finally {
			setEventProperty(ev, "eventPhase", NONE);
			setEventProperty(ev, "currentTarget", null);
			// eslint-disable-next-line no-unsafe-finally
			return !ev.defaultPrevented;
		}
	}
}

/*** PRIVATE CONTEXT FUNCTIONS ***/
function ctxContains(parent: ContextImpl, child: ContextImpl): boolean {
	for (
		let current: ContextImpl | undefined = child;
		current !== undefined;
		current = current.parent
	) {
		if (current === parent) {
			return true;
		}
	}

	return false;
}

function updateComponent<TNode, TScope, TRoot extends TNode, TResult>(
	renderer: RendererImpl<TNode, TScope, TRoot, TResult>,
	root: TRoot | undefined,
	host: Retainer<TNode>,
	parent: ContextImpl<TNode, TScope, TRoot, TResult> | undefined,
	scope: TScope | undefined,
	ret: Retainer<TNode>,
	oldProps: Record<string, any> | undefined,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	let ctx: ContextImpl<TNode, TScope, TRoot, TResult>;
	if (oldProps) {
		if (ret.ctx == null) {
			throw new Error("Hmmm");
		}
		ctx = ret.ctx as ContextImpl<TNode, TScope, TRoot, TResult>;
		if (ctx.f & IsSyncExecuting) {
			console.error("Component is already executing");
			return ret.cachedChildValues;
		}
	} else {
		ctx = ret.ctx = new ContextImpl(renderer, root, host, parent, scope, ret);
	}

	ctx.f |= IsUpdating;
	return enqueueComponentRun(ctx);
}

function updateComponentChildren<TNode, TResult>(
	ctx: ContextImpl<TNode, unknown, TNode, TResult>,
	children: Children,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (ctx.f & IsUnmounted) {
		return;
	} else if (ctx.f & IsErrored) {
		// This branch is necessary for some race conditions where this function is
		// called after iterator.throw() in async generator components.
		return;
	} else if (children === undefined) {
		console.error(
			"A component has returned or yielded undefined. If this was intentional, return or yield null instead.",
		);
	}

	let childValues: Promise<Array<string | TNode>> | Array<string | TNode>;
	try {
		// TODO: WAT
		// We set the isExecuting flag in case a child component dispatches an event
		// which bubbles to this component and causes a synchronous refresh().
		ctx.f |= IsSyncExecuting;
		childValues = diffChildren(
			ctx.renderer,
			ctx.root,
			ctx.host,
			ctx,
			ctx.scope,
			ctx.ret,
			narrow(children),
			// TODO: hydration
		);
	} finally {
		ctx.f &= ~IsSyncExecuting;
	}

	if (isPromiseLike(childValues)) {
		ctx.ret.inflightValue = childValues.then((childValues) =>
			commitComponent(ctx, childValues),
		);

		return ctx.ret.inflightValue;
	}

	return commitComponent(ctx, childValues);
}

function commitComponent<TNode>(
	ctx: ContextImpl<TNode, unknown, TNode>,
	values: Array<TNode | string>,
): ElementValue<TNode> {
	if (ctx.f & IsUnmounted) {
		return;
	}

	const listeners = listenersMap.get(ctx);
	if (listeners && listeners.length) {
		for (let i = 0; i < values.length; i++) {
			const value = values[i];
			if (isEventTarget(value)) {
				for (let j = 0; j < listeners.length; j++) {
					const record = listeners[j];
					value.addEventListener(record.type, record.callback, record.options);
				}
			}
		}
	}

	const oldValues = wrap(ctx.ret.cachedChildValues);
	let value = (ctx.ret.cachedChildValues = unwrap(values));
	if (ctx.f & IsScheduling) {
		ctx.f |= IsSchedulingRefresh;
	} else if (!(ctx.f & IsUpdating)) {
		// If we’re not updating the component, which happens when components are
		// refreshed, or when async generator components iterate, we have to do a
		// little bit housekeeping when a component’s child values have changed.
		if (!arrayEqual(oldValues, values)) {
			const records = getListenerRecords(ctx.parent, ctx.host);
			if (records.length) {
				for (let i = 0; i < values.length; i++) {
					const value = values[i];
					if (isEventTarget(value)) {
						for (let j = 0; j < records.length; j++) {
							const record = records[j];
							value.addEventListener(
								record.type,
								record.callback,
								record.options,
							);
						}
					}
				}
			}

			// rearranging the nearest ancestor host element
			const host = ctx.host;
			const oldHostValues = wrap(host.cachedChildValues);
			invalidate(ctx, host);
			const hostValues = getChildValues(host);
			ctx.renderer.arrange(
				host.el.tag as string | symbol,
				host.value as TNode,
				host.el.props,
				hostValues,
				// props and oldProps are the same because the host isn’t updated.
				host.el.props,
				oldHostValues,
			);
		}

		flush(ctx.renderer, ctx.root, ctx);
	}

	const callbacks = scheduleMap.get(ctx);
	if (callbacks) {
		scheduleMap.delete(ctx);
		ctx.f |= IsScheduling;
		const value1 = ctx.renderer.read(value);
		for (const callback of callbacks) {
			callback(value1);
		}

		ctx.f &= ~IsScheduling;
		// Handles an edge case where refresh() is called during a schedule().
		if (ctx.f & IsSchedulingRefresh) {
			ctx.f &= ~IsSchedulingRefresh;
			value = getValue(ctx.ret);
		}
	}

	ctx.f &= ~IsUpdating;
	return value;
}

function invalidate(ctx: ContextImpl, host: Retainer<unknown>): void {
	for (
		let parent = ctx.parent;
		parent !== undefined && parent.host === host;
		parent = parent.parent
	) {
		parent.ret.cachedChildValues = undefined;
	}

	host.cachedChildValues = undefined;
}

function arrayEqual<TValue>(arr1: Array<TValue>, arr2: Array<TValue>): boolean {
	if (arr1.length !== arr2.length) {
		return false;
	}

	for (let i = 0; i < arr1.length; i++) {
		const value1 = arr1[i];
		const value2 = arr2[i];
		if (value1 !== value2) {
			return false;
		}
	}

	return true;
}

/** Enqueues and executes the component associated with the context. */
function enqueueComponentRun<TNode, TResult>(
	ctx: ContextImpl<TNode, unknown, TNode, TResult>,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (ctx.f & IsAsyncGen) {
		// This branch will only run for async generator components after the
		// initial render.
		//
		// Async generator components which are in the props loop can be in one of
		// three states:
		//
		// 1. propsAvailable flag is true: "available"
		//
		//   The component is paused somewhere in the loop. When the component
		//   reaches the bottom of the loop, it will run again with the next props.
		//
		// 2. onAvailable callback is defined: "suspended"
		//
		//   The component has reached the bottom of the loop and is waiting for
		//   new props.
		//
		// 3. neither 1 or 2: "Running"
		//
		//   The component is paused somewhere in the loop. When the component
		//   reaches the bottom of the loop, it will suspend.
		//
		// By definition, components will never be both available and suspended at
		// the same time.
		//
		// If the component is at the loop bottom, this means that the next value
		// produced by the component will have the most up to date props, so we can
		// simply return the current inflight value. Otherwise, we have to wait for
		// the bottom of the loop before returning the inflight value.
		const isAtLoopbottom = ctx.f & IsInRenderLoop && !ctx.onProps;
		resumePropsIterator(ctx);
		if (isAtLoopbottom) {
			if (ctx.inflightBlock == null) {
				ctx.inflightBlock = new Promise(
					(resolve) => (ctx.onPropsRequested = resolve),
				);
			}

			return ctx.inflightBlock.then(() => {
				ctx.inflightBlock = undefined;
				return ctx.inflightValue;
			});
		}

		return ctx.inflightValue;
	} else if (!ctx.inflightBlock) {
		try {
			const [block, value] = runComponent<TNode, TResult>(ctx);
			if (block) {
				ctx.inflightBlock = block
					// TODO: there is some fuckery going on here related to async
					// generator components resuming when they’re meant to be returned.
					.then((v) => v)
					.finally(() => advanceComponent(ctx));
				// stepComponent will only return a block if the value is asynchronous
				ctx.inflightValue = value as Promise<ElementValue<TNode>>;
			}

			return value;
		} catch (err) {
			if (!(ctx.f & IsUpdating)) {
				return propagateError<TNode>(ctx.parent, err);
			}

			throw err;
		}
	} else if (!ctx.enqueuedBlock) {
		// We need to assign enqueuedBlock and enqueuedValue synchronously, hence
		// the Promise constructor call.
		let resolveEnqueuedBlock: Function;
		ctx.enqueuedBlock = new Promise(
			(resolve) => (resolveEnqueuedBlock = resolve),
		);

		ctx.enqueuedValue = ctx.inflightBlock.then(() => {
			try {
				const [block, value] = runComponent<TNode, TResult>(ctx);
				if (block) {
					resolveEnqueuedBlock(block.finally(() => advanceComponent(ctx)));
				}

				return value;
			} catch (err) {
				if (!(ctx.f & IsUpdating)) {
					return propagateError<TNode>(ctx.parent, err);
				}

				throw err;
			}
		});
	}

	return ctx.enqueuedValue;
}

/** Called when the inflight block promise settles. */
function advanceComponent(ctx: ContextImpl): void {
	if (ctx.f & IsAsyncGen) {
		return;
	}

	ctx.inflightBlock = ctx.enqueuedBlock;
	ctx.inflightValue = ctx.enqueuedValue;
	ctx.enqueuedBlock = undefined;
	ctx.enqueuedValue = undefined;
}

/**
 * This function is responsible for executing the component and handling all
 * the different component types. We cannot identify whether a component is a
 * generator or async without calling it and inspecting the return value.
 *
 * @returns {[block, value]} A tuple where
 * block - A possible promise which represents the duration during which the
 * component is blocked from updating.
 * value - A possible promise resolving to the rendered value of children.
 *
 * Each component type will block according to the type of the component.
 * - Sync function components never block and will transparently pass updates
 * to children.
 * - Async function components and async generator components block while
 * executing itself, but will not block for async children.
 * - Sync generator components block while any children are executing, because
 * they are expected to only resume when they’ve actually rendered.
 */
function runComponent<TNode, TResult>(
	ctx: ContextImpl<TNode, unknown, TNode, TResult>,
): [
	Promise<unknown> | undefined,
	Promise<ElementValue<TNode>> | ElementValue<TNode>,
] {
	const ret = ctx.ret;
	const initial = !ctx.iterator;
	if (initial) {
		resumePropsIterator(ctx);
		ctx.f |= IsSyncExecuting;
		clearEventListeners(ctx);
		let result: ReturnType<Component>;
		try {
			result = (ret.el.tag as Component).call(ctx.owner, ret.el.props);
		} catch (err) {
			ctx.f |= IsErrored;
			throw err;
		} finally {
			ctx.f &= ~IsSyncExecuting;
		}

		if (isIteratorLike(result)) {
			ctx.iterator = result;
		} else if (isPromiseLike(result)) {
			// async function component
			const result1 =
				result instanceof Promise ? result : Promise.resolve(result);
			const value = result1.then(
				(result) => updateComponentChildren<TNode, TResult>(ctx, result),
				(err) => {
					ctx.f |= IsErrored;
					throw err;
				},
			);
			return [result1.catch(NOOP), value];
		} else {
			// sync function component
			return [undefined, updateComponentChildren<TNode, TResult>(ctx, result)];
		}
	}

	let iteration!: Promise<ChildrenIteratorResult> | ChildrenIteratorResult;
	if (initial) {
		try {
			ctx.f |= IsSyncExecuting;
			iteration = ctx.iterator!.next();
		} catch (err) {
			ctx.f |= IsErrored;
			throw err;
		} finally {
			ctx.f &= ~IsSyncExecuting;
		}

		if (isPromiseLike(iteration)) {
			ctx.f |= IsAsyncGen;
			runAsyncGenComponent(ctx, iteration);
		} else {
			ctx.f |= IsSyncGen;
		}
	}

	if (ctx.f & IsSyncGen) {
		// sync generator component
		ctx.f &= ~NeedsToYield;
		if (!initial) {
			try {
				ctx.f |= IsSyncExecuting;
				iteration = ctx.iterator!.next(ctx.renderer.read(getValue(ret)));
			} catch (err) {
				ctx.f |= IsErrored;
				throw err;
			} finally {
				ctx.f &= ~IsSyncExecuting;
			}
		}

		if (isPromiseLike(iteration)) {
			throw new Error("Sync generator component returned an async iteration");
		}

		if (iteration.done) {
			ctx.f &= ~IsSyncGen;
			ctx.iterator = undefined;
		}

		let value: Promise<ElementValue<TNode>> | ElementValue<TNode>;
		try {
			value = updateComponentChildren<TNode, TResult>(
				ctx,
				// Children can be void so we eliminate that here
				iteration.value as Children,
			);

			if (isPromiseLike(value)) {
				value = value.catch((err) => handleChildError(ctx, err));
			}
		} catch (err) {
			value = handleChildError(ctx, err);
		}

		const block = isPromiseLike(value) ? value.catch(NOOP) : undefined;
		return [block, value];
	} else {
		// async generator component
		return [undefined, ctx.inflightValue];
	}
}

async function runAsyncGenComponent<TNode, TResult>(
	ctx: ContextImpl<TNode, unknown, TNode, TResult>,
	iterationP: Promise<ChildrenIteratorResult>,
): Promise<void> {
	let done = false;
	try {
		while (!done) {
			// inflightValue must be set synchronously.
			let onValue!: Function;
			ctx.inflightValue = new Promise((resolve) => (onValue = resolve));
			if (ctx.f & IsUpdating) {
				// We should not swallow unhandled promise rejections if the component is
				// updating independently.
				// TODO: Does this handle this.refresh() calls?
				ctx.inflightValue.catch(NOOP);
			}
			let iteration: ChildrenIteratorResult;
			try {
				iteration = await iterationP;
			} catch (err) {
				done = true;
				ctx.f |= IsErrored;
				onValue(Promise.reject(err));
				break;
			} finally {
				ctx.f &= ~NeedsToYield;
				if (!(ctx.f & IsInRenderLoop)) {
					ctx.f &= ~PropsAvailable;
				}
			}

			done = !!iteration.done;
			let value: Promise<ElementValue<TNode>> | ElementValue<TNode>;
			try {
				value = updateComponentChildren<TNode, TResult>(ctx, iteration.value!);
				if (isPromiseLike(value)) {
					value = value.catch((err: any) => handleChildError(ctx, err));
				}
			} catch (err) {
				done = true;
				// Do we need to catch potential errors here in the case of unhandled
				// promise rejections?
				value = handleChildError(ctx, err);
			} finally {
				onValue(value);
			}

			// TODO: this can be done more elegantly
			let oldValue: Promise<TResult> | TResult;
			if (ctx.ret.inflightValue) {
				// The value passed back into the generator as the argument to the next
				// method is a promise if an async generator component has async
				// children. Sync generator components only resume when their children
				// have fulfilled so the element’s inflight child values will never be
				// defined.
				oldValue = ctx.ret.inflightValue.then(
					(value) => ctx.renderer.read(value),
					() => ctx.renderer.read(undefined),
				);
			} else {
				oldValue = ctx.renderer.read(getValue(ctx.ret));
			}

			if (ctx.f & IsUnmounted) {
				if (ctx.f & IsInRenderLoop) {
					try {
						ctx.f |= IsSyncExecuting;
						iterationP = ctx.iterator!.next(
							oldValue,
						) as Promise<ChildrenIteratorResult>;
					} finally {
						ctx.f &= ~IsSyncExecuting;
					}
				} else {
					returnComponent(ctx);
					break;
				}
			} else if (!done) {
				try {
					ctx.f |= IsSyncExecuting;
					iterationP = ctx.iterator!.next(
						oldValue,
					) as Promise<ChildrenIteratorResult>;
				} finally {
					ctx.f &= ~IsSyncExecuting;
				}
			}
		}
	} finally {
		ctx.f &= ~IsAsyncGen;
		ctx.iterator = undefined;
	}
}

/**
 * Called to resume the props async iterator for async generator components.
 */
function resumePropsIterator(ctx: ContextImpl): void {
	if (ctx.onProps) {
		ctx.onProps(ctx.ret.el.props);
		ctx.onProps = undefined;
		ctx.f &= ~PropsAvailable;
	} else {
		ctx.f |= PropsAvailable;
	}
}

// TODO: async unmounting
function unmountComponent(ctx: ContextImpl): void {
	clearEventListeners(ctx);
	const callbacks = cleanupMap.get(ctx);
	if (callbacks) {
		cleanupMap.delete(ctx);
		const value = ctx.renderer.read(getValue(ctx.ret));
		for (const callback of callbacks) {
			callback(value);
		}
	}

	ctx.f |= IsUnmounted;
	if (ctx.iterator) {
		if (ctx.f & IsSyncGen) {
			let value: unknown;
			if (ctx.f & IsInRenderLoop) {
				value = enqueueComponentRun(ctx);
			}

			if (isPromiseLike(value)) {
				value.then(
					() => {
						if (ctx.f & IsInRenderLoop) {
							unmountComponent(ctx);
						} else {
							returnComponent(ctx);
						}
					},
					(err) => {
						propagateError<unknown>(ctx.parent, err);
					},
				);
			} else {
				if (ctx.f & IsInRenderLoop) {
					unmountComponent(ctx);
				} else {
					returnComponent(ctx);
				}
			}
		} else if (ctx.f & IsAsyncGen) {
			// The logic for unmounting async generator components is in the
			// runAsyncGenComponent function.
			resumePropsIterator(ctx);
		}
	}
}

function returnComponent(ctx: ContextImpl): void {
	resumePropsIterator(ctx);
	if (ctx.iterator && typeof ctx.iterator!.return === "function") {
		try {
			ctx.f |= IsSyncExecuting;
			const iteration = ctx.iterator!.return();
			if (isPromiseLike(iteration)) {
				iteration.catch((err) => propagateError<unknown>(ctx.parent, err));
			}
		} finally {
			ctx.f &= ~IsSyncExecuting;
		}
	}
}

/*** EVENT TARGET UTILITIES ***/
// EVENT PHASE CONSTANTS
// https://developer.mozilla.org/en-US/docs/Web/API/Event/eventPhase
const NONE = 0;
const CAPTURING_PHASE = 1;
const AT_TARGET = 2;
const BUBBLING_PHASE = 3;

const listenersMap = new WeakMap<ContextImpl, Array<EventListenerRecord>>();
/**
 * A map of event type strings to Event subclasses. Can be extended via
 * TypeScript module augmentation to have strongly typed event listeners.
 */
export interface EventMap extends Crank.EventMap {
	[type: string]: Event;
}

type MappedEventListener<T extends string> = (ev: EventMap[T]) => unknown;

type MappedEventListenerOrEventListenerObject<T extends string> =
	| MappedEventListener<T>
	| {handleEvent: MappedEventListener<T>};

function isListenerOrListenerObject(
	value: unknown,
): value is MappedEventListenerOrEventListenerObject<string> {
	return (
		typeof value === "function" ||
		(value !== null &&
			typeof value === "object" &&
			typeof (value as any).handleEvent === "function")
	);
}

interface EventListenerRecord {
	type: string;
	// listener is the original value passed to addEventListener, callback is the
	// transformed function
	listener: MappedEventListenerOrEventListenerObject<any>;
	callback: MappedEventListener<any>;
	options: AddEventListenerOptions;
}

function normalizeListenerOptions(
	options: AddEventListenerOptions | boolean | null | undefined,
): AddEventListenerOptions {
	if (typeof options === "boolean") {
		return {capture: options};
	} else if (options == null) {
		return {};
	}

	return options;
}

function isEventTarget(value: any): value is EventTarget {
	return (
		value != null &&
		typeof value.addEventListener === "function" &&
		typeof value.removeEventListener === "function" &&
		typeof value.dispatchEvent === "function"
	);
}

function setEventProperty<T extends keyof Event>(
	ev: Event,
	key: T,
	value: Event[T],
): void {
	Object.defineProperty(ev, key, {value, writable: false, configurable: true});
}

// TODO: Maybe we can pass in the current context directly, rather than
// starting from the parent?
/**
 * A function to reconstruct an array of every listener given a context and a
 * host element.
 *
 * This function exploits the fact that contexts retain their nearest ancestor
 * host element. We can determine all the contexts which are directly listening
 * to an element by traversing up the context tree and checking that the host
 * element passed in matches the parent context’s host element.
 */
function getListenerRecords(
	ctx: ContextImpl | undefined,
	ret: Retainer<unknown>,
): Array<EventListenerRecord> {
	let listeners: Array<EventListenerRecord> = [];
	while (ctx !== undefined && ctx.host === ret) {
		const listeners1 = listenersMap.get(ctx);
		if (listeners1) {
			listeners = listeners.concat(listeners1);
		}

		ctx = ctx.parent;
	}

	return listeners;
}

function clearEventListeners(ctx: ContextImpl): void {
	const listeners = listenersMap.get(ctx);
	if (listeners && listeners.length) {
		for (const value of getChildValues(ctx.ret)) {
			if (isEventTarget(value)) {
				for (const record of listeners) {
					value.removeEventListener(
						record.type,
						record.callback,
						record.options,
					);
				}
			}
		}

		listeners.length = 0;
	}
}

/*** ERROR HANDLING UTILITIES ***/
function handleChildError<TNode>(
	ctx: ContextImpl<TNode, unknown, TNode>,
	err: unknown,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (!ctx.iterator || typeof ctx.iterator.throw !== "function") {
		throw err;
	}

	resumePropsIterator(ctx);
	let iteration: ChildrenIteratorResult | Promise<ChildrenIteratorResult>;
	try {
		ctx.f |= IsSyncExecuting;
		iteration = ctx.iterator.throw(err);
	} catch (err) {
		ctx.f |= IsErrored;
		throw err;
	} finally {
		ctx.f &= ~IsSyncExecuting;
	}

	if (isPromiseLike(iteration)) {
		return iteration.then(
			(iteration) => {
				if (iteration.done) {
					ctx.f &= ~IsAsyncGen;
					ctx.iterator = undefined;
				}

				return updateComponentChildren(ctx, iteration.value as Children);
			},
			(err) => {
				ctx.f |= IsErrored;
				throw err;
			},
		);
	}

	if (iteration.done) {
		ctx.f &= ~IsSyncGen;
		ctx.iterator = undefined;
	}

	return updateComponentChildren(ctx, iteration.value as Children);
}

function propagateError<TNode>(
	ctx: ContextImpl<TNode, unknown, TNode> | undefined,
	err: unknown,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (ctx === undefined) {
		throw err;
	}

	let result: Promise<ElementValue<TNode>> | ElementValue<TNode>;
	try {
		result = handleChildError(ctx, err);
	} catch (err) {
		return propagateError<TNode>(ctx.parent, err);
	}

	if (isPromiseLike(result)) {
		return result.catch((err) => propagateError<TNode>(ctx.parent, err));
	}

	return result;
}

// TODO: uncomment and use in the Element interface below
// type CrankElement = Element;
declare global {
	namespace Crank {
		export interface EventMap {}

		export interface ProvisionMap {}

		export interface Context {}
	}

	namespace JSX {
		// TODO: JSX Element type (the result of JSX expressions) don’t work
		// because TypeScript demands that all Components return JSX elements for
		// some reason.
		// interface Element extends CrankElement {}

		export interface IntrinsicElements {
			[tag: string]: any;
		}

		export interface ElementChildrenAttribute {
			children: {};
		}
	}
}

// Some JSX transpilation tools expect these functions to be defined on the
// default export. Prefer named exports when importing directly.
export default {createElement, Fragment};
