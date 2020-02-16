import {Repeater, SlidingBuffer} from "@repeaterjs/repeater";
import {CrankEventTarget, isEventTarget} from "./events";
import {isPromiseLike, MaybePromise, MaybePromiseLike, Pledge} from "./pledge";

type NonStringIterable<T> = Iterable<T> & object;

export type Tag = Component | symbol | string;

export type Child = Element | string | number | boolean | null | undefined;

interface NestedChildIterable extends Iterable<Child | NestedChildIterable> {}

export type Children = Child | NestedChildIterable;

export interface Props {
	"crank-key"?: unknown;
	children?: Children;
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

export type ComponentIterator =
	| Iterator<Child, any, any>
	| AsyncIterator<Child, any, any>;

export type ComponentGenerator =
	| Generator<Child, any, any>
	| AsyncGenerator<Child, any, any>;

export type GeneratorComponent = (
	this: Context,
	props: Props,
) => ComponentGenerator;

// TODO: component cannot be a union of FunctionComponent | GeneratorComponent
// because this breaks Function.prototype methods.
// https://github.com/microsoft/TypeScript/issues/34984
export type Component = (
	this: Context,
	props: Props,
) => ComponentGenerator | MaybePromiseLike<Child>;

export type Intrinsic<T> = (props: Props) => T | Iterator<T>;

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

export function createElement<TTag extends Tag>(
	tag: TTag,
	props?: Props | null,
	...children: Children[]
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

type Guest = Element | string | undefined;

function toGuest(child: Child): Guest {
	if (child == null || typeof child === "boolean") {
		return undefined;
	} else if (typeof child === "string" || isElement(child)) {
		return child;
	} else {
		return child.toString();
	}
}

class Link {
	protected parent?: Link;
	protected firstChild?: Link;
	protected lastChild?: Link;
	protected nextSibling?: Link;
	protected previousSibling?: Link;
	protected insertBefore(newLink: Link, refLink: Link): void {
		newLink.nextSibling = refLink;
		if (refLink.previousSibling === undefined) {
			newLink.previousSibling = undefined;
			this.firstChild = newLink;
		} else {
			newLink.previousSibling = refLink.previousSibling;
			refLink.previousSibling.nextSibling = newLink;
		}

		refLink.previousSibling = newLink;
	}

	protected insertAfter(newLink: Link, refLink: Link): void {
		newLink.previousSibling = refLink;
		if (refLink.nextSibling === undefined) {
			newLink.nextSibling = undefined;
			this.lastChild = newLink;
		} else {
			newLink.nextSibling = refLink.nextSibling;
			refLink.nextSibling.previousSibling = newLink;
		}

		refLink.nextSibling = newLink;
	}

	protected appendChild(link: Link): void {
		if (this.lastChild === undefined) {
			this.firstChild = link;
			this.lastChild = link;
			link.previousSibling = undefined;
			link.nextSibling = undefined;
		} else {
			this.insertAfter(link, this.lastChild);
		}
	}

	protected removeChild(link: Link): void {
		if (link.previousSibling === undefined) {
			this.firstChild = link.nextSibling;
		} else {
			link.previousSibling.nextSibling = link.nextSibling;
		}

		if (link.nextSibling === undefined) {
			this.lastChild = link.previousSibling;
		} else {
			link.nextSibling.previousSibling = link.previousSibling;
		}
	}

	protected replaceChild(newLink: Link, refLink: Link): void {
		this.insertBefore(newLink, refLink);
		this.removeChild(refLink);
	}
}

interface Publication {
	push(props: Props): unknown;
	stop(): unknown;
}

type Value<T> = Array<T | string> | T | string | undefined;

class Host<T> extends Link {
	// Link properties
	protected parent?: Host<T>;
	protected firstChild?: Host<T>;
	protected lastChild?: Host<T>;
	protected nextSibling?: Host<T>;
	protected previousSibling?: Host<T>;
	private guest?: Guest;
	private keyedChildren?: Map<unknown, Host<T>>;
	// TODO: maybe create a state enum/union to reduce the number of boolean props
	private updating = false;
	private done = false;
	private unmounted = false;
	// these properties are used when racing components
	private replacedBy?: Host<T>;
	private clock = 0;
	private iterator?: ComponentIterator;
	private committer?: Iterator<T | undefined>;
	private intrinsic?: Intrinsic<T>;
	private provisions?: Map<unknown, any>;
	private consumers?: Map<unknown, Set<Host<T>>>;
	private publications?: Set<Publication>;
	ctx?: Context<T>;
	value?: T | string;
	constructor(
		parent: Host<T> | undefined,
		// TODO: Figure out a way to not have to pass in a renderer
		private renderer: Renderer<T>,
	) {
		super();
		this.parent = parent;
	}

	// TODO: flatten these instead of storing guest
	private get tag(): Tag | undefined {
		return isElement(this.guest) ? this.guest.tag : undefined;
	}

	private get key(): unknown {
		return isElement(this.guest) ? this.guest.key : undefined;
	}

	get props(): Props | undefined {
		return isElement(this.guest) ? this.guest.props : undefined;
	}

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

	private cachedChildValues?: Array<T | string>;
	get childValues(): Array<T | string> {
		if (this.cachedChildValues !== undefined) {
			return this.cachedChildValues;
		}

		let buffer: string | undefined;
		const childValues: Array<T | string> = [];
		for (
			let host = this.firstChild;
			host !== undefined;
			host = host.nextSibling
		) {
			if (typeof host.value === "string") {
				buffer = (buffer || "") + host.value;
			} else if (host.tag !== Portal) {
				if (buffer !== undefined) {
					childValues.push(buffer);
					buffer = undefined;
				}

				if (host.value === undefined) {
					childValues.push(...host.childValues);
				} else {
					childValues.push(host.value);
				}
			}
		}

		if (buffer !== undefined) {
			childValues.push(buffer);
		}

		if (this.ctx !== undefined && typeof this.tag === "function") {
			// TODO: filter predicate type narrowing is not working
			this.ctx.delegates = new Set(childValues.filter(isEventTarget) as any);
		}

		this.cachedChildValues = childValues;
		return childValues;
	}

	update(guest: Guest): MaybePromise<undefined> {
		this.updating = true;
		if (this.tag === undefined) {
			if (isElement(guest)) {
				this.ctx = new Context(this, this.parent && this.parent.ctx);
				if (typeof guest.tag !== "function") {
					this.intrinsic = this.renderer.intrinsicFor(guest.tag);
				}
			}
		}

		this.guest = guest;
		return this.refresh();
	}

	// TODO: EXPLAIN THIS MADNESS
	private isAsyncGeneratorComponent = false;
	private scheduled?: Promise<undefined>;
	private inflight?: Promise<undefined>;
	private enqueued?: Promise<undefined>;
	private inflightResult?: Promise<undefined>;
	private enqueuedResult?: Promise<undefined>;
	private previousResult?: Promise<undefined>;
	private get previousValue(): MaybePromise<Value<T>> {
		return Pledge.resolve(this.previousResult)
			.then(() => {
				if (this.childValues.length > 1) {
					return this.childValues;
				}

				return this.childValues[0];
			})
			.execute();
	}

	private step(): [MaybePromise<undefined>, MaybePromise<undefined>] {
		if (this.ctx === undefined) {
			throw new Error("Missing context");
		} else if (!isComponentElement(this.guest)) {
			throw new Error("Non-component element as guest");
		}

		if (this.iterator === undefined) {
			this.ctx.clearEventListeners();
			const {tag, props} = this.guest;
			const value = new Pledge(() => tag.call(this.ctx!, props))
				.catch((err) => {
					if (this.parent === undefined) {
						throw err;
					}

					this.parent.catch(err);
					return undefined;
				})
				// type assertion because we (shouldn’t) get a promise of an iterator
				.execute() as ComponentGenerator | MaybePromise<Child>;
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
		} else if (this.done) {
			return [undefined, undefined];
		}

		const iteration = new Pledge(() => this.iterator!.next(this.previousValue))
			.catch((err) => {
				if (this.parent === undefined) {
					throw err;
				}

				this.parent.catch(err);
				return {value: undefined, done: false};
			})
			.execute();

		if (isPromiseLike(iteration)) {
			this.isAsyncGeneratorComponent = true;
			const pending = iteration.then((iteration) => {
				if (iteration.done) {
					this.done = true;
				} else {
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
				this.done = true;
			}

			const result = this.updateChildren(iteration.value);
			return [result, result];
		}
	}

	private advance(): void {
		this.inflight = this.enqueued;
		this.inflightResult = this.enqueuedResult;
		this.enqueued = undefined;
		this.enqueuedResult = undefined;
	}

	private run(): MaybePromise<undefined> {
		if (this.inflight === undefined) {
			const [pending, result] = this.step();
			if (isPromiseLike(pending)) {
				this.inflight = pending.finally(() => this.advance());
			}

			this.inflightResult = result;
			return this.inflightResult;
		} else if (this.isAsyncGeneratorComponent) {
			return this.inflightResult;
		} else if (this.enqueued === undefined) {
			let resolve: (value: MaybePromise<undefined>) => unknown;
			this.enqueued = this.inflight
				.then(() => {
					const [pending, result] = this.step();
					resolve(result);
					return pending;
				})
				.finally(() => this.advance());
			this.enqueuedResult = new Promise((resolve1) => (resolve = resolve1));
		}

		return this.enqueuedResult;
	}

	refresh(): MaybePromise<undefined> {
		if (this.scheduled !== undefined) {
			this.scheduled = undefined;
		}

		if (this.unmounted) {
			return;
		} else if (this.tag !== undefined) {
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
		} else if (typeof this.guest === "string") {
			this.value = this.renderer.text(this.guest);
		} else {
			this.value = undefined;
		}
	}

	schedule(): MaybePromise<undefined> {
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

	private bail?: (result?: Promise<undefined>) => unknown;
	// TODO: clean up this monster
	updateChildren(children: Children): MaybePromise<undefined> {
		let host = this.firstChild;
		const promises: Promise<undefined>[] = [];
		let keyedChildren: Map<unknown, Host<T>> | undefined;
		if (children != null) {
			if (!isNonStringIterable(children)) {
				children = [children];
			}

			for (let child of children) {
				if (isNonStringIterable(child)) {
					child = createElement(Fragment, null, child);
				}

				const guest = toGuest(child);
				let tag: Tag | undefined;
				let key: unknown;
				let isNewHost = false;
				if (isElement(guest)) {
					tag = guest.tag;
					key = guest.key;
					if (keyedChildren !== undefined && keyedChildren.has(key)) {
						// TODO: warn about a duplicate key
						key = undefined;
					}
				}

				if (key != null) {
					let newHost = this.keyedChildren && this.keyedChildren.get(key);
					if (newHost === undefined) {
						newHost = new Host(this, this.renderer);
						isNewHost = true;
					} else {
						this.keyedChildren!.delete(key);
						if (host !== newHost) {
							this.removeChild(newHost);
						}
					}

					if (host === undefined) {
						this.appendChild(newHost);
					} else if (host !== newHost) {
						if (host.key == null) {
							this.insertBefore(newHost, host);
						} else {
							this.insertAfter(newHost, host);
						}
					}

					host = newHost;
				} else if (host === undefined) {
					host = new Host(this, this.renderer);
					this.appendChild(host);
					isNewHost = true;
				} else if (host.key != null) {
					const newHost = new Host(this, this.renderer);
					this.insertAfter(newHost, host);
					host = newHost;
					isNewHost = true;
				}

				if (tag !== Copy) {
					if (isNewHost || (!host.unmounted && host.tag === tag)) {
						const updateP = host.update(guest);
						if (updateP !== undefined) {
							promises.push(updateP);
						}
					} else {
						// replace the host with another one
						const clock = host.clock++;
						const newHost = new Host(this, this.renderer);
						newHost.clock = clock;
						const updateP = newHost.update(guest);
						if (updateP === undefined) {
							host.unmount();
							this.replaceChild(newHost, host);
							host.replacedBy = newHost;
						} else {
							// TODO: unmount only when the host is ready to be replaced
							host.unmount();
							promises.push(updateP);
							const host1 = host;
							updateP.then(() => {
								if (host1.replacedBy === undefined) {
									this.replaceChild(newHost, host1);
									host1.replacedBy = newHost;
								} else if (
									host1.replacedBy.replacedBy === undefined &&
									host1.replacedBy.clock < newHost.clock
								) {
									this.replaceChild(newHost, host1.replacedBy);
									host1.replacedBy = newHost;
								}
							});
						}
					}
				}

				if (key !== undefined) {
					if (keyedChildren === undefined) {
						keyedChildren = new Map();
					}

					keyedChildren.set(key, host);
				}

				host = host.nextSibling;
			}
		}

		// unmounting excess hosts
		while (host !== undefined) {
			if (this.keyedChildren !== undefined && host.key !== undefined) {
				this.keyedChildren.delete(host.key);
			}

			host.unmount();
			const nextSibling = host.nextSibling;
			this.removeChild(host);
			host = nextSibling;
		}

		// unmounting keyed hosts
		if (this.keyedChildren) {
			for (const host of this.keyedChildren.values()) {
				// TODO: implement async unmount for keyed hosts
				host.unmount();
				this.removeChild(host);
			}
		}

		this.keyedChildren = keyedChildren;
		if (promises.length) {
			const result = Promise.all(promises).then(() => void this.commit()); // void :(
			if (this.bail !== undefined) {
				this.bail(result);
			}
			const nextResult = new Promise<undefined>(
				(resolve) => (this.bail = resolve),
			);
			return Promise.race([result, nextResult]);
		} else {
			if (this.bail !== undefined) {
				this.bail();
			}

			this.commit();
		}
	}

	commit(): void {
		this.cachedChildValues = undefined;
		if (isElement(this.guest)) {
			if (typeof this.guest.tag === "function") {
				if (!this.updating && this.parent !== undefined) {
					// TODO: batch this per microtask
					this.parent.commit();
				}
			} else {
				if (
					this.committer === undefined &&
					this.intrinsic !== undefined &&
					this.ctx !== undefined
				) {
					const value = this.intrinsic.call(this.ctx, this.guest.props);
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

				// Fragment
				if (this.parent !== undefined && this.value == null) {
					this.parent.commit();
				}
			}
		}

		this.updating = false;
	}

	catch(reason: any): void {
		if (
			this.iterator === undefined ||
			this.iterator.throw === undefined ||
			this.done
		) {
			if (this.parent === undefined) {
				throw reason;
			}

			this.parent.catch(reason);
		} else {
			// TODO: should this be returned from catch?
			new Pledge(() => this.iterator!.throw!(reason))
				.then((iteration) => {
					if (iteration.done) {
						this.done = true;
					}

					return iteration.value;
				})
				.then((child) => {
					this.updateChildren(child);
				})
				.catch((err) => {
					if (this.parent === undefined) {
						throw err;
					}

					this.parent.catch(err);
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
		if (!this.done) {
			if (this.iterator !== undefined && this.iterator.return) {
				this.iterator.return();
			}

			if (this.committer && this.committer.return) {
				this.committer.return();
			}
		}

		this.unmounted = true;
		this.committer = undefined;
		this.iterator = undefined;
		this.updating = false;
		this.unmountChildren();
	}

	unmountChildren(): void {
		let host = this.firstChild;
		while (host !== undefined) {
			// TODO: catch errors
			host.unmount();
			host = host.nextSibling;
		}
	}
}

const hosts = new WeakMap<Context<any>, Host<any>>();
export class Context<T = any> extends CrankEventTarget {
	constructor(host: Host<T>, parent?: Context<T>) {
		super(parent);
		hosts.set(this, host);
	}

	get value(): T | string | undefined {
		return hosts.get(this)!.value;
	}

	get childValues(): Array<T | string> {
		return hosts.get(this)!.childValues;
	}

	// TODO: throw an error if props are pulled multiple times without a yield
	*[Symbol.iterator](): Generator<Props> {
		const host = hosts.get(this)!;
		while (true) {
			yield host.props!;
		}
	}

	// TODO: throw an error if props are pulled multiple times without a yield
	[Symbol.asyncIterator](): AsyncGenerator<Props> {
		const host = hosts.get(this)!;
		return host.subscribe();
	}

	// TODO: throw or warn if called on an unmounted component?
	refresh(): MaybePromise<undefined> {
		const host = hosts.get(this)!;
		return host.refresh();
	}

	// TODO: throw or warn if called on an unmounted component?
	schedule(): MaybePromise<undefined> {
		const host = hosts.get(this)!;
		return host.schedule();
	}

	get(key: unknown): any {
		const host = hosts.get(this)!;
		return host.get(key);
	}

	set(key: unknown, value: any): void {
		const host = hosts.get(this)!;
		return host.set(key, value);
	}
}

export interface Environment<T> {
	[Default](tag: string): Intrinsic<T>;
	[Text]?(text: string): string;
	[tag: string]: Intrinsic<T>; // Intrinsic<T> | Environment<T>;
	// TODO: allow symbol index parameters when typescript gets its shit together
	// [Fragment]: Intrinsic<T>;
	// [Portal]: Intrinsic<T>;
	// [Copy]: Intrinsic<T>;
	// [tag: symbol]: Intrinsic<T>;// Intrinsic<T> | Environment<T>;
}

const defaultEnv: Environment<any> = {
	[Default](tag: string): never {
		throw new Error(`Environment did not provide an intrinsic for ${tag}`);
	},
	[Portal](): never {
		throw new Error("Environment did not provide an intrinsic for Portal");
	},
	[Fragment](): undefined {
		return undefined; // void :(
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
	private cache = new WeakMap<object, Host<T>>();
	private getOrCreateRootHost(root?: object): Host<T> {
		let host: Host<T> | undefined;
		if (root !== undefined) {
			host = this.cache.get(root);
		}

		if (host === undefined) {
			host = new Host<T>(undefined, this);
			if (root !== undefined) {
				this.cache.set(root, host);
			}
		}

		return host;
	}

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

		const host = this.getOrCreateRootHost(root);
		let p: MaybePromise<void>;
		if (child == null) {
			p = host.unmount();
		} else {
			p = host.update(toGuest(child));
		}

		return Pledge.resolve(p)
			.then(() => host.ctx!)
			.execute();
	}
}
