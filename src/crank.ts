// TODO: Use our own EventTarget implementation which doesn’t change
// EventTarget typings and is exactly compatible with DOM EventTarget
import {EventTarget as EventTargetShim} from "event-target-shim";
import {Repeater, SlidingBuffer} from "@repeaterjs/repeater";

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

	// TODO: create a helper class which performantly:
	// directly using an array here (for perf reasons).
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
	): unknown {
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

	// TODO: remove once listeners which were dispatched
	// TODO: ev is any because event-target-shim has a weird dispatchEvent type
	dispatchEvent(ev: any): boolean {
		let continued = super.dispatchEvent(ev);
		if (continued && ev.bubbles && this.parent !== undefined) {
			// TODO: this is the poor man’s event dispatch, doesn’t even handle
			// capturing
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

type MaybePromise<T> = Promise<T> | T;

type MaybePromiseLike<T> = PromiseLike<T> | T;

export function isPromiseLike(value: any): value is PromiseLike<any> {
	return value != null && typeof value.then === "function";
}

function isIterable(value: any): value is Iterable<any> {
	return value != null && typeof value[Symbol.iterator] === "function";
}

function isIteratorOrAsyncIterator(
	value: any,
): value is Iterator<any> | AsyncIterator<any> {
	return value != null && typeof value.next === "function";
}

// TODO: user-defined control tags?
export const Default = Symbol("crank.Default");

export type Default = typeof Default;

// TODO: We use any for symbol tags because typescript is dumb and doesn’t
// allow symbols in jsx expressions.
// TODO: Rename to Container?
export const Root: any = Symbol("crank.Root") as any;

export type Root = typeof Root;

// TODO: implement the Copy tag
// export const Copy = Symbol("Copy");
//
// export type Copy = typeof Copy;

export const Fragment: any = Symbol("crank.Fragment") as any;

export type Fragment = typeof Fragment;

export type Tag = Component | symbol | string;

export type Child = Element | string | number | boolean | null | undefined;

interface NestedChildIterable extends Iterable<Child | NestedChildIterable> {}

export type Children = Child | NestedChildIterable;

export interface Props {
	children?: Children;
	"crank-key"?: string;
	[name: string]: any;
}

const ElementSigil: unique symbol = Symbol.for("crank:ElementSigil");

export interface Element<T extends Tag = Tag> {
	[ElementSigil]: true;
	tag: T;
	props: Props;
	key?: string;
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

type Gear<T> = Generator<
	MaybePromise<T | undefined>,
	MaybePromise<undefined>,
	Props
>;

//export interface Host<T> {
//	guest: Guest;
//	parent: Host<T> | undefined;
//	updating: boolean;
//	node: T | string | undefined;
//	ctx: Context | undefined;
//	gear: Gear<T> | undefined;
//	firstChild: Host<T> | undefined;
//	nextSibling: Host<T> | undefined;
//}
//
export class View<T> {
	// Whether or not the update was initiated by the parent.
	// TODO: use this and get rid of hanging
	ctx?: Context;
	updating = false;
	private unmounting = false;
	// TODO: maybe rename this to value
	private node?: T | string;
	// When a component unmounts asynchronously, its current nodes are stored in
	// hanging until the unmount promise settles.
	// Until that point, parents will continue to see the hanging nodes.
	// The view can continue to be updated in the meantime.
	private hanging?: (T | string)[];
	private gear?: Gear<T>;
	private firstChild?: View<T>;
	private nextSibling?: View<T>;
	private previousByKey: Record<string, View<T>> = {};
	public guest?: Guest;
	constructor(
		public parent: View<T> | undefined,
		// TODO: Figure out a way to not have to pass in a renderer. The only thing
		// we need renderer for is getting intrinsics for strings/symbols. Maybe we
		// can turn the renderer into a simple callback? Alternatively, we may be
		// able to refactor View to an interface and move some of the methods on
		// this class to renderer.
		private renderer: Renderer<T>,
	) {}

	private cachedChildNodes?: (T | string)[];
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
			this.guest.key !== guest.key
		) {
			void this.unmount();
			// Need to set this.guest cuz component gear and intrinsic gear read it
			this.guest = guest;
			if (isElement(guest)) {
				this.ctx = new Context(this, this.parent && this.parent.ctx);
				if (typeof guest.tag === "function") {
					this.gear = new ComponentGear(this);
				} else {
					const intrinsic = this.renderer.intrinsicFor(guest.tag);
					this.gear = new IntrinsicGear(this, intrinsic);
				}
			}
		} else {
			this.guest = guest;
		}

		return this.refresh();
	});

	// TODO: batch this per tick
	enqueueRefresh(): void {
		this.cachedChildNodes = undefined;
		this.refresh();
	}

	refresh(): MaybePromise<undefined> {
		if (isElement(this.guest)) {
			if (this.ctx !== undefined) {
				const ev = new CustomEvent("crank.refresh", {
					detail: {props: this.guest.props},
				});
				this.ctx.dispatchEvent(ev);
			}

			if (this.gear !== undefined) {
				const iteration = this.gear.next(this.guest.props);
				if (iteration.done) {
					this.gear = undefined;
				}

				if (isPromiseLike(iteration.value)) {
					return Promise.resolve(iteration.value).then((value) => {
						this.node = value;
						return undefined; // void :(
					});
				} else {
					this.node = iteration.value;
				}
			}
		} else {
			this.node = this.guest;
		}
	}

	// TODO: delete all empty views after the last non-empty, non-unmounting view
	updateChildren(children: Children): MaybePromise<undefined> {
		this.cachedChildNodes = undefined;
		let view = this.firstChild;
		const promises: Promise<undefined>[] = [];
		if (typeof children !== "string" && isIterable(children)) {
			let previousSibling: View<T> | undefined;
			const previousByKey: Record<string, View<T>> = {};
			for (let child of children) {
				// all non-top-level iterables are wrapped in an implicit Fragment
				if (typeof child !== "string" && isIterable(child)) {
					child = createElement(Fragment, null, child);
				}

				const guest = toGuest(child);
				if (view === undefined) {
					view = new View(this, this.renderer);
					// TODO: there may be a way to abstract this notion of “previous”
					if (previousSibling === undefined) {
						this.firstChild = view;
					} else {
						previousSibling.nextSibling = view;
					}
				}

				if (isElement(guest) && guest.key !== undefined) {
					const previous = this.previousByKey[guest.key];
					if (previous !== undefined) {
						const keyedView =
							previous === this ? previous.firstChild! : previous.nextSibling!;
						if (view !== keyedView) {
							if (previous === this) {
								previous.firstChild = keyedView.nextSibling;
							} else {
								previous.nextSibling = keyedView.nextSibling;
							}

							// if the current view is keyed, then leave it in place
							if (isElement(view.guest) && view.guest.key !== undefined) {
								keyedView.nextSibling = view.nextSibling;
								view.nextSibling = keyedView;
							} // if the current view is unkeyed, push it forwards
							else {
								keyedView.nextSibling = view;
								if (previousSibling === undefined) {
									this.firstChild = keyedView;
								} else {
									previousSibling.nextSibling = keyedView;
								}
							}
						}

						delete this.previousByKey[guest.key];
						view = keyedView;
					}

					previousByKey[guest.key] = previousSibling || this;
				} else if (isElement(view.guest) && view.guest.key !== undefined) {
					const unkeyedView = new View(this, this.renderer);
					unkeyedView.nextSibling = view.nextSibling;
					view.nextSibling = unkeyedView;
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
				if (isElement(view.guest) && view.guest.key !== undefined) {
					delete this.previousByKey[view.guest.key];
				}

				void view.unmount();
				view = view.nextSibling;
			}

			for (const previous of Object.values(this.previousByKey)) {
				const view =
					previous === this ? previous.firstChild! : previous.nextSibling!;
				const unmountP = view.unmount();
				if (isPromiseLike(unmountP)) {
					throw new Error(
						"Async unmounting for keyed elements has not been implemented yet",
					);
				}

				if (previous === this) {
					previous.firstChild = view.nextSibling;
				} else {
					previous.nextSibling = view.nextSibling;
				}
			}

			this.previousByKey = previousByKey;
		} else {
			const guest = toGuest(children);
			if (view === undefined && guest !== undefined) {
				view = this.firstChild = new View(this, this.renderer);
			}

			if (view !== undefined) {
				const updateP = view.update(guest);
				if (updateP !== undefined) {
					promises.push(updateP);
				}

				if (isElement(guest) && guest.key !== undefined) {
					this.previousByKey = {[guest.key]: view};
				} else {
					this.previousByKey = {};
				}

				view = view.nextSibling;
			}

			while (view !== undefined) {
				void view.unmount();
				view = view.nextSibling;
			}
		}

		if (promises.length) {
			return Promise.all(promises).then(() => undefined); // void :(
		}
	}

	unmount(): MaybePromise<undefined> {
		this.node = undefined;
		this.guest = undefined;
		if (this.ctx !== undefined) {
			this.ctx.dispatchEvent(new Event("crank.unmount"));
			this.ctx = undefined;
		}

		if (this.gear !== undefined) {
			const iteration = this.gear.return(undefined);
			if (!iteration.done) {
				throw new Error("Zombie gear");
			}

			this.gear = undefined;
			const p = iteration && iteration.value;
			if (isPromiseLike(p)) {
				this.hanging = this.childNodes;
				this.unmounting = true;
				return p.then(() => {
					this.hanging = undefined;
					this.unmounting = false;
					this.parent && this.parent.enqueueRefresh();
					return undefined; // void :(
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
	refresh(): Promise<undefined> | undefined {
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

// TODO: Delete this abstraction now that we have gears
export class ComponentIterator {
	private finished = false;
	private iter?: ChildIterator;
	constructor(private component: Component, private ctx: Context) {}

	private initialize(): ComponentIteratorResult {
		if (this.finished) {
			return {value: undefined, done: true};
		}

		const value = this.component.call(this.ctx, this.ctx.props);
		if (isIteratorOrAsyncIterator(value)) {
			this.iter = value;
			return this.iter.next();
		}

		return {value, done: false};
	}

	next(value?: any): ComponentIteratorResult {
		if (this.iter === undefined) {
			return this.initialize();
		}

		return this.iter.next(value);
	}

	return(value?: any): ComponentIteratorResult {
		if (this.iter === undefined) {
			this.finished = true;
		} else if (this.iter.return) {
			return this.iter.return(value);
		}

		return {value, done: true};
	}

	throw(error: any): ComponentIteratorResult {
		if (this.iter === undefined) {
			this.finished = true;
		} else if (this.iter.throw) {
			return this.iter.throw(error);
		}

		throw error;
	}
}

interface Publication {
	push(value: Props): unknown;
	stop(): unknown;
}

// TODO: rewrite this as a generator function
class ComponentGear implements Gear<never> {
	private iter: ComponentIterator;
	private value: MaybePromise<undefined>;
	private enqueued: MaybePromise<undefined>;
	private done = false;
	private async = false;
	private pubs = new Set<Publication>();
	constructor(private view: View<any>) {
		if (!isComponentElement(view.guest)) {
			throw new Error("View.guest is not a component element");
		} else if (view.ctx === undefined) {
			throw new Error("View.ctx is missing");
		}

		this.iter = new ComponentIterator(view.guest.tag, view.ctx);
	}

	run(): Promise<undefined> | undefined {
		const iteration = this.iter.next(this.view.childNodeOrNodes);
		if (isPromiseLike(iteration)) {
			this.async = true;
			return iteration
				.then((iteration) => {
					this.done = !!iteration.done;
					return this.view.updateChildren(iteration.value);
				})
				.finally(() => {
					if (!this.done) {
						this.value = this.run();
					}
				});
		}

		this.done = !!iteration.done;
		const update = isPromiseLike(iteration.value)
			? Promise.resolve(iteration.value).then((value: any) =>
					this.view.updateChildren(value),
			  )
			: this.view.updateChildren(iteration.value);
		if (update !== undefined) {
			return update.finally(() => {
				this.value = this.enqueued;
				this.enqueued = undefined;
			});
		}
	}

	next(): IteratorResult<MaybePromise<undefined>> {
		if (this.done) {
			return {value: this.value, done: true};
		}

		if (this.async) {
			return {value: this.value, done: this.done};
		} else if (this.value === undefined) {
			this.value = this.run();
			return {value: this.value, done: this.done};
		} else if (this.enqueued === undefined) {
			this.enqueued = this.value.then(() => this.run());
		}

		return {value: this.enqueued, done: this.done};
	}

	return(): IteratorResult<MaybePromise<undefined>> {
		for (const pub of this.pubs) {
			pub.stop();
		}

		this.done = true;
		const iteration = this.iter.return();
		if (isPromiseLike(iteration)) {
			const value = iteration.then(() => this.view.unmountChildren());
			return {value, done: true};
		}

		return {value: this.view.unmountChildren(), done: true};
	}

	throw(error: any): never {
		// TODO: throw error into iter
		throw error;
	}

	[Symbol.iterator]() {
		return this;
	}
}

// TODO: rewrite this as a generator function
class IntrinsicGear<T> implements Gear<T> {
	private done = false;
	private iter?: IntrinsicIterator<T>;
	private props: Props;
	constructor(private view: View<T>, private intrinsic?: Intrinsic<T>) {
		if (!isIntrinsicElement(view.guest)) {
			throw new Error("View’s guest is not an intrinsic element");
		}

		this.props = view.guest.props;
	}

	private commit(): T | undefined {
		if (this.done || this.intrinsic === undefined) {
			return;
		}

		const props = {...this.props, children: this.view.childNodes};
		if (this.iter === undefined) {
			this.iter = this.intrinsic(props);
		}

		const iteration = this.iter.next(props);
		this.done = !!iteration.done;
		return iteration.value;
	}

	next(
		props: Props,
	): IteratorResult<MaybePromise<T | undefined>, MaybePromise<undefined>> {
		if (this.done) {
			return {value: undefined, done: true};
		}

		this.props = props;
		let updateP: MaybePromise<undefined>;
		if (this.view.updating) {
			updateP = this.view.updateChildren(this.props.children);
		}

		if (updateP !== undefined) {
			return {
				value: updateP.then(() => this.commit()),
				done: false,
			};
		}

		return {value: this.commit(), done: this.done};
	}

	return(): IteratorResult<
		MaybePromise<T | undefined>,
		MaybePromise<undefined>
	> {
		if (this.iter === undefined || this.iter.return === undefined) {
			return {value: this.view.unmountChildren(), done: true};
		} else if (this.done) {
			return {value: undefined, done: true};
		}

		this.done = true;
		const value = this.view.unmountChildren();
		if (isPromiseLike(value)) {
			return {value: value.then(() => void this.iter!.return!()), done: true};
		}

		this.iter.return();
		return {value, done: true};
	}

	throw(): IteratorResult<T | undefined> {
		throw new Error("Not implemented");
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
		let p: Promise<void> | void;
		if (guest === undefined) {
			p = view.unmount();
		} else {
			p = view.update(guest);
		}

		if (p !== undefined) {
			return p.then(() => {
				if (guest === undefined && typeof key === "object") {
					this.cache.delete(key);
				}

				return view;
			});
		}

		if (guest === undefined && typeof key === "object") {
			this.cache.delete(key);
		}

		return view;
	}
}
