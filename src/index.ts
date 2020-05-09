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

type TagProps<TTag extends Tag> = TTag extends Component<infer TProps>
	? TProps
	: TTag extends string
	? JSX.IntrinsicElements[TTag]
	: unknown;

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
// https://github.com/microsoft/TypeScript/issues/38367
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
	...children: Array<unknown>
): Element<TTag>;
export function createElement<TTag extends Tag>(
	tag: TTag,
	props?: TagProps<TTag> | null,
): Element<TTag> {
	const props1 = Object.assign({}, props);
	const key = props1["crank-key"];
	if (key != null) {
		delete props1["crank-key"];
	}

	if (arguments.length > 3) {
		props1.children = Array.from(arguments).slice(2);
	} else if (arguments.length > 2) {
		props1.children = arguments[2];
	}

	return {[ElementSigil]: true, tag, props: props1, key};
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
	value: string | undefined = undefined;
	clock: number = 0;
	replacedBy: Node<T> | undefined = undefined;
	nextSibling: Node<T> | undefined = undefined;
	previousSibling: Node<T> | undefined = undefined;
}

abstract class ParentNode<T> implements NodeBase<T> {
	readonly internal = true;
	abstract readonly tag: Tag;
	readonly key: Key = undefined;
	value: Array<T | string> | T | string | undefined = undefined;
	protected childValues: Array<T | string> = [];
	clock: number = 0;
	replacedBy: Node<T> | undefined = undefined;
	private firstChild: Node<T> | undefined = undefined;
	private lastChild: Node<T> | undefined = undefined;
	private keyedChildren: Map<unknown, Node<T>> | undefined = undefined;
	nextSibling: Node<T> | undefined = undefined;
	previousSibling: Node<T> | undefined = undefined;
	abstract readonly renderer: Renderer<T>;
	abstract parent: ParentNode<T> | undefined;
	// When children update asynchronously, we race their result against the next
	// update of children. The onNewResult property is set to the resolve
	// function of the promise which the current update is raced against.
	private onNewResult:
		| ((result?: Promise<undefined>) => unknown)
		| undefined = undefined;
	protected props: any = undefined;
	ctx: Context | undefined = undefined;
	// When updating is true, this means that the parent has created/updated this
	// node. It is set to false once the node has committed, and if this.updating
	// is not true when the node is refreshing or committing, this means that the
	// work was initiated at the current level or below.
	updating = false;
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

	protected prepare(): void {
		let buffer: string | undefined;
		let childValues: Array<T | string> = [];
		for (
			let child = this.firstChild;
			child !== undefined;
			child = child.nextSibling
		) {
			if (typeof child.value === "string") {
				buffer = buffer === undefined ? child.value : buffer + child.value;
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

		this.childValues = childValues;
	}

	// TODO: I bet we could simplify the algorithm further, perhaps by writing a
	// custom method which automatically zips up old and new nodes.
	protected updateChildren(children: Children): MaybePromise<undefined> {
		let node = this.firstChild;
		let nextSibling = node && node.nextSibling;
		let newKeyedChildren: Map<unknown, Node<T>> | undefined;
		let updates: Array<Promise<unknown>> | undefined;
		for (const child of flatten(children)) {
			let tag: Tag | undefined;
			let key: unknown;
			if (isElement(child)) {
				tag = child.tag;
				key = child.key;
				if (newKeyedChildren !== undefined && newKeyedChildren.has(key)) {
					// TODO: warn about a key collision
					key = undefined;
				}
			}

			// TODO: this code got really complex with all the Copy checks let’s
			// simplify it somehow
			if (key != null) {
				let keyedNode = this.keyedChildren && this.keyedChildren.get(key);
				if (keyedNode === undefined) {
					if (tag !== Copy) {
						keyedNode = createNode(this, this.renderer, child);
					}
				} else {
					this.keyedChildren!.delete(key);
					if (node !== keyedNode) {
						this.removeChild(keyedNode);
					}
				}

				if (keyedNode !== undefined) {
					if (node === undefined) {
						this.appendChild(keyedNode);
					} else if (node !== keyedNode) {
						if (node.key == null) {
							this.insertBefore(keyedNode, node);
						} else {
							this.insertBefore(keyedNode, node.nextSibling);
						}
					}

					node = keyedNode;
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
				while (node !== undefined && node.key != null) {
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
							const text = this.renderer.text(child);
							node.value = text;
						} else {
							node.value = undefined;
						}
					} else {
						const newNode = createNode(this, this.renderer, child);
						newNode.clock = node.clock++;
						let update: MaybePromise<undefined>;
						if (newNode.internal) {
							update = newNode.update((child as Element).props);
						} else if (typeof child === "string") {
							newNode.value = this.renderer.text(child);
						} else {
							newNode.value = undefined;
						}

						if (update === undefined) {
							if (node.internal) {
								node.unmount();
							}

							this.replaceChild(newNode, node);
							node.replacedBy = newNode;
						} else {
							if (updates === undefined) {
								updates = [];
							}

							// node is reassigned so we need to capture its current value in
							// node for the sake of the callback’s closure.
							const node1 = node;
							update = update.then(() => {
								if (node1.replacedBy === undefined) {
									this.replaceChild(newNode, node1);
									node1.replacedBy = newNode;
								} else if (
									node1.replacedBy.replacedBy === undefined &&
									node1.replacedBy.clock < newNode.clock
								) {
									this.replaceChild(newNode, node1.replacedBy);
									node1.replacedBy = newNode;
								}

								if (node1.internal) {
									node1.unmount();
								}

								return undefined; // void :(
							});

							updates.push(update);
						}
					}
				}

				if (key !== undefined) {
					if (newKeyedChildren === undefined) {
						newKeyedChildren = new Map();
					}

					newKeyedChildren.set(key, node);
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
			if (node.key == null) {
				if (node.internal) {
					node.unmount();
				}

				this.removeChild(node);
			}
		}

		// unmount excess keyed children
		if (this.keyedChildren !== undefined) {
			for (const child of this.keyedChildren.values()) {
				child.internal && child.unmount();
				this.removeChild(child);
			}
		}

		this.keyedChildren = newKeyedChildren;

		if (updates === undefined) {
			this.commit();
			if (this.onNewResult !== undefined) {
				this.onNewResult();
				this.onNewResult = undefined;
			}
		} else {
			const result = Promise.all(updates).then(() => void this.commit()); // void :(
			if (this.onNewResult !== undefined) {
				this.onNewResult(result.catch(() => undefined)); // void :(
				this.onNewResult = undefined;
			}

			const nextResult = new Promise<undefined>(
				(resolve) => (this.onNewResult = resolve),
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

	update(props: any): MaybePromise<undefined> {
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

class FragmentNode<T> extends ParentNode<T> {
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
		this.prepare();
		this.value =
			this.childValues.length > 1 ? this.childValues : this.childValues[0];
		if (!this.updating) {
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

class HostNode<T> extends ParentNode<T> {
	readonly tag: string | symbol;
	readonly key: Key;
	readonly parent: ParentNode<T> | undefined;
	readonly renderer: Renderer<T>;
	value: T | undefined;
	private readonly intrinsic: Intrinsic<T>;
	private readonly hostCtx: HostContext<T>;
	private iterator: Iterator<T> | undefined = undefined;
	// A flag to make sure the HostContext node isn’t stepped through multiple
	// times without a yield. It is set to true when the [Symbol.iterator] is
	// iterated, and set to false when the intrinsic returns or yields.
	private iterating = false;
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
		this.prepare();
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
		} else if (!this.finished) {
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

class ComponentNode<T, TProps> extends ParentNode<T> {
	readonly tag: Component<TProps>;
	readonly key: Key;
	readonly parent: ParentNode<T>;
	readonly renderer: Renderer<T>;
	readonly ctx: Context<TProps>;
	private iterator: ChildIterator | undefined = undefined;
	// A flag to make sure the Context isn’t stepped through multiple times
	// without a yield. It is set to true when the [Symbol.iterator] or
	// [Symbol.asyncIterator] is iterated, and set to false when the component
	// returns or yields.
	private iterating = false;
	// A flag to make sure we aren’t stepping through generators multiple times
	// synchronously. This can happen if a generator component yields some
	// children, those children dispatch an event, and the currently yielding
	// node listens to the event and dispatches another event. We simply fail
	// silently when this occurs, though we may in the future log a warning.
	private stepping = false;
	// A flag used by the [Symbol.asyncIterator] method of component nodes to
	// indicate when props are available. this.publish is the resolve function of
	// the promise which resolves when props are made available.
	// TODO: maybe we can use the existence/absence of this.publish instead of
	// boolean flag.
	private available = false;
	private publish: ((props: TProps) => unknown) | undefined = undefined;
	private componentType: ComponentType | undefined = undefined;
	// TODO: explain these properties
	private inflightPending: MaybePromise<undefined> = undefined;
	private enqueuedPending: MaybePromise<undefined> = undefined;
	private inflightResult: MaybePromise<undefined> = undefined;
	private enqueuedResult: MaybePromise<undefined> = undefined;
	private previousResult: MaybePromise<undefined> = undefined;
	private provisions: Map<unknown, any> | undefined = undefined;
	constructor(
		parent: ParentNode<T>,
		renderer: Renderer<T>,
		tag: Component,
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
						this.previousResult = result.catch(() => undefined); // void :(
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
		this.prepare();
		this.ctx.setDelegates(this.childValues);
		this.value =
			this.childValues.length > 1 ? this.childValues : this.childValues[0];
		if (!this.updating) {
			this.parent.commit();
		}

		this.updating = false;
		return; // void :(
	}

	unmount(): MaybePromise<undefined> {
		if (this.unmounted) {
			return;
		}

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

		this.updating = false;
		this.unmounted = true;
		this.ctx.clearEventListeners();
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
				// TODO: get rid of this instanceof
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
		return new HostNode(parent, renderer, child.tag, child.key);
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

	get propsDirty(): boolean {
		return hostNodes.get(this)!.updating;
	}
}

export interface ProvisionMap {}

const componentNodes = new WeakMap<Context<any>, ComponentNode<any, any>>();
export class Context<TProps = any> extends CrankEventTarget {
	constructor(host: ComponentNode<any, TProps>, parent?: Context<TProps>) {
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

	[Symbol.iterator](): Generator<TProps> {
		return componentNodes.get(this)![Symbol.iterator]();
	}

	[Symbol.asyncIterator](): AsyncGenerator<TProps> {
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
	[Default]?(tag: string): Intrinsic<T>;
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
		this.extend(env);
	}

	extend(env?: Environment<T>): void {
		if (env !== undefined) {
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
	}

	render(children: Children, root?: object): MaybePromise<T> {
		const child: Child = isNonStringIterable(children)
			? createElement(Fragment, null, children)
			: children;
		const portal: Element<Portal> =
			isElement(child) && child.tag === Portal
				? child
				: createElement(Portal, {root}, child);

		let rootNode: HostNode<T> | undefined =
			root != null ? this.cache.get(root) : undefined;

		if (rootNode === undefined) {
			rootNode = new HostNode(undefined, this, portal.tag);
			if (root !== undefined && child != null) {
				this.cache.set(root, rootNode);
			}
		} else if (root != null && child == null) {
			this.cache.delete(root);
		}

		return Pledge.resolve(rootNode.update(portal.props))
			.then(() => {
				if (portal.props.root == null) {
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
			return this.env[Default]!(tag);
		}

		throw new Error(`Unknown tag: ${tag.toString()}`);
	}

	text(text: string): string {
		if (this.env[Text] !== undefined) {
			return this.env[Text]!(text);
		}

		return text;
	}
}
