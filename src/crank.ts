const NOOP = () => {};

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
 * and iterables, so it is appropriate for wrapping user-provided children.
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
 * @template TTag - The tag of the element.
 */
export type TagProps<TTag extends Tag> = TTag extends string
	? JSX.IntrinsicElements[TTag]
	: TTag extends Component<infer TProps>
	? TProps
	: // TODO: should the most generic type be object or {}
	  unknown;

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
 * createElement calls or transpiler options to avoid having to reference this
 * export directly.
 */
export const Fragment = "";
export type Fragment = typeof Fragment;

// TODO: We assert the following symbol tags as any because typescript support
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
 * the string and the result will be set to the element’s value.
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
export type Component<TProps = any> = (
	this: Context<TProps>,
	props: TProps,
) =>
	| Children
	| PromiseLike<Children>
	// The return type of iterators must include void because typescript will
	// infer generators which return implicitly as having a void return type.
	| Iterator<Children, Children | void, any>
	| AsyncIterator<Children, Children | void, any>;

type ChildrenIteration =
	| Promise<IteratorResult<Children, Children | void>>
	| IteratorResult<Children, Children | void>;

type Key = unknown;

const ElementSymbol = Symbol.for("crank.Element");

// To save on filesize, we mangle the internal properties of Crank classes by
// hand. These internal properties are prefixed with an underscore. Refer to
// their definitions to see their unabbreviated names.

export interface Element<TTag extends Tag = Tag> {
	// To maximize compatibility between Crank versions, starting with 0.2.0, any
	// changes to the following properties will be considered a breaking change:
	// $$typeof, tag, props, key, ref
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
	 * Passed in createElement() as the prop "crank-key".
	 */
	key: Key;

	/**
	 * A callback which is called with the element’s result when it is committed.
	 *
	 * Passed in createElement() as the prop "crank-ref".
	 */
	ref: ((value: unknown) => unknown) | undefined;
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
	// TODO: Move these internal properties to their own class, now that we’re
	// cloning elements.
	/**
	 * @internal
	 * nodeOrContext - The node or context associated with the element.
	 *
	 * For host elements, this property is set to the return value of
	 * Renderer.prototype.create when the component is mounted, i.e. DOM nodes
	 * for the DOM renderer.
	 *
	 * For component elements, this property is set to a Context instance
	 * (Context<TagProps<TTag>>).
	 *
	 * We assign both of these to the same property because they are mutually
	 * exclusive. We use any because the Element type has no knowledge of
	 * what renderer nodes will be.
	 */
	declare _n: any;

	/**
	 * @internal
	 * fallback - The element which this element is replacing.
	 *
	 * If an element renders asynchronously, we show any previously rendered
	 * values in its place until it has committed for the first time. This
	 * property is set to the previously rendered child.
	 */
	declare _fb: NarrowedChild;

	/**
	 * @internal
	 * children - The rendered children of the element.
	 */
	declare _ch: Array<NarrowedChild> | NarrowedChild;

	// TODO: This type is meaningless.
	/**
	 * @internal
	 * childValues - The rendered child values of the element.
	 */
	declare _cv: ElementValue<unknown>;

	/**
	 * @internal
	 * inflightValue(s) - The current async run of the element.
	 *
	 * This property is used to make sure Copy element refs fire at the correct
	 * time, and is also used to create yield values for async generator
	 * components with async children.
	 */
	declare _inf: Promise<any> | undefined;

	/**
	 * @internal
	 * onvalue(s) - This property is set to the resolve function of a promise
	 * which represents the next children, so that renderings can be raced.
	 *
	 * We use Function because the Element type has no knowledge of what renderer
	 * nodes will be.
	 */
	declare _oncv: Function | undefined;

	constructor(
		tag: TTag,
		props: TagProps<TTag>,
		key: Key,
		ref: ((value: unknown) => unknown) | undefined,
	) {
		this.tag = tag;
		this.props = props;
		this.key = key;
		this.ref = ref;

		// TODO: If we’re no longer reusing elements, it’s time to move these
		// properties back onto a hidden class of some sort.
		this._n = undefined; // nodeOrContext
		this._fb = undefined; // fallback
		this._ch = undefined; // children
		this._cv = undefined; // childValue(s)
		this._inf = undefined; // inflightValue(s)
		this._oncv = undefined; // onChildValue(s)
	}
}

Element.prototype.$$typeof = ElementSymbol;

export function isElement(value: any): value is Element {
	return value != null && value.$$typeof === ElementSymbol;
}

/**
 * Creates an element with the specified tag, props and children.
 *
 * This function is usually used as a transpilation target for JSX transpilers,
 * but it can also be called directly. It additionally extracts the crank-key
 * and crank-ref props so they aren’t accessible to renderer methods or
 * components, and assigns the children prop according to any additional
 * arguments passed to the function.
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
			switch (name) {
				case "crank-key":
					// We have to make sure we don’t assign null to the key because we
					// don’t check for null keys in the diffing functions.
					if (props["crank-key"] != null) {
						key = props["crank-key"];
					}
					break;
				case "crank-ref":
					if (typeof props["crank-ref"] === "function") {
						ref = props["crank-ref"];
					}
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

	return new Element(tag, props1, key, ref);
}

/**
 * Clones a given element, shallowly copying the props object.
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
 * Finds the value of the element according to its type.
 *
 * @returns The value of the element.
 */
function getValue<TNode>(el: Element): ElementValue<TNode> {
	if (typeof el._fb !== "undefined") {
		return typeof el._fb === "object" ? getValue<TNode>(el._fb) : el._fb;
	} else if (el.tag === Portal) {
		return undefined;
	} else if (typeof el.tag !== "function" && el.tag !== Fragment) {
		return el._n;
	}

	return unwrap(getChildValues<TNode>(el));
}

/**
 * This function is only really used to make sure <Copy /> elements wait for
 * the current async run before resolving, but it’s somewhat complex so I put
 * it here.
 */
function getInflightValue<TNode>(
	el: Element,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	const ctx: Context | undefined =
		typeof el.tag === "function" ? el._n : undefined;
	if (ctx && ctx._f & IsUpdating && ctx._iv) {
		return ctx._iv; // inflightValue
	} else if (el._inf) {
		return el._inf; // inflightValue
	}

	return getValue<TNode>(el);
}

// TODO: Now that we’re caching child values for host elements (el._cv), we
// might reconsider using/invalidating these cached values in this function
// again.
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
 * @template TNode - The type of the node for a rendering environment.
 * @template TScope - Data which is passed down the tree.
 * @template TRoot - The type of the root for a rendering environment.
 * @template TResult - The type of exposed values.
 */
export class Renderer<
	TNode,
	TScope,
	TRoot = TNode,
	TResult = ElementValue<TNode>,
> {
	/**
	 * @internal
	 * A weakmap which stores element trees by root.
	 */
	declare _cache: WeakMap<object, Element<Portal>>;
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
		ctx?: Context | undefined,
	): Promise<TResult> | TResult {
		let portal: Element<Portal> | undefined;
		if (typeof root === "object" && root !== null) {
			portal = this._cache.get(root as any);
		}

		let oldProps: any;
		if (portal === undefined) {
			portal = createElement(Portal, {children, root});
			portal._n = ctx;
			if (typeof root === "object" && root !== null && children != null) {
				this._cache.set(root as any, portal);
			}
		} else if (portal._n !== ctx) {
			throw new Error("Context mismatch");
		} else {
			oldProps = portal.props;
			portal.props = {children, root};
			if (typeof root === "object" && root !== null && children == null) {
				this._cache.delete(root as unknown as object);
			}
		}

		const value = update(this, root, portal, ctx, undefined, portal, oldProps);
		// We return the child values of the portal because portal elements
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

	// TODO: Maybe we can move these methods to a “RendererImpl” interface which
	// is passed to the constructor of the renderer by inheritors, so that these
	// methods aren’t available to renderer users.

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
	read(value: ElementValue<TNode>): TResult {
		return value as unknown as TResult;
	}

	/**
	 * Called for each string in an element tree.
	 *
	 * @param text - The string child.
	 * @param scope - The current scope.
	 *
	 * @returns The escaped string.
	 *
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

	scope<TTag extends string | symbol>(
		_tag: TTag,
		_props: TagProps<TTag>,
		scope: TScope | undefined,
	): TScope | undefined {
		return scope;
	}

	create<TTag extends string | symbol>(
		_tag: TTag,
		_props: TagProps<TTag>,
		_scope: TScope | undefined,
	): TNode {
		throw new Error("Not implemented");
	}

	patch<TTag extends string | symbol>(
		_node: TNode,
		_tag: TTag,
		_props: TagProps<TTag>,
		_oldProps: TagProps<TTag> | undefined,
	): unknown {
		return;
	}

	arrange<TTag extends string | symbol>(
		_node: TNode,
		_tag: TTag,
		_props: TagProps<TTag>,
		_children: Array<TNode | string>,
		_oldProps: TagProps<TTag> | undefined,
		_oldChildren: Array<TNode | string> | undefined,
	): unknown {
		return;
	}

	dispose<TTag extends string | symbol>(
		_node: TNode,
		_tag: TTag,
		_props: TagProps<TTag>,
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
	flush(_root: TRoot): unknown {
		return;
	}
}

/*** PRIVATE RENDERER FUNCTIONS ***/
function update<TNode, TScope, TRoot, TResult>(
	renderer: Renderer<TNode, TScope, TRoot, TResult>,
	root: TRoot,
	host: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: TScope | undefined,
	el: Element,
	// TODO: refine type
	oldProps: any,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (typeof el.tag === "function") {
		throw new Error("TODO: THIS SHOULD NO LONGER HAPPEN");
	} else if (el.tag === Raw) {
		throw new Error("TODO: THIS SHOULD NO LONGER HAPPEN");
	} else if (el.tag !== Fragment) {
		if (el.tag === Portal) {
			root = el.props.root;
			scope = undefined;
		} else {
			renderer.patch(el._n, el.tag, el.props, oldProps);
			scope = renderer.scope(el.tag, el.props, scope);
		}

		host = el as Element<string | symbol>;
	}

	return updateChildren(
		renderer,
		root,
		host,
		ctx,
		scope,
		el,
		el.props.children,
		oldProps,
	);
}

function createChildrenByKey(
	children: Array<NarrowedChild>,
	offset: number,
): Map<Key, Element> {
	const childrenByKey = new Map<Key, Element>();
	for (let i = offset; i < children.length; i++) {
		const child = children[i];
		if (typeof child === "object" && typeof child.key !== "undefined") {
			childrenByKey.set(child.key, child);
		}
	}

	return childrenByKey;
}

function completeRender<TRoot>(
	renderer: Renderer<unknown, TRoot>,
	root: TRoot,
	initiatingCtx?: Context,
) {
	renderer.flush(root);
	if (typeof root !== "object" || root === null) {
		return;
	}

	const flushMap = rootMap.get(root as unknown as object);
	if (flushMap) {
		if (initiatingCtx) {
			const flushMap1 = new Map<Context, Set<Function>>();
			for (let [ctx1, callbacks] of flushMap) {
				if (!ctxContains(initiatingCtx, ctx1)) {
					flushMap.delete(ctx1);
					flushMap1.set(ctx1, callbacks);
				}
			}

			if (flushMap1.size) {
				rootMap.set(root as unknown as object, flushMap1);
			} else {
				rootMap.delete(root as unknown as object);
			}
		} else {
			rootMap.delete(root as unknown as object);
		}

		for (const [ctx, callbacks] of flushMap) {
			const value = renderer.read(getValue(ctx._el));
			for (const callback of callbacks) {
				callback(value);
			}
		}
	}
}

function diffChildren<TNode, TScope, TRoot, TResult>(
	renderer: Renderer<TNode, TScope, TRoot, TResult>,
	root: TRoot,
	host: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: TScope,
	parent: Element,
	children: Children,
): Promise<Array<TNode | string>> | Array<TNode | string> {
	const oldChildren = wrap(parent._ch);
	const newChildren = arrayify(children);
	const narrowedNewChildren: Array<NarrowedChild> = [];
	const childValues: Array<Promise<ElementValue<TNode>> | ElementValue<TNode>> =
		[];
	let graveyard: Array<Element> | undefined;
	let seenKeys: Set<Key> | undefined;
	let childrenByKey: Map<Key, Element> | undefined;
	let isAsync = false;
	let i = 0;
	for (
		let j = 0, il = oldChildren.length, jl = newChildren.length;
		j < jl;
		j++
	) {
		let oldChild = i >= il ? undefined : oldChildren[i];
		let newChild = narrow(newChildren[j]);
		// Aligning based on key
		let oldKey = typeof oldChild === "object" ? oldChild.key : undefined;
		let newKey = typeof newChild === "object" ? newChild.key : undefined;
		if (newKey !== undefined && seenKeys && seenKeys.has(newKey)) {
			console.error("Duplicate key", newKey);
			newKey = undefined;
		}

		if (oldKey === newKey) {
			if (childrenByKey !== undefined && newKey !== undefined) {
				childrenByKey.delete(newKey);
			}

			i++;
		} else {
			if (!childrenByKey) {
				childrenByKey = createChildrenByKey(oldChildren, i);
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

				if (!seenKeys) {
					seenKeys = new Set();
				}

				seenKeys.add(newKey);
			}
		}

		// Updating
		// TODO: There should be a way to combine the update/mount branches
		let value: Promise<ElementValue<TNode>> | ElementValue<TNode>;
		if (
			typeof oldChild === "object" &&
			typeof newChild === "object" &&
			oldChild.tag === newChild.tag
		) {
			// update of matching element
			const oldProps1 = oldChild.props;
			oldChild.props = newChild.props;
			oldChild.ref = newChild.ref;
			newChild = oldChild;
			if (oldChild.tag === Portal) {
				if (oldProps1.root !== newChild.props.root) {
					renderer.arrange(
						oldChild.props.root,
						Portal,
						oldChild.props,
						[],
						oldProps1,
						wrap(oldChild._cv) as Array<any>,
					);
					completeRender(renderer, oldChild.props.root);
				}

				value = update(renderer, root, host, ctx, scope, newChild, oldProps1);
			} else if (typeof oldChild.tag === "function") {
				value = updateCtx(oldChild._n);
			} else if (oldChild.tag === Raw) {
				if (typeof newChild.props.value === "string") {
					if (oldProps1.value !== newChild.props.value) {
						oldChild._n = renderer.parse(newChild.props.value, scope);
					}
				} else {
					oldChild._n = newChild.props.value;
				}

				value = newChild._n;
				if (newChild.ref) {
					newChild.ref(value);
				}
			} else {
				value = update(renderer, root, host, ctx, scope, newChild, oldProps1);
			}
		} else if (typeof newChild === "object") {
			// mount of a new element
			if (newChild.tag === Copy) {
				value =
					typeof oldChild === "object"
						? getInflightValue<TNode>(oldChild)
						: oldChild;
				if (typeof newChild.ref === "function") {
					if (isPromiseLike(value)) {
						value.then(newChild.ref).catch(NOOP);
					} else {
						newChild.ref(value);
					}
				}

				newChild = oldChild;
			} else {
				newChild = new Element(
					newChild.tag,
					newChild.props,
					newChild.key,
					newChild.ref,
				);
				if (typeof newChild.tag === "function") {
					newChild._n = new Context(
						renderer,
						root,
						host,
						ctx,
						scope,
						newChild as Element<Component>,
					);

					value = updateCtx(newChild._n);
				} else {
					if (newChild.tag === Raw) {
						if (typeof newChild.props.value === "string") {
							newChild._n = renderer.parse(newChild.props.value, scope);
						} else {
							newChild._n = newChild.props.value;
						}

						value = newChild._n;
						if (newChild.ref) {
							newChild.ref(value);
						}
					} else if (newChild.tag !== Portal && newChild.tag !== Fragment) {
						newChild._n = renderer.create(newChild.tag, newChild.props, scope);
						value = update(
							renderer,
							root,
							host,
							ctx,
							scope,
							newChild,
							undefined,
						);
					} else {
						value = update(
							renderer,
							root,
							host,
							ctx,
							scope,
							newChild,
							undefined,
						);
					}
				}

				if (isPromiseLike(value)) {
					newChild._fb = oldChild;
				}
			}
		} else if (typeof newChild === "string") {
			newChild = value = renderer.escape(newChild, scope);
		}

		narrowedNewChildren[j] = newChild;
		childValues[j] = value;
		isAsync = isAsync || isPromiseLike(value);
		// TODO: Can we shoehorn this logic into the previous branch?
		if (typeof oldChild === "object" && oldChild !== newChild) {
			if (!graveyard) {
				graveyard = [];
			}

			graveyard.push(oldChild);
		}
	}

	// cleanup
	for (; i < oldChildren.length; i++) {
		const oldChild = oldChildren[i];
		if (typeof oldChild === "object" && typeof oldChild.key === "undefined") {
			graveyard = graveyard || [];
			graveyard.push(oldChild);
		}
	}

	if (childrenByKey !== undefined && childrenByKey.size > 0) {
		graveyard = graveyard || [];
		graveyard.push(...childrenByKey.values());
	}

	parent._ch = unwrap(narrowedNewChildren);
	if (isAsync) {
		let childValues1 = Promise.all(childValues).finally(() => {
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

		if (parent._oncv) {
			parent._oncv(childValues1);
		}

		parent._oncv = onChildValues;
		return childValues1.then((childValues) => {
			reset(parent);
			return normalize(childValues);
		});
	}

	if (graveyard) {
		for (let i = 0; i < graveyard.length; i++) {
			unmount(renderer, host, ctx, graveyard[i]);
		}
	}

	if (parent._oncv) {
		parent._oncv(childValues);
		parent._oncv = undefined;
	}

	reset(parent);
	// We can assert there are no promises in the array because isAsync is false
	return normalize(childValues as Array<ElementValue<TNode>>);
}

// TODO: delete
function updateChildren<TNode, TScope, TRoot, TResult>(
	renderer: Renderer<TNode, TScope, TRoot, TResult>,
	root: TRoot,
	host: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: TScope,
	el: Element,
	children: Children,
	// TODO: refine type
	oldProps: any,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	const childValues = diffChildren(
		renderer,
		root,
		host,
		ctx,
		scope,
		el,
		children,
	);

	if (isPromiseLike(childValues)) {
		el._inf = childValues.then((childValues) =>
			commit(renderer, el, childValues, oldProps),
		);
		return el._inf;
	}

	return commit(renderer, el, childValues, oldProps);
}

function reset(el: Element): void {
	if (el._inf) {
		// inflightValue(s)
		el._inf = undefined;
	}

	// We use an undefined check because we need to handle fallback being the
	// empty string.
	if (typeof el._fb !== "undefined") {
		// fallback
		el._fb = undefined;
	}
}

function commit<TNode, TScope, TRoot, TResult>(
	renderer: Renderer<TNode, TScope, TRoot, TResult>,
	el: Element,
	childValues: Array<TNode | string>,
	// TODO: refine type
	oldProps: any,
): ElementValue<TNode> {
	let value: ElementValue<TNode>;
	if (typeof el.tag === "function") {
		throw new Error("TODO: THIS SHOULD NO LONGER HAPPEN");
	} else if (el.tag === Raw) {
		throw new Error("TODO: THIS SHOULD NO LONGER HAPPEN");
	} else if (el.tag === Fragment) {
		value = unwrap(childValues);
	} else {
		// element is a host or portal element
		renderer.arrange(
			el.tag === Portal ? el.props.root : el._n,
			el.tag,
			el.props,
			childValues,
			oldProps,
			wrap(el._cv) as Array<TNode | string>,
		);

		if (el.tag === Portal) {
			completeRender(renderer, el.props.root);
		} else {
			value = el._n;
		}

		el._cv = unwrap(childValues);
	}

	// TODO: Move this out of here.
	if (el.ref) {
		el.ref(renderer.read(value));
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
		unmountCtx(el._n);
		ctx = el._n;
	} else if (el.tag === Portal) {
		host = el as Element<Portal>;
		renderer.arrange(
			host.props.root,
			Portal,
			host.props,
			[],
			host.props,
			wrap(host._cv) as Array<TNode | string>,
		);
		completeRender(renderer, host.props.root);
	} else if (el.tag !== Fragment) {
		if (isEventTarget(el._n)) {
			const records = getListenerRecords(ctx, host);
			for (let i = 0; i < records.length; i++) {
				const record = records[i];
				el._n.removeEventListener(record.type, record.callback, record.options);
			}
		}

		renderer.dispose(el._n, el.tag, el.props);
		host = el as Element<string | symbol>;
	}

	const children = wrap(el._ch);
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (typeof child === "object") {
			unmount(renderer, host, ctx, child);
		}
	}
}

// TODO: Now that we have element flags again, we should probably merge these flags.
/*** CONTEXT FLAGS ***/
/**
 * A flag which is set when the component is being updated by the parent and
 * cleared when the component has committed. Used to determine whether the
 * nearest host ancestor needs to be rearranged.
 */
const IsUpdating = 1 << 0;

/**
 * A flag which is set when the component function or generator is
 * synchronously executing. This flags is used to ensure that a component which
 * triggers a second update in the course of rendering does not cause an stack
 * overflow or a generator error.
 */
const IsExecuting = 1 << 1;

/**
 * A flag used to make sure multiple values are not pulled from context prop
 * iterators without a yield.
 */
const IsIterating = 1 << 2;

/**
 * A flag used by async generator components in conjunction with the
 * onavailable (_oa) callback to mark whether new props can be pulled via the
 * context async iterator. See the Symbol.asyncIterator method and the
 * resumeCtx function.
 */
const IsAvailable = 1 << 3;

/**
 * A flag which is set when a generator components returns, i.e. the done
 * property on the iteration is set to true. Generator components will stick to
 * their last rendered value and ignore further updates.
 */
const IsDone = 1 << 4;

/**
 * A flag which is set when a generator component errors.
 *
 * NOTE: This is mainly used to prevent some false positives in component
 * yields or returns undefined warnings. The reason we’re using this versus
 * IsUnmounted is a very troubling jest test (cascades sync generator parent
 * and sync generator child) where synchronous code causes a stack overflow
 * error in a non-deterministic way. Deeply disturbing stuff.
 */
const IsErrored = 1 << 5;

/**
 * A flag which is set when the component is unmounted. Unmounted components
 * are no longer in the element tree and cannot refresh or rerender.
 */
const IsUnmounted = 1 << 6;

/**
 * A flag which indicates that the component is a sync generator component.
 */
const IsSyncGen = 1 << 7;

/**
 * A flag which indicates that the component is an async generator component.
 */
const IsAsyncGen = 1 << 8;

/**
 * A flag which is set while schedule callbacks are called.
 */
const IsScheduling = 1 << 9;

/**
 * A flag which is set when a schedule callback calls refresh.
 */
const IsSchedulingRefresh = 1 << 10;

export interface Context extends Crank.Context {}

/**
 * An interface which can be extended to provide strongly typed provisions.
 * See Context.prototype.consume and Context.prototype.provide.
 */
export interface ProvisionMap extends Crank.ProvisionMap {}

const provisionMaps = new WeakMap<Context, Map<unknown, unknown>>();

const scheduleMap = new WeakMap<Context, Set<Function>>();

const cleanupMap = new WeakMap<Context, Set<Function>>();

const rootMap = new WeakMap<
	object, // TRoot
	Map<Context, Set<Function>>
>();

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
	 * flags - A bitmask. See CONTEXT FLAGS above.
	 */
	declare _f: number;

	/**
	 * @internal
	 * renderer - The renderer which created this context.
	 */
	declare _re: Renderer<unknown, unknown, unknown, TResult>;

	/**
	 * @internal
	 * root - The root node as set by the nearest ancestor portal.
	 */
	declare _rt: unknown;

	/**
	 * @internal
	 * host - The nearest ancestor host element.
	 *
	 * When refresh is called, the host element will be arranged as the last step
	 * of the commit, to make sure the parent’s children properly reflects the
	 * components’s children.
	 */
	declare _ho: Element<string | symbol>;

	/**
	 * @internal
	 * parent - The parent context.
	 */
	declare _pa: Context<unknown, TResult> | undefined;

	/**
	 * @internal
	 * scope - The value of the scope at the point of element’s creation.
	 */
	declare _sc: unknown;

	/**
	 * @internal
	 * el - The associated component element.
	 */
	declare _el: Element<Component>;

	/**
	 * @internal
	 * iterator - The iterator returned by the component function.
	 */
	declare _it:
		| Iterator<Children, Children | void, unknown>
		| AsyncIterator<Children, Children | void, unknown>
		| undefined;

	/*** async properties ***/
	/**
	 * @internal
	 * onavailable - A callback used in conjunction with the IsAvailable flag to
	 * implement the props async iterator. See the Symbol.asyncIterator method
	 * and the resumeCtx function.
	 */
	declare _oa: Function | undefined;

	// See the stepCtx/advanceCtx/runCtx functions for more notes on the
	// inflight/enqueued block/value properties.
	/**
	 * @internal
	 * inflightBlock
	 */
	declare _ib: Promise<unknown> | undefined;

	// TODO: Can we combine this with element.inflightValue somehow please.
	/**
	 * @internal
	 * inflightValue
	 */
	declare _iv: Promise<ElementValue<any>> | undefined;

	/**
	 * @internal
	 * enqueuedBlock
	 */
	declare _eb: Promise<unknown> | undefined;

	/**
	 * @internal
	 * enqueuedValue
	 */
	declare _ev: Promise<ElementValue<any>> | undefined;

	/**
	 * @internal
	 * Contexts should never be instantiated directly.
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
		this._it = undefined; // iterator
		this._oa = undefined; // onavailable
		this._ib = undefined; // inflightBlock
		this._iv = undefined; // inflightValue
		this._eb = undefined; // enqueuedBlock
		this._ev = undefined; // enqueuedValue
	}

	/**
	 * The current props of the associated element.
	 *
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
		let callbacks = scheduleMap.get(this);
		if (!callbacks) {
			callbacks = new Set<Function>();
			scheduleMap.set(this, callbacks);
		}

		callbacks.add(callback);
	}

	/**
	 * Registers a callback which fires when the component’s children are
	 * rendered into the root. Will only fire once per callback and render.
	 */
	flush(callback: (value: TResult) => unknown): void {
		if (typeof this._rt !== "object" || this._rt === null) {
			return;
		}

		let flushMap = rootMap.get(this._rt);
		if (!flushMap) {
			flushMap = new Map<Context, Set<Function>>();
			rootMap.set(this._rt, flushMap);
		}

		let callbacks = flushMap.get(this);
		if (!callbacks) {
			callbacks = new Set<Function>();
			flushMap.set(this, callbacks);
		}

		callbacks.add(callback);
	}

	/**
	 * Registers a callback which fires when the component unmounts. Will only
	 * fire once per callback.
	 */
	cleanup(callback: (value: TResult) => unknown): void {
		let callbacks = cleanupMap.get(this);
		if (!callbacks) {
			callbacks = new Set<Function>();
			cleanupMap.set(this, callbacks);
		}

		callbacks.add(callback);
	}

	consume<TKey extends keyof ProvisionMap>(key: TKey): ProvisionMap[TKey];
	consume(key: unknown): any;
	consume(key: unknown): any {
		for (let parent = this._pa; parent !== undefined; parent = parent._pa) {
			const provisions = provisionMaps.get(parent);
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
		let provisions = provisionMaps.get(this);
		if (!provisions) {
			provisions = new Map();
			provisionMaps.set(this, provisions);
		}

		provisions.set(key, value);
	}

	addEventListener<T extends string>(
		type: T,
		listener: MappedEventListenerOrEventListenerObject<T> | null,
		options?: boolean | AddEventListenerOptions,
	): void {
		let listeners: Array<EventListenerRecord>;
		if (listener == null) {
			return;
		} else {
			const listeners1 = listenersMap.get(this);
			if (listeners1) {
				listeners = listeners1;
			} else {
				listeners = [];
				listenersMap.set(this, listeners);
			}
		}

		options = normalizeListenerOptions(options);
		let callback: MappedEventListener<T>;
		if (typeof listener === "object") {
			callback = () => listener.handleEvent.apply(listener, arguments as any);
		} else {
			callback = listener;
		}

		const record: EventListenerRecord = {type, callback, listener, options};
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
		const listeners = listenersMap.get(this);
		if (listener == null || listeners == null) {
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
		for (const value of getChildValues(this._el)) {
			if (isEventTarget(value)) {
				value.removeEventListener(record.type, record.callback, record.options);
			}
		}
	}

	dispatchEvent(ev: Event): boolean {
		const path: Array<Context> = [];
		for (let parent = this._pa; parent !== undefined; parent = parent._pa) {
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
		setEventProperty(ev, "target", this);

		// The only possible errors in this block are errors thrown by callbacks,
		// and dispatchEvent will only log these errors rather than throwing
		// them. Therefore, we place all code in a try block, log errors in the
		// catch block, and use an unsafe return statement in the finally block.
		//
		// Each early return within the try block returns true because while the
		// return value is overridden in the finally block, TypeScript
		// (justifiably) does not recognize the unsafe return statement.
		//
		// TODO: Run all callbacks even if one of them errors
		try {
			setEventProperty(ev, "eventPhase", CAPTURING_PHASE);
			for (let i = path.length - 1; i >= 0; i--) {
				const target = path[i];
				const listeners = listenersMap.get(target);
				if (listeners) {
					setEventProperty(ev, "currentTarget", target);
					for (const record of listeners) {
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

			{
				const listeners = listenersMap.get(this);
				if (listeners) {
					setEventProperty(ev, "eventPhase", AT_TARGET);
					setEventProperty(ev, "currentTarget", this);
					for (const record of listeners) {
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
			}

			if (ev.bubbles) {
				setEventProperty(ev, "eventPhase", BUBBLING_PHASE);
				for (let i = 0; i < path.length; i++) {
					const target = path[i];
					const listeners = listenersMap.get(target);
					if (listeners) {
						setEventProperty(ev, "currentTarget", target);
						for (const record of listeners) {
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
function ctxContains(parent: Context, child: Context): boolean {
	for (
		let current: Context | undefined = child;
		current !== undefined;
		current = current._pa
	) {
		if (current === parent) {
			return true;
		}
	}

	return false;
}

/**
 * This function is responsible for executing the component and handling all
 * the different component types.
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
	if (!ctx._it) {
		ctx._f |= IsExecuting;
		clearEventListeners(ctx);
		let result: ReturnType<Component>;
		try {
			result = el.tag.call(ctx, el.props);
		} catch (err) {
			ctx._f |= IsErrored;
			throw err;
		} finally {
			ctx._f &= ~IsExecuting;
		}

		if (isIteratorLike(result)) {
			ctx._it = result;
		} else if (isPromiseLike(result)) {
			// async function component
			const result1 =
				result instanceof Promise ? result : Promise.resolve(result);
			const value = result1.then(
				(result) => updateCtxChildren<TNode, TResult>(ctx, result),
				(err) => {
					ctx._f |= IsErrored;
					throw err;
				},
			);
			return [result1, value];
		} else {
			// sync function component
			return [undefined, updateCtxChildren<TNode, TResult>(ctx, result)];
		}
	}

	let oldValue: Promise<TResult> | TResult;
	if (initial) {
		// The argument passed to the first call to next is ignored.
		oldValue = undefined as any;
	} else if (ctx._el._inf) {
		// The value passed back into the generator as the argument to the next
		// method is a promise if an async generator component has async children.
		// Sync generator components only resume when their children have fulfilled
		// so the element’s inflight child values will never be defined.
		oldValue = ctx._el._inf.then(ctx._re.read, () => ctx._re.read(undefined));
	} else {
		oldValue = ctx._re.read(getValue(el));
	}

	let iteration: ChildrenIteration;
	ctx._f |= IsExecuting;
	try {
		iteration = ctx._it.next(oldValue);
	} catch (err) {
		ctx._f |= IsDone | IsErrored;
		throw err;
	} finally {
		ctx._f &= ~IsExecuting;
	}

	if (isPromiseLike(iteration)) {
		// async generator component
		if (initial) {
			ctx._f |= IsAsyncGen;
		}

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
				ctx._f |= IsDone | IsErrored;
				throw err;
			},
		);

		return [iteration, value];
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
 * Called when the inflight block promise settles.
 */
function advanceCtx(ctx: Context): void {
	// _ib - inflightBlock
	// _iv - inflightValue
	// _eb - enqueuedBlock
	// _ev - enqueuedValue
	ctx._ib = ctx._eb;
	ctx._iv = ctx._ev;
	ctx._eb = undefined;
	ctx._ev = undefined;
	if (ctx._f & IsAsyncGen && !(ctx._f & IsDone) && !(ctx._f & IsUnmounted)) {
		runCtx(ctx);
	}
}

/**
 * Enqueues and executes the component associated with the context.
 *
 * The functions stepCtx, advanceCtx and runCtx work together to implement the
 * async queueing behavior of components. The runCtx function calls the stepCtx
 * function, which returns two results in a tuple. The first result, called the
 * “block,” is a possible promise which represents the duration for which the
 * component is blocked from accepting new updates. The second result, called
 * the “value,” is the actual result of the update. The runCtx function caches
 * block/value from the stepCtx function on the context, according to whether
 * the component blocks. The “inflight” block/value properties are the
 * currently executing update, and the “enqueued” block/value properties
 * represent an enqueued next stepCtx. Enqueued steps are dequeued every time
 * the current block promise settles.
 */
function runCtx<TNode, TResult>(
	ctx: Context<unknown, TResult>,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (!ctx._ib) {
		try {
			const [block, value] = stepCtx<TNode, TResult>(ctx);
			if (block) {
				ctx._ib = block
					.catch((err) => {
						if (!(ctx._f & IsUpdating)) {
							return propagateError<TNode>(ctx._pa, err);
						}
					})
					.finally(() => advanceCtx(ctx));
				// stepCtx will only return a block if the value is asynchronous
				ctx._iv = value as Promise<ElementValue<TNode>>;
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
					if (block) {
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
 * Called to make props available to the props async iterator for async
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
	if (ctx._f & IsUnmounted || ctx._f & IsErrored) {
		return;
	} else if (children === undefined) {
		console.error(
			"A component has returned or yielded undefined. If this was intentional, return or yield null instead.",
		);
	}
	const childValues = diffChildren(
		ctx._re as Renderer<TNode, unknown, unknown, TResult>,
		ctx._rt,
		ctx._ho,
		ctx,
		ctx._sc,
		ctx._el,
		narrow(children),
	);

	if (isPromiseLike(childValues)) {
		ctx._el._inf = childValues.then((childValues) =>
			commitCtx(ctx, childValues),
		);
		return ctx._el._inf;
	}

	return commitCtx(ctx, childValues);
}

function commitCtx<TNode>(
	ctx: Context,
	values: Array<TNode | string>,
): ElementValue<TNode> {
	if (ctx._f & IsUnmounted) {
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

	if (ctx._f & IsScheduling) {
		ctx._f |= IsSchedulingRefresh;
	} else if (!(ctx._f & IsUpdating)) {
		// If we’re not updating, the component, which happens when components are
		// refreshed, or when async generator components iterate, we have to do a
		// little bit housekeeping.
		const records = getListenerRecords(ctx._pa, ctx._ho);
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
		// TODO: If we’re retaining the oldChildValues, we can do a quick check to
		// make sure this work isn’t necessary as a performance optimization.
		const host = ctx._ho;
		const hostValues = getChildValues(host);
		ctx._re.arrange(
			host.tag === Portal ? host.props.root : host._n,
			host.tag,
			host.props,
			hostValues,
			// props and oldProps are the same because the host isn’t updated.
			host.props,
			wrap(host._cv),
		);

		host._cv = hostValues;
		completeRender(ctx._re, ctx._rt, ctx);
	}

	let value = unwrap(values);
	const callbacks = scheduleMap.get(ctx);
	if (callbacks) {
		scheduleMap.delete(ctx);
		ctx._f |= IsScheduling;
		const value1 = ctx._re.read(value);
		for (const callback of callbacks) {
			callback(value1);
		}

		ctx._f &= ~IsScheduling;
		// Handles an edge case where refresh() is called during a schedule().
		if (ctx._f & IsSchedulingRefresh) {
			ctx._f &= ~IsSchedulingRefresh;
			value = getValue(ctx._el);
		}
	}

	ctx._f &= ~IsUpdating;

	if (typeof ctx._el.ref === "function") {
		ctx._el.ref(value);
	}

	return value;
}

// TODO: async unmounting
function unmountCtx(ctx: Context): void {
	ctx._f |= IsUnmounted;
	clearEventListeners(ctx);
	const callbacks = cleanupMap.get(ctx);
	if (callbacks) {
		cleanupMap.delete(ctx);
		const value = ctx._re.read(getValue(ctx._el));
		for (const callback of callbacks) {
			callback(value);
		}
	}

	if (!(ctx._f & IsDone)) {
		ctx._f |= IsDone;
		resumeCtx(ctx);
		if (ctx._it && typeof ctx._it.return === "function") {
			ctx._f |= IsExecuting;
			try {
				const iteration = ctx._it.return();
				if (isPromiseLike(iteration)) {
					iteration.catch((err) => propagateError<unknown>(ctx._pa, err));
				}
			} finally {
				ctx._f &= ~IsExecuting;
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
	callback: MappedEventListener<any>;
	listener: MappedEventListenerOrEventListenerObject<any>;
	options: AddEventListenerOptions;
}

const listenersMap = new WeakMap<Context, Array<EventListenerRecord>>();

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
	ctx: Context | undefined,
	host: Element<string | symbol>,
): Array<EventListenerRecord> {
	let listeners: Array<EventListenerRecord> = [];
	while (ctx !== undefined && ctx._ho === host) {
		const listeners1 = listenersMap.get(ctx);
		if (listeners1) {
			listeners = listeners.concat(listeners1);
		}

		ctx = ctx._pa;
	}

	return listeners;
}

function clearEventListeners(ctx: Context): void {
	const listeners = listenersMap.get(ctx);
	if (listeners && listeners.length) {
		for (const value of getChildValues(ctx._el)) {
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
		ctx._f |= IsDone | IsErrored;
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
				ctx._f |= IsDone | IsErrored;
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
