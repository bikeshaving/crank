import {CrankEventTarget} from "./events";
import {isPromiseLike, MaybePromise, MaybePromiseLike, Pledge} from "./pledge";
// re-exporting EventMap for user extensions
export {EventMap} from "./events";

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

export type Tag<TProps = any> = Component<TProps> | string | symbol;

// prettier-ignore
type TagProps<TTag extends Tag> = 
	TTag extends Component<infer TProps> ? TProps 
	: TTag extends string ? JSX.IntrinsicElements[TTag]
	: any;

export type Key = unknown;

export type Child = Element | string | number | boolean | null | undefined;

interface ChildIterable extends Iterable<Child | ChildIterable> {}

export type Children = Child | ChildIterable;

export interface Props {
	"crank-key"?: Key;
	children?: Children;
}

export interface IntrinsicProps<T> {
	children: Array<T | string>;
	[name: string]: any;
}

const ElementSigil: unique symbol = Symbol.for("crank.ElementSigil");

export interface Element<TTag extends Tag = Tag> {
	[ElementSigil]: true;
	readonly tag: TTag;
	props: TagProps<TTag>;
	key?: unknown;
}

export type FunctionComponent<TProps = any> = (
	this: Context<TProps>,
	props: TProps,
) => MaybePromiseLike<Child>;

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

// TODO: Component cannot be a union of FunctionComponent | GeneratorComponent
// because this breaks Function.prototype methods.
// https://github.com/microsoft/TypeScript/issues/33815
export type Component<TProps = any> = (
	this: Context<TProps>,
	props: TProps,
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

export const Copy = Symbol.for("crank.Copy") as any;
export type Copy = typeof Copy;

export const Portal = Symbol.for("crank.Portal") as any;
export type Portal = typeof Portal;

export const Raw = Symbol.for("crank.Raw") as any;
export type Raw = typeof Raw;

export function isElement(value: any): value is Element {
	return value != null && value[ElementSigil];
}

export function createElement<TTag extends Tag>(
	tag: TTag,
	props?: TagProps<TTag> | null,
	...children: Array<Children>
): Element<TTag>;
export function createElement<TTag extends Tag, TProps extends Props>(
	tag: TTag,
	props?: TagProps<TTag> | null,
): Element<TTag> {
	const assignedProps = Object.assign({}, props);
	const key = assignedProps["crank-key"];
	if (key != null) {
		delete assignedProps["crank-key"];
	}

	if (arguments.length > 3) {
		assignedProps.children = Array.from(arguments).slice(2);
	} else if (arguments.length > 2) {
		assignedProps.children = arguments[2];
	}

	return {[ElementSigil]: true, tag, props: assignedProps, key};
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
// nodes using a property (node.internal).
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
	readonly internal = false;
	readonly tag = undefined;
	readonly key = undefined;
	nextSibling: Node<T> | undefined = undefined;
	previousSibling: Node<T> | undefined = undefined;
	clock: number = 0;
	replacedBy: Node<T> | undefined = undefined;
	value: string | undefined = undefined;
}

abstract class ParentNode<T, TProps extends Props = Props>
	implements NodeBase<T> {
	readonly internal = true;
	abstract readonly tag: Tag<TProps>;
	readonly key: Key = undefined;
	nextSibling: Node<T> | undefined = undefined;
	previousSibling: Node<T> | undefined = undefined;
	clock: number = 0;
	replacedBy: Node<T> | undefined = undefined;
	private firstChild: Node<T> | undefined = undefined;
	private lastChild: Node<T> | undefined = undefined;
	private keyedChildren: Map<unknown, Node<T>> | undefined = undefined;
	abstract readonly renderer: Renderer<T>;
	abstract parent: ParentNode<T> | undefined;
	// When children update asynchronously, we race their result against the next
	// update of children. The onNextResult property is set to the resolve
	// function of the promise which the current update is raced against.
	private onNextResult:
		| ((result?: Promise<undefined>) => unknown)
		| undefined = undefined;
	protected props: TProps | undefined = undefined;
	value: Array<T | string> | T | string | undefined = undefined;
	ctx: Context<TProps> | undefined = undefined;
	protected updating = false;
	protected iterating = false;
	protected finished = false;
	protected unmounted = false;
	private appendChild(child: Node<T>): void {
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

	private insertBefore(
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

	private removeChild(child: Node<T>): void {
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

	private replaceChild(child: Node<T>, reference: Node<T>): void {
		this.insertBefore(child, reference);
		this.removeChild(reference);
	}

	protected getChildValues(): Array<T | string> {
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

	// TODO: I bet we could simplify the algorithm further, perhaps by writing a
	// custom a method which automatically zips up old and new nodes.
	protected updateChildren(children: Children): MaybePromise<undefined> {
		let node = this.firstChild;
		let nextSibling = node && node.nextSibling;
		let nextKeyedChildren: Map<unknown, Node<T>> | undefined;
		let updates: Array<Promise<unknown>> | undefined;
		for (const child of flatten(children)) {
			let tag: Tag | undefined;
			let key: unknown;
			if (isElement(child)) {
				tag = child.tag;
				key = child.key;
				if (nextKeyedChildren !== undefined && nextKeyedChildren.has(key)) {
					key = undefined;
				}
			}

			if (key != null) {
				let nextNode = this.keyedChildren && this.keyedChildren.get(key);
				if (nextNode === undefined) {
					if (tag !== Copy) {
						nextNode = createNode(this, this.renderer, child);
					}
				} else {
					this.keyedChildren!.delete(key);
					if (node !== nextNode) {
						this.removeChild(nextNode);
					}
				}

				if (nextNode !== undefined) {
					if (node === undefined) {
						this.appendChild(nextNode);
					} else if (node !== nextNode) {
						if (node.key == null) {
							this.insertBefore(nextNode, node);
						} else {
							this.insertBefore(nextNode, node.nextSibling);
						}
					}

					node = nextNode;
					nextSibling = node.nextSibling;
				}
			} else if (node === undefined) {
				// current parent has no more nodes
				if (tag !== Copy) {
					node = createNode(this, this.renderer, child);
					this.appendChild(node);
				}
			} else if (node.key != null) {
				// the current node is keyed but the child is not
				while (node && node.key != null) {
					node = nextSibling;
					nextSibling = node && node.nextSibling;
				}

				if (node === undefined) {
					if (tag !== Copy) {
						node = createNode(this, this.renderer, child);
						this.appendChild(node);
					}
				}
			}

			if (node !== undefined) {
				if (tag !== Copy) {
					// TODO: figure out why do we do a check for unmounted node here
					if (node.tag === tag && !(node.internal && node.unmounted)) {
						if (node.internal) {
							const update = node.update((child as Element).props);
							if (update !== undefined) {
								if (updates === undefined) {
									updates = [];
								}

								updates.push(update);
							}
						} else if (typeof child === "string") {
							node.value = this.renderer.text(child);
						} else {
							node.value = undefined;
						}
					} else {
						// TODO: async unmount for keyed nodes
						if (node.internal) {
							node.unmount();
						}
						const nextNode = createNode(this, this.renderer, child);
						nextNode.clock = node.clock++;
						let update: MaybePromise<undefined>;
						if (nextNode.internal) {
							update = nextNode.update((child as Element).props);
						} else if (typeof child === "string") {
							nextNode.value = this.renderer.text(child);
						} else {
							nextNode.value = undefined;
						}

						if (update === undefined) {
							this.replaceChild(nextNode, node);
							node.replacedBy = nextNode;
						} else {
							if (updates === undefined) {
								updates = [];
							}

							updates.push(update);
							// node is reassigned so we need to capture its current value in
							// node for the sake of the callback’s closure.
							const node1 = node;
							update.then(() => {
								if (node1.replacedBy === undefined) {
									this.replaceChild(nextNode, node1);
									node1.replacedBy = nextNode;
								} else if (
									node1.replacedBy.replacedBy === undefined &&
									node1.replacedBy.clock < nextNode.clock
								) {
									this.replaceChild(nextNode, node1.replacedBy);
									node1.replacedBy = nextNode;
								}
							});
						}
					}
				}

				if (key !== undefined) {
					if (nextKeyedChildren === undefined) {
						nextKeyedChildren = new Map();
					}

					nextKeyedChildren.set(key, node);
				}
			}

			node = nextSibling;
			nextSibling = node && node.nextSibling;
		}

		// unmount excess children
		for (
			;
			node !== undefined;
			node = nextSibling, nextSibling = node && node.nextSibling
		) {
			if (node.key !== undefined && this.keyedChildren !== undefined) {
				this.keyedChildren.delete(node.key);
			}

			if (node.internal) {
				node.unmount();
			}

			this.removeChild(node);
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
			if (this.onNextResult !== undefined) {
				this.onNextResult();
				this.onNextResult = undefined;
			}
		} else {
			const result = Promise.all(updates).then(() => void this.commit()); // void :(
			if (this.onNextResult !== undefined) {
				this.onNextResult(result.catch(() => undefined)); // void :(
				this.onNextResult = undefined;
			}

			const nextResult = new Promise<undefined>(
				(resolve) => (this.onNextResult = resolve),
			);
			return Promise.race([result, nextResult]);
		}
	}

	protected unmountChildren(): void {
		for (
			let node = this.firstChild;
			node !== undefined;
			node = node.nextSibling
		) {
			if (node.internal) {
				node.unmount();
			}
		}
	}

	update(props: TProps): MaybePromise<undefined> {
		this.props = props;
		this.updating = true;
		return this.refresh();
	}

	refresh(): MaybePromise<undefined> {
		if (this.unmounted) {
			return;
		}

		return this.updateChildren(this.props && this.props.children);
	}

	abstract commit(): MaybePromise<undefined>;

	abstract unmount(): MaybePromise<undefined>;

	catch(reason: any): MaybePromise<undefined> {
		if (this.parent === undefined) {
			throw reason;
		}

		return this.parent.catch(reason);
	}
}

class FragmentNode<T> extends ParentNode<T, any> {
	readonly tag: Fragment = Fragment;
	readonly key: Key;
	readonly parent: ParentNode<T>;
	readonly renderer: Renderer<T>;
	constructor(parent: ParentNode<T>, renderer: Renderer<T>, key: unknown) {
		super();
		this.key = key;
		this.parent = parent;
		this.renderer = renderer;
		this.ctx = parent.ctx;
	}

	commit(): undefined {
		const childValues = this.getChildValues();
		this.value = childValues.length > 1 ? childValues : childValues[0];
		if (!this.updating) {
			// TODO: batch this per microtask
			this.parent.commit();
		}

		this.updating = false;
		return; // void :(
	}

	unmount(): undefined {
		if (this.unmounted) {
			return;
		}

		this.unmounted = true;
		this.unmountChildren();
	}
}

class HostNode<T> extends ParentNode<T, any> {
	readonly tag: string | symbol;
	readonly key: Key;
	readonly parent: ParentNode<T> | undefined;
	readonly renderer: Renderer<T>;
	value: T | undefined;
	private childValues: Array<T | string> = [];
	private readonly intrinsic: Intrinsic<T>;
	private iterator: Iterator<T> | undefined = undefined;
	private readonly hostCtx: HostContext<T>;
	constructor(
		parent: ParentNode<T> | undefined,
		renderer: Renderer<T>,
		tag: string | symbol,
		key?: unknown,
	) {
		super();
		this.tag = tag;
		this.key = key;
		this.parent = parent;
		this.renderer = renderer;
		this.intrinsic = renderer.intrinsic(tag);
		this.ctx = parent && parent.ctx;
		this.hostCtx = new HostContext(this);
	}

	commit(): MaybePromise<undefined> {
		this.childValues = this.getChildValues();
		try {
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
				this.iterating = false;
				if (iteration.done) {
					this.finished = true;
				}
			}
		} catch (err) {
			if (this.parent !== undefined) {
				return this.parent.catch(err);
			}

			throw err;
		} finally {
			this.updating = false;
		}
	}

	unmount(): MaybePromise<undefined> {
		if (this.unmounted) {
			return;
		} else if (this.finished) {
			if (this.iterator !== undefined && this.iterator.return) {
				try {
					this.iterator.return();
				} catch (err) {
					if (this.parent !== undefined) {
						return this.parent.catch(err);
					}

					throw err;
				}
			}
		}

		this.unmounted = true;
		this.unmountChildren();
	}

	*[Symbol.iterator]() {
		while (!this.unmounted) {
			if (this.iterating) {
				throw new Error("You must yield for each iteration of this.");
			}

			this.iterating = true;
			yield {...this.props, children: this.childValues};
		}
	}
}

const SyncFn = 0;
type SyncFn = typeof SyncFn;

const AsyncFn = 1;
type AsyncFn = typeof AsyncFn;

const SyncGen = 2;
type SyncGen = typeof SyncGen;

const AsyncGen = 3;
type AsyncGen = typeof AsyncGen;

type ComponentType = SyncFn | AsyncFn | SyncGen | AsyncGen;

class ComponentNode<T, TProps extends Props> extends ParentNode<T, TProps> {
	readonly tag: Component<TProps>;
	readonly key: Key;
	readonly parent: ParentNode<T, any>;
	readonly renderer: Renderer<T>;
	readonly ctx: Context<TProps>;
	private stepping = false;
	private available = false;
	private iterator: ChildIterator | undefined = undefined;
	// TODO: explain these properties
	private componentType: ComponentType | undefined = undefined;
	private inflightPending: MaybePromise<undefined> = undefined;
	private enqueuedPending: MaybePromise<undefined> = undefined;
	private inflightResult: MaybePromise<undefined> = undefined;
	private enqueuedResult: MaybePromise<undefined> = undefined;
	private previousResult: MaybePromise<undefined> = undefined;
	private provisions: Map<unknown, any> | undefined = undefined;
	private publish: ((props: TProps) => unknown) | undefined = undefined;
	constructor(
		parent: ParentNode<T, any>,
		renderer: Renderer<T>,
		tag: Component<TProps>,
		key: Key,
	) {
		super();
		this.parent = parent;
		this.renderer = renderer;
		this.tag = tag;
		this.key = key;
		this.ctx = new Context(this, parent.ctx);
	}

	protected updateChildren(children: Children): MaybePromise<undefined> {
		if (isNonStringIterable(children)) {
			children = createElement(Fragment, null, children);
		}

		return super.updateChildren(children);
	}

	private run(): MaybePromise<undefined> {
		if (this.inflightPending === undefined) {
			const [pending, result] = this.step();
			if (isPromiseLike(pending)) {
				this.inflightPending = pending.finally(() => this.advance());
			}

			this.inflightResult = result;
			return this.inflightResult;
		} else if (this.componentType === AsyncGen) {
			return this.inflightResult;
		} else if (this.enqueuedPending === undefined) {
			let resolve: (value: MaybePromise<undefined>) => unknown;
			this.enqueuedPending = this.inflightPending
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

	private step(): [MaybePromise<undefined>, MaybePromise<undefined>] {
		this.stepping = true;
		try {
			if (this.finished) {
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
					this.componentType = AsyncFn;
					const pending = value.then(
						() => undefined,
						() => undefined,
					); // void :(
					const result = value.then((child) => this.updateChildren(child));
					return [pending, result];
				} else {
					this.componentType = SyncFn;
					const result = this.updateChildren(value);
					return [undefined, result];
				}
			}

			const previousValue = Pledge.resolve(this.previousResult)
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
				this.componentType = AsyncGen;
				const pending = iteration.then(
					(iteration) => {
						this.iterating = false;
						if (iteration.done) {
							this.finished = true;
						}

						return undefined; // void :(
					},
					() => undefined, // void :(
				);
				const result = iteration.then((iteration) => {
					const result = this.updateChildren(iteration.value);
					if (isPromiseLike(result)) {
						this.previousResult = result.catch(() => undefined); // void
					}

					return result;
				});

				return [pending, result];
			} else {
				this.iterating = false;
				this.componentType = SyncGen;
				if (iteration.done) {
					this.finished = true;
				}

				const result = this.updateChildren(iteration.value);
				return [result, result];
			}
		} finally {
			this.stepping = false;
		}
	}

	private advance(): void {
		this.inflightPending = this.enqueuedPending;
		this.inflightResult = this.enqueuedResult;
		this.enqueuedPending = undefined;
		this.enqueuedResult = undefined;
		if (this.componentType === AsyncGen && !this.finished && !this.unmounted) {
			Promise.resolve(this.run()).catch((err) => {
				// We catch and rethrow the error to trigger an unhandled promise rejection.
				if (!this.updating) {
					throw err;
				}
			});
		}
	}

	refresh(): MaybePromise<undefined> {
		if (this.stepping || this.unmounted) {
			// TODO: we may want to log warnings when stuff like this happens
			return;
		}

		if (this.publish === undefined) {
			this.available = true;
		} else {
			this.publish(this.props!);
			this.publish = undefined;
		}

		return this.run();
	}

	commit(): undefined {
		const childValues = this.getChildValues();
		this.ctx.setDelegates(childValues);
		this.value = childValues.length > 1 ? childValues : childValues[0];
		if (!this.updating) {
			// TODO: batch this per macrotask
			this.parent.commit();
		}

		this.updating = false;
		return; // void :(
	}

	unmount(): MaybePromise<undefined> {
		if (this.unmounted) {
			return;
		}

		this.updating = false;
		this.unmounted = true;
		this.ctx.clearEventListeners();
		if (!this.finished) {
			this.finished = true;
			// helps avoid deadlocks
			if (this.publish !== undefined) {
				this.publish(this.props!);
				this.publish = undefined;
			}

			if (this.iterator !== undefined && this.iterator.return) {
				return new Pledge(() => this.iterator!.return!())
					.then(
						() => void this.unmountChildren(), // void :(
						(err) => this.parent.catch(err),
					)
					.execute();
			}
		}

		this.unmountChildren();
	}

	catch(reason: any): MaybePromise<undefined> {
		if (
			this.iterator === undefined ||
			this.iterator.throw === undefined ||
			this.finished
		) {
			return super.catch(reason);
		} else {
			// helps avoid deadlocks
			if (this.publish !== undefined) {
				this.publish(this.props!);
				this.publish = undefined;
			}

			return new Pledge(() => this.iterator!.throw!(reason))
				.then((iteration) => {
					if (iteration.done) {
						this.finished = true;
					}

					return this.updateChildren(iteration.value);
				})
				.catch((err) => this.parent.catch(err))
				.execute();
		}
	}

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

	*[Symbol.iterator](): Generator<TProps> {
		while (!this.unmounted) {
			if (this.iterating) {
				throw new Error("You must yield for each iteration of this.");
			} else if (this.componentType === AsyncGen) {
				throw new Error("Use for await...of in async generator components.");
			}

			this.iterating = true;
			yield this.props!;
		}
	}

	async *[Symbol.asyncIterator](): AsyncGenerator<TProps> {
		do {
			if (this.iterating) {
				throw new Error("You must yield for each iteration of this.");
			} else if (this.componentType === SyncGen) {
				throw new Error("Use for...of in sync generator components.");
			}

			this.iterating = true;
			if (this.available) {
				this.available = false;
				yield this.props!;
			} else {
				const props = await new Promise<TProps>(
					(resolve) => (this.publish = resolve),
				);
				if (!this.unmounted) {
					yield props;
				}
			}
		} while (!this.unmounted);
	}
}

function createNode<T>(
	parent: ParentNode<T, any>,
	renderer: Renderer<T>,
	child: NormalizedChild,
): Node<T> {
	if (child === undefined || typeof child === "string") {
		return new LeafNode();
	} else if (child.tag === Fragment) {
		return new FragmentNode(parent, renderer, child.key);
	} else if (typeof child.tag === "function") {
		return new ComponentNode(parent, renderer, child.tag, child.key);
	} else if (typeof child.tag === "string" || typeof child.tag === "symbol") {
		return new HostNode(parent, renderer, child.tag, child.key);
	} else {
		throw new Error("Unsupported child/tag type");
	}
}

const hostNodes = new WeakMap<HostContext<any>, HostNode<any>>();
export class HostContext<T = any> {
	constructor(host: HostNode<T>) {
		hostNodes.set(this, host);
	}

	[Symbol.iterator](): Generator<IntrinsicProps<T>> {
		return hostNodes.get(this)![Symbol.iterator]();
	}
}

export interface ProvisionMap {}

const componentNodes = new WeakMap<Context<any>, ComponentNode<any, any>>();
export class Context<TProps = any> extends CrankEventTarget {
	constructor(host: ComponentNode<any, any>, parent?: Context<Props>) {
		super(parent);
		componentNodes.set(this, host);
	}

	/* eslint-disable no-dupe-class-members */
	get<T extends keyof ProvisionMap>(name: T): ProvisionMap[T];
	get(name: any): any;
	get(name: any) {
		return componentNodes.get(this)!.get(name);
	}

	set<T extends keyof ProvisionMap>(name: T, value: ProvisionMap[T]): void;
	set(name: any, value: any): void;
	set(name: any, value: any) {
		componentNodes.get(this)!.set(name, value);
	}
	/* eslint-enable no-dupe-class-members */

	[Symbol.iterator](): Generator<TProps & Props> {
		return componentNodes.get(this)![Symbol.iterator]();
	}

	[Symbol.asyncIterator](): AsyncGenerator<TProps & Props> {
		return componentNodes.get(this)![Symbol.asyncIterator]();
	}

	refresh(): MaybePromise<undefined> {
		return componentNodes.get(this)!.refresh();
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
	// TODO: uncomment
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
	private cache = new WeakMap<object, HostNode<T>>();
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

		let rootNode: HostNode<T> | undefined =
			root != null ? this.cache.get(root) : undefined;

		if (rootNode === undefined) {
			rootNode = new HostNode(undefined, this, portal.tag);
			if (root !== undefined) {
				this.cache.set(root, rootNode);
			}
		}

		return Pledge.resolve(rootNode.update(portal.props))
			.then(() => {
				if (root === undefined) {
					rootNode!.unmount();
				}

				return rootNode!.value!;
			})
			.execute();
	}

	// TODO: Ideally, the intrinsic and text methods should not be exposed
	// outside this module
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
