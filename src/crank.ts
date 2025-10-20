import {
	CustomEventTarget,
	addEventTargetDelegates,
	clearEventListeners,
	removeEventTargetDelegates,
} from "./event-target.js";
import {
	arrayify,
	isIteratorLike,
	isPromiseLike,
	safeRace,
	unwrap,
	wrap,
} from "./_utils.js";

const NOOP = (): undefined => {};

/**
 * A type which represents all valid values for an element tag.
 */
export type Tag = string | symbol | Component;

function getTagName(tag: Tag): string {
	return typeof tag === "function"
		? tag.name || "Anonymous"
		: typeof tag === "string"
			? tag
			: // tag is symbol, using else branch to avoid typeof tag === "symbol"
				tag.description || "Anonymous";
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
// support for symbol tags in JSX doesn't exist yet.
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
 * element's position.
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
}> &
	symbol;
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

const DEPRECATED_PROP_PREFIXES = ["crank-", "c-", "$"];

const DEPRECATED_SPECIAL_PROP_BASES = ["key", "ref", "static", "copy"];
/**
 * Creates an element with the specified tag, props and children.
 *
 * This function is usually used as a transpilation target for JSX transpilers,
 * but it can also be called directly. It additionally extracts special props so
 * they aren't accessible to renderer methods or components, and assigns the
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

	if ("static" in (props as TagProps<TTag>)) {
		console.error(`The \`static\` prop is deprecated. Use \`copy\` instead.`);
		(props as TagProps<TTag>)["copy"] = (props as TagProps<TTag>)["static"];
		delete (props as any)["static"];
	}

	for (let i = 0; i < DEPRECATED_PROP_PREFIXES.length; i++) {
		const propPrefix = DEPRECATED_PROP_PREFIXES[i];
		for (let j = 0; j < DEPRECATED_SPECIAL_PROP_BASES.length; j++) {
			const propBase = DEPRECATED_SPECIAL_PROP_BASES[j];
			const deprecatedPropName = propPrefix + propBase;
			if (deprecatedPropName in (props as TagProps<TTag>)) {
				const targetPropBase = propBase === "static" ? "copy" : propBase;
				console.error(
					`The \`${deprecatedPropName}\` prop is deprecated. Use \`${targetPropBase}\` instead.`,
				);
				(props as TagProps<TTag>)[targetPropBase] = (props as TagProps<TTag>)[
					deprecatedPropName
				];
				delete (props as any)[deprecatedPropName];
			}
		}
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
		return;
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
 * @template TNode - The type of node produced by the associated renderer.
 *
 * When asking the question, what is the "value" of a specific element, the
 * answer varies depending on the tag:
 *
 * For intrinsic elements, the value is the node created for the element, e.g.
 * the DOM node in the case of the DOMRenderer.
 *
 * For portals, the value is undefined, because a Portal element's root and
 * children are opaque to its parent.
 *
 * For component or fragment elements the value can be a node or an array of
 * nodes, depending on how many children they have.
 */
export type ElementValue<TNode> = Array<TNode> | TNode | undefined;

/*** RETAINER FLAGS ***/
const DidDiff = 1 << 0;
const DidCommit = 1 << 1;
const IsCopied = 1 << 2;
const IsUpdating = 1 << 3;
const IsExecuting = 1 << 4;
const IsRefreshing = 1 << 5;
const IsScheduling = 1 << 6;
const IsSchedulingFallback = 1 << 7;
const IsUnmounted = 1 << 8;
// TODO: Is this flag still necessary or can we use IsUnmounted?
const IsErrored = 1 << 9;
// TODO: Reenable resurrection
//const IsResurrecting = 1 << 10;
// TODO: Maybe we can get rid of IsSyncGen and IsAsyncGen
const IsSyncGen = 1 << 11;
const IsAsyncGen = 1 << 12;
const IsInForOfLoop = 1 << 13;
const IsInForAwaitOfLoop = 1 << 14;
const NeedsToYield = 1 << 15;
const PropsAvailable = 1 << 16;
const IsSchedulingRefresh = 1 << 17;

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
 * Retainers are objects which act as the internal representation of elements,
 * mirroring the element tree.
 */
class Retainer<TNode, TScope = unknown> {
	/** A bitmask. See RETAINER FLAGS above. */
	declare f: number;
	declare el: Element;
	declare ctx: ContextState<TNode, TScope, any> | undefined;
	declare children:
		| Array<Retainer<TNode, TScope> | undefined>
		| Retainer<TNode, TScope>
		| undefined;
	declare fallback: Retainer<TNode, TScope> | undefined;
	// This is only assigned for host, text and raw elements.
	declare value: ElementValue<TNode> | undefined;
	declare scope: TScope | undefined;
	// This is only assigned for host and raw elements.
	declare oldProps: Record<string, any> | undefined;
	declare pendingDiff: Promise<undefined> | undefined;
	declare onNextDiff: Function | undefined;
	declare graveyard: Array<Retainer<TNode, TScope>> | undefined;
	declare lingerers:
		| Array<Set<Retainer<TNode, TScope>> | undefined>
		| undefined;

	constructor(el: Element) {
		this.f = 0;
		this.el = el;
		this.ctx = undefined;
		this.children = undefined;
		this.fallback = undefined;
		this.value = undefined;
		this.oldProps = undefined;
		this.pendingDiff = undefined;
		this.onNextDiff = undefined;
		this.graveyard = undefined;
		this.lingerers = undefined;
	}
}

// TODO: Reenable resurrection
//function cloneRetainer<TNode, TScope>(
//	ret: Retainer<TNode, TScope>,
//): Retainer<TNode, TScope> {
//	const clone = new Retainer<TNode, TScope>(ret.el);
//	clone.f = ret.f;
//	clone.ctx = ret.ctx;
//	clone.children = ret.children;
//	clone.fallback = ret.fallback;
//	clone.value = ret.value;
//	clone.scope = ret.scope;
//	clone.oldProps = ret.oldProps;
//	clone.pendingDiff = ret.pendingDiff;
//	clone.onNextDiff = ret.onNextDiff;
//	clone.graveyard = ret.graveyard;
//	clone.lingerers = ret.lingerers;
//
//	return clone;
//}

/**
 * Finds the value of the element according to its type.
 *
 * @returns A node, an array of nodes or undefined.
 */
function getValue<TNode>(
	ret: Retainer<TNode>,
	isNested = false,
	index?: number,
): ElementValue<TNode> {
	if (getFlag(ret, IsScheduling) && isNested) {
		return ret.fallback ? getValue(ret.fallback, isNested, index) : undefined;
	} else if (ret.fallback && !getFlag(ret, DidDiff)) {
		return ret.fallback
			? getValue(ret.fallback, isNested, index)
			: ret.fallback;
	} else if (ret.el.tag === Portal) {
		return;
	} else if (ret.el.tag === Fragment || typeof ret.el.tag === "function") {
		if (index != null && ret.ctx) {
			ret.ctx.index = index;
		}
		return unwrap(getChildValues(ret, index));
	}

	return ret.value;
}

/**
 * Walks an element's children to find its child values.
 *
 * @param ret - The retainer whose child values we are reading.
 * @param startIndex - Starting index to thread through for context index updates.
 *
 * @returns An array of nodes.
 */
function getChildValues<TNode>(
	ret: Retainer<TNode>,
	startIndex?: number,
): Array<TNode> {
	const values: Array<TNode> = [];
	const lingerers = ret.lingerers;
	const children = wrap(ret.children);
	let currentIndex = startIndex;

	for (let i = 0; i < children.length; i++) {
		if (lingerers != null && lingerers[i] != null) {
			const rets = lingerers[i]!;
			for (const ret of rets) {
				const value = getValue(ret, true, currentIndex);
				if (Array.isArray(value)) {
					for (let j = 0; j < value.length; j++) {
						values.push(value[j]);
					}
					if (currentIndex != null) {
						currentIndex += value.length;
					}
				} else if (value) {
					values.push(value);
					if (currentIndex != null) {
						currentIndex++;
					}
				}
			}
		}

		const child = children[i];
		if (child) {
			const value = getValue(child, true, currentIndex);
			if (Array.isArray(value)) {
				for (let j = 0; j < value.length; j++) {
					values.push(value[j]);
				}
				if (currentIndex != null) {
					currentIndex += value.length;
				}
			} else if (value) {
				values.push(value);
				if (currentIndex != null) {
					currentIndex++;
				}
			}
		}
	}

	if (lingerers != null && lingerers.length > children.length) {
		for (let i = children.length; i < lingerers.length; i++) {
			const rets = lingerers[i];
			if (rets != null) {
				for (const ret of rets) {
					const value = getValue(ret, true, currentIndex);
					if (Array.isArray(value)) {
						for (let j = 0; j < value.length; j++) {
							values.push(value[j]);
						}
						if (currentIndex != null) {
							currentIndex += value.length;
						}
					} else if (value) {
						values.push(value);
						if (currentIndex != null) {
							currentIndex++;
						}
					}
				}
			}
		}
	}

	return values;
}

function stripSpecialProps(props: Record<string, any>): Record<string, any> {
	let _: unknown;
	let result: Record<string, any>;
	({key: _, ref: _, copy: _, hydrate: _, children: _, ...result} = props);
	return result;
}

/**
 * Interface for adapting the rendering process to a specific target environment.
 *
 * The RenderAdapter defines how Crank elements are mapped to nodes in your target
 * rendering environment (DOM, Canvas, WebGL, Terminal, etc.). Each method handles
 * a specific part of the element lifecycle, from creation to removal.
 *
 * @template TNode - The type representing a node in your target environment
 * @template TScope - Additional context data passed down the component tree
 * @template TRoot - The type of the root container (defaults to TNode)
 * @template TResult - The type returned when reading element values (defaults to ElementValue<TNode>)
 *
 * @example
 * ```typescript
 * const adapter: RenderAdapter<MyNode, MyScope> = {
 *   create: ({ tag, props }) => new MyNode(tag, props),
 *   patch: ({ node, props }) => node.update(props),
 *   arrange: ({ node, children }) => node.replaceChildren(children),
 *   // ... other methods
 * };
 * ```
 */
export interface RenderAdapter<
	TNode,
	TScope,
	TRoot extends TNode | undefined = TNode,
	TResult = ElementValue<TNode>,
> {
	/**
	 * Creates a new node for the given element tag and props.
	 *
	 * This method is called when Crank encounters a new element that needs to be
	 * rendered for the first time. You should create and return a node appropriate
	 * for your target environment.
	 *
	 * @param data.tag - The element tag (e.g., "div", "sprite", or a symbol)
	 * @param data.tagName - String representation of the tag for debugging
	 * @param data.props - The element's props object
	 * @param data.scope - Current scope context (can be undefined)
	 * @returns A new node instance
	 *
	 * @example
	 * ```typescript
	 * create: ({ tag, props, scope }) => {
	 *   if (tag === "sprite") {
	 *     return new PIXI.Sprite(props.texture);
	 *   }
	 *   throw new Error(`Unknown tag: ${tag}`);
	 * }
	 * ```
	 */
	create(data: {
		tag: string | symbol;
		tagName: string;
		props: Record<string, any>;
		scope: TScope | undefined;
	}): TNode;

	/**
	 * Adopts existing nodes during hydration.
	 *
	 * Called when hydrating server-rendered content or reusing existing nodes.
	 * Should return an array of child nodes if the provided node matches the
	 * expected tag, or undefined if hydration should fail.
	 *
	 * @param data.tag - The element tag being hydrated
	 * @param data.tagName - String representation of the tag
	 * @param data.props - The element's props
	 * @param data.node - The existing node to potentially adopt
	 * @param data.scope - Current scope context
	 * @returns Array of child nodes to hydrate, or undefined if adoption fails
	 *
	 * @example
	 * ```typescript
	 * adopt: ({ tag, node }) => {
	 *   if (node && node.tagName.toLowerCase() === tag) {
	 *     return Array.from(node.children);
	 *   }
	 *   return undefined; // Hydration mismatch
	 * }
	 * ```
	 */
	adopt(data: {
		tag: string | symbol;
		tagName: string;
		props: Record<string, any>;
		node: TNode | undefined;
		scope: TScope | undefined;
	}): Array<TNode> | undefined;

	/**
	 * Creates or updates a text node.
	 *
	 * Called when rendering text content. Should create a new text node or
	 * update an existing one with the provided value.
	 *
	 * @param data.value - The text content to render
	 * @param data.scope - Current scope context
	 * @param data.oldNode - Previous text node to potentially reuse
	 * @param data.hydrationNodes - Nodes available during hydration
	 * @returns A text node containing the given value
	 *
	 * @example
	 * ```typescript
	 * text: ({ value, oldNode }) => {
	 *   if (oldNode && oldNode.text !== value) {
	 *     oldNode.text = value;
	 *     return oldNode;
	 *   }
	 *   return new TextNode(value);
	 * }
	 * ```
	 */
	text(data: {
		value: string;
		scope: TScope | undefined;
		oldNode: TNode | undefined;
		hydrationNodes: Array<TNode> | undefined;
	}): TNode;

	/**
	 * Computes scope context for child elements.
	 *
	 * Called to determine what scope context should be passed to child elements.
	 * The scope can be used to pass rendering context like theme, coordinate systems,
	 * or namespaces down the component tree.
	 *
	 * @param data.tag - The element tag
	 * @param data.tagName - String representation of the tag
	 * @param data.props - The element's props
	 * @param data.scope - Current scope context
	 * @returns New scope for children, or undefined to inherit current scope
	 *
	 * @example
	 * ```typescript
	 * scope: ({ tag, props, scope }) => {
	 *   if (tag === "svg") {
	 *     return { ...scope, namespace: "http://www.w3.org/2000/svg" };
	 *   }
	 *   return scope;
	 * }
	 * ```
	 */
	scope(data: {
		tag: string | symbol;
		tagName: string;
		props: Record<string, any>;
		scope: TScope | undefined;
	}): TScope | undefined;

	/**
	 * Handles raw values (strings or nodes) that bypass normal element processing.
	 *
	 * Called when rendering Raw elements or other direct node insertions.
	 * Should convert string values to appropriate nodes for your environment.
	 *
	 * @param data.value - Raw string or node value to render
	 * @param data.scope - Current scope context
	 * @param data.hydrationNodes - Nodes available during hydration
	 * @returns ElementValue that can be handled by arrange()
	 *
	 * @example
	 * ```typescript
	 * raw: ({ value, scope }) => {
	 *   if (typeof value === "string") {
	 *     const container = new Container();
	 *     container.innerHTML = value;
	 *     return Array.from(container.children);
	 *   }
	 *   return value;
	 * }
	 * ```
	 */
	raw(data: {
		value: string | TNode;
		scope: TScope | undefined;
		hydrationNodes: Array<TNode> | undefined;
	}): ElementValue<TNode>;

	/**
	 * Updates a node's properties.
	 *
	 * Called when element props change. Should efficiently update only the
	 * properties that have changed. This is where you implement prop-to-attribute
	 * mapping, event listener binding, and other property synchronization.
	 *
	 * @param data.tag - The element tag
	 * @param data.tagName - String representation of the tag
	 * @param data.node - The node to update
	 * @param data.props - New props object
	 * @param data.oldProps - Previous props object (undefined for initial render)
	 * @param data.scope - Current scope context
	 * @param data.copyProps - Props to skip (used for copying between renderers)
	 * @param data.isHydrating - Whether currently hydrating
	 * @param data.quietProps - Props to not warn about during hydration
	 *
	 * @example
	 * ```typescript
	 * patch: ({ node, props, oldProps }) => {
	 *   for (const [key, value] of Object.entries(props)) {
	 *     if (oldProps?.[key] !== value) {
	 *       if (key.startsWith("on")) {
	 *         node.addEventListener(key.slice(2), value);
	 *       } else {
	 *         node[key] = value;
	 *       }
	 *     }
	 *   }
	 * }
	 * ```
	 */
	patch(data: {
		tag: string | symbol;
		tagName: string;
		node: TNode;
		props: Record<string, any>;
		oldProps: Record<string, any> | undefined;
		scope: TScope | undefined;
		copyProps: Set<string> | undefined;
		isHydrating: boolean;
		quietProps: Set<string> | undefined;
	}): void;

	/**
	 * Arranges child nodes within their parent.
	 *
	 * Called after child elements are rendered to organize them within their
	 * parent node. Should efficiently insert, move, or remove child nodes to
	 * match the provided children array.
	 *
	 * @param data.tag - The parent element tag
	 * @param data.tagName - String representation of the tag
	 * @param data.node - The parent node
	 * @param data.props - The parent element's props
	 * @param data.children - Array of child nodes in correct order
	 * @param data.oldProps - Previous props (for reference)
	 *
	 * @example
	 * ```typescript
	 * arrange: ({ node, children }) => {
	 *   // Remove existing children
	 *   node.removeChildren();
	 *   // Add new children in order
	 *   for (const child of children) {
	 *     node.addChild(child);
	 *   }
	 * }
	 * ```
	 */
	arrange(data: {
		tag: string | symbol;
		tagName: string;
		node: TNode;
		props: Record<string, any>;
		children: Array<TNode>;
		oldProps: Record<string, any> | undefined;
	}): void;

	/**
	 * Removes a node from its parent.
	 *
	 * Called when an element is being unmounted. Should clean up the node
	 * and remove it from its parent if appropriate.
	 *
	 * @param data.node - The node to remove
	 * @param data.parentNode - The parent node
	 * @param data.isNested - Whether this is a nested removal (child of removed element)
	 *
	 * @example
	 * ```typescript
	 * remove: ({ node, parentNode, isNested }) => {
	 *   // Clean up event listeners, resources, etc.
	 *   node.cleanup?.();
	 *   // Remove from parent unless it's a nested removal
	 *   if (!isNested && parentNode.contains(node)) {
	 *     parentNode.removeChild(node);
	 *   }
	 * }
	 * ```
	 */
	remove(data: {node: TNode; parentNode: TNode; isNested: boolean}): void;

	/**
	 * Reads the final rendered value from an ElementValue.
	 *
	 * Called to extract the final result from rendered elements. This allows
	 * you to transform the internal node representation into the public API
	 * that users of your renderer will see.
	 *
	 * @param value - The ElementValue to read (array, single node, or undefined)
	 * @returns The public representation of the rendered value
	 *
	 * @example
	 * ```typescript
	 * read: (value) => {
	 *   if (Array.isArray(value)) {
	 *     return value.map(node => node.publicAPI);
	 *   }
	 *   return value?.publicAPI;
	 * }
	 * ```
	 */
	read(value: ElementValue<TNode>): TResult;

	/**
	 * Performs final rendering to the root container.
	 *
	 * Called after the entire render cycle is complete. This is where you
	 * trigger the actual rendering/presentation in your target environment
	 * (e.g., calling render() on a canvas, flushing to the screen, etc.).
	 *
	 * @param root - The root container
	 *
	 * @example
	 * ```typescript
	 * finalize: (root) => {
	 *   // Trigger actual rendering
	 *   if (root instanceof PIXIApplication) {
	 *     root.render();
	 *   }
	 * }
	 * ```
	 */
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
	TNode extends object,
	TScope,
	TRoot extends TNode | undefined = TNode,
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
	 * @param children - An element tree. Rendering null deletes cached renders.
	 * @param root - The root to be rendered into. The renderer caches renders
	 * per root.
	 * @param bridge - An optional context that will be the ancestor context of
	 * all elements in the tree. Useful for connecting different renderers so
	 * that events/provisions/errors properly propagate. The context for a given
	 * root must be the same between renders.
	 *
	 * @returns The result of rendering the children, or a possible promise of
	 * the result if the element tree renders asynchronously.
	 */
	render(
		children: Children,
		root?: TRoot | undefined,
		bridge?: Context | undefined,
	): Promise<TResult> | TResult {
		const ret = getRootRetainer(this, bridge, {children, root});
		return renderRoot(this.adapter, root, ret, children) as
			| Promise<TResult>
			| TResult;
	}

	hydrate(
		children: Children,
		root: TRoot,
		bridge?: Context | undefined,
	): Promise<TResult> | TResult {
		const ret = getRootRetainer(this, bridge, {
			children,
			root,
			hydrate: true,
		});
		return renderRoot(this.adapter, root, ret, children) as
			| Promise<TResult>
			| TResult;
	}
}

/*** PRIVATE RENDERER FUNCTIONS ***/
function getRootRetainer<
	TNode extends object,
	TScope,
	TRoot extends TNode | undefined,
>(
	renderer: Renderer<TNode, TScope, TRoot, unknown>,
	bridge: Context | undefined,
	{
		children,
		root,
		hydrate,
	}: {
		children: Children;
		root: TRoot | undefined;
		hydrate?: boolean;
	},
): Retainer<TNode, TScope> {
	let ret: Retainer<TNode, TScope> | undefined;
	const bridgeCtx = bridge && bridge[_ContextState];
	if (typeof root === "object" && root !== null) {
		ret = renderer.cache.get(root);
	}

	const adapter = renderer.adapter;
	if (ret === undefined) {
		ret = new Retainer(createElement(Portal, {children, root, hydrate}));
		ret.value = root;
		ret.ctx = bridgeCtx as ContextState<any, any> | undefined;
		ret.scope = adapter.scope({
			tag: Portal,
			tagName: getTagName(Portal),
			props: stripSpecialProps(ret.el.props),
			scope: undefined,
		});
		// remember that typeof null === "object"
		if (typeof root === "object" && root !== null && children != null) {
			renderer.cache.set(root, ret);
		}
	} else if (ret.ctx !== bridgeCtx) {
		throw new Error(
			"A previous call to render() was passed a different context",
		);
	} else {
		ret.el = createElement(Portal, {children, root, hydrate});
		if (typeof root === "object" && root !== null && children == null) {
			renderer.cache.delete(root);
		}
	}

	return ret;
}

function renderRoot<TNode, TScope, TRoot extends TNode | undefined, TResult>(
	adapter: RenderAdapter<TNode, TScope, TRoot, TResult>,
	root: TRoot | undefined,
	ret: Retainer<TNode, TScope>,
	children: Children,
): Promise<TResult> | TResult {
	const diff = diffChildren(
		adapter,
		root,
		ret,
		ret.ctx,
		ret.scope,
		ret,
		children,
	);

	const schedulePromises: Array<PromiseLike<unknown>> = [];
	if (isPromiseLike(diff)) {
		return diff.then(() => {
			commit(
				adapter,
				ret,
				ret,
				ret.ctx,
				ret.scope,
				0,
				schedulePromises,
				undefined,
			);
			if (schedulePromises.length > 0) {
				return Promise.all(schedulePromises).then(() => {
					if (typeof root !== "object" || root === null) {
						unmount(adapter, ret, ret.ctx, ret, false);
					}
					return adapter.read(unwrap(getChildValues(ret)));
				});
			}

			if (typeof root !== "object" || root === null) {
				unmount(adapter, ret, ret.ctx, ret, false);
			}
			return adapter.read(unwrap(getChildValues(ret)));
		});
	}

	commit(adapter, ret, ret, ret.ctx, ret.scope, 0, schedulePromises, undefined);
	if (schedulePromises.length > 0) {
		return Promise.all(schedulePromises).then(() => {
			if (typeof root !== "object" || root === null) {
				unmount(adapter, ret, ret.ctx, ret, false);
			}
			return adapter.read(unwrap(getChildValues(ret)));
		});
	}

	if (typeof root !== "object" || root === null) {
		unmount(adapter, ret, ret.ctx, ret, false);
	}
	return adapter.read(unwrap(getChildValues(ret)));
}

function diffChildren<TNode, TScope, TRoot extends TNode | undefined, TResult>(
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
				ret.el === child &&
				getFlag(ret, DidCommit)
			) {
				// If the child is the same as the retained element, we skip
				// re-rendering.
				childCopied = true;
			} else {
				if (ret && ret.el.tag === child.tag) {
					ret.el = child;
					if (child.props.copy && typeof child.props.copy !== "string") {
						childCopied = true;
					}
				} else if (ret) {
					let candidateFound = false;
					// TODO: Reenable resurrection
					//// we do not need to add the retainer to the graveyard if it is the
					//// fallback of another retainer
					//// search for the tag in fallback chain
					//for (
					//	let predecessor = ret, candidate = ret.fallback;
					//	candidate;
					//	predecessor = candidate, candidate = candidate.fallback
					//) {
					//	if (candidate.el.tag === child.tag) {
					//		// If we find a retainer in the fallback chain with the same tag,
					//		// we reuse it rather than creating a new retainer to preserve
					//		// state. This behavior is useful for when a Suspense component
					//		// re-renders and the children are re-rendered quickly.
					//		const clone = cloneRetainer(candidate);
					//		setFlag(clone, IsResurrecting);
					//		predecessor.fallback = clone;
					//		const fallback = ret;
					//		ret = candidate;
					//		ret.el = child;
					//		ret.fallback = fallback;
					//		setFlag(ret, DidDiff, false);
					//		candidateFound = true;
					//		break;
					//	}
					//}
					if (!candidateFound) {
						const fallback = ret;
						ret = new Retainer<TNode, TScope>(child);
						ret.fallback = fallback;
					}
				} else {
					ret = new Retainer<TNode, TScope>(child);
				}

				if (childCopied && getFlag(ret, DidCommit)) {
					// pass
				} else if (child.tag === Raw || child.tag === Text) {
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
					diff = diffHost(adapter, root, ctx, scope, ret);
				}
			}

			if (typeof ret === "object") {
				if (childCopied) {
					setFlag(ret, IsCopied);
					diff = getInflightDiff(ret);
				} else {
					setFlag(ret, IsCopied, false);
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
		graveyard = graveyard || [];
		for (const ret of childrenByKey.values()) {
			graveyard.push(ret);
		}
	}

	parent.children = unwrap(newRetained);
	if (isAsync) {
		const diffs1 = Promise.all(diffs)
			.then(() => undefined)
			.finally(() => {
				setFlag(parent, DidDiff);
				if (graveyard) {
					if (parent.graveyard) {
						for (let i = 0; i < graveyard.length; i++) {
							parent.graveyard.push(graveyard[i]);
						}
					} else {
						parent.graveyard = graveyard;
					}
				}
			});

		let onNextDiffs!: Function;
		const diffs2 = (parent.pendingDiff = safeRace([
			diffs1,
			new Promise<any>((resolve) => (onNextDiffs = resolve)),
		]));

		if (parent.onNextDiff) {
			parent.onNextDiff(diffs2);
		}

		parent.onNextDiff = onNextDiffs;
		return diffs2;
	} else {
		setFlag(parent, DidDiff);
		if (graveyard) {
			if (parent.graveyard) {
				for (let i = 0; i < graveyard.length; i++) {
					parent.graveyard.push(graveyard[i]);
				}
			} else {
				parent.graveyard = graveyard;
			}
		}

		if (parent.onNextDiff) {
			parent.onNextDiff(diffs);
			parent.onNextDiff = undefined;
		}

		parent.pendingDiff = undefined;
	}
}

function getInflightDiff(
	ret: Retainer<unknown>,
): Promise<undefined> | undefined {
	// It is not enough to check pendingDiff because pendingDiff is the diff for
	// children, but not the diff of an async component retainer's current run.
	// For the latter we check ctx.inflight.
	if (ret.ctx && ret.ctx.inflight) {
		return ret.ctx.inflight[1];
	} else if (ret.pendingDiff) {
		return ret.pendingDiff;
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

function diffHost<TNode, TScope, TRoot extends TNode | undefined>(
	adapter: RenderAdapter<TNode, TScope, TRoot, unknown>,
	root: TRoot,
	ctx: ContextState<TNode, TScope, TRoot> | undefined,
	scope: TScope | undefined,
	ret: Retainer<TNode, TScope>,
): Promise<undefined> | undefined {
	const el = ret.el;
	const tag = el.tag as string | symbol;
	if (el.tag === Portal) {
		root = ret.value = el.props.root;
	}

	if (getFlag(ret, DidCommit)) {
		scope = ret.scope;
	} else {
		scope = ret.scope = adapter.scope({
			tag,
			tagName: getTagName(tag),
			props: el.props,
			scope,
		});
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

function commit<TNode, TScope, TRoot extends TNode | undefined, TResult>(
	adapter: RenderAdapter<TNode, TScope, TRoot, TResult>,
	host: Retainer<TNode, TScope>,
	ret: Retainer<TNode, TScope>,
	ctx: ContextState<TNode, TScope, TRoot, TResult> | undefined,
	scope: TScope | undefined,
	index: number,
	schedulePromises: Array<PromiseLike<unknown>>,
	hydrationNodes: Array<TNode> | undefined,
): ElementValue<TNode> {
	if (getFlag(ret, IsCopied) && getFlag(ret, DidCommit)) {
		return getValue(ret);
	}

	const el = ret.el;
	const tag = el.tag;
	if (
		typeof tag === "function" ||
		tag === Fragment ||
		tag === Portal ||
		tag === Raw ||
		tag === Text
	) {
		if (typeof el.props.copy === "string") {
			console.error(
				`String copy prop ignored for <${getTagName(tag)}>. Use booleans instead.`,
			);
		}
		if (typeof el.props.hydrate === "string") {
			console.error(
				`String hydrate prop ignored for <${getTagName(tag)}>. Use booleans instead.`,
			);
		}
	}

	let value: ElementValue<TNode>;
	let skippedHydrationNodes: Array<TNode> | undefined;
	if (
		hydrationNodes &&
		el.props.hydrate != null &&
		!el.props.hydrate &&
		typeof el.props.hydrate !== "string"
	) {
		skippedHydrationNodes = hydrationNodes;
		hydrationNodes = undefined;
	}

	if (typeof tag === "function") {
		ret.ctx!.index = index;
		value = commitComponent(ret.ctx!, schedulePromises, hydrationNodes);
	} else {
		if (tag === Fragment) {
			value = commitChildren(
				adapter,
				host,
				ctx,
				scope,
				ret,
				index,
				schedulePromises,
				hydrationNodes,
			);
		} else if (tag === Text) {
			value = commitText(
				adapter,
				ret,
				el as Element<Text>,
				scope,
				hydrationNodes,
			);
		} else if (tag === Raw) {
			value = commitRaw(adapter, host, ret, scope, hydrationNodes);
		} else {
			value = commitHost(adapter, ret, ctx, schedulePromises, hydrationNodes);
		}

		if (ret.fallback) {
			unmount(adapter, host, ctx, ret.fallback, false);
			ret.fallback = undefined;
		}
	}

	if (skippedHydrationNodes) {
		skippedHydrationNodes.splice(0, wrap(value).length);
	}

	if (!getFlag(ret, DidCommit)) {
		setFlag(ret, DidCommit);
		if (
			typeof tag !== "function" &&
			tag !== Fragment &&
			tag !== Portal &&
			typeof el.props.ref === "function"
		) {
			el.props.ref(adapter.read(value));
		}
	}

	return value;
}

function commitChildren<
	TNode,
	TScope,
	TRoot extends TNode | undefined,
	TResult,
>(
	adapter: RenderAdapter<TNode, unknown, TRoot, TResult>,
	host: Retainer<TNode, TScope>,
	ctx: ContextState<TNode, TScope, TRoot, TResult> | undefined,
	scope: TScope | undefined,
	parent: Retainer<TNode, TScope>,
	index: number,
	schedulePromises: Array<PromiseLike<unknown>>,
	hydrationNodes: Array<TNode> | undefined,
): Array<TNode> {
	let values: Array<TNode> = [];
	for (let i = 0, children = wrap(parent.children); i < children.length; i++) {
		let child = children[i];
		let schedulePromises1: Array<unknown> | undefined;
		let isSchedulingFallback = false;
		while (
			child &&
			((!getFlag(child, DidDiff) && child.fallback) ||
				getFlag(child, IsScheduling))
		) {
			// If the child is scheduling, it is a component retainer so ctx will be
			// defined.
			if (getFlag(child, IsScheduling) && child.ctx!.schedule) {
				(schedulePromises1 = schedulePromises1 || []).push(
					child.ctx!.schedule.promise,
				);
				isSchedulingFallback = true;
			}

			// TODO: Reenable resurrection
			//if (!getFlag(child, DidDiff) && getFlag(child, DidCommit)) {
			//	// If this child has not diffed but has committed, it means it is a
			//	// fallback that is being resurrected.
			//	for (const node of getChildValues(child)) {
			//		adapter.remove({
			//			node,
			//			parentNode: host.value as TNode,
			//			isNested: false,
			//		});
			//	}
			//}

			child = child.fallback;
			// When a scheduling component is mounting asynchronously but diffs
			// immediately, it will cause previous async diffs to settle due to the
			// chasing mechanism. This would cause earlier renders to resolve sooner
			// than expected, because the render would be missing both its usual
			// children and the children of the scheduling render. Therefore, we need
			// to defer the settling of previous renders until either that render
			// settles, or the scheduling component finally finishes scheduling.
			//
			// To do this, we take advantage of the fact that commits for aborted
			// renders will still fire and walk the tree. During that commit walk,
			// when we encounter a scheduling element, we push a race of the
			// scheduling promise with the inflight diff of the async fallback
			// fallback to schedulePromises to delay the initiator.
			//
			// However, we need to make sure we only use the inflight diffs for the
			// fallback which we are trying to delay, in the case of multiple renders
			// and fallbacks. To do this, we take advantage of the fact that when
			// multiple renders race (e.g., render1->render2->render3->scheduling
			// component), the chasing mechanism will call stale commits in reverse
			// order.
			//
			// We can use this ordering to delay to find which fallbacks we need to
			// add to the race. Each commit call progressively marks an additional
			// fallback as a scheduling fallback, and does not contribute to the
			// scheduling promises if it is further than the last seen level.
			//
			// This prevents promise contamination where newer renders settle early
			// due to diffs from older renders.
			if (schedulePromises1 && isSchedulingFallback && child) {
				if (!getFlag(child, DidDiff)) {
					const inflightDiff = getInflightDiff(child);
					schedulePromises1.push(inflightDiff);
				} else {
					// If a scheduling component's fallback has already diffed, we do not
					// need delay the render.
					schedulePromises1 = undefined;
				}

				if (getFlag(child, IsSchedulingFallback)) {
					// This fallback was marked by a more recent commit - keep processing
					// deeper levels
					isSchedulingFallback = true;
				} else {
					// First unmarked fallback we've encountered - mark it and stop
					// contributing to schedulePromises1 for deeper levels.
					setFlag(child, IsSchedulingFallback, true);
					isSchedulingFallback = false;
				}
			}
		}

		if (schedulePromises1 && schedulePromises1.length > 1) {
			schedulePromises.push(safeRace(schedulePromises1));
		}

		if (child) {
			const value = commit(
				adapter,
				host,
				child,
				ctx,
				scope,
				index,
				schedulePromises,
				hydrationNodes,
			);

			if (Array.isArray(value)) {
				for (let j = 0; j < value.length; j++) {
					values.push(value[j]);
				}
				index += value.length;
			} else if (value) {
				values.push(value);
				index++;
			}
		}
	}

	if (parent.graveyard) {
		for (let i = 0; i < parent.graveyard.length; i++) {
			const child = parent.graveyard[i];
			unmount(adapter, host, ctx, child, false);
		}

		parent.graveyard = undefined;
	}

	if (parent.lingerers) {
		// if parent.lingerers is set, a descendant component is unmounting
		// asynchronously, so we overwrite values to include lingerering DOM nodes.
		values = getChildValues(parent);
	}

	return values;
}

function commitText<TNode, TScope>(
	adapter: RenderAdapter<TNode, TScope, TNode | undefined, unknown>,
	ret: Retainer<TNode, TScope>,
	el: Element<Text>,
	scope: TScope | undefined,
	hydrationNodes: Array<TNode> | undefined,
): TNode {
	const value = adapter.text({
		value: el.props.value,
		scope,
		oldNode: ret.value as TNode,
		hydrationNodes,
	});

	ret.value = value;
	return value;
}

function commitRaw<TNode, TScope>(
	adapter: RenderAdapter<TNode, TScope, TNode | undefined, unknown>,
	host: Retainer<TNode>,
	ret: Retainer<TNode>,
	scope: TScope | undefined,
	hydrationNodes: Array<TNode> | undefined,
): ElementValue<TNode> {
	if (!ret.oldProps || ret.oldProps.value !== ret.el.props.value) {
		const oldNodes = wrap(ret.value);
		for (let i = 0; i < oldNodes.length; i++) {
			const oldNode = oldNodes[i];
			adapter.remove({
				node: oldNode,
				parentNode: host.value as TNode,
				isNested: false,
			});
		}
		ret.value = adapter.raw({
			value: ret.el.props.value as any,
			scope,
			hydrationNodes,
		});
	}

	ret.oldProps = stripSpecialProps(ret.el.props);
	return ret.value;
}

function commitHost<TNode, TScope, TRoot extends TNode | undefined>(
	adapter: RenderAdapter<TNode, TScope, TRoot, unknown>,
	ret: Retainer<TNode, TScope>,
	ctx: ContextState<TNode, TScope, TRoot, unknown> | undefined,
	schedulePromises: Array<PromiseLike<unknown>>,
	hydrationNodes: Array<TNode> | undefined,
): ElementValue<TNode> {
	if (getFlag(ret, IsCopied) && getFlag(ret, DidCommit)) {
		return getValue(ret);
	}

	const tag = ret.el.tag as string | symbol;
	const props = stripSpecialProps(ret.el.props);
	const oldProps = ret.oldProps;
	let node = ret.value as TNode;

	let copyProps: Set<string> | undefined;
	let copyChildren = false;
	if (oldProps) {
		for (const propName in props) {
			if (props[propName] === Copy) {
				// The Copy tag can be used to skip the patching of a prop.
				//   <div class={shouldPatchClass ? "class-name" : Copy} />
				props[propName] = oldProps[propName];
				(copyProps = copyProps || new Set()).add(propName);
			}
		}

		if (typeof ret.el.props.copy === "string") {
			const copyMetaProp = new MetaProp("copy", ret.el.props.copy);
			if (copyMetaProp.include) {
				for (const propName of copyMetaProp.props) {
					if (propName in oldProps) {
						props[propName] = oldProps[propName];
						(copyProps = copyProps || new Set()).add(propName);
					}
				}
			} else {
				for (const propName in oldProps) {
					if (!copyMetaProp.props.has(propName)) {
						props[propName] = oldProps[propName];
						(copyProps = copyProps || new Set()).add(propName);
					}
				}
			}

			copyChildren = copyMetaProp.includes("children");
		}
	}

	const scope = ret.scope;
	let childHydrationNodes: Array<TNode> | undefined;
	let quietProps: Set<string> | undefined;
	let hydrationMetaProp: MetaProp | undefined;
	if (!getFlag(ret, DidCommit)) {
		if (tag === Portal) {
			if (ret.el.props.hydrate && typeof ret.el.props.hydrate !== "string") {
				childHydrationNodes = adapter.adopt({
					tag,
					tagName: getTagName(tag),
					node,
					props,
					scope,
				});

				if (childHydrationNodes) {
					for (let i = 0; i < childHydrationNodes.length; i++) {
						adapter.remove({
							node: childHydrationNodes[i],
							parentNode: node,
							isNested: false,
						});
					}
				}
			}
		} else {
			if (!node && hydrationNodes) {
				const nextChild = hydrationNodes.shift();
				if (typeof ret.el.props.hydrate === "string") {
					hydrationMetaProp = new MetaProp("hydration", ret.el.props.hydrate);
					if (hydrationMetaProp.include) {
						// if we're in inclusive mode, we add all props to quietProps and
						// remove props specified in the metaprop
						quietProps = new Set(Object.keys(props));
						for (const propName of hydrationMetaProp.props) {
							quietProps.delete(propName);
						}
					} else {
						quietProps = hydrationMetaProp.props;
					}
				}
				childHydrationNodes = adapter.adopt({
					tag,
					tagName: getTagName(tag),
					node: nextChild!,
					props,
					scope,
				});

				if (childHydrationNodes) {
					node = nextChild!;
					for (let i = 0; i < childHydrationNodes.length; i++) {
						adapter.remove({
							node: childHydrationNodes[i],
							parentNode: node,
							isNested: false,
						});
					}
				}
			}

			// TODO: For some reason, there are cases where the node is already set
			// and the DidCommit flag is false. Not checking for node fails a test
			// where a child dispatches an event in a schedule callback, the parent
			// listens for this event and refreshes.
			if (!node) {
				node = adapter.create({
					tag,
					tagName: getTagName(tag),
					props,
					scope,
				});
			}
			ret.value = node;
		}
	}

	if (tag !== Portal) {
		adapter.patch({
			tag,
			tagName: getTagName(tag),
			node,
			props,
			oldProps,
			scope,
			copyProps,
			isHydrating: !!childHydrationNodes,
			quietProps,
		});
	}

	if (!copyChildren) {
		const children = commitChildren(
			adapter,
			ret,
			ctx,
			scope,
			ret,
			0,
			schedulePromises,
			hydrationMetaProp && !hydrationMetaProp.includes("children")
				? undefined
				: childHydrationNodes,
		);

		adapter.arrange({
			tag,
			tagName: getTagName(tag),
			node: node,
			props,
			children,
			oldProps,
		});
	}

	ret.oldProps = props;
	if (tag === Portal) {
		flush(adapter, ret.value as TRoot);
		// The root passed to Portal elements are opaque to parents so we return
		// undefined here.
		return;
	}

	return node;
}

class MetaProp {
	declare include: boolean;
	declare props: Set<string>;

	constructor(propName: string, propValue: string) {
		this.include = true;
		this.props = new Set<string>();
		let noBangs = true;
		let allBangs = true;
		const tokens = propValue.split(/[,\s]+/);
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i].trim();
			if (!token) {
				continue;
			} else if (token.startsWith("!")) {
				noBangs = false;
				this.props.add(token.slice(1));
			} else {
				allBangs = false;
				this.props.add(token);
			}
		}

		if (!allBangs && !noBangs) {
			console.error(
				`Invalid ${propName} prop "${propValue}".\nUse prop or !prop but not both.`,
			);
			this.include = true;
			this.props.clear();
		} else {
			this.include = noBangs;
		}
	}

	includes(propName: string): boolean {
		if (this.include) {
			return this.props.has(propName);
		} else {
			return !this.props.has(propName);
		}
	}
}

function contextContains(parent: ContextState, child: ContextState): boolean {
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
// make sure after callbacks are still called.
const ANONYMOUS_ROOT: any = {};
function flush<TRoot>(
	adapter: RenderAdapter<unknown, unknown, TRoot>,
	root: TRoot | undefined,
	initiator?: ContextState,
) {
	if (root != null) {
		adapter.finalize(root);
	}

	if (typeof root !== "object" || root === null) {
		root = ANONYMOUS_ROOT;
	}

	// The initiator is the context which initiated the rendering process. If
	// initiator is defined we call and clear all flush callbacks which are
	// registered with the initiator or with a child context of the initiator,
	// because they are fully rendered.
	//
	// If no initiator is provided, we can call and clear all flush callbacks
	// which are not scheduling.
	const afterMap = afterMapByRoot.get(root as any);
	if (afterMap) {
		const afterMap1 = new Map<ContextState, Set<Function>>();
		for (const [ctx, callbacks] of afterMap) {
			if (
				getFlag(ctx.ret, IsScheduling) ||
				(initiator && !contextContains(initiator, ctx))
			) {
				// copy over callbacks to the new map (defer them)
				afterMap.delete(ctx);
				afterMap1.set(ctx, callbacks);
			}
		}

		if (afterMap1.size) {
			afterMapByRoot.set(root as any, afterMap1);
		} else {
			afterMapByRoot.delete(root as any);
		}

		for (const [ctx, callbacks] of afterMap) {
			const value = adapter.read(getValue(ctx.ret));
			for (const callback of callbacks) {
				callback(value);
			}
		}
	}
}

function unmount<TNode, TScope, TRoot extends TNode | undefined, TResult>(
	adapter: RenderAdapter<TNode, TScope, TRoot, TResult>,
	host: Retainer<TNode>,
	ctx: ContextState<TNode, TScope, TRoot, TResult> | undefined,
	ret: Retainer<TNode>,
	isNested: boolean,
): void {
	// TODO: set the IsUnmounted flag consistently for all retainers
	if (ret.fallback) {
		unmount(adapter, host, ctx, ret.fallback, isNested);
		ret.fallback = undefined;
	}

	// TODO: Reenable resurrection
	//if (getFlag(ret, IsResurrecting)) {
	//	return;
	//}

	if (ret.lingerers) {
		for (let i = 0; i < ret.lingerers.length; i++) {
			const lingerers = ret.lingerers[i];
			if (lingerers) {
				for (const lingerer of lingerers) {
					unmount(adapter, host, ctx, lingerer, isNested);
				}
			}
		}

		ret.lingerers = undefined;
	}

	if (typeof ret.el.tag === "function") {
		unmountComponent(ret.ctx!, isNested);
	} else if (ret.el.tag === Fragment) {
		unmountChildren(adapter, host, ctx, ret, isNested);
	} else if (ret.el.tag === Portal) {
		unmountChildren(adapter, ret, ctx, ret, false);
		if (ret.value != null) {
			adapter.finalize(ret.value as TRoot);
		}
	} else {
		unmountChildren(adapter, ret, ctx, ret, true);

		if (getFlag(ret, DidCommit)) {
			if (ctx) {
				// Remove the value from every context which shares the same host.
				removeEventTargetDelegates(
					ctx.ctx,
					[ret.value],
					(ctx1) => ctx1[_ContextState].host === host,
				);
			}
			adapter.remove({
				node: ret.value as TNode,
				parentNode: host.value as TNode,
				isNested,
			});
		}
	}
}

function unmountChildren<
	TNode,
	TScope,
	TRoot extends TNode | undefined,
	TResult,
>(
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
const provisionMaps = new WeakMap<ContextState, Map<unknown, unknown>>();

const scheduleMap = new WeakMap<ContextState, Set<Function>>();

const cleanupMap = new WeakMap<ContextState, Set<Function>>();

// keys are roots
const afterMapByRoot = new WeakMap<object, Map<ContextState, Set<Function>>>();

interface PullController {
	iterationP: Promise<ChildrenIteratorResult> | undefined;
	diff: Promise<undefined> | undefined;
	onChildError: ((err: unknown) => void) | undefined;
}

interface ScheduleController {
	promise: Promise<unknown>;
	onAbort: () => void;
}

// TODO: allow ContextState to be initialized for testing purposes
/**
 * @internal
 * The internal class which holds context data.
 */
class ContextState<
	TNode = unknown,
	TScope = unknown,
	TRoot extends TNode | undefined = TNode | undefined,
	TResult = unknown,
> {
	/** The adapter of the renderer which created this context. */
	declare adapter: RenderAdapter<TNode, TScope, TRoot, TResult>;

	/** The root node as set by the nearest ancestor portal. */
	declare root: TRoot | undefined;

	/**
	 * The nearest ancestor host or portal retainer.
	 *
	 * When refresh is called, the host element will be arranged as the last step
	 * of the commit, to make sure the parent's children properly reflects the
	 * components's childrenk
	 */
	declare host: Retainer<TNode>;

	/** The parent context state. */
	declare parent: ContextState | undefined;

	/** The actual context associated with this state. */
	declare ctx: Context<unknown, TResult>;

	/** The value of the scope at the point of element's creation. */
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
	// the for await...of loop and props are not available. It is called when
	// the component is updated or refreshed.
	declare onPropsProvided: ((props: unknown) => unknown) | undefined;
	// The onPropsRequested callback is set when a component is updated or
	// refreshed but the new props are not consumed. It is called when the new
	// props are requested.
	declare onPropsRequested: (() => unknown) | undefined;

	// The last known index of the component's children, relative to its nearest
	// ancestor host or portal.
	declare index: number;

	declare schedule: ScheduleController | undefined;

	constructor(
		adapter: RenderAdapter<TNode, TScope, TRoot, TResult>,
		root: TRoot,
		host: Retainer<TNode>,
		parent: ContextState | undefined,
		scope: TScope | undefined,
		ret: Retainer<TNode>,
	) {
		this.adapter = adapter;
		this.root = root;
		this.host = host;
		this.parent = parent;
		// This property must be set after this.parent is set because the Context
		// constructor reads this.parent.
		this.ctx = new Context(this);
		this.scope = scope;
		this.ret = ret;

		this.iterator = undefined;
		this.inflight = undefined;
		this.enqueued = undefined;

		this.onPropsProvided = undefined;
		this.onPropsRequested = undefined;

		this.pull = undefined;
		this.index = 0;
		this.schedule = undefined;
	}
}

// Public type that only extracts props from component functions
export type ComponentProps<T> = T extends () => unknown
	? {}
	: T extends (props: infer U) => unknown
		? U
		: never;

// Public helper type that handles both component functions and regular objects
export type ComponentPropsOrProps<T> = T extends Function
	? ComponentProps<T>
	: T;

const _ContextState = Symbol.for("crank.ContextState");

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
export class Context<
	T = any,
	TResult = any,
> extends CustomEventTarget<Context> {
	/**
	 * @internal
	 * DO NOT USE READ THIS PROPERTY.
	 */
	declare [_ContextState]: ContextState<unknown, unknown, unknown, TResult>;

	// TODO: If we could make the constructor function take a nicer value, it
	// would be useful for testing purposes.
	constructor(state: ContextState<unknown, unknown, unknown, TResult>) {
		super(state.parent ? state.parent.ctx : null);
		this[_ContextState] = state;
	}

	/**
	 * The current props of the associated element.
	 */
	get props(): ComponentPropsOrProps<T> {
		return this[_ContextState].ret.el.props as ComponentPropsOrProps<T>;
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

	get isExecuting(): boolean {
		return getFlag(this[_ContextState].ret, IsExecuting);
	}

	get isUnmounted(): boolean {
		return getFlag(this[_ContextState].ret, IsUnmounted);
	}

	*[Symbol.iterator](): Generator<ComponentPropsOrProps<T>, undefined> {
		const ctx = this[_ContextState];
		setFlag(ctx.ret, IsInForOfLoop);
		try {
			while (!getFlag(ctx.ret, IsUnmounted) && !getFlag(ctx.ret, IsErrored)) {
				if (getFlag(ctx.ret, NeedsToYield)) {
					throw new Error(
						`<${getTagName(ctx.ret.el.tag)}> context iterated twice without a yield`,
					);
				} else {
					setFlag(ctx.ret, NeedsToYield);
				}

				yield ctx.ret.el.props as ComponentPropsOrProps<T>;
			}
		} finally {
			setFlag(ctx.ret, IsInForOfLoop, false);
		}
	}

	async *[Symbol.asyncIterator](): AsyncGenerator<
		ComponentPropsOrProps<T>,
		undefined
	> {
		const ctx = this[_ContextState];
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
					yield ctx.ret.el.props;
				} else {
					const props = await new Promise<ComponentPropsOrProps<T>>(
						(resolve) =>
							(ctx.onPropsProvided = resolve as (props: unknown) => unknown),
					);
					if (getFlag(ctx.ret, IsUnmounted) || getFlag(ctx.ret, IsErrored)) {
						break;
					}

					yield props;
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
	 * @param callback - Optional callback to execute before refresh
	 * @returns The rendered result of the component or a promise thereof if the
	 * component or its children execute asynchronously.
	 */
	refresh(callback?: () => unknown): Promise<TResult> | TResult {
		const ctx = this[_ContextState];
		if (getFlag(ctx.ret, IsUnmounted)) {
			console.error(
				`Component <${getTagName(ctx.ret.el.tag)}> is unmounted. Check the isUnmounted property if necessary.`,
			);
			return ctx.adapter.read(getValue(ctx.ret));
		} else if (getFlag(ctx.ret, IsExecuting)) {
			console.error(
				`Component <${getTagName(ctx.ret.el.tag)}> is already executing Check the isExecuting property if necessary.`,
			);
			return ctx.adapter.read(getValue(ctx.ret));
		}

		if (callback) {
			const result = callback();
			if (isPromiseLike(result)) {
				return Promise.resolve(result).then(() => {
					if (!getFlag(ctx.ret, IsUnmounted)) {
						return this.refresh();
					}
					return ctx.adapter.read(getValue(ctx.ret));
				});
			}
		}

		if (getFlag(ctx.ret, IsScheduling)) {
			setFlag(ctx.ret, IsSchedulingRefresh);
		}

		let diff: Promise<undefined> | undefined;
		const schedulePromises: Array<PromiseLike<unknown>> = [];
		try {
			setFlag(ctx.ret, IsRefreshing);
			diff = enqueueComponent(ctx);
			if (isPromiseLike(diff)) {
				return diff
					.then(() => ctx.adapter.read(commitComponent(ctx, schedulePromises)))
					.then((result) => {
						if (schedulePromises.length) {
							return Promise.all(schedulePromises).then(() => {
								return ctx.adapter.read(getValue(ctx.ret));
							});
						}

						return result;
					})
					.catch((err) => {
						const diff = propagateError(ctx, err, schedulePromises);
						if (diff) {
							return diff.then(() => {
								if (schedulePromises.length) {
									return Promise.all(schedulePromises).then(() => {
										return ctx.adapter.read(getValue(ctx.ret));
									});
								}

								return ctx.adapter.read(getValue(ctx.ret));
							});
						}

						if (schedulePromises.length) {
							return Promise.all(schedulePromises).then(() => {
								return ctx.adapter.read(getValue(ctx.ret));
							});
						}

						return ctx.adapter.read(getValue(ctx.ret));
					})
					.finally(() => setFlag(ctx.ret, IsRefreshing, false));
			}

			const result = ctx.adapter.read(commitComponent(ctx, schedulePromises));
			if (schedulePromises.length) {
				return Promise.all(schedulePromises).then(() => {
					return ctx.adapter.read(getValue(ctx.ret));
				});
			}

			return result;
		} catch (err) {
			// TODO: await schedulePromises
			const diff = propagateError(ctx, err, schedulePromises);
			if (diff) {
				return diff
					.then(() => {
						if (schedulePromises.length) {
							return Promise.all(schedulePromises).then(() => {
								return ctx.adapter.read(getValue(ctx.ret));
							});
						}
					})
					.then(() => ctx.adapter.read(getValue(ctx.ret)));
			}

			if (schedulePromises.length) {
				return Promise.all(schedulePromises).then(() => {
					return ctx.adapter.read(getValue(ctx.ret));
				});
			}

			return ctx.adapter.read(getValue(ctx.ret));
		} finally {
			if (!isPromiseLike(diff)) {
				setFlag(ctx.ret, IsRefreshing, false);
			}
		}
	}

	/**
	 * Registers a callback which fires when the component's children are
	 * created. Will only fire once per callback and update.
	 */
	schedule(): Promise<TResult>;
	schedule(callback: (value: TResult) => unknown): void;
	schedule(callback?: (value: TResult) => unknown): Promise<TResult> | void {
		if (!callback) {
			return new Promise<TResult>((resolve) => this.schedule(resolve));
		}

		const ctx = this[_ContextState];
		let callbacks = scheduleMap.get(ctx);
		if (!callbacks) {
			callbacks = new Set<Function>();
			scheduleMap.set(ctx, callbacks);
		}

		callbacks.add(callback);
	}

	/**
	 * Registers a callback which fires when the component's children are fully
	 * rendered. Will only fire once per callback and update.
	 */
	after(): Promise<TResult>;
	after(callback: (value: TResult) => unknown): void;
	after(callback?: (value: TResult) => unknown): Promise<TResult> | void {
		if (!callback) {
			return new Promise<TResult>((resolve) => this.after(resolve));
		}
		const ctx = this[_ContextState];
		const root = ctx.root || ANONYMOUS_ROOT;
		let afterMap = afterMapByRoot.get(root);
		if (!afterMap) {
			afterMap = new Map<ContextState, Set<Function>>();
			afterMapByRoot.set(root, afterMap);
		}

		let callbacks = afterMap.get(ctx);
		if (!callbacks) {
			callbacks = new Set<Function>();
			afterMap.set(ctx, callbacks);
		}

		callbacks.add(callback);
	}

	/**
	 * @deprecated the flush() method has been renamed to after().
	 */
	flush(): Promise<TResult>;
	flush(callback: (value: TResult) => unknown): void;
	flush(callback?: (value: TResult) => unknown): Promise<TResult> | void {
		console.error("Context.flush() method has been renamed to after()");
		this.after(callback!);
	}

	/**
	 * Registers a callback which fires when the component unmounts.
	 *
	 * The callback can be async to defer the unmounting of a component's children.
	 */
	cleanup(): Promise<TResult>;
	cleanup(callback: (value: TResult) => unknown): void;
	cleanup(callback?: (value: TResult) => unknown): Promise<TResult> | void {
		if (!callback) {
			return new Promise<TResult>((resolve) => this.cleanup(resolve));
		}
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

	[CustomEventTarget.dispatchEventOnSelf](ev: Event): void {
		const ctx = this[_ContextState];
		// dispatchEvent calls the prop callback if it exists
		let propCallback = ctx.ret.el.props["on" + ev.type] as unknown;
		if (typeof propCallback === "function") {
			propCallback(ev);
		} else {
			for (const propName in ctx.ret.el.props) {
				if (propName.toLowerCase() === "on" + ev.type.toLowerCase()) {
					propCallback = ctx.ret.el.props[propName] as unknown;
					if (typeof propCallback === "function") {
						propCallback(ev);
					}
				}
			}
		}
	}
}

function diffComponent<TNode, TScope, TRoot extends TNode | undefined, TResult>(
	adapter: RenderAdapter<TNode, TScope, TRoot, TResult>,
	root: TRoot | undefined,
	host: Retainer<TNode, TScope>,
	parent: ContextState | undefined,
	scope: TScope | undefined,
	ret: Retainer<TNode>,
): Promise<undefined> | undefined {
	let ctx: ContextState<TNode>;
	if (ret.ctx) {
		ctx = ret.ctx;
		if (getFlag(ctx.ret, IsExecuting)) {
			console.error(
				`Component <${getTagName(ctx.ret.el.tag)}> is already executing`,
			);
			return;
		} else if (ctx.schedule) {
			return ctx.schedule.promise.then(() => {
				return diffComponent(adapter, root, host, parent, scope, ret);
			});
		}
	} else {
		ctx = ret.ctx = new ContextState(adapter, root, host, parent, scope, ret);
	}

	setFlag(ctx.ret, IsUpdating);
	return enqueueComponent(ctx);
}

function diffComponentChildren<TNode, TResult>(
	ctx: ContextState<TNode, unknown, TNode | undefined, TResult>,
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
		setFlag(ctx.ret, IsExecuting);
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
		setFlag(ctx.ret, IsExecuting, false);
	}

	return diff;
}

/** Enqueues and executes the component associated with the context. */
function enqueueComponent<TNode, TResult>(
	ctx: ContextState<TNode, unknown, TNode | undefined, TResult>,
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
 * - Async generator components can block in two different ways:
 *   - By default, they behave like sync generator components, blocking while
 *     the component or its children are rendering.
 *   - Within a for await...of loop, they block only while waiting for new
 *     props to be requested, and not while children are rendering.
 */
function runComponent<TNode, TResult>(
	ctx: ContextState<TNode, unknown, TNode | undefined, TResult>,
): [Promise<undefined> | undefined, Promise<undefined> | undefined] {
	if (getFlag(ctx.ret, IsUnmounted)) {
		return [undefined, undefined];
	}

	const ret = ctx.ret;
	const initial = !ctx.iterator;
	if (initial) {
		setFlag(ctx.ret, IsExecuting);
		clearEventListeners(ctx.ctx);
		let returned: ReturnType<Component>;
		try {
			returned = (ret.el.tag as Component).call(ctx.ctx, ret.el.props, ctx.ctx);
		} catch (err) {
			setFlag(ctx.ret, IsErrored);
			throw err;
		} finally {
			setFlag(ctx.ret, IsExecuting, false);
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
			setFlag(ctx.ret, IsExecuting);
			iteration = ctx.iterator!.next();
		} catch (err) {
			setFlag(ctx.ret, IsErrored);
			throw err;
		} finally {
			setFlag(ctx.ret, IsExecuting, false);
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
				setFlag(ctx.ret, IsExecuting);
				const oldResult = ctx.adapter.read(getValue(ctx.ret));
				iteration = ctx.iterator!.next(oldResult);
			} catch (err) {
				setFlag(ctx.ret, IsErrored);
				throw err;
			} finally {
				setFlag(ctx.ret, IsExecuting, false);
			}
		}

		if (isPromiseLike(iteration)) {
			throw new Error("Mixed generator component");
		}

		if (
			getFlag(ctx.ret, IsInForOfLoop) &&
			!getFlag(ctx.ret, NeedsToYield) &&
			!getFlag(ctx.ret, IsUnmounted) &&
			!getFlag(ctx.ret, IsSchedulingRefresh)
		) {
			console.error(
				`Component <${getTagName(ctx.ret.el.tag)}> yielded/returned more than once in for...of loop`,
			);
		}

		setFlag(ctx.ret, NeedsToYield, false);
		setFlag(ctx.ret, IsSchedulingRefresh, false);
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
		if (getFlag(ctx.ret, IsInForAwaitOfLoop)) {
			// initializes the async generator loop
			pullComponent(ctx, iteration);
			const block = resumePropsAsyncIterator(ctx);
			return [block, ctx.pull && ctx.pull.diff];
		} else {
			// We call resumePropsAsyncIterator in case the component exits the
			// for...of loop
			resumePropsAsyncIterator(ctx);
			if (!initial) {
				try {
					setFlag(ctx.ret, IsExecuting);
					const oldResult = ctx.adapter.read(getValue(ctx.ret));
					iteration = ctx.iterator!.next(oldResult);
				} catch (err) {
					setFlag(ctx.ret, IsErrored);
					throw err;
				} finally {
					setFlag(ctx.ret, IsExecuting, false);
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
							!getFlag(ctx.ret, IsUnmounted) &&
							!getFlag(ctx.ret, IsSchedulingRefresh)
						) {
							console.error(
								`Component <${getTagName(ctx.ret.el.tag)}> yielded/returned more than once in for...of loop`,
							);
						}
					}

					setFlag(ctx.ret, NeedsToYield, false);
					setFlag(ctx.ret, IsSchedulingRefresh, false);
					if (iteration.done) {
						setFlag(ctx.ret, IsAsyncGen, false);
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
		}
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
				(resolve) => (ctx.onPropsRequested = resolve as () => unknown),
			);
		}
	}

	return (
		ctx.pull && ctx.pull.iterationP && ctx.pull.iterationP.then(NOOP, NOOP)
	);
}

/**
 * The logic for pulling from async generator components when they are in a for
 * await...of loop is implemented here.
 *
 * It makes sense to group this logic in a single async loop to prevent race
 * conditions caused by calling next(), throw() and return() concurrently.
 */
async function pullComponent<TNode, TResult>(
	ctx: ContextState<TNode, unknown, TNode, TResult>,
	iterationP:
		| Promise<ChildrenIteratorResult>
		| ChildrenIteratorResult
		| undefined,
): Promise<void> {
	if (!iterationP || ctx.pull) {
		return;
	}

	ctx.pull = {iterationP: undefined, diff: undefined, onChildError: undefined};

	// TODO: replace done with iteration
	//let iteration: ChildrenIteratorResult | undefined;
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
						commitComponent(ctx, []);
					}
				},
				(err) => {
					if (
						!(getFlag(ctx.ret, IsUpdating) || getFlag(ctx.ret, IsRefreshing)) ||
						// TODO: is this flag necessary?
						!getFlag(ctx.ret, NeedsToYield)
					) {
						return propagateError(ctx, err, []);
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
					setFlag(ctx.ret, IsExecuting);
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
					setFlag(ctx.ret, IsExecuting, false);
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

			if (getFlag(ctx.ret, IsUnmounted)) {
				// TODO: move this unmounted branch outside the loop
				while (
					(!iteration || !iteration.done) &&
					ctx.iterator &&
					getFlag(ctx.ret, IsInForAwaitOfLoop)
				) {
					try {
						setFlag(ctx.ret, IsExecuting);
						iteration = await ctx.iterator.next(oldResult);
					} catch (err) {
						setFlag(ctx.ret, IsErrored);
						// we throw the error here to cause an unhandled rejection because
						// the promise returned from pullComponent is never awaited
						throw err;
					} finally {
						setFlag(ctx.ret, IsExecuting, false);
					}
				}

				if (
					(!iteration || !iteration.done) &&
					ctx.iterator &&
					typeof ctx.iterator.return === "function"
				) {
					try {
						setFlag(ctx.ret, IsExecuting);
						await ctx.iterator.return();
					} catch (err) {
						setFlag(ctx.ret, IsErrored);
						throw err;
					} finally {
						setFlag(ctx.ret, IsExecuting, false);
					}
				}

				break;
			} else if (!getFlag(ctx.ret, IsInForAwaitOfLoop)) {
				// we have exited the for...await of, so updates will be handled by the
				// regular runComponent/enqueueComponent logic.
				break;
			} else if (!iteration.done) {
				try {
					setFlag(ctx.ret, IsExecuting);
					iterationP = ctx.iterator!.next(
						oldResult,
					) as Promise<ChildrenIteratorResult>;
				} finally {
					setFlag(ctx.ret, IsExecuting, false);
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

function commitComponent<TNode>(
	ctx: ContextState<TNode>,
	schedulePromises: Array<PromiseLike<unknown>>,
	hydrationNodes?: Array<TNode> | undefined,
): ElementValue<TNode> {
	if (ctx.schedule) {
		ctx.schedule.promise.then(() => {
			commitComponent(ctx, []);
			propagateComponent(ctx);
		});
		return getValue(ctx.ret);
	}

	const values = commitChildren(
		ctx.adapter,
		ctx.host,
		ctx,
		ctx.scope,
		ctx.ret,
		ctx.index,
		schedulePromises,
		hydrationNodes,
	);

	if (getFlag(ctx.ret, IsUnmounted)) {
		return;
	}

	addEventTargetDelegates(ctx.ctx, values);

	// Execute schedule callbacks early to check for async deferral
	const wasScheduling = getFlag(ctx.ret, IsScheduling);
	let schedulePromises1: Array<PromiseLike<unknown>> | undefined;
	const callbacks = scheduleMap.get(ctx);
	if (callbacks) {
		scheduleMap.delete(ctx);
		setFlag(ctx.ret, IsScheduling);
		const result = ctx.adapter.read(unwrap(values));
		for (const callback of callbacks) {
			const scheduleResult = callback(result);
			if (isPromiseLike(scheduleResult)) {
				(schedulePromises1 = schedulePromises1 || []).push(scheduleResult);
			}
		}

		if (schedulePromises1 && !getFlag(ctx.ret, DidCommit)) {
			const scheduleCallbacksP = Promise.all(schedulePromises1).then(() => {
				setFlag(ctx.ret, IsScheduling, wasScheduling);
				propagateComponent(ctx);
				if (ctx.ret.fallback) {
					unmount(ctx.adapter, ctx.host, ctx.parent, ctx.ret.fallback, false);
				}

				ctx.ret.fallback = undefined;
			});

			let onAbort!: () => void;
			const scheduleP = safeRace([
				scheduleCallbacksP,
				new Promise<void>((resolve) => (onAbort = resolve)),
			]).finally(() => {
				ctx.schedule = undefined;
			});

			ctx.schedule = {promise: scheduleP, onAbort};
			schedulePromises.push(scheduleP);
		} else {
			setFlag(ctx.ret, IsScheduling, wasScheduling);
		}
	} else {
		setFlag(ctx.ret, IsScheduling, wasScheduling);
	}

	if (!getFlag(ctx.ret, IsScheduling)) {
		if (!getFlag(ctx.ret, IsUpdating)) {
			propagateComponent(ctx);
		}

		if (ctx.ret.fallback) {
			unmount(ctx.adapter, ctx.host, ctx.parent, ctx.ret.fallback, false);
		}

		ctx.ret.fallback = undefined;
		setFlag(ctx.ret, IsUpdating, false);
	}

	setFlag(ctx.ret, DidCommit);
	// We always use getValue() instead of the unwrapping values because there
	// are various ways in which the values could have been updated, especially
	// if schedule callbacks call refresh() or async mounting is happening.
	return getValue(ctx.ret, true);
}

/**
 * Propagates component changes up to ancestors when rendering starts from a
 * component via refresh() or multiple for await...of renders. This handles
 * event listeners and DOM arrangement that would normally happen during
 * top-down rendering.
 */
function propagateComponent<TNode>(ctx: ContextState<TNode>): void {
	const values = getChildValues(ctx.ret, ctx.index);
	addEventTargetDelegates(
		ctx.ctx,
		values,
		(ctx1) => ctx1[_ContextState].host === ctx.host,
	);
	const host = ctx.host;
	const props = stripSpecialProps(host.el.props);
	ctx.adapter.arrange({
		tag: host.el.tag as string | symbol,
		tagName: getTagName(host.el.tag),
		node: host.value as TNode,
		props,
		oldProps: props,
		children: getChildValues(host, 0),
	});

	flush(ctx.adapter, ctx.root, ctx);
}

async function unmountComponent(
	ctx: ContextState,
	isNested: boolean,
): Promise<undefined> {
	if (getFlag(ctx.ret, IsUnmounted)) {
		return;
	}

	let cleanupPromises: Array<PromiseLike<unknown>> | undefined;
	// TODO: think about errror handling for callbacks
	const callbacks = cleanupMap.get(ctx);
	if (callbacks) {
		const oldResult = ctx.adapter.read(getValue(ctx.ret));
		cleanupMap.delete(ctx);
		for (const callback of callbacks) {
			const cleanup = callback(oldResult);
			if (isPromiseLike(cleanup)) {
				(cleanupPromises = cleanupPromises || []).push(cleanup);
			}
		}
	}

	let didLinger = false;
	if (!isNested && cleanupPromises && getChildValues(ctx.ret).length > 0) {
		didLinger = true;
		const index = ctx.index;
		const lingerers = ctx.host.lingerers || (ctx.host.lingerers = []);
		let set = lingerers[index];
		if (set == null) {
			set = new Set<Retainer<unknown>>();
			lingerers[index] = set;
		}

		set.add(ctx.ret);
		await Promise.all(cleanupPromises);
		set!.delete(ctx.ret);
		if (set!.size === 0) {
			lingerers[index] = undefined;
		}

		if (!lingerers.some(Boolean)) {
			// If there are no lingerers remaining, we can remove the lingerers array
			ctx.host.lingerers = undefined;
		}
	}

	if (getFlag(ctx.ret, IsUnmounted)) {
		// If the component was unmounted while awaiting the cleanup callbacks,
		// we do not need to continue unmounting.
		return;
	}

	setFlag(ctx.ret, IsUnmounted);

	// If component has pending schedule promises, resolve them since component
	// is unmounting
	if (ctx.schedule) {
		ctx.schedule.onAbort();
		ctx.schedule = undefined;
	}

	clearEventListeners(ctx.ctx);
	unmountChildren(ctx.adapter, ctx.host, ctx, ctx.ret, isNested);
	if (didLinger) {
		// If we lingered, we call finalize to ensure rendering is finalized
		if (ctx.root != null) {
			ctx.adapter.finalize(ctx.root);
		}
	}

	if (ctx.iterator) {
		if (ctx.pull) {
			// we let pullComponent handle unmounting
			resumePropsAsyncIterator(ctx);
			return;
		}

		// we wait for inflight value so yields resume with the most up to date
		// props
		if (ctx.inflight) {
			await ctx.inflight[1];
		}

		let iteration: ChildrenIteratorResult | undefined;
		if (getFlag(ctx.ret, IsInForOfLoop)) {
			try {
				setFlag(ctx.ret, IsExecuting);
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
				setFlag(ctx.ret, IsExecuting, false);
			}
		}

		if (
			(!iteration || !iteration.done) &&
			ctx.iterator &&
			typeof ctx.iterator.return === "function"
		) {
			try {
				setFlag(ctx.ret, IsExecuting);
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
				setFlag(ctx.ret, IsExecuting, false);
			}
		}
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
		setFlag(ctx.ret, IsExecuting);
		iteration = ctx.iterator.throw(err);
	} catch (err) {
		setFlag(ctx.ret, IsErrored);
		throw err;
	} finally {
		setFlag(ctx.ret, IsExecuting, false);
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
	schedulePromises: Array<PromiseLike<unknown>>,
): Promise<undefined> | undefined {
	const parent = ctx.parent;
	if (!parent) {
		throw err;
	}

	let diff: Promise<undefined> | undefined;
	try {
		diff = handleChildError(parent, err);
	} catch (err) {
		return propagateError(parent, err, schedulePromises);
	}

	if (isPromiseLike(diff)) {
		return diff.then(
			() => void commitComponent(parent, schedulePromises),
			(err) => propagateError(parent, err, schedulePromises),
		);
	}

	commitComponent(parent, schedulePromises);
}

/**
 * An interface which can be extended to provide strongly typed provisions.
 * See Context.prototype.consume and Context.prototype.provide.
 */
export interface ProvisionMap extends Crank.ProvisionMap {}

export interface EventMap extends Crank.EventMap {}

type MappedEventListener<T extends string> = (ev: Crank.EventMap[T]) => unknown;

type MappedEventListenerOrEventListenerObject<T extends string> =
	| MappedEventListener<T>
	| {handleEvent: MappedEventListener<T>};

export interface Context extends Crank.Context {
	addEventListener<T extends string>(
		type: T,
		listener: MappedEventListenerOrEventListenerObject<T> | null,
		options?: boolean | AddEventListenerOptions,
	): void;

	removeEventListener<T extends string>(
		type: T,
		listener: MappedEventListenerOrEventListenerObject<T> | null,
		options?: EventListenerOptions | boolean,
	): void;

	dispatchEvent<T extends string>(ev: EventMap[T] | Event): boolean;
}

// TODO: uncomment and use in the Element interface below
// type CrankElement = Element;
declare global {
	namespace Crank {
		export interface EventMap {
			[tag: string]: Event;
		}

		export interface ProvisionMap {}

		export interface Context {}
	}

	namespace JSX {
		// TODO: JSX Element type (the result of JSX expressions) don't work
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
			hydrate?: unknown;
		}

		export interface ElementChildrenAttribute {
			children: {};
		}
	}
}

/**
 * A re-export of some Crank exports as the default export.
 *
 * Some JSX tools expect things like createElement/Fragment to be defined on
 * the default export. Prefer using the named exports directly.
 */
export default {createElement, Fragment};
