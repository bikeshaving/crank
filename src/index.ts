import {CrankEventTarget, isEventTarget} from "./events";
import {
	isIteratorOrAsyncIterator,
	isNonStringIterable,
	isPromiseLike,
	MaybePromise,
	MaybePromiseLike,
	upgradePromiseLike,
} from "./utils";

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
	this: HostNode<T>,
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
	let key;
	if (props1["crank-key"] != null) {
		key = props1["crank-key"];
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
	} else if (isNonStringIterable(children)) {
		for (const child of children) {
			if (isNonStringIterable(child)) {
				yield createElement(Fragment, null, child);
			} else {
				yield normalize(child);
			}
		}

		return;
	}

	yield normalize(children);
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
	dirty: boolean;
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
	dirty = true;
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
	dirty = true;
	moved = true;
	copied = false;
	dirtyStart: number | undefined = undefined;
	dirtyEnd: number | undefined = undefined;
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
	// A flag which means that the parent has updated the current node. It is set
	// to false once the node has committed, and if this.updating is not true
	// when the node is refreshing or committing, this means that the work was
	// initiated by the current node or its descendants.
	protected updating = false;
	// A flag which means the current node can be blown away.
	protected fragile = false;
	// A flag which means the current node is unmounted.
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

	update(props: any): MaybePromise<undefined> {
		this.props = props;
		this.updating = true;
		return this.updateChildren(this.props && this.props.children);
	}

	// TODO: reduce duplication and complexity of this method :P
	protected updateChildren(children: Children): MaybePromise<undefined> {
		let result: Promise<undefined> | undefined;
		let newKeyedChildren: Map<unknown, Node<T>> | undefined;
		let node = this.firstChild;
		let nextSibling = node && node.nextSibling;
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

			if (tag === Copy) {
				if (key === undefined) {
					if (node !== undefined && node.internal) {
						node.copied = true;
					}

					node = nextSibling;
					nextSibling = node && node.nextSibling;
				} else {
					// TODO: deduplicate logic with keyed node logic below
					const keyedNode = this.keyedChildren && this.keyedChildren.get(key);
					if (keyedNode !== undefined) {
						(keyedNode as ParentNode<T>).copied = true;
						while (
							node !== undefined &&
							node.key !== undefined &&
							node !== keyedNode
						) {
							node = nextSibling;
							nextSibling = node && node.nextSibling;
						}

						if (node !== keyedNode) {
							(keyedNode as ParentNode<T>).moved = true;
							this.removeChild(keyedNode);
						}

						if (node === undefined) {
							this.appendChild(keyedNode);
						} else if (node !== keyedNode) {
							this.insertBefore(keyedNode, node);
						}

						if (newKeyedChildren === undefined) {
							newKeyedChildren = new Map();
						}

						this.keyedChildren!.delete(key);
						newKeyedChildren.set(key, keyedNode);
						node = keyedNode.nextSibling;
						nextSibling = node && node.nextSibling;
					}
				}
			} else {
				if (key !== undefined) {
					let keyedNode = this.keyedChildren && this.keyedChildren.get(key);
					if (keyedNode === undefined) {
						keyedNode = createNode(this, this.renderer, child);
					} else {
						while (
							node !== undefined &&
							node.key !== undefined &&
							node !== keyedNode
						) {
							node = nextSibling;
							nextSibling = node && node.nextSibling;
						}

						if (node !== keyedNode) {
							(keyedNode as ParentNode<T>).moved = true;
							this.removeChild(keyedNode);
						}

						this.keyedChildren!.delete(key);
					}

					if (node === undefined) {
						this.appendChild(keyedNode);
					} else if (node !== keyedNode) {
						this.insertBefore(keyedNode, node);
					}

					if (newKeyedChildren === undefined) {
						newKeyedChildren = new Map();
					}

					newKeyedChildren.set(key, keyedNode);
					node = keyedNode;
					nextSibling = node.nextSibling;
				} else if (node === undefined) {
					// the current node has no more children
					node = createNode(this, this.renderer, child);
					this.appendChild(node);
				} else if (node.key !== undefined) {
					// the current node is keyed but the child is not
					while (node !== undefined && node.key !== undefined) {
						node = nextSibling;
						nextSibling = node && node.nextSibling;
					}

					if (node === undefined) {
						node = createNode(this, this.renderer, child);
						this.appendChild(node);
					}
				}

				if (node.tag === tag && !(node.internal && node.fragile)) {
					if (node.internal) {
						const result1 = node.update((child as Element).props);
						if (result1 !== undefined) {
							result =
								result === undefined ? result1 : result.then(() => result1);
						}
					} else if (typeof child === "string") {
						const text = this.renderer.text(child);
						node.dirty = node.value !== text;
						node.value = text;
					} else {
						node.dirty = node.value !== undefined;
						node.value = undefined;
					}
				} else {
					const newNode = createNode(this, this.renderer, child);
					newNode.clock = node.clock++;
					let result1: Promise<undefined> | undefined;
					if (newNode.internal) {
						result1 = newNode.update((child as Element).props);
					} else if (typeof child === "string") {
						newNode.value = this.renderer.text(child);
					} else {
						newNode.value = undefined;
					}

					if (result1 === undefined) {
						if (node.internal) {
							node.unmount();
						}

						this.replaceChild(newNode, node);
						node.replacedBy = newNode;
					} else {
						if (node.internal) {
							// we mark the current node as fragile so that it can be replaced
							// by future updates even if tags/keys match
							node.fragile = true;
						}

						// The node variable is reassigned so we need to capture its
						// current value in node1 for the sake of the callback’s closure.
						const node1 = node;
						result1 = result1.then(() => {
							if (node1.replacedBy === undefined) {
								this.replaceChild(newNode, node1);
								node1.replacedBy = newNode;

								if (node1.internal) {
									node1.unmount();
								}
							} else if (
								node1.replacedBy.replacedBy === undefined &&
								node1.replacedBy.clock < newNode.clock
							) {
								this.replaceChild(newNode, node1.replacedBy);
								node1.replacedBy = newNode;

								if (node1.internal) {
									node1.unmount();
								}
							}

							return undefined; // void :(
						});

						result =
							result === undefined ? result1 : result.then(() => result1);
					}
				}

				node = nextSibling;
				nextSibling = node && node.nextSibling;
			}
		}

		// unmount excess children
		for (
			;
			node !== undefined;
			node = nextSibling, nextSibling = node && node.nextSibling
		) {
			if (node.key === undefined) {
				if (node.internal) {
					node.unmount();
				}

				this.removeChild(node);
			}
		}

		// unmount excess keyed children
		// TODO: this is likely where the logic for asynchronous unmounting would go
		if (this.keyedChildren !== undefined) {
			for (const node of this.keyedChildren.values()) {
				if (node.internal) {
					node.unmount();
				}

				this.removeChild(node);
			}
		}

		this.keyedChildren = newKeyedChildren;

		if (this.onNewResult !== undefined) {
			this.onNewResult(result);
			this.onNewResult = undefined;
		}

		if (result !== undefined) {
			const newResult = new Promise<undefined>(
				(resolve) => (this.onNewResult = resolve),
			);

			return Promise.race([result, newResult]);
		}
	}

	abstract commit(requester?: ParentNode<T>): MaybePromise<undefined>;

	protected commitChildren(requester?: ParentNode<T>): Array<T | string> {
		// optimizations for a single child
		if (this.firstChild !== undefined && this.firstChild === this.lastChild) {
			// requester should equal the firstChild
			const child = this.firstChild;
			if (child.internal) {
				if (requester === undefined && !child.copied) {
					child.commit();
				}

				this.dirty = true;
				this.dirtyStart = child.dirtyStart;
				this.dirtyEnd = child.dirtyEnd;
				child.copied = false;
				child.dirty = false;
				child.moved = false;
				child.dirtyStart = undefined;
				child.dirtyEnd = undefined;
			} else {
				this.dirty = child.dirty;
				child.dirty = false;
			}

			if (child.value === undefined) {
				return [];
			} else if (Array.isArray(child.value)) {
				return child.value;
			}

			return [child.value];
		}

		let buffer: string | undefined;
		let childValues: Array<T | string> = [];
		let oldLength = 0;
		let dirtyEnd = Infinity;
		let dirtyEndExact = false;
		for (
			let child = this.firstChild;
			child !== undefined;
			child = child.nextSibling
		) {
			// TODO: come up with a better algorithm if a requester is passed in
			if (requester === undefined && child.internal && !child.copied) {
				child.commit();
			}

			const childDirty = child.dirty || (child.internal && child.moved);
			if (childDirty && !this.dirty) {
				if (child.internal && !child.moved && child.dirtyStart !== undefined) {
					this.dirtyStart = childValues.length + child.dirtyStart;
				} else {
					for (let i = childValues.length - 1; i >= 0; i--) {
						if (typeof childValues[i] !== "string") {
							this.dirtyStart = i;
							break;
						}
					}
				}

				this.dirty = true;
			}

			if (typeof child.value === "string") {
				buffer = buffer === undefined ? child.value : buffer + child.value;
			} else if (child.tag !== Portal) {
				if (buffer !== undefined) {
					childValues.push(buffer);
					buffer = undefined;
				}

				if (Array.isArray(child.value)) {
					childValues = childValues.concat(child.value);
				} else if (child.value !== undefined) {
					childValues.push(child.value);
				}
			}

			if (childDirty) {
				if (child.internal && !child.moved && child.dirtyEnd !== undefined) {
					dirtyEnd = oldLength + child.dirtyEnd;
					dirtyEndExact = true;
				} else {
					dirtyEnd = childValues.length;
					dirtyEndExact = false;
				}
			}

			child.dirty = false;
			if (child.internal) {
				child.copied = false;
				child.moved = false;
				child.dirtyStart = undefined;
				child.dirtyEnd = undefined;
			}

			oldLength = childValues.length;
		}

		if (buffer !== undefined) {
			childValues.push(buffer);
		}

		if (dirtyEndExact) {
			this.dirtyEnd = dirtyEnd;
		} else {
			for (; dirtyEnd < childValues.length; dirtyEnd++) {
				if (typeof childValues[dirtyEnd] !== "string") {
					this.dirtyEnd = dirtyEnd;
					break;
				}
			}
		}

		return childValues;
	}

	// dirty is a boolean flag to indicate whether the unmount is part of a
	// parent host node being removed. This is passed down so that renderers do
	// not have to remove children which have already been removed higher up in
	// the DOM
	abstract unmount(dirty?: boolean): MaybePromise<undefined>;

	protected unmountChildren(dirty: boolean): void {
		for (
			let node = this.firstChild;
			node !== undefined;
			node = node.nextSibling
		) {
			if (node.internal) {
				node.unmount(dirty);
			}
		}
	}

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

	commit(requester?: ParentNode<T>): undefined {
		const childValues = this.commitChildren(requester);
		this.value = childValues.length > 1 ? childValues : childValues[0];
		if (requester !== undefined) {
			this.parent.commit(requester);
		}

		this.updating = false;
		return; // void :(
	}

	unmount(dirty = true): undefined {
		if (this.unmounted) {
			return;
		}

		this.unmounted = true;
		this.unmountChildren(dirty);
	}
}

class HostNode<T> extends ParentNode<T> {
	readonly tag: string | symbol;
	readonly key: Key;
	readonly parent: ParentNode<T> | undefined;
	readonly renderer: Renderer<T>;
	value: T | undefined;
	private readonly intrinsic: Intrinsic<T>;
	private iterator: Iterator<T> | undefined = undefined;
	// A flag to make sure the HostContext isn’t iterated multiple times without a yield.
	private iterating = false;
	// A flag which indicates that this node’s iterator has returned, as in, it
	// produced an iteration whose done property is set to true.
	private finished = false;
	private childValues: Array<T | string> = [];
	dirtyProps = true;
	dirtyChildren = true;
	dirtyRemoval = true;
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
	}

	commit(requester?: ParentNode<T>): MaybePromise<undefined> {
		this.childValues = this.commitChildren(requester);
		this.dirtyProps = requester === undefined;
		this.dirtyChildren = this.dirty;
		this.updating = false;
		return this.commitSelf();
	}

	commitSelf(): MaybePromise<undefined> {
		if (this.iterator === undefined) {
			let value: Iterator<T> | T;
			try {
				value = this.intrinsic.call(this, {
					...this.props,
					children: this.childValues,
				});
			} catch (err) {
				if (this.parent === undefined) {
					throw err;
				}

				return this.parent.catch(err);
			}

			if (isIteratorOrAsyncIterator(value)) {
				this.iterator = value;
			} else {
				this.dirty = this.value !== value;
				this.value = value;
				return;
			}
		}

		let iteration: IteratorResult<T>;
		try {
			iteration = this.iterator.next();
		} catch (err) {
			if (this.parent === undefined) {
				throw err;
			}

			return this.parent.catch(err);
		}

		this.dirty = this.value !== iteration.value;
		this.value = iteration.value;
		this.iterating = false;
		if (iteration.done) {
			this.finished = true;
		}
	}

	unmount(dirty = true): MaybePromise<undefined> {
		if (this.unmounted) {
			return;
		} else if (!this.finished) {
			this.dirtyRemoval = dirty;
			if (this.iterator !== undefined && this.iterator.return) {
				try {
					this.iterator.return();
				} catch (err) {
					if (this.parent === undefined) {
						throw err;
					}

					return this.parent.catch(err);
				}
			}

			this.finished = true;
		}

		this.unmounted = true;
		this.unmountChildren(this.tag === Portal);
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

export type HostContext = HostNode<any>;

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
	protected props: TProps | undefined = undefined;
	readonly parent: ParentNode<T>;
	readonly renderer: Renderer<T>;
	readonly ctx: Context<TProps>;
	private iterator: ChildIterator | undefined = undefined;
	// A flag to make sure the Context isn’t iterated multiple times without a yield.
	private iterating = false;
	// A flag which indicates that this node’s iterator has returned, as in, it
	// produced an iteration whose done property is set to true.
	private finished = false;
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
	private oldResult: MaybePromise<undefined> = undefined;
	private componentType: ComponentType | undefined = undefined;
	// TODO: explain these properties
	private inflightPending: MaybePromise<undefined> = undefined;
	private enqueuedPending: MaybePromise<undefined> = undefined;
	private inflightResult: MaybePromise<undefined> = undefined;
	private enqueuedResult: MaybePromise<undefined> = undefined;
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

		const result = this.run();
		if (result === undefined) {
			this.commit();
			return;
		}

		return result.then(() => this.commit());
	}

	update(props: TProps): MaybePromise<undefined> {
		this.props = props;
		this.updating = true;

		if (this.publish === undefined) {
			this.available = true;
		} else {
			this.publish(this.props!);
			this.publish = undefined;
		}

		return this.run();
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
		if (this.finished) {
			return [undefined, undefined];
		}

		this.stepping = true;
		if (this.iterator === undefined) {
			this.ctx.clearEventListeners();
			let value: ChildIterator | PromiseLike<Child> | Child;
			try {
				value = this.tag.call(this.ctx, this.props!);
			} catch (err) {
				const caught = this.parent.catch(err);
				return [undefined, caught];
			}

			if (isIteratorOrAsyncIterator(value)) {
				this.iterator = value;
			} else if (isPromiseLike(value)) {
				const value1 = upgradePromiseLike(value);
				this.componentType = AsyncFn;
				const pending = value1.then(
					() => undefined,
					() => undefined,
				); // void :(
				const result = value1.then(
					(child) => this.updateChildren(child),
					(err) => this.parent.catch(err),
				);
				this.stepping = false;
				return [pending, result];
			} else {
				this.componentType = SyncFn;
				const result = this.updateChildren(value);
				this.stepping = false;
				return [undefined, result];
			}
		}

		const oldValue =
			this.oldResult === undefined
				? this.value
				: this.oldResult.then(() => this.value);
		this.oldResult = undefined;
		let iteration: IteratorResult<Child> | Promise<IteratorResult<Child>>;
		try {
			iteration = this.iterator.next(oldValue);
		} catch (err) {
			const caught = this.parent.catch(err);
			return [caught, caught];
		}

		this.stepping = false;
		if (isPromiseLike(iteration)) {
			this.componentType = AsyncGen;
			iteration = iteration.catch((err) => {
				const p = this.parent.catch(err);
				if (p === undefined) {
					return {value: undefined, done: true};
				}

				return p.then(() => ({value: undefined, done: true}));
			});
			const pending = iteration.then(
				() => undefined,
				() => undefined,
			); // void :(
			const result = iteration.then((iteration) => {
				this.iterating = false;
				if (iteration.done) {
					this.finished = true;
				}

				let result = this.updateChildren(iteration.value);
				// TODO: we commit async generator components because there’s a race
				// condition with advance when we don’t commit for some reason
				if (result === undefined) {
					this.commit();
				} else {
					result = result.then(() => this.commit());
				}

				if (isPromiseLike(result)) {
					this.oldResult = result.catch(() => undefined); // void :(
				}

				return result;
			});

			return [pending, result];
		}

		this.iterating = false;
		this.componentType = SyncGen;
		if (iteration.done) {
			this.finished = true;
		}

		const result = this.updateChildren(iteration.value);
		return [result, result];
	}

	private advance(): void {
		this.inflightPending = this.enqueuedPending;
		this.inflightResult = this.enqueuedResult;
		this.enqueuedPending = undefined;
		this.enqueuedResult = undefined;
		if (this.componentType === AsyncGen && !this.finished) {
			this.run()!.catch((err) => {
				// We catch and rethrow the error to trigger an unhandled promise
				// rejection.
				if (!this.updating) {
					throw err;
				}
			});
		}
	}

	commit(requester?: ParentNode<T>): undefined {
		const childValues = this.commitChildren(requester);
		this.value = childValues.length > 1 ? childValues : childValues[0];
		if (isEventTarget(this.value)) {
			this.ctx.setDelegate(this.value);
		} else if (childValues.length > 1) {
			this.ctx.setDelegates(childValues);
		}

		if (!this.updating && this.dirty) {
			this.parent.commit(this);
		}

		this.updating = false;
		return; // void :(
	}

	unmount(dirty = true): MaybePromise<undefined> {
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
				let iteration: IteratorResult<Child> | Promise<IteratorResult<Child>>;
				try {
					iteration = this.iterator.return();
				} catch (err) {
					return this.parent.catch(err);
				}

				if (isPromiseLike(iteration)) {
					return iteration.then(
						() => void this.unmountChildren(dirty), // void :(
						(err) => this.parent.catch(err),
					);
				}
			}

			this.unmountChildren(dirty);
		}
	}

	catch(reason: any): MaybePromise<undefined> {
		if (
			this.iterator === undefined ||
			this.iterator.throw === undefined ||
			this.finished
		) {
			return super.catch(reason);
		}

		// helps avoid deadlocks
		if (this.publish !== undefined) {
			this.publish(this.props!);
			this.publish = undefined;
		}

		let iteration: IteratorResult<Child> | Promise<IteratorResult<Child>>;
		try {
			iteration = this.iterator.throw(reason);
		} catch (err) {
			return this.parent.catch(err);
		}

		if (isPromiseLike(iteration)) {
			const result = iteration.then(
				(iteration) => {
					if (iteration.done) {
						this.finished = true;
					}

					return this.updateChildren(iteration.value);
				},
				(err) => this.parent.catch(err),
			);

			return result;
		}

		if (iteration.done) {
			this.finished = true;
		}

		return this.updateChildren(iteration.value);
	}

	get(name: unknown): any {
		for (
			let parent: ParentNode<T> | undefined = this.parent;
			parent !== undefined;
			parent = parent.parent
		) {
			if (
				// TODO: get rid of this instanceof
				parent instanceof ComponentNode &&
				parent.provisions !== undefined &&
				parent.provisions.has(name)
			) {
				return parent.provisions.get(name);
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
	private defaultIntrinsics: Record<string, Intrinsic<T>> = {};
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

		const result = rootNode.update(portal.props);
		if (isPromiseLike(result)) {
			return result.then(() => {
				rootNode!.commit();
				if (portal.props.root == null) {
					rootNode!.unmount();
				}

				return rootNode!.value!;
			});
		}

		rootNode.commit();
		if (portal.props.root == null) {
			rootNode.unmount();
		}

		return rootNode.value!;
	}

	// TODO: Ideally, the intrinsic and text methods should not be exposed
	// outside this module
	intrinsic(tag: string | symbol): Intrinsic<T> {
		if (this.env[tag as any]) {
			return this.env[tag as any];
		} else if (typeof tag === "string") {
			if (this.defaultIntrinsics[tag] !== undefined) {
				return this.defaultIntrinsics[tag];
			}

			const intrinsic = this.env[Default]!(tag);
			this.defaultIntrinsics[tag] = intrinsic;
			return intrinsic;
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
