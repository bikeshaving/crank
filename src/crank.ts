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
		if (!detail.type.startsWith("crank.")) {
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

function isPromiseLike(value: any): value is PromiseLike<unknown> {
	return value != null && typeof value.then === "function";
}

function isIterable(value: any): value is Iterable<unknown> {
	return value != null && typeof value[Symbol.iterator] === "function";
}

function isIteratorOrAsyncIterator(
	value: any,
): value is
	| Iterator<unknown, unknown, unknown>
	| AsyncIterator<unknown, unknown, unknown> {
	return value != null && typeof value.next === "function";
}

// TODO: user-defined control tags?
export const Default = Symbol.for("crank:Default");

export type Default = typeof Default;

// TODO: Rename to Container? Merge with Portal?
export const Root = Symbol.for("crank:Root");

// TODO: typescript is dumb and doesn’t allow symbols in jsx expressions.
export type Root = any;

// TODO: implement these control tags
// I wonder if the following tags can be implemented without defining a custom
// function for each tag for every environment
// export const Copy = Symbol("Copy");
//
// export type Copy = typeof Copy;
//
// export const Fragment = Symbol("Fragment");
//
// export type Fragment = typeof Fragment;
export type ControlTag = Root;

// export type ControlTag = Root | Copy | Fragment | Portal;
//
export type Tag = Component | ControlTag | string;

export type Child = Element | string | number | boolean | null | undefined;

interface NestedChildIterable extends Iterable<Child | NestedChildIterable> {}

export type Children = Child | NestedChildIterable;

export interface Props {
	[name: string]: any;
	children?: Children;
}

export const ElementSigil: unique symbol = Symbol.for("crank:ElementSigil");

export type ElementSigil = typeof ElementSigil;

export interface Element<T extends Tag = Tag> {
	tag: T;
	props: Props;
	[ElementSigil]: true;
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
	if (arguments.length > 3) {
		props.children = Array.from(arguments).slice(2);
	} else if (arguments.length > 2) {
		props.children = arguments[2];
	}

	return {[ElementSigil]: true, tag, props};
}

export function* flattenChildren(children: Children): Iterable<Child> {
	if (typeof children === "string" || !isIterable(children)) {
		yield children;
		return;
	}

	for (const child of children) {
		yield* flattenChildren(child);
	}
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

function createGuest(child: Child): Guest {
	if (child == null || typeof child === "boolean") {
		return;
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

// TODO: maybe we want to rename to host and use an interface like this to get
// rid of the class in favor of functions/interfaces/objects.
//interface Host<T> {
//	updating: boolean;
//	guest?: Element | string;
//	gear?: Gear<T>;
//	node?: T | string;
//	parent?: Host<T>;
//	firstChild?: Host<T>;
//	nextSibling?: Host<T>;
//}
//
// The one method/function which might have to be defined on host is update,
// because it uses a function which later updates calls to resolve previous
// updates. Maybe we can use a WeakMap instead.
//
// Views/Hosts are like pegs or slots; the diffing/reconciliation algorithm
// will create a peg for each child of a jsx expression and fill it with a
// value. While it might make sense to reuse this class instead of creating a
// separate context class/interface, using a separate context type might be
// nicer because Views/hosts with atomic guests (string/undefined) do not need
// a context, the context should not be reused between different guests, and
// the host class currently defines more methods that should be available on
// the context. So what we would have is a host tree, an additional context
// tree, and gears/generators which call functions with the host and context.
//export class Host<T> {
export class View<T> {
	// Whether or not the update was initiated by the parent.
	updating = false;
	ctx?: Context;
	private node?: T | string;
	// When a component unmounts asynchronously, its current nodes are stored in
	// hanging until the unmount promise settles.
	// Until that point, parents will continue to see the hanging nodes.
	// The view can continue to be updated in the meantime.
	private hanging?: (T | string)[];
	private gear?: Gear<T>;
	private firstChild?: View<T>;
	private nextSibling?: View<T>;
	constructor(
		public guest: Guest,
		public parent: View<T> | undefined,
		private renderer: Renderer<T>,
	) {
		if (isElement(guest)) {
			this.ctx = new Context(this);
			if (typeof guest.tag === "function") {
				this.gear = new ComponentGear(this);
			} else {
				const intrinsic = this.renderer.intrinsicFor(guest.tag);
				this.gear = new IntrinsicGear(this, intrinsic);
			}
		}
	}

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

	update = chase(function update(
		this: View<T>,
		guest: Guest,
	): MaybePromise<undefined> {
		this.updating = true;
		if (
			!isElement(this.guest) ||
			!isElement(guest) ||
			this.guest.tag !== guest.tag
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

	updateChildren(children: Children): MaybePromise<undefined> {
		this.cachedChildNodes = undefined;
		// TODO: Only await unmounting in unmount
		const unmounting = Array.isArray(children) && children.length === 0;
		const promises: Promise<any>[] = [];
		let prevView: View<T> | undefined;
		let nextView: View<T> | undefined = this.firstChild;
		for (const child of flattenChildren(children)) {
			const guest = createGuest(child);
			if (nextView === undefined) {
				nextView = new View(guest, this, this.renderer);
				if (prevView === undefined) {
					this.firstChild = nextView;
				} else {
					prevView.nextSibling = nextView;
				}
			}

			const update = nextView.update(guest);
			if (update !== undefined) {
				promises.push(update);
			}

			prevView = nextView;
			nextView = nextView.nextSibling;
		}

		while (nextView !== undefined) {
			const unmountP = nextView.unmount();
			if (unmounting && isPromiseLike(unmountP)) {
				promises.push(unmountP);
			}

			nextView = nextView.nextSibling;
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
			const iteration = this.gear.return && this.gear.return(undefined);
			if (!iteration.done) {
				throw new Error("Zombie gear");
			}

			this.gear = undefined;
			const p = iteration && iteration.value;
			if (isPromiseLike(p)) {
				this.hanging = this.childNodes;
				return p.then(() => {
					this.hanging = undefined;
					this.parent && this.parent.enqueueRefresh();
					return undefined; // void :(
				});
			}
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

		// TODO: ctx needs to be defined at the view/renderer level so that it can
		// be passed to children so that we can create an EventTarget hierarchy.
		// However, the Context class currently depends on ComponentGear because
		// publish/subscribe is defined on this class.
		this.iter = new ComponentIterator(view.guest.tag, view.ctx!);
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
			const value = iteration.then(() => this.view.updateChildren([]));
			return {value, done: true};
		}

		return {value: this.view.updateChildren([]), done: true};
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
	constructor(private view: View<T>, private intrinsic: Intrinsic<T>) {
		if (!isIntrinsicElement(view.guest)) {
			throw new Error("View’s guest is not an intrinsic element");
		}

		this.props = view.guest.props;
	}

	private commit(): T | undefined {
		if (this.done) {
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
			return {value: this.view.updateChildren([]), done: true};
		} else if (this.done) {
			return {value: undefined, done: true};
		}

		this.done = true;
		const value = this.view.updateChildren([]);
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
	[Default](tag: string | symbol): Intrinsic<T>;
	[Root]: Intrinsic<T>;
	[tag: string]: Intrinsic<T>; // Intrinsic<T> | Environment<T>;
	// TODO: allow symbol index parameters when typescript gets its shit together
	// [tag: symbol]: Intrinsic<T>; // Intrinsic<T> | Environment<T>;
}

const defaultEnv: Environment<any> = {
	[Default](tag: string | symbol): never {
		tag = typeof tag === "string" ? tag : tag.toString();
		throw new Error(`Environment did not provide an intrinsic for ${tag}`);
	},
	[Root](): never {
		throw new Error("Environment did not provide an intrinsic for the Root");
	},
};

// TODO: delete TContainer type parameter
export class Renderer<T, TContainer extends {} = any> {
	views: WeakMap<TContainer, View<T>> = new WeakMap();
	env: Environment<T> = defaultEnv;

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

	intrinsicFor(tag: string | symbol): Intrinsic<T> {
		let intrinsic: Intrinsic<T> | undefined;
		if (this.env[tag as any]) {
			intrinsic = this.env[tag as any];
		} else {
			intrinsic = this.env[Default](tag);
		}

		return intrinsic;
	}

	// TODO: move root stuff into specific renderer subclasses
	render(
		elem?: Element | null,
		node?: TContainer,
	): MaybePromise<View<T>> | undefined {
		if (elem != null && elem.tag !== Root) {
			if (node == null) {
				throw new TypeError(
					"Node is null or undefined and root element is not a root element",
				);
			}

			elem = createElement(Root, {node}, elem);
		}

		let view: View<T>;
		if (node !== undefined && this.views.has(node)) {
			view = this.views.get(node)!;
		} else if (elem == null) {
			return;
		} else {
			view = new View(elem, undefined, this);
			if (node !== undefined) {
				this.views.set(node, view);
			}
		}

		let p: Promise<void> | void;
		if (elem == null) {
			p = view.unmount();
			if (node !== undefined) {
				this.views.delete(node);
			}
		} else {
			p = view.update(elem);
		}

		if (p !== undefined) {
			return p.then(() => view);
		}

		return view;
	}
}
