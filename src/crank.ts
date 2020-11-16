/*** UTILITIES ***/
const NOOP = () => {};

function wrap<T>(value: Array<T> | T | undefined): Array<T> {
	return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function unwrap<T>(arr: Array<T>): Array<T> | T | undefined {
	return arr.length === 0 ? undefined : arr.length === 1 ? arr[0] : arr;
}

type NonStringIterable<T> = Iterable<T> & object;

/**
 * Ensures a value is an array. This function shallowly clones arrays and turns
 * iterables into arrays. It pretty much does the same thing as wrap above
 * except it handles more cases so it is appropriate for wrapping user-provided
 * data.
 */
function arrayify<T>(
	value: NonStringIterable<T> | T | null | undefined,
): Array<T> {
	return value == null
		? []
		: Array.isArray(value)
		? value.slice()
		: typeof value === "string" ||
		  typeof (value as any)[Symbol.iterator] === "undefined"
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
 * Represents all valid values which can be used for the tag of an element.
 *
 * @remarks
 * Elements whose tags are strings or symbols are called “host” or “intrinsic”
 * elements, and their behavior is determined by the renderer, while elements
 * whose tags are components are called “component” elements, and their
 * behavior is determined by the execution of the component.
 */
export type Tag = string | symbol | Component;

/**
 * Maps the tag of an element to its expected props.
 *
 * @typeparam TTag - The element’s tag.
 */
export type TagProps<TTag extends Tag> = TTag extends string
	? JSX.IntrinsicElements[TTag]
	: TTag extends Component<infer TProps>
	? TProps
	: unknown;

/***
 * SPECIAL TAGS
 *
 * Crank provides a couple tags which have special meaning for the renderer.
 ***/

/**
 * A special tag for grouping multiple children within a parent.
 *
 * @remarks
 * All iterables which appear in the element tree are implicitly wrapped in a
 * fragment element.
 *
 * The tag is just the empty string, and you can use the empty string in
 * createElement calls or transpiler options to avoid having to reference this
 * export directly.
 */
export const Fragment = "";
export type Fragment = typeof Fragment;

// NOTE: We assert the following symbol tags as any because typescript support
// for symbol tags in JSX does not exist yet.
// https://github.com/microsoft/TypeScript/issues/38367

/**
 * A special tag for rendering into a root node passed via a root prop.
 *
 * @remarks
 * This tag is useful for creating element trees with multiple roots, for
 * things like modals or tooltips.
 *
 * Renderer.prototype.render will implicitly wrap the passed in element tree in
 * an implicit Portal element.
 */
export const Portal = Symbol.for("crank.Portal") as any;
export type Portal = typeof Portal;

/**
 * A special tag which preserves whatever was previously rendered in the
 * element’s position.
 *
 * @remarks
 * Copy elements are useful for when you want to prevent a subtree from
 * rerendering as a performance optimization. Copy elements can also be keyed,
 * in which case the previously rendered keyed element will be preserved.
 */
export const Copy = Symbol.for("crank.Copy") as any;
export type Copy = typeof Copy;

/**
 * A special element tag for injecting raw nodes or strings via a value prop.
 *
 * @remarks
 * If the value prop is a string, Renderer.prototype.parse will be called on
 * the string and the result of that method will be inserted.
 */
export const Raw = Symbol.for("crank.Raw") as any;
export type Raw = typeof Raw;

/**
 * Describes all valid values of an element tree, excluding iterables.
 *
 * @remarks
 * Arbitrary objects can also be safely rendered, but will be converted to a
 * string using the toString method. We exclude them from this type to catch
 * potential mistakes.
 */
export type Child = Element | string | number | boolean | null | undefined;

// NOTE: we use a recursive interface rather than making the Children type
// directly recursive because recursive type aliases were added in TypeScript
// 3.7.
export interface ChildIterable extends Iterable<Child | ChildIterable> {}

/**
 * Describes all valid values of an element tree, including arbitrarily nested
 * iterables of such values.
 */
export type Children = Child | ChildIterable;

/**
 * Represents all functions which can be used as a component.
 *
 * @typeparam TProps - The expected props for the component.
 */
export type Component<TProps = any> = (
	this: Context<TProps>,
	props: TProps,
) =>
	| Children
	| PromiseLike<Children>
	// The return type of iterators must include void because typescript will
	// infer generators which returns implicitly as having a void return type.
	| Iterator<Children, Children | void, any>
	| AsyncIterator<Children, Children | void, any>;

type ChildrenIteration =
	| Promise<IteratorResult<Children, Children | void>>
	| IteratorResult<Children, Children | void>;

type Key = unknown;

const ElementSymbol = Symbol.for("crank.Element");

/*** ELEMENT FLAGS ***/
/**
 * A flag which is set when the component has been mounted. Used mainly to
 * detect whether an element is being reused so that we clone it.
 */
const IsMounted = 1 << 0;

/**
 * A flag which is set when the component has committed at least once.
 */
const IsCommitted = 1 << 1;

// NOTE: To save on filesize, we mangle the internal properties of Crank
// classes by hand. These internal properties are prefixed with an underscore.
// Refer to their definitions to see their unabbreviated names.

// NOTE: to maximize compatibility between Crank versions, starting with 0.2.0,
// any change to the $$typeof property or public properties will be considered
// a breaking change.

/**
 * Elements are the basic building blocks of Crank applications. They are
 * JavaScript objects which are interpreted by special classes called renderers
 * to produce and manage stateful nodes.
 *
 * @typeparam TTag - The type of the tag of the element.
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
 * @remarks
 * Typically, you use the createElement function to create elements rather than
 * instatiating this class directly.
 */
export class Element<TTag extends Tag = Tag> {
	/**
	 * @internal
	 * A unique symbol to identify elements as elements across versions and
	 * realms, and to protect against basic injection attacks.
	 * https://overreacted.io/why-do-react-elements-have-typeof-property/
	 */
	$$typeof: typeof ElementSymbol;

	/**
	 * @internal
	 * flags - A bitmask. See ELEMENT FLAGS.
	 */
	_f: number;

	/**
	 * The tag of the element. Can be a string, symbol or function.
	 */
	tag: TTag;

	/**
	 * An object containing the “properties” of an element. These correspond to
	 * the “attributes” of an element when using JSX syntax.
	 */
	props: TagProps<TTag>;

	/**
	 * A value which uniquely identifies an element from its siblings so that it
	 * can be added/updated/moved/removed by the identity of the key rather than
	 * its position within the parent.
	 *
	 * @remarks
	 * Passed to the element as the prop "crank-key".
	 */
	key: Key;

	/**
	 * A callback which is called with the element’s result when it is committed.
	 *
	 * @remarks
	 * Passed to the element as the prop "crank-ref".
	 */
	ref: ((value: unknown) => unknown) | undefined;

	/**
	 * @internal
	 * children - The rendered children of the element.
	 */
	_ch: Array<NarrowedChild> | NarrowedChild;

	/**
	 * @internal
	 * node - The node associated with the element.
	 *
	 * @remarks
	 * Set by Renderer.prototype.create when the component is mounted.
	 * This property will only be set for host elements.
	 */
	_n: any;

	/**
	 * @internal
	 * context - The Context object associated with this element.
	 *
	 * @remarks
	 * Created and assigned by the Renderer for component elements when it mounts
	 * the element tree.
	 */
	_ctx: Context<TagProps<TTag>> | undefined;

	/**
	 * @internal
	 * fallback - The element which this element is replacing.
	 *
	 * @remarks
	 * Until an element commits for the first time, we show any previously
	 * rendered values in its place. This is mainly important when the nearest
	 * host is rearranged concurrently.
	 */
	_fb: NarrowedChild;

	/**
	 * @internal
	 * inflight - The current async run of the element.
	 *
	 * @remarks
	 * This value is used to make sure Copy element refs fire at the correct
	 * time, and is also used as the yield value of async generator components
	 * with async children. It is unset when the element is committed.
	 */
	_inf: Promise<any> | undefined;

	/**
	 * @internal
	 * onvalues - The resolve function of a promise which represents the next
	 * children result.
	 */
	_onv: Function | undefined;

	constructor(
		tag: TTag,
		props: TagProps<TTag>,
		key: Key,
		ref: ((value: unknown) => unknown) | undefined,
	) {
		this.$$typeof = ElementSymbol;
		this._f = 0;
		this.tag = tag;
		this.props = props;
		this.key = key;
		this.ref = ref;
		this._ch = undefined;
		this._n = undefined;
		this._ctx = undefined;
		// NOTE: We don’t assign fallback (_fb), inflight (_inf) or onvalues (_onv)
		// in the constructor to save on the shallow size of elements. This saves a
		// couple bytes per element, especially when we aren’t rendering
		// asynchronous components. This may or may not be a good idea.
	}
}

export function isElement(value: any): value is Element {
	return value != null && value.$$typeof === ElementSymbol;
}

/**
 * Creates an element with the specified tag, props and children.
 *
 * @remarks
 * This function is usually used as a transpilation target for JSX transpilers,
 * but it can also be called directly. It additionally extracts the crank-key
 * and crank-ref props so they aren’t accessible to renderer methods or
 * components, and assigns the children prop according to the arguments passed
 * to the function.
 */
export function createElement<TTag extends Tag>(
	tag: TTag,
	props?: TagProps<TTag> | null | undefined,
	...children: Array<unknown>
): Element<TTag> {
	let key: Key;
	let ref: ((value: unknown) => unknown) | undefined;
	const props1 = {} as TagProps<TTag>;
	if (props != null) {
		for (const name in props) {
			if (name === "crank-key") {
				// NOTE: We have to make sure we don’t assign null to the key because
				// we don’t check for null keys in the diffing functions.
				if (props["crank-key"] != null) {
					key = props["crank-key"];
				}
			} else if (name === "crank-ref") {
				if (typeof props["crank-ref"] === "function") {
					ref = props["crank-ref"];
				}
			} else {
				props1[name] = props[name];
			}
		}
	}

	if (children.length > 1) {
		props1.children = children;
	} else if (children.length === 1) {
		props1.children = children[0];
	}

	return new Element(tag, props1, key, ref);
}

/**
 * Clones a given element. Will also shallow copy the props object.
 *
 * @remarks
 * Mainly used internally to make sure we don’t accidentally reuse elements in
 * an element tree, because element have internal properties which are directly
 * mutated by the renderer.
 */
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
 * A helper type which repesents all the possible rendered values of an element.
 *
 * @typeparam TNode - The node type for the element assigned by the renderer.
 *
 * @remarks
 * When asking the question, what is the value of a specific element, the
 * answer varies depending on its tag. For host or Raw elements, the answer is
 * simply the nodes created for the element. For fragments, the values are
 * usually an array of nodes. For portals, the value is undefined, because a
 * Portal element’s root and children are opaque to its parent. For components,
 * the value can be any of the above, because the value of a component is
 * determined by its immediate children. Rendered values can also be strings or
 * arrays of nodes and strings, in the case of component or fragment elements
 * with strings for children. All of these possible values are reflected in
 * this utility type.
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
 * @remarks
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
 * Finds the value of the element according to its type.
 * @returns The value of the element.
 */
function getValue<TNode>(el: Element): ElementValue<TNode> {
	if (el._fb) {
		if (typeof el._fb === "object") {
			return getValue<TNode>(el._fb);
		}

		return el._fb;
	} else if (el.tag === Portal) {
		return undefined;
	} else if (typeof el.tag !== "function" && el.tag !== Fragment) {
		return el._n;
	}

	return unwrap(getChildValues<TNode>(el));
}

/**
 * Walks an element’s children to find its child values.
 *
 * @returns A normalized array of nodes and strings.
 */
function getChildValues<TNode>(el: Element): Array<TNode | string> {
	const values: Array<ElementValue<TNode>> = [];
	const children = wrap(el._ch);
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (child) {
			values.push(typeof child === "string" ? child : getValue(child));
		}
	}

	return normalize(values);
}

/**
 * An abstract class which is subclassed to render to different target
 * environments. This class is responsible for kicking off the rendering
 * process, caching previous trees by root, and creating, mutating and
 * disposing of nodes.
 *
 * @typeparam TNode - The type of the node for a rendering environment.
 * @typeparam TScope - Data which is passed down the tree.
 * @typeparam TRoot - The type of the root for a rendering environment.
 * @typeparam TResult - The type of exposed values.
 */
export class Renderer<
	TNode,
	TScope,
	TRoot = TNode,
	TResult = ElementValue<TNode>
> {
	/**
	 * @internal
	 * A weakmap which stores element trees by root.
	 */
	_cache: WeakMap<object, Element<Portal>>;
	constructor() {
		this._cache = new WeakMap();
	}

	/**
	 * Renders an element tree into a specific root.
	 *
	 * @param children - An element tree. You can render null with a previously
	 * used root to delete the previously rendered element tree from the cache.
	 * @param root - The node to be rendered into. The renderer will cache
	 * element trees per root.
	 * @param ctx - An optional context that will be the ancestor context of all
	 * elements in the tree. Useful for connecting renderers which call each
	 * other so that events/provisions properly propagate. The context for a
	 * given root must be the same or an error will be thrown.
	 *
	 * @returns The result of rendering the children, or a possible promise of
	 * the result if the element tree renders asynchronously.
	 */
	render(
		children: Children,
		root?: TRoot | undefined,
		ctx?: Context | undefined,
	): Promise<TResult> | TResult {
		let portal: Element<Portal> | undefined;
		if (typeof root === "object" && root !== null) {
			portal = this._cache.get(root as any);
		}

		if (portal === undefined) {
			portal = createElement(Portal, {children, root});
			portal._ctx = ctx;
			if (typeof root === "object" && root !== null && children != null) {
				this._cache.set(root as any, portal);
			}
		} else {
			if (portal._ctx !== ctx) {
				throw new Error("Context mismatch");
			}

			portal.props = {children, root};
			if (typeof root === "object" && root !== null && children == null) {
				this._cache.delete((root as unknown) as object);
			}
		}

		const value = update(this, root, portal, ctx, undefined, portal);
		// NOTE: We return the child values of the portal because portal elements
		// themselves have no readable value.
		if (isPromiseLike(value)) {
			return value.then(() => {
				const result = this.read(unwrap(getChildValues<TNode>(portal!)));
				if (root == null) {
					unmount(this, portal!, undefined, portal!);
				}

				return result;
			});
		}

		const result = this.read(unwrap(getChildValues<TNode>(portal)));
		if (root == null) {
			unmount(this, portal, undefined, portal);
		}

		return result;
	}

	/**
	 * Called when an element’s value is exposed via render, schedule, refresh,
	 * refs, or generator yield expressions.
	 *
	 * @param value - The value of the element being read. Can be a node, a
	 * string, undefined, or an array of nodes and strings, depending on the
	 * element.
	 *
	 * @returns Varies according to the specific renderer subclass. By default,
	 * it exposes the element’s value.
	 *
	 * @remarks
	 * This is useful for renderers which don’t want to expose their internal
	 * nodes. For instance, the HTML renderer will convert all internal nodes to
	 * strings.
	 *
	 */
	read(value: ElementValue<TNode>): TResult {
		return (value as unknown) as TResult;
	}

	/**
	 * Called in a preorder traversal for each host element.
	 *
	 * @remarks
	 * Useful for passing data down the element tree. For instance, the DOM
	 * renderer uses this method to keep track of whether we’re in an SVG
	 * subtree.
	 *
	 * @param el - The host element.
	 * @param scope - The current scope.
	 *
	 * @returns The scope to be passed to create and scope for child host
	 * elements.
	 *
	 * @remarks
	 * This method sets the scope for child host elements, not the current host
	 * element.
	 */
	scope(el: Element<string | symbol>, scope: TScope | undefined): TScope {
		return scope as TScope;
	}

	/**
	 * Called for each string in an element tree.
	 *
	 * @param text - The string child.
	 * @param scope - The current scope.
	 *
	 * @returns The escaped string.
	 *
	 * @remarks
	 * Rather than returning text nodes for whatever environment we’re rendering
	 * to, we defer that step for Renderer.prototype.arrange. We do this so that
	 * adjacent strings can be concatenated and the actual element tree can be
	 * rendered in a normalized form.
	 */
	escape(text: string, _scope: TScope): string {
		return text;
	}

	/**
	 * Called for each Raw element whose value prop is a string.
	 *
	 * @param text - The string child.
	 * @param scope - The current scope.
	 *
	 * @returns The parsed node or string.
	 */
	parse(text: string, _scope: TScope): TNode | string {
		return text;
	}

	/**
	 * Called for each host element when it is committed for the first time.
	 *
	 * @param el - The host element.
	 * @param scope - The current scope.
	 *
	 * @returns A “node” which determines the value of the host element.
	 */
	create(_el: Element<string | symbol>, _scope: TScope): TNode {
		throw new Error("Not implemented");
	}

	/**
	 * Called for each host element when it is committed.
	 *
	 * @param el - The host element.
	 * @param node - The node associated with the host element.
	 *
	 * @returns The return value is ignored.
	 *
	 * @remarks
	 * Used to mutate the node associated with an element when new props are
	 * passed.
	 */
	patch(_el: Element<string | symbol>, _node: TNode): unknown {
		return;
	}

	// TODO: pass hints into arrange about where the dirty children start and end
	/**
	 * Called for each host element so that elements can be arranged into a tree.
	 *
	 * @param el - The host element.
	 * @param node - The node associated with the host element.
	 * @param children - An array of nodes and strings from child elements.
	 *
	 * @returns The return value is ignored.
	 *
	 * @remarks
	 * This method is also called by child components contexts as the last step
	 * of a refresh.
	 */
	arrange(
		_el: Element<string | symbol>,
		_node: TNode | TRoot,
		_children: Array<TNode | string>,
	): unknown {
		return;
	}

	// TODO: remove(): a method which is called to remove a child from a parent
	// to optimize arrange

	/**
	 * Called for each host element when it is unmounted.
	 *
	 * @param el - The host element.
	 * @param node - The node associated with the host element.
	 *
	 * @returns The return value is ignored.
	 */
	dispose(_el: Element<string | symbol>, _node: TNode): unknown {
		return;
	}

	/**
	 * Called at the end of the rendering process for each root of the tree.
	 *
	 * @param root - The root prop passed to portals or the render method.
	 *
	 * @returns The return value is ignored.
	 */
	complete(_root: TRoot): unknown {
		return;
	}
}

/*** PRIVATE RENDERER FUNCTIONS ***/

function diff<TNode, TScope, TRoot, TResult>(
	renderer: Renderer<TNode, TScope, TRoot, TResult>,
	root: TRoot,
	host: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: TScope,
	oldChild: NarrowedChild,
	newChild: NarrowedChild,
): [NarrowedChild, Promise<ElementValue<TNode>> | ElementValue<TNode>] {
	let value: Promise<ElementValue<TNode>> | ElementValue<TNode>;
	if (
		typeof oldChild === "object" &&
		typeof newChild === "object" &&
		oldChild.tag === newChild.tag
	) {
		// TODO: implement Raw element parse caching
		if (oldChild.tag === Portal) {
			if (oldChild.props.root !== newChild.props.root) {
				renderer.arrange(oldChild as Element<Portal>, oldChild.props.root, []);
			}
		}

		if (oldChild !== newChild) {
			oldChild.props = newChild.props;
			oldChild.ref = newChild.ref;
			newChild = oldChild;
		}

		value = update(renderer, root, host, ctx, scope, newChild);
	} else if (typeof newChild === "object") {
		if (newChild.tag === Copy) {
			if (typeof oldChild === "object") {
				value = oldChild._inf || getValue<TNode>(oldChild);
			} else {
				value = oldChild;
			}

			if (typeof newChild.ref === "function") {
				if (isPromiseLike(value)) {
					value.then(newChild.ref).catch(NOOP);
				} else {
					newChild.ref(value);
				}
			}

			newChild = oldChild;
		} else {
			if (newChild._f & IsMounted) {
				newChild = cloneElement(newChild);
			}

			value = mount(renderer, root, host, ctx, scope, newChild);
			if (isPromiseLike(value)) {
				newChild._fb = oldChild;
			}
		}
	} else if (typeof newChild === "string") {
		value = renderer.escape(newChild, scope);
	}

	return [newChild, value];
}

function mount<TNode, TScope, TRoot, TResult>(
	renderer: Renderer<TNode, TScope, TRoot, TResult>,
	root: TRoot,
	host: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: TScope,
	el: Element,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	el._f |= IsMounted;
	if (typeof el.tag === "function") {
		el._ctx = new Context(
			renderer,
			root,
			host,
			ctx,
			scope,
			el as Element<Component>,
		);

		return updateCtx(el._ctx);
	} else if (el.tag === Raw) {
		return commit(renderer, scope, el, []);
	} else if (el.tag !== Fragment) {
		if (el.tag === Portal) {
			root = el.props.root;
		}

		host = el as Element<string | symbol>;
		scope = renderer.scope(host, scope);
	}

	return mountChildren(renderer, root, host, ctx, scope, el, el.props.children);
}

function mountChildren<TNode, TScope, TRoot, TResult>(
	renderer: Renderer<TNode, TScope, TRoot, TResult>,
	root: TRoot,
	host: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: TScope,
	el: Element,
	children: Children,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	const newChildren = arrayify(children);
	const values: Array<Promise<ElementValue<TNode>> | ElementValue<TNode>> = [];
	let async = false;
	let seen: Set<Key> | undefined;
	for (let i = 0; i < newChildren.length; i++) {
		let child = narrow(newChildren[i]);
		if (typeof child === "object" && typeof child.key !== "undefined") {
			if (seen === undefined) {
				seen = new Set();
			} else {
				if (seen.has(child.key)) {
					console.error("Duplicate key", child.key);
				}
			}

			seen.add(child.key);
		}

		let value: Promise<ElementValue<TNode>> | ElementValue<TNode>;
		[child, value] = diff(
			renderer,
			root,
			host,
			ctx,
			scope,
			undefined, // oldChild
			child,
		);
		newChildren[i] = child;
		values.push(value);
		if (!async && isPromiseLike(value)) {
			async = true;
		}
	}

	el._ch = unwrap(newChildren as Array<NarrowedChild>);

	if (async) {
		let onvalues!: Function;
		const values1: Promise<Array<ElementValue<TNode>>> = Promise.race([
			Promise.all(values),
			new Promise<any>((resolve) => (onvalues = resolve)),
		]);

		if (el._onv) {
			el._onv(values1);
		}

		el._onv = onvalues;
		el._inf = values1.then((values) =>
			commit(renderer, scope, el, normalize(values)),
		);
		return el._inf;
	}

	if (el._onv) {
		el._onv(values);
		el._onv = undefined;
	}

	return commit(
		renderer,
		scope,
		el,
		normalize(values as Array<ElementValue<TNode>>),
	);
}

function update<TNode, TScope, TRoot, TResult>(
	renderer: Renderer<TNode, TScope, TRoot, TResult>,
	root: TRoot,
	host: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: TScope,
	el: Element,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (typeof el.tag === "function") {
		// el._ctx should probably never be undefined here
		return el._ctx ? updateCtx(el._ctx) : undefined;
	} else if (el.tag === Raw) {
		return commit(renderer, scope, el, []);
	} else if (el.tag !== Fragment) {
		host = el as Element<string | symbol>;
		scope = renderer.scope(host, scope);
		if (el.tag === Portal) {
			root = el.props.root;
		}
	}

	return updateChildren(
		renderer,
		root,
		host,
		ctx,
		scope,
		el,
		el.props.children,
	);
}

function createChildrenByKey(
	children: Array<NarrowedChild>,
): Map<Key, Element> {
	const childrenByKey = new Map<Key, Element>();
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (typeof child === "object" && typeof child.key !== "undefined") {
			childrenByKey.set(child.key, child);
		}
	}

	return childrenByKey;
}

function updateChildren<TNode, TScope, TRoot, TResult>(
	renderer: Renderer<TNode, TScope, TRoot, TResult>,
	root: TRoot,
	host: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: TScope,
	el: Element,
	children: Children,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (typeof el._ch === "undefined") {
		return mountChildren(renderer, root, host, ctx, scope, el, children);
	}

	const oldChildren = wrap(el._ch);
	const newChildren = arrayify(children);
	const values: Array<Promise<ElementValue<TNode>> | ElementValue<TNode>> = [];
	const graveyard: Array<Element> = [];
	let i = 0;
	let async = false;
	let seen: Set<Key> | undefined;
	let childrenByKey: Map<Key, Element> | undefined;
	// TODO: switch to mountChildren if there are no more children
	for (let j = 0; j < newChildren.length; j++) {
		let oldChild = oldChildren[i];
		let newChild = narrow(newChildren[j]);
		// ALIGNMENT
		let oldKey = typeof oldChild === "object" ? oldChild.key : undefined;
		let newKey = typeof newChild === "object" ? newChild.key : undefined;
		if (seen !== undefined && seen.has(newKey)) {
			console.error("Duplicate key", newKey);
			newKey = undefined;
		}

		if (oldKey !== newKey) {
			if (!childrenByKey) {
				childrenByKey = createChildrenByKey(oldChildren.slice(i));
			}

			if (newKey === undefined) {
				while (oldChild !== undefined && oldKey !== undefined) {
					i++;
					oldChild = oldChildren[i];
					oldKey = typeof oldChild === "object" ? oldChild.key : undefined;
				}

				i++;
			} else {
				oldChild = childrenByKey.get(newKey);
				if (oldChild !== undefined) {
					childrenByKey.delete(newKey);
				}

				if (!seen) {
					seen = new Set();
				}

				seen.add(newKey);
			}
		} else {
			if (childrenByKey !== undefined && newKey !== undefined) {
				childrenByKey.delete(newKey);
			}

			i++;
		}

		// UPDATING
		let value: Promise<ElementValue<TNode>> | ElementValue<TNode>;
		[newChild, value] = diff(
			renderer,
			root,
			host,
			ctx,
			scope,
			oldChild,
			newChild,
		);

		values.push(value);
		newChildren[j] = newChild;
		if (!async && isPromiseLike(value)) {
			async = true;
		}

		if (typeof oldChild === "object" && oldChild !== newChild) {
			graveyard.push(oldChild);
		}
	}

	el._ch = unwrap(newChildren as Array<NarrowedChild>);

	// cleanup
	for (; i < oldChildren.length; i++) {
		const oldChild = oldChildren[i];
		if (typeof oldChild === "object" && typeof oldChild.key === "undefined") {
			graveyard.push(oldChild);
		}
	}

	// TODO: async unmounting
	if (childrenByKey !== undefined && childrenByKey.size > 0) {
		graveyard.push(...childrenByKey.values());
	}

	if (async) {
		let values1 = Promise.all(values).finally(() => {
			graveyard.forEach((child) => unmount(renderer, host, ctx, child));
		});
		let onvalues!: Function;
		values1 = Promise.race([
			values1,
			new Promise<any>((resolve) => (onvalues = resolve)),
		]);

		if (el._onv) {
			el._onv(values1);
		}

		el._onv = onvalues;
		el._inf = values1.then((values) =>
			commit(renderer, scope, el, normalize(values)),
		);
		return el._inf;
	}

	graveyard.forEach((child) => unmount(renderer, host, ctx, child));
	if (el._onv) {
		el._onv(values);
		el._onv = undefined;
	}

	return commit(
		renderer,
		scope,
		el,
		normalize(values as Array<ElementValue<TNode>>),
	);
}

function commit<TNode, TScope, TRoot, TResult>(
	renderer: Renderer<TNode, TScope, TRoot, TResult>,
	scope: TScope,
	el: Element,
	values: Array<TNode | string>,
): ElementValue<TNode> {
	let value = unwrap(values);
	if (typeof el.tag === "function") {
		if (typeof el._ctx === "object") {
			commitCtx(el._ctx, value);
		}
	} else if (el.tag === Portal) {
		if (!(el._f & IsCommitted)) {
			el._f |= IsCommitted;
		}

		renderer.arrange(el as Element<Portal>, el.props.root, values);
		renderer.complete(el.props.root);
		value = undefined;
	} else if (el.tag === Raw) {
		if (typeof el.props.value === "string") {
			el._n = renderer.parse(el.props.value, scope);
		} else {
			el._n = el.props.value;
		}

		value = el._n;
	} else if (el.tag !== Fragment) {
		if (!(el._f & IsCommitted)) {
			el._n = renderer.create(el as Element<string | symbol>, scope);
			el._f |= IsCommitted;
		}

		renderer.patch(el as Element<string | symbol>, el._n);
		renderer.arrange(el as Element<string | symbol>, el._n, values);
		value = el._n;
	}

	if (el.ref) {
		el.ref(renderer.read(value));
	}

	if (el._inf) {
		el._inf = undefined;
	}

	if (el._fb) {
		el._fb = undefined;
	}

	return value;
}

function unmount<TNode, TScope, TRoot, TResult>(
	renderer: Renderer<TNode, TScope, TRoot, TResult>,
	host: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	el: Element,
): void {
	if (typeof el.tag === "function") {
		if (typeof el._ctx === "object") {
			unmountCtx(el._ctx);
		}

		ctx = el._ctx;
	} else if (el.tag === Portal) {
		host = el as Element<symbol>;
		renderer.arrange(host, host.props.root, []);
		renderer.complete(host.props.root);
	} else if (el.tag !== Fragment) {
		if (isEventTarget(el._n)) {
			const listeners = getListeners(ctx, host);
			if (listeners !== undefined && listeners.length > 0) {
				for (let i = 0; i < listeners.length; i++) {
					const record = listeners[i];
					el._n.removeEventListener(
						record.type,
						record.callback,
						record.options,
					);
				}
			}
		}

		host = el as Element<string | symbol>;
		renderer.dispose(host, host._n);
	}

	const children = wrap(el._ch);
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (typeof child === "object") {
			unmount(renderer, host, ctx, child);
		}
	}
}

// CONTEXT FLAGS
/**
 * A flag which is set when the component is being updated by the parent and
 * cleared when the component has committed. Used to determine whether the
 * nearest host ancestor needs to be rearranged.
 */
const IsUpdating = 1 << 0;

/**
 * A flag which is set when the component function is called or the component
 * generator is resumed. This flags is used to ensure that a component which
 * synchronously triggers a second update in the course of rendering does not
 * cause an stack overflow or a generator error.
 */
const IsExecuting = 1 << 1;

/**
 * A flag used to make sure multiple values are not pulled from context prop
 * iterators without a yield.
 */
const IsIterating = 1 << 2;

/**
 * A flag used by async generator components in conjunction with the
 * onIsAvailable (_oa) callback to mark whether new props can be pulled via the
 * context async iterator.
 */
const IsAvailable = 1 << 3;

/**
 * A flag which is set when generator components return. Set whenever an
 * iterator returns an iteration with the done property set to true or throws.
 * Done components will stick to their last rendered value and ignore further
 * updates.
 */
const IsDone = 1 << 4;

/**
 * A flag which is set when the component is unmounted. Unmounted components
 * are no longer in the element tree, and cannot run or refresh.
 */
const IsUnmounted = 1 << 5;

/**
 * A flag which indicates that the component is a sync generator component.
 */
const IsSyncGen = 1 << 6;

/**
 * A flag which indicates that the component is an async generator component.
 */
const IsAsyncGen = 1 << 7;

/**
 * An interface which can be extended to provide strongly typed provisions (see
 * Context.prototype.get and Context.prototype.set)
 */
export interface ProvisionMap extends Crank.ProvisionMap {}

export interface Context extends Crank.Context {}

/**
 * A class which is instantiated and passed to every component as its this
 * value. Contexts form a tree just like elements and all components in the
 * element tree are connected via contexts. Components can use this tree to
 * communicate data upwards via events and downwards via provisions.
 *
 * @typeparam TProps - The expected shape of the props passed to the component.
 * Used to strongly type the Context iterator methods.
 * @typeparam TResult - The readable element value type. It is used in places
 * such as the return value of refresh and the argument passed to
 * schedule/cleanup callbacks.
 */
export class Context<TProps = any, TResult = any> implements EventTarget {
	/**
	 * @internal
	 * flags - A bitmask. See CONTEXT FLAGS above.
	 */
	_f: number;

	/**
	 * @internal
	 * renderer - The renderer which created this context.
	 */
	_re: Renderer<unknown, unknown, unknown, TResult>;

	/**
	 * @internal
	 * root - The root node as set by the nearest ancestor portal.
	 */
	_rt: unknown;

	/**
	 * @internal
	 * host - The nearest ancestor host element.
	 * @remarks
	 * When refresh is called, the host element will be arranged as the last step
	 * of the commit, to make sure the parent’s children properly reflects the
	 * components’s children.
	 */
	_ho: Element<string | symbol>;

	/**
	 * @internal
	 * parent - The parent context.
	 */
	_pa: Context<unknown, TResult> | undefined;

	/**
	 * @internal
	 * scope - The value of the scope at the point of element’s creation.
	 */
	_sc: unknown;

	/**
	 * @internal
	 * el - The associated component element.
	 */
	_el: Element<Component>;

	/**
	 * @internal
	 * iterator - The iterator returned by the component function.
	 */
	_it:
		| Iterator<Children, Children | void, unknown>
		| AsyncIterator<Children, Children | void, unknown>
		| undefined;

	/**
	 * @internal
	 * onavailable - A callback used in conjunction with the IsAvailable flag to
	 * implement the props async iterator. See the Symbol.asyncIterator method
	 * and the resumeCtx function.
	 */
	_oa: (() => unknown) | undefined;

	// See the stepCtx/advanceCtx/runCtx functions for more notes on
	// inflight/enqueued block/value.
	/**
	 * @internal
	 * inflightBlock
	 */
	_ib: Promise<unknown> | undefined;

	/**
	 * @internal
	 * inflightValue
	 */
	_iv: Promise<ElementValue<any>> | undefined;

	/**
	 * @internal
	 * enqueuedBlock
	 */
	_eb: Promise<unknown> | undefined;

	/**
	 * @internal
	 * enqueuedValue
	 */
	_ev: Promise<ElementValue<any>> | undefined;

	/**
	 * @internal
	 * listeners - An array of event listeners added to the context via
	 * Context.prototype.addEventListener
	 */
	_ls: Array<EventListenerRecord> | undefined;

	/**
	 * @internal
	 * provisions - A map of values which can be set via Context.prototype.set
	 * and read from child contexts via Context.prototype.get
	 */
	_ps: Map<unknown, unknown> | undefined;

	/**
	 * @internal
	 * schedules - a set of callbacks registered via Context.prototype.schedule,
	 * which fire when the component has committed.
	 */
	_ss: Set<(value: TResult) => unknown> | undefined;

	/**
	 * @internal
	 * cleanups - a set of callbacks registered via Context.prototype.cleanup,
	 * which fire when the component has unmounted.
	 */
	_cs: Set<(value: TResult) => unknown> | undefined;

	/**
	 * @internal
	 */
	constructor(
		renderer: Renderer<unknown, unknown, unknown, TResult>,
		root: unknown,
		host: Element<string | symbol>,
		parent: Context<unknown, TResult> | undefined,
		scope: unknown,
		el: Element<Component>,
	) {
		this._f = 0;
		this._re = renderer;
		this._rt = root;
		this._ho = host;
		this._pa = parent;
		this._sc = scope;
		this._el = el;
	}

	/**
	 * The current props of the associated element.
	 *
	 * @remarks
	 * Typically, you should read props either via the first parameter of the
	 * component or via the context iterator methods. This property is mainly for
	 * plugins or utilities which wrap contexts.
	 */
	get props(): TProps {
		return this._el.props;
	}

	/**
	 * The current value of the associated element.
	 *
	 * @remarks
	 * Typically, you should read values via refs, generator yield expressions,
	 * or the refresh, schedule or cleanup methods. This property is mainly for
	 * plugins or utilities which wrap contexts.
	 */
	get value(): TResult {
		return this._re.read(getValue(this._el));
	}

	*[Symbol.iterator](): Generator<TProps> {
		while (!(this._f & IsDone)) {
			if (this._f & IsIterating) {
				throw new Error("Context iterated twice without a yield");
			} else if (this._f & IsAsyncGen) {
				throw new Error("Use for await…of in async generator components");
			}

			this._f |= IsIterating;
			yield this._el.props!;
		}
	}

	async *[Symbol.asyncIterator](): AsyncGenerator<TProps> {
		// We use a do while loop rather than a while loop to handle an edge case
		// where an async generator component is unmounted synchronously.
		do {
			if (this._f & IsIterating) {
				throw new Error("Context iterated twice without a yield");
			} else if (this._f & IsSyncGen) {
				throw new Error("Use for…of in sync generator components");
			}

			this._f |= IsIterating;
			if (this._f & IsAvailable) {
				this._f &= ~IsAvailable;
			} else {
				await new Promise((resolve) => (this._oa = resolve));
				if (this._f & IsDone) {
					break;
				}
			}

			yield this._el.props;
		} while (!(this._f & IsDone));
	}

	/**
	 * Re-executes the component.
	 *
	 * @returns The rendered value of the component or a promise of the rendered
	 * value if the component or its children execute asynchronously.
	 *
	 * @remarks
	 * The refresh method works a little differently for async generator
	 * components, in that it will resume the Context async iterator rather than
	 * resuming execution. This is because async generator components are
	 * perpetually resumed independent of updates/refresh.
	 */
	refresh(): Promise<TResult> | TResult {
		if (this._f & IsUnmounted) {
			console.error("Component is unmounted");
			return this._re.read(undefined);
		} else if (this._f & IsExecuting) {
			console.error("Component is already executing");
			return this._re.read(undefined);
		}

		resumeCtx(this);
		return this._re.read(runCtx(this));
	}

	/**
	 * Registers a callback which fires when the component commits. Will only
	 * fire once per callback and update.
	 */
	schedule(callback: (value: TResult) => unknown): void {
		if (!this._ss) {
			this._ss = new Set();
		}

		this._ss.add(callback);
	}

	/**
	 * Registers a callback which fires when the component unmounts. Will only
	 * fire once per callback.
	 */
	cleanup(callback: (value: TResult) => unknown): void {
		if (!this._cs) {
			this._cs = new Set();
		}

		this._cs.add(callback);
	}

	consume<TKey extends keyof ProvisionMap>(key: TKey): ProvisionMap[TKey];
	consume(key: unknown): any;
	consume(key: unknown): any {
		for (let parent = this._pa; parent !== undefined; parent = parent._pa) {
			if (parent._ps && parent._ps.has(key)) {
				return parent._ps.get(key)!;
			}
		}
	}

	provide<TKey extends keyof ProvisionMap>(
		key: TKey,
		value: ProvisionMap[TKey],
	): void;
	provide(key: unknown, value: any): void;
	provide(key: unknown, value: any): void {
		if (!this._ps) {
			this._ps = new Map();
		}

		this._ps.set(key, value);
	}

	addEventListener<T extends string>(
		type: T,
		listener: MappedEventListenerOrEventListenerObject<T> | null,
		options?: boolean | AddEventListenerOptions,
	): void {
		if (listener == null) {
			return;
		} else if (!this._ls) {
			this._ls = [];
		}

		options = normalizeOptions(options);
		let callback: MappedEventListener<T>;
		if (typeof listener === "object") {
			callback = () => listener.handleEvent.apply(listener, arguments as any);
		} else {
			callback = listener;
		}

		const record: EventListenerRecord = {type, callback, listener, options};
		if (options.once) {
			const self = this;
			record.callback = function (this: any) {
				if (self._ls) {
					self._ls = self._ls.filter((record1) => record !== record1);

					if (self._ls.length === 0) {
						self._ls = undefined;
					}
				}

				return callback.apply(this, arguments as any);
			};
		}

		if (
			this._ls.some(
				(record1) =>
					record.type === record1.type &&
					record.listener === record1.listener &&
					!record.options.capture === !record1.options.capture,
			)
		) {
			return;
		}

		this._ls.push(record);

		for (const value of getChildValues(this._el)) {
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
		if (listener == null || !this._ls) {
			return;
		}

		const options1 = normalizeOptions(options);
		const i = this._ls.findIndex(
			(record) =>
				record.type === type &&
				record.listener === listener &&
				!record.options.capture === !options1.capture,
		);

		if (i === -1) {
			return;
		}

		const record = this._ls[i];
		this._ls.splice(i, 1);

		if (this._ls.length === 0) {
			this._ls = undefined;
		}

		for (const value of getChildValues(this._el)) {
			if (isEventTarget(value)) {
				value.removeEventListener(record.type, record.callback, record.options);
			}
		}
	}

	dispatchEvent(ev: Event): boolean {
		const path: Array<Context<unknown, TResult>> = [];
		for (let parent = this._pa; parent !== undefined; parent = parent._pa) {
			path.push(parent);
		}

		// We patch the stopImmediatePropagation method because ev.cancelBubble
		// only informs us if stopPropagation was called.
		let immediateCancelBubble = false;
		const stopImmediatePropagation = ev.stopImmediatePropagation;
		setEventProperty(ev, "stopImmediatePropagation", () => {
			immediateCancelBubble = true;
			return stopImmediatePropagation.call(ev);
		});
		setEventProperty(ev, "target", this);

		// The only possible errors in this block are errors thrown by listener
		// callbacks, and dispatchEvent will only log the error rather than
		// rethrowing it. We return true because the return value is overridden in
		// the finally block but TypeScript (justifiably) does not recognize the
		// unsafe return statement.
		try {
			setEventProperty(ev, "eventPhase", CAPTURING_PHASE);
			for (let i = path.length - 1; i >= 0; i--) {
				const et = path[i];
				if (et._ls) {
					setEventProperty(ev, "currentTarget", et);
					for (const record of et._ls) {
						if (record.type === ev.type && record.options.capture) {
							record.callback.call(this, ev);
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

			if (this._ls) {
				setEventProperty(ev, "eventPhase", AT_TARGET);
				setEventProperty(ev, "currentTarget", this);
				for (const record of this._ls) {
					if (record.type === ev.type) {
						record.callback.call(this, ev);
						if (immediateCancelBubble) {
							return true;
						}
					}
				}

				if (ev.cancelBubble) {
					return true;
				}
			}

			if (ev.bubbles) {
				setEventProperty(ev, "eventPhase", BUBBLING_PHASE);
				for (const et of path) {
					if (et._ls) {
						setEventProperty(ev, "currentTarget", et);
						for (const record of et._ls) {
							if (record.type === ev.type && !record.options.capture) {
								record.callback.call(this, ev);
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
		} catch (err) {
			console.error(err);
		} finally {
			setEventProperty(ev, "eventPhase", NONE);
			setEventProperty(ev, "currentTarget", null);
			// eslint-disable-next-line no-unsafe-finally
			return !ev.defaultPrevented;
		}
	}
}

/*** PRIVATE CONTEXT FUNCTIONS ***/

/*
 * NOTE: The functions stepCtx, advanceCtx and runCtx work together to
 * implement the async queueing behavior of components. The runCtx function
 * calls the stepCtx function, which returns two results in a tuple. The first
 * result, called the “block,” is a possible promise which represents the
 * duration for which the component is blocked from accepting new updates. The
 * second result, called the “value,” is the actual result of the update. The
 * runCtx function caches block/value from the stepCtx function on the context,
 * according to whether the component is currently blocked. The “inflight”
 * block/value properties are the currently executing update, and the
 * “enqueued” block/value properties represent an enqueued next stepCtx.
 * Enqueued steps are dequeued in a finally callback on the blocking promise.
 */

/**
 * This function is responsible for executing the component and handling all
 * the different component types.
 *
 * @returns A tuple [block, value]
 * block - A possible promise which represents the duration during which the
 * component is blocked from updating.
 * value - A possible promise resolving to the rendered value of children.
 *
 * @remarks
 * Each component type will block according to the type of the component.
 * Sync function components never block and will transparently pass updates to
 * children.
 * Async function components and async generator components block while
 * executing itself, but will not block for async children.
 * Sync generator components block while any children are executing, because
 * they are expected to only resume when they’ve actually rendered.
 * Additionally, they have no mechanism for awaiting async children.
 */
function stepCtx<TNode, TResult>(
	ctx: Context<unknown, TResult>,
): [
	Promise<unknown> | undefined,
	Promise<ElementValue<TNode>> | ElementValue<TNode>,
] {
	const el = ctx._el;
	if (ctx._f & IsDone) {
		return [undefined, getValue<TNode>(el)];
	}

	const initial = !ctx._it;
	try {
		ctx._f |= IsExecuting;
		if (initial) {
			clearEventListeners(ctx);
			const result = el.tag.call(ctx, el.props);
			if (isIteratorLike(result)) {
				ctx._it = result;
			} else if (isPromiseLike(result)) {
				// async function component
				const result1 =
					result instanceof Promise ? result : Promise.resolve(result);
				const block = result1;
				const value = result1.then((result) =>
					updateCtxChildren<TNode, TResult>(ctx, result),
				);
				return [block, value];
			} else {
				// sync function component
				return [undefined, updateCtxChildren<TNode, TResult>(ctx, result)];
			}
		}
	} finally {
		ctx._f &= ~IsExecuting;
	}

	let oldValue: Promise<TResult> | TResult;
	if (ctx._el._inf) {
		oldValue = ctx._el._inf.then(
			(value) => ctx._re.read(value),
			() => ctx._re.read(undefined),
		);
	} else if (initial) {
		oldValue = ctx._re.read(undefined);
	} else {
		oldValue = ctx._re.read(getValue(el));
	}

	let iteration: ChildrenIteration;
	try {
		ctx._f |= IsExecuting;
		iteration = ctx._it!.next(oldValue);
	} catch (err) {
		ctx._f |= IsDone;
		throw err;
	} finally {
		ctx._f &= ~IsExecuting;
	}

	if (isPromiseLike(iteration)) {
		// async generator component
		if (initial) {
			ctx._f |= IsAsyncGen;
		}

		const block = iteration;
		const value: Promise<ElementValue<TNode>> = iteration.then(
			(iteration) => {
				if (!(ctx._f & IsIterating)) {
					ctx._f &= ~IsAvailable;
				}

				ctx._f &= ~IsIterating;
				if (iteration.done) {
					ctx._f |= IsDone;
				}

				try {
					const value = updateCtxChildren<TNode, TResult>(
						ctx,
						iteration.value as Children,
					);

					if (isPromiseLike(value)) {
						return value.catch((err) => handleChildError(ctx, err));
					}

					return value;
				} catch (err) {
					return handleChildError(ctx, err);
				}
			},
			(err) => {
				ctx._f |= IsDone;
				throw err;
			},
		);

		return [block, value];
	}

	// sync generator component
	if (initial) {
		ctx._f |= IsSyncGen;
	}

	ctx._f &= ~IsIterating;
	if (iteration.done) {
		ctx._f |= IsDone;
	}

	let value: Promise<ElementValue<TNode>> | ElementValue<TNode>;
	try {
		value = updateCtxChildren<TNode, TResult>(ctx, iteration.value as Children);

		if (isPromiseLike(value)) {
			value = value.catch((err) => handleChildError(ctx, err));
		}
	} catch (err) {
		value = handleChildError(ctx, err);
	}

	if (isPromiseLike(value)) {
		return [value.catch(NOOP), value];
	}

	return [undefined, value];
}

/**
 * @remarks
 * Called when the inflight block promise settles.
 */
function advanceCtx(ctx: Context): void {
	// _ib: inflightBlock
	// _iv: inflightValue
	// _eb: enqueuedBlock
	// _ev: enqueuedValue
	ctx._ib = ctx._eb;
	ctx._iv = ctx._ev;
	ctx._eb = undefined;
	ctx._ev = undefined;
	if (ctx._f & IsAsyncGen && !(ctx._f & IsDone)) {
		runCtx(ctx);
	}
}

/**
 * Enqueues and executes the component associated with the context.
 */
function runCtx<TNode, TResult>(
	ctx: Context<unknown, TResult>,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (!ctx._ib) {
		try {
			let [block, value] = stepCtx<TNode, TResult>(ctx);
			if (isPromiseLike(block)) {
				ctx._ib = block
					.catch((err) => {
						if (!(ctx._f & IsUpdating)) {
							return propagateError<TNode>(ctx._pa, err);
						}
					})
					.finally(() => advanceCtx(ctx));
			}

			if (isPromiseLike(value)) {
				ctx._iv = value;
				ctx._el._inf = value;
			}

			return value;
		} catch (err) {
			if (!(ctx._f & IsUpdating)) {
				return propagateError<TNode>(ctx._pa, err);
			}

			throw err;
		}
	} else if (ctx._f & IsAsyncGen) {
		return ctx._iv;
	} else if (!ctx._eb) {
		let resolve: Function;
		ctx._eb = ctx._ib
			.then(() => {
				try {
					const [block, value] = stepCtx<TNode, TResult>(ctx);
					resolve(value);
					if (isPromiseLike(value)) {
						ctx._el._inf = value;
					}

					if (isPromiseLike(block)) {
						return block.catch((err) => {
							if (!(ctx._f & IsUpdating)) {
								return propagateError<TNode>(ctx._pa, err);
							}
						});
					}
				} catch (err) {
					if (!(ctx._f & IsUpdating)) {
						return propagateError<TNode>(ctx._pa, err);
					}
				}
			})
			.finally(() => advanceCtx(ctx));
		ctx._ev = new Promise((resolve1) => (resolve = resolve1));
	}

	return ctx._ev;
}

/**
 * Called to make props available to the Context async iterator for async
 * generator components.
 */
function resumeCtx(ctx: Context): void {
	if (ctx._oa) {
		ctx._oa();
		ctx._oa = undefined;
	} else {
		ctx._f |= IsAvailable;
	}
}

function updateCtx<TNode>(
	ctx: Context,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	ctx._f |= IsUpdating;
	resumeCtx(ctx);
	return runCtx(ctx);
}

function updateCtxChildren<TNode, TResult>(
	ctx: Context<unknown, TResult>,
	children: Children,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	return updateChildren<TNode, unknown, unknown, TResult>(
		ctx._re as Renderer<TNode, unknown, unknown, TResult>,
		ctx._rt, // root
		ctx._ho, // host
		ctx,
		ctx._sc, // scope
		ctx._el, // element
		narrow(children),
	);
}

function commitCtx<TNode>(ctx: Context, value: ElementValue<TNode>): void {
	if (ctx._f & IsUnmounted) {
		return;
	}

	if (typeof ctx._ls !== "undefined" && ctx._ls.length > 0) {
		for (const child of wrap(value)) {
			if (isEventTarget(child)) {
				for (const record of ctx._ls) {
					child.addEventListener(record.type, record.callback, record.options);
				}
			}
		}
	}

	if (!(ctx._f & IsUpdating)) {
		const listeners = getListeners(ctx._pa, ctx._ho);
		if (listeners !== undefined && listeners.length > 0) {
			for (let i = 0; i < listeners.length; i++) {
				const record = listeners[i];
				for (const v of wrap(value)) {
					if (isEventTarget(v)) {
						v.addEventListener(record.type, record.callback, record.options);
					}
				}
			}
		}

		// TODO: avoid calling arrange if none of the nodes have changed or moved
		const host = ctx._ho;
		if (host._f & IsCommitted) {
			ctx._re.arrange(
				host,
				host.tag === Portal ? host.props.root : host._n,
				getChildValues(host),
			);
		}

		ctx._re.complete(ctx._rt);
	}

	ctx._f &= ~IsUpdating;
	if (ctx._ss && ctx._ss.size > 0) {
		// NOTE: We have to clear the set of callbacks before calling them, because
		// a callback which refreshes the component would otherwise cause a stack
		// overflow.
		const callbacks = Array.from(ctx._ss);
		ctx._ss.clear();
		const value1 = ctx._re.read(value);
		for (const callback of callbacks) {
			callback(value1);
		}
	}
}

// TODO: async unmounting
function unmountCtx(ctx: Context): void {
	ctx._f |= IsUnmounted;
	clearEventListeners(ctx);
	if (ctx._cs) {
		const value = ctx._re.read(getValue(ctx._el));
		for (const cleanup of ctx._cs) {
			cleanup(value);
		}

		ctx._cs = undefined;
	}

	if (!(ctx._f & IsDone)) {
		ctx._f |= IsDone;
		resumeCtx(ctx);
		if (ctx._it && typeof ctx._it.return === "function") {
			let iteration: ChildrenIteration;
			try {
				ctx._f |= IsExecuting;
				iteration = ctx._it.return();
			} finally {
				ctx._f &= ~IsExecuting;
			}

			if (isPromiseLike(iteration)) {
				iteration.catch((err) => propagateError<unknown>(ctx._pa, err));
			}
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

interface EventListenerRecord {
	type: string;
	listener: MappedEventListenerOrEventListenerObject<any>;
	callback: MappedEventListener<any>;
	options: AddEventListenerOptions;
}

function normalizeOptions(
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

/**
 * A function to reconstruct an array of every listener given a context and a
 * host element.
 *
 * @remarks
 * This function exploits the fact that contexts retain their nearest ancestor
 * host element. We can determine all the contexts which are directly listening
 * to an element by traversing up the context tree and checking that the host
 * element passed in matches the context’s host property.
 */
function getListeners(
	ctx: Context | undefined,
	host: Element<string | symbol>,
): Array<EventListenerRecord> | undefined {
	let listeners: Array<EventListenerRecord> | undefined;
	while (ctx !== undefined && ctx._ho === host) {
		if (typeof ctx._ls !== "undefined") {
			listeners = (listeners || []).concat(ctx._ls);
		}

		ctx = ctx._pa;
	}

	return listeners;
}

function clearEventListeners(ctx: Context): void {
	if (ctx._ls && ctx._ls.length > 0) {
		for (const value of getChildValues(ctx._el)) {
			if (isEventTarget(value)) {
				for (const {type, callback, options} of ctx._ls) {
					value.removeEventListener(type, callback, options);
				}
			}
		}

		ctx._ls = undefined;
	}
}

/*** ERROR HANDLING UTILITIES ***/

// TODO: generator components which throw errors should be recoverable
function handleChildError<TNode>(
	ctx: Context,
	err: unknown,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (ctx._f & IsDone || !ctx._it || typeof ctx._it.throw !== "function") {
		throw err;
	}

	resumeCtx(ctx);
	let iteration: ChildrenIteration;
	try {
		ctx._f |= IsExecuting;
		iteration = ctx._it.throw(err);
	} catch (err) {
		ctx._f |= IsDone;
		throw err;
	} finally {
		ctx._f &= ~IsExecuting;
	}

	if (isPromiseLike(iteration)) {
		return iteration.then(
			(iteration) => {
				if (iteration.done) {
					ctx._f |= IsDone;
				}

				return updateCtxChildren(ctx, iteration.value as Children);
			},
			(err) => {
				ctx._f |= IsDone;
				throw err;
			},
		);
	}

	if (iteration.done) {
		ctx._f |= IsDone;
	}

	return updateCtxChildren(ctx, iteration.value as Children);
}

function propagateError<TNode>(
	ctx: Context | undefined,
	err: unknown,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (ctx === undefined) {
		throw err;
	}

	let result: Promise<ElementValue<TNode>> | ElementValue<TNode>;
	try {
		result = handleChildError(ctx, err);
	} catch (err) {
		return propagateError<TNode>(ctx._pa, err);
	}

	if (isPromiseLike(result)) {
		return result.catch((err) => propagateError<TNode>(ctx._pa, err));
	}

	return result;
}

// TODO: uncomment and use in the Element interface below
// type CrankElement = Element;
declare global {
	module Crank {
		interface EventMap {}

		interface ProvisionMap {}

		interface Context {}
	}

	module JSX {
		// TODO: JSX Element type (the result of JSX expressions) don’t work
		// because TypeScript demands that all Components return JSX elements for
		// some reason.
		// interface Element extends CrankElement {}

		interface IntrinsicElements {
			[tag: string]: any;
		}

		interface ElementChildrenAttribute {
			children: {};
		}
	}
}
