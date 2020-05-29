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

// exporting flags for custom renderers
export {flags};
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

export type Intrinsic<T> = (node: Node<T>) => Iterator<T> | T;

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
		return;
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

export class Node<TValue = any> {
	flags = flags.Initial;
	tag: Tag;
	props: any;
	key: Key;
	ref: Function | undefined;
	renderer: Renderer<TValue>;
	parent: Node<TValue> | undefined;
	scope: unknown;
	value: Array<TValue | string> | TValue | string | undefined;
	children:
		| Array<Node<TValue> | string | undefined>
		| Node<TValue>
		| string
		| undefined;
	keyedChildren: Map<unknown, Node<TValue>> | undefined;
	iterator: Iterator<TValue> | ChildIterator | undefined;
	onNewResult: ((result?: Promise<undefined>) => unknown) | undefined;
	ctx: Context | undefined;
	schedules: Set<(value: unknown) => unknown> | undefined;
	cleanups: Set<(value: unknown) => unknown> | undefined;
	// TODO: delete this
	clock: number;
	// TODO: component specific. Move to Context or helper object?
	provisions: Map<unknown, any> | undefined;
	onProps: ((props: any) => unknown) | undefined;
	oldResult: MaybePromise<undefined>;
	inflightPending: MaybePromise<undefined>;
	enqueuedPending: MaybePromise<undefined>;
	inflightResult: MaybePromise<undefined>;
	enqueuedResult: MaybePromise<undefined>;
	constructor(
		element: Element,
		renderer: Renderer<TValue>,
		parent?: Node<TValue> | undefined,
		scope?: unknown,
	) {
		this.tag = element.tag;
		this.key = element.key;
		this.parent = parent;
		this.renderer = renderer;
		if (typeof this.tag === "function") {
			this.ctx = new Context(this as any, parent!.ctx);
		} else {
			this.ctx = parent && parent.ctx;
		}

		this.scope = scope;
		this.value = undefined;
		this.children = undefined;
		this.keyedChildren = undefined;
		this.iterator = undefined;
		this.clock = 0;
		// this.onNewResult = undefined;
		// this.schedules = undefined;
		// this.cleanups = undefined;
		// TODO: these properties are exclusive to components hmmm....
		// this.provisions = undefined;
		// this.inflightPending = undefined;
		// this.inflightResult = undefined;
		// this.enqueuedPending = undefined;
		// this.enqueuedResult = undefined;
		// this.oldResult = undefined;
		// this.onProps = undefined;
	}

	get childValues(): Array<TValue | string> {
		if (this.value === undefined) {
			return [];
		} else if (Array.isArray(this.value)) {
			return this.value;
		} else {
			return [this.value];
		}
	}
}

function update(
	node: Node,
	props: any,
	ref?: Function,
): MaybePromise<undefined> {
	node.props = props;
	node.ref = ref;
	node.flags |= flags.Updating;
	if (typeof node.tag === "function") {
		return updateComponent(node);
	}

	return updateChildren(node, props.children);
}

// TODO: reduce duplication and complexity of this method :P
function updateChildren(
	node: Node,
	children: Children,
): MaybePromise<undefined> {
	const clock = node.clock++;
	let scope: unknown;
	if (typeof node.tag === "function") {
		if (isNonStringIterable(children)) {
			children = createElement(Fragment, null, children);
		}
	} else if (node.tag !== Fragment) {
		scope = getScope(node.renderer, node.tag, node.props);
	}

	let result: Promise<undefined> | undefined;
	let newChildren: Array<Node | string | undefined> | Node | string | undefined;
	let keyedChildren: Map<unknown, Node> | undefined;
	// TODO: split algorithm into two stages.
	// Stage 1: Alignment
	// Stage 2: Updating
	let i = 0;
	for (const child of flatten(children)) {
		// Alignment
		let oldChild: Node | string | undefined;
		if (Array.isArray(node.children)) {
			oldChild = node.children[i];
		} else if (i === 0) {
			oldChild = node.children;
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

		if (oldChild === undefined) {
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
					oldChild = new Node(child, node.renderer, node, scope);
				} else {
					oldChild = child;
				}
			} else {
				oldChild = node.keyedChildren && node.keyedChildren.get(key);
				if (oldChild === undefined) {
					if (tag === Copy) {
						if (newChildren === undefined) {
							newChildren = [undefined];
						} else if (!Array.isArray(newChildren)) {
							newChildren = [newChildren];
						}

						newChildren.push(undefined);
						continue;
					}

					oldChild = new Node(child as Element, node.renderer, node, scope);
				} else {
					node.keyedChildren!.delete(key);
					oldChild.flags |= flags.Moved;
				}
			}
		} else if (key !== undefined) {
			let keyedChild = node.keyedChildren && node.keyedChildren.get(key);
			if (keyedChild === undefined) {
				if (tag === Copy) {
					if (newChildren === undefined) {
						newChildren = [undefined];
					} else if (!Array.isArray(newChildren)) {
						newChildren = [newChildren];
					}

					newChildren.push(undefined);
					continue;
				}

				keyedChild = new Node(child as Element, node.renderer, node, scope);
				i--;
			} else {
				node.keyedChildren!.delete(key);
				if (oldChild !== keyedChild) {
					keyedChild.flags |= flags.Moved;
					i--;
				}
			}

			oldChild = keyedChild;
		} else if (typeof oldChild === "object" && oldChild.key !== undefined) {
			if (Array.isArray(node.children)) {
				while (typeof oldChild === "object" && oldChild.key !== undefined) {
					i++;
					oldChild = node.children[i];
				}
			} else {
				oldChild = undefined;
				i++;
			}

			if (oldChild === undefined) {
				if (tag === Copy) {
					if (newChildren === undefined) {
						newChildren = [undefined];
					} else if (!Array.isArray(newChildren)) {
						newChildren = [newChildren];
					}

					newChildren.push(undefined);
					continue;
				} else if (typeof child === "object") {
					oldChild = new Node(child, node.renderer, node, scope);
				} else {
					oldChild = child;
				}
			}
		}

		// Updating
		if (tag === Copy) {
			// no need to update
			// TODO: forgive me Anders for I have sinned.
		} else if (((oldChild || {}) as any).tag === tag) {
			if (typeof oldChild === "object") {
				const result1 = update(
					oldChild,
					(child as Element).props,
					(child as Element).ref,
				);
				if (result1 !== undefined) {
					result = result === undefined ? result1 : result.then(() => result1);
				}
			} else if (typeof child === "string") {
				const text = getText(node.renderer, child);
				oldChild = text;
			} else {
				oldChild = undefined;
			}
		} else {
			// replace current oldChild
			let result1: Promise<undefined> | undefined;
			let newChild: Node | string | undefined;
			if (typeof child === "object") {
				newChild = new Node(child, node.renderer, node, scope);
				result1 = update(
					newChild,
					(child as Element).props,
					(child as Element).ref,
				);
			} else if (typeof child === "string") {
				newChild = getText(node.renderer, child);
			} else {
				newChild = undefined;
			}

			if (result1 === undefined) {
				if (typeof oldChild === "object") {
					unmount(oldChild);
				}
			} else {
				const oldChild1 = oldChild;
				if (typeof oldChild1 === "object") {
					(newChild as Node).value = oldChild1.value;
					schedule(oldChild1, (value: any) => {
						(newChild as Node).value = value;
					});
				} else {
					(newChild as Node).value = oldChild1;
				}

				result1 = result1.then(() => {
					if (typeof oldChild1 === "object") {
						unmount(oldChild1);
					}

					return undefined; // void :(
				});

				result = result === undefined ? result1 : result.then(() => result1);
			}

			oldChild = newChild;
		}

		if (key !== undefined) {
			if (keyedChildren === undefined) {
				keyedChildren = new Map();
			}

			keyedChildren.set(key, oldChild as Node);
		}

		i++;
		if (newChildren === undefined) {
			newChildren = oldChild;
			continue;
		} else if (!Array.isArray(newChildren)) {
			newChildren = [newChildren];
		}

		newChildren.push(oldChild);
	}

	if (node.clock !== clock + 1) {
		return;
	}

	if (node.children !== undefined) {
		if (Array.isArray(node.children)) {
			for (; i < node.children.length; i++) {
				const oldChild = node.children[i];
				if (typeof oldChild === "object" && oldChild.key === undefined) {
					unmount(oldChild);
				}
			}
		} else if (typeof node.children === "object" && i === 0) {
			unmount(node.children);
		}
	}

	// unmount excess keyed children
	// TODO: likely where the logic for asynchronous unmounting would go
	if (node.keyedChildren !== undefined) {
		for (const oldChild of node.keyedChildren.values()) {
			unmount(oldChild);
		}
	}

	node.children = newChildren;
	node.keyedChildren = keyedChildren;

	if (node.onNewResult !== undefined) {
		node.onNewResult(result);
		node.onNewResult = undefined;
	}

	if (result !== undefined) {
		result = result.then(() => commit(node));
		const newResult = new Promise<undefined>(
			(resolve) => (node.onNewResult = resolve),
		);

		return Promise.race([result, newResult]);
	}

	commit(node);
}

function commit<TValue>(node: Node<TValue>): MaybePromise<undefined> {
	const oldValue = node.value;
	prepare(node);
	if (typeof node.tag === "function") {
		if (isEventTarget(node.value)) {
			node.ctx!.setDelegate(node.value);
		} else if (Array.isArray(node.value)) {
			node.ctx!.setDelegates(node.value);
		}
	} else if (node.tag !== Fragment) {
		try {
			if (node.iterator === undefined) {
				const value = getIntrinsic(
					node.renderer,
					node.tag as string | symbol,
				)(node);
				if (!isIteratorOrAsyncIterator(value)) {
					if (oldValue === value) {
						node.flags &= ~flags.Dirty;
					} else {
						node.flags |= flags.Dirty;
					}

					node.value = value;
					return;
				}

				node.iterator = value;
			}

			const iteration = (node.iterator as Iterator<TValue>).next();
			if (oldValue === iteration.value) {
				node.flags &= ~flags.Dirty;
			} else {
				node.flags |= flags.Dirty;
			}

			node.value = iteration.value;
			if (iteration.done) {
				node.flags |= flags.Finished;
			}
		} catch (err) {
			if (node.parent === undefined) {
				throw err;
			}

			return handle(node.parent, err);
		}
	}

	if (node.schedules !== undefined && node.schedules.size > 0) {
		// We have to clear the schedules set before calling each callback,
		// because otherwise a callback which refreshes the component would cause
		// a stack overflow.
		const callbacks = Array.from(node.schedules);
		node.schedules.clear();
		for (const callback of callbacks) {
			callback(node.value);
		}
	}

	if (node.ref !== undefined) {
		node.ref(node.value);
	}

	if (
		!(node.flags & flags.Updating) &&
		node.flags & flags.Dirty &&
		node.parent !== undefined
	) {
		commit(node.parent);
	}

	node.flags &= ~flags.Updating;
}

function prepare<TValue>(node: Node<TValue>): void {
	if (node.children === undefined) {
		node.flags |= flags.Dirty;
		node.value = undefined;
		return;
	} else if (!Array.isArray(node.children)) {
		const child = node.children;
		if (typeof child === "object") {
			if (child.flags & (flags.Dirty | flags.Moved)) {
				node.flags |= flags.Dirty;
			}

			child.flags &= ~(flags.Dirty | flags.Moved);
		} else {
			node.flags |= flags.Dirty;
		}

		if (typeof child === "object") {
			if (child.tag === Portal) {
				node.value = undefined;
			} else {
				node.value = child.value;
			}
		} else {
			node.value = child;
		}

		return;
	}

	let buffer: string | undefined;
	let values: Array<TValue | string> = [];
	for (const child of node.children) {
		if (typeof child === "object") {
			if (child.flags & (flags.Dirty | flags.Moved)) {
				node.flags |= flags.Dirty;
			}

			child.flags &= ~(flags.Dirty | flags.Moved);
		} else {
			node.flags |= flags.Dirty;
		}

		if (typeof child === "object" && child.tag === Portal) {
			continue;
		}

		const value = typeof child === "object" ? child.value : child;
		if (typeof value === "string") {
			buffer = buffer === undefined ? value : buffer + value;
		} else {
			if (buffer !== undefined) {
				values.push(buffer);
				buffer = undefined;
			}

			if (Array.isArray(value)) {
				values = values.concat(value);
			} else if (value !== undefined) {
				values.push(value);
			}
		}
	}

	if (buffer !== undefined) {
		values.push(buffer);
	}

	if (values.length === 0) {
		node.flags |= flags.Dirty;
		node.value = undefined;
	} else if (values.length === 1) {
		node.value = values[0];
	} else {
		node.value = values;
	}
}

function unmount(node: Node, redundant = true): MaybePromise<undefined> {
	if (node.cleanups !== undefined) {
		for (const cleanup of node.cleanups) {
			cleanup(node.value);
		}

		node.cleanups = undefined;
	}

	if (node.flags & flags.Unmounted) {
		return;
	}

	// TODO: investigate why setting node flag after node block causes a test in races to fail
	node.flags |= flags.Unmounted;
	if (!(node.flags & flags.Finished)) {
		node.flags |= flags.Finished;
		if (node.tag === Fragment) {
			// pass
		} else if (typeof node.tag === "function") {
			if (node.onProps !== undefined) {
				node.onProps(node.props!);
				node.onProps = undefined;
			}

			node.ctx!.clearEventListeners();
			if (node.iterator !== undefined && node.iterator.return) {
				let iteration: IteratorResult<Child> | Promise<IteratorResult<Child>>;
				try {
					iteration = (node.iterator as ChildIterator).return!();
				} catch (err) {
					return handle(node.parent!, err);
				}

				if (isPromiseLike(iteration)) {
					return iteration.then(
						() => {
							node.flags &= ~flags.Updating;
							unmountChildren(node, redundant);
							return undefined; // void :(
						},
						(err) => handle(node.parent!, err),
					);
				}
			}
		} else {
			if (redundant) {
				node.flags |= flags.Redundant;
			} else {
				node.flags &= ~flags.Redundant;
			}

			redundant = node.tag === Portal;
			if (node.iterator !== undefined && node.iterator.return) {
				try {
					node.iterator.return();
				} catch (err) {
					if (node.parent === undefined) {
						throw err;
					}

					return handle(node.parent, err);
				}
			}
		}
	}

	node.flags &= ~flags.Updating;
	unmountChildren(node, redundant);
}

function unmountChildren(node: Node, redundant: boolean): void {
	const children =
		node.children === "undefined"
			? []
			: Array.isArray(node.children)
			? node.children
			: [node.children];
	for (const child of children) {
		if (typeof child === "object") {
			unmount(child, redundant);
		}
	}
}

function handle(node: Node, reason: unknown): MaybePromise<undefined> {
	if (node.parent === undefined) {
		throw reason;
	} else if (
		typeof node.tag !== "function" ||
		node.iterator === undefined ||
		node.iterator.throw === undefined ||
		node.flags & flags.Finished
	) {
		return handle(node.parent, reason);
	}

	// helps avoid deadlocks
	if (node.onProps !== undefined) {
		node.onProps(node.props!);
		node.onProps = undefined;
	}

	let iteration: IteratorResult<Child> | Promise<IteratorResult<Child>>;
	try {
		iteration = (node.iterator as ChildIterator).throw!(reason);
	} catch (err) {
		return handle(node.parent, err);
	}

	if (isPromiseLike(iteration)) {
		const result = iteration.then(
			(iteration) => {
				if (iteration.done) {
					node.flags |= flags.Finished;
				}

				return updateChildren(node, iteration.value);
			},
			(err) => handle(node.parent!, err),
		);

		return result;
	}

	if (iteration.done) {
		node.flags |= flags.Finished;
	}

	return updateChildren(node, iteration.value);
}

function schedule(node: Node, callback: (value: unknown) => unknown): void {
	if (node.schedules === undefined) {
		node.schedules = new Set();
	}

	node.schedules.add(callback);
}

function cleanup(node: Node, callback: (value: unknown) => unknown): void {
	if (node.cleanups === undefined) {
		node.cleanups = new Set();
	}

	node.cleanups.add(callback);
}

function updateComponent(node: Node): MaybePromise<undefined> {
	if (node.flags & (flags.Stepping | flags.Unmounted)) {
		// TODO: we may want to log warnings when stuff like node happens
		return;
	}

	if (node.onProps === undefined) {
		node.flags |= flags.Available;
	} else {
		node.onProps(node.props!);
		node.onProps = undefined;
	}

	return run(node);
}

function run(node: Node): MaybePromise<undefined> {
	if (node.inflightPending === undefined) {
		const [pending, result] = step(node);
		if (isPromiseLike(pending)) {
			node.inflightPending = pending.finally(() => advance(node));
		}

		node.inflightResult = result;
		return node.inflightResult;
	} else if (node.flags & flags.AsyncGen) {
		return node.inflightResult;
	} else if (node.enqueuedPending === undefined) {
		let resolve: (value: MaybePromise<undefined>) => unknown;
		node.enqueuedPending = node.inflightPending
			.then(() => {
				const [pending, result] = step(node);
				resolve(result);
				return pending;
			})
			.finally(() => advance(node));
		node.enqueuedResult = new Promise((resolve1) => (resolve = resolve1));
	}

	return node.enqueuedResult;
}

function step<TValue>(
	node: Node<TValue>,
): [MaybePromise<undefined>, MaybePromise<undefined>] {
	if (node.flags & flags.Finished) {
		return [undefined, undefined];
	}

	node.flags |= flags.Stepping;
	if (node.iterator === undefined) {
		node.ctx!.clearEventListeners();
		let value: ChildIterator | PromiseLike<Child> | Child;
		try {
			value = (node.tag as Component).call(node.ctx!, node.props!);
		} catch (err) {
			const caught = handle(node.parent!, err);
			return [undefined, caught];
		}

		if (isIteratorOrAsyncIterator(value)) {
			node.iterator = value;
		} else if (isPromiseLike(value)) {
			const value1 = upgradePromiseLike(value);
			const pending = value1.then(
				() => undefined,
				() => undefined,
			); // void :(
			const result = value1.then(
				(child) => updateChildren(node, child),
				(err) => handle(node.parent!, err),
			);
			node.flags &= ~flags.Stepping;
			return [pending, result];
		} else {
			const result = updateChildren(node, value);
			node.flags &= ~flags.Stepping;
			return [undefined, result];
		}
	}

	let oldValue: MaybePromise<
		Array<TValue | string> | TValue | string | undefined
	>;
	if (node.oldResult === undefined) {
		oldValue = node.value;
	} else {
		oldValue = node.oldResult.then(() => node.value);
		node.oldResult = undefined;
	}

	let iteration: IteratorResult<Child> | Promise<IteratorResult<Child>>;
	try {
		iteration = (node.iterator as ChildIterator).next(oldValue);
	} catch (err) {
		const caught = handle(node.parent!, err);
		return [caught, caught];
	}

	node.flags &= ~flags.Stepping;
	if (isPromiseLike(iteration)) {
		node.flags |= flags.AsyncGen;
		iteration = iteration.catch((err) => {
			const caught = handle(node.parent!, err);
			if (caught === undefined) {
				return {value: undefined, done: true};
			}

			return caught.then(() => ({value: undefined, done: true}));
		});
		const pending = iteration.then(
			() => undefined,
			() => undefined,
		); // void :(
		const result = iteration.then((iteration) => {
			node.flags &= ~flags.Iterating;
			if (iteration.done) {
				node.flags |= flags.Finished;
			}

			let result = updateChildren(node, iteration.value);
			if (isPromiseLike(result)) {
				node.oldResult = result.catch(() => undefined); // void :(
			}

			return result;
		});

		return [pending, result];
	}

	node.flags &= ~flags.Iterating;
	node.flags |= flags.SyncGen;
	if (iteration.done) {
		node.flags |= flags.Finished;
	}

	const result = updateChildren(node, iteration.value);
	return [result, result];
}

function advance(node: Node): void {
	node.inflightPending = node.enqueuedPending;
	node.inflightResult = node.enqueuedResult;
	node.enqueuedPending = undefined;
	node.enqueuedResult = undefined;
	if (node.flags & flags.AsyncGen && !(node.flags & flags.Finished)) {
		run(node)!.catch((err) => {
			// We catch and rethrow the error to trigger an unhandled promise
			// rejection.
			if (!(node.flags & flags.Updating)) {
				throw err;
			}
		});
	}
}

export interface ProvisionMap {}

const componentNodes = new WeakMap<Context<any>, Node<any>>();
export class Context<TProps = any> extends CrankEventTarget {
	constructor(node: Node<any>, parent?: Context<TProps>) {
		super(parent);
		componentNodes.set(this, node);
	}

	get<TKey extends keyof ProvisionMap>(key: TKey): ProvisionMap[TKey];
	get(key: unknown): any {
		const node = componentNodes.get(this)!;
		for (
			let parent: Node<any> | undefined = node.parent;
			parent !== undefined;
			parent = parent.parent
		) {
			if (parent.provisions !== undefined && parent.provisions.has(key)) {
				return parent.provisions.get(key)!;
			}
		}
	}

	set<TKey extends keyof ProvisionMap>(
		key: TKey,
		value: ProvisionMap[TKey],
	): void;
	set(key: unknown, value: any): void {
		const node = componentNodes.get(this)!;
		if (node.provisions === undefined) {
			node.provisions = new Map();
		}

		node.provisions.set(key, value);
	}

	get props(): TProps {
		return componentNodes.get(this)!.props;
	}

	get value(): unknown {
		return componentNodes.get(this)!.value;
	}

	*[Symbol.iterator](): Generator<TProps> {
		const node = componentNodes.get(this)!;
		while (!(node.flags & flags.Unmounted)) {
			if (node.flags & flags.Iterating) {
				throw new Error("You must yield for each iteration of this.");
			} else if (node.flags & flags.AsyncGen) {
				throw new Error("Use for await...of in async generator components.");
			}

			node.flags |= flags.Iterating;
			yield node.props!;
		}
	}

	async *[Symbol.asyncIterator](): AsyncGenerator<TProps> {
		const node = componentNodes.get(this)!;
		do {
			if (node.flags & flags.Iterating) {
				throw new Error("You must yield for each iteration of this.");
			} else if (node.flags & flags.SyncGen) {
				throw new Error("Use for...of in sync generator components.");
			}

			node.flags |= flags.Iterating;
			if (node.flags & flags.Available) {
				node.flags &= ~flags.Available;
				yield node.props!;
			} else {
				const props = await new Promise<any>(
					(resolve) => (node.onProps = resolve),
				);
				if (!(node.flags & flags.Unmounted)) {
					yield props;
				}
			}
		} while (!(node.flags & flags.Unmounted));
	}

	refresh(): Promise<undefined> | undefined {
		const node = componentNodes.get(this)!;
		return updateComponent(node);
	}

	schedule(callback: (value: unknown) => unknown): void {
		const node = componentNodes.get(this)!;
		return schedule(node, callback);
	}

	cleanup(callback: (value: unknown) => unknown): void {
		const node = componentNodes.get(this)!;
		return cleanup(node, callback);
	}
}

export const Default = Symbol.for("crank.Default");

export const Text = Symbol.for("crank.Text");

export const Scopes = Symbol.for("crank.Scopes");

export interface Scoper {
	[Default]?(tag: string | symbol, props: any): unknown;
	[tag: string]: unknown;
}

export interface Environment<TValue> {
	[Default]?(tag: string | symbol): Intrinsic<TValue>;
	[Text]?(text: string): string;
	[Scopes]?: Scoper;
	[tag: string]: Intrinsic<TValue>;
	// TODO: uncomment
	// [Portal]?: Intrinsic<TValue>;
	// [Raw]?: Intrinsic<TValue>;
}

const defaultEnv: Environment<any> = {
	[Default](tag: string): never {
		throw new Error(`Environment did not provide an intrinsic for tag: ${tag}`);
	},
	[Portal](): never {
		throw new Error("Environment did not provide an intrinsic for Portal");
	},
	[Raw](node: Node<any>): any {
		return node.props.value;
	},
};

export class Renderer<TValue> {
	__cache__ = new WeakMap<object, Node<TValue>>();
	__defaults__: Record<string, Intrinsic<TValue>> = {};
	__env__: Environment<TValue> = {...defaultEnv};
	__scoper__: Scoper = {};
	constructor(env?: Environment<TValue>) {
		this.extend(env);
	}

	extend(env?: Environment<TValue>): void {
		if (env == null) {
			return;
		}

		for (const tag of Object.keys(env)) {
			if (env[tag] != null) {
				this.__env__[tag] = env[tag]!;
			}
		}

		for (const tag of Object.getOwnPropertySymbols(env)) {
			if (env[tag as any] != null && tag !== Scopes) {
				this.__env__[tag as any] = env[tag as any]!;
			}
		}

		if (env[Scopes] != null) {
			const scoper = env[Scopes]!;
			for (const tag of Object.keys(scoper)) {
				if (scoper[tag] != null) {
					this.__scoper__[tag] = scoper[tag]!;
				}
			}

			for (const tag of Object.getOwnPropertySymbols(env)) {
				if (scoper[tag as any] != null) {
					this.__scoper__[tag as any] = scoper[tag as any]!;
				}
			}
		}
	}

	render(children: Children, root?: object): MaybePromise<TValue> {
		const child: Child = isNonStringIterable(children)
			? createElement(Fragment, null, children)
			: children;
		const portal: Element<Portal> =
			isElement(child) && child.tag === Portal
				? child
				: createElement(Portal, {root}, child);

		let rootNode: Node<TValue> | undefined =
			root != null ? this.__cache__.get(root) : undefined;

		if (rootNode === undefined) {
			rootNode = new Node(portal, this);
			if (root !== undefined && child != null) {
				this.__cache__.set(root, rootNode);
			}
		} else if (root != null && child == null) {
			this.__cache__.delete(root);
		}

		const result = update(rootNode, portal.props);
		if (isPromiseLike(result)) {
			return result.then(() => {
				commit(rootNode!);
				if (portal.props.root == null) {
					unmount(rootNode!);
				}

				return rootNode!.value! as MaybePromise<TValue>;
			});
		}

		commit(rootNode!);
		if (portal.props.root == null) {
			unmount(rootNode);
		}

		return rootNode.value! as MaybePromise<TValue>;
	}
}

function getIntrinsic<TValue>(
	renderer: Renderer<TValue>,
	tag: string | symbol,
): Intrinsic<TValue> {
	if (renderer.__env__[tag as any]) {
		return renderer.__env__[tag as any];
	} else if (renderer.__defaults__[tag as any] !== undefined) {
		return renderer.__defaults__[tag as any];
	}

	const intrinsic = renderer.__env__[Default]!(tag);
	renderer.__defaults__[tag as any] = intrinsic;
	return intrinsic;
}

function getText(renderer: Renderer<any>, text: string): string {
	if (renderer.__env__[Text] !== undefined) {
		return renderer.__env__[Text]!(text);
	}

	return text;
}

function getScope(
	renderer: Renderer<any>,
	tag: string | symbol,
	props: any,
): unknown {
	if (tag in renderer.__scoper__) {
		if (typeof renderer.__scoper__[tag as any] === "function") {
			return (renderer.__scoper__[tag as any] as Function)(props);
		}

		return renderer.__scoper__[tag as any];
	} else if (typeof renderer.__scoper__[Default] === "function") {
		return renderer.__scoper__[Default]!(tag, props);
	}
}
