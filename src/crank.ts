// TODO: Implement EventTarget implementation which doesn’t change EventTarget
// typings and is exactly compatible with DOM/typescript lib EventTarget
import {EventTarget as EventTargetShim} from "event-target-shim";
import {Repeater, SlidingBuffer} from "@repeaterjs/repeater";
import {isPromiseLike, MaybePromise, MaybePromiseLike, Pledge} from "./pledge";

interface EventListenerDetail {
	type: string;
	callback: EventListenerOrEventListenerObject;
	options: AddEventListenerOptions;
}

function normalizeOptions(
	options?: boolean | AddEventListenerOptions,
): AddEventListenerOptions {
	let capture = false;
	let passive: boolean | undefined;
	let once: boolean | undefined;
	if (typeof options === "boolean") {
		capture = options;
	} else if (options != null) {
		capture = !!options.capture;
		passive = options.passive;
		once = options.once;
	}

	return {capture, passive, once};
}

// TODO: add these type overloads to CrankEventTarget
export interface CrankEventMap {
	"crank.refresh": RefreshEvent;
	"crank.unmount": Event;
}

export class CrankEventTarget extends EventTargetShim implements EventTarget {
	constructor(private parent?: CrankEventTarget) {
		super();
	}

	// TODO: maybe use a helper class?
	// we need a map from:
	// type -> capture -> listener detail
	// for efficient querying
	private listeners: EventListenerDetail[] = [];

	private _delegates: Set<EventTarget> = new Set();

	get delegates(): Set<EventTarget> {
		return this._delegates;
	}

	set delegates(delegates: Set<EventTarget>) {
		const removed = new Set(
			Array.from(this._delegates).filter((d) => !delegates.has(d)),
		);
		const added = new Set(
			Array.from(delegates).filter((d) => !this._delegates.has(d)),
		);

		for (const delegate of removed) {
			for (const listener of this.listeners) {
				delegate.removeEventListener(
					listener.type,
					listener.callback,
					listener.options,
				);
			}
		}

		for (const delegate of added) {
			for (const listener of this.listeners) {
				delegate.addEventListener(
					listener.type,
					listener.callback,
					listener.options,
				);
			}
		}

		this._delegates = delegates;
	}

	addEventListener(
		type: string,
		callback: EventListenerOrEventListenerObject | null,
		options?: boolean | AddEventListenerOptions,
	): unknown {
		if (callback == null) {
			return;
		}

		options = normalizeOptions(options);
		const detail: EventListenerDetail = {type, callback, options};
		if (options.once) {
			if (typeof callback === "object") {
				throw new Error("options.once not implemented for listener objects");
			} else {
				const self = this;
				detail.callback = function(ev: any) {
					const result = callback.call(this, ev);
					self.removeEventListener(
						detail.type,
						detail.callback,
						detail.options,
					);
					return result;
				};
			}
		}

		if (detail.type.slice(0, 6) !== "crank.") {
			const idx = this.listeners.findIndex((detail1) => {
				return (
					detail.type === detail1.type &&
					detail.callback === detail1.callback &&
					detail.options.capture === detail1.options.capture
				);
			});

			if (idx <= -1) {
				this.listeners.push(detail);
			}
		}

		for (const delegate of this.delegates) {
			delegate.addEventListener(type, callback, options);
		}

		return super.addEventListener(type, callback, options);
	}

	removeEventListener(
		type: string,
		callback: EventListenerOrEventListenerObject | null,
		options?: EventListenerOptions | boolean,
	): void {
		if (callback == null) {
			return;
		}

		const capture =
			typeof options === "boolean" ? options : !!(options && options.capture);
		const idx = this.listeners.findIndex((detail) => {
			return (
				detail.type === type &&
				detail.callback === callback &&
				detail.options.capture === capture
			);
		});
		const detail = this.listeners[idx];
		if (detail !== undefined) {
			this.listeners.splice(idx, 1);
		}
		for (const delegate of this.delegates) {
			delegate.removeEventListener(type, callback, options);
		}

		return super.removeEventListener(type, callback, options);
	}

	removeAllEventListeners(): void {
		for (const listener of this.listeners.slice()) {
			this.removeEventListener(
				listener.type,
				listener.callback,
				listener.options,
			);
		}
	}

	// TODO: remove once listeners which were dispatched
	// TODO: ev is any because event-target-shim has a weird dispatchEvent type
	dispatchEvent(ev: any): boolean {
		let continued = super.dispatchEvent(ev);
		if (continued && ev.bubbles && this.parent !== undefined) {
			// TODO: This is the poor man’s event dispatch, doesn’t even handle
			// capturing.
			continued = this.parent.dispatchEvent(ev);
		}

		return continued;
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

// TODO: make this non-global?
declare global {
	module JSX {
		interface IntrinsicElements {
			[tag: string]: any;
		}

		// TODO: I don‘t think this actually type checks children
		interface ElementChildrenAttribute {
			children: Children;
		}
	}
}

function isIterable(value: any): value is Iterable<any> {
	return value != null && typeof value[Symbol.iterator] === "function";
}

type NonStringIterable<T> = Iterable<T> & object;

function isNonStringIterable(value: any): value is NonStringIterable<any> {
	return typeof value !== "string" && isIterable(value);
}

function isIteratorOrAsyncIterator(
	value: any,
): value is Iterator<any> | AsyncIterator<any> {
	return value != null && typeof value.next === "function";
}

// TODO: user-defined control tags?
export const Default = Symbol.for("crank.Default");

export type Default = typeof Default;

// TODO: We use any for symbol tags because typescript is dumb and doesn’t
// allow symbols in jsx expressions.
// TODO: Rename to Container?
export const Root: any = Symbol.for("crank.Root") as any;

export type Root = typeof Root;

// TODO: implement the Copy tag
// export const Copy = Symbol("crank.Copy") as any;
//
// export type Copy = typeof Copy;

export const Fragment: any = Symbol.for("crank.Fragment") as any;

export type Fragment = typeof Fragment;

export type Tag = Component | symbol | string;

export type Child = Element | string | number | boolean | null | undefined;

interface NestedChildIterable extends Iterable<Child | NestedChildIterable> {}

export type Children = Child | NestedChildIterable;

export interface Props {
	children?: Children;
	"crank-key"?: unknown;
	[name: string]: any;
}

const ElementSigil: unique symbol = Symbol.for("crank.ElementSigil");

export interface Element<T extends Tag = Tag> {
	[ElementSigil]: true;
	tag: T;
	props: Props;
	key?: unknown;
}

export function isElement(value: any): value is Element {
	return value != null && value[ElementSigil];
}

export function isIntrinsicElement(
	value: any,
): value is Element<string | symbol> {
	return isElement(value) && typeof value.tag !== "function";
}

export function isComponentElement(value: any): value is Element<Component> {
	return isElement(value) && typeof value.tag === "function";
}

export function isKeyedElement(value: any): value is Element & {key: string} {
	return value != null && value[ElementSigil] && value.key !== undefined;
}

export function createElement<T extends Tag>(
	tag: T,
	props?: Props | null,
	...children: Children[]
): Element<T>;
export function createElement<T extends Tag>(
	tag: T,
	props?: Props | null,
): Element<T> {
	props = Object.assign({}, props);
	const key = props["crank-key"];
	if (key !== undefined) {
		delete props["crank-key"];
	}

	if (arguments.length > 3) {
		props.children = Array.from(arguments).slice(2);
	} else if (arguments.length > 2) {
		props.children = arguments[2];
	}

	return {[ElementSigil]: true, tag, props, key};
}

export interface IntrinsicProps<T> {
	[key: string]: any;
	children?: (T | string)[];
}

// TODO: use a context pattern here?
export type IntrinsicIterator<T> = Iterator<
	T | undefined,
	undefined,
	IntrinsicProps<T>
>;

// TODO: allow intrinsics to be a simple function
export type Intrinsic<T> = (props: IntrinsicProps<T>) => IntrinsicIterator<T>;

export type Guest = Element | string | undefined;

function toGuest(child: Child): Guest {
	if (child == null || typeof child === "boolean") {
		return undefined;
	} else if (typeof child === "number") {
		return child.toString();
	} else if (typeof child === "string" || isElement(child)) {
		return child;
	}

	throw new TypeError("Unknown child type");
}

// TODO: explain what this higher-order function does
function chase<Return, This>(
	fn: (this: This, ...args: any[]) => PromiseLike<Return> | Return,
): (this: This, ...args: any[]) => Promise<Return> | Return {
	let next: ((result: PromiseLike<Return> | Return) => unknown) | undefined;
	return function chaseWrapper(...args: unknown[]): Promise<Return> | Return {
		const result = fn.apply(this, args);
		if (next !== undefined) {
			next(result);
		}

		if (isPromiseLike(result)) {
			const nextP = new Promise<Return>((resolve) => (next = resolve));
			return Promise.race([result, nextP]);
		}

		return result;
	};
}

// TODO: maybe we should have only 1 host per tag and key
export class View<T> {
	guest?: Guest;
	ctx?: Context;
	updating = false;
	private firstChild?: View<T>;
	private nextSibling?: View<T>;
	private previousSibling?: View<T>;
	private unmounting = false;
	private node?: T | string;
	// TODO: delete and use unmounting + cachedChildNodes
	private hanging?: (T | string)[];
	private cachedChildNodes?: (T | string)[];
	private iterator?: ComponentIterator;
	private committer?: IntrinsicIterator<T>;
	// TODO: create viewsByKey on demand
	private viewsByKey: Map<unknown, View<T>> = new Map();
	constructor(
		private parent: View<T> | undefined,
		// TODO: Figure out a way to not have to pass in a renderer
		private renderer: Renderer<T>,
	) {}

	private insertBefore(newView: View<T>, view: View<T>): void {
		newView.nextSibling = view;
		if (view.previousSibling === undefined) {
			this.firstChild = newView;
		} else {
			newView.previousSibling = view.previousSibling;
			view.previousSibling.nextSibling = newView;
		}

		view.previousSibling = newView;
	}

	private insertAfter(newView: View<T>, view: View<T>): void {
		newView.previousSibling = view;
		if (view.nextSibling !== undefined) {
			newView.nextSibling = view.nextSibling;
			view.nextSibling.previousSibling = newView;
		}

		view.nextSibling = newView;
	}

	private removeChild(view: View<T>): void {
		if (view.previousSibling === undefined) {
			this.firstChild = view.nextSibling;
		} else {
			view.previousSibling.nextSibling = view.nextSibling;
		}

		if (view.nextSibling !== undefined) {
			view.nextSibling.previousSibling = view.previousSibling;
		}

		view.previousSibling = undefined;
		view.nextSibling = undefined;
	}

	get childNodes(): (T | string)[] {
		if (this.cachedChildNodes !== undefined) {
			return this.cachedChildNodes;
		}

		let buffer: string | undefined;
		const childNodes: (T | string)[] = [];
		for (
			let childView = this.firstChild;
			childView !== undefined;
			childView = childView.nextSibling
		) {
			if (childView.hanging !== undefined) {
				childNodes.push(...childView.hanging);
			} else if (typeof childView.node === "string") {
				buffer = (buffer || "") + childView.node;
			} else {
				if (buffer !== undefined) {
					childNodes.push(buffer);
					buffer = undefined;
				}

				if (childView.node === undefined) {
					childNodes.push(...childView.childNodes);
				} else {
					childNodes.push(childView.node);
				}
			}
		}

		if (buffer !== undefined) {
			childNodes.push(buffer);
		}

		if (this.ctx !== undefined && isComponentElement(this.guest)) {
			// TODO: filter type narrowing is not working
			const delegates: EventTarget[] = childNodes.filter(isEventTarget) as any;
			this.ctx.delegates = new Set(delegates);
		}

		this.cachedChildNodes = childNodes;
		return childNodes;
	}

	get childNodeOrNodes(): (T | string)[] | T | string | undefined {
		if (this.childNodes.length > 1) {
			return this.childNodes;
		}

		return this.childNodes[0];
	}

	// TODO: get this function onto the prototype, not the instance
	update = chase(function update(
		this: View<T>,
		guest: Guest,
	): MaybePromise<undefined> {
		this.updating = true;
		if (
			!isElement(this.guest) ||
			!isElement(guest) ||
			this.guest.tag !== guest.tag ||
			// TODO: never reuse a view when keys differ
			this.guest.key !== guest.key
		) {
			void this.unmount();
			this.guest = guest;
			if (isElement(guest)) {
				this.ctx = new Context(this, this.parent && this.parent.ctx);
				if (typeof guest.tag === "function") {
					this.iterator = new ComponentIterator(this);
				}
			}
		} else {
			this.guest = guest;
		}

		return this.refresh();
	});

	// TODO: batch this per microtask or something
	enqueueCommit(): void {
		this.cachedChildNodes = undefined;
		this.commit();
	}

	commit(): void {
		if (isElement(this.guest)) {
			if (typeof this.guest.tag === "function") {
				if (!this.updating && this.parent !== undefined) {
					this.parent.enqueueCommit();
				}
			} else {
				const props = {...this.guest.props, children: this.childNodes};
				if (this.committer === undefined) {
					const intrinsic = this.renderer.intrinsicFor(this.guest.tag);
					if (intrinsic) {
						this.committer = intrinsic(props);
					} else {
						// TODO: don’t create an iterator for fragments
						this.committer = (function*() {
							while (true) {
								yield;
							}
						})();
					}
				}

				const iteration = this.committer.next(props);
				this.node = iteration.value;
				if (iteration.done) {
					this.committer = undefined;
				}
			}
		}

		this.updating = false;
	}

	refresh(): MaybePromise<undefined> {
		if (isElement(this.guest)) {
			if (this.ctx !== undefined) {
				const ev = new CustomEvent("crank.refresh", {
					detail: {props: this.guest.props},
				});
				this.ctx.dispatchEvent(ev);
			}

			if (typeof this.guest.tag === "function") {
				if (this.iterator !== undefined) {
					const iteration = this.iterator.next();
					if (iteration.done) {
						this.iterator = undefined;
					}

					return new Pledge(iteration.value).then(() => void this.commit());
				}
			} else {
				const children = this.guest.props.children;
				return new Pledge(this.updateChildren(children)).then(
					() => void this.commit(),
				);
			}
		} else {
			this.node = this.guest;
		}
	}

	// TODO: delete all empty views after the last non-empty, non-unmounting view
	updateChildren(children: Children): MaybePromise<undefined> {
		this.cachedChildNodes = undefined;
		let previousSibling: View<T> | undefined;
		let view = this.firstChild;
		const promises: Promise<undefined>[] = [];
		const viewsByKey: Map<unknown, View<T>> = new Map();
		if (!isNonStringIterable(children)) {
			children = [children];
		}

		for (let child of children) {
			if (isNonStringIterable(child)) {
				child = createElement(Fragment, null, child);
			} else if (isKeyedElement(child) && viewsByKey.has(child.key)) {
				// TODO: warn about a duplicate key or maybe throw an error
				child = {...child, key: undefined};
			}

			// TODO: delete the key if the views key has already been seen
			const guest = toGuest(child);
			if (isKeyedElement(guest)) {
				let keyedView = this.viewsByKey.get(guest.key);
				if (keyedView === undefined) {
					keyedView = new View(this, this.renderer);
				} else {
					this.viewsByKey.delete(guest.key);
					if (view !== keyedView) {
						this.removeChild(keyedView);
					}
				}

				if (view === undefined) {
					// append view
					if (previousSibling === undefined) {
						this.firstChild = keyedView;
					} else {
						previousSibling.nextSibling = keyedView;
						keyedView.previousSibling = previousSibling;
					}
				} else if (view !== keyedView) {
					if (isKeyedElement(view.guest)) {
						this.insertAfter(keyedView, view);
					} else {
						this.insertBefore(keyedView, view);
					}
				}

				previousSibling = keyedView.previousSibling;
				view = keyedView;
				viewsByKey.set(guest.key, keyedView);
			} else if (view === undefined) {
				view = new View(this, this.renderer);
				if (previousSibling === undefined) {
					this.firstChild = view;
				} else {
					previousSibling.nextSibling = view;
					view.previousSibling = previousSibling;
				}
			} else if (isKeyedElement(view.guest)) {
				const unkeyedView = new View(this, this.renderer);
				this.insertAfter(unkeyedView, view);
				previousSibling = view;
				view = unkeyedView;
			}

			const updateP = view.update(guest);
			if (updateP !== undefined) {
				promises.push(updateP);
			}

			previousSibling = view;
			view = view.nextSibling;
		}

		while (view !== undefined) {
			if (isKeyedElement(view.guest)) {
				this.viewsByKey.delete(view.guest.key);
			}

			void view.unmount();
			view = view.nextSibling;
		}

		for (const view of this.viewsByKey.values()) {
			const p = view.unmount();
			if (isPromiseLike(p)) {
				throw new Error(
					"Unmounting async generator components not supported for keyed views yet",
				);
			} else {
				// remove keyed view
				if (view.previousSibling === undefined) {
					this.firstChild = view.nextSibling;
				} else {
					view.previousSibling.nextSibling = view.nextSibling;
				}

				if (view.nextSibling !== undefined) {
					view.nextSibling.previousSibling = view.previousSibling;
				}
			}
		}

		this.viewsByKey = viewsByKey;
		if (promises.length) {
			return Promise.all(promises).then(() => undefined); // void :(
		}
	}

	// TODO: bandwagon unmounts
	unmount(): MaybePromise<undefined> {
		if (this.ctx !== undefined) {
			this.ctx.dispatchEvent(new Event("crank.unmount"));
			this.ctx.removeAllEventListeners();
			this.ctx = undefined;
		}

		const guest = this.guest;
		this.node = undefined;
		this.guest = undefined;
		if (isElement(guest)) {
			if (typeof guest.tag === "function") {
				if (this.iterator !== undefined) {
					const iteration = this.iterator.return();
					if (!iteration.done) {
						throw new Error("Zombie iterator");
					}

					this.iterator = undefined;
					const unmountP = iteration && iteration.value;
					if (isPromiseLike(unmountP)) {
						this.hanging = this.childNodes;
						this.unmounting = true;
						return Promise.resolve(unmountP).then(() => {
							this.hanging = undefined;
							this.unmounting = false;
							if (this.parent !== undefined) {
								this.parent.enqueueCommit();
							}

							return undefined;
						});
					}
				}
			} else {
				return new Pledge(this.unmountChildren()).then(() => {
					if (this.committer && this.committer.return) {
						this.committer.return();
						this.committer = undefined;
					}

					return undefined;
				});
			}
		}
	}

	unmountChildren(): MaybePromise<undefined> {
		this.cachedChildNodes = undefined;
		const promises: Promise<any>[] = [];
		let nextView: View<T> | undefined = this.firstChild;
		while (nextView !== undefined) {
			const unmountP = nextView.unmount();
			if (isPromiseLike(unmountP)) {
				promises.push(unmountP);
			}

			nextView = nextView.nextSibling;
		}

		if (promises.length) {
			return Promise.all(promises).then(() => undefined); // void :(
		}
	}
}

export type RefreshEvent = CustomEvent<{props: Props}>;

export interface Context {
	[Symbol.iterator](): Generator<Props>;
	[Symbol.asyncIterator](): AsyncGenerator<Props>;
	refresh(): MaybePromise<undefined>;
}

export class Context extends CrankEventTarget {
	constructor(private view: View<any>, parent?: Context) {
		super(parent);
	}

	// TODO: throw an error if props are pulled multiple times per update
	*[Symbol.iterator](): Generator<Props> {
		while (true) {
			yield this.props;
		}
	}

	[Symbol.asyncIterator](): AsyncGenerator<Props> {
		return new Repeater(async (push, stop) => {
			push(this.props);
			const onRefresh = (ev: any) => void push(ev.detail.props);
			const onUnmount = () => stop();
			this.addEventListener("crank.refresh", onRefresh);
			this.addEventListener("crank.unmount", onUnmount);
			await stop;
			this.removeEventListener("crank.refresh", onRefresh);
			this.removeEventListener("crank.unmount", onUnmount);
		}, new SlidingBuffer(1));
	}

	// TODO: throw an error if refresh is called on an unmounted component
	refresh(): MaybePromise<undefined> {
		return this.view.refresh();
	}

	// TODO: make this private or delete this
	get props(): Props {
		if (!isElement(this.view.guest)) {
			throw new Error("Guest is not an element");
		}

		return this.view.guest.props;
	}
}

export type ChildIterator =
	| Iterator<MaybePromiseLike<Child>>
	| AsyncIterator<Child>;

export type FunctionComponent = (
	this: Context,
	props: Props,
) => MaybePromiseLike<Child>;

export type GeneratorComponent = (this: Context, props: Props) => ChildIterator;

// TODO: component cannot be a union of FunctionComponent | GeneratorComponent
// because this breaks Function.prototype methods.
// https://github.com/microsoft/TypeScript/issues/34984
export type Component = (
	this: Context,
	props: Props,
) => ChildIterator | MaybePromiseLike<Child>;

type ComponentIteratorResult = MaybePromise<
	IteratorResult<MaybePromiseLike<Child>>
>;

// TODO: go back to a less involved component iterator which doesn’t know so
// much about views
class ComponentIterator {
	private iter?: ChildIterator;
	private component: Component;
	private ctx: Context;
	private pending: MaybePromise<undefined>;
	private enqueued: MaybePromise<undefined>;
	private done = false;
	private async = false;
	constructor(private view: View<any>) {
		if (!isComponentElement(view.guest)) {
			throw new Error("View.guest is not a component element");
		} else if (view.ctx === undefined) {
			throw new Error("View.ctx is missing");
		}

		this.component = view.guest.tag;
		this.ctx = view.ctx;
	}

	private initialize(): ComponentIteratorResult {
		const value = this.component.call(this.ctx, this.ctx.props);
		if (isIteratorOrAsyncIterator(value)) {
			this.iter = value;
			return this.iter.next();
		}

		return {value, done: false};
	}

	run(): MaybePromise<undefined> {
		let iteration: ComponentIteratorResult;
		if (this.iter === undefined) {
			this.ctx.removeAllEventListeners();
			iteration = this.initialize();
		} else {
			iteration = this.iter.next(this.view.childNodeOrNodes);
		}

		if (isPromiseLike(iteration)) {
			this.async = true;
			return iteration
				.then((iteration) => {
					this.done = !!iteration.done;
					return this.view.updateChildren(iteration.value);
				})
				.finally(() => {
					if (!this.done) {
						if (!this.view.updating) {
							this.view.enqueueCommit();
						}

						this.pending = this.run();
					}
				});
		}

		this.done = !!iteration.done;
		const update = new Pledge(iteration.value).then((children: any) => {
			return this.view.updateChildren(children);
		});

		if (update !== undefined) {
			return update.finally(() => {
				this.pending = this.enqueued;
				this.enqueued = undefined;
			});
		}
	}

	next(): IteratorResult<MaybePromise<undefined>> {
		if (this.done) {
			return {value: this.pending, done: true};
		}

		if (this.async) {
			return {value: this.pending, done: this.done};
		} else if (this.pending === undefined) {
			this.pending = this.run();
			return {value: this.pending, done: this.done};
		} else if (this.enqueued === undefined) {
			this.enqueued = this.pending.then(() => this.run());
		}

		return {value: this.enqueued, done: this.done};
	}

	return(): IteratorResult<MaybePromise<undefined>> {
		this.done = true;
		let iteration: ComponentIteratorResult;
		if (this.iter === undefined || typeof this.iter.return !== "function") {
			return {value: this.view.unmountChildren(), done: true};
		} else {
			iteration = this.iter.return();
		}

		const value = new Pledge(iteration).then(() => this.view.unmountChildren());
		return {value, done: true};
	}

	throw(error: any): never {
		// TODO: throw error into iter
		throw error;
	}

	[Symbol.iterator]() {
		return this;
	}
}

export interface Environment<T> {
	[Default](tag: string): Intrinsic<T>;
	[tag: string]: Intrinsic<T>; // Intrinsic<T> | Environment<T>;
	// TODO: allow symbol index parameters when typescript gets its shit together
	// [Root]: Intrinsic<T>;
	// [tag: symbol]: Intrinsic<T>;// Intrinsic<T> | Environment<T>;
}

const env: Environment<any> = {
	[Default](tag: string): never {
		throw new Error(`Environment did not provide an intrinsic for ${tag}`);
	},
	[Root](): never {
		throw new Error("Environment did not provide an intrinsic for Root");
	},
};

export class Renderer<T> {
	private cache = new WeakMap<object, View<T>>();
	private getOrCreateView(key?: object): View<T> {
		let view: View<T> | undefined;
		if (key !== undefined) {
			view = this.cache.get(key);
		}

		if (view === undefined) {
			view = new View<T>(undefined, this);
			if (key !== undefined) {
				this.cache.set(key, view);
			}
		}

		return view;
	}

	env: Environment<T> = {...env};

	constructor(envs: Partial<Environment<T>>[]) {
		for (const env of envs) {
			this.extend(env);
		}
	}

	extend(env: Partial<Environment<T>>): void {
		if (env[Default] != null) {
			this.env[Default] = env[Default]!;
		}

		if (env[Root] != null) {
			this.env[Root] = env[Root]!;
		}

		for (const [tag, value] of Object.entries(env)) {
			if (value != null) {
				this.env[tag] = value;
			}
		}
	}

	intrinsicFor(tag: string | symbol): Intrinsic<T> | undefined {
		if (tag === Fragment) {
			return;
		} else if (this.env[tag as any]) {
			return this.env[tag as any];
		} else if (typeof tag === "string") {
			return this.env[Default](tag);
		} else {
			throw new Error(`Unknown tag for symbol ${tag.description}`);
		}
	}

	render(child: Child, key?: object): MaybePromise<View<T>> {
		const guest = toGuest(child);
		const view = this.getOrCreateView(key);
		let p: MaybePromise<void>;
		if (guest === undefined) {
			p = view.unmount();
		} else {
			p = view.update(guest);
		}

		return new Pledge(p).then(() => {
			if (guest === undefined && typeof key === "object") {
				this.cache.delete(key);
			}

			return view;
		});
	}
}
