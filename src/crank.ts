const NOOP = (): undefined => {};
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
				? [value as T]
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
		? TProps & JSX.IntrinsicAttributes
		: Record<string, unknown> & JSX.IntrinsicAttributes;

/*** FLAG HELPER FUNCTIONS ***/
/**
 * Sets or clears a flag on an object with an 'f' bitmask property.
 *
 * @param obj - Object with an 'f' number property
 * @param flag - The flag value to set or clear
 * @param value - Whether to set (true) or clear (false) the flag. Defaults to true.
 */
function setFlag(obj: {f: number}, flag: number, value = true): void {
	if (value) {
		obj.f |= flag;
	} else {
		obj.f &= ~flag;
	}
}

/**
 * Tests whether a flag is set on an object with an 'f' bitmask property.
 *
 * @param obj - Object with an 'f' number property
 * @param flag - The flag value to test
 * @returns True if the flag is set, false otherwise
 */
function getFlag(obj: {f: number}, flag: number): boolean {
	return !!(obj.f & flag);
}

/*** SPECIAL TAGS ***/
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
 * Renderer.prototype.raw() is called with the value prop.
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
 * Describes all valid values for an element tree, including arbitrarily nested
 * iterables of such values.
 *
 * This type can be used to represent the type of the children prop for an
 * element or the return/yield type of a component.
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
	ctx: Context<TProps>,
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
	 * An object containing the "properties" of an element. These correspond to
	 * the attribute syntax from JSX.
	 */
	props: TagProps<TTag>;
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
	constructor(tag: TTag, props: TagProps<TTag>) {
		this.tag = tag;
		this.props = props;
	}

	get key(): Key {
		return this.props.key;
	}

	get ref(): unknown {
		return this.props.ref;
	}

	get copy(): boolean {
		return !!this.props.copy;
	}
}

// See Element interface
Element.prototype.$$typeof = ElementSymbol;

export function isElement(value: any): value is Element {
	return value != null && value.$$typeof === ElementSymbol;
}

const SPECIAL_PROPS = new Set(["children", "key", "ref", "copy"]);

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
	if (props == null) {
		props = {} as TagProps<TTag>;
	}

	if (children.length > 1) {
		(props as TagProps<TTag>).children = children;
	} else if (children.length === 1) {
		(props as TagProps<TTag>).children = children[0];
	}

	return new Element(tag, props as TagProps<TTag>);
}

/** Clones a given element, shallowly copying the props object. */
export function cloneElement<TTag extends Tag>(
	el: Element<TTag>,
): Element<TTag> {
	if (!isElement(el)) {
		throw new TypeError("Cannot clone non-element");
	}

	return new Element(el.tag, {...el.props});
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
 * When asking the question, what is the "value" of a specific element, the
 * answer varies depending on the tag:
 *
 * For host elements, the value is the nodes created for the element, e.g. the
 * DOM node in the case of the DOMRenderer.
 *
 * For fragments, the value is the value of the
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

/*** RETAINER FLAGS ***/
const HasCommitted = 1 << 0;
const IsCopied = 1 << 1;

/**
 * @internal
 * The internal nodes which are cached and diffed against new elements when
 * rendering element trees.
 */
class Retainer<TNode> {
	/** A bitmask. See RETAINER FLAGS above. */
	declare f: number;

	/** The element associated with this retainer. */
	declare el: Element;

	/**
	 * The context associated with this element. Will only be defined for
	 * component elements.
	 */
	declare ctx: ContextState<TNode> | undefined;

	/**
	 * The retainer children of this element. Retainers form a tree which mirrors
	 * elements. Can be a single child or undefined as a memory optimization.
	 */
	declare children: Array<RetainerChild<TNode>> | RetainerChild<TNode>;

	/** The value associated with this element. */
	declare value: ElementValue<TNode>;

	/**
	 * The child which this retainer replaces. This property is used when an
	 * async retainer tree replaces previously rendered elements, so that the
	 * previously rendered elements can remain visible until the async tree
	 * settles.
	 */
	declare fallback: RetainerChild<TNode>;

	declare oldProps: Record<string, any> | undefined;

	declare pending: Promise<undefined> | undefined;

	declare onNext: Function | undefined;

	declare graveyard: Array<Retainer<TNode>> | undefined;

	constructor(el: Element) {
		this.f = 0;
		this.el = el;
		this.ctx = undefined;
		this.children = undefined;
		this.value = undefined;
		this.fallback = undefined;
		this.oldProps = undefined;
		this.pending = undefined;
		this.onNext = undefined;
		this.graveyard = undefined;
	}
}

/** The retainer equivalent of ElementValue */
type RetainerChild<TNode> = Retainer<TNode> | string | undefined;

/**
 * Finds the value of the element according to its type.
 *
 * @returns The value of the element.
 */
function getValue<TNode>(ret: Retainer<TNode>): ElementValue<TNode> {
	if (typeof ret.fallback !== "undefined") {
		return typeof ret.fallback === "object"
			? getValue(ret.fallback)
			: ret.fallback;
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
	const values: Array<ElementValue<TNode>> = [];
	for (let i = 0, children = wrap(ret.children); i < children.length; i++) {
		const child = children[i];
		if (child) {
			values.push(typeof child === "string" ? child : getValue(child));
		}
	}

	const values1 = normalize(values);
	return values1;
}

/**
 * An interface which describes the adapter used by Renderer subclasses to
 * adapt the rendering process for a specific target environment.
 */
export interface RenderAdapter<
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
	 * @returns A string to be passed to arrange.
	 *
	 * Rather than returning Text nodes as we would in the DOM case, for example,
	 * we delay that step for Renderer.prototype.arrange. We do this so that
	 * adjacent strings can be concatenated, and the actual element tree can be
	 * rendered in normalized form.
	 */
	text(
		text: string,
		scope: TScope | undefined,
		hydration: Array<TNode | string> | undefined,
	): string;

	/**
	 * Called for each Raw element whose value prop is a string.
	 *
	 * @param text - The string child.
	 * @param scope - The current scope.
	 *
	 * @returns The parsed node or string.
	 */
	raw(
		value: string | TNode,
		scope: TScope | undefined,
		hydration: Array<TNode | string> | undefined,
	): ElementValue<TNode>;

	patch<TTag extends string | symbol, TName extends string>(
		tag: TTag,
		node: TNode,
		name: TName,
		value: unknown,
		oldValue: unknown,
		scope: TScope,
	): unknown;

	arrange<TTag extends string | symbol>(
		tag: TTag,
		node: TNode,
		props: Record<string, unknown>,
		children: Array<TNode | string>,
		oldProps: Record<string, unknown> | undefined,
	): unknown;

	dispose<TTag extends string | symbol>(
		tag: TTag,
		node: TNode,
		props: Record<string, unknown>,
	): unknown;

	finalize(root: TRoot): unknown;

	reconcile<TTag extends string | symbol>(
		node: TNode,
		tag: TTag,
		props: TagProps<TTag>,
		scope: TScope | undefined,
	): Array<TNode | string> | undefined;
}

const defaultAdapter: RenderAdapter<any, any, any, any> = {
	create() {
		throw new Error("adapter must implement create");
	},
	scope: IDENTITY,
	read: IDENTITY,
	text: IDENTITY,
	raw: IDENTITY,
	patch: NOOP,
	arrange: NOOP,
	dispose: NOOP,
	finalize: NOOP,
	reconcile() {
		throw new Error("adapter must implement reconcile for hydration");
	},
};

/**
 * An abstract class which is subclassed to render to different target
 * environments. Subclasses call super() with a custom RenderAdapter object.
 * This class is responsible for kicking off the rendering process and caching
 * previous trees by root.
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
	declare adapter: RenderAdapter<TNode, TScope, TRoot, TResult>;
	constructor(adapter: Partial<RenderAdapter<TNode, TScope, TRoot, TResult>>) {
		this.cache = new WeakMap();
		this.adapter = {...defaultAdapter, ...adapter};
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
		const ctx =
			bridge &&
			(bridge[_ContextState] as ContextState<TNode, TScope, TRoot, TResult>);
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
			ret.el = createElement(Portal, {children, root});
			oldProps = ret.oldProps;
			if (typeof root === "object" && root !== null && children == null) {
				this.cache.delete(root);
			}
		}

		const adapter = this.adapter;
		const scope = adapter.scope(undefined, Portal, ret.el.props);
		const diff = diffChildren(adapter, root, ret, ctx, scope, ret, children);
		if (isPromiseLike(diff)) {
			return diff.then(() =>
				commitRootRender(adapter, root, ret!, ctx, oldProps, scope),
			);
		}

		return commitRootRender(adapter, root, ret!, ctx, oldProps, scope);
	}

	hydrate(
		children: Children,
		root: TRoot,
		bridge?: Context | undefined,
	): Promise<TResult> | TResult {
		let ret: Retainer<TNode> | undefined;
		const ctx =
			bridge &&
			(bridge[_ContextState] as ContextState<TNode, TScope, TRoot, TResult>);
		if (typeof root === "object" && root !== null) {
			ret = this.cache.get(root);
		}

		// If there is already a retainer for the root, hydration is not necessary.
		if (ret !== undefined) {
			return this.render(children, root, bridge);
		}

		ret = new Retainer(createElement(Portal, {children, root}));
		ret.value = root;
		ret.ctx = ctx;
		if (typeof root === "object" && root !== null && children != null) {
			this.cache.set(root, ret);
		}

		const adapter = this.adapter;
		const scope = adapter.scope(undefined, Portal, ret.el.props);

		// Start the diffing process
		const diff = diffChildren(adapter, root, ret, ctx, scope, ret, children);

		if (isPromiseLike(diff)) {
			return diff.then(() => {
				// Get hydration data for the portal/root element
				// This provides the initial DOM children that need to be hydrated
				const hydration = adapter.reconcile(root, Portal, ret.el.props, scope);
				return commitRootRender(
					adapter,
					root,
					ret!,
					ctx,
					undefined, // no oldProps for hydration
					scope,
					hydration,
				);
			});
		}

		const hydration = adapter.reconcile(root, Portal, ret.el.props, scope);
		return commitRootRender(
			adapter,
			root,
			ret!,
			ctx,
			ret.oldProps,
			scope,
			hydration,
		);
	}
}

/*** PRIVATE RENDERER FUNCTIONS ***/
function diffChildren<TNode, TScope, TRoot extends TNode, TResult>(
	adapter: RenderAdapter<TNode, TScope, TRoot, TResult>,
	root: TRoot | undefined,
	host: Retainer<TNode>,
	ctx: ContextState<TNode, TScope, TRoot, TResult> | undefined,
	scope: TScope | undefined,
	parent: Retainer<TNode>,
	newChildren: Children,
): Promise<undefined> | undefined {
	const oldRetained = wrap(parent.children);
	const newRetained: typeof oldRetained = [];
	const newChildren1 = arrayify(newChildren);
	const diffs: Array<Promise<undefined> | undefined> = [];
	let childrenByKey: Map<Key, Retainer<TNode>> | undefined;
	let seenKeys: Set<Key> | undefined;
	let isAsync = false;
	let oi = 0;
	let oldLength = oldRetained.length;
	for (let ni = 0, newLength = newChildren1.length; ni < newLength; ni++) {
		// length checks to prevent index out of bounds deoptimizations.
		let ret = oi >= oldLength ? undefined : oldRetained[oi];
		let child = narrow(newChildren1[ni]);
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

		let diff: Promise<undefined> | undefined = undefined;
		if (typeof child === "object") {
			let childCopied = false;
			if (child.tag === Copy) {
				childCopied = true;
			} else if (typeof ret === "object" && ret.el === child) {
				childCopied = true;
			} else {
				if (typeof ret === "object" && ret.el.tag === child.tag) {
					if (
						typeof ret.el.tag === "string" ||
						typeof ret.el.tag === "symbol"
					) {
						ret.oldProps = ret.el.props;
					}
					ret.el = child;
					if (child.copy) {
						childCopied = true;
					}
				} else {
					let graveyard: Array<Retainer<TNode>> | undefined;
					if (typeof ret === "object") {
						(parent.graveyard = parent.graveyard || []).push(ret);
					}

					const fallback = ret;
					ret = new Retainer<TNode>(child);
					ret.fallback = fallback;
					ret.graveyard = graveyard;
				}

				if (child.copy && getFlag(ret, HasCommitted)) {
					// pass
				} else if (child.tag === Raw) {
					// pass
				} else if (child.tag === Fragment) {
					diff = diffChildren(
						adapter,
						root,
						host,
						ctx,
						scope,
						ret,
						ret.el.props.children as Children,
					);
				} else if (typeof child.tag === "function") {
					diff = diffComponent(adapter, root, host, ctx, scope, ret);
				} else {
					// host element or portal element
					diff = diffHost(adapter, root, ctx, scope, ret);
				}
			}

			if (typeof ret === "object") {
				if (childCopied) {
					diff = getInflight(ret);
					setFlag(ret, IsCopied);
				} else {
					setFlag(ret, HasCommitted, false);
				}
			}

			if (isPromiseLike(diff)) {
				isAsync = true;
			}
		} else {
			// child is a string or undefined
			if (typeof ret === "object") {
				(parent.graveyard = parent.graveyard || []).push(ret);
			}

			if (typeof child === "string") {
				ret = child;
			} else {
				ret = undefined;
			}
		}

		diffs[ni] = diff;
		newRetained[ni] = ret;
	}

	// cleanup remaining retainers
	for (; oi < oldLength; oi++) {
		const ret = oldRetained[oi];
		if (
			typeof ret === "object" &&
			(typeof ret.el.key === "undefined" ||
				!seenKeys ||
				!seenKeys.has(ret.el.key))
		) {
			(parent.graveyard = parent.graveyard || []).push(ret);
		}
	}

	if (childrenByKey !== undefined && childrenByKey.size > 0) {
		(parent.graveyard = parent.graveyard || []).push(...childrenByKey.values());
	}

	parent.children = unwrap(newRetained);
	if (isAsync) {
		let diffs1 = Promise.all(diffs)
			.then(() => undefined)
			.finally(() => {
				parent.fallback = undefined;
			});

		let onNextDiffs!: Function;
		parent.pending = diffs1 = Promise.race([
			diffs1,
			new Promise<any>((resolve) => (onNextDiffs = resolve)),
		]);

		if (parent.onNext) {
			parent.onNext(diffs1);
		}

		parent.onNext = onNextDiffs;
		return diffs1;
	} else {
		parent.fallback = undefined;
		if (parent.onNext) {
			parent.onNext(diffs);
			parent.onNext = undefined;
		}

		parent.pending = undefined;
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

function getInflight(child: Retainer<unknown>): Promise<undefined> | undefined {
	if (typeof child !== "object") {
		return;
	}

	const ctx: ContextState<unknown> | undefined = child.ctx;
	if (ctx && getFlag(ctx, IsUpdating) && ctx.inflightDiff) {
		return ctx.inflightDiff;
	} else if (child.pending) {
		return child.pending;
	}

	return undefined;
}

function diffHost<TNode, TScope, TRoot extends TNode>(
	adapter: RenderAdapter<TNode, TScope, TRoot, unknown>,
	root: TRoot | undefined,
	ctx: ContextState<TNode, TScope, TRoot> | undefined,
	scope: TScope | undefined,
	ret: Retainer<TNode>,
): Promise<undefined> | undefined {
	const el = ret.el;
	const tag = el.tag as string | symbol;
	if (el.tag === Portal) {
		root = ret.value = el.props.root as any;
	}

	scope = adapter.scope(scope, tag, el.props);

	return diffChildren(
		adapter,
		root,
		ret,
		ctx,
		scope,
		ret,
		ret.el.props.children as any,
	);
}

function flush<TRoot>(
	adapter: RenderAdapter<unknown, unknown, TRoot>,
	root: TRoot,
	initiator?: ContextState,
) {
	adapter.finalize(root);
	if (typeof root !== "object" || root === null) {
		return;
	}

	const flushMap = flushMaps.get(root as any);
	if (flushMap) {
		if (initiator) {
			const flushMap1 = new Map<ContextState, Set<Function>>();
			for (let [ctx, callbacks] of flushMap) {
				if (!parentCtxContains(initiator, ctx)) {
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
			const value = adapter.read(getValue(ctx.ret));
			for (const callback of callbacks) {
				callback(value);
			}
		}
	}
}

// TODO: move this below commit functions
function unmount<TNode, TScope, TRoot extends TNode, TResult>(
	adapter: RenderAdapter<TNode, TScope, TRoot, TResult>,
	host: Retainer<TNode>,
	ctx: ContextState<TNode, TScope, TRoot, TResult> | undefined,
	ret: Retainer<TNode>,
): void {
	if (typeof ret.el.tag === "function") {
		ctx = ret.ctx as ContextState<TNode, TScope, TRoot, TResult>;
		unmountComponent(ctx);
	} else if (ret.el.tag === Portal) {
		adapter.arrange(Portal, ret.value as TNode, ret.el.props, [], ret.el.props);
		flush(adapter, ret.value);
		host = ret;
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

		adapter.dispose(ret.el.tag, ret.value as TNode, ret.el.props);
		host = ret;
	}

	if (ret.graveyard) {
		for (let i = 0; i < ret.graveyard.length; i++) {
			const child = ret.graveyard[i];
			unmount(adapter, host, ctx, child);
		}

		ret.graveyard = undefined;
	}

	for (let i = 0, children = wrap(ret.children); i < children.length; i++) {
		const child = children[i];
		if (typeof child === "object") {
			unmount(adapter, host, ctx, child);
		}
	}
}

function commitRootRender<TNode, TRoot extends TNode, TScope, TResult>(
	adapter: RenderAdapter<TNode, TScope, TRoot, TResult>,
	root: TRoot | undefined,
	ret: Retainer<TNode>,
	ctx: ContextState<TNode, TScope, TRoot, TResult> | undefined,
	oldProps: Record<string, any> | undefined,
	scope: TScope,
	hydration?: Array<TNode | string>,
): TResult {
	const childValues = commitChildren(
		adapter,
		root,
		ret,
		ctx,
		scope,
		ret,
		hydration,
	);
	if (root == null) {
		unmount(adapter, ret, ctx, ret);
	} else {
		// element is a host or portal element
		adapter.arrange(Portal, root, ret.el.props, childValues, oldProps);
	}

	flush(adapter, root);
	setFlag(ret, HasCommitted);
	return adapter.read(unwrap(childValues));
}

function commitChildren<TNode, TRoot extends TNode, TScope, TResult>(
	adapter: RenderAdapter<TNode, unknown, TRoot, TResult>,
	root: TRoot | undefined,
	host: Retainer<TNode>,
	ctx: ContextState<TNode, TScope, TRoot, TResult> | undefined,
	scope: TScope | undefined,
	parent: Retainer<TNode>,
	hydration?: Array<TNode | string>,
): Array<TNode | string> {
	const values: Array<ElementValue<TNode>> = [];
	for (
		let i = 0, children = normalize(wrap(parent.children));
		i < children.length;
		i++
	) {
		let child = children[i];
		while (typeof child === "object" && child.fallback) {
			child = child.fallback;
		}

		if (typeof child === "object") {
			const el = child.el;
			if (el.tag === Raw) {
				values.push(commitRaw(adapter, child, scope, hydration));
			} else if (child.ctx) {
				values.push(commitComponent(child.ctx, hydration));
			} else if (el.tag === Fragment) {
				values.push(
					commitChildren(adapter, root, host, ctx, scope, child, hydration),
				);
			} else {
				// host element or portal element
				values.push(commitHost(adapter, root, child, ctx, scope, hydration));
			}

			child.oldProps = undefined;
			setFlag(child, HasCommitted);
		} else if (typeof child === "string") {
			const text = adapter.text(child, scope, hydration);
			values.push(text);
		}
	}

	if (parent.graveyard) {
		for (let i = 0; i < parent.graveyard.length; i++) {
			const ret = parent.graveyard[i];
			unmount(adapter, host, ctx, ret);
		}
		parent.graveyard = undefined;
	}

	// TODO: why are we running normalize on both ends?
	return normalize(values);
}

function commitRaw<TNode, TScope>(
	adapter: RenderAdapter<TNode, TScope, TNode, unknown>,
	ret: Retainer<TNode>,
	scope: TScope | undefined,
	hydration: Array<TNode | string> | undefined,
): ElementValue<TNode> {
	if (!ret.oldProps || ret.oldProps.value !== ret.el.props.value) {
		ret.value = adapter.raw(ret.el.props.value as any, scope, hydration);
		if (typeof ret.el.ref === "function") {
			ret.el.ref(adapter.read(ret.value));
		}
	}

	setFlag(ret, HasCommitted);
	return ret.value;
}

function commitHost<TNode, TRoot extends TNode, TScope>(
	adapter: RenderAdapter<TNode, TScope, TRoot, unknown>,
	root: TNode | undefined,
	ret: Retainer<TNode>,
	ctx: ContextState<TNode, TScope, TRoot, unknown> | undefined,
	scope: TScope,
	hydration: Array<TNode | string> | undefined,
): ElementValue<TNode> {
	if (getFlag(ret, HasCommitted) && getFlag(ret, IsCopied)) {
		return getValue(ret);
	}

	const tag = ret.el.tag as string | symbol;
	let value = ret.value as TNode;
	let props = ret.el.props;
	const oldProps = ret.oldProps;
	scope = adapter.scope(scope, tag, props)!;

	let childHydration: Array<TNode | string> | undefined;
	if (!value && hydration && hydration.length > 0) {
		const nextChild = hydration.shift();
		if (nextChild && typeof nextChild !== "string") {
			childHydration = adapter.reconcile(nextChild, tag, props, scope);
			if (childHydration) {
				value = ret.value = nextChild as TNode;
			}
		}
	}

	const childValues = commitChildren(
		adapter,
		root,
		ret,
		ctx,
		scope,
		ret,
		childHydration,
	);
	let copiedProps: Set<string> | undefined;
	if (tag !== Portal) {
		// This assumes that .create does not return nullish values.
		if (value == null) {
			value = ret.value = adapter.create(tag, props, scope);
			if (typeof ret.el.ref === "function") {
				ret.el.ref(adapter.read(value));
			}
		}

		for (const propName in {...oldProps, ...props}) {
			const propValue = props[propName];
			// Currently, the Copy tag doubles as a way to skip the patching of a
			// prop.
			// <div class={initial ? "class-name" : Copy}>
			//   class prop will not be patched when re-rendered.</div>
			// </div>
			// TODO: Should this feature be removed?
			if (propValue === Copy) {
				(copiedProps = copiedProps || new Set()).add(propName);
			} else if (!SPECIAL_PROPS.has(propName)) {
				adapter.patch(
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

	if (copiedProps) {
		props = {...ret.el.props};
		for (const name of copiedProps) {
			props[name] = oldProps && oldProps[name];
		}

		ret.oldProps = props;
	} else {
		ret.oldProps = ret.el.props;
	}

	adapter.arrange(tag, value, props, childValues, oldProps);
	setFlag(ret, HasCommitted);
	if (tag === Portal) {
		flush(adapter, ret.value);
		// Portal elements
		return;
	}

	return getValue(ret);
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
 * A flag which is true when the component is in a for...of loop.
 */
const IsInForOfLoop = 1 << 2;

/**
 * A flag which is true when the component is in a for await...of loop.
 */
const IsInForAwaitOfLoop = 1 << 3;

/**
 * A flag which is true when the component starts the render loop but has not
 * yielded yet.
 *
 * Used to make sure that components yield at least once per loop.
 */
const NeedsToYield = 1 << 4;

/**
 * A flag used by async generator components in conjunction with the
 * onPropsProvided callback to mark whether new props can be pulled via the
 * context async iterator. See the Symbol.asyncIterator method and the
 * resumeCtxIterator function.
 */
const PropsAvailable = 1 << 5;

/**
 * A flag which is set when a component errors.
 */
// TODO: Is this still true?
// This is mainly used to prevent some false positives in "component yields or
// returns undefined" warnings. The reason we’re using this versus IsUnmounted
// is a very troubling test (cascades sync generator parent and sync generator
// child) where synchronous code causes a stack overflow error in a
// non-deterministic way. Deeply disturbing stuff.
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

/**
 * A flag which is set when the component is currently refreshing.
 */
const IsRefreshing = 1 << 12;

export interface Context extends Crank.Context {}

/**
 * An interface which can be extended to provide strongly typed provisions.
 * See Context.prototype.consume and Context.prototype.provide.
 */
export interface ProvisionMap extends Crank.ProvisionMap {}

const provisionMaps = new WeakMap<ContextState, Map<unknown, unknown>>();

const scheduleMap = new WeakMap<ContextState, Set<Function>>();

const cleanupMap = new WeakMap<ContextState, Set<Function>>();

// keys are roots
const flushMaps = new WeakMap<object, Map<ContextState, Set<Function>>>();

// TODO: allow ContextState to be initialized for testing purposes
/**
 * @internal
 * The internal class which holds context data.
 */
class ContextState<
	TNode = unknown,
	TScope = unknown,
	TRoot extends TNode = TNode,
	TResult = unknown,
> {
	/** A bitmask. See CONTEXT FLAGS above. */
	declare f: number;

	/** The actual context associated with this state. */
	declare ctx: Context<unknown, TResult>;

	/** The adapter of the renderer which created this context. */
	declare adapter: RenderAdapter<TNode, TScope, TRoot, TResult>;

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

	/** The parent context state. */
	declare parent: ContextState<TNode, TScope, TRoot, TResult> | undefined;

	/** The value of the scope at the point of element’s creation. */
	declare scope: TScope | undefined;

	/** The internal node associated with this context. */
	declare ret: Retainer<TNode>;

	/**
	 * Any iterator returned by a component function.
	 *
	 * Existence of this property implies that the component is a generator
	 * component. It is deleted when a component is returned.
	 */
	declare iterator:
		| Iterator<Children, Children | void, unknown>
		| AsyncIterator<Children, Children | void, unknown>
		| undefined;

	// See runComponent() for a description of these properties.
	declare inflightBlock: Promise<undefined> | undefined;
	declare inflightDiff: Promise<any> | undefined;
	declare enqueuedBlock: Promise<undefined> | undefined;
	declare enqueuedDiff: Promise<any> | undefined;

	declare onPropsProvided:
		| ((props: Record<string, any>) => unknown)
		| undefined;
	declare onPropsRequested: Function | undefined;

	constructor(
		adapter: RenderAdapter<TNode, TScope, TRoot, TResult>,
		root: TRoot | undefined,
		host: Retainer<TNode>,
		parent: ContextState<TNode, TScope, TRoot, TResult> | undefined,
		scope: TScope | undefined,
		ret: Retainer<TNode>,
	) {
		this.f = 0;
		this.ctx = new Context(this);
		this.adapter = adapter;
		this.root = root;
		this.host = host;
		this.parent = parent;
		this.scope = scope;
		this.ret = ret;

		this.iterator = undefined;

		this.inflightBlock = undefined;
		this.inflightDiff = undefined;
		this.enqueuedBlock = undefined;
		this.enqueuedDiff = undefined;

		this.onPropsProvided = undefined;
		this.onPropsRequested = undefined;
	}
}

const _ContextState = Symbol.for("crank.ContextState");

type ComponentProps<T> = T extends () => unknown
	? {}
	: T extends (props: infer U) => unknown
		? U
		: T;
/**
 * A class which is instantiated and passed to every component as its this
 * value/second parameter. Contexts form a tree just like elements and all
 * components in the element tree are connected via contexts. Components can
 * use this tree to communicate data upwards via events and downwards via
 * provisions.
 *
 * @template [T=*] - The expected shape of the props passed to the component,
 * or a component function. Used to strongly type the Context iterator methods.
 * @template [TResult=*] - The readable element value type. It is used in
 * places such as the return value of refresh and the argument passed to
 * schedule and cleanup callbacks.
 */
export class Context<T = any, TResult = any> implements EventTarget {
	/**
	 * @internal
	 * DO NOT USE READ THIS PROPERTY.
	 */
	declare [_ContextState]: ContextState<unknown, unknown, unknown, TResult>;

	// TODO: If we could make the constructor function take a nicer value, it
	// would be useful for testing purposes.
	constructor(state: ContextState<unknown, unknown, unknown, TResult>) {
		this[_ContextState] = state;
	}

	/**
	 * The current props of the associated element.
	 */
	get props(): ComponentProps<T> {
		return this[_ContextState].ret.el.props as ComponentProps<T>;
	}

	/**
	 * The current value of the associated element.
	 *
	 * @deprecated
	 */
	get value(): TResult {
		console.warn("Context.value is deprecated.");
		return this[_ContextState].adapter.read(getValue(this[_ContextState].ret));
	}

	*[Symbol.iterator](): Generator<ComponentProps<T>> {
		const ctx = this[_ContextState];
		try {
			setFlag(ctx, IsInForOfLoop);
			while (!getFlag(ctx, IsUnmounted) && !getFlag(ctx, IsErrored)) {
				if (getFlag(ctx, NeedsToYield)) {
					throw new Error("Context iterated twice without a yield");
				} else {
					setFlag(ctx, NeedsToYield);
				}

				yield ctx.ret.el.props as ComponentProps<T>;
			}
		} finally {
			setFlag(ctx, IsInForOfLoop, false);
		}
	}

	async *[Symbol.asyncIterator](): AsyncGenerator<ComponentProps<T>> {
		const ctx = this[_ContextState];
		if (getFlag(ctx, IsSyncGen)) {
			throw new Error("Use for...of in sync generator components");
		}

		setFlag(ctx, IsInForAwaitOfLoop);
		try {
			while (!getFlag(ctx, IsUnmounted) && !getFlag(ctx, IsErrored)) {
				if (getFlag(ctx, NeedsToYield)) {
					throw new Error("Context iterated twice without a yield");
				} else {
					setFlag(ctx, NeedsToYield);
				}

				if (getFlag(ctx, PropsAvailable)) {
					setFlag(ctx, PropsAvailable, false);
					yield ctx.ret.el.props as ComponentProps<T>;
				} else {
					const props = await new Promise(
						(resolve) => (ctx.onPropsProvided = resolve),
					);
					if (getFlag(ctx, IsUnmounted)) {
						break;
					}

					yield props as ComponentProps<T>;
				}

				if (ctx.onPropsRequested) {
					ctx.onPropsRequested();
					ctx.onPropsRequested = undefined;
				}
			}
		} finally {
			setFlag(ctx, IsInForAwaitOfLoop, false);
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
		const ctx = this[_ContextState];
		if (getFlag(ctx, IsUnmounted)) {
			console.error("Component is unmounted");
			// TODO: should we return the last value?
			return ctx.adapter.read(undefined);
		} else if (getFlag(ctx, IsSyncExecuting)) {
			console.error("Component is already executing");
			return ctx.adapter.read(getValue(ctx.ret));
		}

		let diff: Promise<undefined> | undefined;
		try {
			setFlag(ctx, IsRefreshing);
			diff = enqueueComponent(ctx);
			if (isPromiseLike(diff)) {
				return diff
					.then(() => ctx.adapter.read(commitComponent(ctx)))
					.catch((err) => {
						const diff = propagateError(ctx, err);
						if (diff) {
							return diff.then(() => ctx.adapter.read(getValue(ctx.ret)));
						}

						return ctx.adapter.read(getValue(ctx.ret));
					})
					.finally(() => setFlag(ctx, IsRefreshing, false));
			}

			return ctx.adapter.read(commitComponent(ctx));
		} catch (err) {
			const diff = propagateError(ctx, err);
			if (diff) {
				return diff.then(() => ctx.adapter.read(getValue(ctx.ret)));
			}

			return ctx.adapter.read(getValue(ctx.ret));
		} finally {
			if (!isPromiseLike(diff)) {
				setFlag(ctx, IsRefreshing, false);
			}
		}
	}

	/**
	 * Registers a callback which fires when the component commits. Will only
	 * fire once per callback and update.
	 */
	schedule(callback: (value: TResult) => unknown): void {
		const ctx = this[_ContextState];
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
		const ctx = this[_ContextState];
		if (typeof ctx.root !== "object" || ctx.root === null) {
			return;
		}

		let flushMap = flushMaps.get(ctx.root);
		if (!flushMap) {
			flushMap = new Map<ContextState, Set<Function>>();
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
		const ctx = this[_ContextState];

		if (getFlag(ctx, IsUnmounted)) {
			const value = ctx.adapter.read(getValue(ctx.ret));
			callback(value);
			return;
		}

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
			let ctx = this[_ContextState].parent;
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
		const ctx = this[_ContextState];
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
		const ctx = this[_ContextState];
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
		const ctx = this[_ContextState];
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
		const ctx = this[_ContextState];
		const path: Array<ContextState> = [];
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
		setEventProperty(ev, "target", ctx.ctx);

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
					setEventProperty(ev, "currentTarget", target.ctx);
					for (const record of listeners) {
						if (record.type === ev.type && record.options.capture) {
							try {
								record.callback.call(target.ctx, ev);
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
				setEventProperty(ev, "currentTarget", ctx.ctx);

				// dispatchEvent calls the prop callback if it exists
				let propCallback = ctx.ret.el.props["on" + ev.type] as unknown;
				if (typeof propCallback === "function") {
					propCallback(ev);
					if (immediateCancelBubble || ev.cancelBubble) {
						return true;
					}
				} else {
					// Checks for camel-cased event props
					for (const propName in ctx.ret.el.props) {
						if (propName.toLowerCase() === "on" + ev.type.toLowerCase()) {
							propCallback = ctx.ret.el.props[propName] as unknown;
							if (typeof propCallback === "function") {
								propCallback(ev);
								if (immediateCancelBubble || ev.cancelBubble) {
									return true;
								}
							}
						}
					}
				}

				const listeners = listenersMap.get(ctx);
				if (listeners) {
					for (const record of listeners) {
						if (record.type === ev.type) {
							try {
								record.callback.call(ctx.ctx, ev);
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
						setEventProperty(ev, "currentTarget", target.ctx);
						for (const record of listeners) {
							if (record.type === ev.type && !record.options.capture) {
								try {
									record.callback.call(target.ctx, ev);
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

function parentCtxContains(parent: ContextState, child: ContextState): boolean {
	for (
		let current: ContextState | undefined = child;
		current !== undefined;
		current = current.parent
	) {
		if (current === parent) {
			return true;
		}
	}

	return false;
}

function diffComponent<TNode, TScope, TRoot extends TNode, TResult>(
	adapter: RenderAdapter<TNode, TScope, TRoot, TResult>,
	root: TRoot | undefined,
	host: Retainer<TNode>,
	parent: ContextState<TNode, TScope, TRoot, TResult> | undefined,
	scope: TScope | undefined,
	ret: Retainer<TNode>,
): Promise<undefined> | undefined {
	let ctx: ContextState<TNode, TScope, TRoot, TResult>;
	if (ret.ctx) {
		ctx = ret.ctx as ContextState<TNode, TScope, TRoot, TResult>;
		if (getFlag(ctx, IsSyncExecuting)) {
			console.error("Component is already executing");
			return;
		}
	} else {
		ctx = ret.ctx = new ContextState(adapter, root, host, parent, scope, ret);
	}

	setFlag(ctx, IsUpdating);
	return enqueueComponent(ctx);
}

function diffComponentChildren<TNode, TResult>(
	ctx: ContextState<TNode, unknown, TNode, TResult>,
	children: Children,
): Promise<undefined> | undefined {
	if (getFlag(ctx, IsUnmounted)) {
		return;
	} else if (getFlag(ctx, IsErrored)) {
		// This branch is necessary for some race conditions where this function is
		// called after iterator.throw() in async generator components.
		return;
	} else if (children === undefined) {
		console.error(
			"A component has returned or yielded undefined. If this was intentional, return or yield null instead.",
		);
	}

	let diff: Promise<undefined> | undefined;
	try {
		// We set the isExecuting flag in case a child component dispatches an event
		// which bubbles to this component and causes a synchronous refresh().
		setFlag(ctx, IsSyncExecuting);
		diff = diffChildren(
			ctx.adapter,
			ctx.root,
			ctx.host,
			ctx,
			ctx.scope,
			ctx.ret,
			narrow(children),
		);
		if (diff) {
			diff = diff.catch((err) => handleChildError(ctx, err));
		}
	} catch (err) {
		diff = handleChildError(ctx, err);
	} finally {
		setFlag(ctx, IsSyncExecuting, false);
	}

	return diff;
}

// TODO: move this below
function commitComponent<TNode>(
	ctx: ContextState<TNode, unknown, TNode>,
	hydration?: Array<TNode | string>,
): ElementValue<TNode> {
	const values = commitChildren(
		ctx.adapter,
		ctx.root,
		ctx.host,
		ctx,
		ctx.scope,
		ctx.ret,
		hydration,
	);

	if (getFlag(ctx, IsUnmounted)) {
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

	if (getFlag(ctx, IsScheduling)) {
		setFlag(ctx, IsSchedulingRefresh);
	} else if (!getFlag(ctx, IsUpdating)) {
		// If we’re not updating the component, which happens when components are
		// refreshed, or when async generator components iterate, we have to do a
		// little bit housekeeping when a component’s child values have changed.
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
		const hostValues = getChildValues(host);
		ctx.adapter.arrange(
			host.el.tag as string | symbol,
			host.value as TNode,
			host.el.props,
			hostValues,
			// oldProps is the same as props the same because the host hasn't updated.
			host.el.props,
		);

		flush(ctx.adapter, ctx.root, ctx);
	}

	const callbacks = scheduleMap.get(ctx);
	let value = unwrap(values);
	if (callbacks) {
		scheduleMap.delete(ctx);
		setFlag(ctx, IsScheduling);
		const result = ctx.adapter.read(value);
		for (const callback of callbacks) {
			callback(result);
		}

		setFlag(ctx, IsScheduling, false);
		// Handles an edge case where refresh() is called during a schedule().
		if (getFlag(ctx, IsSchedulingRefresh)) {
			setFlag(ctx, IsSchedulingRefresh, false);
			value = getValue(ctx.ret);
		}
	}

	setFlag(ctx, IsUpdating, false);
	setFlag(ctx.ret, HasCommitted);
	return value;
}

/** Enqueues and executes the component associated with the context. */
function enqueueComponent<TNode, TResult>(
	ctx: ContextState<TNode, unknown, TNode, TResult>,
): Promise<undefined> | undefined {
	// This branch will run for non-initial renders of async generator
	// components when they are not in for...of loops. When in a for...of loop,
	// async generator components will behave like sync generator components.
	if (getFlag(ctx, IsAsyncGen) && !getFlag(ctx, IsInForOfLoop)) {
		// If the component is waiting at the bottom of the loop, this means that
		// the next value produced by the component will have the most up to date
		// props, so we can return the current inflight value. Otherwise, we have
		// to wait for the bottom of the loop to be reached before returning the
		// inflight value.
		//
		// if ctx.onPropsProvided is defined, it means the component is suspended
		// and waiting for new props, so it is not at the bottom of the loop.
		// This condition must be read before resumePropsAsyncIterator is called
		const isAtLoopBottom =
			getFlag(ctx, IsInForAwaitOfLoop) && !ctx.onPropsProvided;
		resumePropsAsyncIterator(ctx);
		if (isAtLoopBottom) {
			if (ctx.inflightBlock == null) {
				ctx.inflightBlock = new Promise(
					(resolve) => (ctx.onPropsRequested = resolve),
				);
			}

			return ctx.inflightBlock.finally(() => {
				ctx.inflightBlock = undefined;
				return ctx.inflightDiff;
			});
		}

		return ctx.inflightDiff;
	} else if (!ctx.inflightBlock) {
		const [block, value] = runComponent<TNode, TResult>(ctx);
		if (block) {
			ctx.inflightBlock = block.finally(() => advanceComponent(ctx));
			// stepComponent will only return a block if the value is asynchronous
			ctx.inflightDiff = value;
		}

		return value;
	} else if (!ctx.enqueuedBlock) {
		// The enqueuedBlock and enqueuedDiff properties must be set
		// simultaneously, hence the usage of the Promise constructor.
		let resolve: Function;
		ctx.enqueuedBlock = new Promise<undefined>(
			(resolve1) => (resolve = resolve1),
		).finally(() => advanceComponent(ctx));
		ctx.enqueuedDiff = ctx.inflightBlock.finally(() => {
			const [block, value] = runComponent<TNode, TResult>(ctx);
			resolve(block);
			return value;
		});
	}

	return ctx.enqueuedDiff;
}

/** Called when the inflight block promise settles. */
function advanceComponent(ctx: ContextState): void {
	[ctx.inflightBlock, ctx.inflightDiff] = [ctx.enqueuedBlock, ctx.enqueuedDiff];
	[ctx.enqueuedBlock, ctx.enqueuedDiff] = [undefined, undefined];
}

/**
 * This function is responsible for executing the component and handling all
 * the different component types. We cannot identify whether a component is a
 * generator or async without calling it and inspecting the return value.
 *
 * @returns {[block, diff]} A tuple where
 * - block is a promise or undefined which represents the duration during which
 *   the component component will enqueue further updates.
 * - diff is a promise or undefined which settles when all children have
 *   diffed.
 *
 * Each component type will block according to the type of the component.
 * - Sync function components never block and will transparently pass updates
 * to children.
 * - Async function components and async generator components block while
 * executing itself, but will not block for async children.
 * - Sync generator components block while any children are executing, because
 * they are expected to only resume when they’ve actually rendered.
 * - Async generator components block depending on what kind of props iterator
 *   they use:
 *   - for...of loops behave like sync generator components, blocking
 *     while the component or its children are executing
 *   - for await...of loops block while new props have yet been requested
 *   - async generator components not using a props iterator block while
 *     executing
 */
function runComponent<TNode, TResult>(
	ctx: ContextState<TNode, unknown, TNode, TResult>,
): [Promise<undefined> | undefined, Promise<undefined> | undefined] {
	const ret = ctx.ret;
	const initial = !ctx.iterator;
	if (initial) {
		resumePropsAsyncIterator(ctx);
		setFlag(ctx, IsSyncExecuting);
		clearEventListeners(ctx);
		let returned: ReturnType<Component>;
		try {
			returned = (ret.el.tag as Component).call(ctx.ctx, ret.el.props, ctx.ctx);
		} catch (err) {
			setFlag(ctx, IsErrored);
			throw err;
		} finally {
			setFlag(ctx, IsSyncExecuting, false);
		}

		if (isIteratorLike(returned)) {
			ctx.iterator = returned;
		} else if (!isPromiseLike(returned)) {
			// sync function component
			return [undefined, diffComponentChildren<TNode, TResult>(ctx, returned)];
		} else {
			// async function component
			const returned1 =
				returned instanceof Promise ? returned : Promise.resolve(returned);
			return [
				returned1.catch(NOOP),
				returned1.then(
					(returned) => diffComponentChildren<TNode, TResult>(ctx, returned),
					(err) => {
						setFlag(ctx, IsErrored);
						throw err;
					},
				),
			];
		}
	}

	let iteration!: Promise<ChildrenIteratorResult> | ChildrenIteratorResult;
	if (initial) {
		try {
			setFlag(ctx, IsSyncExecuting);
			iteration = ctx.iterator!.next();
		} catch (err) {
			setFlag(ctx, IsErrored);
			throw err;
		} finally {
			setFlag(ctx, IsSyncExecuting, false);
		}

		if (isPromiseLike(iteration)) {
			setFlag(ctx, IsAsyncGen);
		} else {
			setFlag(ctx, IsSyncGen);
		}
	}

	if (getFlag(ctx, IsSyncGen)) {
		// sync generator component
		if (!initial) {
			try {
				setFlag(ctx, IsSyncExecuting);
				iteration = ctx.iterator!.next(ctx.adapter.read(getValue(ret)));
			} catch (err) {
				setFlag(ctx, IsErrored);
				throw err;
			} finally {
				setFlag(ctx, IsSyncExecuting, false);
			}
		}

		if (isPromiseLike(iteration)) {
			throw new Error("Mixed generator component");
		}

		if (
			getFlag(ctx, IsInForOfLoop) &&
			!getFlag(ctx, NeedsToYield) &&
			!getFlag(ctx, IsUnmounted)
		) {
			console.error("Component yielded more than once in for...of loop");
		}

		setFlag(ctx, NeedsToYield, false);
		if (iteration.done) {
			setFlag(ctx, IsSyncGen, false);
			ctx.iterator = undefined;
		}

		const diff = diffComponentChildren<TNode, TResult>(
			ctx,
			iteration.value as Children,
		);
		const block = isPromiseLike(diff) ? diff.catch(NOOP) : undefined;
		return [block, diff];
	} else {
		if (getFlag(ctx, IsInForOfLoop)) {
			// Async generator component using for...of loops behave similar to sync
			// generator components. This allows for easier refactoring of sync to
			// async generator components.
			if (!initial) {
				try {
					setFlag(ctx, IsSyncExecuting);
					iteration = ctx.iterator!.next(ctx.adapter.read(getValue(ret)));
				} catch (err) {
					setFlag(ctx, IsErrored);
					throw err;
				} finally {
					setFlag(ctx, IsSyncExecuting, false);
				}
			}

			if (!isPromiseLike(iteration)) {
				throw new Error("Mixed generator component");
			}

			const diff = iteration.then(
				(iteration) => {
					if (!getFlag(ctx, IsInForOfLoop)) {
						pullComponent(ctx, Promise.resolve(iteration));
					} else {
						if (!getFlag(ctx, NeedsToYield) && !getFlag(ctx, IsUnmounted)) {
							console.error(
								"Component yielded more than once in for...of loop",
							);
						}
					}

					setFlag(ctx, NeedsToYield, false);
					return diffComponentChildren<TNode, TResult>(
						ctx,
						// Children can be void so we eliminate that here
						iteration.value as Children,
					);
				},
				(err) => {
					setFlag(ctx, IsErrored);
					throw err;
				},
			);

			return [diff.catch(NOOP), diff];
		} else {
			// initializes the async generator loop
			pullComponent(ctx, iteration as Promise<ChildrenIteratorResult>);
			return [ctx.inflightBlock, ctx.inflightDiff];
		}
	}
}

/**
 * The logic for pulling from async generator components when they are not in a
 * for...of loop is implemented here. Because async generator components can
 * have multiple values requested at the same time, it makes sense to group the
 * logic in a single loop to prevent opaque race conditions.
 *
 * @returns {Promise<undefined>} A promise which resolves when the component
 * has been unmounted
 */
async function pullComponent<TNode, TResult>(
	ctx: ContextState<TNode, unknown, TNode, TResult>,
	iterationP: Promise<ChildrenIteratorResult>,
): Promise<undefined> {
	let done = false;
	try {
		while (!done) {
			if (getFlag(ctx, IsInForOfLoop)) {
				break;
			}

			// inflightValue must be set synchronously.
			let resolveInflight!: Function;
			let rejectInflight!: Function;
			ctx.inflightDiff = new Promise(
				(resolve1, reject1) => (
					(resolveInflight = resolve1), (rejectInflight = reject1)
				),
			).then(
				() => {
					if (!getFlag(ctx, IsUpdating) && !getFlag(ctx, IsRefreshing)) {
						commitComponent(ctx);
					}
				},
				(err) => {
					if (
						(!getFlag(ctx, IsUpdating) && !getFlag(ctx, IsRefreshing)) ||
						!getFlag(ctx, NeedsToYield)
					) {
						return propagateError(ctx, err);
					}

					throw err;
				},
			);

			let iteration: ChildrenIteratorResult;
			try {
				iteration = await iterationP;
			} catch (err) {
				done = true;
				setFlag(ctx, IsErrored);
				setFlag(ctx, NeedsToYield, false);
				rejectInflight(err);
				break;
			}

			// this makes sure we pause before entering a loop if we yield before it
			if (!getFlag(ctx, IsInForAwaitOfLoop)) {
				setFlag(ctx, PropsAvailable, false);
			}

			done = !!iteration.done;
			let diff: Promise<undefined> | undefined;
			try {
				if (
					!getFlag(ctx, NeedsToYield) &&
					getFlag(ctx, PropsAvailable) &&
					getFlag(ctx, IsInForAwaitOfLoop)
				) {
					// logic to skip yielded children in a stale for await of iteration.
					diff = undefined;
				} else {
					diff = diffComponentChildren<TNode, TResult>(ctx, iteration.value!);
				}
			} catch (err) {
				rejectInflight(err);
			} finally {
				resolveInflight(diff);
				setFlag(ctx, NeedsToYield, false);
			}

			const oldResult = new Promise((resolve) => ctx.ctx.schedule(resolve));
			if (getFlag(ctx, IsUnmounted)) {
				while (
					(!iteration || !iteration.done) &&
					ctx.iterator &&
					getFlag(ctx, IsInForAwaitOfLoop)
				) {
					try {
						setFlag(ctx, IsSyncExecuting);
						const iterationP = ctx.iterator.next(oldResult);
						iteration = await iterationP;
					} catch (err) {
						setFlag(ctx, IsErrored);
						throw err;
					} finally {
						setFlag(ctx, IsSyncExecuting, false);
					}
				}

				if (
					(!iteration || !iteration.done) &&
					ctx.iterator &&
					typeof ctx.iterator.return === "function"
				) {
					try {
						setFlag(ctx, IsSyncExecuting);
						const iterationP = ctx.iterator.return();
						if (isPromiseLike(iterationP)) {
							if (!getFlag(ctx, IsAsyncGen)) {
								throw new Error("Mixed generator component");
							}

							iteration = await iterationP;
						} else {
							throw new Error("Mixed generator component");
						}
					} catch (err) {
						setFlag(ctx, IsErrored);
						throw err;
					} finally {
						setFlag(ctx, IsSyncExecuting, false);
					}
				}

				break;
			} else if (!done && !getFlag(ctx, IsInForOfLoop)) {
				// get the next value from the iterator
				try {
					setFlag(ctx, IsSyncExecuting);
					iterationP = ctx.iterator!.next(
						oldResult,
					) as Promise<ChildrenIteratorResult>;
				} finally {
					setFlag(ctx, IsSyncExecuting, false);
				}
			}
		}
	} finally {
		if (done) {
			setFlag(ctx, IsAsyncGen, false);
			ctx.iterator = undefined;
		}
	}
}

/** Called to resume the props async iterator for async generator components. */
function resumePropsAsyncIterator(ctx: ContextState): void {
	if (ctx.onPropsProvided) {
		ctx.onPropsProvided(ctx.ret.el.props);
		ctx.onPropsProvided = undefined;
		setFlag(ctx, PropsAvailable, false);
	} else {
		setFlag(ctx, PropsAvailable);
	}
}

// TODO: async unmounting
async function unmountComponent(ctx: ContextState): Promise<undefined> {
	if (getFlag(ctx, IsUnmounted)) {
		return;
	}

	clearEventListeners(ctx);

	const callbacks = cleanupMap.get(ctx);
	if (callbacks) {
		const value = ctx.adapter.read(getValue(ctx.ret));
		cleanupMap.delete(ctx);
		for (const callback of callbacks) {
			callback(value);
		}
	}

	setFlag(ctx, IsUnmounted);
	if (ctx.iterator) {
		if (getFlag(ctx, IsSyncGen) || getFlag(ctx, IsInForOfLoop)) {
			// we wait for the block so yields resume with the most up to date props
			if (ctx.inflightBlock) {
				await ctx.inflightBlock;
			}

			let iteration: ChildrenIteratorResult | undefined;
			if (getFlag(ctx, IsInForOfLoop)) {
				try {
					setFlag(ctx, IsSyncExecuting);
					const value = ctx.adapter.read(getValue(ctx.ret));
					const iterationP = ctx.iterator!.next(value);
					if (isPromiseLike(iterationP)) {
						if (!getFlag(ctx, IsAsyncGen)) {
							throw new Error("Mixed generator component");
						}

						iteration = await iterationP;
					} else {
						if (!getFlag(ctx, IsSyncGen)) {
							throw new Error("Mixed generator component");
						}

						iteration = iterationP;
					}
				} catch (err) {
					setFlag(ctx, IsErrored);
					Promise.reject(err);
				} finally {
					setFlag(ctx, IsSyncExecuting, false);
				}
			}

			if (
				(!iteration || !iteration.done) &&
				ctx.iterator &&
				typeof ctx.iterator.return === "function"
			) {
				try {
					setFlag(ctx, IsSyncExecuting);
					const iterationP = ctx.iterator.return();
					if (isPromiseLike(iterationP)) {
						if (!getFlag(ctx, IsAsyncGen)) {
							throw new Error("Mixed generator component");
						}

						iteration = await iterationP;
					} else {
						if (!getFlag(ctx, IsSyncGen)) {
							throw new Error("Mixed generator component");
						}

						iteration = iterationP;
					}
				} catch (err) {
					setFlag(ctx, IsErrored);
					Promise.reject(err);
				} finally {
					setFlag(ctx, IsSyncExecuting, false);
				}
			}
		} else if (getFlag(ctx, IsAsyncGen)) {
			// We let pullComponent handle unmounting
			resumePropsAsyncIterator(ctx);
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

const listenersMap = new WeakMap<ContextState, Array<EventListenerRecord>>();
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
	ctx: ContextState | undefined,
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

function clearEventListeners(ctx: ContextState): void {
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
	ctx: ContextState<TNode, unknown, TNode>,
	err: unknown,
): Promise<undefined> | undefined {
	if (!ctx.iterator || typeof ctx.iterator.throw !== "function") {
		throw err;
	}

	resumePropsAsyncIterator(ctx);
	let iteration: ChildrenIteratorResult | Promise<ChildrenIteratorResult>;
	try {
		setFlag(ctx, IsSyncExecuting);
		iteration = ctx.iterator.throw(err);
	} catch (err) {
		setFlag(ctx, IsErrored);
		throw err;
	} finally {
		setFlag(ctx, IsSyncExecuting, false);
	}

	if (isPromiseLike(iteration)) {
		return iteration.then(
			(iteration) => {
				if (iteration.done) {
					setFlag(ctx, IsSyncGen, false);
					setFlag(ctx, IsAsyncGen, false);
					ctx.iterator = undefined;
				}

				return diffComponentChildren(ctx, iteration.value as Children);
			},
			(err) => {
				setFlag(ctx, IsErrored);
				throw err;
			},
		);
	}

	if (iteration.done) {
		setFlag(ctx, IsSyncGen, false);
		setFlag(ctx, IsAsyncGen, false);
		ctx.iterator = undefined;
	}

	return diffComponentChildren(ctx, iteration.value as Children);
}

/**
 * Propagates an error up the context tree by calling handleChildError with
 * each parent.
 *
 * @returns A promise which resolves to undefined when the error has been
 * handled, or undefined if the error was handled synchronously.
 */
function propagateError<TNode>(
	ctx: ContextState<TNode>,
	err: unknown,
): Promise<undefined> | undefined {
	const parent = ctx.parent;
	if (!parent) {
		throw err;
	}

	let diff: Promise<undefined> | undefined;
	try {
		diff = handleChildError(parent, err);
	} catch (err) {
		return propagateError(parent, err);
	}

	if (isPromiseLike(diff)) {
		return diff.then(
			() => void commitComponent(parent),
			(err) => propagateError(parent, err),
		);
	}

	commitComponent(parent);
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

		export interface IntrinsicAttributes {
			children?: unknown;
			key?: unknown;
			ref?: unknown;
			copy?: unknown;
		}

		export interface ElementChildrenAttribute {
			children: {};
		}
	}
}

// Some JSX transpilation tools expect these functions to be defined on the
// default export. Prefer named exports when importing directly.
export default {createElement, Fragment};
