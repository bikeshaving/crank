import {Renderer, updateChildren} from "./renderer";
import {isIteratorLike, isPromiseLike, NOOP, unwrap} from "../util";
import {
	Children,
	ChildrenIteration,
	Component,
	Element,
	ElementValue,
	getChildValues,
	getValue,
	HadChildren,
	narrow,
	Portal,
} from "./elements";
import {
	normalizeOptions,
	isEventTarget,
	setEventProperty,
	CAPTURING_PHASE,
	AT_TARGET,
	BUBBLING_PHASE,
	NONE,
	getListeners,
	clearEventListeners,
	listenersMap,
	MappedEventListenerOrEventListenerObject,
	EventListenerRecord,
	MappedEventListener,
} from "./events";

/*** CONTEXT FLAGS ***/

/**
 * A flag which is set when the component is being updated by the parent and
 * cleared when the component has committed. Used to determine whether the
 * nearest host ancestor needs to be rearranged.
 */
export const IsUpdating = 1 << 0;

/**
 * A flag which is set when the component function or generator is
 * synchronously executing. This flags is used to ensure that a component which
 * triggers a second update in the course of rendering does not cause an stack
 * overflow or a generator error.
 */
export const IsExecuting = 1 << 1;

/**
 * A flag used to make sure multiple values are not pulled from context prop
 * iterators without a yield.
 */
export const IsIterating = 1 << 2;

/**
 * A flag used by async generator components in conjunction with the
 * onavailable (_oa) callback to mark whether new props can be pulled via the
 * context async iterator. See the Symbol.asyncIterator method and the
 * resumeCtx function.
 */
export const IsAvailable = 1 << 3;

/**
 * A flag which is set when a generator components returns, i.e. the done
 * property on the generator is set to true or throws. Done components will
 * stick to their last rendered value and ignore further updates.
 */
export const IsDone = 1 << 4;

/**
 * A flag which is set when the component is unmounted. Unmounted components
 * are no longer in the element tree and cannot refresh or rerender.
 */
export const IsUnmounted = 1 << 5;

/**
 * A flag which indicates that the component is a sync generator component.
 */
export const IsSyncGen = 1 << 6;

/**
 * A flag which indicates that the component is an async generator component.
 */
export const IsAsyncGen = 1 << 7;

export interface Context {}

/**
 * An interface which can be extended to provide strongly typed provisions (see
 * Context.prototype.consume and Context.prototype.provide)
 */
export interface ProvisionMap {}

const provisionMaps = new WeakMap<Context, Map<unknown, unknown>>();

const scheduleMap = new WeakMap<Context, Set<Function>>();

const cleanupMap = new WeakMap<Context, Set<Function>>();

/**
 * A class which is instantiated and passed to every component as its this
 * value. Contexts form a tree just like elements and all components in the
 * element tree are connected via contexts. Components can use this tree to
 * communicate data upwards via events and downwards via provisions.
 *
 * @template [TProps=*] - The expected shape of the props passed to the
 * component. Used to strongly type the Context iterator methods.
 * @template [TResult=*] - The readable element value type. It is used in
 * places such as the return value of refresh and the argument passed to
 * schedule and cleanup callbacks.
 */
export class Context<TProps = any, TResult = any> implements EventTarget {
	/**
	 * @internal
	 * flags - A bitmask. See CONTEXT FLAGS above.
	 */
	_f: number;

	/**
	 * @internal
	 * renderer - The renderer which created this context.
	 */
	_re: Renderer<unknown, unknown, unknown, TResult>;

	/**
	 * @internal
	 * root - The root node as set by the nearest ancestor portal.
	 */
	_rt: unknown;

	/**
	 * @internal
	 * host - The nearest ancestor host element.
	 *
	 * When refresh is called, the host element will be arranged as the last step
	 * of the commit, to make sure the parent’s children properly reflects the
	 * components’s children.
	 */
	_ho: Element<string | symbol>;

	/**
	 * @internal
	 * parent - The parent context.
	 */
	_pa: Context<unknown, TResult> | undefined;

	/**
	 * @internal
	 * scope - The value of the scope at the point of element’s creation.
	 */
	_sc: unknown;

	/**
	 * @internal
	 * el - The associated component element.
	 */
	_el: Element<Component>;

	/**
	 * @internal
	 * iterator - The iterator returned by the component function.
	 */
	_it:
		| Iterator<Children, Children | void, unknown>
		| AsyncIterator<Children, Children | void, unknown>
		| undefined;

	/*** async properties ***/
	/**
	 * @internal
	 * onavailable - A callback used in conjunction with the IsAvailable flag to
	 * implement the props async iterator. See the Symbol.asyncIterator method
	 * and the resumeCtx function.
	 */
	_oa: Function | undefined;

	// See the stepCtx/advanceCtx/runCtx functions for more notes on the
	// inflight/enqueued block/value properties.
	/**
	 * @internal
	 * inflightBlock
	 */
	_ib: Promise<unknown> | undefined;

	/**
	 * @internal
	 * inflightValue
	 */
	_iv: Promise<ElementValue<any>> | undefined;

	/**
	 * @internal
	 * enqueuedBlock
	 */
	_eb: Promise<unknown> | undefined;

	/**
	 * @internal
	 * enqueuedValue
	 */
	_ev: Promise<ElementValue<any>> | undefined;

	/**
	 * @internal
	 * Contexts should never be instantiated directly.
	 */
	constructor(
		renderer: Renderer<unknown, unknown, unknown, TResult>,
		root: unknown,
		host: Element<string | symbol>,
		parent: Context<unknown, TResult> | undefined,
		scope: unknown,
		el: Element<Component>,
	) {
		this._f = 0;
		this._re = renderer;
		this._rt = root;
		this._ho = host;
		this._pa = parent;
		this._sc = scope;
		this._el = el;
		this._it = undefined;
		this._oa = undefined;
		this._ib = undefined;
		this._iv = undefined;
		this._eb = undefined;
		this._ev = undefined;
	}

	/**
	 * The current props of the associated element.
	 *
	 * Typically, you should read props either via the first parameter of the
	 * component or via the context iterator methods. This property is mainly for
	 * plugins or utilities which wrap contexts.
	 */
	get props(): TProps {
		return this._el.props;
	}

	/**
	 * The current value of the associated element.
	 *
	 * Typically, you should read values via refs, generator yield expressions,
	 * or the refresh, schedule or cleanup methods. This property is mainly for
	 * plugins or utilities which wrap contexts.
	 */
	get value(): TResult {
		return this._re.read(getValue(this._el));
	}

	*[Symbol.iterator](): Generator<TProps> {
		while (!(this._f & IsDone)) {
			if (this._f & IsIterating) {
				throw new Error("Context iterated twice without a yield");
			} else if (this._f & IsAsyncGen) {
				throw new Error("Use for await…of in async generator components");
			}

			this._f |= IsIterating;
			yield this._el.props!;
		}
	}

	async *[Symbol.asyncIterator](): AsyncGenerator<TProps> {
		// We use a do while loop rather than a while loop to handle an edge case
		// where an async generator component is unmounted synchronously.
		do {
			if (this._f & IsIterating) {
				throw new Error("Context iterated twice without a yield");
			} else if (this._f & IsSyncGen) {
				throw new Error("Use for…of in sync generator components");
			}

			this._f |= IsIterating;
			if (this._f & IsAvailable) {
				this._f &= ~IsAvailable;
			} else {
				await new Promise((resolve) => (this._oa = resolve));
				if (this._f & IsDone) {
					break;
				}
			}

			yield this._el.props;
		} while (!(this._f & IsDone));
	}

	/**
	 * Re-executes a component.
	 *
	 * @returns The rendered value of the component or a promise thereof if the
	 * component or its children execute asynchronously.
	 *
	 * The refresh method works a little differently for async generator
	 * components, in that it will resume the Context’s props async iterator
	 * rather than resuming execution. This is because async generator components
	 * are perpetually resumed independent of updates, and rely on the props
	 * async iterator to suspend.
	 */
	refresh(): Promise<TResult> | TResult | undefined {
		if (this._f & IsUnmounted) {
			console.error("Component is unmounted");
			return this._re.read(undefined);
		} else if (this._f & IsExecuting) {
			console.error("Component is already executing");
			return this._re.read(undefined);
		}

		resumeCtx(this);
		return this._re.read(runCtx(this));
	}

	/**
	 * Registers a callback which fires when the component commits. Will only
	 * fire once per callback and update.
	 */
	schedule(callback: (value: TResult) => unknown): void {
		let callbacks = scheduleMap.get(this);
		if (!callbacks) {
			callbacks = new Set<Function>();
			scheduleMap.set(this, callbacks);
		}

		callbacks.add(callback);
	}

	/**
	 * Registers a callback which fires when the component unmounts. Will only
	 * fire once per callback.
	 */
	cleanup(callback: (value: TResult) => unknown): void {
		let callbacks = cleanupMap.get(this);
		if (!callbacks) {
			callbacks = new Set<Function>();
			cleanupMap.set(this, callbacks);
		}

		callbacks.add(callback);
	}

	consume<TKey extends keyof ProvisionMap>(key: TKey): ProvisionMap[TKey];
	consume(key: unknown): any;
	consume(key: unknown): any {
		for (let parent = this._pa; parent !== undefined; parent = parent._pa) {
			const provisions = provisionMaps.get(parent);
			if (provisions && provisions.has(key)) {
				return provisions.get(key)!;
			}
		}
	}

	provide<TKey extends keyof ProvisionMap>(
		key: TKey,
		value: ProvisionMap[TKey],
	): void;
	provide(key: unknown, value: any): void;
	provide(key: unknown, value: any): void {
		let provisions = provisionMaps.get(this);
		if (!provisions) {
			provisions = new Map();
			provisionMaps.set(this, provisions);
		}

		provisions.set(key, value);
	}

	addEventListener<T extends string>(
		type: T,
		listener: MappedEventListenerOrEventListenerObject<T> | null,
		options?: boolean | AddEventListenerOptions,
	): void {
		let listeners: Array<EventListenerRecord>;
		if (listener == null) {
			return;
		} else {
			const listeners1 = listenersMap.get(this);
			if (listeners1) {
				listeners = listeners1;
			} else {
				listeners = [];
				listenersMap.set(this, listeners);
			}
		}

		options = normalizeOptions(options);
		let callback: MappedEventListener<T>;
		if (typeof listener === "object") {
			callback = () => listener.handleEvent.apply(listener, arguments as any);
		} else {
			callback = listener;
		}

		const record: EventListenerRecord = {type, callback, listener, options};
		if (options.once) {
			record.callback = function (this: any) {
				const i = listeners.indexOf(record);
				if (i !== -1) {
					listeners.splice(i, 1);
				}

				return callback.apply(this, arguments as any);
			};
		}

		if (
			listeners.some(
				(record1) =>
					record.type === record1.type &&
					record.listener === record1.listener &&
					!record.options.capture === !record1.options.capture,
			)
		) {
			return;
		}

		listeners.push(record);
		for (const value of getChildValues(this._el)) {
			if (isEventTarget(value)) {
				value.addEventListener(record.type, record.callback, record.options);
			}
		}
	}

	removeEventListener<T extends string>(
		type: T,
		listener: MappedEventListenerOrEventListenerObject<T> | null,
		options?: EventListenerOptions | boolean,
	): void {
		const listeners = listenersMap.get(this);
		if (listener == null || listeners == null) {
			return;
		}

		const options1 = normalizeOptions(options);
		const i = listeners.findIndex(
			(record) =>
				record.type === type &&
				record.listener === listener &&
				!record.options.capture === !options1.capture,
		);

		if (i === -1) {
			return;
		}

		const record = listeners[i];
		listeners.splice(i, 1);
		for (const value of getChildValues(this._el)) {
			if (isEventTarget(value)) {
				value.removeEventListener(record.type, record.callback, record.options);
			}
		}
	}

	dispatchEvent(ev: Event): boolean {
		const path: Array<Context> = [];
		for (let parent = this._pa; parent !== undefined; parent = parent._pa) {
			path.push(parent);
		}

		// We patch the stopImmediatePropagation method because ev.cancelBubble
		// only informs us if stopPropagation was called and there are no
		// properties which inform us if stopImmediatePropagation was called.
		let immediateCancelBubble = false;
		const stopImmediatePropagation = ev.stopImmediatePropagation;
		setEventProperty(ev, "stopImmediatePropagation", () => {
			immediateCancelBubble = true;
			return stopImmediatePropagation.call(ev);
		});
		setEventProperty(ev, "target", this);

		// The only possible errors in this block are errors thrown by callbacks,
		// and dispatchEvent will only log these errors rather than throwing
		// them. Therefore, we place all code in a try block, log errors in the
		// catch block, and use an unsafe return statement in the finally block.
		//
		// Each early return within the try block returns true because while the
		// return value is overridden in the finally block, TypeScript
		// (justifiably) does not recognize the unsafe return statement.
		try {
			setEventProperty(ev, "eventPhase", CAPTURING_PHASE);
			for (let i = path.length - 1; i >= 0; i--) {
				const target = path[i];
				const listeners = listenersMap.get(target);
				if (listeners) {
					setEventProperty(ev, "currentTarget", target);
					for (const record of listeners) {
						if (record.type === ev.type && record.options.capture) {
							record.callback.call(this, ev);
							if (immediateCancelBubble) {
								return true;
							}
						}
					}
				}

				if (ev.cancelBubble) {
					return true;
				}
			}

			{
				const listeners = listenersMap.get(this);
				if (listeners) {
					setEventProperty(ev, "eventPhase", AT_TARGET);
					setEventProperty(ev, "currentTarget", this);
					for (const record of listeners) {
						if (record.type === ev.type) {
							record.callback.call(this, ev);
							if (immediateCancelBubble) {
								return true;
							}
						}
					}

					if (ev.cancelBubble) {
						return true;
					}
				}
			}

			if (ev.bubbles) {
				setEventProperty(ev, "eventPhase", BUBBLING_PHASE);
				for (let i = 0; i < path.length; i++) {
					const target = path[i];
					const listeners = listenersMap.get(target);
					if (listeners) {
						setEventProperty(ev, "currentTarget", target);
						for (const record of listeners) {
							if (record.type === ev.type && !record.options.capture) {
								record.callback.call(this, ev);
								if (immediateCancelBubble) {
									return true;
								}
							}
						}
					}

					if (ev.cancelBubble) {
						return true;
					}
				}
			}
		} catch (err) {
			console.error(err);
		} finally {
			setEventProperty(ev, "eventPhase", NONE);
			setEventProperty(ev, "currentTarget", null);
			// eslint-disable-next-line no-unsafe-finally
			return !ev.defaultPrevented;
		}
	}
}

/*** PRIVATE CONTEXT FUNCTIONS ***/

/**
 * This function is responsible for executing the component and handling all
 * the different component types.
 *
 * @returns {[block, value]} A tuple where
 * block - A possible promise which represents the duration during which the
 * component is blocked from updating.
 * value - A possible promise resolving to the rendered value of children.
 *
 * Each component type will block according to the type of the component.
 * - Sync function components never block and will transparently pass updates
 * to children.
 * - Async function components and async generator components block while
 * executing itself, but will not block for async children.
 * - Sync generator components block while any children are executing, because
 * they are expected to only resume when they’ve actually rendered.
 */
function stepCtx<TNode, TResult>(
	ctx: Context<unknown, TResult>,
): [
	Promise<unknown> | undefined,
	Promise<ElementValue<TNode>> | ElementValue<TNode>,
] {
	const el = ctx._el;
	if (ctx._f & IsDone) {
		return [undefined, getValue<TNode>(el)];
	}

	const initial = !ctx._it;
	if (initial) {
		try {
			ctx._f |= IsExecuting;
			clearEventListeners(ctx);
			const result = el.tag.call(ctx, el.props);
			if (isIteratorLike(result)) {
				ctx._it = result;
			} else if (isPromiseLike(result)) {
				// async function component
				const result1 =
					result instanceof Promise ? result : Promise.resolve(result);
				const value = result1.then((result) =>
					updateCtxChildren<TNode, TResult>(ctx, result),
				) as Promise<ElementValue<TNode>>;
				return [result1, value];
			} else {
				// sync function component
				return [undefined, updateCtxChildren<TNode, TResult>(ctx, result)];
			}
		} finally {
			ctx._f &= ~IsExecuting;
		}
	}

	// The value passed back into the generator as the argument to the next
	// method is a promise if an async generator component has async children.
	// Sync generator components only resume when their children have fulfilled
	// so ctx._el._ic (the element’s inflight children) will never be defined.
	let oldValue: Promise<TResult | undefined> | TResult | undefined;
	if (initial) {
		// The argument passed to the first call to next is ignored.
		oldValue = undefined as any;
	} else if (ctx._el._ic) {
		oldValue = ctx._el._ic.then(ctx._re.read, () => ctx._re.read(undefined));
	} else {
		oldValue = ctx._re.read(getValue(el));
	}

	let iteration: ChildrenIteration;
	try {
		ctx._f |= IsExecuting;
		iteration = ctx._it!.next(oldValue);
	} catch (err) {
		ctx._f |= IsDone;
		throw err;
	} finally {
		ctx._f &= ~IsExecuting;
	}

	if (isPromiseLike(iteration)) {
		// async generator component
		if (initial) {
			ctx._f |= IsAsyncGen;
		}

		const value: Promise<ElementValue<TNode>> = iteration.then(
			(iteration) => {
				if (!(ctx._f & IsIterating)) {
					ctx._f &= ~IsAvailable;
				}

				ctx._f &= ~IsIterating;
				if (iteration.done) {
					ctx._f |= IsDone;
				}

				try {
					const value = updateCtxChildren<TNode, TResult>(
						ctx,
						iteration.value as Children,
					);

					if (isPromiseLike(value)) {
						return value.catch((err) => handleChildError(ctx, err));
					}

					return value;
				} catch (err) {
					return handleChildError(ctx, err);
				}
			},
			(err) => {
				ctx._f |= IsDone;
				throw err;
			},
		);

		return [iteration, value];
	}

	// sync generator component
	if (initial) {
		ctx._f |= IsSyncGen;
	}

	ctx._f &= ~IsIterating;
	if (iteration.done) {
		ctx._f |= IsDone;
	}

	let value: Promise<ElementValue<TNode>> | ElementValue<TNode>;
	try {
		value = updateCtxChildren<TNode, TResult>(ctx, iteration.value as Children);

		if (isPromiseLike(value)) {
			value = value.catch((err) => handleChildError(ctx, err));
		}
	} catch (err) {
		value = handleChildError(ctx, err);
	}

	if (isPromiseLike(value)) {
		return [value.catch(NOOP), value];
	}

	return [undefined, value];
}

/**
 * Called when the inflight block promise settles.
 */
function advanceCtx(ctx: Context): void {
	// _ib - inflightBlock
	// _iv - inflightValue
	// _eb - enqueuedBlock
	// _ev - enqueuedValue
	ctx._ib = ctx._eb;
	ctx._iv = ctx._ev;
	ctx._eb = undefined;
	ctx._ev = undefined;
	if (ctx._f & IsAsyncGen && !(ctx._f & IsDone)) {
		runCtx(ctx);
	}
}

/**
 * Enqueues and executes the component associated with the context.
 *
 * The functions stepCtx, advanceCtx and runCtx work together to implement the
 * async queueing behavior of components. The runCtx function calls the stepCtx
 * function, which returns two results in a tuple. The first result, called the
 * “block,” is a possible promise which represents the duration for which the
 * component is blocked from accepting new updates. The second result, called
 * the “value,” is the actual result of the update. The runCtx function caches
 * block/value from the stepCtx function on the context, according to whether
 * the component blocks. The “inflight” block/value properties are the
 * currently executing update, and the “enqueued” block/value properties
 * represent an enqueued next stepCtx. Enqueued steps are dequeued every time
 * the current block promise settles.
 */
function runCtx<TNode, TResult>(
	ctx: Context<unknown, TResult>,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (!ctx._ib) {
		try {
			const [block, value] = stepCtx<TNode, TResult>(ctx);
			if (block) {
				ctx._ib = block
					.catch((err) => {
						if (!(ctx._f & IsUpdating)) {
							return propagateError<TNode>(ctx._pa, err);
						}
					})
					.finally(() => advanceCtx(ctx));
				// stepCtx will only return a block if the value is asynchronous
				ctx._iv = value as Promise<ElementValue<TNode>>;
			}

			return value;
		} catch (err) {
			if (!(ctx._f & IsUpdating)) {
				return propagateError<TNode>(ctx._pa, err);
			}

			throw err;
		}
	} else if (ctx._f & IsAsyncGen) {
		return ctx._iv;
	} else if (!ctx._eb) {
		let resolve: Function;
		ctx._eb = ctx._ib
			.then(() => {
				try {
					const [block, value] = stepCtx<TNode, TResult>(ctx);
					resolve(value);
					if (block) {
						return block.catch((err) => {
							if (!(ctx._f & IsUpdating)) {
								return propagateError<TNode>(ctx._pa, err);
							}
						});
					}
				} catch (err) {
					if (!(ctx._f & IsUpdating)) {
						return propagateError<TNode>(ctx._pa, err);
					}
				}
			})
			.finally(() => advanceCtx(ctx));
		ctx._ev = new Promise((resolve1) => (resolve = resolve1));
	}

	return ctx._ev;
}

/**
 * Called to make props available to the props async iterator for async
 * generator components.
 */
export function resumeCtx(ctx: Context): void {
	if (ctx._oa) {
		ctx._oa();
		ctx._oa = undefined;
	} else {
		ctx._f |= IsAvailable;
	}
}

export function updateCtx<TNode>(
	ctx: Context,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	ctx._f |= IsUpdating;
	resumeCtx(ctx);
	return runCtx(ctx);
}

export function updateCtxChildren<TNode, TResult>(
	ctx: Context<unknown, TResult>,
	children: Children,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	return updateChildren<TNode, unknown, unknown, TResult>(
		ctx._re as Renderer<TNode, unknown, unknown, TResult>,
		ctx._rt,
		ctx._ho,
		ctx,
		ctx._sc,
		ctx._el,
		narrow(children),
	);
}

export function commitCtx<TNode>(
	ctx: Context,
	values: Array<TNode | string>,
): ElementValue<TNode> {
	if (ctx._f & IsUnmounted) {
		return;
	}

	const listeners = listenersMap.get(ctx);
	if (listeners && listeners.length) {
		for (let i = 0; i < values.length; i++) {
			const value = values[i];
			if (isEventTarget(value)) {
				for (let j = 0; j < listeners.length; j++) {
					const record = listeners[j];
					value.addEventListener(record.type, record.callback, record.options);
				}
			}
		}
	}

	if (!(ctx._f & IsUpdating)) {
		const listeners = getListeners(ctx._pa, ctx._ho);
		if (listeners.length) {
			for (let i = 0; i < values.length; i++) {
				const value = values[i];
				if (isEventTarget(value)) {
					for (let j = 0; j < listeners.length; j++) {
						const record = listeners[j];
						value.addEventListener(
							record.type,
							record.callback,
							record.options,
						);
					}
				}
			}
		}

		const host = ctx._ho;
		const hostValues = getChildValues(host);
		ctx._re.arrange(
			host,
			host.tag === Portal ? host.props.root : host._n,
			hostValues,
		);

		if (hostValues.length) {
			host._f |= HadChildren;
		} else {
			host._f &= ~HadChildren;
		}

		ctx._re.complete(ctx._rt);
	}

	ctx._f &= ~IsUpdating;
	const value = unwrap(values);
	const callbacks = scheduleMap.get(ctx);
	if (callbacks && callbacks.size) {
		// We must clear the set of callbacks before calling them, because a
		// callback which refreshes the component would otherwise cause a stack
		// overflow.
		const callbacks1 = Array.from(callbacks);
		callbacks.clear();
		const value1 = ctx._re.read(value);
		for (const callback of callbacks1) {
			callback(value1);
		}
	}

	return value;
}

// TODO: async unmounting
export function unmountCtx(ctx: Context): void {
	ctx._f |= IsUnmounted;
	clearEventListeners(ctx);
	const callbacks = cleanupMap.get(ctx);
	if (callbacks && callbacks.size) {
		const value = ctx._re.read(getValue(ctx._el));
		for (const cleanup of callbacks) {
			cleanup(value);
		}

		callbacks.clear();
	}

	if (!(ctx._f & IsDone)) {
		ctx._f |= IsDone;
		resumeCtx(ctx);
		if (ctx._it && typeof ctx._it.return === "function") {
			try {
				ctx._f |= IsExecuting;
				const iteration = ctx._it.return();
				if (isPromiseLike(iteration)) {
					iteration.catch((err) => propagateError<unknown>(ctx._pa, err));
				}
			} finally {
				ctx._f &= ~IsExecuting;
			}
		}
	}
}

/*** ERROR HANDLING UTILITIES ***/

// TODO: generator components which throw errors should be recoverable
export function handleChildError<TNode>(
	ctx: Context,
	err: unknown,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (ctx._f & IsDone || !ctx._it || typeof ctx._it.throw !== "function") {
		throw err;
	}

	resumeCtx(ctx);
	let iteration: ChildrenIteration;
	try {
		ctx._f |= IsExecuting;
		iteration = ctx._it.throw(err);
	} catch (err) {
		ctx._f |= IsDone;
		throw err;
	} finally {
		ctx._f &= ~IsExecuting;
	}

	if (isPromiseLike(iteration)) {
		return iteration.then(
			(iteration) => {
				if (iteration.done) {
					ctx._f |= IsDone;
				}

				return updateCtxChildren(ctx, iteration.value as Children);
			},
			(err) => {
				ctx._f |= IsDone;
				throw err;
			},
		);
	}

	if (iteration.done) {
		ctx._f |= IsDone;
	}

	return updateCtxChildren(ctx, iteration.value as Children);
}

export function propagateError<TNode>(
	ctx: Context | undefined,
	err: unknown,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (ctx === undefined) {
		throw err;
	}

	let result: Promise<ElementValue<TNode>> | ElementValue<TNode>;
	try {
		result = handleChildError(ctx, err);
	} catch (err) {
		return propagateError<TNode>(ctx._pa, err);
	}

	if (isPromiseLike(result)) {
		return result.catch((err) => propagateError<TNode>(ctx._pa, err));
	}

	return result;
}
