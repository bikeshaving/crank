// TODO: delete this dependency
import {Repeater, SlidingBuffer} from "@repeaterjs/repeater";
import {CrankEventTarget, isEventTarget} from "./events";
import {isPromiseLike, MaybePromise, MaybePromiseLike, Pledge} from "./pledge";

type NonStringIterable<T> = Iterable<T> & object;

function isIterable(value: any): value is Iterable<any> {
	return value != null && typeof value[Symbol.iterator] === "function";
}

function isNonStringIterable(value: any): value is NonStringIterable<any> {
	return typeof value !== "string" && isIterable(value);
}

function isIteratorOrAsyncIterator(
	value: any,
): value is Iterator<any> | AsyncIterator<any> {
	return value != null && typeof value.next === "function";
}

export type Tag = Component | string | symbol;

export type Child = Element | string | number | boolean | null | undefined;

interface ChildIterable extends Iterable<Child | ChildIterable> {}

export type Children = Child | ChildIterable;

export interface Props {
	"crank-key"?: unknown;
	children?: Children;
	[name: string]: any;
}

// TODO: use this again
export interface IntrinsicProps<T> {
	children: Array<T | string>;
	[name: string]: any;
}

const ElementSigil: unique symbol = Symbol.for("crank.ElementSigil");

export interface Element<TTag extends Tag = Tag> {
	[ElementSigil]: true;
	tag: TTag;
	props: Props;
	key?: unknown;
}

export type FunctionComponent = (
	this: Context,
	props: Props,
) => MaybePromiseLike<Child>;

export type ChildIterator =
	| Iterator<Child, any, any>
	| AsyncIterator<Child, any, any>;

export type GeneratorComponent = (this: Context, props: Props) => ChildIterator;

// TODO: component cannot be a union of FunctionComponent | GeneratorComponent
// because this breaks Function.prototype methods.
// https://github.com/microsoft/TypeScript/issues/33815
export type Component = (
	this: Context,
	props: Props,
) => ChildIterator | MaybePromiseLike<Child>;

export type Intrinsic<T> = (props: IntrinsicProps<T>) => Iterator<T> | T;

// TODO: rename
export const Default = Symbol.for("crank.Default");

export type Default = typeof Default;

// TODO: rename
export const Text = Symbol.for("crank.Text");

export type Text = typeof Text;

// TODO: We use any for symbol tags because typescript support for symbols is weak af.
export const Portal: any = Symbol.for("crank.Portal") as any;

export type Portal = typeof Portal;

export const Fragment: any = Symbol.for("crank.Fragment") as any;

export type Fragment = typeof Fragment;

export const Copy: any = Symbol("crank.Copy") as any;

export type Copy = typeof Copy;

export const Raw: any = Symbol.for("crank.Raw") as any;

export type Raw = typeof Raw;

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

export function createElement<TTag extends Tag>(
	tag: TTag,
	props?: Props | null,
	...children: Array<Children>
): Element<TTag>;
export function createElement<TTag extends Tag>(
	tag: TTag,
	props?: Props | null,
): Element<TTag> {
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

interface Publication {
	push(props: Props): unknown;
	stop(): unknown;
}

type Guest = Element | string | undefined;

function normalize(child: Child): Guest {
	if (child == null || typeof child === "boolean") {
		return undefined;
	} else if (typeof child === "string" || isElement(child)) {
		return child;
	} else {
		return child.toString();
	}
}

function* flatten(children: Children): Generator<Guest> {
	if (children == null) {
		return;
	} else if (!isNonStringIterable(children)) {
		yield normalize(children);
		return;
	}

	for (const child of children) {
		if (isNonStringIterable(child)) {
			yield createElement(Fragment, null, child);
		} else {
			yield normalize(child);
		}
	}
}

const Initial = 0;
type Initial = typeof Initial;

const Waiting = 1;
type Waiting = typeof Waiting;

const Updating = 2;
type Updating = typeof Updating;

const Finished = 3;
type Finished = typeof Finished;

const Unmounted = 4;
type Unmounted = typeof Unmounted;

type HostState = Initial | Waiting | Updating | Finished | Unmounted;

abstract class Host<T> {
	state: HostState = Initial;
	value: Array<T | string> | T | string | undefined = undefined;
	tag: Tag | undefined = undefined;
	key: unknown = undefined;
	// these properties are used when racing components
	replacedBy: Host<T> | undefined = undefined;
	clock = 0;
	nextSibling: Host<T> | undefined = undefined;
	previousSibling: Host<T> | undefined = undefined;
	protected abstract parent: ParentHost<T> | undefined;
	protected abstract renderer: Renderer<T>;
	update(guest: Guest): MaybePromise<undefined> {
		this.state = this.state < Updating ? Updating : this.state;
		if (typeof guest === "string") {
			this.value = this.renderer.text(guest);
		} else if (guest === undefined) {
			this.value = undefined;
		} else {
			throw new Error("This is impossible");
		}

		return undefined;
	}

	unmount(): void {}
}

abstract class ParentHost<T> extends Host<T> {
	abstract ctx: Context<T>;
	abstract tag: Tag;
	props: Record<string, any> | undefined = undefined;
	// ComponentHost only
	private iterator?: ChildIterator;
	protected firstChild: Host<T> | undefined = undefined;
	protected lastChild: Host<T> | undefined = undefined;
	private keyedChildren: Map<unknown, Host<T>> | undefined;
	protected appendChild(child: Host<T>): void {
		if (this.lastChild === undefined) {
			this.firstChild = child;
			this.lastChild = child;
			child.previousSibling = undefined;
			child.nextSibling = undefined;
		} else {
			child.previousSibling = this.lastChild;
			child.nextSibling = undefined;
			this.lastChild.nextSibling = child;
			this.lastChild = child;
		}
	}

	protected insertBefore(
		child: Host<T>,
		reference: Host<T> | null | undefined,
	): void {
		if (reference == null) {
			this.appendChild(child);
			return;
		} else if (child === reference) {
			return;
		}

		child.nextSibling = reference;
		if (reference.previousSibling === undefined) {
			child.previousSibling = undefined;
			this.firstChild = child;
		} else {
			child.previousSibling = reference.previousSibling;
			reference.previousSibling.nextSibling = child;
		}

		reference.previousSibling = child;
	}

	protected removeChild(child: Host<T>): void {
		if (child.previousSibling === undefined) {
			this.firstChild = child.nextSibling;
		} else {
			child.previousSibling.nextSibling = child.nextSibling;
		}

		if (child.nextSibling === undefined) {
			this.lastChild = child.previousSibling;
		} else {
			child.nextSibling.previousSibling = child.previousSibling;
		}

		child.previousSibling = undefined;
		child.nextSibling = undefined;
	}

	protected replaceChild(child: Host<T>, reference: Host<T>): void {
		this.insertBefore(child, reference);
		this.removeChild(reference);
	}

	update(guest: Guest): Promise<undefined> | undefined {
		this.state = this.state < Updating ? Updating : this.state;
		if (!isElement(guest)) {
			throw new Error("TKTKTK SOLVE THIS");
		}

		this.props = guest.props;
		return this.refresh();
	}

	protected scheduled?: Promise<undefined>;
	refresh(): Promise<undefined> | undefined {
		if (this.scheduled !== undefined) {
			this.scheduled = undefined;
		}

		if (this.state === Unmounted) {
			return;
		} else {
			if (this.publications !== undefined) {
				for (const pub of this.publications) {
					pub.push(this.props!);
				}
			}

			if (typeof this.tag === "function") {
				return this.run();
			} else {
				return this.updateChildren(this.props && this.props.children);
			}
		}
	}

	schedule(): Promise<undefined> {
		if (this.scheduled === undefined) {
			this.scheduled = new Promise((resolve) => {
				setFrame(() => {
					if (this.scheduled === undefined) {
						resolve();
					} else {
						resolve(this.refresh());
					}
				});
			});
		}

		return this.scheduled;
	}

	private bail:
		| ((result?: Promise<undefined>) => unknown)
		| undefined = undefined;

	getChildValues(): Array<T | string> {
		let buffer: string | undefined;
		const childValues: Array<T | string> = [];
		for (
			let child = this.firstChild;
			child != null;
			child = child.nextSibling
		) {
			if (typeof child.value === "string") {
				buffer = (buffer || "") + child.value;
			} else if (child.tag !== Portal) {
				if (buffer !== undefined) {
					childValues.push(buffer);
					buffer = undefined;
				}

				if (Array.isArray(child.value)) {
					childValues.push(...child.value);
				} else if (child.value !== undefined) {
					childValues.push(child.value);
				}
			}
		}

		if (buffer !== undefined) {
			childValues.push(buffer);
		}

		return childValues;
	}

	updateChildren(children: Children): MaybePromise<undefined> {
		let host = this.firstChild;
		let nextSibling = host && host.nextSibling;
		let nextKeyedChildren: Map<unknown, Host<T>> | undefined;
		let updates: Array<Promise<unknown>> | undefined;
		for (const guest of flatten(children)) {
			let tag: Tag | undefined;
			let key: unknown;
			if (isElement(guest)) {
				tag = guest.tag;
				key = guest.key;
				if (nextKeyedChildren !== undefined && nextKeyedChildren.has(key)) {
					// TODO: warn about a duplicate key
					key = undefined;
				}
			}

			if (key != null) {
				let nextHost = this.keyedChildren && this.keyedChildren.get(key);
				if (nextHost === undefined) {
					nextHost = createHost(this, this.renderer, guest);
				} else {
					this.keyedChildren!.delete(key);
					if (host !== nextHost) {
						this.removeChild(nextHost);
					}
				}

				if (host === undefined) {
					this.appendChild(nextHost);
				} else if (host !== nextHost) {
					if (host.key == null) {
						this.insertBefore(nextHost, host);
					} else {
						this.insertBefore(nextHost, host.nextSibling);
					}
				}

				host = nextHost;
				nextSibling = host.nextSibling;
			} else if (host === undefined) {
				host = createHost(this, this.renderer, guest);
				this.appendChild(host);
			} else if (host.key != null) {
				const nextHost = createHost(this, this.renderer, guest);
				this.insertBefore(nextHost, host.nextSibling);
				host = nextHost;
				nextSibling = host.nextSibling;
			}

			if (tag !== Copy) {
				if (
					host.state === Initial ||
					(host.tag === tag && host.state !== Unmounted)
				) {
					const update = host.update(guest);
					if (update !== undefined) {
						if (updates === undefined) {
							updates = [];
						}

						updates.push(update);
					}
				} else {
					const nextHost = createHost(this, this.renderer, guest);
					nextHost.clock = host.clock++;
					const update = nextHost.update(guest);
					// TODO: unmount only when the host is ready to be replaced
					host.unmount();
					if (update === undefined) {
						this.replaceChild(nextHost, host);
						host.replacedBy = nextHost;
					} else {
						if (updates === undefined) {
							updates = [];
						}

						updates.push(update);
						// host is reassigned so we need to capture its current value in
						// the update.then callback’s closure.
						const host1 = host;
						update.then(() => {
							if (host1.replacedBy === undefined) {
								this.replaceChild(nextHost, host1);
								host1.replacedBy = nextHost;
							} else if (
								host1.replacedBy.replacedBy === undefined &&
								host1.replacedBy.clock < nextHost.clock
							) {
								this.replaceChild(nextHost, host1.replacedBy);
								host1.replacedBy = nextHost;
							}
						});
					}
				}
			}

			if (key !== undefined) {
				if (nextKeyedChildren === undefined) {
					nextKeyedChildren = new Map();
				}

				nextKeyedChildren.set(key, host);
			}

			host = nextSibling;
			nextSibling = host && host.nextSibling;
		}

		this.unmountExcessChildren(host);
		this.keyedChildren = nextKeyedChildren;
		if (updates !== undefined) {
			const result = Promise.all(updates).then(() => void this.commit()); // void :(
			if (this.bail !== undefined) {
				this.bail(result);
				this.bail = undefined;
			}

			const nextResult = new Promise<undefined>(
				(resolve) => (this.bail = resolve),
			);
			return Promise.race([result, nextResult]);
		} else {
			this.commit();
			if (this.bail !== undefined) {
				this.bail();
				this.bail = undefined;
			}
		}
	}

	unmountExcessChildren(child: Host<T> | undefined): void {
		for (
			let nextSibling = child && child.nextSibling;
			child !== undefined;
			child = nextSibling, nextSibling = child && child.nextSibling
		) {
			if (child.key !== undefined && this.keyedChildren !== undefined) {
				this.keyedChildren.delete(child.key);
			}

			child.unmount();
			this.removeChild(child);
		}

		if (this.keyedChildren !== undefined) {
			for (const child of this.keyedChildren.values()) {
				// TODO: implement async unmount for keyed hosts
				child.unmount();
				this.removeChild(child);
			}
		}
	}

	commit(): void {
		const childValues = this.getChildValues();
		this.ctx.delegates = new Set(childValues.filter(isEventTarget) as any);
		if (typeof this.tag === "function" || this.tag === Fragment) {
			this.value = childValues.length > 1 ? childValues : childValues[0];
		} else {
			this.props = {...this.props, children: childValues};
		}

		if (typeof this.tag === "function" || this.tag === Fragment) {
			if (this.state < Updating && this.parent !== undefined) {
				// TODO: batch this per microtask
				this.parent.commit();
			}
		} else {
			if (
				this.committer === undefined &&
				this.intrinsic !== undefined &&
				this.ctx !== undefined
			) {
				const value = this.intrinsic.call(
					this.ctx,
					this.props as IntrinsicProps<T>,
				);
				if (isIteratorOrAsyncIterator(value)) {
					this.committer = value;
				} else {
					this.value = value;
				}
			}

			if (this.committer !== undefined) {
				const iteration = this.committer.next();
				this.value = iteration.value;
				if (iteration.done) {
					this.committer = undefined;
					this.intrinsic = undefined;
				}
			}
		}

		this.state = this.state <= Updating ? Waiting : this.state;
	}

	catch(reason: any): MaybePromise<undefined> {
		if (
			this.iterator === undefined ||
			this.iterator.throw === undefined ||
			this.state >= Finished
		) {
			if (this.parent === undefined) {
				throw reason;
			}

			this.parent.catch(reason);
		} else {
			return new Pledge(() => this.iterator!.throw!(reason))
				.then((iteration) => {
					if (iteration.done) {
						this.state = this.state < Finished ? Finished : this.state;
					}

					return this.updateChildren(iteration.value);
				})
				.catch((err) => {
					if (this.parent === undefined) {
						throw err;
					}

					return this.parent.catch(err);
				})
				.execute();
		}
	}

	unmount(): void {
		if (this.publications !== undefined) {
			for (const pub of this.publications) {
				pub.stop();
			}
		}

		// TODO: await the return if the host is keyed and commit the parent
		if (this.state < Finished) {
			if (this.iterator !== undefined && this.iterator.return) {
				this.iterator.return();
			}

			if (this.committer !== undefined && this.committer.return) {
				this.committer.return();
			}
		}

		this.state = Unmounted;
		this.committer = undefined;
		this.iterator = undefined;
		for (
			let host = this.firstChild;
			host !== undefined;
			host = host.nextSibling
		) {
			if (typeof host.unmount === "function") {
				host.unmount();
			}
		}
	}

	// Context stuff
	private consumers?: Map<unknown, Set<ParentHost<T>>>;
	private provisions?: Map<unknown, any>;
	get(key: unknown): any {
		for (let host = this.parent; host !== undefined; host = host.parent) {
			if (host.provisions !== undefined && host.provisions.has(key)) {
				if (host.consumers === undefined) {
					host.consumers = new Map();
				}

				if (!host.consumers.has(key)) {
					host.consumers.set(key, new Set());
				}

				host.consumers.get(key)!.add(this);
				return host.provisions.get(key);
			}
		}
	}

	set(key: unknown, value: any): void {
		if (this.provisions === undefined) {
			this.provisions = new Map();
		}

		this.provisions.set(key, value);
		if (this.consumers !== undefined && this.consumers.has(key)) {
			const consumers = this.consumers.get(key)!;
			for (const consumer of consumers) {
				consumer.schedule();
			}

			consumers.clear();
		}
	}

	// AsyncGeneratorComponent only
	private publications?: Set<Publication>;
	subscribe(): AsyncGenerator<Props> {
		if (this.publications === undefined) {
			this.publications = new Set();
		}

		return new Repeater(async (push, stop) => {
			push(this.props!);
			const pub: Publication = {push, stop};
			this.publications!.add(pub);
			await stop;
			this.publications!.delete(pub);
		}, new SlidingBuffer(1));
	}

	// IntrinsicHost only
	private committer?: Iterator<T | undefined>;
	protected intrinsic?: Intrinsic<T>;

	// ComponentHost only
	// TODO: EXPLAIN THIS MADNESS
	private isAsyncGeneratorComponent = false;
	private inflight?: Promise<undefined>;
	private enqueued?: Promise<undefined>;
	private inflightChildren?: Promise<undefined>;
	private enqueuedChildren?: Promise<undefined>;
	private previousResult?: Promise<undefined>;
	private get previousValue(): MaybePromise<
		Array<T | string> | T | string | undefined
	> {
		return Pledge.resolve(this.previousResult)
			.then(() => this.value)
			.execute();
	}
	private step(): [MaybePromise<undefined>, MaybePromise<undefined>] {
		if (this.iterator === undefined) {
			this.ctx.clearEventListeners();
			const value = new Pledge(() =>
				(this.tag as Component).call(this.ctx, this.props!),
			)
				.catch((err) => {
					if (this.parent === undefined) {
						throw err;
					}

					return this.parent.catch(err);
				})
				// type assertion because we shouldn’t get a promise of an iterator
				.execute() as ChildIterator | MaybePromise<Child>;
			if (isIteratorOrAsyncIterator(value)) {
				this.iterator = value;
			} else if (isPromiseLike(value)) {
				const pending = value.then(() => undefined);
				const result = Promise.resolve(value).then((child) =>
					this.updateChildren(child),
				);
				return [pending, result];
			} else {
				const result = this.updateChildren(value);
				return [undefined, result];
			}
		} else if (this.state >= Finished) {
			return [undefined, undefined];
		}

		const iteration = new Pledge(() => this.iterator!.next(this.previousValue))
			.catch((err) => {
				if (this.parent === undefined) {
					throw err;
				}

				return Pledge.resolve(this.parent.catch(err))
					.then(() => ({value: undefined, done: true}))
					.execute();
			})
			.execute();

		if (isPromiseLike(iteration)) {
			this.isAsyncGeneratorComponent = true;
			const pending = iteration.then((iteration) => {
				if (iteration.done) {
					this.state = this.state < Finished ? Finished : this.state;
				} else {
					// TODO: replace this with this.schedule
					setFrame(() => this.run());
				}

				return undefined; // void :(
			});
			const result = iteration.then((iteration) => {
				this.previousResult = this.updateChildren(iteration.value);
				return this.previousResult;
			});

			return [pending, result];
		} else {
			if (iteration.done) {
				this.state = this.state < Finished ? Finished : this.state;
			}

			const result = this.updateChildren(iteration.value);
			return [result, result];
		}
	}

	private advance(): void {
		this.inflight = this.enqueued;
		this.inflightChildren = this.enqueuedChildren;
		this.enqueued = undefined;
		this.enqueuedChildren = undefined;
	}

	private run(): MaybePromise<undefined> {
		if (this.inflight === undefined) {
			const [pending, result] = this.step();
			if (isPromiseLike(pending)) {
				this.inflight = pending.finally(() => this.advance());
			}

			this.inflightChildren = result;
			return this.inflightChildren;
		} else if (this.isAsyncGeneratorComponent) {
			return this.inflightChildren;
		} else if (this.enqueued === undefined) {
			let resolve: (value: MaybePromise<undefined>) => unknown;
			this.enqueued = this.inflight
				.then(() => {
					const [pending, result] = this.step();
					resolve(result);
					return pending;
				})
				.finally(() => this.advance());
			this.enqueuedChildren = new Promise((resolve1) => (resolve = resolve1));
		}

		return this.enqueuedChildren;
	}
}

class ValueHost<T> extends Host<T> {
	constructor(
		protected parent: ParentHost<T>,
		protected renderer: Renderer<T>,
		protected guest: string | undefined,
	) {
		super();
		if (guest !== undefined) {
			this.value = this.renderer.text(guest);
		}
	}
}

class IntrinsicHost<T> extends ParentHost<T> {
	tag: string | symbol;
	ctx: Context<T>;
	constructor(
		protected parent: ParentHost<T> | undefined,
		protected renderer: Renderer<T>,
		protected guest: Element<string | symbol>,
	) {
		super();
		this.tag = this.guest.tag;
		this.key = this.guest.key;
		this.props = this.guest.props;
		this.ctx = new Context(this, this.parent && this.parent.ctx);
		if (guest.tag !== Fragment) {
			this.intrinsic = this.renderer.intrinsicFor(guest.tag);
		}
	}
}

class ComponentHost<T> extends ParentHost<T> {
	tag: Component;
	ctx: Context<T>;
	constructor(
		protected parent: ParentHost<T>,
		protected renderer: Renderer<T>,
		protected guest: Element<Component>,
	) {
		super();
		this.tag = this.guest.tag;
		this.key = this.guest.key;
		this.props = this.guest.props;
		this.ctx = new Context(this, this.parent && this.parent.ctx);
	}
}

function createHost<T>(
	parent: ParentHost<T>,
	renderer: Renderer<T>,
	guest: Guest,
): Host<T> {
	if (guest === undefined || typeof guest === "string") {
		return new ValueHost(parent, renderer, guest);
	} else if (typeof guest.tag === "function") {
		return new ComponentHost(parent, renderer, guest as Element<Component>);
	} else {
		return new IntrinsicHost(
			parent,
			renderer,
			guest as Element<string | symbol>,
		);
	}
}

const hosts = new WeakMap<Context<any>, ParentHost<any>>();
export class Context<T = any> extends CrankEventTarget {
	constructor(host: ParentHost<T>, parent?: Context<T>) {
		super(parent);
		hosts.set(this, host);
	}

	get value(): T | string | undefined {
		return hosts.get(this)!.value;
	}

	// TODO: throw an error if props are pulled multiple times without a yield
	*[Symbol.iterator](): Generator<Record<string, any>> {
		while (true) {
			yield hosts.get(this)!.props!;
		}
	}

	// Component Context only
	// TODO: throw an error if props are pulled multiple times without a yield
	[Symbol.asyncIterator](): AsyncGenerator<Record<string, any>> {
		return hosts.get(this)!.subscribe();
	}

	// TODO: throw or warn if called on an unmounted component?
	refresh(): MaybePromise<undefined> {
		return hosts.get(this)!.refresh();
	}

	// TODO: throw or warn if called on an unmounted component?
	schedule(): MaybePromise<undefined> {
		return hosts.get(this)!.schedule();
	}

	get(key: unknown): any {
		return hosts.get(this)!.get(key);
	}

	set(key: unknown, value: any): void {
		return hosts.get(this)!.set(key, value);
	}
}

export interface Environment<T> {
	[Default](tag: string): Intrinsic<T>;
	[Text]?(text: string): string;
	[tag: string]: Intrinsic<T>; // Intrinsic<T> | Environment<T>;
	// [Fragment]: Intrinsic<T>;
	// [Portal]: Intrinsic<T>;
	// [Copy]: Intrinsic<T>;
	// [Raw]: Intrinsic<T>;
	// [tag: symbol]: Intrinsic<T>;// Intrinsic<T> | Environment<T>;
	// TODO: allow symbol index parameters when typescript gets its shit together
}

const defaultEnv: Environment<any> = {
	[Default](tag: string): never {
		throw new Error(`Environment did not provide an intrinsic for ${tag}`);
	},
	[Portal](): never {
		throw new Error("Environment did not provide an intrinsic for Portal");
	},
	[Raw]({value}): any {
		return value;
	},
};

export function setFrame(callback: (time: number) => unknown): any {
	if (requestAnimationFrame !== undefined) {
		return requestAnimationFrame(callback);
	} else if (setImmediate !== undefined) {
		return setImmediate(() => callback(Date.now()));
	} else {
		return setTimeout(() => callback(Date.now()));
	}
}

export function clearFrame(id: any): void {
	if (requestAnimationFrame !== undefined) {
		cancelAnimationFrame(id);
	} else if (setImmediate !== undefined) {
		clearImmediate(id);
	} else {
		clearTimeout(id);
	}
}

export class Renderer<T> {
	private cache = new WeakMap<object, IntrinsicHost<T>>();
	private env: Environment<T> = {...defaultEnv};
	constructor(env?: Environment<T>) {
		if (env) {
			this.extend(env);
		}
	}

	extend(env: Partial<Environment<T>>): void {
		for (const sym of Object.getOwnPropertySymbols(env)) {
			if (env[sym as any] != null) {
				this.env[sym as any] = env[sym as any]!;
			}
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
			throw new Error(`Unknown tag ${tag.toString()}`);
		}
	}

	text(text: string): string {
		if (this.env[Text] !== undefined) {
			// TODO: remove non-null assertion when typescript gets its shit together with symbols
			return this.env[Text]!(text);
		}

		return text;
	}

	render(child: Child, root?: object): MaybePromise<Context<T>> {
		if (!isElement(child) || child.tag !== Portal) {
			child = createElement(Portal, {root}, child);
		}

		let host: IntrinsicHost<T> | undefined =
			root != null ? this.cache.get(root) : undefined;
		if (host === undefined) {
			host = new IntrinsicHost(undefined, this, child as Element<symbol>);
			if (root !== undefined) {
				this.cache.set(root, host);
			}
		}

		let result: MaybePromise<void>;
		if (child == null) {
			result = host.unmount();
		} else {
			result = host.update(normalize(child));
		}

		return Pledge.resolve(result)
			.then(() => host!.ctx!)
			.execute();
	}
}
