// TODO: is there a way to define this non globally?
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

/* eslint-disable no-console */
const consoleError =
	typeof console !== "undefined" && typeof console.error === "function"
		? console.error.bind(console)
		: () => {};
/* eslint-enable no-console */

// FLAGS
// TODO: write an explanation for each of these flags
const Updating = 1 << 0;
const Stepping = 1 << 1;
const Iterating = 1 << 2;
const Available = 1 << 3;
const Finished = 1 << 4;
const Unmounted = 1 << 5;
const SyncGen = 1 << 6;
const AsyncGen = 1 << 7;

// UTILITY FUNCTIONS
function isPromiseLike(value: any): value is PromiseLike<any> {
	return value != null && typeof value.then === "function";
}

function upgradePromiseLike<T>(value: PromiseLike<T>): Promise<T> {
	if (!(value instanceof Promise)) {
		return Promise.resolve(value);
	}

	return value;
}

function isIterable(value: any): value is Iterable<any> {
	return value != null && typeof value[Symbol.iterator] === "function";
}

type NonStringIterable<T> = Iterable<T> & object;

function isNonStringIterable(value: any): value is NonStringIterable<any> {
	return typeof value !== "string" && isIterable(value);
}

function isIteratorLike(
	value: any,
): value is Iterator<any> | AsyncIterator<any> {
	return value != null && typeof value.next === "function";
}

function arrayify<T>(value: Iterable<T> | T | undefined): Array<T> {
	if (value === undefined) {
		return [];
	} else if (Array.isArray(value)) {
		return value;
	} else if (isNonStringIterable(value)) {
		return Array.from(value);
	} else {
		return [value];
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

export type FunctionComponent<TProps = any> = (
	this: Context<TProps>,
	props: TProps,
) => PromiseLike<Child> | Child;

export type ChildIterator<TNext = any> =
	| Iterator<Children, Children, TNext>
	| AsyncIterator<Children, Children, TNext>;

export type ChildGenerator<TNext = any> =
	| Generator<Children, Children, TNext>
	| AsyncGenerator<Children, Children, TNext>;

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

// SPECIAL TAGS
// TODO: We assert symbol tags as any because typescript support for symbol tags in JSX does not exist yet.
// https://github.com/microsoft/TypeScript/issues/38367
// TODO: Maybe we can just make these strings??? Fragment can be the empty string
export const Fragment = Symbol.for("crank.Fragment") as any;
export type Fragment = typeof Fragment;

export const Copy = Symbol.for("crank.Copy") as any;
export type Copy = typeof Copy;

export const Portal = Symbol.for("crank.Portal") as any;
export type Portal = typeof Portal;

export const Raw = Symbol.for("crank.Raw") as any;
export type Raw = typeof Raw;

// WHAT ARE WE DOING TO THE CHILDREN
type NarrowedChild = Element | string | undefined;

// https://overreacted.io/why-do-react-elements-have-typeof-property/
const ElementSymbol = Symbol.for("crank.Element");

export class Element<TTag extends Tag = Tag> {
	// https://overreacted.io/why-do-react-elements-have-typeof-property/
	$$typeof: typeof ElementSymbol;
	tag: TTag;
	props: TagProps<TTag>;
	key: Key;
	ref: Function | undefined;
	_value: any;
	_ctx: Context<TagProps<TTag>> | undefined;
	_children: Array<NarrowedChild> | NarrowedChild;
	// TODO: we probably need to store promises on the element so that Copy elements can access them and not return values before the element has committed
	_onNewValue: Function | undefined;
	constructor(
		tag: TTag,
		props: TagProps<TTag>,
		key: Key,
		ref: Function | undefined,
	) {
		this.$$typeof = ElementSymbol;
		this.tag = tag;
		this.props = props;
		this.key = key;
		this.ref = ref;
	}

	static clone<TTag extends Tag>(el: Element<TTag>): Element<TTag> {
		return new Element(el.tag, el.props, el.key, el.ref);
	}
}

export function isElement(value: any): value is Element {
	return value != null && value.$$typeof === ElementSymbol;
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
	let key: Key;
	let ref: Function | undefined;
	const props1 = {} as TagProps<TTag>;
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

function narrow(child: Children): NarrowedChild {
	if (child == null || typeof child === "boolean") {
		return undefined;
	} else if (typeof child === "string" || isElement(child)) {
		return child;
	} else if (isIterable(child)) {
		return createElement(Fragment, null, child);
	} else {
		return child.toString();
	}
}

function normalize<T>(values: Array<ElementValue<T>>): Array<T | string> {
	const result: Array<T | string> = [];
	let buffer: string | undefined;
	for (const value of values) {
		if (typeof value === "undefined") {
			// pass
		} else if (typeof value === "string") {
			buffer = buffer === undefined ? value : buffer + value;
		} else if (!Array.isArray(value)) {
			if (buffer !== undefined) {
				result.push(buffer);
				buffer = undefined;
			}

			result.push(value);
		} else {
			for (const value1 of value) {
				if (typeof value1 === "undefined") {
					// pass
				} else if (typeof value1 === "string") {
					buffer = buffer === undefined ? value1 : buffer + value1;
				} else {
					if (buffer !== undefined) {
						result.push(buffer);
						buffer = undefined;
					}

					result.push(value1);
				}
			}
		}
	}

	if (buffer !== undefined) {
		result.push(buffer);
	}

	return result;
}

export type ElementValue<T> = Array<T | string> | T | string | undefined;

type Scope = unknown;

// TODO: explain
const RaceLostSymbol = Symbol.for("crank.RaceLost");

function inUse(el: Element): boolean {
	return (
		typeof el._value === "undefined" &&
		typeof el._ctx === "undefined" &&
		typeof el._children === "undefined"
	);
}

function getChildrenByKey(children: Array<NarrowedChild>): Map<Key, Element> {
	const childrenByKey = new Map<Key, Element>();
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (typeof child === "object" && typeof child.key !== "undefined") {
			childrenByKey.set(child.key, child);
		}
	}

	return childrenByKey;
}

export abstract class Renderer<TNode, TResult = ElementValue<TNode>> {
	_cache: WeakMap<object, Element<Portal>>;
	constructor() {
		this._cache = new WeakMap();
	}

	// TODO: allow parent contexts from a different renderer to be passed into here
	render(children: Children, root?: unknown): Promise<TResult> | TResult {
		let portal: Element<Portal> | undefined;
		if (typeof root === "object" && root !== null) {
			portal = this._cache.get(root);
		}

		if (portal === undefined) {
			portal = createElement(Portal, {children, root});
			// TODO: delete (not setting _value is causing a test to fail)
			portal._value = root;
			if (typeof root === "object" && root !== null && children != null) {
				this._cache.set(root, portal);
			}
		} else {
			portal.props = {children, root};
			if (typeof root === "object" && root !== null && children == null) {
				this._cache.delete(root);
			}
		}

		const result = this._update(portal, portal, undefined, undefined) as
			| Promise<ElementValue<TNode>>
			| ElementValue<TNode>;
		if (isPromiseLike(result)) {
			return result.then(() => {
				const value = this.read(this._getChildValueOrValues(portal!));
				if (root == null) {
					this._unmount(portal!, portal!, undefined);
				}

				return value;
			});
		}

		const value = this.read(this._getChildValueOrValues(portal));
		if (root == null) {
			this._unmount(portal, portal, undefined);
		}

		return value;
	}

	scope<TTag extends string | symbol>(
		_tag: TTag,
		_props: TagProps<TTag>,
		scope: Scope | undefined,
	): Scope | undefined {
		return scope;
	}

	escape(text: string, _scope: Scope): string {
		return text;
	}

	read(value: ElementValue<TNode>): TResult {
		return (value as unknown) as TResult;
	}

	abstract create<TTag extends string | symbol>(
		tag: TTag,
		props: TagProps<TTag>,
		scope: Scope,
	): TNode;

	abstract parse(_text: string, _scope: Scope): TNode;

	abstract patch<TTag extends string | symbol>(
		tag: TTag,
		value: TNode,
		props: TagProps<TTag>,
		scope: Scope,
	): unknown;

	abstract arrange(
		tag: string | symbol,
		parent: TNode,
		childValues: Array<TNode | string>,
	): unknown;

	// TODO: destroy() a method which is called for every host node when it is unmounted

	// TODO: complete() a method which is called once at the end of every independent rendering or refresh or async generator component update

	// PRIVATE METHODS
	_getChildValues(el: Element): Array<TNode | string> {
		let result: Array<TNode | string> = [];
		for (const child of arrayify(el._children)) {
			if (child === undefined) {
				// pass
			} else if (typeof child === "string") {
				result.push(child);
			} else if (typeof child.tag === "function" || child.tag === Fragment) {
				result = result.concat(this._getChildValues(child));
			} else if (child.tag !== Portal) {
				// Portals have a value but are opaque to their parents
				result.push(child._value);
			}
		}

		return result;
	}

	_getChildValueOrValues(el: Element): ElementValue<TNode> {
		const childValues = this._getChildValues(el);
		return childValues.length > 1 ? childValues : childValues[0];
	}

	_getValue(el: Element): ElementValue<TNode> {
		if (typeof el.tag === Portal) {
			return undefined;
		} else if (typeof el.tag !== "function" && el.tag !== Fragment) {
			return el._value;
		}

		return this._getChildValueOrValues(el);
	}

	_mount(
		el: Element,
		arranger: Element<string | symbol>,
		ctx: Context<unknown, TResult> | undefined,
		scope: Scope,
	): Promise<ElementValue<TNode>> | ElementValue<TNode> {
		if (typeof el.tag === "function") {
			el._ctx = new Context(
				this,
				el as Element<Component>,
				ctx,
				scope,
				arranger,
			);

			return el._ctx._update() as
				| Promise<ElementValue<TNode>>
				| ElementValue<TNode>;
		} else if (el.tag === Raw) {
			return this._commit(el, scope, []);
		} else if (el.tag === Portal) {
			el._value = el.props.root;
		} else if (el.tag !== Fragment) {
			el._value = this.create(el.tag as any, el.props, scope);
		}

		return this._mountChildren(el, arranger, ctx, scope, el.props.children);
	}

	_mountChildren(
		el: Element,
		arranger: Element<string | symbol>,
		ctx: Context<unknown, TResult> | undefined,
		scope: Scope,
		children: Children,
	): Promise<ElementValue<TNode>> | ElementValue<TNode> {
		if (typeof el.tag !== "function" && el.tag !== Fragment) {
			arranger = el as Element<string | symbol>;
			scope = this.scope(el.tag as string | symbol, el.props, scope);
		}

		const results: Array<
			Promise<ElementValue<TNode>> | ElementValue<TNode>
		> = [];
		let async = false;
		const childArray = arrayify(children);
		const narrowedChildren: Array<NarrowedChild> = [];
		for (let i = 0; i < childArray.length; i++) {
			let child = narrow(childArray[i]);
			if (typeof child === "object") {
				if (child.tag !== Copy) {
					if (inUse(child)) {
						child = Element.clone(child);
					}
					const result = this._mount(child, arranger, ctx, scope);
					if (!async && isPromiseLike(result)) {
						async = true;
					}

					results.push(result);
				}
			} else {
				if (typeof child === "string") {
					child = this.escape(child, scope);
				}

				results.push(child);
			}

			narrowedChildren.push(child);
		}

		el._children =
			narrowedChildren.length > 1 ? narrowedChildren : narrowedChildren[0];

		return this._commitResults(el, arranger, ctx, scope, results, [], async);
	}

	_update(
		el: Element,
		arranger: Element<string | symbol>,
		ctx: Context<unknown, TResult> | undefined,
		scope: Scope,
	): Promise<ElementValue<TNode>> | ElementValue<TNode> {
		if (typeof el._ctx === "object") {
			// TODO: call a separate function like updateComponent so that refresh can return something besides the actual value
			return el._ctx._update() as
				| Promise<ElementValue<TNode>>
				| ElementValue<TNode>;
		} else if (el.tag === Raw) {
			return this._commit(el, scope, []);
		}

		return this._updateChildren(el, arranger, ctx, scope, el.props.children);
	}

	_updateChildren(
		el: Element,
		arranger: Element<string | symbol>,
		ctx: Context<unknown, TResult> | undefined,
		scope: Scope,
		children: Children,
	): Promise<ElementValue<TNode>> | ElementValue<TNode> {
		if (typeof el.tag !== "function" && el.tag !== Fragment) {
			arranger = el as Element<string | symbol>;
			scope = this.scope(el.tag as string | symbol, el.props, scope);
		}

		let async = false;
		const results: Array<
			Promise<ElementValue<TNode>> | ElementValue<TNode>
		> = [];
		const oldChildren = arrayify(el._children);
		const newChildren = arrayify(children);
		const narrowedChildren: Array<NarrowedChild> = [];
		const graveyard: Array<Element> = [];
		let i = 0;
		let seenKeys: Set<Key> | undefined;
		let childrenByKey: Map<Key, Element> | undefined;
		for (let j = 0; j < newChildren.length; j++) {
			let oldChild = oldChildren[i];
			let newChild = narrow(newChildren[j]);
			let oldKey = typeof oldChild === "object" ? oldChild.key : undefined;
			let newKey = typeof newChild === "object" ? newChild.key : undefined;
			if (seenKeys !== undefined && seenKeys.has(newKey)) {
				// TODO: warn about a duplicate key
				newKey = undefined;
			}

			// ALIGNMENT
			if (oldKey !== newKey) {
				if (childrenByKey === undefined) {
					childrenByKey = getChildrenByKey(oldChildren.slice(i));
				}

				if (newKey === undefined) {
					while (oldChild !== undefined && oldKey !== undefined) {
						i++;
						oldChild = oldChildren[i];
						oldKey = typeof oldChild === "object" ? oldChild.key : undefined;
					}

					i++;
				} else {
					oldChild = childrenByKey.get(newKey);
					if (oldChild !== undefined) {
						childrenByKey.delete(newKey);
					}

					if (seenKeys === undefined) {
						seenKeys = new Set();
					}

					seenKeys.add(newKey);
				}
			} else {
				if (childrenByKey !== undefined && newKey !== undefined) {
					childrenByKey.delete(newKey);
				}

				i++;
			}

			// UPDATING
			let result: Promise<ElementValue<TNode>> | ElementValue<TNode>;
			if (typeof newChild === "object") {
				if (newChild.tag === Copy) {
					// TODO: how do asynchronously updating elements work with copies?
					newChild = oldChild;
					if (typeof oldChild === "object") {
						result = this._getValue(oldChild);
					} else {
						result = oldChild;
					}
				} else if (
					typeof oldChild === "object" &&
					oldChild.tag === newChild.tag
				) {
					if (oldChild.tag === Portal) {
						if (oldChild._value !== newChild.props.root) {
							this.arrange(oldChild.tag as symbol, oldChild._value, []);
							oldChild._value = newChild.props.root;
						}
					} else if (oldChild.tag === Raw) {
						// TODO: implement parse caching here?
					}

					if (oldChild !== newChild) {
						oldChild.props = newChild.props;
						oldChild.ref = newChild.ref;
					}

					newChild = oldChild;
					result = this._update(newChild, arranger, ctx, scope);
				} else {
					if (inUse(newChild)) {
						newChild = Element.clone(newChild);
					}

					result = this._mount(newChild, arranger, ctx, scope);
				}
			} else {
				if (typeof newChild === "string") {
					newChild = this.escape(newChild, scope);
				}

				result = newChild;
			}

			results.push(result);
			narrowedChildren.push(newChild);
			if (!async && isPromiseLike(result)) {
				async = true;
			}

			if (typeof oldChild === "object" && oldChild !== newChild) {
				graveyard.push(oldChild);
			}
		}

		el._children =
			narrowedChildren.length > 1 ? narrowedChildren : narrowedChildren[0];

		// cleanup
		for (; i < oldChildren.length; i++) {
			const oldChild = oldChildren[i];
			if (typeof oldChild === "object" && typeof oldChild.key === "undefined") {
				graveyard.push(oldChild);
			}
		}

		// TODO: likely where logic for asynchronous unmounting will go
		if (childrenByKey !== undefined && childrenByKey.size > 0) {
			graveyard.push(...childrenByKey.values());
		}

		return this._commitResults(
			el,
			arranger,
			ctx,
			scope,
			results,
			graveyard,
			async,
		);
	}

	_commitResults(
		el: Element,
		arranger: Element<string | symbol>,
		ctx: Context<unknown, TResult> | undefined,
		scope: Scope,
		results: Array<Promise<ElementValue<TNode>> | ElementValue<TNode>>,
		graveyard: Array<Element>,
		async: boolean,
	): Promise<ElementValue<TNode>> | ElementValue<TNode> {
		if (async) {
			let onNewValue!: Function;
			const newValueP = new Promise<ElementValue<TNode>>(
				(resolve) => (onNewValue = resolve),
			);
			const resultsP = Promise.race([
				newValueP.then(() => {
					// returning Promise.reject instead of throwing a promise causes a race condition
					throw RaceLostSymbol;
				}),
				Promise.all(results),
			]).finally(() => {
				graveyard.forEach((el) => this._unmount(el, arranger, ctx));
			});

			const value = resultsP.then(
				(results) => this._commit(el, scope, normalize(results)),
				(err) => {
					if (err === RaceLostSymbol) {
						return newValueP;
					}

					throw err;
				},
			);

			if (typeof el._onNewValue === "function") {
				el._onNewValue(value);
			}

			el._onNewValue = onNewValue;
			return value;
		}

		graveyard.forEach((el) => this._unmount(el, arranger, ctx));
		const value = this._commit(
			el,
			scope,
			normalize(results as Array<ElementValue<TNode>>),
		);

		if (typeof el._onNewValue === "function") {
			el._onNewValue(value);
			el._onNewValue = undefined;
		}

		return value;
	}

	_commit(
		el: Element,
		scope: Scope,
		childValues: Array<TNode | string>,
	): Array<TNode | string> | TNode | string | undefined {
		let value: ElementValue<TNode> =
			childValues.length > 1 ? childValues : childValues[0];
		// TODO: put this in ctx somehow...
		if (typeof el.tag === "function") {
			const ctx = el._ctx!;
			if (!(ctx._flags & Unmounted) && !(ctx._flags & Updating)) {
				this.arrange(
					ctx._arranger.tag,
					ctx._arranger._value,
					this._getChildValues(ctx._arranger),
				);
			}

			if (typeof ctx._schedules !== "undefined" && ctx._schedules.size > 0) {
				// We have to clear the set of callbacks before calling them, because a callback which refreshes the component would otherwise cause a stack overflow.
				const callbacks = Array.from(ctx._schedules);
				ctx._schedules.clear();
				const value1 = this.read(value);
				for (const callback of callbacks) {
					callback(value1);
				}
			}

			if (typeof ctx._listeners !== "undefined" && ctx._listeners.length > 0) {
				for (const child of childValues) {
					for (const record of ctx._listeners) {
						if (isEventTarget(child)) {
							child.addEventListener(
								record.type,
								record.callback,
								record.options,
							);
						}
					}
				}
			}
			ctx._flags &= ~Updating;
		} else if (el.tag === Portal) {
			el._value = el.props.root;
			this.arrange(Portal, el._value, childValues);
			value = undefined;
		} else if (el.tag === Raw) {
			if (typeof el.props.value === "string") {
				el._value = this.parse(el.props.value, scope);
			} else {
				el._value = el.props.value;
			}

			value = el._value;
		} else if (el.tag !== Fragment) {
			this.patch(el.tag, el._value, el.props, scope);
			this.arrange(el.tag, el._value, childValues);
			value = el._value;
		}

		if (typeof el.ref === "function") {
			el.ref(this.read(value));
		}

		return value;
	}

	_unmount(
		el: Element,
		arranger: Element,
		ctx: Context<unknown, TResult> | undefined,
	): void {
		if (typeof el.tag === "function") {
			// TODO: move this logic to a Context method
			// setting unmounted flag here is necessary because of some kind of race condition
			ctx = el._ctx!;
			ctx._flags |= Unmounted;
			clearEventListeners(ctx);
			if (typeof ctx._cleanups === "object") {
				const value = this.read(this._getValue(el));
				for (const cleanup of ctx._cleanups) {
					cleanup(value);
				}

				ctx._cleanups = undefined;
			}

			if (!(ctx._flags & Finished)) {
				ctx._flags |= Finished;
				ctx._resume();

				if (
					typeof ctx._iterator === "object" &&
					typeof ctx._iterator.return === "function"
				) {
					// TODO: handle async generator rejections
					ctx._iterator.return();
				}
			}
		} else if (el.tag === Portal) {
			arranger = el;
			this.arrange(Portal, el._value, []);
		} else if (el.tag !== Fragment) {
			if (isEventTarget(el._value)) {
				const listeners = getListeners(ctx, arranger);
				if (listeners !== undefined && listeners.length > 0) {
					for (const record of listeners) {
						el._value.removeEventListener(
							record.type,
							record.callback,
							record.options,
						);
					}
				}
			}

			arranger = el;
		}

		for (const child of arrayify(el._children)) {
			if (typeof child === "object") {
				this._unmount(child, arranger, ctx);
			}
		}

		el._value = undefined;
		el._children = undefined;
		// TODO: uncomment and investigate why tests fail
		// el._ctx = undefined;
	}
}

export interface ProvisionMap {}

export class Context<TProps = any, TResult = any> implements EventTarget {
	_renderer: Renderer<unknown, TResult>;
	_el: Element<Component>;
	_arranger: Element<string | symbol>;
	_parent: Context<unknown, TResult> | undefined;
	_scope: Scope;
	_flags: number;
	_iterator: ChildIterator | undefined;
	_listeners: Array<EventListenerRecord> | undefined;
	_provisions: Map<unknown, unknown> | undefined;
	_onProps: ((props: any) => unknown) | undefined;
	_oldValue: Promise<TResult> | undefined;
	_inflightPending: Promise<unknown> | undefined;
	_enqueuedPending: Promise<unknown> | undefined;
	_inflightResult: Promise<ElementValue<TResult>> | undefined;
	_enqueuedResult: Promise<ElementValue<TResult>> | undefined;
	_schedules: Set<(value: unknown) => unknown> | undefined;
	_cleanups: Set<(value: unknown) => unknown> | undefined;
	// TODO: reorder the parameter list
	constructor(
		renderer: Renderer<unknown, TResult>,
		el: Element<Component>,
		parent: Context<unknown, TResult> | undefined,
		scope: Scope,
		arranger: Element<string | symbol>,
	) {
		this._renderer = renderer;
		this._el = el;
		this._parent = parent;
		this._scope = scope;
		this._arranger = arranger;
		this._flags = 0;
	}

	get<TKey extends keyof ProvisionMap>(key: TKey): ProvisionMap[TKey];
	get(key: unknown): any {
		for (
			let parent = this._parent;
			parent !== undefined;
			parent = parent._parent
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

	get value(): TResult {
		return this._renderer.read(this._renderer._getChildValueOrValues(this._el));
	}

	*[Symbol.iterator](): Generator<TProps> {
		const el = this._el;
		while (!(this._flags & Unmounted)) {
			if (this._flags & Iterating) {
				throw new Error("You must yield for each iteration of this.");
			} else if (this._flags & AsyncGen) {
				throw new Error("Use for await...of in async generator components.");
			}

			this._flags |= Iterating;
			yield el.props!;
		}
	}

	async *[Symbol.asyncIterator](): AsyncGenerator<TProps> {
		const el = this._el;
		do {
			if (this._flags & Iterating) {
				throw new Error("You must yield for each iteration of this.");
			} else if (this._flags & SyncGen) {
				throw new Error("Use for...of in sync generator components.");
			}

			this._flags |= Iterating;
			if (this._flags & Available) {
				this._flags &= ~Available;
				yield el.props;
			} else {
				const props = await new Promise<TProps>(
					(resolve) => (this._onProps = resolve),
				);
				if (!(this._flags & Unmounted)) {
					yield props;
				}
			}
		} while (!(this._flags & Unmounted));
	}

	refresh(): Promise<TResult> | TResult {
		if (this._flags & (Stepping | Unmounted)) {
			return this._renderer.read(this._renderer._getValue(this._el));
		}

		this._resume();
		return this._renderer.read(this._run());
	}

	schedule(callback: (value: unknown) => unknown): void {
		if (typeof this._schedules === "undefined") {
			this._schedules = new Set();
		}

		this._schedules.add(callback);
	}

	cleanup(callback: (value: unknown) => unknown): void {
		if (typeof this._cleanups === "undefined") {
			this._cleanups = new Set();
		}

		this._cleanups.add(callback);
	}

	addEventListener<T extends string>(
		type: T,
		callback: MappedEventListener<T> | null,
		options?: boolean | AddEventListenerOptions,
	): void {
		if (callback == null) {
			return;
		} else if (typeof callback === "object") {
			throw new Error("handleEvent objects not yet supported");
		} else if (typeof this._listeners === "undefined") {
			this._listeners = [];
		}

		options = normalizeOptions(options);
		const record: EventListenerRecord = {
			type,
			callback,
			options,
			original: callback,
		};

		if (this._listeners.some(listenersEqual.bind(null, record))) {
			return;
		}

		if (options.once) {
			const self = this;
			record.callback = function () {
				if (typeof self._listeners !== "undefined") {
					self._listeners = self._listeners.filter(
						(record1) => record !== record1,
					);

					if (self._listeners.length === 0) {
						self._listeners = undefined;
					}
				}
				return record.original.apply(this, arguments as any);
			};
		}

		this._listeners.push(record);
		for (const value of this._renderer._getChildValues(this._el)) {
			if (isEventTarget(value)) {
				value.addEventListener(record.type, record.callback, record.options);
			}
		}
	}

	removeEventListener<T extends string>(
		type: T,
		callback: MappedEventListener<T> | null,
		options?: EventListenerOptions | boolean,
	): void {
		if (callback == null || typeof this._listeners === "undefined") {
			return;
		}

		options = normalizeOptions(options);
		const record: EventListenerRecord = {
			type,
			callback,
			options,
			original: callback,
		};
		const i = this._listeners.findIndex(listenersEqual.bind(null, record));
		if (i === -1) {
			return;
		}

		this._listeners.splice(i, 1);
		for (const value of this._renderer._getChildValues(this._el)) {
			if (isEventTarget(value)) {
				value.removeEventListener(record.type, record.callback, record.options);
			}
		}

		if (this._listeners.length === 0) {
			this._listeners = undefined;
		}
	}

	dispatchEvent(ev: Event): boolean {
		const path: Context<unknown, TResult>[] = [];
		for (
			let parent = this._parent;
			parent !== undefined;
			parent = parent._parent
		) {
			path.push(parent);
		}

		let stopped = false;
		const stopImmediatePropagation = ev.stopImmediatePropagation;
		setEventProperty(ev, "stopImmediatePropagation", () => {
			stopped = true;
			return stopImmediatePropagation.call(ev);
		});
		setEventProperty(ev, "target", this);
		setEventProperty(ev, "eventPhase", CAPTURING_PHASE);
		try {
			for (let i = path.length - 1; i >= 0; i--) {
				const et = path[i];
				if (typeof et._listeners !== "undefined") {
					setEventProperty(ev, "currentTarget", et);
					for (const record of et._listeners) {
						if (record.type === ev.type && record.options.capture) {
							try {
								record.callback.call(this, ev);
							} catch (err) {
								consoleError(err);
							}

							if (stopped) {
								break;
							}
						}
					}
				}

				if (stopped || ev.cancelBubble) {
					return !ev.defaultPrevented;
				}
			}

			if (typeof this._listeners !== "undefined") {
				setEventProperty(ev, "eventPhase", AT_TARGET);
				setEventProperty(ev, "currentTarget", this);
				for (const record of this._listeners) {
					if (record.type === ev.type) {
						try {
							record.callback.call(this, ev);
						} catch (err) {
							consoleError(err);
						}

						if (stopped) {
							break;
						}
					}
				}

				if (stopped || ev.cancelBubble) {
					return !ev.defaultPrevented;
				}
			}

			if (ev.bubbles) {
				setEventProperty(ev, "eventPhase", BUBBLING_PHASE);
				for (const et of path) {
					if (typeof et._listeners !== "undefined") {
						setEventProperty(ev, "currentTarget", et);
						for (const record of et._listeners) {
							if (record.type === ev.type && !record.options.capture) {
								try {
									record.callback.call(this, ev);
								} catch (err) {
									consoleError(err);
								}

								if (stopped) {
									break;
								}
							}
						}
					}

					if (stopped || ev.cancelBubble) {
						return !ev.defaultPrevented;
					}
				}
			}

			return !ev.defaultPrevented;
		} finally {
			setEventProperty(ev, "eventPhase", NONE);
			setEventProperty(ev, "currentTarget", null);
		}
	}

	// PRIVATE METHODS
	_resume() {
		if (typeof this._onProps === "function") {
			this._onProps(this._el.props!);
			this._onProps = undefined;
		} else {
			this._flags |= Available;
		}
	}

	_run(): Promise<ElementValue<unknown>> | ElementValue<unknown> {
		if (typeof this._inflightPending === "undefined") {
			const [pending, result] = this._step();
			if (isPromiseLike(pending)) {
				this._inflightPending = pending.finally(() => this._advance());
			}

			if (isPromiseLike(result)) {
				this._inflightResult = result as Promise<any>;
			}

			return result;
		} else if (this._flags & AsyncGen) {
			return this._inflightResult;
		} else if (typeof this._enqueuedPending === "undefined") {
			let resolve: Function;
			this._enqueuedPending = this._inflightPending
				.then(() => {
					const [pending, result] = this._step();
					resolve(result);
					return pending;
				})
				.finally(() => this._advance());
			this._enqueuedResult = new Promise((resolve1) => (resolve = resolve1));
		}

		return this._enqueuedResult;
	}

	_step(): [
		Promise<unknown> | undefined,
		Promise<ElementValue<unknown>> | ElementValue<unknown>,
	] {
		const el = this._el;
		if (this._flags & Finished) {
			return [undefined, this._renderer._getValue(el)];
		}

		let initial = false;
		this._flags |= Stepping;
		if (typeof this._iterator === "undefined") {
			initial = true;
			clearEventListeners(this);
			const value: ChildIterator | PromiseLike<Child> | Child = el.tag.call(
				this,
				el.props!,
			);
			if (isIteratorLike(value)) {
				this._iterator = value;
			} else if (isPromiseLike(value)) {
				const value1 = upgradePromiseLike(value);
				const pending = value1.catch(() => undefined); // void :(
				const result = value1.then((value) => this._updateChildren(value));
				this._flags &= ~Stepping;
				return [pending, result];
			} else {
				const result = this._updateChildren(value);
				this._flags &= ~Stepping;
				return [undefined, result];
			}
		}

		let oldValue: Promise<ElementValue<unknown>> | ElementValue<unknown>;
		if (initial) {
			oldValue = this._renderer.read(undefined);
		} else if (typeof this._oldValue === "object") {
			oldValue = this._oldValue;
			this._oldValue = undefined;
		} else {
			oldValue = this._renderer.read(this._renderer._getValue(el));
		}

		// TODO: clean up/deduplicate logic here
		// TODO: generator components which throw errors should be fragile, if rerendered they should be unmounted and remounted
		const iteration = this._iterator.next(oldValue);
		this._flags &= ~Stepping;
		if (isPromiseLike(iteration)) {
			if (initial) {
				this._flags |= AsyncGen;
			}

			const pending = iteration.catch(() => {});
			const result = iteration.then((iteration) => {
				this._flags &= ~Iterating;
				if (iteration.done) {
					this._flags |= Finished;
				}

				try {
					let result = this._updateChildren(iteration.value);
					if (isPromiseLike(result)) {
						this._oldValue = (result as Promise<any>).then(
							(value) => this._renderer.read(value),
							() => this._renderer.read(undefined),
						);
						if (
							!(this._flags & Finished) &&
							typeof this._iterator!.throw === "function"
						) {
							result = (result as Promise<any>).catch((err) => {
								this._resume();
								const iteration = (this._iterator as AsyncGenerator<
									Children,
									Children
								>).throw(err);
								return iteration.then((iteration) => {
									if (iteration.done) {
										this._flags |= Finished;
									}

									return this._updateChildren(iteration.value);
								});
							});
						}
					}

					return result;
				} catch (err) {
					if (
						this._flags & Finished ||
						typeof this._iterator!.throw !== "function"
					) {
						throw err;
					}

					const iteration = (this._iterator as AsyncGenerator<
						Children,
						Children
					>).throw(err);
					return iteration.then((iteration) => {
						if (iteration.done) {
							this._flags |= Finished;
						}

						return this._updateChildren(iteration.value);
					});
				}
			});

			return [pending, result];
		}

		this._flags &= ~Iterating;
		if (initial) {
			this._flags |= SyncGen;
		}

		if (iteration.done) {
			this._flags |= Finished;
		}

		try {
			let result = this._updateChildren(iteration.value);
			if (isPromiseLike(result)) {
				if (
					!(this._flags & Finished) &&
					typeof this._iterator.throw === "function"
				) {
					result = (result as Promise<any>).catch((err) => {
						this._flags |= Stepping;
						const iteration = (this._iterator as Generator<
							Children,
							Children
						>).throw(err);
						this._flags &= ~Stepping;
						if (iteration.done) {
							this._flags |= Finished;
						}

						return this._updateChildren(iteration.value);
					});
				}
				const pending = (result as Promise<any>).catch(() => {});
				return [pending, result];
			}

			return [undefined, result];
		} catch (err) {
			if (
				this._flags & Finished ||
				typeof this._iterator.throw !== "function"
			) {
				throw err;
			}

			this._flags |= Stepping;
			const iteration = (this._iterator as Generator<Children, Children>).throw(
				err,
			);
			this._flags &= ~Stepping;
			if (iteration.done) {
				this._flags |= Finished;
			}

			const result = this._updateChildren(iteration.value);
			if (isPromiseLike(result)) {
				const pending = (result as Promise<any>).catch(() => {});
				return [pending, result];
			}

			return [undefined, result];
		}
	}

	_advance(): void {
		this._inflightPending = this._enqueuedPending;
		this._inflightResult = this._enqueuedResult;
		this._enqueuedPending = undefined;
		this._enqueuedResult = undefined;
		if (this._flags & AsyncGen && !(this._flags & Finished)) {
			this._run();
		}
	}

	_update(): Promise<ElementValue<unknown>> | ElementValue<unknown> {
		this._flags |= Updating;
		this._resume();
		return this._run();
	}

	_updateChildren(
		children: Children,
	): Promise<ElementValue<unknown>> | ElementValue<unknown> {
		if (isNonStringIterable(children)) {
			children = createElement(Fragment, null, children);
		}

		return this._renderer._updateChildren(
			this._el,
			this._arranger,
			this,
			this._scope,
			children,
		);
	}
}

// EVENT UTILITY FUNCTIONS
const NONE = 0;
const CAPTURING_PHASE = 1;
const AT_TARGET = 2;
const BUBBLING_PHASE = 3;

export interface EventMap {
	[type: string]: Event;
}

type MappedEventListener<T extends string> = (ev: EventMap[T]) => unknown;

interface EventListenerRecord {
	type: string;
	callback: MappedEventListener<any>;
	options: AddEventListenerOptions;
	original: MappedEventListener<any>;
}

function normalizeOptions(
	options: AddEventListenerOptions | boolean | null | undefined,
): AddEventListenerOptions {
	if (typeof options === "boolean") {
		return {capture: options};
	} else if (options == null) {
		return {};
	} else {
		return options;
	}
}

function isEventTarget(value: any): value is EventTarget {
	return (
		value != null &&
		typeof value.addEventListener === "function" &&
		typeof value.removeEventListener === "function" &&
		typeof value.dispatchEvent === "function"
	);
}

function listenersEqual(
	record1: EventListenerRecord,
	record2: EventListenerRecord,
): boolean {
	return (
		record1.type === record2.type &&
		record1.original === record2.original &&
		!record1.options.capture === !record2.options.capture
	);
}

function setEventProperty<T extends keyof Event>(
	ev: Event,
	key: T,
	value: Event[T],
): void {
	Object.defineProperty(ev, key, {value, writable: false, configurable: true});
}

function getListeners(
	ctx: Context | undefined,
	arranger: Element,
): Array<EventListenerRecord> | undefined {
	let listeners: Array<EventListenerRecord> | undefined;
	while (ctx !== undefined && ctx._arranger === arranger) {
		if (typeof ctx._listeners !== "undefined") {
			listeners =
				listeners === undefined
					? ctx._listeners
					: listeners.concat(ctx._listeners);
		}

		ctx = ctx._parent;
	}

	return listeners;
}

function clearEventListeners(ctx: Context): void {
	if (typeof ctx._listeners !== "undefined" && ctx._listeners.length > 0) {
		for (const value of ctx._renderer._getChildValues(ctx._el)) {
			if (isEventTarget(value)) {
				for (const record of ctx._listeners) {
					value.removeEventListener(
						record.type,
						record.callback,
						record.options,
					);
				}
			}
		}

		ctx._listeners = undefined;
	}
}
