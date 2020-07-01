/*** UTILITIES ***/
function unwrap<T>(arr: Array<T>): Array<T> | T | undefined {
	return arr.length > 1 ? arr : arr[0];
}

function arrayify<T>(value: Array<T> | T | undefined): Array<T> {
	return !value ? [] : Array.isArray(value) ? value : [value];
}

function isIterable(value: any): value is Iterable<any> {
	return value != null && typeof value[Symbol.iterator] === "function";
}

type NonStringIterable<T> = Iterable<T> & object;

function isNonStringIterable(value: any): value is NonStringIterable<any> {
	return typeof value !== "string" && isIterable(value);
}

function isIteratorLike(
	value: any,
): value is Iterator<any> | AsyncIterator<any> {
	return value != null && typeof value.next === "function";
}

function isPromiseLike(value: any): value is PromiseLike<any> {
	return value != null && typeof value.then === "function";
}

/**
 * Represents all valid values which can be used for the tag of an element.
 *
 * @remarks
 * Elements whose tags are strings or symbols are called “host” or “intrinsic” elements, and their behavior is determined by the renderer, while elements whose tags are components are called “component” elements, and their behavior is determined by the execution of the component.
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
 * Crank provides a couple tags which have special meaning for the renderer.
 ***/

/**
 * A special element tag for grouping multiple children within a parent.
 *
 * @remarks
 * All iterables which appear in the element tree are implicitly wrapped in fragments. The Fragment tag is just the empty string, and you can use the empty string in createElement calls/transpiler options to avoid having to reference the Fragment export directly.
 */
export const Fragment = "";
export type Fragment = typeof Fragment;

// NOTE: We assert the following symbol tags to be any because typescript support for symbol tags in JSX does not exist yet.
// https://github.com/microsoft/TypeScript/issues/38367

/**
 * A special element tag for creating a new element subtree with a different root, passed via the root prop.
 *
 * @remarks
 * This element tag is useful for creating element trees with multiple roots. Renderer.prototype.render will implicitly wrap the children which have been passed in in an implicit Portal element.
 */
export const Portal = Symbol.for("crank.Portal") as any;
export type Portal = typeof Portal;

/**
 * A special element tag which copies whatever child appeared previously in the element’s position.
 *
 * @remarks
 * Copy elements are useful when you want to prevent a subtree from updating as a performance optimization.
 */
export const Copy = Symbol.for("crank.Copy") as any;
export type Copy = typeof Copy;

/**
 * A special element tag for injecting raw nodes into an element tree via its value prop.
 *
 * @remarks
 * If the value prop is a string, Renderer.prototype.parse will be called on the string and the element’s rendered value will be the result.
 */
export const Raw = Symbol.for("crank.Raw") as any;
export type Raw = typeof Raw;

/**
 * Describes all valid singular values of an element tree.
 *
 * @remarks
 * Arbitrary objects can also be safely rendered but they will be converted to a string using the toString method. We exclude them from this type to catch potential type errors.
 */
export type Child = Element | string | number | boolean | null | undefined;

// NOTE: we use a recursive interface rather than making the Children type directly recursive because recursive type aliases were only added in TypeScript 3.7.
interface ChildIterable extends Iterable<Child | ChildIterable> {}

/**
 * Describes all valid values of an element tree, including arbitrarily nested iterables of such values.
 */
export type Children = Child | ChildIterable;

/**
 * Represents all functions which can be used as a component.
 *
 * @typeparam TProps - The expected props for the component.
 *
 * @remarks
 * The return type of iterator objects returned from components has to be void because typescript will infer most generators as having a void return type.
 */
export type Component<TProps = any> = (
	this: Context<TProps>,
	props: TProps,
) =>
	| Children
	| PromiseLike<Children>
	| Iterator<Children, Children | void, any>
	| AsyncIterator<Children, Children | void, any>;

// WHAT ARE WE DOING TO THE CHILDREN???
/**
 * All nodes in the element tree are narrowed from the union in Child to NarrowedChild. This greatly simplifies element diffing.
 */
type NarrowedChild = Element | string | undefined;

function narrow(child: Child): NarrowedChild {
	if (child == null || typeof child === "boolean") {
		return undefined;
	} else if (typeof child === "string" || isElement(child)) {
		return child;
	} else {
		return child.toString();
	}
}

type Key = unknown;

const ElementSymbol = Symbol.for("crank.Element");

/*** ELEMENT FLAGS ***/
/**
 * A flag which is set when the component has been mounted. Used mainly to detect whether an element is being reused so that it can be cloned.
 */
const Mounted = 1 << 0;

/**
 * A flag which is set when the component has committed at least once.
 */
const Committed = 1 << 1;

// NOTE: To save on filesize, we mangle the internal properties of Crank classes by hand. These internal properties are prefixed with an underscore. Refer to their definitions to see their unabbreviated names.

// NOTE: to maximize compatibility between Crank versions, starting with 0.2.0, the $$typeof property and the non-internal properties will not be changed, and any change to these properties will be considered a breaking change. This is to ensure maximum compatibility between components which use different Crank versions.

/**
 * Elements are the basic building blocks of Crank applications. They are JavaScript objects which are interpreted by special classes called renderers to produce and manage stateful nodes.
 *
 * @typeparam TTag - the type of the tag of the element.
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
 * Typically, you use the createElement function to create elements and not this class directly.
 */
export class Element<TTag extends Tag = Tag> {
	/**
	 * The tag of the element. Can be a function, string or symbol depending on the kind of element.
	 */
	tag: TTag;

	/**
	 * An object containing the “properties” of an element. These correspond to the attributes  of the element when using JSX syntax.
	 *
	 * @remarks
	 * The props of an object are passed to most renderer host methods, and as the first argument to components.
	 */
	props: TagProps<TTag>;

	/**
	 * A value which uniquely identifies an element from its siblings so that it can be added/updated/moved/removed by the identity of the key rather than its position within the parent.
	 *
	 * @remarks
	 * Passed to the element as the prop "crank-key".
	 */
	key: Key;

	/**
	 * A callback which is called with the element’s value when the value is committed.
	 *
	 * @remarks
	 * Passed to the element as the prop "crank-ref".
	 */
	ref: Function | undefined;

	/**
	 * @internal
	 * A unique symbol to identify elements as elements across versions and realms, and to protect against basic injection attacks.
	 * https://overreacted.io/why-do-react-elements-have-typeof-property/
	 */
	$$typeof: typeof ElementSymbol;

	/**
	 * @internal
	 * flags - A bitmask. See ELEMENT FLAGS.
	 */
	_f: number;

	/**
	 * @internal
	 * context - The Context object associated with this element.
	 *
	 * @remarks
	 * Created and assigned by the Renderer for component elements when it mounts the element tree.
	 */
	_ctx: Context<TagProps<TTag>> | undefined;

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
	 * Set by Renderer.prototype.create when the component is mounted. This property will only be set for host elements.
	 */
	_n: any;

	/**
	 * @internal
	 * fallback - The value of the element while it has never committed.
	 *
	 * @remarks
	 * If an element takes place of a previously rendered value but renders asynchronously, this property is set to the previously rendered value until the element commits. This allows asynchronously updating element trees to show something while pending.
	 */
	_fb: any;

	/**
	 * @internal
	 * inflightPromise - The current pending async run of the element.
	 *
	 * @remarks
	 * This value is used to make sure element copies do not fulfill immediately, to set the fallback of the next element when the previous element commits, and as the yield value of async generator components with async children. It is unset when the element is committed.
	 */
	_inf: Promise<any> | undefined;

	/**
	 * @internal
	 * onNewValues - the resolve function of a promise which represents the next child result. See the chase function for more info.
	 */
	_onv: Function | undefined;

	constructor(
		tag: TTag,
		props: TagProps<TTag>,
		key: Key,
		ref: Function | undefined,
	) {
		this.$$typeof = ElementSymbol;
		this._f = 0;

		this.tag = tag;
		this.props = props;
		this.key = key;
		this.ref = ref;
	}
}

export function isElement(value: any): value is Element {
	return value != null && value.$$typeof === ElementSymbol;
}

/**
 * Creates an element with the specified tag, props and children.
 *
 * @remarks
 * This function is usually used as a transpilation target for JSX transpilers, but it can also be called directly. It additionally extracts the crank-key and crank-ref props so they aren’t accessible to the renderer methods or components, and assigns the children prop according to the remaining arguments passed to the function.
 */
export function createElement<TTag extends Tag>(
	tag: TTag,
	props?: TagProps<TTag> | null | undefined,
	...children: Array<unknown>
): Element<TTag>;
export function createElement<TTag extends Tag>(
	tag: TTag,
	props?: TagProps<TTag> | null | undefined,
	children?: unknown,
): Element<TTag> {
	let key: Key;
	let ref: Function | undefined;
	const props1 = {} as TagProps<TTag>;
	if (props != null) {
		for (const name in props) {
			if (name === "crank-key") {
				// NOTE: We have to make sure we don’t assign null to the key because we don’t check for null keys in the diffing functions.
				if (props[name] != null) {
					key = props[name];
				}
			} else if (name === "crank-ref") {
				if (typeof props["crank-ref"] === "function") {
					ref = props[name];
				}
			} else {
				props1[name] = props[name];
			}
		}
	}

	let length = arguments.length;
	if (length > 3) {
		const children1: Array<unknown> = [];
		while (length-- > 2) {
			children1[length - 2] = arguments[length];
		}

		props1.children = children1;
	} else if (length > 2) {
		props1.children = children;
	}

	return new Element(tag, props1, key, ref);
}

/**
 * Clones a given element.
 *
 * @remarks
 * Mainly used internally to make sure we don’t accidentally reuse elements in an element tree, because elements are directly mutated by the renderer.
 */
export function cloneElement<TTag extends Tag>(
	el: Element<TTag>,
): Element<TTag> {
	if (!isElement(el)) {
		throw new TypeError("Cannot clone non-element");
	}

	return new Element(el.tag, {...el.props}, el.key, el.ref);
}

/*** ELEMENT VALUE UTILITIES ***/

/**
 * A helper type which repesents all the possible rendered values of an element.
 *
 * @typeparam TNode - The node type for the element assigned by the renderer.
 *
 * @remarks
 * When asking the question, what is the value of a specific element, the answer varies depending on the type of the element. For host or Raw elements, the answer is simply the nodes (DOM nodes in the case of the DOM renderer) created for the element. For fragments, the values are usually an array of nodes. For portals, the value is undefined, because a Portal element’s root and children are opaque to parents. For components, the value can be any of the above, because the value of a component is determined by its children. Rendered values can also be strings or arrays of nodes and strings, in the case of a component or fragment with strings for children. All of these possible values are reflected in this utility type.
 */
export type ElementValue<TNode> =
	| Array<TNode | string>
	| TNode
	| string
	| undefined;

/**
 * Takes an array of element values and normalizes the output as an array of nodes and strings.
 *
 * @remarks
 * Normalize will flatten only one level of nested arrays, because it is designed to be called once at each level of the tree. It will also concatenate adjacent strings and remove all undefineds.
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
 * Walks an element’s children to find its child values.
 * @returns A normalized array of nodes and strings.
 */
function getChildValues<TNode>(el: Element): Array<TNode | string> {
	const values: Array<ElementValue<TNode>> = [];
	const children = arrayify(el._ch);
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (typeof child === "string") {
			values.push(child);
		} else if (typeof child === "object") {
			values.push(getValue(child));
		}
	}

	return normalize(values);
}

/**
 * Finds the value of the element according to its type.
 * @returns The value of the element.
 */
function getValue<TNode>(el: Element): ElementValue<TNode> {
	if (typeof el._fb !== "undefined") {
		return el._fb;
	} else if (typeof el.tag === Portal) {
		return undefined;
	} else if (typeof el.tag !== "function" && el.tag !== Fragment) {
		return el._n;
	}

	return unwrap(getChildValues<TNode>(el));
}

/**
 * An abstract class which is subclassed to render to different target environments. This class is responsible for kicking off the rendering process, caching previous trees by root, and creating/mutating/disposing the nodes of the target environment.
 *
 * @typeparam TNode - The type of the node for a specific rendering environment. It is the type of the return value of Renderer.prototype.create and Renderer.prototype.parse.
 * @typeparam TRoot - The type of the root for a specific rendering environment. It is the type of the second parameter passed to Renderer.prototype.render, as well as the expected type of the root portal.
 * @typeparam TResult - The type of the exposed values. It is the return value of Renderer.prototype.read, and revealed at various points of the renderer/element API.
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
	 * @param children - An element tree. You can render null with a previously used root to delete the previously rendered element tree from the cache.
	 * @param root - The node to be rendered into. The renderer will cache element trees per root.
	 * @param ctx - An optional context that will be the ancestor context of all elements in the tree. Useful for connecting renderers which call each other so that events/provisions properly propagate. The context for a given root must be the same or an error will be thrown.
	 *
	 * @returns The read result of rendering the children, or a possible promise of the read result if the element tree renders asynchronously.
	 */
	render(
		children: Children,
		root?: TRoot | undefined,
		ctx?: Context | undefined,
	): Promise<TResult> | TResult {
		let portal: Element<Portal> | undefined;
		if (typeof root === "object" && root !== null) {
			portal = this._cache.get((root as unknown) as object);
		}

		if (!portal) {
			portal = createElement(Portal, {children, root});
			portal._ctx = ctx;
			if (typeof root === "object" && root !== null && children != null) {
				this._cache.set((root as unknown) as object, portal);
			}
		} else {
			if (portal._ctx !== ctx) {
				throw new Error("render must be called with the same context per root");
			}

			portal.props = {children, root};
			if (typeof root === "object" && root !== null && children == null) {
				this._cache.delete((root as unknown) as object);
			}
		}

		const scope = undefined;
		const value = update(this, root, portal, ctx, scope, portal);
		// NOTE: we return the read child values of the portal because portals themselves have no readable value.
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
	 * Called when an element’s value is exposed via render, schedule, refresh, refs, or generator yield expressions.
	 *
	 * @param value - The value of the element being read. Can be a node, a string, undefined, or an array of nodes and strings, depending on the element.
	 * @returns Varies according to the specific renderer subclass. By default, it exposes the element’s value.
	 *
	 * @remarks
	 * This is useful for renderers which don’t want to expose their internal nodes. For instance, the HTML renderer will convert all internal nodes to strings.
	 *
	 */
	read(value: ElementValue<TNode>): TResult {
		return (value as unknown) as TResult;
	}

	/**
	 * Called in a preorder traversal for each host element.
	 *
	 * @remarks
	 * Useful for passing data down the element tree. For instance, the DOM renderer uses this method to keep track of whether we’re in an SVG subtree.
	 *
	 * @param tag - The tag of the host element.
	 * @param props - The props of the host element.
	 * @param scope - The current scope.
	 *
	 * @returns The scope to be passed to create and patch for child host elements.
	 *
	 * @remarks
	 * This method sets the scope for child host elements, not the current host element.
	 */
	scope<TTag extends string | symbol>(
		_tag: TTag,
		_props: TagProps<TTag>,
		scope: TScope | undefined,
	): TScope {
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
	 * Rather than returning text nodes for whatever environment we’re rendering to, we defer that step for Renderer.prototype.arrange. We do this so that adjacent strings can be concatenated and the actual element tree can be rendered in a normalized form.
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
	 * @param tag - The tag of the host element.
	 * @param props - The props of the host element.
	 * @param scope - The current scope.
	 *
	 * @returns A “node” which determines the value of the host element.
	 */
	create<TTag extends string | symbol>(
		_tag: TTag,
		_props: TagProps<TTag>,
		_scope: TScope,
	): TNode {
		throw new Error("Not implemented");
	}

	/**
	 * Called for each host element when it is committed.
	 *
	 * @param tag - The tag of the host element.
	 * @param props - The props of the host element.
	 * @param node - The node associated with the host element.
	 * @param scope - The current scope.
	 *
	 * @returns The return value is ignored.
	 *
	 * @remarks
	 * Used to mutate the node associated with an element when new props are passed.
	 */
	patch<TTag extends string | symbol>(
		_tag: TTag,
		_props: TagProps<TTag>,
		_node: TNode,
		_scope: TScope | undefined,
	): unknown {
		return;
	}

	// TODO: pass hints into arrange about where the dirty children start and end
	/**
	 * Called for each host element after its children have committed with the actual values of the children.
	 *
	 * @param tag - The tag of the host element.
	 * @param props - The props of the host element.
	 * @param node - The node associated with the host element.
	 * @param children - An array of nodes and strings from child elements.
	 *
	 * @returns The return value is ignored.
	 *
	 * @remarks
	 * This method is also called by child components contexts as the last step of a refresh.
	 */
	arrange<TTag extends string | symbol>(
		_tag: TTag,
		_props: TagProps<TTag>,
		_parent: TNode | TRoot,
		_children: Array<TNode | string>,
	): unknown {
		return;
	}

	// TODO: remove(): a method which is called to remove a child from a parent to optimize arrange

	/**
	 * Called for each host element when it is unmounted.
	 *
	 * @param tag - The tag of the host element.
	 * @param props - The props of the host element.
	 * @param node - The node associated with the host element.
	 *
	 * @returns The return value is ignored.
	 */
	dispose<TTag extends string | symbol>(
		_tag: TTag,
		_props: TagProps<TTag>,
		_node: TNode,
	): unknown {
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
// NOTE: to aid in the mangling of this module, we use functions rather than methods for internal logic.
function mount<TNode, TScope, TRoot, TResult>(
	renderer: Renderer<TNode, TScope, TRoot, TResult>,
	root: TRoot,
	host: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: TScope,
	el: Element,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	el._f |= Mounted;
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
		scope = renderer.scope(el.tag, el.props, scope);
	}

	// NOTE: The primary benefit of having a separate codepath for mounting is that it’s slightly faster because we don’t have to align and diff children against old children. But for singular child values, updateChild is sufficient.
	if (isNonStringIterable(el.props.children)) {
		return mountChildren(
			renderer,
			root,
			host,
			ctx,
			scope,
			el,
			el.props.children,
		);
	}

	return updateChild(renderer, root, host, ctx, scope, el, el.props.children);
}

function mountChildren<TNode, TScope, TRoot, TResult>(
	renderer: Renderer<TNode, TScope, TRoot, TResult>,
	root: TRoot,
	host: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: TScope,
	parent: Element,
	children: ChildIterable,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	const values: Array<Promise<ElementValue<TNode>> | ElementValue<TNode>> = [];
	const newChildren = Array.from(children);
	let async = false;
	for (let i = 0; i < newChildren.length; i++) {
		let value: Promise<ElementValue<TNode>> | ElementValue<TNode>;
		let child = newChildren[i] as NarrowedChild;
		if (isNonStringIterable(child)) {
			child = createElement(Fragment, null, child);
		} else {
			child = narrow(child);
		}

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

	parent._ch = unwrap(newChildren as Array<NarrowedChild>);

	let values1: Promise<Array<ElementValue<TNode>>> | Array<ElementValue<TNode>>;
	if (async) {
		values1 = Promise.all(values);
	} else {
		values1 = values as Array<ElementValue<TNode>>;
	}

	return chase(renderer, host, ctx, scope, parent, values1);
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
		if (typeof el._ctx === "object") {
			return updateCtx(el._ctx);
		}

		return undefined;
	} else if (el.tag === Raw) {
		return commit(renderer, scope, el, []);
	} else if (el.tag !== Fragment) {
		host = el as Element<string | symbol>;
		scope = renderer.scope(el.tag, el.props, scope);
		if (el.tag === Portal) {
			root = el.props.root;
		}
	}

	if (isNonStringIterable(el.props.children)) {
		return updateChildren(
			renderer,
			root,
			host,
			ctx,
			scope,
			el,
			el.props.children,
		);
	} else if (Array.isArray(el._ch)) {
		return updateChildren(renderer, root, host, ctx, scope, el, [
			el.props.children,
		]);
	}

	return updateChild(renderer, root, host, ctx, scope, el, el.props.children);
}

function updateChild<TNode, TScope, TRoot, TResult>(
	renderer: Renderer<TNode, TScope, TRoot, TResult>,
	root: TRoot,
	host: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: TScope,
	parent: Element,
	child: Child,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	let oldChild = parent._ch as NarrowedChild;
	let newChild = narrow(child);
	if (
		typeof oldChild === "object" &&
		typeof newChild === "object" &&
		oldChild.key !== newChild.key
	) {
		oldChild = undefined;
	}

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

	if (typeof oldChild === "object" && oldChild !== newChild) {
		unmount(renderer, host, ctx, oldChild);
	}

	parent._ch = newChild;
	// TODO: allow single values to be passed to chase
	const values = isPromiseLike(value) ? value.then(arrayify) : arrayify(value);
	return chase(renderer, host, ctx, scope, parent, values);
}

function mapChildrenByKey(children: Array<NarrowedChild>): Map<Key, Element> {
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
	parent: Element,
	children: ChildIterable,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (typeof parent._ch === "undefined") {
		return mountChildren(renderer, root, host, ctx, scope, parent, children);
	}

	const values: Array<Promise<ElementValue<TNode>> | ElementValue<TNode>> = [];
	const oldChildren = arrayify(parent._ch);
	const newChildren = Array.from(children);
	const graveyard: Array<Element> = [];
	let i = 0;
	let async = false;
	let seen: Set<Key> | undefined;
	let childrenByKey: Map<Key, Element> | undefined;
	// TODO: switch to mountChildren if there are no more children
	for (let j = 0; j < newChildren.length; j++) {
		let oldChild = oldChildren[i];
		let newChild = newChildren[j] as NarrowedChild;
		if (isNonStringIterable(newChild)) {
			newChild = createElement(Fragment, null, newChild);
		} else {
			newChild = narrow(newChild);
		}

		// ALIGNMENT
		let oldKey = typeof oldChild === "object" ? oldChild.key : undefined;
		let newKey = typeof newChild === "object" ? newChild.key : undefined;
		if (seen !== undefined && seen.has(newKey)) {
			// TODO: warn about a duplicate key
			newKey = undefined;
		}

		if (oldKey !== newKey) {
			if (!childrenByKey) {
				childrenByKey = mapChildrenByKey(oldChildren.slice(i));
			}

			if (typeof newKey === "undefined") {
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

	parent._ch = unwrap(newChildren as Array<NarrowedChild>);

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

	let values1: Promise<Array<ElementValue<TNode>>> | Array<ElementValue<TNode>>;
	if (async) {
		values1 = Promise.all(values).finally(() =>
			graveyard.forEach((child) => unmount(renderer, host, ctx, child)),
		);
	} else {
		values1 = values as Array<ElementValue<TNode>>;
		graveyard.forEach((child) => unmount(renderer, host, ctx, child));
	}

	return chase(renderer, host, ctx, scope, parent, values1);
}

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
				renderer.arrange(Portal, oldChild.props, oldChild.props.root, []);
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
					value.then(newChild.ref as any).catch(() => {});
				} else {
					newChild.ref(value);
				}
			}

			newChild = oldChild;
		} else {
			if (newChild._f & Mounted) {
				newChild = cloneElement(newChild);
			}

			if (typeof oldChild === "object") {
				newChild._fb = oldChild._n;
				if (typeof oldChild._inf === "object") {
					oldChild._inf
						.then((value) => {
							if (!((newChild as Element)._f & Committed)) {
								(newChild as Element)._fb = value;
							}
						})
						.catch(() => {});
				}
			}

			value = mount(renderer, root, host, ctx, scope, newChild);
		}
	} else if (typeof newChild === "string") {
		newChild = renderer.escape(newChild, scope);
		value = newChild;
	}

	return [newChild, value];
}

/**
 * A function to race current child values with future child values.
 *
 * @remarks
 * When an element’s children update asynchronously, we race the resulting promise with the next update of the element’s children. By induction, this ensures that when any update to an element settles, all past updates to that same element will have settled as well. This prevents deadlocks and unnecessary awaiting when an element’s children have been cleared, for instance.
 */
function chase<TNode, TScope, TRoot, TResult>(
	renderer: Renderer<TNode, TScope, TRoot, TResult>,
	host: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: TScope,
	el: Element,
	values: Promise<Array<ElementValue<TNode>>> | Array<ElementValue<TNode>>,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (isPromiseLike(values)) {
		let onNewValues!: Function;
		const newValues = new Promise<Array<ElementValue<TNode>>>(
			(resolve) => (onNewValues = resolve),
		);

		const valuesP = Promise.race([values, newValues]);
		if (typeof el._onv === "function") {
			el._onv(valuesP);
		}

		el._onv = onNewValues;

		const value = valuesP.then((values) =>
			commit(renderer, scope, el, normalize(values)),
		);

		el._inf = value;
		return value;
	}

	if (typeof el._onv === "function") {
		el._onv(values);
		el._onv = undefined;
	}

	return commit(renderer, scope, el, normalize(values));
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
		renderer.arrange(Portal, el.props, el.props.root, values);
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
		if (!(el._f & Committed)) {
			el._n = renderer.create(el.tag, el.props, scope);
		}

		renderer.patch(el.tag, el.props, el._n, scope);
		renderer.arrange(el.tag, el.props, el._n, values);
		value = el._n;
	}

	el._f |= Committed;
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
		renderer.arrange(Portal, el.props, el.props.root, []);
		renderer.complete(el.props.root);
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
		renderer.dispose(el.tag, el.props, el._n);
	}

	const children = arrayify(el._ch);
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (typeof child === "object") {
			unmount(renderer, host, ctx, child);
		}
	}
}

/*** EVENT UTILITIES ***/

// EVENT PHASE CONSTANTS (https://developer.mozilla.org/en-US/docs/Web/API/Event/eventPhase)
const NONE = 0;
const CAPTURING_PHASE = 1;
const AT_TARGET = 2;
const BUBBLING_PHASE = 3;

/**
 * A map of event type strings to Event subclasses. Can be extended via TypeScript module augmentation to have strongly typed event listeners.
 */
export interface EventMap {
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
	} else {
		return options;
	}
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
 * A function to reconstruct an array of every listener given a context and a host element.
 *
 * @remarks
 * This function exploits the fact that contexts retain their nearest ancestor host element. We can determine all the contexts which are directly listening to an element by traversing up the context tree and checking that the host element passed in matches the context’s host property.
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
	if (typeof ctx._ls !== "undefined" && ctx._ls.length > 0) {
		for (const value of getChildValues(ctx._el)) {
			if (isEventTarget(value)) {
				for (const record of ctx._ls) {
					value.removeEventListener(
						record.type,
						record.callback,
						record.options,
					);
				}
			}
		}

		ctx._ls = undefined;
	}
}

/**
 * An interface which can be extended to provide strongly typed provisions (see Context.prototype.get and Context.prototype.set)
 */
export interface ProvisionMap {}

// CONTEXT FLAGS
/**
 * A flag which is set when the component is being updated by the parent and cleared when the component has committed. Used to determine whether the nearest host ancestor needs to be rearranged.
 */
const Updating = 1 << 0;

/**
 * A flag which is set when the component is called or stepped through. It is used to ensure that a component which synchronously triggers a second update in the course of rendering does not cause an infinite loop or a generator error.
 */
const Stepping = 1 << 1;

/**
 * A flag used to make sure multiple values are not pulled from context prop iterators without a yield.
 */
const Iterating = 1 << 2;

/**
 * A flag used by async generator components in conjunction with the onProps functions (_op) to mark whether new props can be pulled via the context iterator methods.
 */
const Available = 1 << 3;

/**
 * A flag which is set when generator components return. Set whenever an iterator returns an iteration with the done property set to true. Finished components will stick to their last rendered value and ignore further updates.
 */
const Finished = 1 << 4;

/**
 * A flag which is set when the component is unmounted. Unmounted components are no longer in the element tree, and cannot run or refresh.
 */
const Unmounted = 1 << 5;

/**
 * A flag which indicates that the component is a sync generator component.
 */
const SyncGen = 1 << 6;

/**
 * A flag which indicates that the component is an async generator component.
 */
const AsyncGen = 1 << 7;

/**
 * A class which is instantiated and passed to every component as its this value. In addition to the element tree, contexts also form a tree. Components can use this context tree to communicate data upwards via events and downwards via provisions.
 * @typeparam TProps - The expected shape of the props passed to the component. Used to strongly type the Context iterator methods.
 * @typeparam TResult - The readable element value type. It is used in places such as the return value of refresh and the argument passed to schedule/cleanup callbacks.
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
	 * el - The associated component element.
	 */
	_el: Element<Component>;

	/**
	 * @internal
	 * parent - The parent context.
	 */
	_pa: Context<unknown, TResult> | undefined;

	/**
	 * @internal
	 * root - The root node set by an ancestor’s Portal prop.
	 */
	_rt: unknown;

	/**
	 * @internal
	 * host - The nearest ancestor host element.
	 * @remarks
	 * When refresh is called, the host element will be arranged as the last step of the commit, to make sure the parent’s children properly reflects the components’s children.
	 */
	_ho: Element<string | symbol>;

	/**
	 * @internal
	 * scope - The value of the scope at the point of element’s creation.
	 */
	_sc: unknown;

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
	 * onProps - A callback used in conjunction with the Available flag to implement the props async iterator. See the Symbol.asyncIterator method and the resume function.
	 */
	_op: ((props: any) => unknown) | undefined;

	// See the run/step/advance functions for more notes on inflight/enqueued pending/value.
	/**
	 * @internal
	 * inflightPending
	 */
	_ip: Promise<unknown> | undefined;

	/**
	 * @internal
	 * inflightValue
	 */
	_iv: Promise<ElementValue<any>> | undefined;

	/**
	 * @internal
	 * enqueuedPending
	 */
	_ep: Promise<unknown> | undefined;

	/**
	 * @internal
	 * enqueuedValue
	 */
	_ev: Promise<ElementValue<any>> | undefined;

	/**
	 * @internal
	 * listeners - An array of event listeners added to the context via Context.prototype.addEventListener
	 */
	_ls: Array<EventListenerRecord> | undefined;

	/**
	 * @internal
	 * provisions - A map of values which can be set via Context.prototype.set and read from child contexts via Context.prototype.get
	 */
	_ps: Map<unknown, unknown> | undefined;

	/**
	 * @internal
	 * schedules - a set of callbacks registered via Context.prototype.schedule, which fire when the component has committed.
	 */
	_ss: Set<(value: TResult) => unknown> | undefined;

	/**
	 * @internal
	 * cleanups - a set of callbacks registered via Context.prototype.cleanup, which fire when the component has unmounted.
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

	get<TKey extends keyof ProvisionMap>(key: TKey): ProvisionMap[TKey];
	get(key: unknown): any {
		for (let parent = this._pa; parent !== undefined; parent = parent._pa) {
			if (typeof parent._ps === "object" && parent._ps.has(key)) {
				return parent._ps.get(key)!;
			}
		}
	}

	set<TKey extends keyof ProvisionMap>(
		key: TKey,
		value: ProvisionMap[TKey],
	): void;
	set(key: unknown, value: any): void {
		if (typeof this._ps === "undefined") {
			this._ps = new Map();
		}

		this._ps.set(key, value);
	}

	/**
	 * The current props of the associated element.
	 *
	 * @remarks
	 * Typically, you should read props either via the first parameter of the component or via the context iterator methods. This property is mainly for plugins or utilities which wrap contexts.
	 */
	get props(): TProps {
		return this._el.props;
	}

	/**
	 * The current value of the associated element.
	 *
	 * @remarks
	 * Typically, you should read values via refs, generator yield expressions, or the refresh, schedule or cleanup methods. This property is mainly for plugins or utilities which wrap contexts.
	 */
	get value(): TResult {
		return this._re.read(getValue(this._el));
	}

	*[Symbol.iterator](): Generator<TProps> {
		const el = this._el;
		while (!(this._f & Unmounted)) {
			if (this._f & Iterating) {
				throw new Error("You must yield for each iteration of this.");
			} else if (this._f & AsyncGen) {
				throw new Error("Use for await...of in async generator components.");
			}

			this._f |= Iterating;
			yield el.props!;
		}
	}

	async *[Symbol.asyncIterator](): AsyncGenerator<TProps> {
		const el = this._el;
		do {
			if (this._f & Iterating) {
				throw new Error("You must yield for each iteration of this.");
			} else if (this._f & SyncGen) {
				throw new Error("Use for...of in sync generator components.");
			}

			this._f |= Iterating;
			if (this._f & Available) {
				this._f &= ~Available;
				yield el.props;
			} else {
				const props = await new Promise<TProps>(
					(resolve) => (this._op = resolve),
				);
				if (!(this._f & Unmounted)) {
					yield props;
				}
			}
		} while (!(this._f & Unmounted));
	}

	/**
	 * Re-executes the component.
	 *
	 * @returns The rendered value of the component or a promise of the rendered value if the component or its children execute asynchronously.
	 *
	 * @remarks
	 * The refresh method works a little differently for async generator components, in that it will resume the Context async iterator rather than resuming execution. This is because async generator components are perpetually resumed independent of updates/refresh.
	 */
	refresh(): Promise<TResult> | TResult {
		if (this._f & (Stepping | Unmounted)) {
			// TODO: log an error
			return this._re.read(undefined);
		}

		this._f &= ~Updating;
		resume(this);
		return this._re.read(run(this));
	}

	/**
	 * Registers a callback which fires when the component commits. Will only fire once per callback and update.
	 */
	schedule(callback: (value: TResult) => unknown): void {
		if (typeof this._ss === "undefined") {
			this._ss = new Set();
		}

		this._ss.add(callback);
	}

	/**
	 * Registers a callback which fires when the component unmounts. Will only fire once per callback.
	 */
	cleanup(callback: (value: TResult) => unknown): void {
		if (typeof this._cs === "undefined") {
			this._cs = new Set();
		}

		this._cs.add(callback);
	}

	addEventListener<T extends string>(
		type: T,
		listener: MappedEventListenerOrEventListenerObject<T> | null,
		options?: boolean | AddEventListenerOptions,
	): void {
		if (listener == null) {
			return;
		} else if (typeof this._ls === "undefined") {
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
				if (typeof self._ls !== "undefined") {
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
		if (listener == null || typeof this._ls === "undefined") {
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
		for (const value of getChildValues(this._el)) {
			if (isEventTarget(value)) {
				value.removeEventListener(record.type, record.callback, record.options);
			}
		}

		if (this._ls.length === 0) {
			this._ls = undefined;
		}
	}

	dispatchEvent(ev: Event): boolean {
		const path: Context<unknown, TResult>[] = [];
		for (let parent = this._pa; parent !== undefined; parent = parent._pa) {
			path.push(parent);
		}

		let stopped = false;
		const stopImmediatePropagation = ev.stopImmediatePropagation;
		setEventProperty(ev, "stopImmediatePropagation", () => {
			stopped = true;
			return stopImmediatePropagation.call(ev);
		});
		setEventProperty(ev, "target", this);
		setEventProperty(ev, "eventPhase", CAPTURING_PHASE);
		try {
			for (let i = path.length - 1; i >= 0; i--) {
				const et = path[i];
				if (typeof et._ls !== "undefined") {
					setEventProperty(ev, "currentTarget", et);
					for (const record of et._ls) {
						if (record.type === ev.type && record.options.capture) {
							try {
								record.callback.call(this, ev);
							} catch (err) {
								// eslint-disable-next-line no-console
								console.error(err);
							}

							if (stopped) {
								break;
							}
						}
					}
				}

				if (stopped || ev.cancelBubble) {
					return !ev.defaultPrevented;
				}
			}

			if (typeof this._ls !== "undefined") {
				setEventProperty(ev, "eventPhase", AT_TARGET);
				setEventProperty(ev, "currentTarget", this);
				for (const record of this._ls) {
					if (record.type === ev.type) {
						try {
							record.callback.call(this, ev);
						} catch (err) {
							// eslint-disable-next-line no-console
							console.error(err);
						}

						if (stopped) {
							break;
						}
					}
				}

				if (stopped || ev.cancelBubble) {
					return !ev.defaultPrevented;
				}
			}

			if (ev.bubbles) {
				setEventProperty(ev, "eventPhase", BUBBLING_PHASE);
				for (const et of path) {
					if (typeof et._ls !== "undefined") {
						setEventProperty(ev, "currentTarget", et);
						for (const record of et._ls) {
							if (record.type === ev.type && !record.options.capture) {
								try {
									record.callback.call(this, ev);
								} catch (err) {
									// eslint-disable-next-line no-console
									console.error(err);
								}

								if (stopped) {
									break;
								}
							}
						}
					}

					if (stopped || ev.cancelBubble) {
						return !ev.defaultPrevented;
					}
				}
			}

			return !ev.defaultPrevented;
		} finally {
			setEventProperty(ev, "eventPhase", NONE);
			setEventProperty(ev, "currentTarget", null);
		}
	}
}

/*** PRIVATE CONTEXT FUNCTIONS ***/
/**
 * Called to make props available to the Context async iterator for async generator components.
 */
function resume(ctx: Context): void {
	if (typeof ctx._op === "function") {
		ctx._op(ctx._el.props);
		ctx._op = undefined;
	} else {
		ctx._f |= Available;
	}
}

// NOTE: The functions run, step and advance work together to implement the async queueing behavior of components. The run function calls the step function, which returns two results in a tuple. The first result, called “pending,” is a possible promise which settles when the component can accept new updates, and represents the duration during which the component is blocked from accepting new updates. The second result, called “value,” is the actual result of the update. The run function caches pending/value from the step function on the context, according to whether the component is currently blocked. The “inflight” pending/value properties are the currently executing update, and the “enqueued” pending/value properties are promises which represent the next step. Lastly, the run function calls the advance function in a Promise.prototype.finally callback to allow new steps to be enqueued.

/**
 * Enqueues and executes the component associated with the context.
 */
function run<TNode, TResult>(
	ctx: Context<unknown, TResult>,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (typeof ctx._ip === "undefined") {
		try {
			let [pending, value] = step<TNode, TResult>(ctx);
			if (isPromiseLike(pending)) {
				ctx._ip = pending
					.catch((err) => {
						if (!(ctx._f & Updating)) {
							return propagateError(ctx._pa, err);
						}
					})
					.finally(() => advance(ctx));
			}

			if (isPromiseLike(value)) {
				ctx._iv = value;
				ctx._el._inf = value;
			}

			return value;
		} catch (err) {
			if (!(ctx._f & Updating)) {
				return propagateError(ctx._pa, err);
			}

			throw err;
		}
	} else if (ctx._f & AsyncGen) {
		return ctx._iv;
	} else if (typeof ctx._ep === "undefined") {
		let resolve: Function;
		ctx._ep = ctx._ip
			.then(() => {
				try {
					const [pending, value] = step<TNode, TResult>(ctx);
					resolve(value);
					if (isPromiseLike(value)) {
						ctx._el._inf = value;
					}

					if (isPromiseLike(pending)) {
						return pending.catch((err) => {
							if (!(ctx._f & Updating)) {
								return propagateError(ctx._pa, err);
							}
						});
					}
				} catch (err) {
					if (!(ctx._f & Updating)) {
						return propagateError(ctx._pa, err);
					}
				}
			})
			.finally(() => advance(ctx));
		ctx._ev = new Promise((resolve1) => (resolve = resolve1));
	}

	return ctx._ev;
}

type ChildrenIteration =
	| IteratorResult<Children, Children | void>
	| Promise<IteratorResult<Children, Children | void>>;

/**
 * The step function is responsible for executing the component and handling all the different component types.
 *
 * @returns A tuple [pending, value]
 * pending - A possible promise which represents the duration during which the component is blocked from updating.
 * value - The actual rendered value of the children.
 *
 * @remarks
 * Each component type will block/unblock according to the type of the component.
 * Sync function components never block and will transparently pass updates to children.
 * Async function components and async generator components block while executing itself, but will not block for async children.
 * Sync generator components block while any children are pending.
 *
 * The reason sync generator components block while their children are pending is that they are expected to only resume when they’ve actually rendered. Additionally, they have no mechanism for awaiting async children.
 */
function step<TNode, TResult>(
	ctx: Context<unknown, TResult>,
): [
	Promise<unknown> | undefined,
	Promise<ElementValue<TNode>> | ElementValue<TNode>,
] {
	const el = ctx._el;
	if (ctx._f & Finished) {
		return [undefined, getValue<TNode>(el)];
	}

	let initial = false;
	try {
		ctx._f |= Stepping;
		if (typeof ctx._it === "undefined") {
			initial = true;
			clearEventListeners(ctx);
			const result = el.tag.call(ctx, el.props);
			if (isIteratorLike(result)) {
				ctx._it = result;
			} else if (isPromiseLike(result)) {
				const result1 =
					result instanceof Promise ? result : Promise.resolve(result);
				const pending = result1;
				const value = result1.then((result) =>
					updateCtxChildren<TNode, TResult>(ctx, result),
				);
				return [pending, value];
			} else {
				// sync function component
				return [undefined, updateCtxChildren<TNode, TResult>(ctx, result)];
			}
		}
	} finally {
		ctx._f &= ~Stepping;
	}

	let oldValue: Promise<TResult> | TResult;
	if (typeof ctx._el._inf === "object") {
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
		ctx._f |= Stepping;
		iteration = ctx._it.next(oldValue);
	} finally {
		ctx._f &= ~Stepping;
	}

	if (isPromiseLike(iteration)) {
		// async generator component
		if (initial) {
			ctx._f |= AsyncGen;
		}

		const pending = iteration;
		const value: Promise<ElementValue<TNode>> = iteration.then((iteration) => {
			ctx._f &= ~Iterating;
			if (iteration.done) {
				ctx._f |= Finished;
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
		});

		return [pending, value];
	}

	// sync generator component
	if (initial) {
		ctx._f |= SyncGen;
	}

	ctx._f &= ~Iterating;
	if (iteration.done) {
		ctx._f |= Finished;
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
		// Because
		return [value.catch(() => {}), value];
	}

	return [undefined, value];
}

/**
 * @remarks
 * Called when the inflight pending promise settles.
 */
function advance(ctx: Context): void {
	// _ip: inflightPending
	// _iv: inflightValue
	// _ep: enqueuedPending
	// _ev: enqueuedValue
	ctx._ip = ctx._ep;
	ctx._iv = ctx._ev;
	ctx._ep = undefined;
	ctx._ev = undefined;
	if (ctx._f & AsyncGen && !(ctx._f & Finished)) {
		run(ctx);
	}
}

// TODO: generator components which throw errors should be recoverable
function handleChildError<TNode>(
	ctx: Context,
	err: unknown,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (ctx._f & Finished || !ctx._it || typeof ctx._it.throw !== "function") {
		throw err;
	}

	resume(ctx);
	let iteration: ChildrenIteration;
	try {
		ctx._f |= Stepping;
		iteration = ctx._it.throw(err) as any;
	} finally {
		ctx._f &= ~Stepping;
	}

	if (isPromiseLike(iteration)) {
		return iteration.then((iteration) => {
			if (iteration.done) {
				ctx._f |= Finished;
			}

			return updateCtxChildren(ctx, iteration.value as Children);
		});
	}

	if (iteration.done) {
		ctx._f |= Finished;
	}

	return updateCtxChildren(ctx, iteration.value as Children);
}

function propagateError(
	ctx: Context | undefined,
	err: unknown,
): Promise<undefined> | undefined {
	if (
		!ctx ||
		ctx._f & Finished ||
		!ctx._it ||
		typeof ctx._it.throw !== "function"
	) {
		throw err;
	}

	try {
		resume(ctx);
		let iteration: ChildrenIteration;
		try {
			ctx._f |= Stepping;
			iteration = ctx._it.throw(err);
		} finally {
			ctx._f &= ~Stepping;
		}

		if (isPromiseLike(iteration)) {
			return iteration
				.then(() => undefined)
				.catch((err) => propagateError(ctx._pa, err));
		}
	} catch (err) {
		return propagateError(ctx._pa, err);
	}
}

function updateCtx<TNode>(
	ctx: Context,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	ctx._f |= Updating;
	resume(ctx);
	return run(ctx);
}

function updateCtxChildren<TNode, TResult>(
	ctx: Context<unknown, TResult>,
	children: Children,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	let child: Child;
	if (isNonStringIterable(children)) {
		child = createElement(Fragment, null, children);
	} else {
		child = children;
	}

	return updateChild<TNode, unknown, unknown, TResult>(
		ctx._re as Renderer<TNode, unknown, unknown, TResult>,
		ctx._rt, // root
		ctx._ho, // host
		ctx,
		ctx._sc, // scope
		ctx._el, // element
		child,
	);
}

function commitCtx<TNode>(ctx: Context, value: ElementValue<TNode>): void {
	if (ctx._f & Unmounted) {
		return;
	}

	if (typeof ctx._ls !== "undefined" && ctx._ls.length > 0) {
		for (const child of arrayify(value)) {
			if (isEventTarget(child)) {
				for (const record of ctx._ls) {
					child.addEventListener(record.type, record.callback, record.options);
				}
			}
		}
	}

	if (!(ctx._f & Updating)) {
		const listeners = getListeners(ctx._pa, ctx._ho);
		if (listeners !== undefined && listeners.length > 0) {
			for (let i = 0; i < listeners.length; i++) {
				const record = listeners[i];
				for (const v of arrayify(value)) {
					if (isEventTarget(v)) {
						v.addEventListener(record.type, record.callback, record.options);
					}
				}
			}
		}

		// TODO: we don’t need to call arrange if none of the nodes have changed or moved
		const host = ctx._ho;
		if (host._f & Committed) {
			ctx._re.arrange(
				host.tag,
				host.props,
				host.tag === Portal ? host.props.root : host._n,
				getChildValues(host),
			);
		}

		ctx._re.complete(ctx._rt);
	}

	ctx._f &= ~Updating;
	if (!!ctx._ss && ctx._ss.size > 0) {
		// NOTE: We have to clear the set of callbacks before calling them, because a callback which refreshes the component would otherwise cause a stack overflow.
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
	ctx._f |= Unmounted;
	clearEventListeners(ctx);
	if (ctx._cs) {
		const value = ctx._re.read(getValue(ctx._el));
		for (const cleanup of ctx._cs) {
			cleanup(value);
		}

		ctx._cs = undefined;
	}

	if (!(ctx._f & Finished)) {
		ctx._f |= Finished;
		resume(ctx);

		if (!!ctx._it && typeof ctx._it.return === "function") {
			let iteration: ChildrenIteration;
			try {
				ctx._f |= Stepping;
				iteration = ctx._it.return();
			} finally {
				ctx._f &= ~Stepping;
			}

			if (isPromiseLike(iteration)) {
				iteration.catch((err) => propagateError(ctx._pa, err));
			}
		}
	}
}

// TODO: uncomment and use in the Element interface below
// type CrankElement = Element;
declare global {
	module JSX {
		// TODO: JSX Element type (the result of JSX expressions) don’t work because TypeScript demands that all Components return JSX elements for some reason.
		// interface Element extends CrankElement {}

		interface IntrinsicElements {
			[tag: string]: any;
		}

		interface ElementChildrenAttribute {
			children: {};
		}
	}
}
