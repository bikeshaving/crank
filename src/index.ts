import {Repeater, SlidingBuffer} from "@repeaterjs/repeater";
import {CrankEventTarget, isEventTarget} from "./events";
import {isPromiseLike, MaybePromise, MaybePromiseLike, Pledge} from "./pledge";

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

// TODO: explain what this function does
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

type Next<T> = Array<T | string> | T | string | undefined;

class Host<T> extends Link {
	protected firstChild?: Host<T>;
	protected lastChild?: Host<T>;
	protected nextSibling?: Host<T>;
	protected previousSibling?: Host<T>;
	protected parent?: Host<T>;
	ctx?: Context<T>;
	guest?: Guest;
	node?: T | string;
	publications = new Set<Publication>();
	// TODO: reduce the number of boolean properties
	private updating = false;
	private done = false;
	private unmounted = false;
	private independent = false;
	// these properties are used when racing components
	private pending?: Promise<any>;
	private enqueued?: Promise<any>;
	private replacedBy?: Host<T>;
	private clock = 0;
	private iterator?: ChildIterator;
	private committer?: Iterator<T | undefined>;
	private intrinsic?: Intrinsic<T>;
	private hostsByKey?: Map<unknown, Host<T>>;
	private renderer: Renderer<T>;
	constructor(
		parent: Host<T> | undefined,
		// TODO: Figure out a way to not have to pass in a renderer
		renderer: Renderer<T>,
	) {
		super();
		this.parent = parent;
		this.renderer = renderer;
	}

	// TODO: flatten these instead of storing guest
	get tag(): Tag | undefined {
		return isElement(this.guest) ? this.guest.tag : undefined;
	}

	get key(): unknown {
		return isElement(this.guest) ? this.guest.key : undefined;
	}

	get props(): Props | undefined {
		return isElement(this.guest) ? this.guest.props : undefined;
	}

	private cachedChildNodes?: Array<T | string>;
	get childNodes(): Array<T | string> {
		if (this.cachedChildNodes !== undefined) {
			return this.cachedChildNodes;
		}

		let buffer: string | undefined;
		const childNodes: Array<T | string> = [];
		for (
			let host = this.firstChild;
			host !== undefined;
			host = host.nextSibling
		) {
			if (typeof host.node === "string") {
				buffer = (buffer || "") + host.node;
			} else if (host.tag !== Portal) {
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

		if (this.ctx !== undefined && typeof this.tag === "function") {
			// TODO: filter predicate type narrowing is not working
			this.ctx.delegates = new Set(childNodes.filter(isEventTarget) as any);
		}

		this.cachedChildNodes = childNodes;
		return childNodes;
	}

	get next(): Next<T> {
		if (this.childNodes.length > 1) {
			return this.childNodes;
		}

		return this.childNodes[0];
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

	/*
	 * TODO: maybe do a little untangling between step and run. Can we inline
	 * step into run and see if we can reabstract the parts in a different way.
	 * The real issue is the weird reqs with pending and enqueued promises, and
	 * sync and async iterators.
	 */
	private step(
		next?: MaybePromise<(T | string)[] | T | string | undefined>,
	): MaybePromiseLike<Child> {
		if (this.ctx === undefined) {
			throw new Error("Missing context");
		} else if (!isComponentElement(this.guest)) {
			throw new Error("Non-component element as guest");
		}

		if (this.done) {
			return;
		} else if (this.iterator === undefined) {
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
				.execute() as ChildIterator | MaybePromise<Child>;
			if (isIteratorOrAsyncIterator(value)) {
				this.iterator = value;
			} else {
				return value;
			}
		}

		const iteration = new Pledge(() => this.iterator!.next(next))
			.catch((err) => {
				if (this.parent === undefined) {
					throw err;
				}

				this.parent.catch(err);
				return {value: undefined, done: false};
			})
			.execute();

		if (isPromiseLike(iteration)) {
			this.independent = true;
			return iteration.then((iteration) => {
				const updateP = Pledge.resolve(iteration.value)
					.then((child) => this.updateChildren(child))
					.execute();
				const next = Pledge.resolve(updateP)
					.then(() => this.next)
					.execute();
				if (iteration.done) {
					this.done = true;
				} else if (!this.done) {
					this.pending = new Promise((resolve) => setFrame(resolve)).then(() =>
						this.step(next),
					);
				}

				return updateP;
			});
		} else {
			if (iteration.done) {
				this.done = true;
			}

			return Pledge.resolve(iteration.value)
				.then((child) => this.updateChildren(child))
				.execute();
		}
	}

	run(): MaybePromise<undefined> {
		if (this.pending === undefined) {
			const step = this.step(this.iterator && this.next);
			if (this.iterator === undefined) {
				if (isPromiseLike(step)) {
					this.pending = Promise.resolve(step).finally(() => {
						this.pending = this.enqueued;
						this.enqueued = undefined;
					});
				}

				return Pledge.resolve(step)
					.then((child) => this.updateChildren(child))
					.execute();
			} else if (isPromiseLike(step)) {
				this.pending = Promise.resolve(step);
				if (!this.independent) {
					this.pending.finally(() => {
						this.pending = this.enqueued;
						this.enqueued = undefined;
					});
				}
			}

			return this.pending;
		} else if (this.independent) {
			return this.pending;
		} else if (this.enqueued === undefined) {
			this.enqueued = this.pending.then(() => this.step(this.next));
			if (this.iterator === undefined) {
				this.enqueued = this.enqueued.then((child) => {
					return this.updateChildren(child);
				});
			}

			this.enqueued.finally(() => {
				this.pending = this.enqueued;
				this.enqueued = undefined;
			});
		}

		return this.enqueued;
	}

	refresh(): MaybePromise<undefined> {
		if (this.unmounted) {
			return;
		} else if (this.tag !== undefined) {
			for (const pub of this.publications) {
				pub.push(this.props!);
			}

			if (typeof this.tag === "function") {
				return this.run();
			} else {
				return this.updateChildren(this.props && this.props.children);
			}
		} else if (typeof this.guest === "string") {
			this.node = this.renderer.text(this.guest);
		} else {
			this.node = undefined;
		}
	}

	// TODO: clean up this monster
	updateChildren = chase(function updateChildren(
		this: Host<T>,
		children: Children,
	): MaybePromise<undefined> {
		let host = this.firstChild;
		const promises: Promise<undefined>[] = [];
		let hostsByKey: Map<unknown, Host<T>> | undefined;
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
					if (hostsByKey !== undefined && hostsByKey.has(key)) {
						// TODO: warn about a duplicate key
						key = undefined;
					}
				}

				if (key != null) {
					let newHost = this.hostsByKey && this.hostsByKey.get(key);
					if (newHost === undefined) {
						newHost = new Host(this, this.renderer);
						isNewHost = true;
					} else {
						this.hostsByKey!.delete(key);
						if (host !== newHost) {
							this.removeChild(newHost);
						}
					}

					if (host === undefined) {
						this.appendChild(newHost);
					} else if (host !== newHost) {
						if (isKeyedElement(host.guest)) {
							this.insertAfter(newHost, host);
						} else {
							this.insertBefore(newHost, host);
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
					if (hostsByKey === undefined) {
						hostsByKey = new Map();
					}

					hostsByKey.set(key, host);
				}

				host = host.nextSibling;
			}
		}

		// unmounting excess hosts
		while (host !== undefined) {
			if (this.hostsByKey !== undefined && host.key !== undefined) {
				this.hostsByKey.delete(host.key);
			}

			host.unmount();
			const nextSibling = host.nextSibling;
			this.removeChild(host);
			host = nextSibling;
		}

		// unmounting keyed hosts
		if (this.hostsByKey) {
			for (const host of this.hostsByKey.values()) {
				// TODO: implement async unmount for keyed hosts
				host.unmount();
				this.removeChild(host);
			}
		}

		this.hostsByKey = hostsByKey;
		// TODO: can we move this somewhere else
		if (promises.length) {
			return Promise.all(promises).then(() => void this.commit()); // void :(
		} else {
			this.commit();
		}
	});

	commit(): void {
		this.cachedChildNodes = undefined;
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

				if (this.node == null && this.parent !== undefined) {
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
		for (const pub of this.publications) {
			pub.stop();
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

	get node(): T | string | undefined {
		return hosts.get(this)!.node;
	}

	get childNodes(): Array<T | string> {
		return hosts.get(this)!.childNodes;
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
		return new Repeater(async (push, stop) => {
			const host = hosts.get(this)!;
			push(host.props!);
			const pub: Publication = {push, stop};
			host.publications.add(pub);
			await stop;
			host.publications.delete(pub);
		}, new SlidingBuffer(1));
	}

	// TODO: throw or warn if called on an unmounted component?
	refresh(): MaybePromise<undefined> {
		const host = hosts.get(this)!;
		return host.refresh();
	}
}

export type FunctionComponent = (
	this: Context,
	props: Props,
) => MaybePromiseLike<Child>;

export type ChildIterator =
	| Iterator<MaybePromiseLike<Child>, any, any>
	| AsyncIterator<MaybePromiseLike<Child>, any, any>;

type ChildIteratorResult = MaybePromise<
	IteratorResult<MaybePromiseLike<Child>>
>;

export type GeneratorComponent = (this: Context, props: Props) => ChildIterator;

// TODO: component cannot be a union of FunctionComponent | GeneratorComponent
// because this breaks Function.prototype methods.
// https://github.com/microsoft/TypeScript/issues/34984
export type Component = (
	this: Context,
	props: Props,
) => ChildIterator | MaybePromiseLike<Child>;

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
	private getOrCreateHost(root?: object): Host<T> {
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

		const host = this.getOrCreateHost(root);
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
