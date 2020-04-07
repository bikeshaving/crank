// TODO: delete this dependency
import {Repeater, SlidingBuffer} from "@repeaterjs/repeater";
import {CrankEventTarget} from "./events";
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

export type Key = unknown;

export type Child = Element | string | number | boolean | null | undefined;

interface ChildIterable extends Iterable<Child | ChildIterable> {}

export type Children = Child | ChildIterable;

export interface Props {
	"crank-key"?: Key;
	children?: Children;
	[name: string]: any;
}

export interface IntrinsicProps<T> {
	children: Array<T | string>;
	[name: string]: any;
}

const ElementSigil: unique symbol = Symbol.for("crank.ElementSigil");

export interface Element<TTag extends Tag = Tag> {
	[ElementSigil]: true;
	readonly tag: TTag;
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

export type Intrinsic<T> = (
	this: HostContext,
	props: IntrinsicProps<T>,
) => Iterator<T> | T;

// Special Intrinsic Tags
// TODO: We assert symbol tags as any because typescript support for symbol
// tags in JSX does not exist yet.
export const Fragment = Symbol.for("crank.Fragment") as any;
export type Fragment = typeof Fragment;

export const Copy = Symbol("crank.Copy") as any;
export type Copy = typeof Copy;

export const Portal = Symbol.for("crank.Portal") as any;
export type Portal = typeof Portal;

export const Raw = Symbol.for("crank.Raw") as any;
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

type NormalizedChild = Element | string | undefined;

function normalize(child: Child): NormalizedChild {
	if (child == null || typeof child === "boolean") {
		return undefined;
	} else if (typeof child === "string" || isElement(child)) {
		return child;
	} else {
		return child.toString();
	}
}

function* flatten(children: Children): Generator<NormalizedChild> {
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

// This union exists because we needed to discriminate between leaf and parent
// nodes using a property (host.internal).
type Node<T> = LeafNode<T> | ParentNode<T>;

// The shared properties between LeafNode and ParentNode
interface NodeBase<T> {
	readonly internal: boolean;
	readonly tag: Tag | undefined;
	readonly key: Key;
	value: Array<T | string> | T | string | undefined;
	nextSibling: Node<T> | undefined;
	previousSibling: Node<T> | undefined;
	clock: number;
	replacedBy: Node<T> | undefined;
}

class LeafNode<T> implements NodeBase<T> {
	readonly tag = undefined;
	readonly key = undefined;
	readonly internal = false;
	value: string | undefined = undefined;
	nextSibling: Node<T> | undefined = undefined;
	previousSibling: Node<T> | undefined = undefined;
	clock: number = 0;
	replacedBy: Node<T> | undefined = undefined;
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

type NodeState = Initial | Waiting | Updating | Finished | Unmounted;

abstract class ParentNode<T> implements NodeBase<T> {
	abstract readonly tag: Tag;
	readonly key: Key = undefined;
	readonly internal = true;
	value: Array<T | string> | T | string | undefined = undefined;
	ctx: Context<T> | undefined = undefined;
	abstract renderer: Renderer<T>;
	state: NodeState = Initial;
	// TODO: move into subclasses
	props: Props | undefined = undefined;
	clock: number = 0;
	replacedBy: Node<T> | undefined = undefined;
	abstract parent: ParentNode<T> | undefined;
	nextSibling: Node<T> | undefined = undefined;
	previousSibling: Node<T> | undefined = undefined;
	firstChild: Node<T> | undefined = undefined;
	lastChild: Node<T> | undefined = undefined;
	keyedChildren: Map<unknown, Node<T>> | undefined = undefined;
	protected appendChild(child: Node<T>): void {
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
		child: Node<T>,
		reference: Node<T> | null | undefined,
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

	protected removeChild(child: Node<T>): void {
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

	protected replaceChild(child: Node<T>, reference: Node<T>): void {
		this.insertBefore(child, reference);
		this.removeChild(reference);
	}

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

	update(props: Props): MaybePromise<undefined> {
		this.props = props;
		this.state = this.state < Updating ? Updating : this.state;
		return this.refresh();
	}

	refresh(): MaybePromise<undefined> {
		if (this.state === Unmounted) {
			return;
		}

		return this.updateChildren(this.props && this.props.children);
	}

	// When children update asynchronously, we race their result against the next
	// update of children. The bail property is set to the resolve function of
	// the promise which the current update is raced against.
	private bail:
		| ((result?: Promise<undefined>) => unknown)
		| undefined = undefined;
	// TODO: I bet we could simplify the algorithm further, perhaps by writing a
	// custom alignment algorithm which automatically zips up old and new nodes or
	// skips keyed nodes.
	updateChildren(children: Children): MaybePromise<undefined> {
		let host = this.firstChild;
		let nextSibling = host && host.nextSibling;
		let nextKeyedChildren: Map<unknown, Node<T>> | undefined;
		let updates: Array<Promise<unknown>> | undefined;
		for (const child of flatten(children)) {
			let tag: Tag | undefined;
			let key: unknown;
			if (isElement(child)) {
				tag = child.tag;
				key = child.key;
				if (nextKeyedChildren !== undefined && nextKeyedChildren.has(key)) {
					// TODO: warn about a duplicate key
					key = undefined;
				}
			}

			if (key != null) {
				let nextNode = this.keyedChildren && this.keyedChildren.get(key);
				if (nextNode === undefined) {
					nextNode = createNode(this, this.renderer, child);
				} else {
					this.keyedChildren!.delete(key);
					if (host !== nextNode) {
						this.removeChild(nextNode);
					}
				}

				if (host === undefined) {
					this.appendChild(nextNode);
				} else if (host !== nextNode) {
					if (host.key == null) {
						this.insertBefore(nextNode, host);
					} else {
						this.insertBefore(nextNode, host.nextSibling);
					}
				}

				host = nextNode;
				nextSibling = host.nextSibling;
			} else if (host === undefined) {
				host = createNode(this, this.renderer, child);
				this.appendChild(host);
			} else if (host.key != null) {
				const nextNode = createNode(this, this.renderer, child);
				this.insertBefore(nextNode, host.nextSibling);
				host = nextNode;
				nextSibling = host.nextSibling;
			}

			if (tag !== Copy) {
				// TODO: figure out why do we do a check for unmounted hosts here
				if (host.tag === tag && !(host.internal && host.state === Unmounted)) {
					if (host.internal) {
						const update = host.update((child as Element).props);
						if (update !== undefined) {
							if (updates === undefined) {
								updates = [];
							}

							updates.push(update);
						}
					} else if (typeof child === "string") {
						host.value = this.renderer.text(child);
					} else {
						host.value = undefined;
					}
				} else {
					// TODO: async unmount for keyed hosts
					host.internal && host.unmount();
					const nextNode = createNode(this, this.renderer, child);
					nextNode.clock = host.clock++;
					let update: MaybePromise<undefined>;
					if (nextNode.internal) {
						update = nextNode.update((child as Element).props);
					} else if (typeof child === "string") {
						nextNode.value = this.renderer.text(child);
					} else {
						nextNode.value = undefined;
					}

					if (update === undefined) {
						this.replaceChild(nextNode, host);
						host.replacedBy = nextNode;
					} else {
						if (updates === undefined) {
							updates = [];
						}

						updates.push(update);
						// host is reassigned so we need to capture its current value in
						// host1 for the sake of the callback’s closure.
						const host1 = host;
						update.then(() => {
							if (host1.replacedBy === undefined) {
								this.replaceChild(nextNode, host1);
								host1.replacedBy = nextNode;
							} else if (
								host1.replacedBy.replacedBy === undefined &&
								host1.replacedBy.clock < nextNode.clock
							) {
								this.replaceChild(nextNode, host1.replacedBy);
								host1.replacedBy = nextNode;
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

		// unmount excess children
		for (
			;
			host !== undefined;
			host = nextSibling, nextSibling = host && host.nextSibling
		) {
			if (host.key !== undefined && this.keyedChildren !== undefined) {
				this.keyedChildren.delete(host.key);
			}

			if (host.internal) {
				host.unmount();
			}

			this.removeChild(host);
		}

		// unmount excess keyed children
		if (this.keyedChildren !== undefined) {
			for (const child of this.keyedChildren.values()) {
				child.internal && child.unmount();
				this.removeChild(child);
			}
		}

		this.keyedChildren = nextKeyedChildren;
		if (updates === undefined) {
			this.commit();
			if (this.bail !== undefined) {
				this.bail();
				this.bail = undefined;
			}
		} else {
			const result = Promise.all(updates).then(() => void this.commit()); // void :(
			if (this.bail !== undefined) {
				this.bail(result);
				this.bail = undefined;
			}

			const nextResult = new Promise<undefined>(
				(resolve) => (this.bail = resolve),
			);
			return Promise.race([result, nextResult]);
		}
	}

	commit(): void {
		this.state = this.state <= Updating ? Waiting : this.state;
	}

	catch(reason: any): MaybePromise<undefined> {
		if (this.parent === undefined) {
			throw reason;
		}

		return this.parent.catch(reason);
	}

	unmount(): void {
		this.state = Unmounted;
		for (
			let host = this.firstChild;
			host !== undefined;
			host = host.nextSibling
		) {
			host.internal && host.unmount();
		}
	}
}

class FragmentNode<T> extends ParentNode<T> {
	parent: ParentNode<T>;
	renderer: Renderer<T>;
	readonly tag: Fragment = Fragment;
	readonly key: Key;
	constructor(parent: ParentNode<T>, renderer: Renderer<T>, key: unknown) {
		super();
		this.parent = parent;
		this.renderer = renderer;
		this.ctx = parent.ctx;
		this.key = key;
	}

	commit(): void {
		const childValues = this.getChildValues();
		this.value = childValues.length > 1 ? childValues : childValues[0];
		if (this.state < Updating) {
			// TODO: batch this per microtask
			this.parent.commit();
		}

		super.commit();
	}
}

class IntrinsicNode<T> extends ParentNode<T> {
	readonly tag: string | symbol;
	readonly key: Key;
	value: T | undefined;
	private readonly intrinsic: Intrinsic<T>;
	private iterator: Iterator<T | undefined> | undefined = undefined;
	readonly hostCtx: HostContext<T>;
	childValues: Array<T | string> = [];
	parent: ParentNode<T> | undefined;
	renderer: Renderer<T>;
	constructor(
		parent: ParentNode<T> | undefined,
		renderer: Renderer<T>,
		tag: string | symbol,
		key?: unknown,
	) {
		super();
		this.parent = parent;
		this.renderer = renderer;
		this.tag = tag;
		this.key = key;
		this.ctx = this.parent && this.parent.ctx;
		this.hostCtx = new HostContext(this);
		this.intrinsic = this.renderer.intrinsic(tag);
	}

	commit(): void {
		this.childValues = this.getChildValues();
		if (this.iterator === undefined) {
			const value = this.intrinsic.call(this.hostCtx, {
				...this.props,
				children: this.childValues,
			});
			if (isIteratorOrAsyncIterator(value)) {
				this.iterator = value;
			} else {
				this.value = value;
			}
		}

		if (this.iterator !== undefined) {
			const iteration = this.iterator.next();
			this.value = iteration.value;
			if (iteration.done) {
				this.state = this.state < Finished ? Finished : this.state;
			}
		}

		super.commit();
	}

	unmount(): void {
		if (this.state < Finished) {
			if (this.iterator !== undefined && this.iterator.return) {
				this.iterator.return();
			}
		}

		super.unmount();
	}
}

const intrinsicNodes = new WeakMap<HostContext<any>, IntrinsicNode<any>>();
export class HostContext<T = any> {
	constructor(host: IntrinsicNode<T>) {
		intrinsicNodes.set(this, host);
	}

	*[Symbol.iterator](): Generator<IntrinsicProps<T>> {
		const host = intrinsicNodes.get(this)!;
		while (true) {
			yield {...host.props, children: host.childValues};
		}
	}
}

// TODO: delete this
interface Publication {
	push(props: Props): unknown;
	stop(): unknown;
}

class ComponentNode<T> extends ParentNode<T> {
	readonly tag: Component;
	readonly key: Key;
	parent: ParentNode<T>;
	renderer: Renderer<T>;
	ctx: Context<T>;
	constructor(
		parent: ParentNode<T>,
		renderer: Renderer<T>,
		tag: Component,
		key: Key,
	) {
		super();
		this.parent = parent;
		this.renderer = renderer;
		this.ctx = new Context(this, parent.ctx);
		this.tag = tag;
		this.key = key;
	}

	private iterator: ChildIterator | undefined = undefined;
	// TODO: explain this shizzzz
	isAsyncGenerator = false;
	private inflightSelf: Promise<undefined> | undefined = undefined;
	private enqueuedSelf: Promise<undefined> | undefined = undefined;
	private inflightChildren: Promise<undefined> | undefined = undefined;
	private enqueuedChildren: Promise<undefined> | undefined = undefined;
	private previousChildren: Promise<undefined> | undefined = undefined;
	private step(): [MaybePromise<undefined>, MaybePromise<undefined>] {
		if (this.state >= Finished) {
			return [undefined, undefined];
		} else if (this.iterator === undefined) {
			this.ctx.clearEventListeners();
			const value = new Pledge(() => this.tag.call(this.ctx, this.props!))
				.catch((err) => this.parent.catch(err))
				// type assertion because we shouldn’t get a promise of an iterator
				.execute() as ChildIterator | Promise<Child> | Child;
			if (isIteratorOrAsyncIterator(value)) {
				this.iterator = value;
			} else if (isPromiseLike(value)) {
				const pending = value.then(() => undefined); // void :(
				const result = value.then((child) => this.updateChildren(child));
				return [pending, result];
			} else {
				const result = this.updateChildren(value);
				return [undefined, result];
			}
		}

		const previousValue = Pledge.resolve(this.previousChildren)
			.then(() => this.value)
			.execute();
		const iteration = new Pledge(() => this.iterator!.next(previousValue))
			.catch((err) => {
				// TODO: figure out why this is written like this
				return Pledge.resolve(this.parent.catch(err))
					.then(() => ({value: undefined, done: true}))
					.execute();
			})
			.execute();

		if (isPromiseLike(iteration)) {
			this.isAsyncGenerator = true;
			const pending = iteration.then((iteration) => {
				if (iteration.done) {
					this.state = this.state < Finished ? Finished : this.state;
				}

				return undefined; // void :(
			});
			const result = iteration.then((iteration) => {
				this.previousChildren = this.updateChildren(iteration.value);
				return this.previousChildren;
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
		this.inflightSelf = this.enqueuedSelf;
		this.inflightChildren = this.enqueuedChildren;
		this.enqueuedSelf = undefined;
		this.enqueuedChildren = undefined;
		if (this.isAsyncGenerator && this.state < Finished) {
			this.run();
		}
	}

	private publications: Set<Publication> | undefined = undefined;
	refresh(): MaybePromise<undefined> {
		if (this.state === Unmounted) {
			return;
		}

		if (this.publications !== undefined) {
			for (const pub of this.publications) {
				pub.push(this.props!);
			}
		}

		return this.run();
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

	private run(): MaybePromise<undefined> {
		if (this.inflightSelf === undefined) {
			const [pending, result] = this.step();
			if (isPromiseLike(pending)) {
				this.inflightSelf = pending.finally(() => this.advance());
			}

			this.inflightChildren = result;
			return this.inflightChildren;
		} else if (this.isAsyncGenerator) {
			return this.inflightChildren;
		} else if (this.enqueuedSelf === undefined) {
			let resolve: (value: MaybePromise<undefined>) => unknown;
			this.enqueuedSelf = this.inflightSelf
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

	commit(): void {
		const childValues = this.getChildValues();
		this.ctx.setDelegates(childValues);
		this.value = childValues.length > 1 ? childValues : childValues[0];
		if (this.state < Updating) {
			// TODO: batch this per microtask
			this.parent.commit();
		}

		super.commit();
	}

	unmount(): void {
		if (this.state < Finished) {
			if (this.iterator !== undefined && this.iterator.return) {
				this.iterator.return();
			}
		}

		if (this.publications !== undefined) {
			for (const pub of this.publications) {
				pub.stop();
			}
		}

		super.unmount();
	}

	catch(reason: any): MaybePromise<undefined> {
		if (
			this.iterator === undefined ||
			this.iterator.throw === undefined ||
			this.state >= Finished
		) {
			return super.catch(reason);
		} else {
			return new Pledge(() => this.iterator!.throw!(reason))
				.then((iteration) => {
					if (iteration.done) {
						this.state = this.state < Finished ? Finished : this.state;
					}

					return this.updateChildren(iteration.value);
				})
				.catch((err) => this.parent.catch(err))
				.execute();
		}
	}

	// Context stuff
	private provisions: Map<unknown, any> | undefined = undefined;
	get(name: unknown): any {
		for (
			let host: ParentNode<T> | undefined = this.parent;
			host !== undefined;
			host = host.parent
		) {
			if (
				host instanceof ComponentNode &&
				host.provisions !== undefined &&
				host.provisions.has(name)
			) {
				return host.provisions.get(name);
			}
		}
	}

	set(name: unknown, value: any): void {
		if (this.provisions === undefined) {
			this.provisions = new Map();
		}

		this.provisions.set(name, value);
	}
}

const componentNodes = new WeakMap<Context<any>, ComponentNode<any>>();
export class Context<T = any> extends CrankEventTarget {
	constructor(host: ComponentNode<T>, parent?: Context<T>) {
		super(parent);
		componentNodes.set(this, host);
	}

	get(name: unknown): any {
		return componentNodes.get(this)!.get(name);
	}

	set(name: unknown, value: any): void {
		componentNodes.get(this)!.set(name, value);
	}

	*[Symbol.iterator](): Generator<Props> {
		while (true) {
			yield componentNodes.get(this)!.props!;
		}
	}

	[Symbol.asyncIterator](): AsyncGenerator<Props> {
		return componentNodes.get(this)!.subscribe();
	}

	// TODO: throw or warn if called on an unmounted component?
	refresh(): MaybePromise<undefined> {
		return componentNodes.get(this)!.refresh();
	}
}

function createNode<T>(
	parent: ParentNode<T>,
	renderer: Renderer<T>,
	child: NormalizedChild,
): Node<T> {
	if (child === undefined || typeof child === "string") {
		return new LeafNode();
	} else if (child.tag === Fragment) {
		return new FragmentNode(parent, renderer, child.key);
	} else if (typeof child.tag === "function") {
		return new ComponentNode(parent, renderer, child.tag, child.key);
	} else {
		return new IntrinsicNode(parent, renderer, child.tag, child.key);
	}
}

export const Default = Symbol.for("crank.Default");

export type Default = typeof Default;

export const Text = Symbol.for("crank.Text");

export type Text = typeof Text;

export interface Environment<T> {
	[Default](tag: string): Intrinsic<T>;
	[Text]?(text: string): string;
	[tag: string]: Intrinsic<T>;
	// TODO: these
	// [Portal]?: Intrinsic<T>;
	// [Raw]?: Intrinsic<T>;
}

const defaultEnv: Environment<any> = {
	[Default](tag: string): never {
		throw new Error(`Environment did not provide an intrinsic for tag: ${tag}`);
	},
	[Portal](): never {
		throw new Error("Environment did not provide an intrinsic for Portal");
	},
	[Raw]({value}): any {
		return value;
	},
};

export class Renderer<T> {
	private cache = new WeakMap<object, IntrinsicNode<T>>();
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

		for (const tag of Object.keys(env)) {
			if (env[tag] != null) {
				this.env[tag] = env[tag]!;
			}
		}
	}

	render(child: Child, root?: object): MaybePromise<T> {
		let portal: Element<Portal>;
		if (isElement(child) && child.tag === Portal) {
			portal = child;
		} else {
			portal = createElement(Portal, {root}, child);
		}

		let host: IntrinsicNode<T> | undefined =
			root != null ? this.cache.get(root) : undefined;

		if (host === undefined) {
			host = new IntrinsicNode(undefined, this, portal.tag);
			if (root !== undefined) {
				this.cache.set(root, host);
			}
		}

		return Pledge.resolve(host.update(portal.props))
			.then(() => host!.value!)
			.execute();
	}

	// TODO: Ideally these two methods should not be exposed outside this module
	intrinsic(tag: string | symbol): Intrinsic<T> {
		if (this.env[tag as any]) {
			return this.env[tag as any];
		} else if (typeof tag === "string") {
			return this.env[Default](tag);
		} else {
			throw new Error(`Unknown tag: ${tag.toString()}`);
		}
	}

	text(text: string): string {
		if (this.env[Text] !== undefined) {
			return this.env[Text]!(text);
		}

		return text;
	}
}
