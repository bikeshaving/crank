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

// TODO: do we have to add children, crank-key, crank-ref props here?
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
	"crank-ref"?: Function;
	children?: Children;
}

export interface IntrinsicProps<T> {
	children: Array<T | string>;
	[name: string]: any;
}

const ElementSigil: unique symbol = Symbol.for("crank.ElementSigil");

export interface Element<TTag extends Tag = Tag> {
	__sigil__: typeof ElementSigil;
	readonly tag: TTag;
	readonly key: unknown;
	readonly ref: Function | undefined;
	props: TagProps<TTag>;
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
	return value != null && value.__sigil__ === ElementSigil;
}

export function createElement<TTag extends Tag>(
	tag: TTag,
	props?: TagProps<TTag> | null,
	...children: Array<unknown>
): Element<TTag>;
export function createElement<TTag extends Tag>(
	tag: TTag,
	props?: TagProps<TTag> | null,
	children?: unknown,
): Element<TTag> {
	const props1: any = {};
	let key: unknown;
	let ref: Function | undefined;
	if (props != null) {
		if (props["crank-key"] != null) {
			key = props["crank-key"];
		}

		if (typeof props["crank-ref"] === "function") {
			ref = props["crank-ref"];
		}

		for (const key in props) {
			if (key !== "crank-key" && key !== "crank-ref") {
				props1[key] = props[key];
			}
		}
	}

	let length = arguments.length;
	if (length > 3) {
		const children1: Array<unknown> = [];
		while (length-- > 2) {
			children1[length - 2] = arguments[length];
		}

		props1.children = children1;
	} else if (length > 2) {
		props1.children = children;
	}

	return {__sigil__: ElementSigil, tag, props: props1, key, ref};
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

// this class is a planned optimization where we replace all nodes (elements?)
// with a single type
export class Node1<T> {
	flags = 0;
	// TODO: replace boolean properties with a bitmask
	// dirty = true;
	// // dirty flags
	// dirtyProps = true;
	// dirtyChildren = true;
	// dirtyRemoval = false;
	// // whether the node was moved
	// moved = true;
	// // true if the current node was copied from the previous render
	// copied = false;
	// // true if the update was requested by the parent
	// updating = false;
	// // true if the component context has pulled a value from props
	// iterating = false;
	// // true if the iterator related to the current component is currently executing
	// stepping = false;
	// // true if the iterator has returned
	// finished = false;
	// // TODO: can this be inferred by existence absence of onProps
	// // whether the async generator can yield a value immediately
	// available = true;
	// // whether or not the component is unmounted
	// unmounted = false;
	// // this should probably be a flag
	// componentType: ComponentType | undefined;
	// regular props
	element: Element;
	// TODO: can we remove the renderer reference from nodes
	renderer: Renderer<T>;
	// TODO: can we remove this reference somehow???:
	parent: Node1<T> | undefined;
	value: Array<T | string> | T | string | undefined;
	ctx: Context<T> | undefined;
	children:
		| Array<Node1<T> | string | undefined>
		| Node1<T>
		| string
		| undefined;
	keyedChildren: Map<unknown, Node1<T>> | undefined;
	scope: unknown;
	// host node related
	dirtyStart: number | undefined;
	dirtyEnd: number | undefined;
	intrinsic: Intrinsic<T> | undefined;
	hostIterator: Iterator<T> | undefined;
	// component node related
	childIterator: ChildIterator | undefined;
	// promise related props
	onNewResult: ((result?: Promise<undefined>) => unknown) | undefined;
	// component promise related props
	oldResult: Promise<undefined> | undefined;
	inflightPending: Promise<undefined> | undefined;
	enqueuedPending: Promise<undefined> | undefined;
	inflightResult: Promise<undefined> | undefined;
	enqueuedResult: Promise<undefined> | undefined;
	onProps: ((props: any) => unknown) | undefined;
	provisions: Map<unknown, any> | undefined;
	constructor(element: Element, renderer: Renderer<T>, parent?: Node1<T>) {
		this.element = element;
		this.renderer = renderer;
		this.parent = parent;
		this.children = [];
	}
}

// TODO: planned functions for the big refactor
// create
// TODO: part of me thinks we should rename update. maybe render?
// update
// updateSelf (component node only, run/step)
// updateChildren
// TODO: does separating update and commit actually make things faster?
// commit
// commitSelf (host node only)
// commitChildren
// unmount
// unmountChildren
// catch
// catchSelf (component node only)

abstract class ParentNode<T> {
	// flags
	dirty = true;
	moved = true;
	copied = false;
	// A flag which means that the parent has updated the current node. It is set
	// to false once the node has committed, and if this.updating is not true
	// when the node is refreshing or committing, this means that the work was
	// initiated by the current node or its descendants.
	// TODO: with the addition of passing a requester to parents when we want them to commit, maybe we shouldn’t have this flag at all
	protected updating = false;
	// A flag which means the current node is unmounted.
	protected unmounted = false;
	abstract readonly tag: Tag;
	readonly key: Key = undefined;
	value: Array<T | string> | T | string | undefined = undefined;
	ref: Function | undefined = undefined;
	dirtyStart: number | undefined = undefined;
	abstract parent: ParentNode<T> | undefined;
	// TODO: implement dirtyEnd
	private children: Array<ParentNode<T> | string | undefined> = [];
	private keyedChildren: Map<unknown, ParentNode<T>> | undefined = undefined;
	abstract readonly renderer: Renderer<T>;
	// When children update asynchronously, we race their result against the next
	// update of children. The onNewResult property is set to the resolve
	// function of the promise which the current update is raced against.
	private onNewResult: ((result?: Promise<undefined>) => unknown) | undefined;
	protected props: any;
	ctx: Context | undefined = undefined;
	scope: unknown = undefined;
	childScope: unknown = undefined;
	update(props: any, ref?: Function): MaybePromise<undefined> {
		this.props = props;
		this.ref = ref;
		this.updating = true;
		return this.updateChildren(this.props && this.props.children);
	}

	// TODO: this is a propery that exists bcause of the rare edge case where a
	// child throws and triggers another updateChildren on this node, but that
	// updateChildren returns earlier than the currently executing
	// updateChildren. Figure out a way to not need it.
	private clock = 0;

	// TODO: reduce duplication and complexity of this method :P
	protected updateChildren(children: Children): MaybePromise<undefined> {
		const clock = this.clock++;
		let result: Promise<undefined> | undefined;
		let newChildren: Array<ParentNode<T> | string | undefined> = [];
		let keyedChildren: Map<unknown, ParentNode<T>> | undefined;
		// TODO: split this algorithm into two stages.
		// Stage 1: Alignment
		// Stage 2: Updating
		let i = 0;
		for (const child of flatten(children)) {
			let node = this.children[i];
			// Alignment
			const tag: Tag | undefined =
				typeof child === "object" ? child.tag : undefined;
			let key: unknown = typeof child === "object" ? child.key : undefined;
			if (
				key !== undefined &&
				keyedChildren !== undefined &&
				keyedChildren.has(key)
			) {
				// TODO: warn about a key collision
				key = undefined;
			}

			if (node === undefined) {
				if (key === undefined) {
					if (tag === Copy) {
						newChildren.push(undefined);
						continue;
					}

					if (typeof child === "object") {
						node = createNode(child, this.renderer, this);
					} else {
						node = child;
					}
				} else {
					node = this.keyedChildren && this.keyedChildren.get(key);
					if (node === undefined) {
						if (tag === Copy) {
							newChildren.push(undefined);
							continue;
						}

						node = createNode(child as Element, this.renderer, this);
					} else {
						this.keyedChildren!.delete(key);
						node.moved = true;
					}
				}
			} else if (key !== undefined) {
				let keyedNode = this.keyedChildren && this.keyedChildren.get(key);
				if (keyedNode === undefined) {
					if (tag === Copy) {
						newChildren.push(undefined);
						continue;
					}

					keyedNode = createNode(child as Element, this.renderer, this);
					i--;
				} else {
					this.keyedChildren!.delete(key);
					if (node !== keyedNode) {
						keyedNode.moved = true;
						i--;
					}
				}

				node = keyedNode;
			} else if (typeof node === "object" && node.key !== undefined) {
				while (typeof node === "object" && node.key !== undefined) {
					node = this.children[++i];
				}

				if (node === undefined) {
					if (tag === Copy) {
						newChildren.push(undefined);
						continue;
					} else if (typeof child === "object") {
						node = createNode(child, this.renderer, this);
					} else {
						node = child;
					}
				}
			}

			// Updating
			if (tag === Copy) {
				if (typeof node === "object") {
					node.copied = true;
				}
				// TODO: forgive me Anders for I have sinned.
			} else if (((node as any) || ({} as any)).tag === tag) {
				if (typeof node === "object") {
					const result1 = node.update(
						(child as Element).props,
						(child as Element).ref,
					);
					if (result1 !== undefined) {
						result =
							result === undefined ? result1 : result.then(() => result1);
					}
				} else if (typeof child === "string") {
					const text = this.renderer.text(child);
					node = text;
				} else {
					node = undefined;
				}
			} else {
				// replace current node
				let result1: Promise<undefined> | undefined;
				let newNode: ParentNode<T> | string | undefined;
				if (typeof child === "object") {
					newNode = createNode(child, this.renderer, this);
					result1 = newNode.update(
						(child as Element).props,
						(child as Element).ref,
					);
				} else if (typeof child === "string") {
					newNode = this.renderer.text(child);
				} else {
					newNode = undefined;
				}

				if (result1 === undefined) {
					if (typeof node === "object") {
						node.unmount();
					}
				} else {
					const node1 = node;
					if (typeof node1 === "object") {
						(newNode as ParentNode<T>).value = node1.value;
						node1.schedule((value: any) => {
							(newNode as ParentNode<T>).value = value;
						});
					} else {
						(newNode as ParentNode<T>).value = node1;
					}

					result1 = result1.then(() => {
						if (typeof node1 === "object") {
							node1.unmount();
						}

						return undefined; // void :(
					});

					result = result === undefined ? result1 : result.then(() => result1);
				}

				node = newNode;
			}

			if (key !== undefined) {
				if (keyedChildren === undefined) {
					keyedChildren = new Map();
				}

				keyedChildren.set(key, node as ParentNode<T>);
			}

			newChildren.push(node);
			i++;
		}

		if (this.clock !== clock + 1) {
			return;
		}

		for (; i < this.children.length; i++) {
			const node = this.children[i];
			if (typeof node === "object" && node.key === undefined) {
				node.unmount();
			}
		}

		// unmount excess keyed children
		// TODO: this is likely where the logic for asynchronous unmounting would go
		if (this.keyedChildren !== undefined) {
			for (const node of this.keyedChildren.values()) {
				node.unmount();
			}
		}

		this.children = newChildren;
		this.keyedChildren = keyedChildren;

		if (this.onNewResult !== undefined) {
			this.onNewResult(result);
			this.onNewResult = undefined;
		}

		if (result !== undefined) {
			result = result.then(() => this.commit());
			const newResult = new Promise<undefined>(
				(resolve) => (this.onNewResult = resolve),
			);

			return Promise.race([result, newResult]);
		}

		this.commit();
	}

	abstract commit(): MaybePromise<undefined>;

	// TODO: this is an inaccurate name for what this method does but changing it
	// will make rebases harder
	protected commitChildren(): Array<T | string> {
		let buffer: string | undefined;
		let childValues: Array<T | string> = [];
		let oldLength = 0;
		for (const child of this.children) {
			if (typeof child === "object" && child.tag === Portal) {
				continue;
			}

			const value = typeof child === "object" ? child.value : child;
			if (typeof value === "string") {
				buffer = buffer === undefined ? value : buffer + value;
			} else {
				if (buffer !== undefined) {
					childValues.push(buffer);
					buffer = undefined;
				}

				if (Array.isArray(value)) {
					childValues = childValues.concat(value);
				} else if (value !== undefined) {
					childValues.push(value);
				}
			}

			if (typeof child !== "object" || child.dirty || child.moved) {
				if (!this.dirty) {
					if (
						typeof child === "object" &&
						!child.moved &&
						child.dirtyStart !== undefined
					) {
						this.dirtyStart = oldLength + child.dirtyStart;
					} else {
						for (
							let dirtyStart = oldLength - 1;
							dirtyStart >= 0;
							dirtyStart--
						) {
							if (typeof childValues[dirtyStart] !== "string") {
								this.dirtyStart = dirtyStart;
								break;
							}
						}
					}

					this.dirty = true;
				}
			}

			if (typeof child === "object") {
				child.dirty = false;
				child.copied = false;
				child.moved = false;
				child.dirtyStart = undefined;
			}

			oldLength = childValues.length;
		}

		if (buffer !== undefined) {
			childValues.push(buffer);
		}

		if (childValues.length === 0) {
			this.dirty = true;
		}

		return childValues;
	}

	// TODO: better name for dirty flag
	// dirty is a boolean flag to indicate whether the unmount is part of a
	// parent host node being removed. This is passed down so that renderers do
	// not have to remove children which have already been removed higher up in
	// the tree.
	abstract unmount(dirty?: boolean): MaybePromise<undefined>;

	protected unmountChildren(dirty: boolean): void {
		for (const child of this.children) {
			if (typeof child === "object") {
				child.unmount(dirty);
			}
		}
	}

	catch(reason: any): MaybePromise<undefined> {
		if (this.parent === undefined) {
			throw reason;
		}

		return this.parent.catch(reason);
	}

	protected schedules: Set<(value: unknown) => unknown> | undefined;
	schedule(callback: (value: unknown) => unknown): void {
		if (this.schedules === undefined) {
			this.schedules = new Set();
		}

		this.schedules.add(callback);
	}
}

class FragmentNode<T> extends ParentNode<T> {
	readonly tag: Fragment = Fragment;
	readonly key: Key;
	readonly parent: ParentNode<T>;
	readonly renderer: Renderer<T>;
	constructor(
		tag: Fragment,
		props: null,
		renderer: Renderer<T>,
		parent: ParentNode<T>,
		key: unknown,
	) {
		super();
		this.key = key;
		this.parent = parent;
		this.renderer = renderer;
		this.ctx = parent.ctx;
		this.scope = parent.childScope;
	}

	commit(): undefined {
		const childValues = this.commitChildren();
		this.value = childValues.length > 1 ? childValues : childValues[0];
		if (this.schedules !== undefined && this.schedules.size > 0) {
			// We have to clear the schedules set before calling each callback,
			// because otherwise a callback which refreshes the component would cause
			// a stack overflow.
			const callbacks = Array.from(this.schedules);
			this.schedules.clear();
			for (const callback of callbacks) {
				callback(this.value);
			}
		}

		if (this.ref !== undefined) {
			this.ref(this.value);
		}

		if (!this.updating && this.dirty) {
			this.parent.commit();
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
	// flags
	dirtyProps = true;
	dirtyChildren = true;
	dirtyRemoval = true;
	// A flag to make sure the HostContext isn’t iterated multiple times without a yield.
	private iterating = false;
	// A flag which indicates that this node’s iterator has returned, as in, it
	// produced an iteration whose done property is set to true.
	private finished = false;
	readonly tag: string | symbol;
	readonly key: Key;
	readonly parent: ParentNode<T> | undefined;
	readonly renderer: Renderer<T>;
	value: T | undefined = undefined;
	private readonly intrinsic: Intrinsic<T>;
	private iterator: Iterator<T> | undefined = undefined;
	private childValues: Array<T | string> = [];
	constructor(
		tag: string | symbol,
		props: any,
		renderer: Renderer<T>,
		parent: ParentNode<T> | undefined,
		key: unknown,
	) {
		super();
		this.tag = tag;
		this.key = key;
		this.parent = parent;
		this.renderer = renderer;
		this.intrinsic = renderer.intrinsic(tag);
		this.ctx = parent && parent.ctx;
		this.scope = parent && parent.childScope;
		this.childScope = renderer.scope(tag, props);
	}

	commit(): MaybePromise<undefined> {
		this.childValues = this.commitChildren();
		this.dirtyProps = this.updating;
		this.dirtyChildren = this.dirty;
		try {
			this.commitSelf();
		} catch (err) {
			if (this.parent === undefined) {
				throw err;
			}

			return this.parent.catch(err);
		}

		if (this.schedules !== undefined && this.schedules.size > 0) {
			// We have to clear the schedules set before calling each callback,
			// because otherwise a callback which refreshes the component would cause
			// a stack overflow.
			const callbacks = Array.from(this.schedules);
			this.schedules.clear();
			for (const callback of callbacks) {
				callback(this.value);
			}
		}

		if (this.ref !== undefined) {
			this.ref(this.value);
		}

		if (!this.updating && this.dirty && this.parent !== undefined) {
			this.parent.commit();
		}

		this.updating = false;
	}

	commitSelf(): void {
		if (this.iterator === undefined) {
			const value = this.intrinsic.call(this, {
				...this.props,
				children: this.childValues,
			});

			if (isIteratorOrAsyncIterator(value)) {
				this.iterator = value;
			} else {
				this.dirty = this.value !== value;
				this.value = value;
				return;
			}
		}

		const iteration = this.iterator.next();
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
	// indicate when props are available. this.onProps is the resolve function of
	// the promise which resolves when props are made available.
	// TODO: maybe we can use the existence/absence of this.onProps instead of
	// boolean flag.
	private available = false;
	readonly tag: Component<TProps>;
	readonly key: Key;
	props: TProps;
	readonly parent: ParentNode<T>;
	readonly renderer: Renderer<T>;
	readonly ctx: Context<TProps>;
	private iterator: ChildIterator | undefined = undefined;
	private oldResult: MaybePromise<undefined> = undefined;
	private componentType: ComponentType | undefined = undefined;
	// TODO: explain these properties
	private inflightPending: MaybePromise<undefined> = undefined;
	private enqueuedPending: MaybePromise<undefined> = undefined;
	private inflightResult: MaybePromise<undefined> = undefined;
	private enqueuedResult: MaybePromise<undefined> = undefined;
	private onProps: ((props: TProps) => unknown) | undefined = undefined;
	private provisions: Map<unknown, any> | undefined = undefined;
	constructor(
		tag: Component,
		props: TProps,
		renderer: Renderer<T>,
		parent: ParentNode<T>,
		key: Key,
	) {
		super();
		this.parent = parent;
		this.renderer = renderer;
		this.tag = tag;
		this.key = key;
		this.props = props;
		this.ctx = new Context(this, parent.ctx);
		this.scope = parent.childScope;
	}

	refresh(): MaybePromise<undefined> {
		if (this.stepping || this.unmounted) {
			// TODO: we may want to log warnings when stuff like this happens
			return;
		}

		if (this.onProps === undefined) {
			this.available = true;
		} else {
			this.onProps(this.props!);
			this.onProps = undefined;
		}

		const result = this.run();
		if (result === undefined) {
			this.commit();
			return;
		}

		return result.then(() => this.commit());
	}

	update(props: TProps, ref?: Function): MaybePromise<undefined> {
		this.props = props;
		this.ref = ref;
		this.updating = true;

		if (this.onProps === undefined) {
			this.available = true;
		} else {
			this.onProps(this.props!);
			this.onProps = undefined;
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

	commit(): undefined {
		const childValues = this.commitChildren();
		this.value = childValues.length > 1 ? childValues : childValues[0];
		if (this.schedules !== undefined && this.schedules.size > 0) {
			// We have to clear the schedules set before calling each callback,
			// because otherwise a callback which refreshes the component would cause
			// a stack overflow.
			const callbacks = Array.from(this.schedules);
			this.schedules.clear();
			for (const callback of callbacks) {
				callback(this.value);
			}
		}

		if (isEventTarget(this.value)) {
			this.ctx.setDelegate(this.value);
		} else if (childValues.length > 1) {
			this.ctx.setDelegates(childValues);
		}

		if (this.ref !== undefined) {
			this.ref(this.value);
		}

		if (!this.updating && this.dirty) {
			this.parent.commit();
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
		if (this.cleanups !== undefined) {
			for (const cleanup of this.cleanups) {
				cleanup(this.value);
			}

			this.cleanups = undefined;
		}

		if (!this.finished) {
			this.finished = true;
			// helps avoid deadlocks
			if (this.onProps !== undefined) {
				this.onProps(this.props!);
				this.onProps = undefined;
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
		if (this.onProps !== undefined) {
			this.onProps(this.props!);
			this.onProps = undefined;
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
					(resolve) => (this.onProps = resolve),
				);
				if (!this.unmounted) {
					yield props;
				}
			}
		} while (!this.unmounted);
	}

	// TODO: all of these will be merged in a single node object just leaving
	// this here for now
	private cleanups: Set<(value: unknown) => unknown> | undefined;
	cleanup(callback: (value: unknown) => unknown): void {
		if (this.cleanups === undefined) {
			this.cleanups = new Set();
		}

		this.cleanups.add(callback);
	}
}

function createNode<T>(
	child: Element,
	renderer: Renderer<T>,
	parent?: ParentNode<T>,
): ParentNode<T> {
	if (child.tag === Fragment) {
		return new FragmentNode(child.tag, null, renderer, parent!, child.key);
	} else if (typeof child.tag === "function") {
		return new ComponentNode(
			child.tag,
			child.props,
			renderer,
			parent!,
			child.key,
		);
	} else {
		return new HostNode(
			//
			child.tag,
			child.props,
			renderer,
			parent,
			child.key,
		);
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

	get props(): TProps {
		return componentNodes.get(this)!.props;
	}

	get value(): unknown {
		return componentNodes.get(this)!.value;
	}

	[Symbol.iterator](): Generator<TProps> {
		return componentNodes.get(this)![Symbol.iterator]();
	}

	[Symbol.asyncIterator](): AsyncGenerator<TProps> {
		return componentNodes.get(this)![Symbol.asyncIterator]();
	}

	refresh(): Promise<undefined> | undefined {
		return componentNodes.get(this)!.refresh();
	}

	schedule(callback: (value: unknown) => unknown): void {
		return componentNodes.get(this)!.schedule(callback);
	}

	cleanup(callback: (value: unknown) => unknown): void {
		return componentNodes.get(this)!.cleanup(callback);
	}
}

export const Default = Symbol.for("crank.Default");

export type Default = typeof Default;

export const Text = Symbol.for("crank.Text");

export type Text = typeof Text;

export const Scopes = Symbol.for("crank.Scopes");

export interface Scoper {
	[Default]?(tag: string | symbol, props: any): unknown;
	[tag: string]: unknown;
}

export interface Environment<T> {
	[Default]?(tag: string | symbol): Intrinsic<T>;
	[Text]?(text: string): string;
	[Scopes]?: Scoper;
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
	private scoper: Scoper = {};
	constructor(env?: Environment<T>) {
		this.extend(env);
	}

	extend(env?: Environment<T>): void {
		if (env == null) {
			return;
		}

		for (const tag of Object.keys(env)) {
			if (env[tag] != null) {
				this.env[tag] = env[tag]!;
			}
		}

		for (const tag of Object.getOwnPropertySymbols(env)) {
			if (env[tag as any] != null && tag !== Scopes) {
				this.env[tag as any] = env[tag as any]!;
			}
		}

		if (env[Scopes] != null) {
			const scoper = env[Scopes]!;
			for (const tag of Object.keys(scoper)) {
				if (scoper[tag] != null) {
					this.scoper[tag] = scoper[tag]!;
				}
			}

			for (const tag of Object.getOwnPropertySymbols(env)) {
				if (scoper[tag as any] != null) {
					this.scoper[tag as any] = scoper[tag as any]!;
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
			rootNode = createNode(portal, this) as HostNode<T>;
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

	// TODO: Ideally, the following methods should not be exposed outside this module
	intrinsic(tag: string | symbol): Intrinsic<T> {
		if (this.env[tag as any]) {
			return this.env[tag as any];
		} else if (this.defaultIntrinsics[tag as any] !== undefined) {
			return this.defaultIntrinsics[tag as any];
		}

		const intrinsic = this.env[Default]!(tag);
		this.defaultIntrinsics[tag as any] = intrinsic;
		return intrinsic;
	}

	scope(tag: string | symbol, props: any): unknown {
		if (tag in this.scoper) {
			if (typeof this.scoper[tag as any] === "function") {
				return (this.scoper[tag as any] as Function)(props);
			}

			return this.scoper[tag as any];
		} else if (typeof this.scoper[Default] === "function") {
			return this.scoper[Default]!(tag, props);
		}
	}

	text(text: string): string {
		if (this.env[Text] !== undefined) {
			return this.env[Text]!(text);
		}

		return text;
	}
}
