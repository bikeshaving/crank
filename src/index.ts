import {CrankEventTarget, isEventTarget} from "./events";
export {EventMap} from "./events";
import * as flags from "./flags";
import {Copy, Fragment, Portal, Raw} from "./tags";
export {Copy, Fragment, Portal, Raw};
import {
	isIteratorOrAsyncIterator,
	isNonStringIterable,
	isPromiseLike,
	upgradePromiseLike,
} from "./utils";

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

export type TagProps<TTag extends Tag> = TTag extends string
	? JSX.IntrinsicElements[TTag]
	: TTag extends Component<infer TProps>
	? TProps
	: unknown;

export type Child = Element | string | number | boolean | null | undefined;

interface ChildIterable extends Iterable<Child | ChildIterable> {}

export type Children = Child | ChildIterable;

type NormalizedChild = Element | string | undefined;

type NormalizedChildren = Array<NormalizedChild> | NormalizedChild;

export type FunctionComponent<TProps = any> = (
	this: Context<TProps>,
	props: TProps,
) => PromiseLike<Child> | Child;

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

// TODO: Component cannot be a union of FunctionComponent | GeneratorComponent because this breaks Function.prototype methods.
// https://github.com/microsoft/TypeScript/issues/33815
export type Component<TProps = any> = (
	this: Context<TProps>,
	props: TProps,
) => ChildIterator | PromiseLike<Child> | Child;

export type Intrinsic<TValue> = (
	elem: Element<any, TValue>,
) => Iterator<TValue> | TValue;

type Key = unknown;

type Scope = unknown;

const ElementSigil = Symbol.for("crank.ElementSigil");

export class Element<TTag extends Tag = Tag, TValue = any> {
	$sigil: typeof ElementSigil;
	tag: TTag;
	props: TagProps<TTag>;
	key: Key;
	ref: Function | undefined;
	flags: number;
	scope: Scope;
	parent: Element<Tag, TValue> | undefined;
	ctx: Context | undefined;
	iterator: Iterator<TValue> | ChildIterator | undefined;
	value: Array<TValue | string> | TValue | string | undefined;
	children: NormalizedChildren;
	childrenByKey: Map<Key, Element> | undefined;
	onNewResult: ((result?: Promise<undefined>) => unknown) | undefined;
	schedules: Set<(value: unknown) => unknown> | undefined;
	cleanups: Set<(value: unknown) => unknown> | undefined;
	// TODO: component specific. Move to Context or helper object?
	provisions: Map<unknown, unknown> | undefined;
	onProps: ((props: any) => unknown) | undefined;
	oldResult: Promise<undefined> | undefined;
	inflightPending: Promise<undefined> | undefined;
	enqueuedPending: Promise<undefined> | undefined;
	inflightResult: Promise<undefined> | undefined;
	enqueuedResult: Promise<undefined> | undefined;
	constructor(
		tag: TTag,
		props: TagProps<TTag>,
		key: Key,
		ref: Function | undefined,
	) {
		this.$sigil = ElementSigil;
		this.tag = tag;
		this.props = props;
		this.key = key;
		this.ref = ref;
		this.flags = flags.Initial;
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

	get dirtyProps(): boolean {
		return (this.flags & flags.Updating) !== 0;
	}

	get dirtyChildren(): boolean {
		return (this.flags & flags.Dirty) !== 0;
	}

	get dirtyRemoval(): boolean {
		return (this.flags & flags.Removing) !== 0;
	}
}

export function isElement(value: any): value is Element {
	return value != null && value.$sigil === ElementSigil;
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
	let key: Key;
	let ref: Function | undefined;
	if (props != null) {
		for (const name in props) {
			if (name === "crank-key") {
				if (props[name] != null) {
					key = props[name];
				}
			} else if (name === "crank-ref") {
				if (typeof props["crank-ref"] === "function") {
					ref = props[name];
				}
			} else {
				props1[name] = props[name];
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

	return new Element(tag, props1, key, ref);
}

export const Default = Symbol.for("crank.Default");

export const Text = Symbol.for("crank.Text");

export const Scopes = Symbol.for("crank.Scopes");

export interface Scoper {
	[Default]?(tag: string | symbol, props: any): Scope;
	[tag: string]: Scope | ((props: any) => Scope);
}

export interface Environment<TValue> {
	[Default](tag: string | symbol): Intrinsic<TValue>;
	[Text]?(text: string): string;
	// TODO: uncomment
	// [Portal]?: Intrinsic<TValue>;
	// [Raw]?: Intrinsic<TValue>;
	[Scopes]?: Scoper;
	[tag: string]: Intrinsic<TValue>;
}

const defaultEnv: Environment<any> = {
	[Default](tag: string): never {
		throw new Error(`Environment did not provide an intrinsic for tag: ${tag}`);
	},
	[Portal](): never {
		throw new Error("Environment did not provide an intrinsic for Portal");
	},
	[Raw](elem: Element<any, any>): any {
		return elem.props.value;
	},
};

export class Renderer<TValue> {
	__env__: Environment<TValue>;
	__defaults__: Record<string, Intrinsic<TValue>>;
	__scoper__: Scoper;
	__cache__: WeakMap<object, Element<any, TValue>>;
	constructor(env?: Partial<Environment<TValue>>) {
		this.__env__ = Object.assign({}, defaultEnv);
		this.__defaults__ = {};
		this.__scoper__ = {};
		this.__cache__ = new WeakMap();
		this.extend(env);
	}

	extend(env?: Partial<Environment<TValue>>): void {
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

	render(children: Children, root?: object): Promise<TValue> | TValue {
		const clearing = children == null;
		let newChild: Element<Portal, TValue> =
			isElement(children) && children.tag === Portal
				? children
				: createElement(Portal, {root}, children);

		const oldChild: Element<Portal, TValue> | undefined =
			root != null ? this.__cache__.get(root) : undefined;

		// TODO: what if the we pass two portals with different keys?
		if (oldChild === undefined) {
			mount(this, newChild, undefined, undefined, undefined);
			if (!clearing && root !== null && typeof root === "object") {
				this.__cache__.set(root, newChild);
			}
		} else {
			if (oldChild !== newChild) {
				oldChild.props = newChild.props;
				oldChild.ref = newChild.ref;
				newChild = oldChild;
			}

			if (clearing && root !== null && typeof root === "object") {
				this.__cache__.delete(root);
			}
		}

		const result = update(this, newChild, undefined);
		if (isPromiseLike(result)) {
			return result.then(() => {
				if (newChild.props.root == null) {
					unmount(this, newChild);
				}

				return newChild.value as TValue;
			});
		}

		if (newChild.props.root == null) {
			unmount(this, newChild);
		}

		return newChild.value as TValue;
	}
}

function getIntrinsic<TValue>(
	renderer: Renderer<TValue>,
	tag: string | symbol,
): Intrinsic<TValue> {
	if (typeof renderer.__env__[tag as any] === "function") {
		return renderer.__env__[tag as any];
	} else if (typeof renderer.__defaults__[tag as any] === "function") {
		return renderer.__defaults__[tag as any];
	}

	const intrinsic = renderer.__env__[Default]!(tag);
	renderer.__defaults__[tag as any] = intrinsic;
	return intrinsic;
}

function getText(renderer: Renderer<any>, text: string): string {
	if (typeof renderer.__env__[Text] === "function") {
		return renderer.__env__[Text]!(text);
	}

	return text;
}

function getScope(
	renderer: Renderer<any>,
	tag: string | symbol,
	props: any,
): Scope {
	if (tag in renderer.__scoper__) {
		if (typeof renderer.__scoper__[tag as any] === "function") {
			return (renderer.__scoper__[tag as any] as Function)(props);
		}

		return renderer.__scoper__[tag as any];
	} else if (typeof renderer.__scoper__[Default] === "function") {
		return renderer.__scoper__[Default]!(tag, props);
	}
}

function normalize(child: Child): NormalizedChild {
	if (child == null || typeof child === "boolean") {
		return undefined;
	} else if (typeof child === "string" || isElement(child)) {
		return child;
	} else {
		return child.toString();
	}
}

function mount<TTag extends Tag, TValue>(
	renderer: Renderer<TValue>,
	elem: Element<TTag, TValue>,
	scope: Scope,
	parent: Element<Tag, TValue> | undefined,
	ctx: Context<TagProps<TTag>, TValue> | undefined,
): Element<TTag, TValue> {
	if (elem.flags & flags.Mounted) {
		elem = new Element(elem.tag, elem.props, elem.key, elem.ref);
	}

	elem.flags |= flags.Mounted;
	elem.scope = scope;
	elem.parent = parent;
	if (typeof elem.tag === "function") {
		elem.ctx = new Context(renderer, elem as Element<Component>, ctx);
	}

	return elem;
}

function update<TValue>(
	renderer: Renderer<TValue>,
	elem: Element<Tag, TValue>,
	ctx: Context<any, TValue> | undefined,
): Promise<undefined> | undefined {
	elem.flags |= flags.Updating;
	if (typeof elem.tag === "function") {
		return refresh(elem as Element<Component>);
	}

	return updateChildren(renderer, elem, elem.props.children, ctx);
}

function updateChildren<TValue>(
	renderer: Renderer<TValue>,
	elem: Element<Tag, TValue>,
	children: Children,
	ctx: Context<any, TValue> | undefined,
): Promise<undefined> | undefined {
	let childScope: Scope;
	if (typeof elem.tag === "function") {
		if (isNonStringIterable(children)) {
			children = createElement(Fragment, null, children);
		}
	} else if (elem.tag !== Fragment) {
		childScope = getScope(renderer, elem.tag, elem.props);
	}

	const handling = elem.flags & flags.Handling;
	let result: Promise<undefined> | undefined;
	let children1: NormalizedChildren;
	let childrenByKey: Map<Key, Element> | undefined;
	let i = 0;
	// TODO: is this array allocation important?
	if (!isNonStringIterable(children)) {
		if (children === undefined) {
			children = [];
		} else {
			children = [children];
		}
	}

	for (let newChild of children) {
		// alignment
		let oldChild: NormalizedChild;
		if (Array.isArray(elem.children)) {
			oldChild = elem.children[i];
		} else if (i === 0) {
			oldChild = elem.children;
		}

		// TODO: reassigning newChild does not narrow to NormalizedChild
		let newChild1: NormalizedChild;
		if (isNonStringIterable(newChild)) {
			newChild1 = createElement(Fragment, null, newChild);
		} else {
			newChild1 = normalize(newChild);
		}

		if (typeof newChild1 === "object" && newChild1.key !== undefined) {
			const oldChild1 =
				elem.childrenByKey && elem.childrenByKey.get(newChild1.key);
			if (oldChild1 === undefined) {
				oldChild = undefined;
			} else {
				elem.childrenByKey!.delete(newChild1.key);
				if (oldChild === oldChild1) {
					i++;
				} else {
					oldChild = oldChild1;
					oldChild.flags |= flags.Moved;
				}
			}
		} else {
			if (typeof oldChild === "object" && oldChild.key !== undefined) {
				if (Array.isArray(elem.children)) {
					while (typeof oldChild === "object" && oldChild.key !== undefined) {
						i++;
						oldChild = elem.children[i];
					}
				} else {
					oldChild = undefined;
				}
			}

			i++;
		}

		// updating
		if (typeof newChild1 === "object") {
			let result1: Promise<undefined> | undefined;
			if (newChild1.tag === Copy) {
				// TODO: do refs make sense for copies?
				newChild1 = oldChild;
			} else if (typeof oldChild === "object") {
				if (oldChild.tag === newChild1.tag) {
					if (oldChild !== newChild) {
						oldChild.props = newChild1.props;
						oldChild.ref = newChild1.ref;
						newChild1 = oldChild;
					}

					result1 = update(renderer, newChild1, ctx);
				} else {
					newChild1 = mount(renderer, newChild1, childScope, elem, ctx);
					result1 = update(renderer, newChild1, ctx);
					if (result1 === undefined) {
						unmount(renderer, oldChild);
					} else {
						// storing variables for callback closures
						newChild1.value = oldChild.value;
						const oldChild1 = oldChild;
						const newChild2 = newChild1;
						let fulfilled = false;
						result1.then(() => {
							fulfilled = true;
							unmount(renderer, oldChild1);
						});
						schedule(oldChild, (value) => {
							if (!fulfilled) {
								newChild2.value = value;
							}
						});
					}
				}
			} else {
				newChild1 = mount(renderer, newChild1, childScope, elem, ctx);
				result1 = update(renderer, newChild1, ctx);
				if (result1 !== undefined) {
					newChild1.value = oldChild;
				}
			}

			if (result1 !== undefined) {
				result = result === undefined ? result1 : result.then(() => result1);
			}
		} else {
			if (typeof oldChild === "object") {
				unmount(renderer, oldChild);
			}

			if (typeof newChild1 === "string") {
				newChild1 = getText(renderer, newChild1);
			}
		}

		// push to children1
		if (children1 === undefined) {
			children1 = newChild1;
		} else {
			if (!Array.isArray(children1)) {
				children1 = [children1];
			}

			children1.push(newChild1);
		}

		// add to childrenByKey
		if (typeof newChild1 === "object" && newChild1.key !== undefined) {
			if (childrenByKey === undefined) {
				childrenByKey = new Map();
			}

			if (!childrenByKey.has(newChild1.key)) {
				childrenByKey.set(newChild1.key, newChild1);
			}
		}
	}

	if (handling !== (elem.flags & flags.Handling)) {
		elem.flags &= ~flags.Handling;
		return;
	}

	if (elem.children !== undefined) {
		if (Array.isArray(elem.children)) {
			for (; i < elem.children.length; i++) {
				const oldChild = elem.children[i];
				if (typeof oldChild === "object" && oldChild.key === undefined) {
					unmount(renderer, oldChild);
				}
			}
		} else if (
			i === 0 &&
			typeof elem.children === "object" &&
			elem.children.key === undefined
		) {
			unmount(renderer, elem.children);
		}
	}

	// TODO: likely where logic for asynchronous unmounting will go
	if (elem.childrenByKey !== undefined) {
		for (const child of elem.childrenByKey.values()) {
			unmount(renderer, child);
		}
	}

	elem.children = children1;
	elem.childrenByKey = childrenByKey;

	if (elem.onNewResult !== undefined) {
		elem.onNewResult(result);
		elem.onNewResult = undefined;
	}

	if (result !== undefined) {
		result = result.then(() => commit(renderer, elem));
		const newResult = new Promise<undefined>(
			(resolve) => (elem.onNewResult = resolve),
		);

		return Promise.race([result, newResult]);
	}

	return commit(renderer, elem);
}

function prepareCommit<TValue>(elem: Element<Tag, TValue>): void {
	if (elem.children === undefined) {
		elem.flags |= flags.Dirty;
		elem.value = undefined;
		return;
	} else if (!Array.isArray(elem.children)) {
		const child = elem.children;
		if (typeof child === "object") {
			if (child.flags & (flags.Dirty | flags.Moved)) {
				elem.flags |= flags.Dirty;
			}

			child.flags &= ~(flags.Dirty | flags.Moved);
		} else {
			elem.flags |= flags.Dirty;
		}

		if (typeof child === "object") {
			if (child.tag === Portal) {
				elem.value = undefined;
			} else {
				elem.value = child.value;
			}
		} else {
			elem.value = child;
		}

		return;
	}

	let buffer: string | undefined;
	let values: Array<TValue | string> = [];
	for (let i = 0; i < elem.children.length; i++) {
		const child = elem.children[i];
		if (typeof child === "object") {
			if (child.flags & (flags.Dirty | flags.Moved)) {
				elem.flags |= flags.Dirty;
			}

			child.flags &= ~(flags.Dirty | flags.Moved);
		} else {
			elem.flags |= flags.Dirty;
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
		elem.flags |= flags.Dirty;
		elem.value = undefined;
	} else if (values.length === 1) {
		elem.value = values[0];
	} else {
		elem.value = values;
	}
}

function commit<TValue>(
	renderer: Renderer<TValue>,
	elem: Element<any, TValue>,
): Promise<undefined> | undefined {
	const oldValue = elem.value;
	prepareCommit(elem);
	if (typeof elem.tag === "function") {
		if (isEventTarget(elem.value)) {
			elem.ctx!.setDelegate(elem.value);
		} else if (Array.isArray(elem.value)) {
			elem.ctx!.setDelegates(elem.value);
		}
	} else if (elem.tag !== Fragment) {
		try {
			if (elem.iterator === undefined) {
				const value = getIntrinsic(renderer, elem.tag)(elem);
				if (!isIteratorOrAsyncIterator(value)) {
					if (oldValue === value) {
						elem.flags &= ~flags.Dirty;
					} else {
						elem.flags |= flags.Dirty;
					}

					elem.value = value;
					return;
				}

				elem.iterator = value;
			}

			const iteration = (elem.iterator as Iterator<TValue>).next();
			if (oldValue === iteration.value) {
				elem.flags &= ~flags.Dirty;
			} else {
				elem.flags |= flags.Dirty;
			}

			elem.value = iteration.value;
			if (iteration.done) {
				elem.flags |= flags.Finished;
			}
		} catch (err) {
			if (elem.parent === undefined) {
				throw err;
			}

			return handle(renderer, elem.parent, err);
		}
	}

	if (elem.schedules !== undefined && elem.schedules.size > 0) {
		// We have to clear the schedules set before calling each callback,
		// because otherwise a callback which refreshes the component would cause
		// a stack overflow.
		const callbacks = Array.from(elem.schedules);
		elem.schedules.clear();
		for (const callback of callbacks) {
			callback(elem.value);
		}
	}

	if (elem.ref !== undefined) {
		elem.ref(elem.value);
	}

	if (
		!(elem.flags & flags.Updating) &&
		elem.flags & flags.Dirty &&
		elem.parent !== undefined
	) {
		commit(renderer, elem.parent);
	}

	elem.flags &= ~flags.Updating;
}

function unmount<TValue>(
	renderer: Renderer<TValue>,
	elem: Element,
	dirty = true,
): Promise<undefined> | undefined {
	if (elem.cleanups !== undefined) {
		for (const cleanup of elem.cleanups) {
			cleanup(elem.value);
		}

		elem.cleanups = undefined;
	}

	if (elem.flags & flags.Unmounted) {
		return;
	}

	// setting unmounted flag here is necessary because of some kind of race condition
	elem.flags |= flags.Unmounted;
	if (!(elem.flags & flags.Finished)) {
		elem.flags |= flags.Finished;
		if (elem.tag === Fragment) {
			// pass
		} else if (typeof elem.tag === "function") {
			if (elem.onProps !== undefined) {
				elem.onProps(elem.props!);
				elem.onProps = undefined;
			}

			elem.ctx!.clearEventListeners();
			if (elem.iterator !== undefined && elem.iterator.return) {
				let iteration: IteratorResult<Child> | Promise<IteratorResult<Child>>;
				try {
					iteration = (elem.iterator as ChildIterator).return!();
				} catch (err) {
					return handle(renderer, elem.parent!, err);
				}

				if (isPromiseLike(iteration)) {
					return iteration.then(
						() => {
							elem.flags &= ~flags.Updating;
							unmountChildren(renderer, elem, dirty);
							return undefined; // void :(
						},
						(err) => handle(renderer, elem.parent!, err),
					);
				}
			}
		} else {
			if (dirty) {
				elem.flags |= flags.Removing;
			} else {
				elem.flags &= ~flags.Removing;
			}

			dirty = elem.tag === Portal;
			if (elem.iterator !== undefined && elem.iterator.return) {
				try {
					elem.iterator.return();
				} catch (err) {
					if (elem.parent === undefined) {
						throw err;
					}

					return handle(renderer, elem.parent, err);
				}
			}
		}
	}

	elem.flags &= ~flags.Updating;
	unmountChildren(renderer, elem, dirty);
}

function unmountChildren<TValue>(
	renderer: Renderer<TValue>,
	elem: Element,
	dirty: boolean,
): void {
	const children =
		elem.children === "undefined"
			? []
			: Array.isArray(elem.children)
			? elem.children
			: [elem.children];
	for (const child of children) {
		if (typeof child === "object") {
			unmount(renderer, child, dirty);
		}
	}
}

function handle<TValue>(
	renderer: Renderer<TValue>,
	elem: Element,
	reason: unknown,
): Promise<undefined> | undefined {
	elem.flags |= flags.Handling;
	// helps avoid deadlocks
	if (elem.onProps !== undefined) {
		elem.onProps(elem.props!);
		elem.onProps = undefined;
	}

	if (
		typeof elem.tag === "function" &&
		elem.iterator !== undefined &&
		elem.iterator.throw !== undefined &&
		!(elem.flags & flags.Finished)
	) {
		let iteration: IteratorResult<Child> | Promise<IteratorResult<Child>>;
		try {
			iteration = (elem.iterator as ChildIterator).throw!(reason);
		} catch (err) {
			return handle(renderer, elem.parent!, err);
		}

		if (isPromiseLike(iteration)) {
			return iteration.then(
				(iteration) => {
					if (iteration.done) {
						elem.flags |= flags.Finished;
					}

					return updateChildren(renderer, elem, iteration.value, elem.ctx);
				},
				(err) => {
					return handle(renderer, elem.parent!, err);
				},
			);
		}

		if (iteration.done) {
			elem.flags |= flags.Finished;
		}

		return updateChildren(renderer, elem, iteration.value, elem.ctx);
	} else if (elem.parent === undefined) {
		throw reason;
	}

	return handle(renderer, elem.parent, reason);
}

function schedule(elem: Element, callback: (value: unknown) => unknown): void {
	if (elem.schedules === undefined) {
		elem.schedules = new Set();
	}

	elem.schedules.add(callback);
}

function cleanup(elem: Element, callback: (value: unknown) => unknown): void {
	if (elem.cleanups === undefined) {
		elem.cleanups = new Set();
	}

	elem.cleanups.add(callback);
}

export interface ProvisionMap {}

export class Context<TProps = any, TValue = any> extends CrankEventTarget {
	renderer: Renderer<TValue>;
	__elem__: Element<Component, TProps>;
	constructor(
		renderer: Renderer<TValue>,
		elem: Element<Component, TProps>,
		parent: Context<TProps> | undefined,
	) {
		super(parent);
		this.renderer = renderer;
		this.__elem__ = elem;
	}

	get<TKey extends keyof ProvisionMap>(key: TKey): ProvisionMap[TKey];
	get(key: unknown): any {
		for (
			let parent: Element<any> | undefined = this.__elem__.parent;
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
		if (this.__elem__.provisions === undefined) {
			this.__elem__.provisions = new Map();
		}

		this.__elem__.provisions.set(key, value);
	}

	get props(): TProps {
		return this.__elem__.props;
	}

	get value(): unknown {
		return this.__elem__.value;
	}

	*[Symbol.iterator](): Generator<TProps> {
		const elem = this.__elem__;
		while (!(elem.flags & flags.Unmounted)) {
			if (elem.flags & flags.Iterating) {
				throw new Error("You must yield for each iteration of this.");
			} else if (elem.flags & flags.AsyncGen) {
				throw new Error("Use for await...of in async generator components.");
			}

			elem.flags |= flags.Iterating;
			yield elem.props!;
		}
	}

	async *[Symbol.asyncIterator](): AsyncGenerator<TProps> {
		const elem = this.__elem__;
		do {
			if (elem.flags & flags.Iterating) {
				throw new Error("You must yield for each iteration of this.");
			} else if (elem.flags & flags.SyncGen) {
				throw new Error("Use for...of in sync generator components.");
			}

			elem.flags |= flags.Iterating;
			if (elem.flags & flags.Available) {
				elem.flags &= ~flags.Available;
				yield elem.props!;
			} else {
				const props = await new Promise<any>(
					(resolve) => (elem.onProps = resolve),
				);
				if (!(elem.flags & flags.Unmounted)) {
					yield props;
				}
			}
		} while (!(elem.flags & flags.Unmounted));
	}

	refresh(): Promise<undefined> | undefined {
		return refresh(this.__elem__);
	}

	schedule(callback: (value: unknown) => unknown): void {
		return schedule(this.__elem__, callback);
	}

	cleanup(callback: (value: unknown) => unknown): void {
		return cleanup(this.__elem__, callback);
	}
}

// Component functions
function refresh(elem: Element<Component>): Promise<undefined> | undefined {
	if (elem.flags & (flags.Stepping | flags.Unmounted)) {
		// TODO: we may want to log warnings when stuff like elem happens
		return;
	}

	if (elem.onProps === undefined) {
		elem.flags |= flags.Available;
	} else {
		elem.onProps(elem.props!);
		elem.onProps = undefined;
	}

	return run(elem);
}

function run(elem: Element<Component>): Promise<undefined> | undefined {
	if (elem.inflightPending === undefined) {
		const [pending, result] = step(elem);
		if (pending !== undefined) {
			elem.inflightPending = pending.finally(() => advance(elem));
		}

		if (result !== undefined) {
			elem.inflightResult = result;
		}

		return result;
	} else if (elem.flags & flags.AsyncGen) {
		return elem.inflightResult;
	} else if (elem.enqueuedPending === undefined) {
		let resolve: (value: Promise<undefined> | undefined) => unknown;
		elem.enqueuedPending = elem.inflightPending
			.then(() => {
				const [pending, result] = step(elem);
				resolve(result);
				return pending;
			})
			.finally(() => advance(elem));
		elem.enqueuedResult = new Promise((resolve1) => (resolve = resolve1));
	}

	return elem.enqueuedResult;
}

function step<TValue>(
	elem: Element<Component, TValue>,
): [Promise<undefined> | undefined, Promise<undefined> | undefined] {
	if (elem.flags & flags.Finished) {
		return [undefined, undefined];
	}

	elem.flags |= flags.Stepping;
	if (elem.iterator === undefined) {
		elem.ctx!.clearEventListeners();
		let value: ChildIterator | PromiseLike<Child> | Child;
		try {
			value = elem.tag.call(elem.ctx!, elem.props!);
		} catch (err) {
			const caught = handle(elem.ctx!.renderer, elem.parent!, err);
			return [undefined, caught];
		}

		if (isIteratorOrAsyncIterator(value)) {
			elem.iterator = value;
		} else if (isPromiseLike(value)) {
			const value1 = upgradePromiseLike(value);
			const pending = value1.then(
				() => undefined,
				() => undefined,
			); // void :(
			const result = value1.then(
				(child) => updateChildren(elem.ctx!.renderer, elem, child, elem.ctx),
				(err) => handle(elem.ctx!.renderer, elem.parent!, err),
			);
			elem.flags &= ~flags.Stepping;
			return [pending, result];
		} else {
			const result = updateChildren(elem.ctx!.renderer, elem, value, elem.ctx);
			elem.flags &= ~flags.Stepping;
			return [undefined, result];
		}
	}

	let oldValue:
		| Promise<Array<TValue | string> | TValue | string | undefined>
		| Array<TValue | string>
		| TValue
		| string
		| undefined;
	if (elem.oldResult === undefined) {
		oldValue = elem.value;
	} else {
		oldValue = elem.oldResult.then(() => elem.value);
		elem.oldResult = undefined;
	}

	let iteration: IteratorResult<Child> | Promise<IteratorResult<Child>>;
	try {
		iteration = (elem.iterator as ChildIterator).next(oldValue);
	} catch (err) {
		const caught = handle(elem.ctx!.renderer, elem.parent!, err);
		return [caught, caught];
	}

	elem.flags &= ~flags.Stepping;
	if (isPromiseLike(iteration)) {
		elem.flags |= flags.AsyncGen;
		iteration = iteration.catch((err) => {
			const caught = handle(elem.ctx!.renderer, elem.parent!, err);
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
			elem.flags &= ~flags.Iterating;
			if (iteration.done) {
				elem.flags |= flags.Finished;
			}

			let result = updateChildren(
				elem.ctx!.renderer,
				elem,
				iteration.value,
				elem.ctx,
			);
			if (isPromiseLike(result)) {
				elem.oldResult = result.catch(() => undefined); // void :(
			}

			return result;
		});

		return [pending, result];
	}

	elem.flags &= ~flags.Iterating;
	elem.flags |= flags.SyncGen;
	if (iteration.done) {
		elem.flags |= flags.Finished;
	}

	const result = updateChildren(
		elem.ctx!.renderer,
		elem,
		iteration.value,
		elem.ctx,
	);
	return [result, result];
}

function advance(elem: Element<Component>): void {
	elem.inflightPending = elem.enqueuedPending;
	elem.inflightResult = elem.enqueuedResult;
	elem.enqueuedPending = undefined;
	elem.enqueuedResult = undefined;
	if (elem.flags & flags.AsyncGen && !(elem.flags & flags.Finished)) {
		run(elem)!.catch((err) => {
			// We catch and rethrow the error to trigger an unhandled promise rejection.
			if (!(elem.flags & flags.Updating)) {
				throw err;
			}
		});
	}
}
