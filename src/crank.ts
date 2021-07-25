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

type RetainerChild<TNode> = Retainer<TNode> | string | undefined;

class Retainer<TNode> {
	declare el: Element;
	declare ctrl: Controller<TNode> | undefined;
	declare children: Array<RetainerChild<TNode>> | RetainerChild<TNode>;
	declare value: TNode | string | undefined;
	declare cached: ElementValue<TNode>;
	declare fallback: RetainerChild<TNode>;
	declare inflight: Promise<ElementValue<TNode>> | undefined;
	declare onCommit: Function | undefined;
	constructor(el: Element) {
		this.el = el;
		this.value = undefined;
		this.ctrl = undefined;
		this.children = undefined;
		this.cached = undefined;
		this.fallback = undefined;
		this.inflight = undefined;
		this.onCommit = undefined;
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

// TODO: Now that we’re caching child values for host elements, we might
// reconsider using/invalidating these cached values in this function again.
/**
 * Walks an element’s children to find its child values.
 *
 * @returns A normalized array of nodes and strings.
 */
function getChildValues<TNode>(ret: Retainer<TNode>): Array<TNode | string> {
	const values: Array<ElementValue<TNode>> = [];
	const children = wrap(ret.children);
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (child) {
			values.push(typeof child === "string" ? child : getValue(child));
		}
	}

	return normalize(values);
}

// TODO: Document the interface and methods
export interface RendererImpl<
	TNode,
	TScope,
	TRoot extends TNode = TNode,
	TResult = ElementValue<TNode>,
> {
	create<TTag extends string | symbol>(
		tag: TTag,
		props: TagProps<TTag>,
		scope: TScope | undefined,
	): TNode;

	scope<TTag extends string | symbol>(
		tag: TTag,
		props: TagProps<TTag>,
		scope: TScope | undefined,
	): TScope | undefined;

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
	 * Rather than returning text nodes for whatever environment we’re rendering
	 * to, we defer that step for Renderer.prototype.arrange. We do this so that
	 * adjacent strings can be concatenated and the actual element tree can be
	 * rendered in a normalized form.
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
	parse(text: string, scope: TScope | undefined): TNode | string;

	patch<TTag extends string | symbol>(
		node: TNode,
		tag: TTag,
		props: TagProps<TTag>,
		oldProps: TagProps<TTag> | undefined,
	): unknown;

	arrange<TTag extends string | symbol>(
		node: TNode,
		tag: TTag,
		props: TagProps<TTag>,
		children: Array<TNode | string>,
		oldProps: TagProps<TTag> | undefined,
		oldChildren: Array<TNode | string> | undefined,
	): unknown;

	dispose<TTag extends string | symbol>(
		node: TNode,
		tag: TTag,
		props: TagProps<TTag>,
	): unknown;

	flush(root: TRoot): unknown;
}

const defaultRendererImpl: RendererImpl<unknown, unknown, unknown, unknown> = {
	create() {
		throw new Error("Not implemented");
	},
	scope: (_tag, _props, scope) => scope,
	read: (value) => value,
	escape: (text) => text,
	parse: (text) => text,
	patch: NOOP,
	arrange: NOOP,
	dispose: NOOP,
	flush: NOOP,
};

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
	TNode,
	TScope,
	TRoot extends TNode = TNode,
	TResult = ElementValue<TNode>,
> {
	/**
	 * @internal
	 * A weakmap which stores element trees by root.
	 */
	declare cache: WeakMap<object, Retainer<TNode>>;

	declare impl: RendererImpl<TNode, TScope, TRoot, TResult>;
	constructor(impl: Partial<RendererImpl<TNode, TScope, TRoot, TResult>>) {
		this.cache = new WeakMap();
		this.impl = {
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
		bridgeCtx?: Context | undefined,
	): Promise<TResult> | TResult {
		let ret: Retainer<TNode> | undefined;
		const ctrl = bridgeCtx && (bridgeCtx[ControllerSymbol] as Controller<any>);
		if (typeof root === "object" && root !== null) {
			ret = this.cache.get(root as any);
		}

		let oldProps: any;
		if (ret === undefined) {
			ret = new Retainer(createElement(Portal, {children, root}));
			ret.value = root;
			ret.ctrl = ctrl;
			if (typeof root === "object" && root !== null && children != null) {
				this.cache.set(root as any, ret);
			}
		} else if (ret.ctrl !== ctrl) {
			throw new Error("Context mismatch");
		} else {
			oldProps = ret.el.props;
			ret.el = createElement(Portal, {children, root});
			if (typeof root === "object" && root !== null && children == null) {
				this.cache.delete(root as unknown as object);
			}
		}

		const childValues = diffChildren(
			this.impl,
			root,
			ret,
			ctrl,
			undefined,
			ret,
			children,
		);

		// We return the child values of the portal because portal elements
		// themselves have no readable value.
		if (isPromiseLike(childValues)) {
			return childValues.then((childValues) => {
				// element is a host or portal element
				if (root !== undefined) {
					this.impl.arrange(
						root,
						Portal,
						ret!.el.props,
						childValues,
						oldProps,
						wrap(ret!.cached),
					);
					flush(this.impl, root);
				}

				ret!.cached = unwrap(childValues);
				if (root == null) {
					unmount(this.impl, ret!, ctrl, ret!);
				}

				return this.impl.read(ret!.cached);
			});
		}

		// element is a host or portal element
		if (root !== undefined) {
			this.impl.arrange(
				root,
				Portal,
				ret.el.props,
				childValues,
				oldProps,
				wrap(ret.cached),
			);
			flush(this.impl, root);
		}

		ret.cached = unwrap(childValues);
		if (root == null) {
			unmount(this.impl, ret, ctrl, ret);
		}

		return this.impl.read(ret.cached);
	}
}

/*** PRIVATE RENDERER FUNCTIONS ***/
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

function diffChildren<TNode, TScope, TRoot extends TNode, TResult>(
	renderer: RendererImpl<TNode, TScope, TRoot, TResult>,
	root: TRoot | undefined,
	host: Retainer<TNode>,
	ctrl: Controller<TNode, TScope, TRoot, TResult> | undefined,
	scope: TScope | undefined,
	parent: Retainer<TNode>,
	children: Children,
): Promise<Array<TNode | string>> | Array<TNode | string> {
	const oldRetains = wrap(parent.children);
	const newRetains: Array<RetainerChild<TNode>> = [];
	const newChildren = arrayify(children);
	const values: Array<Promise<ElementValue<TNode>> | ElementValue<TNode>> = [];
	let graveyard: Array<Retainer<TNode>> | undefined;
	let childrenByKey: Map<Key, Retainer<TNode>> | undefined;
	let seenKeys: Set<Key> | undefined;
	let isAsync = false;
	let i = 0;
	for (
		let j = 0, il = oldRetains.length, jl = newChildren.length;
		j < jl;
		j++
	) {
		// We make sure we don’t access indices out of bounds
		let ret = i >= il ? undefined : oldRetains[i];
		let child = narrow(newChildren[j]);
		{
			// Aligning based on key
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

				i++;
			} else {
				childrenByKey = childrenByKey || createChildrenByKey(oldRetains, i);
				if (newKey === undefined) {
					while (ret !== undefined && oldKey !== undefined) {
						i++;
						ret = oldRetains[i];
						oldKey = typeof ret === "object" ? ret.el.key : undefined;
					}

					i++;
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
				value = copy(ret);
			} else {
				let matches = false;
				let oldProps: any;
				// TODO: Figure out why the new conditional expression alias analysis
				// in TypeScript 4.4. isn’t working. Moving this condition into
				// matches doesn’t seem to work.
				if (typeof ret === "object" && ret.el.tag === child.tag) {
					matches = true;
					oldProps = ret.el.props;
					ret.el = child;
				} else {
					if (typeof ret === "object") {
						(graveyard = graveyard || []).push(ret);
					}

					const fallback = ret;
					ret = new Retainer<TNode>(child);
					ret.fallback = fallback;
				}

				if (typeof child.tag === "function") {
					if (!matches) {
						ret.ctrl = new Controller(renderer, root, host, ctrl, scope, ret);
					}

					value = updateCtx(ret.ctrl!);
				} else if (child.tag === Raw) {
					// value = raw(renderer, ret, props, oldProps);
					if (typeof child.props.value === "string") {
						if (!oldProps || oldProps.value !== child.props.value) {
							ret.value = renderer.parse(child.props.value, scope);
						}
					} else {
						ret.value = child.props.value;
					}

					value = ret.value;
				} else if (child.tag === Fragment) {
					// value = fragment(renderer, root, host, ctx, scope, ret);
					const childValues = diffChildren(
						renderer,
						root,
						host,
						ctrl,
						scope,
						ret,
						ret.el.props.children,
					);

					if (isPromiseLike(childValues)) {
						value = ret.inflight = childValues.then((childValues) =>
							unwrap(childValues),
						);
					} else {
						value = unwrap(childValues);
					}
				} else {
					if (child.tag === Portal) {
						root = ret.value = child.props.root;
						scope = undefined;
					} else {
						if (!matches) {
							ret.value = renderer.create(child.tag, child.props, scope);
						}

						renderer.patch(
							ret.value as TNode,
							child.tag,
							child.props,
							oldProps,
						);
						scope = renderer.scope(child.tag, child.props, scope);
					}

					host = ret;
					// value = host(renderer, root, host, ctx, scope, ret, oldProps);
					const childValues = diffChildren(
						renderer,
						root,
						host,
						ctrl,
						scope,
						ret,
						ret.el.props.children,
					);

					if (isPromiseLike(childValues)) {
						// aliasing because the callback scope resets ret to original type
						const ret1: Retainer<TNode> = ret;
						value = ret.inflight = childValues.then((childValues) => {
							let value: ElementValue<TNode>;
							renderer.arrange(
								ret1.value as TNode,
								ret1.el.tag as string | symbol,
								ret1.el.props,
								childValues,
								oldProps,
								wrap(ret1.cached) as Array<TNode | string>,
							);

							if (ret1.el.tag === Portal) {
								flush(renderer, ret1.el.props.root);
							} else {
								value = ret1.value;
							}

							ret1.cached = unwrap(childValues);
							return value;
						});
					} else {
						renderer.arrange(
							ret.value as TNode,
							ret.el.tag as string | symbol,
							ret.el.props,
							childValues,
							oldProps,
							wrap(ret.cached) as Array<TNode | string>,
						);

						if (ret.el.tag === Portal) {
							flush(renderer, ret.el.props.root);
						} else {
							value = ret.value;
						}

						ret.cached = unwrap(childValues);
					}
				}
			}

			if (isPromiseLike(value)) {
				isAsync = true;
				if (typeof child.ref === "function") {
					value = value.then((value) => {
						(child as Element).ref!(renderer.read(value));
						return value;
					});
				}
			} else if (typeof child.ref === "function") {
				child.ref(renderer.read(value));
			}
		} else {
			// child is a string or undefined
			if (typeof ret === "object") {
				(graveyard = graveyard || []).push(ret);
			}

			if (typeof child === "string") {
				value = ret = renderer.escape(child, scope);
			}
		}

		values[j] = value;
		newRetains[j] = ret;
	}

	{
		// cleanup remaining retainers
		for (; i < oldRetains.length; i++) {
			const ret = oldRetains[i];
			if (typeof ret === "object" && typeof ret.el.key === "undefined") {
				(graveyard = graveyard || []).push(ret);
			}
		}

		if (childrenByKey !== undefined && childrenByKey.size > 0) {
			(graveyard = graveyard || []).push(...childrenByKey.values());
		}
	}

	parent.children = unwrap(newRetains);
	if (isAsync) {
		let childValues1 = Promise.all(values).finally(() => {
			if (graveyard) {
				for (let i = 0; i < graveyard.length; i++) {
					unmount(renderer, host, ctrl, graveyard[i]);
				}
			}
		});

		let onChildValues!: Function;
		childValues1 = Promise.race([
			childValues1,
			new Promise<any>((resolve) => (onChildValues = resolve)),
		]);

		if (parent.onCommit) {
			parent.onCommit(childValues1);
		}

		parent.onCommit = onChildValues;
		return childValues1.then((childValues) => {
			parent.inflight = parent.fallback = undefined;
			return normalize(childValues);
		});
	}

	if (graveyard) {
		for (let i = 0; i < graveyard.length; i++) {
			unmount(renderer, host, ctrl, graveyard[i]);
		}
	}

	if (parent.onCommit) {
		parent.onCommit(values);
		parent.onCommit = undefined;
	}

	parent.inflight = parent.fallback = undefined;
	// We can assert there are no promises in the array because isAsync is false
	return normalize(values as Array<ElementValue<TNode>>);
}

function copy<TNode>(
	child: RetainerChild<TNode>,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (typeof child !== "object") {
		return child;
	}

	const ctrl: Controller<TNode> | undefined =
		typeof child.el.tag === "function" ? child.ctrl : undefined;
	if (ctrl && ctrl.f & IsUpdating && ctrl.inflightValue) {
		return ctrl.inflightValue;
	} else if (child.inflight) {
		return child.inflight;
	}

	return getValue(child);
}

function flush<TRoot>(
	renderer: RendererImpl<unknown, unknown, TRoot>,
	root: TRoot,
	initiatingCtx?: Context,
) {
	renderer.flush(root);
	if (typeof root !== "object" || root === null) {
		return;
	}

	const flushMap = flushMaps.get(root as unknown as object);
	if (flushMap) {
		if (initiatingCtx) {
			const flushMap1 = new Map<Context, Set<Function>>();
			for (let [ctx1, callbacks] of flushMap) {
				if (
					!ctrlContains(initiatingCtx[ControllerSymbol], ctx1[ControllerSymbol])
				) {
					flushMap.delete(ctx1);
					flushMap1.set(ctx1, callbacks);
				}
			}

			if (flushMap1.size) {
				flushMaps.set(root as unknown as object, flushMap1);
			} else {
				flushMaps.delete(root as unknown as object);
			}
		} else {
			flushMaps.delete(root as unknown as object);
		}

		for (const [ctx, callbacks] of flushMap) {
			const value = renderer.read(getValue(ctx[ControllerSymbol].ret));
			for (const callback of callbacks) {
				callback(value);
			}
		}
	}
}

function unmount<TNode, TScope, TRoot extends TNode, TResult>(
	renderer: RendererImpl<TNode, TScope, TRoot, TResult>,
	host: Retainer<TNode>,
	ctrl: Controller<TNode, TScope, TRoot, TResult> | undefined,
	ret: Retainer<TNode>,
): void {
	if (typeof ret.el.tag === "function") {
		ctrl = ret.ctrl! as Controller<TNode, TScope, TRoot, TResult>;
		unmountCtx(ctrl);
	} else if (ret.el.tag === Portal) {
		host = ret;
		renderer.arrange(
			host.value as TNode,
			Portal,
			host.el.props,
			[],
			host.el.props,
			wrap(host.cached) as Array<TNode | string>,
		);
		flush(renderer, host.el.props.root);
	} else if (ret.el.tag !== Fragment) {
		if (isEventTarget(ret.value)) {
			const records = getListenerRecords(ctrl && ctrl.ctx, host);
			for (let i = 0; i < records.length; i++) {
				const record = records[i];
				ret.value.removeEventListener(
					record.type,
					record.callback,
					record.options,
				);
			}
		}

		renderer.dispose(ret.value as TNode, ret.el.tag, ret.el.props);
		host = ret;
	}

	const children = wrap(ret.children);
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (typeof child === "object") {
			unmount(renderer, host, ctrl, child);
		}
	}
}

/*** CONTEXT FLAGS ***/
/**
 * A flag which is set when the component is being updated by the parent and
 * cleared when the component has committed. Used to determine things like
 * whether the nearest host ancestor needs to be rearranged.
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

// keys are roots
const flushMaps = new WeakMap<object, Map<Context, Set<Function>>>();

/**
 * @internal
 */
class Controller<
	TNode = unknown,
	TScope = unknown,
	TRoot extends TNode = TNode,
	TResult = unknown,
> {
	/**
	 * flags - A bitmask. See CONTEXT FLAGS above.
	 */
	declare f: number;

	/**
	 * context - The actual object passed as this to components
	 */
	declare ctx: Context<unknown, TResult>;

	/**
	 * renderer - The renderer which created this context.
	 */
	declare renderer: RendererImpl<TNode, TScope, TRoot, TResult>;

	/**
	 * root - The root node as set by the nearest ancestor portal.
	 */
	declare root: TRoot | undefined;

	/**
	 * host - The nearest host or portal retainer.
	 *
	 * When refresh is called, the host element will be arranged as the last step
	 * of the commit, to make sure the parent’s children properly reflects the
	 * components’s children.
	 */
	declare host: Retainer<TNode>;

	/**
	 * parent - The parent context.
	 */
	declare parent: Controller<TNode, TScope, TRoot, TResult> | undefined;

	/**
	 * scope - The value of the scope at the point of element’s creation.
	 */
	declare scope: TScope | undefined;

	/**
	 * retainer - The internal node associated with this context.
	 */
	declare ret: Retainer<TNode>;

	/**
	 * iterator - The iterator returned by the component function.
	 */
	declare iterator:
		| Iterator<Children, Children | void, unknown>
		| AsyncIterator<Children, Children | void, unknown>
		| undefined;

	/*** async properties ***/
	// See the stepCtx/advanceCtx/runCtx functions for more notes on the
	// inflight/enqueued block/value properties.
	/**
	 * inflightBlock
	 */
	declare inflightBlock: Promise<unknown> | undefined;

	// TODO: Can we combine this with retainer.inflight somehow please.
	/**
	 * inflightValue
	 */
	declare inflightValue: Promise<ElementValue<TNode>> | undefined;

	/**
	 * enqueuedBlock
	 */
	declare enqueuedBlock: Promise<unknown> | undefined;

	/**
	 * enqueuedValue
	 */
	declare enqueuedValue: Promise<ElementValue<TNode>> | undefined;

	/**
	 * onavailable - A callback used in conjunction with the IsAvailable flag to
	 * implement the props async iterator. See the Symbol.asyncIterator method
	 * and the resumeCtx function.
	 */
	declare onAvailable: Function | undefined;

	constructor(
		renderer: RendererImpl<TNode, TScope, TRoot, TResult>,
		root: TRoot | undefined,
		host: Retainer<TNode>,
		parent: Controller<TNode, TScope, TRoot, TResult> | undefined,
		scope: TScope | undefined,
		ret: Retainer<TNode>,
	) {
		this.f = 0;
		this.ctx = new Context(this);
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
		this.onAvailable = undefined;
	}
}

export const ControllerSymbol = Symbol.for("Crank.ControllerSymbol");

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
	declare [ControllerSymbol]: Controller<unknown, unknown, unknown, TResult>;

	constructor(ctrl: Controller<unknown, unknown, unknown, TResult>) {
		this[ControllerSymbol] = ctrl;
	}

	/**
	 * The current props of the associated element.
	 *
	 * Typically, you should read props either via the first parameter of the
	 * component or via the context iterator methods. This property is mainly for
	 * plugins or utilities which wrap contexts.
	 */
	get props(): TProps {
		return this[ControllerSymbol].ret.el.props;
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
		return this[ControllerSymbol].renderer.read(
			getValue(this[ControllerSymbol].ret),
		);
	}

	*[Symbol.iterator](): Generator<TProps> {
		const ctrl = this[ControllerSymbol];
		while (!(ctrl.f & IsDone)) {
			if (ctrl.f & IsIterating) {
				throw new Error("Context iterated twice without a yield");
			} else if (ctrl.f & IsAsyncGen) {
				throw new Error("Use for await…of in async generator components");
			}

			ctrl.f |= IsIterating;
			yield ctrl.ret.el.props!;
		}
	}

	async *[Symbol.asyncIterator](): AsyncGenerator<TProps> {
		// We use a do while loop rather than a while loop to handle an edge case
		// where an async generator component is unmounted synchronously and
		// therefore “done” before it starts iterating over the context.
		const ctrl = this[ControllerSymbol];
		do {
			if (ctrl.f & IsIterating) {
				throw new Error("Context iterated twice without a yield");
			} else if (ctrl.f & IsSyncGen) {
				throw new Error("Use for…of in sync generator components");
			}

			ctrl.f |= IsIterating;
			if (ctrl.f & IsAvailable) {
				ctrl.f &= ~IsAvailable;
			} else {
				await new Promise((resolve) => (ctrl.onAvailable = resolve));
				if (ctrl.f & IsDone) {
					break;
				}
			}

			yield ctrl.ret.el.props;
		} while (!(ctrl.f & IsDone));
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
		const ctrl = this[ControllerSymbol];
		if (ctrl.f & IsUnmounted) {
			console.error("Component is unmounted");
			return ctrl.renderer.read(undefined);
		} else if (ctrl.f & IsExecuting) {
			console.error("Component is already executing");
			return ctrl.renderer.read(undefined);
		}

		resumeCtx(ctrl);
		const value = runCtx(ctrl);
		if (isPromiseLike(value)) {
			return (value as Promise<any>).then((value) => ctrl.renderer.read(value));
		}

		return ctrl.renderer.read(value);
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
		const ctrl = this[ControllerSymbol];
		if (typeof ctrl.root !== "object" || ctrl.root === null) {
			return;
		}

		let flushMap = flushMaps.get(ctrl.root);
		if (!flushMap) {
			flushMap = new Map<Context, Set<Function>>();
			flushMaps.set(ctrl.root, flushMap);
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
		for (
			let parent = this[ControllerSymbol].parent;
			parent !== undefined;
			parent = parent.parent
		) {
			const provisions = provisionMaps.get(parent.ctx);
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
		for (const value of getChildValues(this[ControllerSymbol].ret)) {
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
		for (const value of getChildValues(this[ControllerSymbol].ret)) {
			if (isEventTarget(value)) {
				value.removeEventListener(record.type, record.callback, record.options);
			}
		}
	}

	dispatchEvent(ev: Event): boolean {
		const path: Array<Context> = [];
		for (
			let parent = this[ControllerSymbol].parent;
			parent !== undefined;
			parent = parent.parent
		) {
			path.push(parent.ctx);
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
function ctrlContains(parent: Controller, child: Controller): boolean {
	for (
		let current: Controller | undefined = child;
		current !== undefined;
		current = current.parent
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
	ctrl: Controller<TNode, unknown, TNode, TResult>,
): [
	Promise<unknown> | undefined,
	Promise<ElementValue<TNode>> | ElementValue<TNode>,
] {
	const ret = ctrl.ret as Retainer<TNode>;
	if (ctrl.f & IsDone) {
		return [undefined, getValue<TNode>(ret)];
	}

	const initial = !ctrl.iterator;
	if (initial) {
		ctrl.f |= IsExecuting;
		clearEventListeners(ctrl.ctx);
		let result: ReturnType<Component>;
		try {
			result = (ret.el.tag as Component).call(ctrl.ctx, ret.el.props);
		} catch (err) {
			ctrl.f |= IsErrored;
			throw err;
		} finally {
			ctrl.f &= ~IsExecuting;
		}

		if (isIteratorLike(result)) {
			ctrl.iterator = result;
		} else if (isPromiseLike(result)) {
			// async function component
			const result1 =
				result instanceof Promise ? result : Promise.resolve(result);
			const value = result1.then(
				(result) => updateCtxChildren<TNode, TResult>(ctrl, result),
				(err) => {
					ctrl.f |= IsErrored;
					throw err;
				},
			);
			return [result1, value];
		} else {
			// sync function component
			return [undefined, updateCtxChildren<TNode, TResult>(ctrl, result)];
		}
	}

	let oldValue: Promise<TResult> | TResult;
	if (initial) {
		// The argument passed to the first call to next is ignored.
		oldValue = undefined as any;
	} else if (ctrl.ret.inflight) {
		// The value passed back into the generator as the argument to the next
		// method is a promise if an async generator component has async children.
		// Sync generator components only resume when their children have fulfilled
		// so the element’s inflight child values will never be defined.
		oldValue = ctrl.ret.inflight.then(
			(value) => ctrl.renderer.read(value),
			() => ctrl.renderer.read(undefined),
		);
	} else {
		oldValue = ctrl.renderer.read(getValue(ret));
	}

	let iteration: ChildrenIteration;
	ctrl.f |= IsExecuting;
	try {
		iteration = ctrl.iterator!.next(oldValue);
	} catch (err) {
		ctrl.f |= IsDone | IsErrored;
		throw err;
	} finally {
		ctrl.f &= ~IsExecuting;
	}

	if (isPromiseLike(iteration)) {
		// async generator component
		if (initial) {
			ctrl.f |= IsAsyncGen;
		}

		const value: Promise<ElementValue<TNode>> = iteration.then(
			(iteration) => {
				if (!(ctrl.f & IsIterating)) {
					ctrl.f &= ~IsAvailable;
				}

				ctrl.f &= ~IsIterating;
				if (iteration.done) {
					ctrl.f |= IsDone;
				}

				try {
					const value = updateCtxChildren<TNode, TResult>(
						ctrl,
						iteration.value as Children,
					);

					if (isPromiseLike(value)) {
						return value.catch((err) => handleChildError(ctrl, err));
					}

					return value;
				} catch (err) {
					return handleChildError(ctrl, err);
				}
			},
			(err) => {
				ctrl.f |= IsDone | IsErrored;
				throw err;
			},
		);

		return [iteration, value];
	}

	// sync generator component
	if (initial) {
		ctrl.f |= IsSyncGen;
	}

	ctrl.f &= ~IsIterating;
	if (iteration.done) {
		ctrl.f |= IsDone;
	}

	let value: Promise<ElementValue<TNode>> | ElementValue<TNode>;
	try {
		value = updateCtxChildren<TNode, TResult>(
			ctrl,
			iteration.value as Children,
		);
		if (isPromiseLike(value)) {
			value = value.catch((err) => handleChildError(ctrl, err));
		}
	} catch (err) {
		value = handleChildError(ctrl, err);
	}

	if (isPromiseLike(value)) {
		return [value.catch(NOOP), value];
	}

	return [undefined, value];
}

/**
 * Called when the inflight block promise settles.
 */
function advanceCtx(ctrl: Controller): void {
	ctrl.inflightBlock = ctrl.enqueuedBlock;
	ctrl.inflightValue = ctrl.enqueuedValue;
	ctrl.enqueuedBlock = undefined;
	ctrl.enqueuedValue = undefined;
	if (ctrl.f & IsAsyncGen && !(ctrl.f & IsDone) && !(ctrl.f & IsUnmounted)) {
		runCtx(ctrl);
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
	ctrl: Controller<TNode, unknown, TNode, TResult>,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (!ctrl.inflightBlock) {
		try {
			const [block, value] = stepCtx<TNode, TResult>(ctrl);
			if (block) {
				ctrl.inflightBlock = block
					.catch((err) => {
						if (!(ctrl.f & IsUpdating)) {
							return propagateError<TNode>(ctrl.parent, err);
						}
					})
					.finally(() => advanceCtx(ctrl));
				// stepCtx will only return a block if the value is asynchronous
				ctrl.inflightValue = value as Promise<ElementValue<TNode>>;
			}

			return value;
		} catch (err) {
			if (!(ctrl.f & IsUpdating)) {
				return propagateError<TNode>(ctrl.parent, err);
			}

			throw err;
		}
	} else if (ctrl.f & IsAsyncGen) {
		return ctrl.inflightValue;
	} else if (!ctrl.enqueuedBlock) {
		let resolve: Function;
		ctrl.enqueuedBlock = ctrl.inflightBlock
			.then(() => {
				try {
					const [block, value] = stepCtx<TNode, TResult>(ctrl);
					resolve(value);
					if (block) {
						return block.catch((err) => {
							if (!(ctrl.f & IsUpdating)) {
								return propagateError<TNode>(ctrl.parent, err);
							}
						});
					}
				} catch (err) {
					if (!(ctrl.f & IsUpdating)) {
						return propagateError<TNode>(ctrl.parent, err);
					}
				}
			})
			.finally(() => advanceCtx(ctrl));
		ctrl.enqueuedValue = new Promise((resolve1) => (resolve = resolve1));
	}

	return ctrl.enqueuedValue;
}

/**
 * Called to make props available to the props async iterator for async
 * generator components.
 */
function resumeCtx(ctrl: Controller): void {
	if (ctrl.onAvailable) {
		ctrl.onAvailable();
		ctrl.onAvailable = undefined;
	} else {
		ctrl.f |= IsAvailable;
	}
}

function updateCtx<TNode>(
	ctrl: Controller<TNode>,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	ctrl.f |= IsUpdating;
	resumeCtx(ctrl);
	return runCtx(ctrl);
}

function updateCtxChildren<TNode, TResult>(
	ctrl: Controller<TNode, unknown, TNode, TResult>,
	children: Children,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (ctrl.f & IsUnmounted || ctrl.f & IsErrored) {
		return;
	} else if (children === undefined) {
		console.error(
			"A component has returned or yielded undefined. If this was intentional, return or yield null instead.",
		);
	}

	const childValues = diffChildren<TNode, unknown, TNode, TResult>(
		ctrl.renderer as RendererImpl<TNode, unknown, TNode, TResult>,
		ctrl.root as TNode,
		ctrl.host as Retainer<TNode>,
		ctrl,
		ctrl.scope,
		ctrl.ret as Retainer<TNode>,
		narrow(children),
	);

	if (isPromiseLike(childValues)) {
		ctrl.ret.inflight = childValues.then((childValues) =>
			commitCtx(ctrl, childValues),
		);
		return (ctrl.ret as Retainer<TNode>).inflight;
	}

	return commitCtx(ctrl, childValues);
}

function commitCtx<TNode>(
	ctrl: Controller<TNode, unknown, TNode>,
	values: Array<TNode | string>,
): ElementValue<TNode> {
	if (ctrl.f & IsUnmounted) {
		return;
	}

	const listeners = listenersMap.get(ctrl.ctx);
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

	if (ctrl.f & IsScheduling) {
		ctrl.f |= IsSchedulingRefresh;
	} else if (!(ctrl.f & IsUpdating)) {
		// If we’re not updating the component, which happens when components are
		// refreshed, or when async generator components iterate, we have to do a
		// little bit housekeeping.
		const records = getListenerRecords(
			ctrl.parent && ctrl.parent.ctx,
			ctrl.host,
		);
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
		const host = ctrl.host as Retainer<TNode>;
		const hostValues = getChildValues(host);
		ctrl.renderer.arrange(
			host.value as TNode,
			host.el.tag as string | symbol,
			host.el.props,
			hostValues,
			// props and oldProps are the same because the host isn’t updated.
			host.el.props,
			wrap(host.cached),
		);

		host.cached = hostValues;
		flush(ctrl.renderer, ctrl.root, ctrl.ctx);
	}

	let value = unwrap(values);
	const callbacks = scheduleMap.get(ctrl.ctx);
	if (callbacks) {
		scheduleMap.delete(ctrl.ctx);
		ctrl.f |= IsScheduling;
		const value1 = ctrl.renderer.read(value);
		for (const callback of callbacks) {
			callback(value1);
		}

		ctrl.f &= ~IsScheduling;
		// Handles an edge case where refresh() is called during a schedule().
		if (ctrl.f & IsSchedulingRefresh) {
			ctrl.f &= ~IsSchedulingRefresh;
			value = getValue(ctrl.ret as Retainer<TNode>);
		}
	}

	ctrl.f &= ~IsUpdating;
	return value;
}

// TODO: async unmounting
function unmountCtx(ctrl: Controller): void {
	ctrl.f |= IsUnmounted;
	clearEventListeners(ctrl.ctx);
	const callbacks = cleanupMap.get(ctrl.ctx);
	if (callbacks) {
		cleanupMap.delete(ctrl.ctx);
		const value = ctrl.renderer.read(getValue(ctrl.ret));
		for (const callback of callbacks) {
			callback(value);
		}
	}

	if (!(ctrl.f & IsDone)) {
		ctrl.f |= IsDone;
		resumeCtx(ctrl);
		if (ctrl.iterator && typeof ctrl.iterator.return === "function") {
			ctrl.f |= IsExecuting;
			try {
				const iteration = ctrl.iterator.return();
				if (isPromiseLike(iteration)) {
					iteration.catch((err) => propagateError<unknown>(ctrl.parent, err));
				}
			} finally {
				ctrl.f &= ~IsExecuting;
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
	ret: Retainer<unknown>,
): Array<EventListenerRecord> {
	let listeners: Array<EventListenerRecord> = [];
	let ctrl = ctx && ctx[ControllerSymbol];
	while (ctrl !== undefined && ctrl.host === ret) {
		const listeners1 = listenersMap.get(ctrl.ctx);
		if (listeners1) {
			listeners = listeners.concat(listeners1);
		}

		ctrl = ctrl.parent;
	}

	return listeners;
}

function clearEventListeners(ctx: Context): void {
	const listeners = listenersMap.get(ctx);
	if (listeners && listeners.length) {
		for (const value of getChildValues(ctx[ControllerSymbol].ret)) {
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
	ctrl: Controller<TNode, unknown, TNode>,
	err: unknown,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (
		ctrl.f & IsDone ||
		!ctrl.iterator ||
		typeof ctrl.iterator.throw !== "function"
	) {
		throw err;
	}

	resumeCtx(ctrl);
	let iteration: ChildrenIteration;
	try {
		ctrl.f |= IsExecuting;
		iteration = ctrl.iterator.throw(err);
	} catch (err) {
		ctrl.f |= IsDone | IsErrored;
		throw err;
	} finally {
		ctrl.f &= ~IsExecuting;
	}

	if (isPromiseLike(iteration)) {
		return iteration.then(
			(iteration) => {
				if (iteration.done) {
					ctrl.f |= IsDone;
				}

				return updateCtxChildren(ctrl, iteration.value as Children);
			},
			(err) => {
				ctrl.f |= IsDone | IsErrored;
				throw err;
			},
		);
	}

	if (iteration.done) {
		ctrl.f |= IsDone;
	}

	return updateCtxChildren(ctrl, iteration.value as Children);
}

function propagateError<TNode>(
	ctrl: Controller<TNode, unknown, TNode> | undefined,
	err: unknown,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (ctrl === undefined) {
		throw err;
	}

	let result: Promise<ElementValue<TNode>> | ElementValue<TNode>;
	try {
		result = handleChildError(ctrl, err);
	} catch (err) {
		return propagateError<TNode>(ctrl.parent, err);
	}

	if (isPromiseLike(result)) {
		return result.catch((err) => propagateError<TNode>(ctrl.parent, err));
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
