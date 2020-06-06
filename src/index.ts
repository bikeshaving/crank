import {CrankEventTarget} from "./events";
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

type Key = unknown;

type Scope = unknown;

const ElementSigil = Symbol.for("crank.ElementSigil");

export class Element<TTag extends Tag = Tag, TValue = any> {
	$sigil: typeof ElementSigil;
	tag: TTag;
	props: TagProps<TTag>;
	key: Key;
	ref: Function | undefined;
	scope: Scope;
	flags: number;
	parent: Element<Tag, TValue> | undefined;
	_value: Array<TValue | string> | TValue | string | undefined;
	_children: NormalizedChildren;
	_childrenByKey: Map<Key, Element> | undefined;
	_ctx: Context | undefined;
	_iterator: Iterator<TValue> | undefined;
	_onNewValue: ((value: unknown) => unknown) | undefined;
	_onNewResult: ((result?: Promise<undefined>) => unknown) | undefined;
	// TODO: move these to context
	_schedules: Set<(value: unknown) => unknown> | undefined;
	_cleanups: Set<(value: unknown) => unknown> | undefined;
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
		this.flags = flags.Dirty | flags.Moved;
	}

	get childValues(): Array<TValue | string> {
		if (typeof this._value === "undefined") {
			return [];
		} else if (Array.isArray(this._value)) {
			return this._value;
		} else {
			return [this._value];
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

function normalize(child: Child): NormalizedChild {
	if (child == null || typeof child === "boolean") {
		return undefined;
	} else if (typeof child === "string" || isElement(child)) {
		return child;
	} else {
		return child.toString();
	}
}

function schedule(el: Element, callback: (value: unknown) => unknown): void {
	if (typeof el._schedules === "undefined") {
		el._schedules = new Set();
	}

	el._schedules.add(callback);
}

function cleanup(el: Element, callback: (value: unknown) => unknown): void {
	if (typeof el._cleanups === "undefined") {
		el._cleanups = new Set();
	}

	el._cleanups.add(callback);
}

export const Default = Symbol.for("crank.Default");

export const Text = Symbol.for("crank.Text");

export const Scopes = Symbol.for("crank.Scopes");

export type Intrinsic<TValue> = (
	el: Element<any, TValue>,
) => Iterator<TValue> | TValue;

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
	[Raw](el: Element<any, any>): any {
		return el.props.value;
	},
};

export class Renderer<TValue> {
	_env: Environment<TValue>;
	_defaults: Record<string, Intrinsic<TValue>>;
	_scoper: Scoper;
	_cache: WeakMap<object, Element<any, TValue>>;
	constructor(env?: Partial<Environment<TValue>>) {
		this._env = Object.assign({}, defaultEnv);
		this._defaults = {};
		this._scoper = {};
		this._cache = new WeakMap();
		this.extend(env);
	}

	extend(env?: Partial<Environment<TValue>>): void {
		if (env == null) {
			return;
		}

		for (const tag of Object.keys(env)) {
			if (env[tag] != null) {
				this._env[tag] = env[tag]!;
			}
		}

		for (const tag of Object.getOwnPropertySymbols(env)) {
			if (env[tag as any] != null && tag !== Scopes) {
				this._env[tag as any] = env[tag as any]!;
			}
		}

		if (env[Scopes] != null) {
			const scoper = env[Scopes]!;
			for (const tag of Object.keys(scoper)) {
				if (scoper[tag] != null) {
					this._scoper[tag] = scoper[tag]!;
				}
			}

			for (const tag of Object.getOwnPropertySymbols(env)) {
				if (scoper[tag as any] != null) {
					this._scoper[tag as any] = scoper[tag as any]!;
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
			root != null ? this._cache.get(root) : undefined;

		// TODO: what if the we pass two portals with different keys?
		if (oldChild === undefined) {
			mount(this, newChild, undefined, undefined, undefined);
		} else {
			if (oldChild !== newChild) {
				oldChild.props = newChild.props;
				oldChild.ref = newChild.ref;
				newChild = oldChild;
			}
		}

		if (root !== null && typeof root === "object") {
			if (clearing) {
				this._cache.delete(root);
			} else {
				this._cache.set(root, newChild);
			}
		}

		const result = update(this, newChild, undefined);
		if (isPromiseLike(result)) {
			return result.then(() => {
				if (newChild.props.root == null) {
					unmount(this, newChild);
				}

				return newChild._value as TValue;
			});
		}

		if (newChild.props.root == null) {
			unmount(this, newChild);
		}

		return newChild._value as TValue;
	}
}

function getIntrinsic<TValue>(
	renderer: Renderer<TValue>,
	tag: string | symbol,
): Intrinsic<TValue> {
	if (typeof renderer._env[tag as any] === "function") {
		return renderer._env[tag as any];
	} else if (typeof renderer._defaults[tag as any] === "function") {
		return renderer._defaults[tag as any];
	}

	const intrinsic = renderer._env[Default]!(tag);
	renderer._defaults[tag as any] = intrinsic;
	return intrinsic;
}

function getText(renderer: Renderer<any>, text: string): string {
	if (typeof renderer._env[Text] === "function") {
		return renderer._env[Text]!(text);
	}

	return text;
}

function getScope(
	renderer: Renderer<any>,
	tag: string | symbol,
	props: any,
): Scope {
	if (tag in renderer._scoper) {
		if (typeof renderer._scoper[tag as any] === "function") {
			return (renderer._scoper[tag as any] as Function)(props);
		}

		return renderer._scoper[tag as any];
	} else if (typeof renderer._scoper[Default] === "function") {
		return renderer._scoper[Default]!(tag, props);
	}
}

function mount<TTag extends Tag, TValue>(
	renderer: Renderer<TValue>,
	el: Element<TTag, TValue>,
	parent: Element<Tag, TValue> | undefined,
	scope: Scope,
	ctx: Context<TagProps<TTag>, TValue> | undefined,
): Element<TTag, TValue> {
	if (el.flags & flags.Mounted) {
		el = new Element(el.tag, el.props, el.key, el.ref);
	}

	el.flags |= flags.Mounted;
	el.parent = parent;
	el.scope = scope;
	if (typeof el.tag === "function") {
		el._ctx = new Context(renderer, el as Element<Component>, ctx);
	}

	return el;
}

function update<TValue>(
	renderer: Renderer<TValue>,
	el: Element<Tag, TValue>,
	ctx: Context<any, TValue> | undefined,
): Promise<undefined> | undefined {
	el.flags |= flags.Updating;
	if (typeof el._ctx === "object") {
		return el._ctx.refresh();
	}

	return updateChildren(renderer, el, el.props.children, ctx);
}

function updateChildren<TValue>(
	renderer: Renderer<TValue>,
	el: Element<Tag, TValue>,
	children: Children,
	ctx: Context<any, TValue> | undefined,
): Promise<undefined> | undefined {
	let childScope: Scope;
	if (typeof el.tag === "function") {
		if (isNonStringIterable(children)) {
			children = createElement(Fragment, null, children);
		}
	} else if (el.tag !== Fragment) {
		childScope = getScope(renderer, el.tag, el.props);
	}

	const handling = el.flags & flags.Handling;
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
		if (Array.isArray(el._children)) {
			oldChild = el._children[i];
		} else if (i === 0) {
			oldChild = el._children;
		}

		// TODO: reassigning newChild does not narrow to NormalizedChild
		let newChild1: NormalizedChild;
		if (isNonStringIterable(newChild)) {
			newChild1 = createElement(Fragment, null, newChild);
		} else {
			newChild1 = normalize(newChild);
		}

		if (typeof newChild1 === "object" && typeof newChild1.key !== "undefined") {
			const oldChild1 =
				el._childrenByKey && el._childrenByKey.get(newChild1.key);
			if (oldChild1 === undefined) {
				oldChild = undefined;
			} else {
				el._childrenByKey!.delete(newChild1.key);
				if (oldChild === oldChild1) {
					i++;
				} else {
					oldChild = oldChild1;
					oldChild.flags |= flags.Moved;
				}
			}
		} else {
			if (typeof oldChild === "object" && typeof oldChild.key !== "undefined") {
				if (Array.isArray(el._children)) {
					while (
						typeof oldChild === "object" &&
						typeof oldChild.key !== "undefined"
					) {
						i++;
						oldChild = el._children[i];
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
					newChild1 = mount(renderer, newChild1, el, childScope, ctx);
					result1 = update(renderer, newChild1, ctx);
					if (result1 === undefined) {
						unmount(renderer, oldChild);
					} else {
						// storing variables for callback closures
						newChild1._value = oldChild._value;
						const oldChild1 = oldChild;
						const newChild2 = newChild1;
						let fulfilled = false;
						result1.then(() => {
							fulfilled = true;
							unmount(renderer, oldChild1);
						});
						oldChild._onNewValue = (value) => {
							if (!fulfilled) {
								newChild2._value = value;
							}
						};
					}
				}
			} else {
				newChild1 = mount(renderer, newChild1, el, childScope, ctx);
				result1 = update(renderer, newChild1, ctx);
				if (result1 !== undefined) {
					newChild1._value = oldChild;
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
		if (typeof newChild1 === "object" && typeof newChild1.key !== "undefined") {
			if (childrenByKey === undefined) {
				childrenByKey = new Map();
			}

			if (!childrenByKey.has(newChild1.key)) {
				childrenByKey.set(newChild1.key, newChild1);
			}
		}
	}

	if (handling !== (el.flags & flags.Handling)) {
		el.flags &= ~flags.Handling;
		return;
	}

	if (typeof el._children !== "undefined") {
		if (Array.isArray(el._children)) {
			for (; i < el._children.length; i++) {
				const oldChild = el._children[i];
				if (
					typeof oldChild === "object" &&
					typeof oldChild.key === "undefined"
				) {
					unmount(renderer, oldChild);
				}
			}
		} else if (
			i === 0 &&
			typeof el._children === "object" &&
			typeof el._children.key === "undefined"
		) {
			unmount(renderer, el._children);
		}
	}

	// TODO: likely where logic for asynchronous unmounting will go
	if (typeof el._childrenByKey === "object") {
		for (const child of el._childrenByKey.values()) {
			unmount(renderer, child);
		}
	}

	el._children = children1;
	el._childrenByKey = childrenByKey;

	if (typeof el._onNewResult === "function") {
		el._onNewResult(result);
		el._onNewResult = undefined;
	}

	if (result !== undefined) {
		result = result.then(() => commit(renderer, el));
		const newResult = new Promise<undefined>(
			(resolve) => (el._onNewResult = resolve),
		);

		return Promise.race([result, newResult]);
	}

	return commit(renderer, el);
}

function prepareCommit<TValue>(el: Element<Tag, TValue>): void {
	if (typeof el._children === "undefined") {
		el.flags |= flags.Dirty;
		el._value = undefined;
		return;
	} else if (!Array.isArray(el._children)) {
		const child = el._children;
		if (typeof child === "object") {
			if (child.flags & (flags.Dirty | flags.Moved)) {
				el.flags |= flags.Dirty;
			}

			child.flags &= ~(flags.Dirty | flags.Moved);
		} else {
			el.flags |= flags.Dirty;
		}

		if (typeof child === "object") {
			if (child.tag === Portal) {
				el._value = undefined;
			} else {
				el._value = child._value;
			}
		} else {
			el._value = child;
		}

		return;
	}

	let buffer: string | undefined;
	let values: Array<TValue | string> = [];
	for (let i = 0; i < el._children.length; i++) {
		const child = el._children[i];
		if (typeof child === "object") {
			if (child.flags & (flags.Dirty | flags.Moved)) {
				el.flags |= flags.Dirty;
			}

			child.flags &= ~(flags.Dirty | flags.Moved);
		} else {
			el.flags |= flags.Dirty;
		}

		if (typeof child === "object" && child.tag === Portal) {
			continue;
		}

		const value = typeof child === "object" ? child._value : child;
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
		el.flags |= flags.Dirty;
		el._value = undefined;
	} else if (values.length === 1) {
		el._value = values[0];
	} else {
		el._value = values;
	}
}

function commit<TValue>(
	renderer: Renderer<TValue>,
	el: Element<any, TValue>,
): Promise<undefined> | undefined {
	const oldValue = el._value;
	prepareCommit(el);
	if (typeof el._ctx === "object") {
		el._ctx.setDelegates(Array.isArray(el._value) ? el._value : [el._value]);
	} else if (el.tag !== Fragment) {
		try {
			if (typeof el._iterator === "undefined") {
				const value = getIntrinsic(renderer, el.tag)(el);
				if (!isIteratorOrAsyncIterator(value)) {
					if (oldValue === value) {
						el.flags &= ~flags.Dirty;
					} else {
						el.flags |= flags.Dirty;
					}

					el._value = value;
					return;
				}

				el._iterator = value;
			}

			const iteration = el._iterator.next();
			if (oldValue === iteration.value) {
				el.flags &= ~flags.Dirty;
			} else {
				el.flags |= flags.Dirty;
			}

			el._value = iteration.value;
			if (iteration.done) {
				el.flags |= flags.Finished;
			}
		} catch (err) {
			if (typeof el.parent === "undefined") {
				throw err;
			}

			return handle(renderer, el.parent, err);
		}
	}

	if (typeof el._onNewValue === "function") {
		el._onNewValue(el._value);
		el._onNewValue = undefined;
	}

	if (typeof el._schedules === "object" && el._schedules.size > 0) {
		// We have to clear the schedules set before calling each callback,
		// because otherwise a callback which refreshes the component would cause
		// a stack overflow.
		const callbacks = Array.from(el._schedules);
		el._schedules.clear();
		for (const callback of callbacks) {
			callback(el._value);
		}
	}

	if (el.ref !== undefined) {
		el.ref(el._value);
	}

	if (
		!(el.flags & flags.Updating) &&
		el.flags & flags.Dirty &&
		el.parent !== undefined
	) {
		commit(renderer, el.parent);
	}

	el.flags &= ~flags.Updating;
}

function unmount<TValue>(
	renderer: Renderer<TValue>,
	el: Element,
	dirty = true,
): Promise<undefined> | undefined {
	if (typeof el._cleanups === "object") {
		for (const cleanup of el._cleanups) {
			cleanup(el._value);
		}

		el._cleanups = undefined;
	}

	if (el.flags & flags.Unmounted) {
		return;
	}

	// setting unmounted flag here is necessary because of some kind of race condition
	el.flags |= flags.Unmounted;
	if (!(el.flags & flags.Finished)) {
		el.flags |= flags.Finished;
		if (typeof el._ctx === "object") {
			el._ctx.clearEventListeners();
			if (typeof el._ctx._onProps === "function") {
				el._ctx._onProps(el.props);
				el._ctx._onProps = undefined;
			}

			if (
				typeof el._ctx._iterator === "object" &&
				typeof el._ctx._iterator.return === "function"
			) {
				let iteration: IteratorResult<Child> | Promise<IteratorResult<Child>>;
				try {
					iteration = el._ctx._iterator.return();
				} catch (err) {
					return handle(renderer, el.parent!, err);
				}

				if (isPromiseLike(iteration)) {
					return iteration.then(
						() => {
							el.flags &= ~flags.Updating;
							unmountChildren(renderer, el, dirty);
							return undefined; // void :(
						},
						(err) => handle(renderer, el.parent!, err),
					);
				}
			}
		} else if (el.tag !== Fragment) {
			if (dirty) {
				el.flags |= flags.Removing;
			} else {
				el.flags &= ~flags.Removing;
			}

			dirty = el.tag === Portal;
			if (
				typeof el._iterator === "object" &&
				typeof el._iterator.return === "function"
			) {
				try {
					el._iterator.return();
				} catch (err) {
					if (typeof el.parent === "undefined") {
						throw err;
					}

					return handle(renderer, el.parent, err);
				}
			}
		}
	}

	el.flags &= ~flags.Updating;
	unmountChildren(renderer, el, dirty);
}

function unmountChildren<TValue>(
	renderer: Renderer<TValue>,
	el: Element,
	dirty: boolean,
): void {
	const children =
		el._children === "undefined"
			? []
			: Array.isArray(el._children)
			? el._children
			: [el._children];
	for (const child of children) {
		if (typeof child === "object") {
			unmount(renderer, child, dirty);
		}
	}
}

// TODO: do handling at the level of Context
function handle<TValue>(
	renderer: Renderer<TValue>,
	el: Element,
	reason: unknown,
): Promise<undefined> | undefined {
	el.flags |= flags.Handling;
	// helps avoid deadlocks
	if (typeof el._ctx === "object" && typeof el._ctx._onProps === "function") {
		el._ctx._onProps(el.props!);
		el._ctx._onProps = undefined;
	}

	if (
		!(el.flags & flags.Finished) &&
		typeof el._ctx === "object" &&
		typeof el._ctx._iterator === "object" &&
		typeof el._ctx._iterator.throw === "function"
	) {
		let iteration: IteratorResult<Child> | Promise<IteratorResult<Child>>;
		try {
			iteration = el._ctx._iterator.throw!(reason);
		} catch (err) {
			return handle(renderer, el.parent!, err);
		}

		if (isPromiseLike(iteration)) {
			return iteration.then(
				(iteration) => {
					if (iteration.done) {
						el.flags |= flags.Finished;
					}

					return updateChildren(renderer, el, iteration.value, el._ctx);
				},
				(err) => {
					return handle(renderer, el.parent!, err);
				},
			);
		}

		if (iteration.done) {
			el.flags |= flags.Finished;
		}

		return updateChildren(renderer, el, iteration.value, el._ctx);
	} else if (typeof el.parent === "undefined") {
		throw reason;
	}

	return handle(renderer, el.parent, reason);
}

export interface ProvisionMap {}

export class Context<TProps = any, TValue = any> extends CrankEventTarget {
	protected parent: Context<any, TValue> | undefined;
	renderer: Renderer<TValue>;
	_el: Element<Component, TProps>;
	_iterator: ChildIterator | undefined;
	_provisions: Map<unknown, unknown> | undefined;
	_onProps: ((props: any) => unknown) | undefined;
	_oldResult: Promise<undefined> | undefined;
	_inflightPending: Promise<undefined> | undefined;
	_enqueuedPending: Promise<undefined> | undefined;
	_inflightResult: Promise<undefined> | undefined;
	_enqueuedResult: Promise<undefined> | undefined;
	constructor(
		renderer: Renderer<TValue>,
		el: Element<Component, TProps>,
		parent: Context<TProps> | undefined,
	) {
		super(parent);
		this.parent = parent;
		this.renderer = renderer;
		this._el = el;
	}

	get<TKey extends keyof ProvisionMap>(key: TKey): ProvisionMap[TKey];
	get(key: unknown): any {
		for (
			let parent = this.parent;
			parent !== undefined;
			parent = parent.parent
		) {
			if (
				typeof parent._provisions === "object" &&
				parent._provisions.has(key)
			) {
				return parent._provisions.get(key)!;
			}
		}
	}

	set<TKey extends keyof ProvisionMap>(
		key: TKey,
		value: ProvisionMap[TKey],
	): void;
	set(key: unknown, value: any): void {
		if (typeof this._provisions === "undefined") {
			this._provisions = new Map();
		}

		this._provisions.set(key, value);
	}

	get props(): TProps {
		return this._el.props;
	}

	get value(): unknown {
		return this._el._value;
	}

	*[Symbol.iterator](): Generator<TProps> {
		const el = this._el;
		while (!(el.flags & flags.Unmounted)) {
			if (el.flags & flags.Iterating) {
				throw new Error("You must yield for each iteration of this.");
			} else if (el.flags & flags.AsyncGen) {
				throw new Error("Use for await...of in async generator components.");
			}

			el.flags |= flags.Iterating;
			yield el.props!;
		}
	}

	async *[Symbol.asyncIterator](): AsyncGenerator<TProps> {
		const el = this._el;
		do {
			if (el.flags & flags.Iterating) {
				throw new Error("You must yield for each iteration of this.");
			} else if (el.flags & flags.SyncGen) {
				throw new Error("Use for...of in sync generator components.");
			}

			el.flags |= flags.Iterating;
			if (el.flags & flags.Available) {
				el.flags &= ~flags.Available;
				yield el.props;
			} else {
				const props = await new Promise<TProps>(
					(resolve) => (this._onProps = resolve),
				);
				if (!(el.flags & flags.Unmounted)) {
					yield props;
				}
			}
		} while (!(el.flags & flags.Unmounted));
	}

	refresh(): Promise<undefined> | undefined {
		const el = this._el;
		if (el.flags & (flags.Stepping | flags.Unmounted)) {
			// TODO: we may want to log warnings when stuff like el happens
			return;
		}

		if (typeof this._onProps === "function") {
			this._onProps(el.props!);
			this._onProps = undefined;
		} else {
			el.flags |= flags.Available;
		}

		return run(this);
	}

	schedule(callback: (value: unknown) => unknown): void {
		return schedule(this._el, callback);
	}

	cleanup(callback: (value: unknown) => unknown): void {
		return cleanup(this._el, callback);
	}
}

function run(ctx: Context): Promise<undefined> | undefined {
	const el = ctx._el;
	if (typeof ctx._inflightPending === "undefined") {
		const [pending, result] = step(ctx);
		if (pending !== undefined) {
			ctx._inflightPending = pending.finally(() => advance(ctx));
		}

		if (result !== undefined) {
			ctx._inflightResult = result;
		}

		return result;
	} else if (el.flags & flags.AsyncGen) {
		return ctx._inflightResult;
	} else if (typeof ctx._enqueuedPending === "undefined") {
		let resolve: (value: Promise<undefined> | undefined) => unknown;
		ctx._enqueuedPending = ctx._inflightPending
			.then(() => {
				const [pending, result] = step(ctx);
				resolve(result);
				return pending;
			})
			.finally(() => advance(ctx));
		ctx._enqueuedResult = new Promise((resolve1) => (resolve = resolve1));
	}

	return ctx._enqueuedResult;
}

function step<TValue>(
	ctx: Context<any, TValue>,
): [Promise<undefined> | undefined, Promise<undefined> | undefined] {
	const el = ctx._el;
	if (el.flags & flags.Finished) {
		return [undefined, undefined];
	}

	el.flags |= flags.Stepping;
	if (typeof ctx._iterator === "undefined") {
		ctx.clearEventListeners();
		let value: ChildIterator | PromiseLike<Child> | Child;
		try {
			value = el.tag.call(ctx, el.props!);
		} catch (err) {
			const caught = handle(ctx.renderer, el.parent!, err);
			return [undefined, caught];
		}

		if (isIteratorOrAsyncIterator(value)) {
			ctx._iterator = value;
		} else if (isPromiseLike(value)) {
			const value1 = upgradePromiseLike(value);
			const pending = value1.then(
				() => undefined,
				() => undefined,
			); // void :(
			const result = value1.then(
				(child) => updateChildren(ctx.renderer, el, child, ctx),
				(err) => handle(ctx.renderer, el.parent!, err),
			);
			el.flags &= ~flags.Stepping;
			return [pending, result];
		} else {
			const result = updateChildren(ctx.renderer, el, value, ctx);
			el.flags &= ~flags.Stepping;
			return [undefined, result];
		}
	}

	let oldValue:
		| Promise<Array<TValue | string> | TValue | string | undefined>
		| Array<TValue | string>
		| TValue
		| string
		| undefined;
	if (typeof ctx._oldResult === "object") {
		oldValue = ctx._oldResult.then(
			() => el._value,
			() => el._value,
		);
		ctx._oldResult = undefined;
	} else {
		oldValue = el._value;
	}

	let iteration: IteratorResult<Child> | Promise<IteratorResult<Child>>;
	try {
		iteration = ctx._iterator.next(oldValue);
	} catch (err) {
		const caught = handle(ctx.renderer, el.parent!, err);
		return [caught, caught];
	}

	el.flags &= ~flags.Stepping;
	if (isPromiseLike(iteration)) {
		el.flags |= flags.AsyncGen;
		iteration = iteration.catch((err) => {
			const caught = handle(ctx.renderer, el.parent!, err);
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
			el.flags &= ~flags.Iterating;
			if (iteration.done) {
				el.flags |= flags.Finished;
			}

			let result = updateChildren(ctx.renderer, el, iteration.value, ctx);
			if (result !== undefined) {
				ctx._oldResult = result;
			}

			return result;
		});

		return [pending, result];
	}

	el.flags &= ~flags.Iterating;
	el.flags |= flags.SyncGen;
	if (iteration.done) {
		el.flags |= flags.Finished;
	}

	const result = updateChildren(ctx.renderer, el, iteration.value, ctx);
	return [result, result];
}

function advance(ctx: Context): void {
	const el = ctx._el;
	ctx._inflightPending = ctx._enqueuedPending;
	ctx._inflightResult = ctx._enqueuedResult;
	ctx._enqueuedPending = undefined;
	ctx._enqueuedResult = undefined;
	if (el.flags & flags.AsyncGen && !(el.flags & flags.Finished)) {
		run(ctx)!.catch((err) => {
			// We catch and rethrow the error to trigger an unhandled promise rejection.
			if (!(el.flags & flags.Updating)) {
				throw err;
			}
		});
	}
}
