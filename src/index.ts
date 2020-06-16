import * as flags from "./flags";
import {
	isIteratorOrAsyncIterator,
	isNonStringIterable,
	isPromiseLike,
	upgradePromiseLike,
} from "./utils";

function arrayify<T>(value: Array<T> | T | undefined): Array<T> {
	if (value === undefined) {
		return [];
	} else if (Array.isArray(value)) {
		return value;
	} else {
		return [value];
	}
}

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
	tag: TTag;
	props: TagProps<TTag>;
	key: Key;
	ref: Function | undefined;
	$sigil: typeof ElementSigil;
	_flags: number;
	_value: any;
	_ctx: Context<TagProps<TTag>> | undefined;
	_children: NormalizedChildren;
	_onNewResults: Function | undefined;
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
		this._flags = 0;
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
	const props1 = {} as TagProps<TTag>;
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

function getChildValues<TValue>(el: Element): Array<TValue | string> {
	let result: Array<TValue | string> = [];
	for (const child of arrayify(el._children)) {
		if (child === undefined) {
			// pass
		} else if (typeof child === "string") {
			result.push(child);
		} else if (typeof child.tag === "function" || child.tag === Fragment) {
			result = result.concat(getChildValues(child));
		} else if (child.tag !== Portal) {
			result.push(child._value);
		}
	}

	return result;
}

function getChildValueOrValues<TValue>(
	child: NormalizedChild,
): Array<TValue | string> | TValue | string | undefined {
	if (typeof child === "undefined" || typeof child === "string") {
		return child;
	}

	const el = child;
	if (el._flags & flags.Committed) {
		return el._value;
	}

	const childValues = getChildValues<TValue>(el);
	return childValues.length > 1 ? childValues : childValues[0];
}

// TODO: better name for this function
function flatten<TValue>(
	values: Array<
		Array<TValue | string | undefined> | TValue | string | undefined
	>,
): Array<TValue | string> {
	const result: Array<TValue | string> = [];
	let buffer: string | undefined;
	for (const value of values) {
		if (typeof value === "undefined") {
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
			for (const value1 of value) {
				if (typeof value1 === "undefined") {
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

// Special Intrinsic Tags
// TODO: We assert symbol tags as any because typescript support for symbol tags in JSX does not exist yet.
// TODO: Maybe we can just make these strings???
// https://github.com/microsoft/TypeScript/issues/38367
export const Fragment = Symbol.for("crank.Fragment") as any;
export type Fragment = typeof Fragment;

export const Copy = Symbol.for("crank.Copy") as any;
export type Copy = typeof Copy;

export const Portal = Symbol.for("crank.Portal") as any;
export type Portal = typeof Portal;

export const Raw = Symbol.for("crank.Raw") as any;
export type Raw = typeof Raw;

export abstract class Renderer<
	TValue extends TChild,
	TChild = TValue,
	TResult = any
> {
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
			mount(this, newPortal, undefined, undefined, newPortal);
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

		const result = update(this, newPortal, undefined, undefined, newPortal);
		if (isPromiseLike(result)) {
			return (result as Promise<any>).then(() => {
				if (newPortal.props.root == null) {
					unmount(this, newPortal, undefined, true);
				}

				return newPortal._value;
			});
		}

		if (newPortal.props.root == null) {
			unmount(this, newPortal, undefined, true);
		}

		return newPortal._value;
	}

	abstract create<TTag extends string | symbol>(
		tag: string | symbol,
		props: TagProps<TTag>,
		children: Array<TChild | string>,
		scope: Scope,
	): TValue;

	abstract escape(text: string, scope: Scope): string;

	abstract parse(text: string, scope: Scope): TChild;

	// TODO: remove scope??????
	abstract patch<TTag extends string | symbol>(
		tag: string | symbol,
		value: TValue,
		props: TagProps<TTag>,
		scope: Scope,
	): unknown;

	// TODO: remove scope
	abstract arrange<TTag extends string | symbol>(
		tag: string | symbol,
		value: TValue | undefined,
		children: Array<TChild | string>,
		scope: Scope,
	): TResult;

	// TODO: remove scope
	abstract destroy(tag: string | symbol, value: TValue, scope: Scope): unknown;

	abstract scope<TTag extends string | symbol>(
		tag: TTag,
		props: TagProps<TTag>,
		scope: Scope,
	): Scope;
}

// TODO: maybe it’s just better to have these be methods
function mount<TTag extends Tag, TValue>(
	renderer: Renderer<TValue, any, any>,
	el: Element<TTag>,
	ctx: Context<TagProps<TTag>, TValue> | undefined,
	scope: Scope,
	arranger: Element<string | symbol>,
): Element<TTag> {
	if (typeof el._flags === "undefined" || el._flags & flags.Mounted) {
		el = new Element(el.tag, el.props, el.key, el.ref);
	}

	el._flags |= flags.Mounted;
	if (typeof el.tag === "function") {
		el._ctx = new Context(
			renderer,
			el as Element<Component>,
			ctx,
			scope,
			arranger,
		);
	}

	return el;
}

function update<TValue>(
	renderer: Renderer<TValue, any, any>,
	el: Element,
	ctx: Context<any, TValue> | undefined,
	scope: Scope,
	arranger: Element<string | symbol>,
): any {
	el._flags |= flags.Updating;
	if (typeof el._ctx === "object") {
		return el._ctx.refresh();
	}

	return updateChildren(renderer, el, el.props.children, ctx, scope, arranger);
}

function updateChildren<TValue>(
	renderer: Renderer<TValue, any, any>,
	el: Element,
	children: Children,
	ctx: Context<unknown, TValue> | undefined,
	scope: Scope,
	arranger: Element<string | symbol>,
): any {
	if (typeof el.tag === "function") {
		if (isNonStringIterable(children)) {
			children = createElement(Fragment, null, children);
		}
	} else if (
		typeof el.tag === "string" ||
		(el.tag !== Fragment && el.tag !== Portal && el.tag !== Raw)
	) {
		scope = renderer.scope(el.tag as string | symbol, el.props, scope);
		arranger = el as Element<string | symbol>;
	}

	let async = false;
	const results: Array<Promise<unknown> | unknown> = [];
	const handling = el._flags & flags.Handling;
	const children1: Array<NormalizedChild> = [];
	let childrenByKey: Map<Key, Element> | undefined;
	let i = 0;
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
			let result1: any;
			if (newChild1.tag === Copy) {
				// TODO: do refs make sense for copies?
				newChild1 = oldChild;
				result1 = getChildValueOrValues(oldChild);
			} else if (typeof oldChild === "object") {
				if (oldChild.tag === newChild1.tag) {
					if (oldChild !== newChild) {
						oldChild.props = newChild1.props;
						oldChild.ref = newChild1.ref;
						newChild1 = oldChild;
					}

					result1 = update(renderer, newChild1, ctx, scope, arranger);
				} else {
					newChild1 = mount(renderer, newChild1, ctx, scope, arranger);
					result1 = update(renderer, newChild1, ctx, scope, arranger);
					if (isPromiseLike(result1)) {
						// // storing variables for callback closures
						// const oldChild1 = oldChild;
						// // TODO: unmount the oldChild after result1 settles
					} else {
						unmount(renderer, oldChild, scope, true);
					}
				}
			} else {
				newChild1 = mount(renderer, newChild1, ctx, scope, arranger);
				result1 = update(renderer, newChild1, ctx, scope, arranger);
			}

			if (isPromiseLike(result1)) {
				async = true;
			}

			results.push(result1);
		} else {
			if (typeof oldChild === "object") {
				unmount(renderer, oldChild, scope, true);
			}

			if (typeof newChild1 === "string") {
				newChild1 = renderer.escape(newChild1, scope);
			}

			results.push(newChild1);
		}

		// push to children1
		children1.push(newChild1);

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

	// TODO: I hate this
	if (handling !== (el._flags & flags.Handling)) {
		el._flags &= ~flags.Handling;
		return getChildValueOrValues(el);
	}

	if (typeof el._children !== "undefined") {
		if (Array.isArray(el._children)) {
			for (; i < el._children.length; i++) {
				const oldChild = el._children[i];
				if (
					typeof oldChild === "object" &&
					typeof oldChild.key === "undefined"
				) {
					unmount(renderer, oldChild, scope, true);
				}
			}
		} else if (
			i === 0 &&
			typeof el._children === "object" &&
			typeof el._children.key === "undefined"
		) {
			unmount(renderer, el._children, scope, true);
		}
	}

	// TODO: likely where logic for asynchronous unmounting will go
	if (typeof el._childrenByKey === "object") {
		for (const child of el._childrenByKey.values()) {
			unmount(renderer, child, scope, true);
		}
	}

	el._children = children1.length > 1 ? children1 : children1[0];
	el._childrenByKey = childrenByKey;
	if (async) {
		let onNewResults!: Function;
		const newResultsP = new Promise<any>((resolve) => (onNewResults = resolve));
		const resultsP = Promise.race([Promise.all(results), newResultsP]);
		if (typeof el._onNewResults === "function") {
			el._onNewResults(resultsP);
		}

		el._onNewResults = onNewResults;
		return resultsP.then((results) =>
			commit(renderer, el, scope, flatten(results)),
		);
	}

	if (typeof el._onNewResults === "function") {
		el._onNewResults(results);
		el._onNewResults = undefined;
	}

	return commit(renderer, el, scope, flatten(results));
}

// TODO: maybe the return value can be the normalized form of the children?
function commit<TValue>(
	renderer: Renderer<TValue, any, any>,
	el: Element,
	scope: Scope,
	children: Array<TValue | string>,
): any {
	const value = children.length > 1 ? children : children[0];
	let result: any;
	if (typeof el._ctx === "object") {
		setDelegates(el._ctx, value);
		if (typeof el._ctx._schedules === "object" && el._ctx._schedules.size > 0) {
			// We have to clear the set of callbacks before calling them, because a callback which refreshes the component would otherwise cause a stack overflow.
			const callbacks = Array.from(el._ctx._schedules);
			el._ctx._schedules.clear();
			for (const callback of callbacks) {
				callback(value);
			}
		}

		if (!(el._ctx._arranger._flags & flags.Updating)) {
			rearrange(renderer, el._ctx._arranger);
		}

		result = value;
	} else if (el.tag === Portal) {
		el._value = renderer.arrange(Portal, el.props.root, children, scope);
		result = undefined;
	} else if (el.tag === Raw) {
		if (typeof el.props.value === "string") {
			el._value = renderer.parse(el.props.value, scope);
		} else {
			el._value = el.props.value;
		}

		result = el._value;
	} else if (el.tag === Fragment) {
		result = value;
	} else {
		if (!(el._flags & flags.Committed)) {
			el._value = renderer.create(
				el.tag as string | symbol,
				el.props,
				children,
				scope,
			);
			el._flags |= flags.Committed;
		}

		renderer.patch(el.tag as string | symbol, el._value, el.props, scope);
		renderer.arrange(el.tag as string | symbol, el._value, children, scope);
		result = el._value;
	}

	if (typeof el.ref === "function") {
		el.ref(result);
	}

	el._flags &= ~flags.Updating;
	return result;
}

function unmount<TValue>(
	renderer: Renderer<TValue, any, any>,
	el: Element,
	scope: Scope,
	dirty: boolean,
): any {
	if (el._flags & flags.Unmounted) {
		return;
	}

	if (typeof el._ctx === "object" && typeof el._ctx._cleanups === "object") {
		const value = getChildValueOrValues(el);
		for (const cleanup of el._ctx._cleanups) {
			cleanup(value);
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
				iteration = el._ctx._iterator.return();
				if (isPromiseLike(iteration)) {
					return iteration.then(() => unmountChildren(renderer, el, scope));
				}
			}
		} else if (el.tag === Portal) {
			renderer.arrange(Portal, el.props.root, [], scope);
		} else if (el.tag !== Fragment && dirty && el._flags & flags.Committed) {
			renderer.destroy(el.tag as symbol | string, el._value, scope);
		}
	}

	unmountChildren(renderer, el, scope);
}

function unmountChildren(
	renderer: Renderer<any, any, any>,
	el: Element,
	scope: Scope,
): any /* void */ {
	for (const child of arrayify(el._children)) {
		if (typeof child === "object") {
			unmount(renderer, child, scope, false);
		}
	}
}

// TODO: remove scope from arrange
function rearrange(
	renderer: Renderer<any, any, any>,
	el: Element<string | symbol>,
): void {
	renderer.arrange(
		el.tag,
		el.tag === Portal ? el.props.root : el._value,
		Array.from(getChildValues(el)),
		// TODO: it is impossible to reconstruct the scope here
		undefined,
	);
}

export interface ProvisionMap {}

export class Context<TProps = any, TValue = any> implements EventTarget {
	renderer: Renderer<TValue, any, any>;
	_el: Element<Component>;
	_parent: Context<unknown, TValue> | undefined;
	_scope: Scope;
	_arranger: Element<string | symbol>;
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
		arranger: Element<string | symbol>,
	) {
		this.renderer = renderer;
		this._el = el;
		this._parent = parent;
		this._scope = scope;
		this._arranger = arranger;
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
		return getChildValueOrValues(this._el);
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
		if (isPromiseLike(pending)) {
			ctx._inflightPending = (pending as Promise<any>).finally(() =>
				advance(ctx),
			);
		}

		if (isPromiseLike(result)) {
			ctx._inflightResult = result as Promise<any>;
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

function step<TValue>(ctx: Context<any, TValue>): [any, any] {
	const el = ctx._el;
	if (el._flags & flags.Finished) {
		return [undefined, getChildValueOrValues(el)];
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
			const result = value1
				.then((child) =>
					updateChildren(
						ctx.renderer,
						el,
						child,
						ctx,
						ctx._scope,
						ctx._arranger,
					),
				)
				.catch((err) => handle(ctx, err));
			el._flags &= ~flags.Stepping;
			return [pending, result];
		} else {
			let result = updateChildren(
				ctx.renderer,
				el,
				value,
				ctx,
				ctx._scope,
				ctx._arranger,
			);
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
			() => getChildValueOrValues<TValue>(el),
			() => getChildValueOrValues<TValue>(el),
		);
		ctx._oldResult = undefined;
	} else {
		oldValue = getChildValueOrValues<TValue>(el);
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
			if (isPromiseLike(caught)) {
				return (caught as Promise<any>).then(() => ({
					value: undefined,
					done: true,
				}));
			}

			return {value: undefined, done: true};
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
				ctx._arranger,
			);

			if (isPromiseLike(result)) {
				ctx._oldResult = result as Promise<any>;
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

	let result = updateChildren(
		ctx.renderer,
		el,
		iteration.value,
		ctx,
		ctx._scope,
		ctx._arranger,
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
		run(ctx);
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
						ctx._arranger,
					);
				})
				.catch((err) => handle(ctx._parent, err));
		}

		if (iteration.done) {
			el._flags |= flags.Finished;
		}

		return updateChildren(
			ctx.renderer,
			el,
			iteration.value,
			ctx,
			ctx._scope,
			ctx._arranger,
		);
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
