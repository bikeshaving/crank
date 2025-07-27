const NOOP = (): undefined => {};

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

function getTagName(tag: Tag): string {
	return typeof tag === "function"
		? tag.name || "Anonymous"
		: typeof tag === "string"
			? tag
			: tag.description || "AnonymousSymbol";
}

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

// TODO: We assert the following symbol tags as Components because TypeScript
// support for symbol tags in JSX doesn’t exist yet.
// https://github.com/microsoft/TypeScript/issues/38367

/**
 * A special tag for rendering into a new root node via a root prop.
 *
 * This tag is useful for creating element trees with multiple roots, for
 * things like modals or tooltips.
 *
 * Renderer.prototype.render() implicitly wraps top-level in a Portal element
 * with the root set to the second argument passed in.
 */
export const Portal = Symbol.for("crank.Portal") as unknown as Component<{
	root?: object;
}> &
	symbol;
export type Portal = typeof Portal;

/**
 * A special tag which preserves whatever was previously rendered in the
 * element’s position.
 *
 * Copy elements are useful for when you want to prevent a subtree from
 * rerendering as a performance optimization. Copy elements can also be keyed,
 * in which case the previously rendered keyed element will be copied.
 */
export const Copy = Symbol.for("crank.Copy") as unknown as Component<{}> &
	symbol;
export type Copy = typeof Copy;

/**
 * A special tag for rendering text nodes.
 *
 * Strings in the element tree are implicitly wrapped in a Text element with
 * value set to the string.
 */
export const Text = Symbol.for("crank.Text") as unknown as Component<{
	value: string;
}>;
export type Text = typeof Text;

/** A special tag for injecting raw nodes or strings via a value prop. */
export const Raw = Symbol.for("crank.Raw") as unknown as Component<{
	value: string | object;
}> &
	symbol;
export type Raw = typeof Raw;

/**
 * A type to keep track of keys. Any value can be a key, though null and
 * undefined are ignored.
 */
type Key = unknown;

type ChildrenIteratorResult = IteratorResult<Children, Children | void>;

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
		throw new TypeError(`Cannot clone non-element: ${String(el)}`);
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
 * For host elements, the value is the node created for the element, e.g. the
 * DOM node in the case of the DOMRenderer.
 *
 * For portals, the value is undefined, because a Portal element’s root and
 * children are opaque to its parent.
 *
 * All of these possible values are reflected in this utility type.
 */
export type ElementValue<TNode> = Array<TNode> | TNode | undefined;

/*** RETAINER FLAGS ***/
const IsMounted = 1 << 0;
const IsCopied = 1 << 1;
const IsUpdating = 1 << 2;
const IsSyncExecuting = 1 << 3;
const IsRefreshing = 1 << 4;
const IsUnmounted = 1 << 5;
// TODO: Is this flag still necessary or can we use IsUnmounted?
const IsErrored = 1 << 6;
// TODO: we might want to use a ctx.componentType to distinguish between the
// four component types.
const IsSyncGen = 1 << 7;
const IsAsyncGen = 1 << 8;
const IsInForOfLoop = 1 << 9;
const IsInForAwaitOfLoop = 1 << 10;
const NeedsToYield = 1 << 11;
const PropsAvailable = 1 << 12;
// TODO: Are these flags still necessary?
const IsScheduling = 1 << 13;
const IsSchedulingRefresh = 1 << 14;

function getFlag(ret: Retainer<unknown>, flag: number): boolean {
	return !!(ret.f & flag);
}

function setFlag(ret: Retainer<unknown>, flag: number, value = true): void {
	if (value) {
		ret.f |= flag;
	} else {
		ret.f &= ~flag;
	}
}

/**
 * @internal
 * The internal nodes which are cached and diffed against new elements when
 * rendering element trees.
 */
class Retainer<TNode, TScope = unknown> {
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
	declare children:
		| Array<Retainer<TNode, TScope> | undefined>
		| Retainer<TNode, TScope>
		| undefined;

	/**
	 * The child which this retainer replaces. This property is used when an
	 * async retainer tree replaces previously rendered elements, so that the
	 * previously rendered elements can remain visible until the async tree
	 * settles.
	 */
	declare fallback: Retainer<TNode, TScope> | undefined;

	/**
	 * The node or nodes associated with an element.
	 *
	 * This is only assigned for host, portal, text and raw elements.
	 *
	 * It can be an array only in the case of Raw elements, because they can
	 * possibly render multiple nodes.
	 */
	declare value: ElementValue<TNode> | undefined;

	declare scope: TScope | undefined;

	declare oldProps: Record<string, any> | undefined;

	declare pending: Promise<undefined> | undefined;

	declare onNext: Function | undefined;

	declare graveyard: Array<Retainer<TNode, TScope>> | undefined;

	declare lingerers: Set<Retainer<TNode, TScope>> | undefined;

	constructor(el: Element) {
		this.f = 0;
		this.el = el;
		this.ctx = undefined;
		this.children = undefined;
		this.fallback = undefined;
		this.value = undefined;
		this.oldProps = undefined;
		this.pending = undefined;
		this.onNext = undefined;
		this.graveyard = undefined;
		this.lingerers = undefined;
	}
}

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
function getChildValues<TNode>(ret: Retainer<TNode>): Array<TNode> {
	const values: Array<TNode> = [];
	for (let i = 0, children = wrap(ret.children); i < children.length; i++) {
		const child = children[i];
		if (child) {
			const value = getValue(child);
			if (Array.isArray(value)) {
				values.push(...value);
			} else if (value) {
				values.push(value);
			}
		}
	}

	if (ret.lingerers) {
		for (const lingerer of ret.lingerers) {
			const value = getValue(lingerer);
			if (Array.isArray(value)) {
				values.push(...value);
			} else if (value) {
				values.push(value);
			}
		}
	}

	return values;
}

function stripSpecialProps(props: Record<string, any>): Record<string, any> {
	let _: unknown;
	let result: Record<string, any>;
	({key: _, ref: _, copy: _, ...result} = props);
	return result;
}

/**
 * Interface for adapting the rendering process to a specific target
 * environment implemented by Renderer subclasses and passed to the Renderer
 * constructor.
 */
export interface RenderAdapter<
	TNode,
	TScope,
	TRoot extends TNode = TNode,
	TResult = ElementValue<TNode>,
> {
	create(data: {
		tag: string | symbol;
		tagName: string;
		props: Record<string, any>;
		scope: TScope | undefined;
	}): TNode;

	adopt(data: {
		tag: string | symbol;
		tagName: string;
		props: Record<string, any>;
		node: TNode;
		scope: TScope | undefined;
	}): Array<TNode> | undefined;

	text(data: {
		value: string;
		scope: TScope | undefined;
		hydration: Array<TNode> | undefined;
		oldNode: TNode | undefined;
	}): TNode;

	scope(data: {
		tag: string | symbol;
		tagName: string;
		props: Record<string, any>;
		scope: TScope | undefined;
	}): TScope | undefined;

	raw(data: {
		value: string | TNode;
		scope: TScope | undefined;
		hydration: Array<TNode> | undefined;
	}): ElementValue<TNode>;

	patch(data: {
		tag: string | symbol;
		tagName: string;
		node: TNode;
		props: Record<string, any>;
		oldProps: Record<string, any> | undefined;
		scope: TScope | undefined;
		isHydrating: boolean;
	}): void;

	arrange(data: {
		tag: string | symbol;
		tagName: string;
		node: TNode;
		props: Record<string, any>;
		children: Array<TNode>;
		oldProps: Record<string, any> | undefined;
	}): void;

	remove(data: {node: TNode; parent: TNode; isNested: boolean}): void;

	read(value: ElementValue<TNode>): TResult;

	finalize(root: TRoot): void;
}

const defaultAdapter: RenderAdapter<any, any, any, any> = {
	create() {
		throw new Error("adapter must implement create");
	},
	adopt() {
		throw new Error("adapter must implement adopt() for hydration");
	},
	scope: ({scope}) => scope,
	read: (value) => value,
	text: ({value}) => value,
	raw: ({value}) => value,
	patch: NOOP,
	arrange: NOOP,
	remove: NOOP,
	finalize: NOOP,
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
	declare cache: WeakMap<object, Retainer<TNode, TScope>>;
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
		let ret: Retainer<TNode, TScope> | undefined;
		const ctx =
			bridge &&
			(bridge[_ContextState] as ContextState<TNode, TScope, TRoot, TResult>);
		if (typeof root === "object" && root !== null) {
			ret = this.cache.get(root);
		}

		const adapter = this.adapter;
		let scope: TScope | undefined;
		if (ret === undefined) {
			ret = new Retainer(createElement(Portal, {children, root}));
			ret.value = root;
			ret.ctx = ctx;
			ret.scope = adapter.scope({
				tag: Portal,
				tagName: getTagName(Portal),
				props: stripSpecialProps(ret.el.props),
				scope: undefined,
			});
			if (typeof root === "object" && root !== null && children != null) {
				this.cache.set(root, ret);
			}
		} else if (ret.ctx !== ctx) {
			throw new Error(
				"A previous call to render() was passed a different context",
			);
		} else {
			ret.el = createElement(Portal, {children, root});
			scope = ret.scope;
			if (typeof root === "object" && root !== null && children == null) {
				this.cache.delete(root);
			}
		}

		const diff = diffChildren(adapter, root, ret, ctx, scope, ret, children);
		if (isPromiseLike(diff)) {
			return diff.then(() => commitRootRender(adapter, root, ret!, ctx, scope));
		}

		return commitRootRender(adapter, root, ret!, ctx, scope);
	}

	hydrate(
		children: Children,
		root: TRoot,
		bridge?: Context | undefined,
	): Promise<TResult> | TResult {
		let ret: Retainer<TNode, TScope> | undefined;
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
		const scope = (ret.scope = adapter.scope({
			tag: Portal,
			tagName: getTagName(Portal),
			props: stripSpecialProps(ret.el.props),
			scope: undefined,
		}));

		// Start the diffing process
		const diff = diffChildren(adapter, root, ret, ctx, scope, ret, children);
		if (isPromiseLike(diff)) {
			return diff.then(() => {
				// Get hydration data for the portal/root element
				// This provides the initial DOM children that need to be hydrated
				const hydration = adapter.adopt({
					tag: Portal,
					tagName: getTagName(Portal),
					props: stripSpecialProps(ret.el.props),
					node: root,
					scope,
				});

				if (hydration) {
					for (let i = 0; i < hydration.length; i++) {
						adapter.remove({
							node: hydration[i],
							parent: root,
							isNested: false,
						});
					}
				}
				return commitRootRender(adapter, root, ret!, ctx, scope, hydration);
			});
		}

		const hydration = adapter.adopt({
			tag: Portal,
			tagName: getTagName(Portal),
			node: root,
			props: stripSpecialProps(ret.el.props),
			scope,
		});

		if (hydration) {
			for (let i = 0; i < hydration.length; i++) {
				adapter.remove({
					node: hydration[i],
					parent: root,
					isNested: false,
				});
			}
		}
		return commitRootRender(adapter, root, ret!, ctx, scope, hydration);
	}
}

/*** PRIVATE RENDERER FUNCTIONS ***/
function diffChildren<TNode, TScope, TRoot extends TNode, TResult>(
	adapter: RenderAdapter<TNode, TScope, TRoot, TResult>,
	root: TRoot | undefined,
	host: Retainer<TNode, TScope>,
	ctx: ContextState<TNode, TScope, TRoot, TResult> | undefined,
	scope: TScope | undefined,
	parent: Retainer<TNode, TScope>,
	newChildren: Children,
): Promise<undefined> | undefined {
	const oldRetained = wrap(parent.children);
	const newRetained: typeof oldRetained = [];
	const newChildren1 = arrayify(newChildren);
	const diffs: Array<Promise<undefined> | undefined> = [];
	let childrenByKey: Map<Key, Retainer<TNode, TScope>> | undefined;
	let seenKeys: Set<Key> | undefined;
	let isAsync = false;
	let oi = 0;
	let oldLength = oldRetained.length;
	let graveyard: Array<Retainer<TNode, TScope>> | undefined;
	for (let ni = 0, newLength = newChildren1.length; ni < newLength; ni++) {
		// length checks to prevent index out of bounds deoptimizations.
		let ret = oi >= oldLength ? undefined : oldRetained[oi];
		let child = narrow(newChildren1[ni]);
		{
			// aligning new children with old retainers
			let oldKey = typeof ret === "object" ? ret.el.props.key : undefined;
			let newKey = typeof child === "object" ? child.props.key : undefined;
			if (newKey !== undefined && seenKeys && seenKeys.has(newKey)) {
				console.error(
					`Duplicate key found in <${getTagName(parent.el.tag)}>`,
					newKey,
				);
				child = cloneElement(child as Element);
				newKey = child.props.key = undefined;
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
						oldKey = typeof ret === "object" ? ret.el.props.key : undefined;
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
			} else if (
				typeof ret === "object" &&
				getFlag(ret, IsMounted) &&
				ret.el === child
			) {
				// If the child is the same as the retained element, we skip
				// re-rendering This is useful when a component is passed the same
				// children, for instance
				childCopied = true;
			} else {
				if (typeof ret === "object" && ret.el.tag === child.tag) {
					ret.el = child;
					if (child.props.copy) {
						childCopied = true;
					}
				} else {
					if (typeof ret === "object") {
						(graveyard = graveyard || []).push(ret);
					}

					const fallback = ret;
					ret = new Retainer<TNode, TScope>(child);
					ret.fallback = fallback;
				}

				if (childCopied && getFlag(ret, IsMounted)) {
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
				}
			}

			if (isPromiseLike(diff)) {
				isAsync = true;
			}
		} else if (typeof child === "string") {
			if (typeof ret === "object" && ret.el.tag === Text) {
				ret.el.props.value = child;
			} else {
				if (typeof ret === "object") {
					(graveyard = graveyard || []).push(ret);
				}

				ret = new Retainer<TNode, TScope>(createElement(Text, {value: child}));
			}
		} else {
			if (typeof ret === "object") {
				(graveyard = graveyard || []).push(ret);
			}

			ret = undefined;
		}

		diffs[ni] = diff;
		newRetained[ni] = ret;
	}

	// cleanup remaining retainers
	for (; oi < oldLength; oi++) {
		const ret = oldRetained[oi];
		if (
			typeof ret === "object" &&
			(typeof ret.el.props.key === "undefined" ||
				!seenKeys ||
				!seenKeys.has(ret.el.props.key))
		) {
			(graveyard = graveyard || []).push(ret);
		}
	}

	if (childrenByKey !== undefined && childrenByKey.size > 0) {
		(graveyard = graveyard || []).push(...childrenByKey.values());
	}

	parent.children = unwrap(newRetained);
	if (isAsync) {
		let diffs1 = Promise.all(diffs)
			.then(() => undefined)
			.finally(() => {
				parent.fallback = undefined;
				if (graveyard) {
					if (parent.graveyard) {
						parent.graveyard.push(...graveyard);
					} else {
						parent.graveyard = graveyard;
					}
				}
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
		if (graveyard) {
			if (parent.graveyard) {
				parent.graveyard.push(...graveyard);
			} else {
				parent.graveyard = graveyard;
			}
		}

		if (parent.onNext) {
			parent.onNext(diffs);
			parent.onNext = undefined;
		}

		parent.pending = undefined;
	}
}

function createChildrenByKey<TNode, TScope>(
	children: Array<Retainer<TNode, TScope> | undefined>,
	offset: number,
): Map<Key, Retainer<TNode, TScope>> {
	const childrenByKey = new Map<Key, Retainer<TNode, TScope>>();
	for (let i = offset; i < children.length; i++) {
		const child = children[i];
		if (
			typeof child === "object" &&
			typeof child.el.props.key !== "undefined"
		) {
			childrenByKey.set(child.el.props.key, child);
		}
	}

	return childrenByKey;
}

function getInflight(child: Retainer<unknown>): Promise<undefined> | undefined {
	const ctx: ContextState<unknown> | undefined = child.ctx;
	if (ctx && getFlag(ctx.ret, IsUpdating) && ctx.inflight) {
		return ctx.inflight[1];
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
	ret: Retainer<TNode, TScope>,
): Promise<undefined> | undefined {
	const el = ret.el;
	const tag = el.tag as string | symbol;
	if (el.tag === Portal) {
		root = ret.value = el.props.root;
	}

	if (!getFlag(ret, IsMounted)) {
		scope = ret.scope = adapter.scope({
			tag,
			tagName: getTagName(tag),
			props: el.props,
			scope,
		});
	} else {
		scope = ret.scope;
	}

	return diffChildren(
		adapter,
		root,
		ret,
		ctx,
		scope,
		ret,
		ret.el.props.children,
	);
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

// When rendering is done without a root, we use this special anonymous root to
// make sure flush callbacks are still called.
const ANONYMOUS_ROOT: any = {};
function finalize<TRoot>(
	adapter: RenderAdapter<unknown, unknown, TRoot>,
	root: TRoot | null | undefined,
	initiator?: ContextState,
) {
	if (root != null) {
		adapter.finalize(root);
	}
	if (typeof root !== "object" || root === null) {
		root = ANONYMOUS_ROOT;
	}

	// The initiator is the context which initiated the rendering process.
	// If initiator is defined we call and clear all flush callbacks which are
	// registered with the initiator or with a child context of the initiator,
	// because they are fully rendered.
	// If no initiator is provided, we can call and clear all flush callbacks
	// defined on any context for the root.
	const flushMap = flushMapByRoot.get(root as any);
	if (flushMap) {
		if (initiator) {
			const flushMap1 = new Map<ContextState, Set<Function>>();
			for (const [ctx, callbacks] of flushMap) {
				if (!parentCtxContains(initiator, ctx)) {
					flushMap.delete(ctx);
					flushMap1.set(ctx, callbacks);
				}
			}

			if (flushMap1.size) {
				flushMapByRoot.set(root as any, flushMap1);
			} else {
				flushMapByRoot.delete(root as any);
			}
		} else {
			flushMapByRoot.delete(root as any);
		}

		for (const [ctx, callbacks] of flushMap) {
			const value = adapter.read(getValue(ctx.ret));
			for (const callback of callbacks) {
				callback(value);
			}
		}
	}
}

function commitRootRender<TNode, TRoot extends TNode, TScope, TResult>(
	adapter: RenderAdapter<TNode, TScope, TRoot, TResult>,
	root: TRoot | undefined,
	ret: Retainer<TNode, TScope>,
	ctx: ContextState<TNode, TScope, TRoot, TResult> | undefined,
	scope: TScope,
	hydration?: Array<TNode>,
): TResult {
	const props = stripSpecialProps(ret.el.props);
	const children = commitChildren(
		adapter,
		root,
		ret,
		ctx,
		scope,
		ret,
		hydration,
	);
	if (root == null) {
		unmount(adapter, ret, ctx, ret, false);
	} else {
		adapter.arrange({
			tag: Portal,
			tagName: getTagName(Portal),
			node: root,
			props,
			children,
			oldProps: ret.oldProps,
		});
	}

	ret.oldProps = props;
	setFlag(ret, IsMounted);
	finalize(adapter, root);
	return adapter.read(unwrap(children));
}

function commitChildren<TNode, TRoot extends TNode, TScope, TResult>(
	adapter: RenderAdapter<TNode, unknown, TRoot, TResult>,
	root: TRoot | undefined,
	host: Retainer<TNode, TScope>,
	ctx: ContextState<TNode, TScope, TRoot, TResult> | undefined,
	scope: TScope | undefined,
	parent: Retainer<TNode, TScope>,
	hydration: Array<TNode> | undefined,
): Array<TNode> {
	const values: Array<TNode> = [];
	for (let i = 0, children = wrap(parent.children); i < children.length; i++) {
		let child = children[i];
		while (typeof child === "object" && child.fallback) {
			child = child.fallback;
		}

		if (typeof child === "object") {
			const el = child.el;
			let value: ElementValue<TNode>;
			if (el.tag === Raw) {
				value = commitRaw(adapter, host, child, scope, hydration);
			} else if (el.tag === Text) {
				const oldValue = child.value as TNode | undefined;
				value = adapter.text({
					value: el.props.value,
					scope,
					hydration,
					oldNode: oldValue,
				});
				child.value = value;
				if (!getFlag(child, IsMounted)) {
					if (typeof el.props.ref === "function") {
						el.props.ref(adapter.read(value));
					}
				}
			} else if (el.tag === Fragment) {
				value = commitChildren(
					adapter,
					root,
					host,
					ctx,
					scope,
					child,
					hydration,
				);
			} else if (typeof el.tag === "function") {
				value = commitComponent(child.ctx!, hydration);
			} else {
				value = commitHostOrPortal(adapter, root, child, ctx, hydration);
			}

			if (Array.isArray(value)) {
				values.push(...value);
			} else if (value) {
				values.push(value);
			}

			setFlag(child, IsMounted);
		}
	}

	if (parent.graveyard) {
		for (let i = 0; i < parent.graveyard.length; i++) {
			const ret = parent.graveyard[i];
			unmount(adapter, host, ctx, ret, false);
		}

		parent.graveyard = undefined;
	}

	return values;
}

function commitRaw<TNode, TScope>(
	adapter: RenderAdapter<TNode, TScope, TNode, unknown>,
	host: Retainer<TNode>,
	ret: Retainer<TNode>,
	scope: TScope | undefined,
	hydration: Array<TNode> | undefined,
): ElementValue<TNode> {
	if (!ret.oldProps || ret.oldProps.value !== ret.el.props.value) {
		const oldNodes = wrap(ret.value);
		for (let i = 0; i < oldNodes.length; i++) {
			const oldNode = oldNodes[i];
			adapter.remove({
				node: oldNode,
				parent: host.value as TNode,
				isNested: false,
			});
		}
		ret.value = adapter.raw({
			value: ret.el.props.value as any,
			scope,
			hydration,
		});
		if (typeof ret.el.props.ref === "function") {
			ret.el.props.ref(adapter.read(ret.value));
		}
	}

	ret.oldProps = stripSpecialProps(ret.el.props);
	setFlag(ret, IsMounted);
	return ret.value;
}

function commitHostOrPortal<TNode, TRoot extends TNode, TScope>(
	adapter: RenderAdapter<TNode, TScope, TRoot, unknown>,
	root: TNode | undefined,
	ret: Retainer<TNode, TScope>,
	ctx: ContextState<TNode, TScope, TRoot, unknown> | undefined,
	hydration: Array<TNode> | undefined,
): ElementValue<TNode> {
	if (getFlag(ret, IsCopied) && getFlag(ret, IsMounted)) {
		return getValue(ret);
	}

	if (ret.el.tag === Portal) {
		hydration = undefined;
	}

	const tag = ret.el.tag as string | symbol;
	const props = stripSpecialProps(ret.el.props);
	const oldProps = ret.oldProps;

	// TODO: audit usage of node and value to make sure naming is consistent
	let node = ret.value as TNode;
	for (const propName in props) {
		if (props[propName] === Copy) {
			// Currently, the Copy tag can be used to skip the patching of a prop.
			//   <div class={shouldPatchClass ? "class-name" : Copy} />
			props[propName] = oldProps && oldProps[propName];
		}
	}

	const scope = ret.scope;
	let childHydration: Array<TNode> | undefined;
	if (!node && hydration && hydration.length > 0) {
		const nextChild = hydration.shift();
		if (nextChild) {
			childHydration = adapter.adopt({
				tag,
				tagName: getTagName(tag),
				node: nextChild,
				props,
				scope,
			});
			if (childHydration) {
				node = ret.value = nextChild;
				for (let i = 0; i < childHydration.length; i++) {
					adapter.remove({
						node: childHydration[i],
						parent: root as TNode,
						isNested: false,
					});
				}
			}
		}
	}

	const children = commitChildren(
		adapter,
		root,
		ret,
		ctx,
		scope,
		ret,
		childHydration,
	);

	if (tag !== Portal) {
		// We use !node and not !getFlag(ret, IsMounted) here because of an
		// edge-case where a component fires a dispatchEvent from a schedule()
		// callback. In that situation, the IsMounted flag can be true while the
		// value is undefined.
		if (!node) {
			node = ret.value = adapter.create({
				tag,
				tagName: getTagName(tag),
				props,
				scope,
			});
		}

		adapter.patch({
			tag,
			tagName: getTagName(tag),
			node: node,
			props,
			oldProps,
			scope,
			isHydrating: !!childHydration,
		});
	}

	adapter.arrange({
		tag,
		tagName: getTagName(tag),
		node: node,
		props,
		children,
		oldProps,
	});
	ret.oldProps = props;
	if (!getFlag(ret, IsMounted)) {
		if (typeof ret.el.props.ref === "function") {
			ret.el.props.ref(adapter.read(node));
		}
	}

	setFlag(ret, IsMounted);
	if (tag === Portal) {
		finalize(adapter, ret.value);
		// Portal elements
		return;
	}

	return node;
}

function unmount<TNode, TScope, TRoot extends TNode, TResult>(
	adapter: RenderAdapter<TNode, TScope, TRoot, TResult>,
	host: Retainer<TNode>,
	ctx: ContextState<TNode, TScope, TRoot, TResult> | undefined,
	ret: Retainer<TNode>,
	isNested: boolean,
): void {
	if (ret.fallback) {
		unmount(adapter, host, ctx, ret.fallback, isNested);
	}

	if (typeof ret.el.tag === "function") {
		unmountComponent(ret.ctx!, isNested);
	} else if (ret.el.tag === Fragment) {
		unmountChildren(adapter, host, ctx, ret, isNested);
	} else if (ret.el.tag === Portal) {
		unmountChildren(adapter, ret, ctx, ret, false);
		finalize(adapter, ret.value);
	} else {
		unmountChildren(adapter, ret, ctx, ret, true);

		if (getFlag(ret, IsMounted)) {
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

			adapter.remove({
				node: ret.value as TNode,
				parent: host.value as TNode,
				isNested,
			});
		}
	}
}

function unmountChildren<TNode, TScope, TRoot extends TNode, TResult>(
	adapter: RenderAdapter<TNode, TScope, TRoot, TResult>,
	host: Retainer<TNode>,
	ctx: ContextState<TNode, TScope, TRoot, TResult> | undefined,
	ret: Retainer<TNode>,
	isNested: boolean,
): void {
	if (ret.graveyard) {
		for (let i = 0; i < ret.graveyard.length; i++) {
			const child = ret.graveyard[i];
			unmount(adapter, host, ctx, child, isNested);
		}

		ret.graveyard = undefined;
	}

	for (let i = 0, children = wrap(ret.children); i < children.length; i++) {
		const child = children[i];
		if (typeof child === "object") {
			unmount(adapter, host, ctx, child, isNested);
		}
	}
}

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
const flushMapByRoot = new WeakMap<object, Map<ContextState, Set<Function>>>();

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
	declare inflight: [Promise<undefined>, Promise<undefined>] | undefined;
	declare enqueued: [Promise<undefined>, Promise<undefined>] | undefined;

	declare pull: PullController | undefined;

	// The onPropsProvided callback is set when a component requests props via
	// the for await...of loop and props are not available. It is called when the
	// component is updated or refreshed.
	declare onPropsProvided:
		| ((props: Record<string, any>) => unknown)
		| undefined;

	// The onPropsRequested callback is set when a component is updated or
	// refreshed but the new props are not consumed. It is called when the new
	// props are requested.
	declare onPropsRequested: Function | undefined;

	constructor(
		adapter: RenderAdapter<TNode, TScope, TRoot, TResult>,
		root: TRoot | undefined,
		host: Retainer<TNode>,
		parent: ContextState<TNode, TScope, TRoot, TResult> | undefined,
		scope: TScope | undefined,
		ret: Retainer<TNode>,
	) {
		this.ctx = new Context(this);
		this.adapter = adapter;
		this.root = root;
		this.host = host;
		this.parent = parent;
		this.scope = scope;
		this.ret = ret;

		this.iterator = undefined;
		this.inflight = undefined;
		this.enqueued = undefined;

		this.onPropsProvided = undefined;
		this.onPropsRequested = undefined;

		this.pull = undefined;
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
			setFlag(ctx.ret, IsInForOfLoop);
			while (!getFlag(ctx.ret, IsUnmounted) && !getFlag(ctx.ret, IsErrored)) {
				if (getFlag(ctx.ret, NeedsToYield)) {
					throw new Error(
						`<${getTagName(ctx.ret.el.tag)}> context iterated twice without a yield`,
					);
				} else {
					setFlag(ctx.ret, NeedsToYield);
				}

				yield ctx.ret.el.props as ComponentProps<T>;
			}
		} finally {
			setFlag(ctx.ret, IsInForOfLoop, false);
		}
	}

	async *[Symbol.asyncIterator](): AsyncGenerator<ComponentProps<T>> {
		const ctx = this[_ContextState];
		if (getFlag(ctx.ret, IsSyncGen)) {
			throw new Error(
				`Component <${getTagName(ctx.ret.el.tag)}> is a sync generator and cannot use a for await...of loop`,
			);
		}

		setFlag(ctx.ret, IsInForAwaitOfLoop);
		try {
			while (!getFlag(ctx.ret, IsUnmounted) && !getFlag(ctx.ret, IsErrored)) {
				if (getFlag(ctx.ret, NeedsToYield)) {
					throw new Error(
						`<${getTagName(ctx.ret.el.tag)}> context iterated twice without a yield`,
					);
				} else {
					setFlag(ctx.ret, NeedsToYield);
				}

				if (getFlag(ctx.ret, PropsAvailable)) {
					setFlag(ctx.ret, PropsAvailable, false);
					yield ctx.ret.el.props as ComponentProps<T>;
				} else {
					const props = await new Promise(
						(resolve) => (ctx.onPropsProvided = resolve),
					);
					if (getFlag(ctx.ret, IsUnmounted)) {
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
			setFlag(ctx.ret, IsInForAwaitOfLoop, false);
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
		if (getFlag(ctx.ret, IsUnmounted)) {
			console.error(`Component <${getTagName(ctx.ret.el.tag)}> is unmounted`);
			return ctx.adapter.read(undefined);
		} else if (getFlag(ctx.ret, IsSyncExecuting)) {
			console.error(
				`Component <${getTagName(ctx.ret.el.tag)}> is already executing`,
			);
			return ctx.adapter.read(getValue(ctx.ret));
		}

		let diff: Promise<undefined> | undefined;
		try {
			setFlag(ctx.ret, IsRefreshing);
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
					.finally(() => setFlag(ctx.ret, IsRefreshing, false));
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
				setFlag(ctx.ret, IsRefreshing, false);
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
	 * fully rendered. Will only fire once per callback and update.
	 */
	flush(callback: (value: TResult) => unknown): void {
		const ctx = this[_ContextState];
		const root = ctx.root || ANONYMOUS_ROOT;
		let flushMap = flushMapByRoot.get(root);
		if (!flushMap) {
			flushMap = new Map<ContextState, Set<Function>>();
			flushMapByRoot.set(root, flushMap);
		}

		let callbacks = flushMap.get(ctx);
		if (!callbacks) {
			callbacks = new Set<Function>();
			flushMap.set(ctx, callbacks);
		}

		callbacks.add(callback);
	}

	/**
	 * Registers a callback which fires when the component unmounts.
	 */
	cleanup(callback: (value: TResult) => unknown): void {
		const ctx = this[_ContextState];

		if (getFlag(ctx.ret, IsUnmounted)) {
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
		if (getFlag(ctx.ret, IsSyncExecuting)) {
			console.error(
				`Component <${getTagName(ctx.ret.el.tag)}> is already executing`,
			);
			return;
		}
	} else {
		ctx = ret.ctx = new ContextState(adapter, root, host, parent, scope, ret);
	}

	setFlag(ctx.ret, IsUpdating);
	return enqueueComponent(ctx);
}

function diffComponentChildren<TNode, TResult>(
	ctx: ContextState<TNode, unknown, TNode, TResult>,
	children: Children,
	isYield: boolean,
): Promise<undefined> | undefined {
	if (getFlag(ctx.ret, IsUnmounted) || getFlag(ctx.ret, IsErrored)) {
		return;
	} else if (children === undefined) {
		console.error(
			`Component <${getTagName(ctx.ret.el.tag)}> has ${isYield ? "yielded" : "returned"} undefined. If this was intentional, ${isYield ? "yield" : "return"} null instead.`,
		);
	}

	let diff: Promise<undefined> | undefined;
	try {
		// TODO: Use a different flag here to indicate the component is
		// synchronously rendering children

		// We set the isExecuting flag in case a child component dispatches an event
		// which bubbles to this component and causes a synchronous refresh().
		setFlag(ctx.ret, IsSyncExecuting);
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
		setFlag(ctx.ret, IsSyncExecuting, false);
	}

	return diff;
}

function commitComponent<TNode>(
	ctx: ContextState<TNode, unknown, TNode>,
	hydration?: Array<TNode>,
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

	if (getFlag(ctx.ret, IsUnmounted)) {
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

	if (getFlag(ctx.ret, IsScheduling)) {
		setFlag(ctx.ret, IsSchedulingRefresh);
	} else if (!getFlag(ctx.ret, IsUpdating)) {
		// If we’re not updating the component, which happens when components are
		// refreshed, or when async generator components iterate independently, we
		// have to do a little bit housekeeping
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
		const props = stripSpecialProps(host.el.props);
		ctx.adapter.arrange({
			tag: host.el.tag as string | symbol,
			tagName: getTagName(host.el.tag),
			node: host.value as TNode,
			props,
			// oldProps is the same because the host element has not re-rendered
			oldProps: props,
			children: getChildValues(host),
		});
		finalize(ctx.adapter, ctx.root, ctx);
	}

	const callbacks = scheduleMap.get(ctx);
	let value = unwrap(values);
	if (callbacks) {
		scheduleMap.delete(ctx);
		setFlag(ctx.ret, IsScheduling);
		const result = ctx.adapter.read(value);
		for (const callback of callbacks) {
			callback(result);
		}

		setFlag(ctx.ret, IsScheduling, false);
		// Handles an edge case where refresh() is called during a schedule().
		if (getFlag(ctx.ret, IsSchedulingRefresh)) {
			setFlag(ctx.ret, IsSchedulingRefresh, false);
			value = getValue(ctx.ret);
		}
	}

	setFlag(ctx.ret, IsUpdating, false);
	setFlag(ctx.ret, IsMounted);
	return value;
}

/** Enqueues and executes the component associated with the context. */
function enqueueComponent<TNode, TResult>(
	ctx: ContextState<TNode, unknown, TNode, TResult>,
): Promise<undefined> | undefined {
	if (!ctx.inflight) {
		const [block, diff] = runComponent<TNode, TResult>(ctx);
		if (block) {
			// if block is a promise, diff is a promise
			ctx.inflight = [block.finally(() => advanceComponent(ctx)), diff!];
		}

		return diff;
	} else if (!ctx.enqueued) {
		// The enqueuedBlock and enqueuedDiff properties must be set
		// simultaneously, hence the usage of the Promise constructor.
		let resolve: Function;
		ctx.enqueued = [
			new Promise<undefined>((resolve1) => (resolve = resolve1)).finally(() =>
				advanceComponent(ctx),
			),
			ctx.inflight[0]!.finally(() => {
				const [block, diff] = runComponent<TNode, TResult>(ctx);
				resolve(block);
				return diff;
			}),
		];
	}

	return ctx.enqueued[1];
}

/** Called when the inflight block promise settles. */
function advanceComponent(ctx: ContextState): void {
	ctx.inflight = ctx.enqueued;
	ctx.enqueued = undefined;
}

/**
 * This function is responsible for executing components, and handling the
 * different component types.
 *
 * @returns {[block, diff]} A tuple where:
 * - block is a promise or undefined which represents the duration during which
 *   the component is blocked.
 * - diff is a promise or undefined which represents the duration for diffing
 *   of children.
 *
 * While a component is blocked, further updates to the component are enqueued.
 *
 * Each component type blocks according to its implementation:
 * - Sync function components never block; when props or state change,
 *   updates are immediately passed to children.
 * - Async function components block only while awaiting their own async work
 *   (e.g., during an await), but do not block while their async children are rendering.
 * - Sync generator components block while their children are rendering;
 *   they only resume once their children have finished.
 * - Async generator components can block in different ways, depending on their loop:
 *   - With a for...of loop, they behave like sync generator components,
 *     blocking while the component or its children are rendering.
 *   - With a for await...of loop, they block only while waiting for new props
 *     to be requested, not while children are rendering.
 *   - Without any loop, they block while the component itself is rendering,
 *     not while children are rendering.
 */
function runComponent<TNode, TResult>(
	ctx: ContextState<TNode, unknown, TNode, TResult>,
): [Promise<undefined> | undefined, Promise<undefined> | undefined] {
	if (getFlag(ctx.ret, IsUnmounted)) {
		return [undefined, undefined];
	}

	const ret = ctx.ret;
	const initial = !ctx.iterator;
	if (initial) {
		setFlag(ctx.ret, IsSyncExecuting);
		clearEventListeners(ctx);
		let returned: ReturnType<Component>;
		try {
			returned = (ret.el.tag as Component).call(ctx.ctx, ret.el.props, ctx.ctx);
		} catch (err) {
			setFlag(ctx.ret, IsErrored);
			throw err;
		} finally {
			setFlag(ctx.ret, IsSyncExecuting, false);
		}

		if (isIteratorLike(returned)) {
			ctx.iterator = returned;
		} else if (!isPromiseLike(returned)) {
			// sync function component
			return [
				undefined,
				diffComponentChildren<TNode, TResult>(ctx, returned, false),
			];
		} else {
			// async function component
			const returned1 =
				returned instanceof Promise ? returned : Promise.resolve(returned);
			return [
				returned1.catch(NOOP),
				returned1.then(
					(returned) =>
						diffComponentChildren<TNode, TResult>(ctx, returned, false),
					(err) => {
						setFlag(ctx.ret, IsErrored);
						throw err;
					},
				),
			];
		}
	}

	let iteration!: Promise<ChildrenIteratorResult> | ChildrenIteratorResult;
	if (initial) {
		try {
			setFlag(ctx.ret, IsSyncExecuting);
			iteration = ctx.iterator!.next();
		} catch (err) {
			setFlag(ctx.ret, IsErrored);
			throw err;
		} finally {
			setFlag(ctx.ret, IsSyncExecuting, false);
		}

		if (isPromiseLike(iteration)) {
			setFlag(ctx.ret, IsAsyncGen);
		} else {
			setFlag(ctx.ret, IsSyncGen);
		}
	}

	if (getFlag(ctx.ret, IsSyncGen)) {
		// sync generator component
		if (!initial) {
			try {
				setFlag(ctx.ret, IsSyncExecuting);
				const oldResult = ctx.adapter.read(getValue(ctx.ret));
				iteration = ctx.iterator!.next(oldResult);
			} catch (err) {
				setFlag(ctx.ret, IsErrored);
				throw err;
			} finally {
				setFlag(ctx.ret, IsSyncExecuting, false);
			}
		}

		if (isPromiseLike(iteration)) {
			throw new Error("Mixed generator component");
		}

		if (
			getFlag(ctx.ret, IsInForOfLoop) &&
			!getFlag(ctx.ret, NeedsToYield) &&
			!getFlag(ctx.ret, IsUnmounted)
		) {
			console.error(
				`Component <${getTagName(ctx.ret.el.tag)}> yielded/returned more than once in for...of loop`,
			);
		}

		setFlag(ctx.ret, NeedsToYield, false);
		if (iteration.done) {
			setFlag(ctx.ret, IsSyncGen, false);
			ctx.iterator = undefined;
		}

		const diff = diffComponentChildren<TNode, TResult>(
			ctx,
			iteration.value as Children,
			!iteration.done,
		);
		const block = isPromiseLike(diff) ? diff.catch(NOOP) : undefined;
		return [block, diff];
	} else {
		if (!getFlag(ctx.ret, IsInForAwaitOfLoop)) {
			// We call resumePropsAsyncIterator in case the component exits the
			// for...of loop
			resumePropsAsyncIterator(ctx);
			if (!initial) {
				try {
					setFlag(ctx.ret, IsSyncExecuting);
					const oldResult = ctx.adapter.read(getValue(ctx.ret));
					iteration = ctx.iterator!.next(oldResult);
				} catch (err) {
					setFlag(ctx.ret, IsErrored);
					throw err;
				} finally {
					setFlag(ctx.ret, IsSyncExecuting, false);
				}
			}

			if (!isPromiseLike(iteration)) {
				throw new Error("Mixed generator component");
			}

			const diff = iteration.then(
				(iteration) => {
					if (getFlag(ctx.ret, IsInForAwaitOfLoop)) {
						// We have entered a for await...of loop, so we start pulling
						pullComponent(ctx, iteration);
					} else {
						if (
							getFlag(ctx.ret, IsInForOfLoop) &&
							!getFlag(ctx.ret, NeedsToYield) &&
							!getFlag(ctx.ret, IsUnmounted)
						) {
							console.error(
								`Component <${getTagName(ctx.ret.el.tag)}> yielded/returned more than once in for...of loop`,
							);
						}
					}

					setFlag(ctx.ret, NeedsToYield, false);
					if (iteration.done) {
						setFlag(ctx.ret, IsSyncGen, false);
						ctx.iterator = undefined;
					}
					return diffComponentChildren<TNode, TResult>(
						ctx,
						// Children can be void so we eliminate that here
						iteration.value as Children,
						!iteration.done,
					);
				},
				(err) => {
					setFlag(ctx.ret, IsErrored);
					throw err;
				},
			);

			return [diff.catch(NOOP), diff];
		} else {
			// initializes the async generator loop
			pullComponent(ctx, iteration);
			const block = resumePropsAsyncIterator(ctx);
			return [block, ctx.pull && ctx.pull.diff];
		}
	}
}

// TODO: is it possible to make sure all properties are defined?
interface PullController {
	iterationP: Promise<ChildrenIteratorResult> | undefined;
	diff: Promise<undefined> | undefined;
	onChildError: ((err: unknown) => void) | undefined;
}

/**
 * The logic for pulling from async generator components when they are not in a
 * for...of loop is implemented here. It makes sense to group the logic for
 * continuously resuming components in a single loop to prevent opaque race
 * conditions.
 */
async function pullComponent<TNode, TResult>(
	ctx: ContextState<TNode, unknown, TNode, TResult>,
	iterationP:
		| Promise<ChildrenIteratorResult>
		| ChildrenIteratorResult
		| undefined,
): Promise<void> {
	if (!iterationP) {
		return;
	}

	ctx.pull = {iterationP: undefined, diff: undefined, onChildError: undefined};

	let done = false;
	try {
		let childError: any;
		while (!done) {
			if (isPromiseLike(iterationP)) {
				ctx.pull.iterationP = iterationP;
			}

			let onDiff!: Function;
			ctx.pull.diff = new Promise((resolve) => (onDiff = resolve)).then(
				(): undefined => {
					if (
						!(getFlag(ctx.ret, IsUpdating) || getFlag(ctx.ret, IsRefreshing))
					) {
						commitComponent(ctx);
					}
				},
				(err) => {
					if (
						!(getFlag(ctx.ret, IsUpdating) || getFlag(ctx.ret, IsRefreshing)) ||
						// TODO: is this flag necessary?
						!getFlag(ctx.ret, NeedsToYield)
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
				setFlag(ctx.ret, IsErrored);
				setFlag(ctx.ret, NeedsToYield, false);
				onDiff(Promise.reject(err));
				break;
			}

			// this must be set after iterationP is awaited
			let oldResult: Promise<TResult>;
			{
				// The 'floating' flag tracks whether the promise passed to the generator
				// is handled (via await, then, or catch). If handled, we reject the
				// promise so the user can catch errors. If not, we inject the error back
				// into the generator using throw, like for sync generator components.
				let floating = true;
				const oldResult1 = new Promise<TResult>((resolve, reject) => {
					ctx.ctx.schedule(resolve);
					ctx.pull!.onChildError = (err: any) => {
						reject(err);
						if (floating) {
							childError = err;
							resumePropsAsyncIterator(ctx);
							return ctx.pull!.diff;
						}
					};
				});

				oldResult1.catch(NOOP);
				// We use Object.create() to clone the promise for float detection
				// because modern JS engines skip calling .then() on promises awaited
				// with await.
				oldResult = Object.create(oldResult1);
				oldResult.then = function (
					onfulfilled?: ((value: TResult) => any) | null,
					onrejected?: ((reason: any) => any) | null,
				): Promise<any> {
					floating = false;
					return oldResult1.then(onfulfilled, onrejected);
				};

				oldResult.catch = function (
					onrejected?: ((reason: any) => any) | null,
				): Promise<any> {
					floating = false;
					return oldResult1.catch(onrejected);
				};
			}

			if (childError != null) {
				try {
					setFlag(ctx.ret, IsSyncExecuting);
					if (typeof ctx.iterator!.throw !== "function") {
						throw childError;
					}
					iteration = await ctx.iterator!.throw(childError);
				} catch (err) {
					done = true;
					setFlag(ctx.ret, IsErrored);
					setFlag(ctx.ret, NeedsToYield, false);
					onDiff(Promise.reject(err));
					break;
				} finally {
					childError = undefined;
					setFlag(ctx.ret, IsSyncExecuting, false);
				}
			}

			// this makes sure we pause before entering a loop if we yield before it
			if (!getFlag(ctx.ret, IsInForAwaitOfLoop)) {
				setFlag(ctx.ret, PropsAvailable, false);
			}

			done = !!iteration.done;

			let diff: Promise<undefined> | undefined;
			try {
				if (!isPromiseLike(iterationP)) {
					// if iterationP is an iteration and not a promise, the component was
					// not in a for await...of loop when the iteration started, so we can
					// skip the diffing of children as it is handled elsewhere.
					diff = undefined;
				} else if (
					!getFlag(ctx.ret, NeedsToYield) &&
					getFlag(ctx.ret, PropsAvailable) &&
					getFlag(ctx.ret, IsInForAwaitOfLoop)
				) {
					// logic to skip yielded children in a stale for await of iteration.
					diff = undefined;
				} else {
					diff = diffComponentChildren<TNode, TResult>(
						ctx,
						iteration.value!,
						!iteration.done,
					);
				}
			} catch (err) {
				onDiff(Promise.reject(err));
			} finally {
				onDiff(diff);
				setFlag(ctx.ret, NeedsToYield, false);
			}

			// TODO: move this outside the loop
			if (getFlag(ctx.ret, IsUnmounted)) {
				while (
					(!iteration || !iteration.done) &&
					ctx.iterator &&
					getFlag(ctx.ret, IsInForAwaitOfLoop)
				) {
					try {
						setFlag(ctx.ret, IsSyncExecuting);
						iteration = await ctx.iterator.next(oldResult);
					} catch (err) {
						setFlag(ctx.ret, IsErrored);
						// we throw the error here to cause an unhandled rejection because
						// the promise returned from pullComponent is never awaited
						throw err;
					} finally {
						setFlag(ctx.ret, IsSyncExecuting, false);
					}
				}

				if (
					(!iteration || !iteration.done) &&
					ctx.iterator &&
					typeof ctx.iterator.return === "function"
				) {
					try {
						setFlag(ctx.ret, IsSyncExecuting);
						await ctx.iterator.return();
					} catch (err) {
						setFlag(ctx.ret, IsErrored);
						throw err;
					} finally {
						setFlag(ctx.ret, IsSyncExecuting, false);
					}
				}

				break;
			} else if (!getFlag(ctx.ret, IsInForAwaitOfLoop)) {
				// we have entered a for...of loop, so updates will be handled by the
				// regular runComponent/enqueueComponent logic.
				break;
			} else if (!iteration.done) {
				try {
					setFlag(ctx.ret, IsSyncExecuting);
					iterationP = ctx.iterator!.next(
						oldResult,
					) as Promise<ChildrenIteratorResult>;
				} finally {
					setFlag(ctx.ret, IsSyncExecuting, false);
				}
			}
		}
	} finally {
		if (done) {
			setFlag(ctx.ret, IsAsyncGen, false);
			ctx.iterator = undefined;
		}

		ctx.pull = undefined;
	}
}

/**
 * Called to resume the props async iterator for async generator components.
 *
 * @returns {Promise<undefined> | undefined} A possible promise which
 * represents the duration during which the component is blocked.
 */
function resumePropsAsyncIterator(
	ctx: ContextState,
): Promise<undefined> | undefined {
	if (ctx.onPropsProvided) {
		ctx.onPropsProvided(ctx.ret.el.props);
		ctx.onPropsProvided = undefined;
		setFlag(ctx.ret, PropsAvailable, false);
	} else {
		setFlag(ctx.ret, PropsAvailable);
		if (getFlag(ctx.ret, IsInForAwaitOfLoop)) {
			return new Promise<undefined>(
				(resolve) => (ctx.onPropsRequested = resolve),
			);
		}
	}

	return (
		ctx.pull && ctx.pull.iterationP && ctx.pull.iterationP.then(NOOP, NOOP)
	);
}

async function unmountComponent(
	ctx: ContextState,
	isNested: boolean,
): Promise<undefined> {
	if (getFlag(ctx.ret, IsUnmounted)) {
		return;
	}

	setFlag(ctx.ret, IsUnmounted);
	clearEventListeners(ctx);
	let lingerers: Array<PromiseLike<unknown>> | undefined;
	const callbacks = cleanupMap.get(ctx);
	if (callbacks) {
		const oldResult = ctx.adapter.read(getValue(ctx.ret));
		cleanupMap.delete(ctx);
		for (const callback of callbacks) {
			const cleanup = callback(oldResult);
			if (!isNested && isPromiseLike(cleanup)) {
				(lingerers = lingerers || []).push(cleanup);
			}
		}
	}

	if (lingerers) {
		await Promise.all(lingerers);
	}

	unmountChildren(ctx.adapter, ctx.host, ctx, ctx.ret, isNested);
	if (lingerers) {
		// If there are lingerers, we must finalize the root because nodes have
		// been removed asynchronously
		ctx.adapter.finalize(ctx.root);
	}

	if (ctx.iterator) {
		if (ctx.pull) {
			// we let pullComponent handle unmounting
			resumePropsAsyncIterator(ctx);
			return;
		}

		// we wait for the block so yields resume with the most up to date props
		if (ctx.inflight) {
			await ctx.inflight[1];
		}

		let iteration: ChildrenIteratorResult | undefined;
		if (getFlag(ctx.ret, IsInForOfLoop)) {
			try {
				setFlag(ctx.ret, IsSyncExecuting);
				const oldResult = ctx.adapter.read(getValue(ctx.ret));
				const iterationP = ctx.iterator!.next(oldResult);
				if (isPromiseLike(iterationP)) {
					if (!getFlag(ctx.ret, IsAsyncGen)) {
						throw new Error("Mixed generator component");
					}

					iteration = await iterationP;
				} else {
					if (!getFlag(ctx.ret, IsSyncGen)) {
						throw new Error("Mixed generator component");
					}

					iteration = iterationP;
				}
			} catch (err) {
				setFlag(ctx.ret, IsErrored);
				throw err;
			} finally {
				setFlag(ctx.ret, IsSyncExecuting, false);
			}
		}

		if (
			(!iteration || !iteration.done) &&
			ctx.iterator &&
			typeof ctx.iterator.return === "function"
		) {
			try {
				setFlag(ctx.ret, IsSyncExecuting);
				const iterationP = ctx.iterator.return();
				if (isPromiseLike(iterationP)) {
					if (!getFlag(ctx.ret, IsAsyncGen)) {
						throw new Error("Mixed generator component");
					}

					iteration = await iterationP;
				} else {
					if (!getFlag(ctx.ret, IsSyncGen)) {
						throw new Error("Mixed generator component");
					}

					iteration = iterationP;
				}
			} catch (err) {
				setFlag(ctx.ret, IsErrored);
				throw err;
			} finally {
				setFlag(ctx.ret, IsSyncExecuting, false);
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
	if (!ctx.iterator) {
		throw err;
	}

	if (ctx.pull) {
		// we let pullComponent handle child errors
		ctx.pull.onChildError!(err);
		return ctx.pull.diff;
	}

	if (!ctx.iterator.throw) {
		throw err;
	}

	resumePropsAsyncIterator(ctx);
	let iteration: ChildrenIteratorResult | Promise<ChildrenIteratorResult>;
	try {
		setFlag(ctx.ret, IsSyncExecuting);
		iteration = ctx.iterator.throw(err);
	} catch (err) {
		setFlag(ctx.ret, IsErrored);
		throw err;
	} finally {
		setFlag(ctx.ret, IsSyncExecuting, false);
	}

	if (isPromiseLike(iteration)) {
		return iteration.then(
			(iteration) => {
				if (iteration.done) {
					setFlag(ctx.ret, IsSyncGen, false);
					setFlag(ctx.ret, IsAsyncGen, false);
					ctx.iterator = undefined;
				}

				return diffComponentChildren(
					ctx,
					iteration.value as Children,
					!iteration.done,
				);
			},
			(err) => {
				setFlag(ctx.ret, IsErrored);
				throw err;
			},
		);
	}

	if (iteration.done) {
		setFlag(ctx.ret, IsSyncGen, false);
		setFlag(ctx.ret, IsAsyncGen, false);
		ctx.iterator = undefined;
	}

	return diffComponentChildren(
		ctx,
		iteration.value as Children,
		!iteration.done,
	);
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
