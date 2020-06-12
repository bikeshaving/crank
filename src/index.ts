import * as flags from "./flags";
import {
	isIteratorOrAsyncIterator,
	isNonStringIterable,
	isPromiseLike,
	upgradePromiseLike,
} from "./utils";

declare global {
	module JSX {
		interface IntrinsicElements {
			[tag: string]: any;
		}

		interface ElementChildrenAttribute {
			children: {};
		}
	}
}

export type Tag<TProps = any> = Component<TProps> | string | symbol;

export type TagProps<TTag extends Tag> = TTag extends string
	? JSX.IntrinsicElements[TTag]
	: TTag extends Component<infer TProps>
	? TProps
	: unknown;

export type Child = Element | string | number | boolean | null | undefined;

interface ChildIterable extends Iterable<Child | ChildIterable> {}

export type Children = Child | ChildIterable;

type NormalizedChild = Element | string | undefined;

type NormalizedChildren = Array<NormalizedChild> | NormalizedChild;

export type FunctionComponent<TProps = any> = (
	this: Context<TProps>,
	props: TProps,
) => PromiseLike<Child> | Child;

export type ChildIterator<TNext = any> =
	| Iterator<Child, Child, TNext>
	| AsyncIterator<Child, Child, TNext>;

export type ChildGenerator<TNext = any> =
	| Generator<Child, Child, TNext>
	| AsyncGenerator<Child, Child, TNext>;

export type GeneratorComponent<TProps = any> = (
	this: Context<TProps>,
	props: TProps,
) => ChildIterator;

// TODO: Component cannot be a union of FunctionComponent | GeneratorComponent because this breaks Function.prototype methods.
// https://github.com/microsoft/TypeScript/issues/33815
export type Component<TProps = any> = (
	this: Context<TProps>,
	props: TProps,
) => ChildIterator | PromiseLike<Child> | Child;

type Key = unknown;

type Scope = unknown;

const ElementSigil = Symbol.for("crank.ElementSigil");

export class Element<TTag extends Tag = Tag> {
	$sigil: typeof ElementSigil;
	tag: TTag;
	props: TagProps<TTag>;
	key: Key;
	ref: Function | undefined;
	_flags: number;
	// TODO: delete for component and fragment nodes?
	_value: any;
	_ctx: Context<TagProps<TTag>, any> | undefined;
	_children: NormalizedChildren;
	_onNewValue: ((value: unknown) => unknown) | undefined;
	_onNewResult: ((result?: Promise<undefined>) => unknown) | undefined;
	// TODO: delete???????
	parent: Element | undefined;
	// TODO: delete?????????
	_childrenByKey: Map<Key, Element> | undefined;
	constructor(
		tag: TTag,
		props: TagProps<TTag>,
		key: Key,
		ref: Function | undefined,
	) {
		this.$sigil = ElementSigil;
		this.tag = tag;
		this.props = props;
		this.key = key;
		this.ref = ref;
		this._flags = flags.Dirty | flags.Moved;
	}
}

export function isElement(value: any): value is Element {
	return value != null && value.$sigil === ElementSigil;
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
	const props1: any = {};
	let key: Key;
	let ref: Function | undefined;
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

function normalize(child: Child): NormalizedChild {
	if (child == null || typeof child === "boolean") {
		return undefined;
	} else if (typeof child === "string" || isElement(child)) {
		return child;
	} else {
		return child.toString();
	}
}

// Special Intrinsic Tags
// TODO: We assert symbol tags as any because typescript support for symbol tags in JSX does not exist yet.
// https://github.com/microsoft/TypeScript/issues/38367
export const Fragment = Symbol.for("crank.Fragment") as any;
export type Fragment = typeof Fragment;

export const Copy = Symbol.for("crank.Copy") as any;
export type Copy = typeof Copy;

export const Portal = Symbol.for("crank.Portal") as any;
export type Portal = typeof Portal;

export const Raw = Symbol.for("crank.Raw") as any;
export type Raw = typeof Raw;

export abstract class Renderer<TValue, TChild, TResult> {
	_cache: WeakMap<object, Element<Portal>>;
	constructor() {
		this._cache = new WeakMap();
	}

	render(children: Children, root?: TValue): Promise<TResult> | TResult {
		const clearing = children == null;
		let oldPortal: Element<Portal> | undefined;
		if (typeof root === "object" && root !== null) {
			oldPortal = this._cache.get(root as any);
		}

		let newPortal: Element<Portal> =
			isElement(children) && children.tag === Portal
				? children
				: createElement(Portal, {root}, children);

		// TODO: what if the we pass two portals with different keys?
		if (oldPortal === undefined) {
			mount(this, newPortal, undefined, undefined, undefined);
		} else {
			if (oldPortal !== newPortal) {
				oldPortal.props = newPortal.props;
				oldPortal.ref = newPortal.ref;
				newPortal = oldPortal;
			}
		}

		if (typeof root === "object" && root !== null) {
			if (clearing) {
				this._cache.delete(root as any);
			} else {
				this._cache.set(root as any, newPortal);
			}
		}

		const result = update(this, newPortal, undefined, undefined);
		if (isPromiseLike(result)) {
			return result.then(() => {
				if (newPortal.props.root == null) {
					unmount(this, newPortal, undefined, undefined, true);
				}

				return newPortal._value as any;
			});
		}

		if (newPortal.props.root == null) {
			unmount(this, newPortal, undefined, undefined, true);
		}

		return newPortal._value as any;
	}

	abstract create<TTag extends string | symbol>(
		tag: string | symbol,
		props: TagProps<TTag>,
		children: Array<TChild | string>,
		scope: Scope,
	): TValue;

	abstract patch<TTag extends string | symbol>(
		tag: string | symbol,
		value: TValue,
		props: TagProps<TTag>,
		scope: Scope,
	): unknown;

	abstract arrange<TTag extends string | symbol>(
		tag: string | symbol,
		value: TValue | undefined,
		children: Array<TChild | string>,
		scope: Scope,
	): TResult;

	abstract destroy(tag: string | symbol, value: TValue, scope: Scope): unknown;

	abstract scope<TTag extends string | symbol>(
		tag: TTag,
		props: TagProps<TTag>,
		scope: Scope,
	): Scope;

	abstract escape(text: string, scope: Scope): string;

	abstract parse(text: string, scope: Scope): TChild;
}

// TODO: maybe it’s just better to have these be methods
function mount<TTag extends Tag, TValue>(
	renderer: Renderer<TValue, any, any>,
	el: Element<TTag>,
	parent: Element | undefined,
	ctx: Context<TagProps<TTag>, TValue> | undefined,
	scope: Scope,
): Element<TTag> {
	if (typeof el._flags === "undefined" || el._flags & flags.Mounted) {
		el = new Element(el.tag, el.props, el.key, el.ref);
	}

	el._flags |= flags.Mounted;
	el.parent = parent;
	if (typeof el.tag === "function") {
		el._ctx = new Context(renderer, el as Element<Component>, ctx, scope);
	}

	return el;
}

// TODO: have update and updateChildren return childValues???
function update<TValue>(
	renderer: Renderer<TValue, any, any>,
	el: Element,
	ctx: Context<any, TValue> | undefined,
	scope: Scope,
): Promise<undefined> | undefined {
	el._flags |= flags.Updating;
	if (typeof el._ctx === "object") {
		return el._ctx.refresh();
	}

	return updateChildren(renderer, el, el.props.children, ctx, scope);
}

function updateChildren<TValue>(
	renderer: Renderer<TValue, any, any>,
	el: Element,
	children: Children,
	ctx: Context<unknown, TValue> | undefined,
	scope: Scope,
): Promise<undefined> | undefined {
	let childScope = scope;
	if (typeof el.tag === "function") {
		if (isNonStringIterable(children)) {
			children = createElement(Fragment, null, children);
		}
	} else if (
		typeof el.tag === "string" ||
		(el.tag !== Fragment && el.tag !== Portal && el.tag !== Raw)
	) {
		childScope = renderer.scope(el.tag as string | symbol, el.props, scope);
	}

	const handling = el._flags & flags.Handling;
	let result: Promise<undefined> | undefined;
	let children1: NormalizedChildren;
	let childrenByKey: Map<Key, Element> | undefined;
	let i = 0;

	// TODO: is this array allocation important?
	if (children === undefined) {
		children = [];
	} else if (!isNonStringIterable(children)) {
		children = [children];
	}

	for (let newChild of children) {
		// alignment
		let oldChild: NormalizedChild;
		if (Array.isArray(el._children)) {
			oldChild = el._children[i];
		} else if (i === 0) {
			oldChild = el._children;
		}

		// TODO: reassigning newChild does not narrow to NormalizedChild, why typescript
		let newChild1: NormalizedChild;
		if (isNonStringIterable(newChild)) {
			newChild1 = createElement(Fragment, null, newChild);
		} else {
			newChild1 = normalize(newChild);
		}

		if (typeof newChild1 === "object" && typeof newChild1.key !== "undefined") {
			const oldChild1 =
				el._childrenByKey && el._childrenByKey.get(newChild1.key);
			if (oldChild1 === undefined) {
				oldChild = undefined;
			} else {
				el._childrenByKey!.delete(newChild1.key);
				if (oldChild === oldChild1) {
					i++;
				} else {
					oldChild = oldChild1;
					oldChild._flags |= flags.Moved;
				}
			}
		} else {
			if (typeof oldChild === "object" && typeof oldChild.key !== "undefined") {
				if (Array.isArray(el._children)) {
					while (
						typeof oldChild === "object" &&
						typeof oldChild.key !== "undefined"
					) {
						i++;
						oldChild = el._children[i];
					}
				} else {
					oldChild = undefined;
				}
			}

			i++;
		}

		// updating
		if (typeof newChild1 === "object") {
			let result1: Promise<undefined> | undefined;
			if (newChild1.tag === Copy) {
				// TODO: do refs make sense for copies?
				newChild1 = oldChild;
			} else if (typeof oldChild === "object") {
				if (oldChild.tag === newChild1.tag) {
					if (oldChild !== newChild) {
						oldChild.props = newChild1.props;
						oldChild.ref = newChild1.ref;
						newChild1 = oldChild;
					}

					result1 = update(renderer, newChild1, ctx, childScope);
				} else {
					newChild1 = mount(renderer, newChild1, el, ctx, childScope);
					result1 = update(renderer, newChild1, ctx, childScope);
					if (result1 === undefined) {
						unmount(renderer, oldChild, ctx, childScope, true);
					} else {
						// storing variables for callback closures
						newChild1._value = oldChild._value;
						const oldChild1 = oldChild;
						const newChild2 = newChild1;
						let fulfilled = false;
						result1.then(() => {
							fulfilled = true;
							unmount(renderer, oldChild1, ctx, childScope, true);
						});
						oldChild._onNewValue = (value) => {
							if (!fulfilled) {
								newChild2._value = value;
							}
						};
					}
				}
			} else {
				newChild1 = mount(renderer, newChild1, el, ctx, childScope);
				result1 = update(renderer, newChild1, ctx, childScope);
				if (result1 !== undefined) {
					newChild1._value = oldChild;
				}
			}

			if (result1 !== undefined) {
				result = result === undefined ? result1 : result.then(() => result1);
			}
		} else {
			if (typeof oldChild === "object") {
				unmount(renderer, oldChild, ctx, childScope, true);
			}

			if (typeof newChild1 === "string") {
				newChild1 = renderer.escape(newChild1, childScope);
			}
		}

		// push to children1
		if (children1 === undefined) {
			children1 = newChild1;
		} else {
			// TODO: this is expensive
			if (!Array.isArray(children1)) {
				children1 = [children1];
			}

			children1.push(newChild1);
		}

		// add to childrenByKey
		if (typeof newChild1 === "object" && typeof newChild1.key !== "undefined") {
			if (childrenByKey === undefined) {
				childrenByKey = new Map();
			}

			if (!childrenByKey.has(newChild1.key)) {
				childrenByKey.set(newChild1.key, newChild1);
			}
		}
	}

	if (handling !== (el._flags & flags.Handling)) {
		el._flags &= ~flags.Handling;
		return;
	}

	if (typeof el._children !== "undefined") {
		if (Array.isArray(el._children)) {
			for (; i < el._children.length; i++) {
				const oldChild = el._children[i];
				if (
					typeof oldChild === "object" &&
					typeof oldChild.key === "undefined"
				) {
					unmount(renderer, oldChild, ctx, childScope, true);
				}
			}
		} else if (
			i === 0 &&
			typeof el._children === "object" &&
			typeof el._children.key === "undefined"
		) {
			unmount(renderer, el._children, ctx, childScope, true);
		}
	}

	// TODO: likely where logic for asynchronous unmounting will go
	if (typeof el._childrenByKey === "object") {
		for (const child of el._childrenByKey.values()) {
			unmount(renderer, child, ctx, childScope, true);
		}
	}

	el._children = children1;
	el._childrenByKey = childrenByKey;

	if (typeof el._onNewResult === "function") {
		el._onNewResult(result);
		el._onNewResult = undefined;
	}

	// TODO: does the commit call belong here???
	if (result !== undefined) {
		result = result.then(() => commit(renderer, el, ctx, scope));
		const newResult = new Promise<undefined>(
			(resolve) => (el._onNewResult = resolve),
		);

		return Promise.race([result, newResult]);
	}

	return commit(renderer, el, ctx, scope);
}

// TODO: delete this function????
function prepareCommit<TValue>(el: Element): any {
	if (typeof el._children === "undefined") {
		el._flags |= flags.Dirty;
		return undefined;
	} else if (!Array.isArray(el._children)) {
		const child = el._children;
		if (typeof child === "object") {
			if (child._flags & (flags.Dirty | flags.Moved)) {
				el._flags |= flags.Dirty;
			}

			child._flags &= ~(flags.Dirty | flags.Moved);
		} else {
			el._flags |= flags.Dirty;
		}

		if (typeof child === "object") {
			if (child.tag === Portal) {
				return undefined;
			} else {
				return child._value;
			}
		} else {
			return child;
		}
	}

	let buffer: string | undefined;
	let values: Array<TValue | string> = [];
	for (let i = 0; i < el._children.length; i++) {
		const child = el._children[i];
		if (typeof child === "object") {
			if (child._flags & (flags.Dirty | flags.Moved)) {
				el._flags |= flags.Dirty;
			}

			child._flags &= ~(flags.Dirty | flags.Moved);
		} else {
			el._flags |= flags.Dirty;
		}

		if (typeof child === "object" && child.tag === Portal) {
			continue;
		}

		let value: any;
		if (typeof child === "object") {
			if (child.tag === Portal) {
				value = undefined;
			} else {
				value = child._value;
			}
		} else {
			value = child;
		}

		if (typeof value === "string") {
			buffer = buffer === undefined ? value : buffer + value;
		} else {
			if (buffer !== undefined) {
				values.push(buffer);
				buffer = undefined;
			}

			if (Array.isArray(value)) {
				values = values.concat(value);
			} else if (value !== undefined) {
				values.push(value);
			}
		}
	}

	if (buffer !== undefined) {
		values.push(buffer);
	}

	if (values.length === 0) {
		el._flags |= flags.Dirty;
		return undefined;
	} else if (values.length === 1) {
		return values[0];
	} else {
		return values;
	}
}

function commit<TValue>(
	renderer: Renderer<TValue, any, any>,
	el: Element,
	ctx: Context<unknown, TValue> | undefined,
	scope: Scope,
): Promise<undefined> | undefined {
	let value = prepareCommit(el);
	if (el._flags & flags.Dirty) {
		const children =
			value === undefined ? [] : Array.isArray(value) ? value : [value];
		if (el.tag === Portal) {
			try {
				el._value = renderer.arrange(Portal, el.props.root, children, scope);
			} catch (err) {
				return handle(ctx, err);
			}
		} else if (el.tag === Raw) {
			if (typeof el.props.value === "string") {
				try {
					el._value = renderer.parse(el.props.value, scope);
				} catch (err) {
					return handle(ctx, err);
				}
			} else {
				el._value = el.props.value;
			}
		} else if (el.tag === Fragment || typeof el.tag === "function") {
			el._value = value;
		} else {
			try {
				if ((el._flags & flags.Committed) === 0) {
					el._value = renderer.create(
						el.tag as string | symbol,
						el.props,
						children,
						scope,
					);
					el._flags |= flags.Committed;
				}

				renderer.patch(
					el.tag as string | symbol,
					el._value as TValue,
					el.props,
					scope,
				);
				renderer.arrange(
					el.tag as string | symbol,
					el._value as TValue,
					children,
					scope,
				);
			} catch (err) {
				return handle(ctx, err);
			}
		}
	}

	if (typeof el._onNewValue === "function") {
		el._onNewValue(el._value);
		el._onNewValue = undefined;
	}

	if (typeof el._ctx === "object") {
		setDelegates(el._ctx, el._value);
		if (typeof el._ctx._schedules === "object" && el._ctx._schedules.size > 0) {
			// We have to clear the schedules set before calling each callback, because otherwise a callback which refreshes the component would cause a stack overflow.
			const callbacks = Array.from(el._ctx._schedules);
			el._ctx._schedules.clear();
			for (const callback of callbacks) {
				callback(el._value);
			}
		}
	}

	if (typeof el.ref !== "undefined") {
		el.ref(el._value);
	}

	if (
		!(el._flags & flags.Updating) &&
		el._flags & flags.Dirty &&
		el.parent !== undefined
	) {
		// TODO: this is an untested and dubious situation all around and I’m not sure ctx makes sense here
		commit(renderer, el.parent, ctx, undefined);
	}

	el._flags &= ~flags.Updating;
}

function unmount<TValue>(
	renderer: Renderer<TValue, any, any>,
	el: Element,
	ctx: Context<unknown, TValue> | undefined,
	scope: Scope,
	dirty: boolean,
): Promise<undefined> | undefined {
	if (el._flags & flags.Unmounted) {
		return;
	}

	if (typeof el._ctx === "object" && typeof el._ctx._cleanups === "object") {
		for (const cleanup of el._ctx._cleanups) {
			cleanup(el._value);
		}

		el._ctx._cleanups = undefined;
	}

	// setting unmounted flag here is necessary because of some kind of race condition
	el._flags |= flags.Unmounted;
	if (!(el._flags & flags.Finished)) {
		el._flags |= flags.Finished;
		if (typeof el._ctx === "object") {
			// TODO: move this to contexts or something
			clearEventListeners(el._ctx);
			if (typeof el._ctx._onProps === "function") {
				el._ctx._onProps(el.props);
				el._ctx._onProps = undefined;
			}

			if (
				typeof el._ctx._iterator === "object" &&
				typeof el._ctx._iterator.return === "function"
			) {
				let iteration: IteratorResult<Child> | Promise<IteratorResult<Child>>;
				try {
					iteration = el._ctx._iterator.return();
				} catch (err) {
					return handle(ctx, err);
				}

				if (isPromiseLike(iteration)) {
					return iteration
						.then(() => {
							unmountChildren(renderer, el, ctx, scope);
							return undefined; // void :(
						})
						.catch((err) => handle(ctx, err));
				}
			}
		} else if (el.tag !== Fragment) {
			if (el.tag === Portal) {
				renderer.arrange(Portal, el.props.root, [], scope);
			} else if (dirty && el._flags & flags.Committed) {
				try {
					renderer.destroy(
						el.tag as symbol | string,
						el._value as TValue,
						scope,
					);
				} catch (err) {
					return handle(ctx, err);
				}
			}
		}
	}

	unmountChildren(renderer, el, ctx, scope);
}

function unmountChildren<TValue>(
	renderer: Renderer<TValue, any, any>,
	el: Element,
	ctx: Context | undefined,
	scope: Scope,
): void {
	ctx = el._ctx || ctx;
	const children =
		typeof el._children === "undefined"
			? []
			: Array.isArray(el._children)
			? el._children
			: [el._children];
	for (const child of children) {
		if (typeof child === "object") {
			unmount(renderer, child, ctx, scope, false);
		}
	}
}

export interface ProvisionMap {}

export class Context<TProps = any, TValue = any> implements EventTarget {
	renderer: Renderer<TValue, any, any>;
	_parent: Context<unknown, TValue> | undefined;
	_scope: Scope;
	_el: Element<Component>;
	_listeners: EventListenerRecord[] | undefined;
	// TODO: delete????
	_delegates: Set<EventTarget> | EventTarget | undefined;
	_iterator: ChildIterator | undefined;
	_provisions: Map<unknown, unknown> | undefined;
	_onProps: ((props: any) => unknown) | undefined;
	_oldResult: Promise<undefined> | undefined;
	_inflightPending: Promise<undefined> | undefined;
	_enqueuedPending: Promise<undefined> | undefined;
	_inflightResult: Promise<undefined> | undefined;
	_enqueuedResult: Promise<undefined> | undefined;
	_schedules: Set<(value: unknown) => unknown> | undefined;
	_cleanups: Set<(value: unknown) => unknown> | undefined;
	constructor(
		renderer: Renderer<TValue, any, any>,
		// TODO: can we pass the Component directly rather than the element???
		el: Element<Component>,
		parent: Context<unknown, TValue> | undefined,
		scope: Scope,
	) {
		this.renderer = renderer;
		this._el = el;
		this._parent = parent;
		this._scope = scope;
	}

	get<TKey extends keyof ProvisionMap>(key: TKey): ProvisionMap[TKey];
	get(key: unknown): any {
		for (
			let parent = this._parent;
			parent !== undefined;
			parent = parent._parent
		) {
			if (
				typeof parent._provisions === "object" &&
				parent._provisions.has(key)
			) {
				return parent._provisions.get(key)!;
			}
		}
	}

	set<TKey extends keyof ProvisionMap>(
		key: TKey,
		value: ProvisionMap[TKey],
	): void;
	set(key: unknown, value: any): void {
		if (typeof this._provisions === "undefined") {
			this._provisions = new Map();
		}

		this._provisions.set(key, value);
	}

	get props(): TProps {
		return this._el.props;
	}

	get value(): unknown {
		return this._el._value;
	}

	*[Symbol.iterator](): Generator<TProps> {
		const el = this._el;
		while (!(el._flags & flags.Unmounted)) {
			if (el._flags & flags.Iterating) {
				throw new Error("You must yield for each iteration of this.");
			} else if (el._flags & flags.AsyncGen) {
				throw new Error("Use for await...of in async generator components.");
			}

			el._flags |= flags.Iterating;
			yield el.props!;
		}
	}

	async *[Symbol.asyncIterator](): AsyncGenerator<TProps> {
		const el = this._el;
		do {
			if (el._flags & flags.Iterating) {
				throw new Error("You must yield for each iteration of this.");
			} else if (el._flags & flags.SyncGen) {
				throw new Error("Use for...of in sync generator components.");
			}

			el._flags |= flags.Iterating;
			if (el._flags & flags.Available) {
				el._flags &= ~flags.Available;
				yield el.props;
			} else {
				const props = await new Promise<TProps>(
					(resolve) => (this._onProps = resolve),
				);
				if (!(el._flags & flags.Unmounted)) {
					yield props;
				}
			}
		} while (!(el._flags & flags.Unmounted));
	}

	refresh(): Promise<undefined> | undefined {
		const el = this._el;
		if (el._flags & (flags.Stepping | flags.Unmounted)) {
			// TODO: we may want to log warnings when stuff like el happens
			return;
		}

		if (typeof this._onProps === "function") {
			this._onProps(el.props!);
			this._onProps = undefined;
		} else {
			el._flags |= flags.Available;
		}

		return run(this);
	}

	schedule(callback: (value: unknown) => unknown): void {
		if (typeof this._schedules === "undefined") {
			this._schedules = new Set();
		}

		this._schedules.add(callback);
	}

	cleanup(callback: (value: unknown) => unknown): void {
		if (typeof this._cleanups === "undefined") {
			this._cleanups = new Set();
		}

		this._cleanups.add(callback);
	}

	addEventListener<T extends string>(
		type: T,
		callback: MappedEventListener<T> | null,
		options?: boolean | AddEventListenerOptions,
	): void {
		if (callback == null) {
			return;
		} else if (typeof callback === "object") {
			// TODO: support handleEvent style listeners
			throw new Error("EventListener objects not supported");
		} else if (typeof this._listeners === "undefined") {
			this._listeners = [];
		}

		options = normalizeOptions(options);
		const record: EventListenerRecord = {type, callback, options};
		if (this._listeners.some(recordsEqual.bind(null, record))) {
			return;
		}

		this._listeners.push(record);
		if (options.once) {
			const self = this;
			callback = function (this: any, ev) {
				const result = callback!.call(this, ev);
				self.removeEventListener(record.type, record.callback, record.options);
				return result;
			};
		}

		if (typeof this._delegates !== "undefined") {
			if (isEventTarget(this._delegates)) {
				this._delegates.addEventListener(type, callback, options);
			} else {
				for (const delegate of this._delegates) {
					delegate.addEventListener(type, callback, options);
				}
			}
		}
	}

	removeEventListener<T extends string>(
		type: T,
		callback: MappedEventListener<T> | null,
		options?: EventListenerOptions | boolean,
	): void {
		if (callback == null || typeof this._listeners === "undefined") {
			return;
		}

		options = normalizeOptions(options);
		const record: EventListenerRecord = {type, callback, options};
		const i = this._listeners.findIndex(recordsEqual.bind(null, record));
		if (i === -1) {
			return;
		}

		this._listeners.splice(i, 1);
		if (typeof this._delegates !== "undefined") {
			if (isEventTarget(this._delegates)) {
				this._delegates.removeEventListener(type, callback, options);
			} else {
				for (const delegate of this._delegates) {
					delegate.removeEventListener(type, callback, options);
				}
			}
		}
	}

	dispatchEvent(ev: Event): boolean {
		const path: Context<unknown, TValue>[] = [];
		for (
			let parent = this._parent;
			parent !== undefined;
			parent = parent._parent
		) {
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
				if (typeof et._listeners !== "undefined") {
					setEventProperty(ev, "currentTarget", et);
					for (const record of et._listeners) {
						if (record.type === ev.type && record.options.capture) {
							try {
								record.callback.call(this, ev);
							} catch (err) {
								logError(err);
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

			if (typeof this._listeners !== "undefined") {
				setEventProperty(ev, "eventPhase", AT_TARGET);
				setEventProperty(ev, "currentTarget", this);
				for (const record of this._listeners) {
					if (record.type === ev.type) {
						try {
							record.callback.call(this, ev);
						} catch (err) {
							logError(err);
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
					if (typeof et._listeners !== "undefined") {
						setEventProperty(ev, "currentTarget", et);
						for (const record of et._listeners) {
							if (record.type === ev.type && !record.options.capture) {
								try {
									record.callback.call(this, ev);
								} catch (err) {
									logError(err);
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

function run(ctx: Context): Promise<undefined> | undefined {
	const el = ctx._el;
	if (typeof ctx._inflightPending === "undefined") {
		const [pending, result] = step(ctx);
		if (pending !== undefined) {
			ctx._inflightPending = pending.finally(() => advance(ctx));
		}

		if (result !== undefined) {
			ctx._inflightResult = result;
		}

		return result;
	} else if (el._flags & flags.AsyncGen) {
		return ctx._inflightResult;
	} else if (typeof ctx._enqueuedPending === "undefined") {
		let resolve: (value: Promise<undefined> | undefined) => unknown;
		ctx._enqueuedPending = ctx._inflightPending
			.then(() => {
				const [pending, result] = step(ctx);
				resolve(result);
				return pending;
			})
			.finally(() => advance(ctx));
		ctx._enqueuedResult = new Promise((resolve1) => (resolve = resolve1));
	}

	return ctx._enqueuedResult;
}

function step<TValue>(
	ctx: Context<any, TValue>,
): [Promise<undefined> | undefined, Promise<undefined> | undefined] {
	const el = ctx._el;
	if (el._flags & flags.Finished) {
		return [undefined, undefined];
	}

	el._flags |= flags.Stepping;
	if (typeof ctx._iterator === "undefined") {
		clearEventListeners(ctx);
		let value: ChildIterator | PromiseLike<Child> | Child;
		try {
			value = el.tag.call(ctx, el.props!);
		} catch (err) {
			const caught = handle(ctx._parent, err);
			return [undefined, caught];
		}

		if (isIteratorOrAsyncIterator(value)) {
			ctx._iterator = value;
		} else if (isPromiseLike(value)) {
			const value1 = upgradePromiseLike(value);
			const pending = value1.then(
				() => undefined,
				() => undefined,
			); // void :(
			const result = value1.then(
				(child) => updateChildren(ctx.renderer, el, child, ctx, ctx._scope),
				(err) => handle(ctx._parent, err),
			);
			el._flags &= ~flags.Stepping;
			return [pending, result];
		} else {
			const result = updateChildren(ctx.renderer, el, value, ctx, ctx._scope);
			el._flags &= ~flags.Stepping;
			return [undefined, result];
		}
	}

	let oldValue:
		| Promise<Array<TValue | string> | TValue | string | undefined>
		| Array<TValue | string>
		| TValue
		| string
		| undefined;
	if (typeof ctx._oldResult === "object") {
		oldValue = ctx._oldResult.then(
			() => el._value,
			() => el._value,
		);
		ctx._oldResult = undefined;
	} else {
		oldValue = el._value;
	}

	let iteration: IteratorResult<Child> | Promise<IteratorResult<Child>>;
	try {
		iteration = ctx._iterator.next(oldValue);
	} catch (err) {
		const caught = handle(ctx._parent, err);
		return [caught, caught];
	}

	el._flags &= ~flags.Stepping;
	if (isPromiseLike(iteration)) {
		el._flags |= flags.AsyncGen;
		iteration = iteration.catch((err) => {
			const caught = handle(ctx._parent, err);
			if (caught === undefined) {
				return {value: undefined, done: true};
			}

			return caught.then(() => ({value: undefined, done: true}));
		});
		const pending = iteration.then(
			() => undefined,
			() => undefined,
		); // void :(
		const result = iteration.then((iteration) => {
			el._flags &= ~flags.Iterating;
			if (iteration.done) {
				el._flags |= flags.Finished;
			}

			let result = updateChildren(
				ctx.renderer,
				el,
				iteration.value,
				ctx,
				ctx._scope,
			);
			if (result !== undefined) {
				ctx._oldResult = result;
			}

			return result;
		});

		return [pending, result];
	}

	el._flags &= ~flags.Iterating;
	el._flags |= flags.SyncGen;
	if (iteration.done) {
		el._flags |= flags.Finished;
	}

	const result = updateChildren(
		ctx.renderer,
		el,
		iteration.value,
		ctx,
		ctx._scope,
	);
	return [result, result];
}

function advance(ctx: Context): void {
	const el = ctx._el;
	ctx._inflightPending = ctx._enqueuedPending;
	ctx._inflightResult = ctx._enqueuedResult;
	ctx._enqueuedPending = undefined;
	ctx._enqueuedResult = undefined;
	if (el._flags & flags.AsyncGen && !(el._flags & flags.Finished)) {
		// TODO: Figure out a way to call refresh here instead...
		run(ctx)!.catch((err) => {
			// We catch and rethrow the error to trigger an unhandled promise rejection.
			if (!(el._flags & flags.Updating)) {
				throw err;
			}
		});
	}
}

function handle<TValue>(
	ctx: Context<any, TValue> | undefined,
	reason: unknown,
): Promise<undefined> | undefined {
	if (ctx === undefined) {
		throw reason;
	}

	const el = ctx._el;
	el._flags |= flags.Handling;
	// helps avoid deadlocks
	if (typeof ctx._onProps === "function") {
		ctx._onProps(el.props!);
		ctx._onProps = undefined;
	}

	if (
		!(el._flags & flags.Finished) &&
		typeof ctx._iterator === "object" &&
		typeof ctx._iterator.throw === "function"
	) {
		let iteration: IteratorResult<Child> | Promise<IteratorResult<Child>>;
		try {
			iteration = ctx._iterator.throw!(reason);
		} catch (err) {
			return handle(ctx._parent, err);
		}

		if (isPromiseLike(iteration)) {
			return iteration
				.then((iteration) => {
					if (iteration.done) {
						el._flags |= flags.Finished;
					}

					return updateChildren(
						ctx.renderer,
						el,
						iteration.value,
						ctx,
						ctx._scope,
					);
				})
				.catch((err) => handle(ctx._parent, err));
		}

		if (iteration.done) {
			el._flags |= flags.Finished;
		}

		return updateChildren(ctx.renderer, el, iteration.value, ctx, ctx._scope);
	}

	return handle(ctx._parent, reason);
}

// event stuff
const NONE = 0;
const CAPTURING_PHASE = 1;
const AT_TARGET = 2;
const BUBBLING_PHASE = 3;

export interface EventMap {
	[type: string]: Event;
}

type MappedEventListener<T extends string> = (ev: EventMap[T]) => unknown;

interface EventListenerRecord {
	type: string;
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

function recordsEqual(
	record1: EventListenerRecord,
	record2: EventListenerRecord,
): boolean {
	return (
		record1.type === record2.type &&
		record1.callback === record2.callback &&
		!record1.options.capture === !record2.options.capture
	);
}

function logError(err: unknown): void {
	/* eslint-disable no-console */
	if (typeof console !== "undefined" && typeof console.error === "function") {
		console.error(err);
	}
	/* eslint-enable no-console */
}

function setEventProperty<T extends keyof Event>(
	ev: Event,
	key: T,
	value: Event[T],
): void {
	Object.defineProperty(ev, key, {value, writable: false, configurable: true});
}

function setDelegates(ctx: Context, delegates: unknown): void {
	if (typeof ctx._delegates === "undefined") {
		if (isEventTarget(delegates)) {
			ctx._delegates = delegates;
			if (typeof ctx._listeners !== "undefined") {
				for (const record of ctx._listeners) {
					ctx._delegates.addEventListener(
						record.type,
						record.callback,
						record.options,
					);
				}
			}
		} else if (Array.isArray(delegates)) {
			ctx._delegates = new Set(delegates.filter(isEventTarget));
			if (typeof ctx._listeners !== "undefined") {
				for (const record of ctx._listeners) {
					for (const delegate of ctx._delegates) {
						delegate.addEventListener(
							record.type,
							record.callback,
							record.options,
						);
					}
				}
			}
		}
	} else if (isEventTarget(ctx._delegates)) {
		if (isEventTarget(delegates)) {
			if (ctx._delegates !== delegates) {
				if (typeof ctx._listeners !== "undefined") {
					for (const record of ctx._listeners) {
						ctx._delegates.removeEventListener(
							record.type,
							record.callback,
							record.options,
						);
						delegates.addEventListener(
							record.type,
							record.callback,
							record.options,
						);
					}
				}

				ctx._delegates = delegates;
			}
		} else if (Array.isArray(delegates)) {
			const delegates1 = new Set(delegates.filter(isEventTarget));
			if (typeof ctx._listeners !== "undefined") {
				for (const record of ctx._listeners) {
					ctx._delegates.removeEventListener(
						record.type,
						record.callback,
						record.options,
					);
					for (const delegate of delegates1) {
						delegate.addEventListener(
							record.type,
							record.callback,
							record.options,
						);
					}
				}
			}

			ctx._delegates = delegates1;
		} else {
			if (typeof ctx._listeners !== "undefined") {
				for (const record of ctx._listeners) {
					ctx._delegates.removeEventListener(
						record.type,
						record.callback,
						record.options,
					);
				}
			}

			ctx._delegates = undefined;
		}
	} else {
		const delegates1 = ctx._delegates;
		let delegates2: Set<EventTarget>;
		if (isEventTarget(delegates)) {
			delegates2 = new Set([delegates]);
			ctx._delegates = delegates;
		} else if (Array.isArray(delegates)) {
			delegates2 = new Set(delegates.filter(isEventTarget));
			ctx._delegates = delegates2;
		} else {
			delegates2 = new Set();
			ctx._delegates = undefined;
		}

		if (typeof ctx._listeners !== "undefined") {
			const removed = new Set(
				Array.from(delegates1).filter((d) => !delegates2.has(d)),
			);
			const added = new Set(
				Array.from(delegates2).filter((d) => !delegates1.has(d)),
			);

			for (const record of ctx._listeners) {
				for (const delegate of removed) {
					delegate.removeEventListener(
						record.type,
						record.callback,
						record.options,
					);
				}

				for (const delegate of added) {
					delegate.addEventListener(
						record.type,
						record.callback,
						record.options,
					);
				}
			}
		}
	}
}

function clearEventListeners(ctx: Context): void {
	if (typeof ctx._listeners !== "undefined") {
		// We shallow copy _listeners because removeEventListener will mutate it.
		const records = ctx._listeners.slice();
		for (const record of records) {
			ctx.removeEventListener(record.type, record.callback, record.options);
		}
	}
}
