import {CrankEventTarget, isEventTarget} from "./events";
import {
	isIteratorOrAsyncIterator,
	isNonStringIterable,
	isPromiseLike,
	MaybePromise,
	MaybePromiseLike,
	upgradePromiseLike,
} from "./utils";
import * as flags from "./flags";
export * as flags from "./flags";

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

export type Intrinsic<T> = (node: HostNode<T>) => Iterator<T> | T;

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
	flags = flags.Initial;
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
	// dirtyStart: number | undefined;
	// dirtyEnd: number | undefined;
	iterator: Iterator<T> | ChildIterator | undefined;
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
	flags = flags.Initial;
	// TODO: reimplement these
	// dirtyStart: number | undefined;
	// dirtyEnd: number | undefined;
	abstract readonly tag: Tag;
	props: any;
	readonly key: Key;
	value: Array<T | string> | T | string | undefined;
	scope: unknown;
	ref: Function | undefined;
	abstract parent: ParentNode<T> | undefined;
	private children:
		| Array<ParentNode<T> | string | undefined>
		| ParentNode<T>
		| string
		| undefined;
	private keyedChildren: Map<unknown, ParentNode<T>> | undefined;
	abstract readonly renderer: Renderer<T>;
	// When children update asynchronously, we race their result against the next
	// update of children. The onNewResult property is set to the resolve
	// function of the promise which the current update is raced against.
	private onNewResult: ((result?: Promise<undefined>) => unknown) | undefined;
	ctx: Context | undefined;
	schedules: Set<(value: unknown) => unknown> | undefined;
	cleanups: Set<(value: unknown) => unknown> | undefined;
	// TODO: this is a propery that exists bcause of the rare edge case where a
	// child throws and triggers another updateChildren on this node, but that
	// updateChildren returns earlier than the currently executing
	// updateChildren. Figure out a way to not need it.
	private clock = 0;
	update(props: any, ref?: Function): MaybePromise<undefined> {
		this.props = props;
		this.ref = ref;
		this.flags |= flags.Updating;
		return this.updateChildren(this.props && this.props.children);
	}

	// TODO: reduce duplication and complexity of this method :P
	protected updateChildren(children: Children): MaybePromise<undefined> {
		// TODO: get rid of this
		const clock = this.clock++;
		let scope: unknown;
		if (typeof this.tag !== "function") {
			scope = this.renderer.scope(this.tag, this.props);
		}

		let result: Promise<undefined> | undefined;
		let newChildren:
			| Array<ParentNode<T> | string | undefined>
			| ParentNode<T>
			| string
			| undefined;
		let keyedChildren: Map<unknown, ParentNode<T>> | undefined;
		// TODO: split this algorithm into two stages.
		// Stage 1: Alignment
		// Stage 2: Updating
		let i = 0;
		for (const child of flatten(children)) {
			// Alignment
			let node: ParentNode<T> | string | undefined;
			if (Array.isArray(this.children)) {
				node = this.children[i];
			} else if (i === 0) {
				node = this.children;
			}

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
						if (newChildren === undefined) {
							newChildren = [undefined];
						} else if (!Array.isArray(newChildren)) {
							newChildren = [newChildren];
						}

						newChildren.push(undefined);
						continue;
					}

					if (typeof child === "object") {
						node = createNode(child, this.renderer, this, scope);
					} else {
						node = child;
					}
				} else {
					node = this.keyedChildren && this.keyedChildren.get(key);
					if (node === undefined) {
						if (tag === Copy) {
							if (newChildren === undefined) {
								newChildren = [undefined];
							} else if (!Array.isArray(newChildren)) {
								newChildren = [newChildren];
							}

							newChildren.push(undefined);
							continue;
						}

						node = createNode(child as Element, this.renderer, this, scope);
					} else {
						this.keyedChildren!.delete(key);
						node.flags |= flags.Moved;
					}
				}
			} else if (key !== undefined) {
				let keyedNode = this.keyedChildren && this.keyedChildren.get(key);
				if (keyedNode === undefined) {
					if (tag === Copy) {
						if (newChildren === undefined) {
							newChildren = [undefined];
						} else if (!Array.isArray(newChildren)) {
							newChildren = [newChildren];
						}

						newChildren.push(undefined);
						continue;
					}

					keyedNode = createNode(child as Element, this.renderer, this, scope);
					i--;
				} else {
					this.keyedChildren!.delete(key);
					if (node !== keyedNode) {
						keyedNode.flags |= flags.Moved;
						i--;
					}
				}

				node = keyedNode;
			} else if (typeof node === "object" && node.key !== undefined) {
				if (Array.isArray(this.children)) {
					while (typeof node === "object" && node.key !== undefined) {
						i++;
						node = this.children[i];
					}
				} else {
					node = undefined;
					i++;
				}

				if (node === undefined) {
					if (tag === Copy) {
						if (newChildren === undefined) {
							newChildren = [undefined];
						} else if (!Array.isArray(newChildren)) {
							newChildren = [newChildren];
						}

						newChildren.push(undefined);
						continue;
					} else if (typeof child === "object") {
						node = createNode(child, this.renderer, this, scope);
					} else {
						node = child;
					}
				}
			}

			// Updating
			if (tag === Copy) {
				// no need to update
				// TODO: forgive me Anders for I have sinned.
			} else if (((node || {}) as any).tag === tag) {
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
					newNode = createNode(child, this.renderer, this, scope);
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

			i++;
			if (newChildren === undefined) {
				newChildren = node;
				continue;
			} else if (!Array.isArray(newChildren)) {
				newChildren = [newChildren];
			}

			newChildren.push(node);
		}

		// TODO: get rid of this check
		if (this.clock !== clock + 1) {
			return;
		}

		if (this.children !== undefined) {
			if (Array.isArray(this.children)) {
				for (; i < this.children.length; i++) {
					const node = this.children[i];
					if (typeof node === "object" && node.key === undefined) {
						node.unmount();
					}
				}
			} else if (typeof this.children === "object" && i === 0) {
				this.children.unmount();
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
		// TODO: put this behind a getter or something
		const children =
			this.children === "undefined"
				? []
				: Array.isArray(this.children)
				? this.children
				: [this.children];
		for (const child of children) {
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

			if (typeof child === "object") {
				if (child.flags & (flags.Dirty | flags.Moved)) {
					this.flags |= flags.Dirty;
				}

				child.flags &= ~(flags.Dirty | flags.Moved);
			} else {
				this.flags |= flags.Dirty;
			}
		}

		if (buffer !== undefined) {
			childValues.push(buffer);
		}

		if (childValues.length === 0) {
			this.flags |= flags.Dirty;
		}

		return childValues;
	}

	abstract unmount(redundant?: boolean): MaybePromise<undefined>;

	protected unmountChildren(redundant: boolean): void {
		const children =
			this.children === "undefined"
				? []
				: Array.isArray(this.children)
				? this.children
				: [this.children];
		for (const child of children) {
			if (typeof child === "object") {
				child.unmount(redundant);
			}
		}
	}

	catch(reason: any): MaybePromise<undefined> {
		if (this.parent === undefined) {
			throw reason;
		}

		return this.parent.catch(reason);
	}

	schedule(callback: (value: unknown) => unknown): void {
		if (this.schedules === undefined) {
			this.schedules = new Set();
		}

		this.schedules.add(callback);
	}

	cleanup(callback: (value: unknown) => unknown): void {
		if (this.cleanups === undefined) {
			this.cleanups = new Set();
		}

		this.cleanups.add(callback);
	}
}

class FragmentNode<T> extends ParentNode<T> {
	readonly tag: Fragment = Fragment;
	readonly renderer: Renderer<T>;
	readonly parent: ParentNode<T>;
	readonly key: Key;
	constructor(
		tag: Fragment,
		props: null,
		renderer: Renderer<T>,
		parent: ParentNode<T>,
		key: unknown,
		scope: unknown,
	) {
		super();
		this.key = key;
		this.parent = parent;
		this.renderer = renderer;
		this.ctx = parent.ctx;
		this.scope = scope;
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

		if (!(this.flags & flags.Updating) && this.flags & flags.Dirty) {
			this.parent.commit();
		}

		this.flags &= ~flags.Updating;
		return; // void :(
	}

	unmount(redundant = true): undefined {
		if (this.flags & flags.Unmounted) {
			return;
		}

		this.flags |= flags.Unmounted;
		this.unmountChildren(redundant);
	}
}

export class HostNode<T> extends ParentNode<T> {
	readonly tag: string | symbol;
	readonly renderer: Renderer<T>;
	readonly parent: ParentNode<T> | undefined;
	readonly key: Key;
	value: T | undefined;
	private iterator: Iterator<T> | undefined;
	childValues: Array<T | string> = [];
	constructor(
		tag: string | symbol,
		props: any,
		renderer: Renderer<T>,
		parent: ParentNode<T> | undefined,
		key: unknown,
		scope: unknown,
	) {
		super();
		this.tag = tag;
		this.key = key;
		this.parent = parent;
		this.renderer = renderer;
		this.ctx = parent && parent.ctx;
		this.scope = scope;
	}

	commit(): MaybePromise<undefined> {
		this.childValues = this.commitChildren();
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

		if (
			!(this.flags & flags.Updating) &&
			this.flags & flags.Dirty &&
			this.parent !== undefined
		) {
			this.parent.commit();
		}

		this.flags &= ~flags.Updating;
	}

	commitSelf(): void {
		if (this.iterator === undefined) {
			const value = this.renderer.intrinsic(this.tag)(this);
			if (!isIteratorOrAsyncIterator(value)) {
				if (this.value === value) {
					this.flags &= ~flags.Dirty;
				} else {
					this.flags |= flags.Dirty;
				}

				this.value = value;
				return;
			}

			this.iterator = value;
		}

		const iteration = this.iterator.next();
		if (this.value === iteration.value) {
			this.flags &= ~flags.Dirty;
		} else {
			this.flags |= flags.Dirty;
		}

		this.value = iteration.value;
		if (iteration.done) {
			this.flags |= flags.Finished;
		}
	}

	unmount(redundant = true): MaybePromise<undefined> {
		if (this.flags & flags.Unmounted) {
			return;
		} else if (!(this.flags & flags.Finished)) {
			if (redundant) {
				this.flags |= flags.Redundant;
			} else {
				this.flags &= ~flags.Redundant;
			}

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
		}

		this.flags |= flags.Finished | flags.Unmounted;
		this.unmountChildren(this.tag === Portal);
	}
}

class ComponentNode<T, TProps> extends ParentNode<T> {
	readonly tag: Component<TProps>;
	props: TProps;
	readonly renderer: Renderer<T>;
	readonly parent: ParentNode<T>;
	readonly key: Key;
	readonly ctx: Context<TProps>;
	private iterator: ChildIterator | undefined;
	private oldResult: MaybePromise<undefined>;
	// TODO: explain these properties
	private inflightPending: MaybePromise<undefined>;
	private enqueuedPending: MaybePromise<undefined>;
	private inflightResult: MaybePromise<undefined>;
	private enqueuedResult: MaybePromise<undefined>;
	private onProps: ((props: TProps) => unknown) | undefined;
	private provisions: Map<unknown, any> | undefined;
	constructor(
		tag: Component,
		props: TProps,
		renderer: Renderer<T>,
		parent: ParentNode<T>,
		key: Key,
		scope: unknown,
	) {
		super();
		this.parent = parent;
		this.renderer = renderer;
		this.tag = tag;
		this.key = key;
		this.props = props;
		this.ctx = new Context(this, parent.ctx);
		this.scope = scope;
	}

	refresh(): MaybePromise<undefined> {
		if (this.flags & (flags.Stepping | flags.Unmounted)) {
			// TODO: we may want to log warnings when stuff like this happens
			return;
		}

		if (this.onProps === undefined) {
			this.flags |= flags.Available;
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
		this.flags |= flags.Updating;
		if (this.onProps === undefined) {
			this.flags |= flags.Available;
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
		} else if (this.flags & flags.AsyncGen) {
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
		if (this.flags & flags.Finished) {
			return [undefined, undefined];
		}

		this.flags |= flags.Stepping;
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
				const pending = value1.then(
					() => undefined,
					() => undefined,
				); // void :(
				const result = value1.then(
					(child) => this.updateChildren(child),
					(err) => this.parent.catch(err),
				);
				this.flags &= ~flags.Stepping;
				return [pending, result];
			} else {
				const result = this.updateChildren(value);
				this.flags &= ~flags.Stepping;
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

		this.flags &= ~flags.Stepping;
		if (isPromiseLike(iteration)) {
			this.flags |= flags.AsyncGen;
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
				this.flags &= ~flags.Iterating;
				if (iteration.done) {
					this.flags |= flags.Finished;
				}

				let result = this.updateChildren(iteration.value);
				if (isPromiseLike(result)) {
					this.oldResult = result.catch(() => undefined); // void :(
				}

				return result;
			});

			return [pending, result];
		}

		this.flags &= ~flags.Iterating;
		this.flags |= flags.SyncGen;
		if (iteration.done) {
			this.flags |= flags.Finished;
		}

		const result = this.updateChildren(iteration.value);
		return [result, result];
	}

	private advance(): void {
		this.inflightPending = this.enqueuedPending;
		this.inflightResult = this.enqueuedResult;
		this.enqueuedPending = undefined;
		this.enqueuedResult = undefined;
		if (this.flags & flags.AsyncGen && !(this.flags & flags.Finished)) {
			this.run()!.catch((err) => {
				// We catch and rethrow the error to trigger an unhandled promise
				// rejection.
				if (!(this.flags & flags.Updating)) {
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

		if (!(this.flags & flags.Updating) && this.flags & flags.Dirty) {
			this.parent.commit();
		}

		this.flags &= ~flags.Updating;
		return; // void :(
	}

	unmount(redundant = true): MaybePromise<undefined> {
		if (this.flags & flags.Unmounted) {
			return;
		}

		this.flags &= ~flags.Updating;
		this.flags |= flags.Unmounted;
		this.ctx.clearEventListeners();
		if (this.cleanups !== undefined) {
			for (const cleanup of this.cleanups) {
				cleanup(this.value);
			}

			this.cleanups = undefined;
		}

		if (!(this.flags & flags.Finished)) {
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
						() => void this.unmountChildren(redundant), // void :(
						(err) => this.parent.catch(err),
					);
				}
			}

			this.flags |= flags.Finished;
			this.unmountChildren(redundant);
		}
	}

	catch(reason: any): MaybePromise<undefined> {
		if (
			this.iterator === undefined ||
			this.iterator.throw === undefined ||
			this.flags & flags.Finished
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
						this.flags |= flags.Finished;
					}

					return this.updateChildren(iteration.value);
				},
				(err) => this.parent.catch(err),
			);

			return result;
		}

		if (iteration.done) {
			this.flags |= flags.Finished;
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
		while (!(this.flags & flags.Unmounted)) {
			if (this.flags & flags.Iterating) {
				throw new Error("You must yield for each iteration of this.");
			} else if (this.flags & flags.AsyncGen) {
				throw new Error("Use for await...of in async generator components.");
			}

			this.flags |= flags.Iterating;
			yield this.props!;
		}
	}

	async *[Symbol.asyncIterator](): AsyncGenerator<TProps> {
		do {
			if (this.flags & flags.Iterating) {
				throw new Error("You must yield for each iteration of this.");
			} else if (this.flags & flags.SyncGen) {
				throw new Error("Use for...of in sync generator components.");
			}

			this.flags |= flags.Iterating;
			if (this.flags & flags.Available) {
				this.flags &= ~flags.Available;
				yield this.props!;
			} else {
				const props = await new Promise<TProps>(
					(resolve) => (this.onProps = resolve),
				);
				if (!(this.flags & flags.Unmounted)) {
					yield props;
				}
			}
		} while (!(this.flags & flags.Unmounted));
	}
}

function createNode<T>(
	element: Element,
	renderer: Renderer<T>,
	parent?: ParentNode<T>,
	scope?: unknown,
): ParentNode<T> {
	if (element.tag === Fragment) {
		return new FragmentNode(
			element.tag,
			null,
			renderer,
			parent!,
			element.key,
			scope,
		);
	} else if (typeof element.tag === "function") {
		return new ComponentNode(
			element.tag,
			element.props,
			renderer,
			parent!,
			element.key,
			scope,
		);
	} else {
		return new HostNode(
			element.tag,
			element.props,
			renderer,
			parent,
			element.key,
			scope,
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
	[Raw](node: HostNode<any>): any {
		return node.props.value;
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
