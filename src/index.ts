// UTILITY FUNCTIONS
function isPromiseLike(value: any): value is PromiseLike<any> {
	return value != null && typeof value.then === "function";
}

function upgradePromiseLike<T>(value: PromiseLike<T>): Promise<T> {
	if (!(value instanceof Promise)) {
		return Promise.resolve(value);
	}

	return value;
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

function squelch<T>(p: Promise<T>): Promise<T | undefined> {
	return p.catch(() => undefined); // void :(
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
	// value
	_v: any;
	// inflight promise
	_if: Promise<any> | undefined;
	// fallback
	_fb: any;
	// onNewValue
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

type Scope = unknown;

// TODO: explain
const RaceLostSymbol = Symbol.for("crank.RaceLost");

function getChildrenByKey(children: Array<NarrowedChild>): Map<Key, Element> {
	const childrenByKey = new Map<Key, Element>();
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (typeof child === "object" && typeof child.key !== "undefined") {
			childrenByKey.set(child.key, child);
		}
	}

	return childrenByKey;
}

function getChildValues<TValue>(el: Element): Array<TValue | string> {
	let values: Array<TValue | string> = [];
	const children = arrayify(el._ch);
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (child === undefined) {
			// pass
		} else if (typeof child === "string") {
			values.push(child);
		} else if (typeof child._fb !== "undefined") {
			values = values.concat(arrayify(child._fb));
		} else if (typeof child.tag === "function" || child.tag === Fragment) {
			values = values.concat(getChildValues<TValue>(child));
		} else if (child.tag !== Portal) {
			// Portals have a value but are opaque to their parents
			values.push(child._v);
		}
	}

	return values;
}

function getValue<TValue>(el: Element): ElementValue<TValue> {
	if (typeof el._fb !== "undefined") {
		return el._fb;
	} else if (typeof el.tag === Portal) {
		return undefined;
	} else if (typeof el.tag !== "function" && el.tag !== Fragment) {
		return el._v;
	}

	return unwrap(getChildValues<TValue>(el));
}

export abstract class Renderer<TValue, TResult = ElementValue<TValue>> {
	// cache
	_ca: WeakMap<object, Element<Portal>>;
	constructor() {
		this._ca = new WeakMap();
	}

	// TODO: allow parent contexts from a different renderer to be passed into here
	render(children: Children, root?: unknown): Promise<TResult> | TResult {
		let portal: Element<Portal> | undefined;
		if (typeof root === "object" && root !== null) {
			portal = this._ca.get(root);
		}

		if (portal === undefined) {
			portal = createElement(Portal, {children, root});
			if (typeof root === "object" && root !== null && children != null) {
				this._ca.set(root, portal);
			}
		} else {
			portal.props = {children, root};
			if (typeof root === "object" && root !== null && children == null) {
				this._ca.delete(root);
			}
		}

		const result = update(this, portal, undefined, undefined, portal);
		if (isPromiseLike(result)) {
			return result.then(() => {
				const value = this.read(unwrap(getChildValues<TValue>(portal!)));
				if (root == null) {
					unmount(this, portal!, undefined, portal!);
				}

				return value;
			});
		}

		const value = this.read(getChildValues<TValue>(portal));
		if (root == null) {
			unmount(this, portal, undefined, portal);
		}

		return value;
	}

	scope<TTag extends string | symbol>(
		_tag: TTag,
		_props: TagProps<TTag>,
		scope: Scope | undefined,
	): Scope | undefined {
		return scope;
	}

	escape(text: string, _scope: Scope): string {
		return text;
	}

	read(value: ElementValue<TValue>): TResult {
		return (value as unknown) as TResult;
	}

	abstract create<TTag extends string | symbol>(
		tag: TTag,
		props: TagProps<TTag>,
		scope: Scope,
	): TValue;

	abstract parse(_text: string, _scope: Scope): TValue;

	abstract patch<TTag extends string | symbol>(
		tag: TTag,
		props: TagProps<TTag>,
		value: TValue,
		scope: Scope,
	): unknown;

	abstract arrange<TTag extends string | symbol>(
		tag: TTag,
		props: TagProps<TTag>,
		parent: TValue,
		children: Array<TValue | string>,
	): unknown;

	// TODO: dispose() a method which is called for every host node when it is removed

	// TODO: complete() a method which is called once at the end of every independent rendering or refresh or async generator component update
}

// PRIVATE RENDERER FUNCTIONS
function mount<TValue, TResult>(
	renderer: Renderer<TValue, TResult>,
	arranger: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: Scope,
	el: Element,
): Promise<ElementValue<TValue>> | ElementValue<TValue> {
	el._f |= Mounted;
	if (typeof el.tag === "function") {
		el._ctx = new Context(
			renderer,
			el as Element<Component>,
			arranger,
			ctx,
			scope,
		);

		return updateCtx(el._ctx);
	} else if (el.tag === Raw) {
		return commit(renderer, scope, el, []);
	} else if (el.tag !== Fragment) {
		if (el.tag !== Portal) {
			el._v = renderer.create(el.tag, el.props, scope);
		}

		arranger = el as Element<string | symbol>;
		scope = renderer.scope(el.tag, el.props, scope);
	}

	if (isNonStringIterable(el.props.children)) {
		return mountChildren(renderer, arranger, ctx, scope, el, el.props.children);
	}

	return updateChild(renderer, arranger, ctx, scope, el, el.props.children);
}

function mountChildren<TValue, TResult>(
	renderer: Renderer<TValue, TResult>,
	arranger: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: Scope,
	parent: Element,
	children: ChildIterable,
): Promise<ElementValue<TValue>> | ElementValue<TValue> {
	const results: Array<
		Promise<ElementValue<TValue>> | ElementValue<TValue>
	> = [];
	const newChildren = Array.from(children);
	let async = false;
	for (let i = 0; i < newChildren.length; i++) {
		let result: Promise<ElementValue<TValue>> | ElementValue<TValue>;
		let child = newChildren[i] as NarrowedChild;
		if (isNonStringIterable(child)) {
			child = createElement(Fragment, null, child);
		} else {
			child = narrow(child);
		}

		[child, result] = compare(renderer, arranger, ctx, scope, undefined, child);
		newChildren[i] = child;
		results.push(result);
		if (!async && isPromiseLike(result)) {
			async = true;
		}
	}

	parent._ch = unwrap(newChildren) as Array<NarrowedChild> | NarrowedChild;

	let results1:
		| Promise<Array<ElementValue<TValue>>>
		| Array<ElementValue<TValue>>;
	if (async) {
		results1 = Promise.all(results);
	} else {
		results1 = results as Array<ElementValue<TValue>>;
	}

	return race(renderer, arranger, ctx, scope, parent, results1);
}

function update<TValue, TResult>(
	renderer: Renderer<TValue, TResult>,
	arranger: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: Scope,
	el: Element,
): Promise<ElementValue<TValue>> | ElementValue<TValue> {
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
	}

	if (isNonStringIterable(el.props.children)) {
		return updateChildren(
			renderer,
			arranger,
			ctx,
			scope,
			el,
			el.props.children,
		);
	} else if (Array.isArray(el._ch)) {
		return updateChildren(renderer, arranger, ctx, scope, el, [
			el.props.children,
		]);
	}

	return updateChild(renderer, arranger, ctx, scope, el, el.props.children);
}

function updateChild<TValue, TResult>(
	renderer: Renderer<TValue, TResult>,
	arranger: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: Scope,
	parent: Element,
	child: Child,
): Promise<ElementValue<TValue>> | ElementValue<TValue> {
	let oldChild = parent._ch as NarrowedChild;
	let newChild = narrow(child);
	if (
		typeof oldChild === "object" &&
		typeof newChild === "object" &&
		oldChild.key !== newChild.key
	) {
		oldChild = undefined;
	}

	let result: Promise<ElementValue<TValue>> | ElementValue<TValue>;
	[newChild, result] = compare(
		renderer,
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
	// TODO: allow single results to be passed to race
	const results = isPromiseLike(result)
		? result.then((result) => [result])
		: [result];
	return race(renderer, arranger, ctx, scope, parent, results);
}

function updateChildren<TValue, TResult>(
	renderer: Renderer<TValue, TResult>,
	arranger: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: Scope,
	parent: Element,
	children: ChildIterable,
): Promise<ElementValue<TValue>> | ElementValue<TValue> {
	if (typeof parent._ch === "undefined") {
		return mountChildren(renderer, arranger, ctx, scope, parent, children);
	}

	const results: Array<
		Promise<ElementValue<TValue>> | ElementValue<TValue>
	> = [];
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
				childrenByKey = getChildrenByKey(oldChildren.slice(i));
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
		let result: Promise<ElementValue<TValue>> | ElementValue<TValue>;
		[newChild, result] = compare(
			renderer,
			arranger,
			ctx,
			scope,
			oldChild,
			newChild,
		);

		results.push(result);
		newChildren[j] = newChild;
		if (!async && isPromiseLike(result)) {
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

	let results1:
		| Promise<Array<ElementValue<TValue>>>
		| Array<ElementValue<TValue>>;

	if (async) {
		results1 = Promise.all(results).finally(() =>
			graveyard.forEach((child) => unmount(renderer, arranger, ctx, child)),
		);
	} else {
		results1 = results as Array<ElementValue<TValue>>;
		graveyard.forEach((child) => unmount(renderer, arranger, ctx, child));
	}

	return race(renderer, arranger, ctx, scope, parent, results1);
}

function compare<TValue, TResult>(
	renderer: Renderer<TValue, TResult>,
	arranger: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: Scope,
	oldChild: NarrowedChild,
	newChild: NarrowedChild,
): [NarrowedChild, Promise<ElementValue<TValue>> | ElementValue<TValue>] {
	let result: Promise<ElementValue<TValue>> | ElementValue<TValue>;
	if (
		typeof oldChild === "object" &&
		typeof newChild === "object" &&
		oldChild.tag === newChild.tag
	) {
		if (oldChild.tag === Portal) {
			if (oldChild.props.root !== newChild.props.root) {
				renderer.arrange(Portal, oldChild.props, oldChild.props.root, []);
			}
		} else if (oldChild.tag === Raw) {
			// TODO: implement raw caching here
		}

		if (oldChild !== newChild) {
			oldChild.props = newChild.props;
			oldChild.ref = newChild.ref;
			newChild = oldChild;
		}

		result = update(renderer, arranger, ctx, scope, newChild);
	} else if (typeof newChild === "object") {
		if (newChild.tag === Copy) {
			if (typeof oldChild === "object") {
				result = oldChild._if || getValue<TValue>(oldChild);
			} else {
				result = oldChild;
			}

			if (typeof newChild.ref === "function") {
				if (isPromiseLike(result)) {
					squelch(result.then(newChild.ref as any));
				} else {
					newChild.ref(result);
				}
			}

			newChild = oldChild;
		} else {
			if (newChild._f & Mounted) {
				newChild = Element.clone(newChild);
			}

			if (typeof oldChild === "object") {
				newChild._fb = oldChild._v;
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

			result = mount(renderer, arranger, ctx, scope, newChild);
		}
	} else if (typeof newChild === "string") {
		newChild = renderer.escape(newChild, scope);
		result = newChild;
	}

	return [newChild, result];
}

function race<TValue, TResult>(
	renderer: Renderer<TValue, TResult>,
	arranger: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: Scope,
	el: Element,
	results: Promise<Array<ElementValue<TValue>>> | Array<ElementValue<TValue>>,
): Promise<ElementValue<TValue>> | ElementValue<TValue> {
	if (isPromiseLike(results)) {
		let onNewValue!: Function;
		const newValueP = new Promise<ElementValue<TValue>>(
			(resolve) => (onNewValue = resolve),
		);
		const resultsP = Promise.race([
			newValueP.then(() => {
				// returning Promise.reject instead of throwing a promise causes a race condition
				throw RaceLostSymbol;
			}),
			results,
		]);

		const value = resultsP.then(
			(results) => commit(renderer, scope, el, normalize(results)),
			(err) => {
				if (err === RaceLostSymbol) {
					return newValueP;
				}

				throw err;
			},
		);

		if (typeof el._onv === "function") {
			el._onv(value);
		}

		el._onv = onNewValue;
		el._if = value;
		return value;
	}

	const value = commit(renderer, scope, el, normalize(results));
	if (typeof el._onv === "function") {
		el._onv(value);
		el._onv = undefined;
	}

	return value;
}

function commit<TValue, TResult>(
	renderer: Renderer<TValue, TResult>,
	scope: Scope,
	el: Element,
	results: Array<TValue | string>,
): ElementValue<TValue> {
	el._f |= Committed;
	if (typeof el._fb !== "undefined") {
		el._fb = undefined;
	}

	let result = unwrap(results);
	if (typeof el.tag === "function") {
		if (typeof el._ctx === "object") {
			commitCtx(el._ctx, result);
		}
	} else if (el.tag === Portal) {
		renderer.arrange(Portal, el.props, el.props.root, results);
		result = undefined;
	} else if (el.tag === Raw) {
		if (typeof el.props.value === "string") {
			el._v = renderer.parse(el.props.value, scope);
		} else {
			el._v = el.props.value;
		}

		result = el._v;
	} else if (el.tag !== Fragment) {
		renderer.patch(el.tag, el.props, el._v, scope);
		renderer.arrange(el.tag, el.props, el._v, results);
		result = el._v;
	}

	if (typeof el.ref === "function") {
		el.ref(renderer.read(result));
	}

	if (typeof el._if === "object") {
		el._if = undefined;
	}

	return result;
}

function unmount<TValue, TResult>(
	renderer: Renderer<TValue, TResult>,
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
	} else if (el.tag !== Fragment) {
		if (isEventTarget(el._v)) {
			const listeners = getListeners(ctx, arranger);
			if (listeners !== undefined && listeners.length > 0) {
				for (let i = 0; i < listeners.length; i++) {
					const record = listeners[i];
					el._v.removeEventListener(
						record.type,
						record.callback,
						record.options,
					);
				}
			}
		}

		arranger = el;
	}

	const children = arrayify(el._ch);
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (typeof child === "object") {
			unmount(renderer, arranger, ctx, child);
		}
	}

	el._v = undefined;
	el._ctx = undefined;
	el._ch = undefined;
}

// CONTEXT FLAGS
// TODO: write an explanation for each of these flags
const Updating = 1 << 0;
const Stepping = 1 << 1;
const Iterating = 1 << 2;
const Available = 1 << 3;
const Finished = 1 << 4;
const Unmounted = 1 << 5;
const SyncGen = 1 << 6;
const AsyncGen = 1 << 7;

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
	while (ctx !== undefined && ctx._a === arranger) {
		if (typeof ctx._ls !== "undefined") {
			listeners = listeners === undefined ? ctx._ls : listeners.concat(ctx._ls);
		}

		ctx = ctx._p;
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

export interface ProvisionMap {}

export class Context<TProps = any, TResult = any> implements EventTarget {
	// flags
	_f: number;
	// renderer
	_r: Renderer<unknown, TResult>;
	_el: Element<Component>;
	// arranger
	_a: Element<string | symbol>;
	// parent
	_p: Context<unknown, TResult> | undefined;
	// scope
	_s: Scope;
	// iterator
	_it:
		| Iterator<Children, Children | void, unknown>
		| AsyncIterator<Children, Children | void, unknown>
		| undefined;
	// listeners
	_ls: Array<EventListenerRecord> | undefined;
	// onProps
	_op: ((props: any) => unknown) | undefined;
	// inflight pending
	_ip: Promise<unknown> | undefined;
	// enqueued pending
	_ep: Promise<unknown> | undefined;
	// inflight result
	_ir: Promise<ElementValue<any>> | undefined;
	// enqueued result
	_er: Promise<ElementValue<any>> | undefined;
	// provisions
	_ps: Map<unknown, unknown> | undefined;
	// schedule callbacks
	_ss: Set<(value: TResult) => unknown> | undefined;
	// cleanup callbacks
	_cs: Set<(value: TResult) => unknown> | undefined;
	constructor(
		renderer: Renderer<unknown, TResult>,
		el: Element<Component>,
		arranger: Element<string | symbol>,
		parent: Context<unknown, TResult> | undefined,
		scope: Scope,
	) {
		this._f = 0;
		this._r = renderer;
		this._el = el;
		this._a = arranger;
		this._p = parent;
		this._s = scope;
	}

	get<TKey extends keyof ProvisionMap>(key: TKey): ProvisionMap[TKey];
	get(key: unknown): any {
		for (let parent = this._p; parent !== undefined; parent = parent._p) {
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
		return this._r.read(unwrap(getChildValues(this._el)));
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
			return this._r.read(getValue(this._el));
		}

		resumeCtx(this);
		return this._r.read(runCtx(this));
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
		for (let parent = this._p; parent !== undefined; parent = parent._p) {
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

function runCtx<TValue, TResult>(
	ctx: Context<unknown, TResult>,
): Promise<ElementValue<TValue>> | ElementValue<TValue> {
	if (typeof ctx._ip === "undefined") {
		const [pending, result] = stepCtx<TValue, TResult>(ctx);
		if (isPromiseLike(pending)) {
			ctx._ip = pending.finally(() => advanceCtx(ctx));
		}

		if (isPromiseLike(result)) {
			ctx._ir = result;
		}

		return result;
	} else if (ctx._f & AsyncGen) {
		return ctx._ir;
	} else if (typeof ctx._ep === "undefined") {
		let resolve: Function;
		ctx._ep = ctx._ip
			.then(() => {
				const [pending, result] = stepCtx<TValue, TResult>(ctx);
				resolve(result);
				return pending;
			})
			.finally(() => advanceCtx(ctx));
		ctx._er = new Promise((resolve1) => (resolve = resolve1));
	}

	return ctx._er;
}

function stepCtx<TValue, TResult>(
	ctx: Context<unknown, TResult>,
): [
	Promise<unknown> | undefined,
	Promise<ElementValue<TValue>> | ElementValue<TValue>,
] {
	const el = ctx._el;
	if (ctx._f & Finished) {
		return [undefined, getValue<TValue>(el)];
	}

	let initial = false;
	ctx._f |= Stepping;
	if (typeof ctx._it === "undefined") {
		initial = true;
		clearEventListeners(ctx);
		const value = el.tag.call(ctx, el.props);
		if (isIteratorLike(value)) {
			ctx._it = value;
		} else if (isPromiseLike(value)) {
			const value1 = upgradePromiseLike(value);
			const pending = squelch(value1);
			const result = value1.then((value) =>
				updateComponentChildren<TValue, TResult>(ctx, value),
			);
			el._if = result;
			ctx._f &= ~Stepping;
			return [pending, result];
		} else {
			const result = updateComponentChildren<TValue, TResult>(ctx, value);
			ctx._f &= ~Stepping;
			return [undefined, result];
		}
	}

	let oldValue: Promise<TResult> | TResult;
	if (typeof ctx._el._if === "object") {
		oldValue = ctx._r.read(ctx._el._if);
	} else if (initial) {
		oldValue = ctx._r.read(undefined);
	} else {
		oldValue = ctx._r.read(getValue(el));
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
		const result = iteration.then((iteration) => {
			ctx._f &= ~Iterating;
			if (iteration.done) {
				ctx._f |= Finished;
			}

			try {
				let result = updateComponentChildren<TValue, TResult>(
					ctx,
					iteration.value as Children,
				); // void :(
				if (isPromiseLike(result)) {
					if (!(ctx._f & Finished) && typeof ctx._it!.throw === "function") {
						result = result.catch((err) => {
							resumeCtx(ctx);
							const iteration = (ctx._it as AsyncGenerator<
								Children,
								Children
							>).throw(err);
							return iteration.then((iteration) => {
								if (iteration.done) {
									ctx._f |= Finished;
								}

								return updateComponentChildren<TValue, TResult>(
									ctx,
									iteration.value,
								);
							});
						});
					}
				}

				return result;
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

					return updateComponentChildren<TValue, TResult>(ctx, iteration.value);
				});
			}
		});

		el._if = result;
		return [pending, result];
	}

	if (initial) {
		ctx._f |= SyncGen;
	}

	ctx._f &= ~Iterating;
	if (iteration.done) {
		ctx._f |= Finished;
	}

	try {
		let result = updateComponentChildren<TValue, TResult>(
			ctx,
			iteration.value as Children,
		); // void :(
		if (isPromiseLike(result)) {
			if (!(ctx._f & Finished) && typeof ctx._it.throw === "function") {
				result = result.catch((err) => {
					ctx._f |= Stepping;
					const iteration = (ctx._it as Generator<Children, Children>).throw(
						err,
					);
					ctx._f &= ~Stepping;
					if (iteration.done) {
						ctx._f |= Finished;
					}

					return updateComponentChildren<TValue, TResult>(ctx, iteration.value);
				});
			}
			const pending = squelch(result);
			return [pending, result];
		}

		return [undefined, result];
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

		const result = updateComponentChildren<TValue, TResult>(
			ctx,
			iteration.value,
		);
		if (isPromiseLike(result)) {
			const pending = squelch(result);
			return [pending, result];
		}

		return [undefined, result];
	}
}

function advanceCtx(ctx: Context): void {
	ctx._ip = ctx._ep;
	ctx._ir = ctx._er;
	ctx._ep = undefined;
	ctx._er = undefined;
	if (ctx._f & AsyncGen && !(ctx._f & Finished)) {
		runCtx(ctx);
	}
}

function updateCtx<TValue>(
	ctx: Context,
): Promise<ElementValue<TValue>> | ElementValue<TValue> {
	ctx._f |= Updating;
	resumeCtx(ctx);
	return runCtx(ctx);
}

function updateComponentChildren<TValue, TResult>(
	ctx: Context<unknown, TResult>,
	children: Children,
): Promise<ElementValue<TValue>> | ElementValue<TValue> {
	let child: Child;
	if (isNonStringIterable(children)) {
		child = createElement(Fragment, null, children);
	} else {
		child = children;
	}

	return updateChild<TValue, TResult>(
		ctx._r as Renderer<TValue, TResult>,
		ctx._a,
		ctx,
		ctx._s,
		ctx._el,
		child,
	);
}

function commitCtx<TValue>(ctx: Context, value: ElementValue<TValue>): void {
	if (!(ctx._f & Unmounted) && !(ctx._f & Updating)) {
		// TODO: async generator components which resume immediately will over-arrange the arranger. Maybe we can defer arrangement in that case.
		const arranger = ctx._a;
		ctx._r.arrange(
			arranger.tag,
			arranger.props,
			arranger.tag === Portal ? arranger.props.root : arranger._v,
			getChildValues(arranger),
		);
	}

	if (typeof ctx._ss !== "undefined" && ctx._ss.size > 0) {
		// We have to clear the set of callbacks before calling them, because a callback which refreshes the component would otherwise cause a stack overflow.
		const callbacks = Array.from(ctx._ss);
		ctx._ss.clear();
		const value1 = ctx._r.read(value);
		for (const callback of callbacks) {
			callback(value1);
		}
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

	ctx._f &= ~Updating;
}

function unmountCtx(ctx: Context): void {
	ctx._f |= Unmounted;
	clearEventListeners(ctx);
	if (typeof ctx._cs === "object") {
		const value = ctx._r.read(getValue(ctx._el));
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
		// TODO: JSX result types don’t work

		interface IntrinsicElements {
			[tag: string]: any;
		}

		interface ElementChildrenAttribute {
			children: {};
		}
	}
}
