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

export type RefreshEvent = CustomEvent<{props: Props}>;

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
			// TODO: implement event capturing
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
	"crank-key"?: {};
	[name: string]: any;
}

const ElementSigil: unique symbol = Symbol.for("crank.ElementSigil");

export interface Element<T extends Tag = Tag> {
	[ElementSigil]: true;
	tag: T;
	props: Props;
	key?: {};
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

export function isKeyedElement(value: any): value is Element & {key: {}} {
	return isElement(value) && value.key != null;
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
	if (key != null) {
		delete props["crank-key"];
	}

	if (arguments.length > 3) {
		props.children = Array.from(arguments).slice(2);
	} else if (arguments.length > 2) {
		props.children = arguments[2];
	}

	return {[ElementSigil]: true, tag, props, key};
}

export type Intrinsic<T> = (props: Props) => T | Iterator<T>;

export type Guest = Element | string | undefined;

function toGuest(child: Child): Guest {
	if (child == null || typeof child === "boolean") {
		return undefined;
	} else if (typeof child === "string" || isElement(child)) {
		return child;
	} else {
		return child.toString();
	}
}

// TODO: explain
function chase<Return, This>(
	fn: (this: This, ...args: any[]) => MaybePromiseLike<Return>,
): (this: This, ...args: any[]) => MaybePromise<Return> {
	let next: (result: MaybePromiseLike<Return>) => unknown = () => {};
	return function chaseWrapper(...args: unknown[]): MaybePromise<Return> {
		const result = fn.apply(this, args);
		next(result);

		if (isPromiseLike(result)) {
			const nextP = new Promise<Return>((resolve) => (next = resolve));
			return Promise.race([result, nextP]);
		}

		return result;
	};
}

// TODO: don’t re-use hosts per tag and key
class Host<T> {
	guest?: Guest;
	ctx?: Context<T>;
	private updating = false;
	private node?: T | string;
	private cachedChildNodes?: (T | string)[];
	private iterator?: ComponentIterator;
	private intrinsic?: Intrinsic<T>;
	private committer?: Iterator<T | undefined>;
	// TODO: create hostsByKey on demand
	private hostsByKey: Map<unknown, Host<T>> = new Map();
	constructor(
		parent: Host<T> | undefined,
		// TODO: Figure out a way to not have to pass in a renderer
		private renderer: Renderer<T>,
	) {
		this.parent = parent;
	}

	// TODO: move these properties to a superclass or mixin
	private parent?: Host<T> | undefined;
	private firstChild?: Host<T>;
	private lastChild?: Host<T>;
	private nextSibling?: Host<T>;
	private previousSibling?: Host<T>;
	private insertBefore(host: Host<T>, newHost: Host<T>): void {
		newHost.nextSibling = host;
		if (host.previousSibling === undefined) {
			newHost.previousSibling = undefined;
			this.firstChild = newHost;
		} else {
			newHost.previousSibling = host.previousSibling;
			host.previousSibling.nextSibling = newHost;
		}

		host.previousSibling = newHost;
	}

	private insertAfter(host: Host<T>, newHost: Host<T>): void {
		newHost.previousSibling = host;
		if (host.nextSibling === undefined) {
			newHost.nextSibling = undefined;
			this.lastChild = newHost;
		} else {
			newHost.nextSibling = host.nextSibling;
			host.nextSibling.previousSibling = newHost;
		}

		host.nextSibling = newHost;
	}

	private appendChild(host: Host<T>): void {
		if (this.lastChild === undefined) {
			this.firstChild = host;
			this.lastChild = host;
			host.previousSibling = undefined;
			host.nextSibling = undefined;
		} else {
			this.insertAfter(this.lastChild, host);
		}
	}

	private removeChild(host: Host<T>): void {
		if (host.previousSibling === undefined) {
			this.firstChild = host.nextSibling;
		} else {
			host.previousSibling.nextSibling = host.nextSibling;
		}

		if (host.nextSibling === undefined) {
			this.lastChild = host.previousSibling;
		} else {
			host.nextSibling.previousSibling = host.previousSibling;
		}
	}

	get childNodes(): (T | string)[] {
		if (this.cachedChildNodes !== undefined) {
			return this.cachedChildNodes;
		}

		let buffer: string | undefined;
		const childNodes: (T | string)[] = [];
		for (
			let host = this.firstChild;
			host !== undefined;
			host = host.nextSibling
		) {
			if (typeof host.node === "string") {
				buffer = (buffer || "") + host.node;
			} else {
				if (buffer !== undefined) {
					childNodes.push(buffer);
					buffer = undefined;
				}

				if (host.node === undefined) {
					childNodes.push(...host.childNodes);
				} else {
					childNodes.push(host.node);
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
	update(guest: Guest): MaybePromise<undefined> {
		this.updating = true;
		if (
			!isElement(this.guest) ||
			!isElement(guest) ||
			this.guest.tag !== guest.tag ||
			// TODO: never reuse a host when keys differ
			this.guest.key !== guest.key
		) {
			void this.unmount();
			this.guest = guest;
			if (isElement(guest)) {
				this.ctx = new Context(this, this.parent && this.parent.ctx);
				if (typeof guest.tag === "function") {
					this.iterator = new ComponentIterator(guest.tag, this.ctx);
				} else if (guest.tag !== Fragment) {
					this.intrinsic = this.renderer.intrinsicFor(guest.tag);
				}
			}
		} else {
			this.guest = guest;
		}

		return this.refresh();
	}

	private async = false;
	private nextRunId = 0;
	private maxRunId = -1;
	private pending: MaybePromise<undefined>;
	private enqueued: MaybePromise<undefined>;
	private _run(): MaybePromise<undefined> {
		if (this.iterator !== undefined) {
			const runId = this.nextRunId++;
			// TODO: yield a promise for current updateChildren for async components
			const iteration = this.iterator.next(this.childNodeOrNodes);
			if (isPromiseLike(iteration)) {
				this.async = true;
				return iteration.then((iteration) => {
					if (!iteration.done) {
						this.pending = this._run();
					} else {
						this.iterator = undefined;
					}

					this.maxRunId = Math.max(runId, this.maxRunId);
					if (runId === this.maxRunId) {
						return this.updateChildren(iteration.value);
					}
				});
			} else {
				return new Pledge(iteration.value).then((child) => {
					this.maxRunId = Math.max(runId, this.maxRunId);
					if (runId === this.maxRunId) {
						return this.updateChildren(child);
					}
				});
			}
		}
	}

	run(): MaybePromise<undefined> {
		if (this.async) {
			return this.pending;
		} else if (this.pending === undefined) {
			this.pending = new Pledge(this._run()).finally(() => {
				if (!this.async) {
					this.pending = this.enqueued;
					this.enqueued = undefined;
				}
			});

			return this.pending;
		} else if (this.enqueued === undefined) {
			this.enqueued = this.pending
				.then(
					() => this._run(),
					() => this._run(),
				)
				.finally(() => {
					if (!this.async) {
						this.pending = this.enqueued;
						this.enqueued = undefined;
					}
				});
		}

		return this.enqueued;
	}

	refresh(): MaybePromise<undefined> {
		if (isElement(this.guest)) {
			if (this.ctx !== undefined) {
				this.ctx.dispatchEvent(
					new CustomEvent("crank.refresh", {detail: {props: this.guest.props}}),
				);
			}

			if (typeof this.guest.tag === "function") {
				return this.run();
			} else {
				return this.updateChildren(this.guest.props.children);
			}
		} else {
			this.node = this.guest;
		}
	}

	updateChildren = chase(function updateChildren(
		this: Host<T>,
		children: Children,
	): MaybePromise<undefined> {
		let host = this.firstChild;
		const promises: Promise<undefined>[] = [];
		const hostsByKey: Map<unknown, Host<T>> = new Map();
		if (children != null) {
			if (!isNonStringIterable(children)) {
				children = [children];
			}

			for (let child of children) {
				if (isNonStringIterable(child)) {
					child = createElement(Fragment, null, child);
				} else if (isKeyedElement(child) && hostsByKey.has(child.key)) {
					// TODO: warn or throw
					child = {...child, key: undefined};
				}

				if (isKeyedElement(child)) {
					let keyedHost = this.hostsByKey.get(child.key);
					if (keyedHost === undefined) {
						keyedHost = new Host(this, this.renderer);
					} else {
						this.hostsByKey.delete(child.key);
						if (host !== keyedHost) {
							this.removeChild(keyedHost);
						}
					}

					if (host === undefined) {
						this.appendChild(keyedHost);
					} else if (host !== keyedHost) {
						if (isKeyedElement(host.guest)) {
							this.insertAfter(host, keyedHost);
						} else {
							this.insertBefore(host, keyedHost);
						}
					}

					host = keyedHost;
					hostsByKey.set(child.key, keyedHost);
				} else if (host === undefined) {
					host = new Host(this, this.renderer);
					this.appendChild(host);
				} else if (isKeyedElement(host.guest)) {
					const unkeyedHost = new Host(this, this.renderer);
					this.insertAfter(host, unkeyedHost);
					host = unkeyedHost;
				}

				const updateP = host.update(toGuest(child));
				if (updateP !== undefined) {
					promises.push(updateP);
				}

				host = host.nextSibling;
			}
		}

		while (host !== undefined) {
			if (isKeyedElement(host.guest)) {
				this.hostsByKey.delete(host.guest.key);
			}

			void host.unmount();
			this.removeChild(host);
			host = host.nextSibling;
		}

		for (const host of this.hostsByKey.values()) {
			// TODO: implement async unmount for keyed hosts
			void host.unmount();
			this.removeChild(host);
		}

		this.hostsByKey = hostsByKey;
		if (promises.length) {
			return Promise.all(promises).then(() => {
				this.commit();
				return undefined; // void :(
			});
		} else {
			this.commit();
		}
	});

	commit(): void {
		this.cachedChildNodes = undefined;
		if (isElement(this.guest)) {
			if (typeof this.guest.tag === "function") {
				if (!this.updating && this.parent !== undefined) {
					this.parent.commit();
				}
			} else {
				if (this.intrinsic !== undefined) {
					if (this.committer === undefined) {
						const value = this.intrinsic.call(this.ctx, this.guest.props);
						if (isIteratorOrAsyncIterator(value)) {
							this.committer = value;
						} else {
							this.node = value;
						}
					}

					if (this.committer !== undefined) {
						const iteration = this.committer.next();
						this.node = iteration.value;
						if (iteration.done) {
							this.committer = undefined;
							this.intrinsic = undefined;
						}
					}
				}
			}
		}

		this.updating = false;
	}

	unmount(): void {
		if (this.ctx !== undefined) {
			this.ctx.dispatchEvent(new Event("crank.unmount"));
			this.ctx.removeAllEventListeners();
			this.ctx = undefined;
		}

		this.node = undefined;
		this.guest = undefined;
		this.async = false;
		this.intrinsic = undefined;
		this.pending = undefined;
		this.enqueued = undefined;
		this.hostsByKey = new Map();
		// TODO: this should only work if the host is keyed
		if (this.iterator !== undefined) {
			void this.iterator.return();
		}

		if (this.committer && this.committer.return) {
			this.committer.return();
			this.committer = undefined;
		}

		this.unmountChildren();
		this.commit();
	}

	unmountChildren(): void {
		let host: Host<T> | undefined = this.firstChild;
		while (host !== undefined) {
			void host.unmount();
			host = host.nextSibling;
		}
	}
}

export class Context<T = any> extends CrankEventTarget {
	constructor(private host: Host<T>, parent?: Context<T>) {
		super(parent);
	}

	// TODO: make this private or delete this
	get props(): Props {
		if (!isElement(this.host.guest)) {
			throw new Error("Guest is not an element");
		}

		return this.host.guest.props;
	}

	get childNodes(): (T | string)[] {
		return this.host.childNodes;
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
		return this.host.refresh();
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

// TODO: if we use this abstraction we possibly run into a situation where
type ComponentIteratorResult = MaybePromise<
	IteratorResult<MaybePromiseLike<Child>>
>;

class ComponentIterator {
	private iter?: ChildIterator;
	constructor(private component: Component, private ctx: Context) {}

	private initialize(next: any): ComponentIteratorResult {
		const value = this.component.call(this.ctx, this.ctx.props);
		if (isIteratorOrAsyncIterator(value)) {
			this.iter = value;
			return this.iter.next(next);
		}

		return {value, done: false};
	}

	next(next: any): ComponentIteratorResult {
		if (this.iter === undefined) {
			// TODO: should this be here?
			this.ctx.removeAllEventListeners();
			return this.initialize(next);
		} else {
			return this.iter.next(next);
		}
	}

	return(value?: any): ComponentIteratorResult {
		if (this.iter === undefined || typeof this.iter.return !== "function") {
			return {value: undefined, done: true};
		} else {
			const iteration = this.iter.return(value);
			this.iter = undefined;
			return iteration;
		}
	}

	throw(error: any): never {
		// TODO: throw error into inner iterator
		throw error;
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
	private cache = new WeakMap<object, Host<T>>();
	private getOrCreateHost(key?: object): Host<T> {
		let host: Host<T> | undefined;
		if (key !== undefined) {
			host = this.cache.get(key);
		}

		if (host === undefined) {
			host = new Host<T>(undefined, this);
			if (key !== undefined) {
				this.cache.set(key, host);
			}
		}

		return host;
	}

	env: Environment<T> = {...env};

	constructor(envs?: Partial<Environment<T>>[]) {
		if (isIterable(envs)) {
			for (const env of envs) {
				this.extend(env);
			}
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

	intrinsicFor(tag: string | symbol): Intrinsic<T> {
		if (this.env[tag as any]) {
			return this.env[tag as any];
		} else if (typeof tag === "string") {
			return this.env[Default](tag);
		} else {
			throw new Error(`Unknown tag for symbol ${tag.description}`);
		}
	}

	render(child: Child, node?: object): MaybePromise<Context<T> | undefined> {
		if (!isElement(child) || child.tag !== Root) {
			child = createElement(Root, {node}, child);
		}

		const host = this.getOrCreateHost(node);
		let p: MaybePromise<void>;
		if (child == null) {
			p = host.unmount();
		} else {
			p = host.update(toGuest(child));
		}

		return new Pledge(p).then(() => host.ctx);
	}
}
