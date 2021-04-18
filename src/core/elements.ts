import {unwrap, wrap} from "../util";
import {Context} from "./context";

/**
 * A type which represents all valid values that can be the tag of an element.
 *
 * Elements whose tags are strings or symbols are called “host” or “intrinsic”
 * elements, and their behavior is determined by the renderer, while elements
 * whose tags are functions are called “component” elements, and their
 * behavior is determined by the execution of the component.
 */
export type Tag = string | symbol | Component;

/**
 * A helper type to map the tag of an element to its expected props.
 *
 * @template TTag - The element’s tag.
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
 * A special tag for rendering into a root node passed via a root prop.
 *
 * This tag is useful for creating element trees with multiple roots, for
 * things like modals or tooltips.
 *
 * Renderer.prototype.render will implicitly wrap passed in element trees in an
 * implicit Portal element.
 */
export const Portal = Symbol.for("crank.Portal") as any;
export type Portal = typeof Portal;

/**
 * A special tag which preserves whatever was previously rendered in the
 * element’s position.
 *
 * Copy elements are useful for when you want to prevent a subtree from
 * rerendering as a performance optimization. Copy elements can also be keyed,
 * in which case the previously rendered keyed element will be preserved.
 */
export const Copy = Symbol.for("crank.Copy") as any;
export type Copy = typeof Copy;

/**
 * A special tag for injecting raw nodes or strings via a value prop.
 *
 * If the value prop is a string, Renderer.prototype.parse() will be called on
 * the string and the result of that method will be inserted.
 */
export const Raw = Symbol.for("crank.Raw") as any;
export type Raw = typeof Raw;

/**
 * Describes all valid values of an element tree, excluding iterables.
 *
 * Arbitrary objects can also be safely rendered, but will be converted to a
 * string using the toString method. We exclude them from this type to catch
 * potential mistakes.
 */
export type Child = Element | string | number | boolean | null | undefined;

// We use a recursive interface rather than making the Children type directly
// recursive because recursive type aliases were added in TypeScript 3.7.
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
	// infer generators which returns implicitly as having a void return type.
	| Iterator<Children, Children | void, any>
	| AsyncIterator<Children, Children | void, any>;

export type ChildrenIteration =
	| Promise<IteratorResult<Children, Children | void>>
	| IteratorResult<Children, Children | void>;

export type Key = unknown;

export const ElementSymbol = Symbol.for("crank.Element");

/*** ELEMENT FLAGS ***/
/**
 * A flag which is set when the element is mounted, used to detect whether an
 * element is being reused so that we clone it rather than accidentally
 * overwriting its state.
 *
 * IMPORTANT: Changing this flag value would likely be a breaking changes in terms
 * of interop between elements created by different versions of Crank.
 */
export const IsInUse = 1 << 0;

/**
 * A flag which tracks whether the element has previously rendered children,
 * used to clear elements which no longer render children in the next render.
 * We may deprecate this and make elements without explicit children
 * uncontrolled.
 */
export const HadChildren = 1 << 1;

// To save on filesize, we mangle the internal properties of Crank classes by
// hand. These internal properties are prefixed with an underscore. Refer to
// their definitions to see their unabbreviated names.

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
	// To maximize compatibility between Crank versions, starting with 0.2.0, any
	// changes to the following properties will be considered a breaking change:
	// $$typeof, tag, props, key, ref, _f
	/**
	 * @internal
	 * A unique symbol to identify elements as elements across versions and
	 * realms, and to protect against basic injection attacks.
	 * https://overreacted.io/why-do-react-elements-have-typeof-property/
	 *
	 * This property is defined on the element prototype rather than per
	 * instance, because it is the same for every Element.
	 */
	$$typeof!: typeof ElementSymbol;

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

	/**
	 * @internal
	 * flags - A bitmask. See ELEMENT FLAGS.
	 */
	_f: number;

	/**
	 * @internal
	 * children - The rendered children of the element.
	 */
	_ch: Array<NarrowedChild> | NarrowedChild;

	/**
	 * @internal
	 * node - The node or context associated with the element.
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
	 * renderer nodes.
	 */
	_n: any;

	/**
	 * @internal
	 * fallback - The element which this element is replacing.
	 *
	 * If an element renders asynchronously, we show any previously rendered
	 * values in its place until it has committed for the first time. This
	 * property is set to the previously rendered child.
	 */
	_fb: NarrowedChild;

	/**
	 * @internal
	 * inflightChildren - The current async run of the element’s children.
	 *
	 * This property is used to make sure Copy element refs fire at the correct
	 * time, and is also used to create yield values for async generator
	 * components with async children. It is unset when the element is committed.
	 */
	_ic: Promise<any> | undefined;

	/**
	 * @internal
	 * onvalue(s) - This property is set to the resolve function of a promise
	 * which represents the next children, so that renderings can be raced.
	 */
	_ov: Function | undefined;

	constructor(
		tag: TTag,
		props: TagProps<TTag>,
		key: Key,
		ref: ((value: unknown) => unknown) | undefined,
	) {
		this._f = 0;
		this.tag = tag;
		this.props = props;
		this.key = key;
		this.ref = ref;
		this._ch = undefined;
		this._n = undefined;
		this._fb = undefined;
		this._ic = undefined;
		this._ov = undefined;
	}

	get hadChildren(): boolean {
		return (this._f & HadChildren) !== 0;
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
 *
 * Used internally to make sure we don’t accidentally reuse elements when
 * rendering.
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
export type NarrowedChild = Element | string | undefined;

export function narrow(value: Children): NarrowedChild {
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
 * @template TNode - The node type for the element assigned by the renderer.
 *
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
 * Normalize will flatten only one level of nested arrays, because it is
 * designed to be called once at each level of the tree. It will also
 * concatenate adjacent strings and remove all undefined values.
 */
export function normalize<TNode>(
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
export function getValue<TNode>(el: Element): ElementValue<TNode> {
	if (typeof el._fb !== "undefined") {
		return typeof el._fb === "object" ? getValue<TNode>(el._fb) : el._fb;
	} else if (el.tag === Portal) {
		return undefined;
	} else if (typeof el.tag !== "function" && el.tag !== Fragment) {
		return el._n;
	}

	return unwrap(getChildValues<TNode>(el));
}

export function getInflightValue<TNode>(
	el: Element,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	return (
		(typeof el.tag === "function" && el._n._iv) || el._ic || getValue<TNode>(el)
	);
}

/**
 * Walks an element’s children to find its child values.
 *
 * @returns A normalized array of nodes and strings.
 */
export function getChildValues<TNode>(el: Element): Array<TNode | string> {
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

// TODO: uncomment and use in the Element interface below
// type CrankElement = Element;
declare global {
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
