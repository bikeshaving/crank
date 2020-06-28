// UTILITY FUNCTIONS
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

function arrayify<T>(value: Array<T> | T | undefined): Array<T> {
	if (value === undefined) {
		return [];
	} else if (Array.isArray(value)) {
		return value;
	} else {
		return [value];
	}
}

function unwrap<T>(arr: Array<T>): Array<T> | T | undefined {
	return arr.length > 1 ? arr : arr[0];
}

function isPromiseLike(value: any): value is PromiseLike<any> {
	return value != null && typeof value.then === "function";
}

function upgradePromiseLike<T>(value: PromiseLike<T>): Promise<T> {
	if (!(value instanceof Promise)) {
		return Promise.resolve(value);
	}

	return value;
}

function squelch(p: Promise<unknown>): Promise<unknown> {
	return p.catch(() => {});
}

export type Tag = Component<any> | string | symbol;

export type TagProps<TTag extends Tag> = TTag extends string
	? JSX.IntrinsicElements[TTag]
	: TTag extends Component<infer TProps>
	? TProps
	: unknown;

// SPECIAL TAGS
// TODO: We assert symbol tags as any because typescript support for symbol tags in JSX does not exist yet.
// https://github.com/microsoft/TypeScript/issues/38367
// TODO: Maybe we can just make these strings??? Fragment can be the empty string
export const Fragment = Symbol.for("crank.Fragment") as any;
export type Fragment = typeof Fragment;

export const Copy = Symbol.for("crank.Copy") as any;
export type Copy = typeof Copy;

export const Portal = Symbol.for("crank.Portal") as any;
export type Portal = typeof Portal;

export const Raw = Symbol.for("crank.Raw") as any;
export type Raw = typeof Raw;

export type Child = Element | string | number | boolean | null | undefined;

interface ChildIterable extends Iterable<Child | ChildIterable> {}

export type Children = Child | ChildIterable;

// return type of iterators has to be void because typescript
export type Component<TProps = any> = (
	this: Context<TProps>,
	props: TProps,
) =>
	| Iterator<Children, Children | void, any>
	| AsyncIterator<Children, Children | void, any>
	| PromiseLike<Children>
	| Children;

type Key = unknown;

// https://overreacted.io/why-do-react-elements-have-typeof-property/
const ElementSymbol = Symbol.for("crank.Element");

// WHAT ARE WE DOING TO THE CHILDREN
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

// ELEMENT FLAGS
const Mounted = 1 << 0;
const Committed = 1 << 1;

export class Element<TTag extends Tag = Tag> {
	$$typeof: typeof ElementSymbol;
	// flags
	_f: number;
	_ctx: Context<TagProps<TTag>> | undefined;
	// children
	_ch: Array<NarrowedChild> | NarrowedChild;
	// node
	_n: any;
	// inflight promise
	_if: Promise<any> | undefined;
	// fallback
	_fb: any;
	// onNewValues
	_onv: Function | undefined;
	tag: TTag;
	props: TagProps<TTag>;
	key: Key;
	ref: Function | undefined;
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

	static clone<TTag extends Tag>(el: Element<TTag>): Element<TTag> {
		return new Element(el.tag, el.props, el.key, el.ref);
	}
}

export function isElement(value: any): value is Element {
	return value != null && value.$$typeof === ElementSymbol;
}

export function createElement<TTag extends Tag>(
	tag: TTag,
	props?: TagProps<TTag> | null,
	...children: Array<unknown>
): Element<TTag>;
export function createElement<TTag extends Tag>(
	tag: TTag,
	props?: TagProps<TTag> | null,
	children?: unknown,
): Element<TTag> {
	let key: Key;
	let ref: Function | undefined;
	const props1 = {} as TagProps<TTag>;
	if (props != null) {
		for (const name in props) {
			if (name === "crank-key") {
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

function normalize<T>(values: Array<ElementValue<T>>): Array<T | string> {
	const result: Array<T | string> = [];
	let buffer: string | undefined;
	for (let i = 0; i < values.length; i++) {
		const value = values[i];
		if (value === undefined) {
			// pass
		} else if (typeof value === "string") {
			buffer = buffer === undefined ? value : buffer + value;
		} else if (!Array.isArray(value)) {
			if (buffer !== undefined) {
				result.push(buffer);
				buffer = undefined;
			}

			result.push(value);
		} else {
			for (let j = 0; j < value.length; j++) {
				const value1 = value[j];
				if (value1 === undefined) {
					// pass
				} else if (typeof value1 === "string") {
					buffer = buffer === undefined ? value1 : buffer + value1;
				} else {
					if (buffer !== undefined) {
						result.push(buffer);
						buffer = undefined;
					}

					result.push(value1);
				}
			}
		}
	}

	if (buffer !== undefined) {
		result.push(buffer);
	}

	return result;
}

export type ElementValue<T> = Array<T | string> | T | string | undefined;

function getChildNodes<TNode>(el: Element): Array<TNode | string> {
	let nodes: Array<TNode | string> = [];
	const children = arrayify(el._ch);
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (child === undefined) {
			// pass
		} else if (typeof child === "string") {
			nodes.push(child);
		} else if (typeof child._fb !== "undefined") {
			nodes = nodes.concat(arrayify(child._fb));
		} else if (typeof child.tag === "function" || child.tag === Fragment) {
			nodes = nodes.concat(getChildNodes<TNode>(child));
		} else if (child.tag !== Portal) {
			// Portals have a value but are opaque to their parents
			nodes.push(child._n);
		}
	}

	return nodes;
}

function getValue<TNode>(el: Element): ElementValue<TNode> {
	if (typeof el._fb !== "undefined") {
		return el._fb;
	} else if (typeof el.tag === Portal) {
		return undefined;
	} else if (typeof el.tag !== "function" && el.tag !== Fragment) {
		return el._n;
	}

	return unwrap(getChildNodes<TNode>(el));
}

type Scope = unknown;

export class Renderer<TNode, TRoot = TNode, TResult = ElementValue<TNode>> {
	_cache: WeakMap<object, Element<Portal>>;
	constructor() {
		this._cache = new WeakMap();
	}

	// TODO: allow parent contexts from a different renderer to be passed into here
	render(children: Children, root: TRoot): Promise<TResult> | TResult {
		let portal: Element<Portal> | undefined;
		if (typeof root === "object" && root !== null) {
			portal = this._cache.get((root as unknown) as object);
		}

		if (portal === undefined) {
			portal = createElement(Portal, {children, root});
			if (typeof root === "object" && root !== null && children != null) {
				this._cache.set((root as unknown) as object, portal);
			}
		} else {
			portal.props = {children, root};
			if (typeof root === "object" && root !== null && children == null) {
				this._cache.delete((root as unknown) as object);
			}
		}

		const value = update(this, root, portal, undefined, undefined, portal);

		if (isPromiseLike(value)) {
			return value.then(() => {
				const result = this.read(unwrap(getChildNodes<TNode>(portal!)));
				if (root == null) {
					unmount(this, portal!, undefined, portal!);
				}

				return result;
			});
		}

		const result = this.read(getChildNodes<TNode>(portal));
		if (root == null) {
			unmount(this, portal, undefined, portal);
		}

		return result;
	}

	scope<TTag extends string | symbol>(
		_tag: TTag,
		_props: TagProps<TTag>,
		scope: Scope | undefined,
	): Scope | undefined {
		return scope;
	}

	create<TTag extends string | symbol>(
		_tag: TTag,
		_props: TagProps<TTag>,
		_scope: Scope,
	): TNode {
		throw new Error("Not implemented");
	}

	read(value: ElementValue<TNode>): TResult {
		return (value as unknown) as TResult;
	}

	escape(text: string, _scope: Scope): string {
		return text;
	}

	parse(text: string, _scope: Scope): TNode | string {
		return text;
	}

	patch<TTag extends string | symbol>(
		_tag: TTag,
		_props: TagProps<TTag>,
		_node: TNode,
		_scope: Scope,
	): unknown {
		return;
	}

	// TODO: pass hints into arrange about where the dirty children start and end
	arrange<TTag extends string | symbol>(
		_tag: TTag,
		_props: TagProps<TTag>,
		_parent: TNode | TRoot,
		_children: Array<TNode | string>,
	): unknown {
		return;
	}

	// TODO: remove: a method which is called to remove a child from a parent to optimize arrange

	dispose(_tag: string | symbol, _node: TNode): unknown {
		return;
	}

	complete(_root: TRoot): unknown {
		return;
	}
}

// PRIVATE RENDERER FUNCTIONS
function mount<TNode, TRoot, TResult>(
	renderer: Renderer<TNode, TRoot, TResult>,
	root: TRoot,
	arranger: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: Scope,
	el: Element,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	el._f |= Mounted;
	if (typeof el.tag === "function") {
		el._ctx = new Context(
			renderer,
			root,
			arranger,
			ctx,
			scope,
			el as Element<Component>,
		);

		return updateCtx(el._ctx);
	} else if (el.tag === Raw) {
		return commit(renderer, scope, el, []);
	} else if (el.tag !== Fragment) {
		if (el.tag !== Portal) {
			// TODO: maybe we can defer create calls to when the element is committing
			el._n = renderer.create(el.tag, el.props, scope);
		} else {
			root = el.props.root;
		}

		arranger = el as Element<string | symbol>;
		scope = renderer.scope(el.tag, el.props, scope);
	}

	if (isNonStringIterable(el.props.children)) {
		return mountChildren(
			renderer,
			root,
			arranger,
			ctx,
			scope,
			el,
			el.props.children,
		);
	}

	return updateChild(
		renderer,
		root,
		arranger,
		ctx,
		scope,
		el,
		el.props.children,
	);
}

function mountChildren<TNode, TRoot, TResult>(
	renderer: Renderer<TNode, TRoot, TResult>,
	root: TRoot,
	arranger: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: Scope,
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

		[child, value] = compare(
			renderer,
			root,
			arranger,
			ctx,
			scope,
			undefined,
			child,
		);
		newChildren[i] = child;
		values.push(value);
		if (!async && isPromiseLike(value)) {
			async = true;
		}
	}

	parent._ch = unwrap(newChildren) as Array<NarrowedChild> | NarrowedChild;

	let values1: Promise<Array<ElementValue<TNode>>> | Array<ElementValue<TNode>>;
	if (async) {
		values1 = Promise.all(values);
	} else {
		values1 = values as Array<ElementValue<TNode>>;
	}

	return race(renderer, arranger, ctx, scope, parent, values1);
}

function update<TNode, TRoot, TResult>(
	renderer: Renderer<TNode, TRoot, TResult>,
	root: TRoot,
	arranger: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: Scope,
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
		arranger = el as Element<string | symbol>;
		scope = renderer.scope(el.tag, el.props, scope);
		if (el.tag === Portal) {
			root = el.props.root;
		}
	}

	if (isNonStringIterable(el.props.children)) {
		return updateChildren(
			renderer,
			root,
			arranger,
			ctx,
			scope,
			el,
			el.props.children,
		);
	} else if (Array.isArray(el._ch)) {
		return updateChildren(renderer, root, arranger, ctx, scope, el, [
			el.props.children,
		]);
	}

	return updateChild(
		renderer,
		root,
		arranger,
		ctx,
		scope,
		el,
		el.props.children,
	);
}

function updateChild<TNode, TRoot, TResult>(
	renderer: Renderer<TNode, TRoot, TResult>,
	root: TRoot,
	arranger: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: Scope,
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
	[newChild, value] = compare(
		renderer,
		root,
		arranger,
		ctx,
		scope,
		oldChild,
		newChild,
	);

	if (typeof oldChild === "object" && oldChild !== newChild) {
		unmount(renderer, arranger, ctx, oldChild);
	}

	parent._ch = newChild;
	// TODO: allow single values to be passed to race
	const values = isPromiseLike(value)
		? value.then((value) => [value])
		: [value];
	return race(renderer, arranger, ctx, scope, parent, values);
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

function updateChildren<TNode, TRoot, TResult>(
	renderer: Renderer<TNode, TRoot, TResult>,
	root: TRoot,
	arranger: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: Scope,
	parent: Element,
	children: ChildIterable,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (typeof parent._ch === "undefined") {
		return mountChildren(
			renderer,
			root,
			arranger,
			ctx,
			scope,
			parent,
			children,
		);
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
			if (childrenByKey === undefined) {
				childrenByKey = mapChildrenByKey(oldChildren.slice(i));
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

				if (seen === undefined) {
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
		[newChild, value] = compare(
			renderer,
			root,
			arranger,
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

	parent._ch = unwrap(newChildren) as Array<NarrowedChild> | NarrowedChild;

	// cleanup
	for (; i < oldChildren.length; i++) {
		const oldChild = oldChildren[i];
		if (typeof oldChild === "object" && typeof oldChild.key === "undefined") {
			graveyard.push(oldChild);
		}
	}

	// TODO: async removal of keyed nodes
	if (childrenByKey !== undefined && childrenByKey.size > 0) {
		graveyard.push(...childrenByKey.values());
	}

	let values1: Promise<Array<ElementValue<TNode>>> | Array<ElementValue<TNode>>;

	if (async) {
		values1 = Promise.all(values).finally(() =>
			graveyard.forEach((child) => unmount(renderer, arranger, ctx, child)),
		);
	} else {
		values1 = values as Array<ElementValue<TNode>>;
		graveyard.forEach((child) => unmount(renderer, arranger, ctx, child));
	}

	return race(renderer, arranger, ctx, scope, parent, values1);
}

function compare<TNode, TRoot, TResult>(
	renderer: Renderer<TNode, TRoot, TResult>,
	root: TRoot,
	arranger: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: Scope,
	oldChild: NarrowedChild,
	newChild: NarrowedChild,
): [NarrowedChild, Promise<ElementValue<TNode>> | ElementValue<TNode>] {
	let value: Promise<ElementValue<TNode>> | ElementValue<TNode>;
	if (
		typeof oldChild === "object" &&
		typeof newChild === "object" &&
		oldChild.tag === newChild.tag
	) {
		if (oldChild.tag === Portal) {
			if (oldChild.props.root !== newChild.props.root) {
				renderer.arrange(Portal, oldChild.props, oldChild.props.root, []);
			}
		}

		// TODO: implement Raw element parse caching

		if (oldChild !== newChild) {
			oldChild.props = newChild.props;
			oldChild.ref = newChild.ref;
			newChild = oldChild;
		}

		value = update(renderer, root, arranger, ctx, scope, newChild);
	} else if (typeof newChild === "object") {
		if (newChild.tag === Copy) {
			if (typeof oldChild === "object") {
				value = oldChild._if || getValue<TNode>(oldChild);
			} else {
				value = oldChild;
			}

			if (typeof newChild.ref === "function") {
				if (isPromiseLike(value)) {
					squelch(value.then(newChild.ref as any));
				} else {
					newChild.ref(value);
				}
			}

			newChild = oldChild;
		} else {
			if (newChild._f & Mounted) {
				newChild = Element.clone(newChild);
			}

			if (typeof oldChild === "object") {
				newChild._fb = oldChild._n;
				if (typeof oldChild._if === "object") {
					squelch(
						oldChild._if.then((value) => {
							if (!((newChild as Element)._f & Committed)) {
								(newChild as Element)._fb = value;
							}
						}),
					);
				}
			}

			value = mount(renderer, root, arranger, ctx, scope, newChild);
		}
	} else if (typeof newChild === "string") {
		newChild = renderer.escape(newChild, scope);
		value = newChild;
	}

	return [newChild, value];
}

function race<TNode, TRoot, TResult>(
	renderer: Renderer<TNode, TRoot, TResult>,
	arranger: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: Scope,
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

		el._if = value;
		return value;
	}

	if (typeof el._onv === "function") {
		el._onv(values);
		el._onv = undefined;
	}

	return commit(renderer, scope, el, normalize(values));
}

function commit<TNode, TRoot, TResult>(
	renderer: Renderer<TNode, TRoot, TResult>,
	scope: Scope,
	el: Element,
	nodes: Array<TNode | string>,
): ElementValue<TNode> {
	el._f |= Committed;
	if (typeof el._fb !== "undefined") {
		el._fb = undefined;
	}

	let value = unwrap(nodes);
	if (typeof el.tag === "function") {
		if (typeof el._ctx === "object") {
			commitCtx(el._ctx, value);
		}
	} else if (el.tag === Portal) {
		renderer.arrange(Portal, el.props, el.props.root, nodes);
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
		renderer.patch(el.tag, el.props, el._n, scope);
		renderer.arrange(el.tag, el.props, el._n, nodes);
		value = el._n;
	}

	if (typeof el.ref === "function") {
		el.ref(renderer.read(value));
	}

	if (typeof el._if === "object") {
		el._if = undefined;
	}

	return value;
}

function unmount<TNode, TRoot, TResult>(
	renderer: Renderer<TNode, TRoot, TResult>,
	arranger: Element,
	ctx: Context<unknown, TResult> | undefined,
	el: Element,
): void {
	if (typeof el.tag === "function") {
		if (typeof el._ctx === "object") {
			unmountCtx(el._ctx);
		}

		ctx = el._ctx;
	} else if (el.tag === Portal) {
		arranger = el;
		renderer.arrange(Portal, el.props, el.props.root, []);
		renderer.complete(el.props.root);
	} else if (el.tag !== Fragment) {
		if (isEventTarget(el._n)) {
			const listeners = getListeners(ctx, arranger);
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

		arranger = el;
		renderer.dispose(el.tag, el._n);
	}

	const children = arrayify(el._ch);
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (typeof child === "object") {
			unmount(renderer, arranger, ctx, child);
		}
	}

	el._f = 0;
	el._ctx = undefined;
	el._ch = undefined;
	el._n = undefined;
	el._if = undefined;
	el._fb = undefined;
	el._onv = undefined;
}

// EVENT UTILITY FUNCTIONS
const NONE = 0;
const CAPTURING_PHASE = 1;
const AT_TARGET = 2;
const BUBBLING_PHASE = 3;

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

function getListeners(
	ctx: Context | undefined,
	arranger: Element,
): Array<EventListenerRecord> | undefined {
	let listeners: Array<EventListenerRecord> | undefined;
	while (ctx !== undefined && ctx._ar === arranger) {
		if (typeof ctx._ls !== "undefined") {
			listeners = listeners === undefined ? ctx._ls : listeners.concat(ctx._ls);
		}

		ctx = ctx._pa;
	}

	return listeners;
}

function clearEventListeners(ctx: Context): void {
	if (typeof ctx._ls !== "undefined" && ctx._ls.length > 0) {
		for (const node of getChildNodes(ctx._el)) {
			if (isEventTarget(node)) {
				for (const record of ctx._ls) {
					node.removeEventListener(
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

export interface ProvisionMap {}

// CONTEXT FLAGS
// TODO: write an explanation for each of these flags
const Independent = 1 << 0;
const Stepping = 1 << 1;
const Iterating = 1 << 2;
const Available = 1 << 3;
const Finished = 1 << 4;
const Unmounted = 1 << 5;
const SyncGen = 1 << 6;
const AsyncGen = 1 << 7;

export class Context<TProps = any, TResult = any> implements EventTarget {
	// flags
	_f: number;
	// renderer
	_re: Renderer<unknown, unknown, TResult>;
	// root
	_ro: unknown;
	// arranger
	_ar: Element<string | symbol>;
	// parent context
	_pa: Context<unknown, TResult> | undefined;
	// scope
	_sc: Scope;
	// element
	_el: Element<Component>;
	// iterator
	_it:
		| Iterator<Children, Children | void, unknown>
		| AsyncIterator<Children, Children | void, unknown>
		| undefined;
	// onProps
	_op: ((props: any) => unknown) | undefined;
	// inflight pending
	_ip: Promise<unknown> | undefined;
	// enqueued pending
	_ep: Promise<unknown> | undefined;
	// inflight value
	_iv: Promise<ElementValue<any>> | undefined;
	// enqueued value
	_ev: Promise<ElementValue<any>> | undefined;
	// listeners
	_ls: Array<EventListenerRecord> | undefined;
	// provisions
	_ps: Map<unknown, unknown> | undefined;
	// schedule callbacks
	_ss: Set<(value: TResult) => unknown> | undefined;
	// cleanup callbacks
	_cs: Set<(value: TResult) => unknown> | undefined;
	constructor(
		renderer: Renderer<unknown, unknown, TResult>,
		root: unknown,
		arranger: Element<string | symbol>,
		parent: Context<unknown, TResult> | undefined,
		scope: Scope,
		el: Element<Component>,
	) {
		this._f = 0;
		this._re = renderer;
		this._ro = root;
		this._ar = arranger;
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

	get props(): TProps {
		return this._el.props;
	}

	get value(): TResult {
		return this._re.read(unwrap(getChildNodes(this._el)));
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

	refresh(): Promise<TResult> | TResult {
		if (this._f & (Stepping | Unmounted)) {
			// TODO: log an error
			return this._re.read(undefined);
		}

		this._f |= Independent;
		resumeCtx(this);
		return this._re.read(runCtx(this));
	}

	schedule(callback: (value: unknown) => unknown): void {
		if (typeof this._ss === "undefined") {
			this._ss = new Set();
		}

		this._ss.add(callback);
	}

	cleanup(callback: (value: unknown) => unknown): void {
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

		for (const node of getChildNodes(this._el)) {
			if (isEventTarget(node)) {
				node.addEventListener(record.type, record.callback, record.options);
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
		for (const node of getChildNodes(this._el)) {
			if (isEventTarget(node)) {
				node.removeEventListener(record.type, record.callback, record.options);
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

// PRIVATE CONTEXT FUNCTIONS
function resumeCtx(ctx: Context) {
	if (typeof ctx._op === "function") {
		ctx._op(ctx._el.props);
		ctx._op = undefined;
	} else {
		ctx._f |= Available;
	}
}

function runCtx<TNode, TResult>(
	ctx: Context<unknown, TResult>,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (typeof ctx._ip === "undefined") {
		const [pending, value] = stepCtx<TNode, TResult>(ctx);
		if (isPromiseLike(pending)) {
			ctx._ip = pending.finally(() => advanceCtx(ctx));
		}

		if (isPromiseLike(value)) {
			ctx._iv = value;
		}

		return value;
	} else if (ctx._f & AsyncGen) {
		return ctx._iv;
	} else if (typeof ctx._ep === "undefined") {
		let resolve: Function;
		ctx._ep = ctx._ip
			.then(() => {
				const [pending, value] = stepCtx<TNode, TResult>(ctx);
				resolve(value);
				return pending;
			})
			.finally(() => advanceCtx(ctx));
		ctx._ev = new Promise((resolve1) => (resolve = resolve1));
	}

	return ctx._ev;
}

function stepCtx<TNode, TResult>(
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
	ctx._f |= Stepping;
	if (typeof ctx._it === "undefined") {
		initial = true;
		clearEventListeners(ctx);
		const result = el.tag.call(ctx, el.props);
		if (isIteratorLike(result)) {
			ctx._it = result;
		} else if (isPromiseLike(result)) {
			const value = upgradePromiseLike(result);
			const pending = squelch(value);
			const value1 = value.then((value) =>
				updateCtxChildren<TNode, TResult>(ctx, value),
			);
			el._if = value1;
			ctx._f &= ~Stepping;
			return [pending, value1];
		} else {
			const value = updateCtxChildren<TNode, TResult>(ctx, result);
			ctx._f &= ~Stepping;
			return [undefined, value];
		}
	}

	let oldValue: Promise<TResult> | TResult;
	if (typeof ctx._el._if === "object") {
		oldValue = ctx._re.read(ctx._el._if);
	} else if (initial) {
		oldValue = ctx._re.read(undefined);
	} else {
		oldValue = ctx._re.read(getValue(el));
	}

	// TODO: clean up/deduplicate logic here
	// TODO: generator components which throw errors should be fragile, if rerendered they should be unmounted and remounted
	const iteration = ctx._it.next(oldValue);
	ctx._f &= ~Stepping;
	if (isPromiseLike(iteration)) {
		if (initial) {
			ctx._f |= AsyncGen;
		}

		const pending = squelch(iteration);
		const value = iteration.then((iteration) => {
			ctx._f &= ~Iterating;
			if (iteration.done) {
				ctx._f |= Finished;
			}

			try {
				let value = updateCtxChildren<TNode, TResult>(
					ctx,
					iteration.value as Children,
				); // void :(
				if (isPromiseLike(value)) {
					if (!(ctx._f & Finished) && typeof ctx._it!.throw === "function") {
						value = value.catch((err) => {
							resumeCtx(ctx);
							const iteration = (ctx._it as AsyncGenerator<
								Children,
								Children
							>).throw(err);
							return iteration.then((iteration) => {
								if (iteration.done) {
									ctx._f |= Finished;
								}

								return updateCtxChildren<TNode, TResult>(ctx, iteration.value);
							});
						});
					}
				}

				return value;
			} catch (err) {
				if (ctx._f & Finished || typeof ctx._it!.throw !== "function") {
					throw err;
				}

				const iteration = (ctx._it as AsyncGenerator<Children, Children>).throw(
					err,
				);
				return iteration.then((iteration) => {
					if (iteration.done) {
						ctx._f |= Finished;
					}

					return updateCtxChildren<TNode, TResult>(ctx, iteration.value);
				});
			}
		});

		el._if = value;
		return [pending, value];
	}

	if (initial) {
		ctx._f |= SyncGen;
	}

	ctx._f &= ~Iterating;
	if (iteration.done) {
		ctx._f |= Finished;
	}

	try {
		let value = updateCtxChildren<TNode, TResult>(
			ctx,
			iteration.value as Children,
		); // void :(
		if (isPromiseLike(value)) {
			if (!(ctx._f & Finished) && typeof ctx._it.throw === "function") {
				value = value.catch((err) => {
					ctx._f |= Stepping;
					const iteration = (ctx._it as Generator<Children, Children>).throw(
						err,
					);
					ctx._f &= ~Stepping;
					if (iteration.done) {
						ctx._f |= Finished;
					}

					return updateCtxChildren<TNode, TResult>(ctx, iteration.value);
				});
			}
			const pending = squelch(value);
			return [pending, value];
		}

		return [undefined, value];
	} catch (err) {
		if (ctx._f & Finished || typeof ctx._it.throw !== "function") {
			throw err;
		}

		ctx._f |= Stepping;
		const iteration = (ctx._it as Generator<Children, Children>).throw(err);
		ctx._f &= ~Stepping;
		if (iteration.done) {
			ctx._f |= Finished;
		}

		const value = updateCtxChildren<TNode, TResult>(ctx, iteration.value);
		if (isPromiseLike(value)) {
			const pending = squelch(value);
			return [pending, value];
		}

		return [undefined, value];
	}
}

function advanceCtx(ctx: Context): void {
	ctx._ip = ctx._ep;
	ctx._iv = ctx._ev;
	ctx._ep = undefined;
	ctx._ev = undefined;
	if (ctx._f & AsyncGen && !(ctx._f & Finished)) {
		ctx._f |= Independent;
		runCtx(ctx);
	}
}

function updateCtx<TNode>(
	ctx: Context,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (ctx._f & AsyncGen) {
		ctx._f &= ~Independent;
	}

	resumeCtx(ctx);
	return runCtx(ctx);
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

	return updateChild<TNode, unknown, TResult>(
		ctx._re as any,
		ctx._ro,
		ctx._ar,
		ctx,
		ctx._sc,
		ctx._el,
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

	if (ctx._f & Independent) {
		const listeners = getListeners(ctx._pa, ctx._ar);
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

		// TODO: async generator components which yield multiple children synchronously will over-arrange the arranger. Maybe we can defer arrangement for this case.
		// TODO: we don’t need to call arrange if none of the nodes have changed or moved
		const arranger = ctx._ar;
		ctx._re.arrange(
			arranger.tag,
			arranger.props,
			arranger.tag === Portal ? arranger.props.root : arranger._n,
			getChildNodes(arranger),
		);
		ctx._re.complete(ctx._ro);
		ctx._f &= ~Independent;
	}

	if (typeof ctx._ss !== "undefined" && ctx._ss.size > 0) {
		// We have to clear the set of callbacks before calling them, because a callback which refreshes the component would otherwise cause a stack overflow.
		const callbacks = Array.from(ctx._ss);
		ctx._ss.clear();
		const value1 = ctx._re.read(value);
		for (const callback of callbacks) {
			callback(value1);
		}
	}
}

function unmountCtx(ctx: Context): void {
	ctx._f |= Unmounted;
	clearEventListeners(ctx);
	if (typeof ctx._cs === "object") {
		const value = ctx._re.read(getValue(ctx._el));
		for (const cleanup of ctx._cs) {
			cleanup(value);
		}

		ctx._cs = undefined;
	}

	if (!(ctx._f & Finished)) {
		ctx._f |= Finished;
		resumeCtx(ctx);

		if (typeof ctx._it === "object" && typeof ctx._it.return === "function") {
			// TODO: handle async generator rejections
			ctx._it.return();
		}
	}
}

declare global {
	module JSX {
		// TODO: JSX interface doesn’t work

		interface IntrinsicElements {
			[tag: string]: any;
		}

		interface ElementChildrenAttribute {
			children: {};
		}
	}
}
