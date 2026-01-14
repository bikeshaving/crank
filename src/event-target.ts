// EVENT PHASE CONSTANTS
// https://developer.mozilla.org/en-US/docs/Web/API/Event/eventPhase
const NONE = 0;
const CAPTURING_PHASE = 1;
const AT_TARGET = 2;
const BUBBLING_PHASE = 3;

export function isEventTarget(value: any): value is EventTarget {
	return (
		value != null &&
		typeof value.addEventListener === "function" &&
		typeof value.removeEventListener === "function" &&
		typeof value.dispatchEvent === "function"
	);
}

function setEventProperty<T extends keyof Event>(
	ev: Event,
	key: T,
	value: Event[T],
): void {
	Object.defineProperty(ev, key, {value, writable: false, configurable: true});
}

function isListenerOrListenerObject(
	value: unknown,
): value is EventListenerOrEventListenerObject {
	return (
		typeof value === "function" ||
		(value !== null &&
			typeof value === "object" &&
			typeof (value as any).handleEvent === "function")
	);
}

function normalizeListenerOptions(
	options: AddEventListenerOptions | boolean | null | undefined,
): AddEventListenerOptions {
	if (typeof options === "boolean") {
		return {capture: options};
	} else if (options == null) {
		return {};
	}

	return options;
}

const _parent = Symbol.for("CustomEventTarget.parent");
const _listeners = Symbol.for("CustomEventTarget.listeners");
const _delegates = Symbol.for("CustomEventTarget.delegates");
const _dispatchEventOnSelf = Symbol.for("CustomEventTarget.dispatchSelf");

interface EventListenerRecord {
	type: string;
	// listener is the original value passed to addEventListener, callback is the
	// actual function we call
	listener: EventListenerOrEventListenerObject;
	callback: EventListener;
	options: AddEventListenerOptions;
}

export class CustomEventTarget<
	TParent extends CustomEventTarget<TParent> = any,
> implements EventTarget {
	declare static dispatchEventOnSelf: typeof _dispatchEventOnSelf;
	declare [_parent]: TParent | null;
	declare [_listeners]: Array<EventListenerRecord>;
	declare [_delegates]: Set<EventTarget>;
	constructor(parent: TParent | null = null) {
		this[_parent] = parent;
		this[_listeners] = [];
		this[_delegates] = new Set<EventTarget>();
	}

	addEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject | null,
		options?: boolean | AddEventListenerOptions,
	): void {
		if (!isListenerOrListenerObject(listener)) {
			return;
		}

		const listeners = this[_listeners];
		options = normalizeListenerOptions(options);
		let callback: EventListener;
		if (typeof listener === "function") {
			callback = listener;
		} else {
			callback = (ev: Event) => listener.handleEvent(ev);
		}
		const record: EventListenerRecord = {type, listener, callback, options};

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

		for (const delegate of this[_delegates]) {
			delegate.addEventListener(type, record.callback, record.options);
		}
	}

	removeEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject | null,
		options?: EventListenerOptions | boolean,
	): void {
		const listeners = this[_listeners];
		if (listeners == null || !isListenerOrListenerObject(listener)) {
			return;
		}

		const options1 = normalizeListenerOptions(options);
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

		for (const delegate of this[_delegates]) {
			delegate.removeEventListener(
				record.type,
				record.callback,
				record.options,
			);
		}
	}

	dispatchEvent(ev: Event): boolean {
		const path: Array<CustomEventTarget> = [];
		for (let parent = this[_parent]; parent; parent = parent[_parent]) {
			path.push(parent);
		}

		let cancelBubble = false;
		let immediateCancelBubble = false;
		const stopPropagation = ev.stopPropagation;
		setEventProperty(ev, "stopPropagation", () => {
			cancelBubble = true;
			return stopPropagation.call(ev);
		});

		const stopImmediatePropagation = ev.stopImmediatePropagation;
		setEventProperty(ev, "stopImmediatePropagation", () => {
			immediateCancelBubble = true;
			return stopImmediatePropagation.call(ev);
		});
		setEventProperty(ev, "target", this);

		// The only possible errors in this block are errors thrown by callbacks,
		// and dispatchEvent will only log these errors rather than throwing them.
		// Therefore, we place all code in a try block, log errors in the catch
		// block, and use an unsafe return statement in the finally block.
		//
		// Each early return within the try block returns true because while the
		// return value is overridden in the finally block, TypeScript
		// (justifiably) does not recognize the unsafe return statement.
		try {
			setEventProperty(ev, "eventPhase", CAPTURING_PHASE);
			for (let i = path.length - 1; i >= 0; i--) {
				const target = path[i];
				const listeners = target[_listeners];
				setEventProperty(ev, "currentTarget", target);
				for (let i = 0; i < listeners.length; i++) {
					const record = listeners[i];
					if (record.type === ev.type && record.options.capture) {
						try {
							record.callback.call(target, ev);
						} catch (err) {
							console.error(err);
						}

						if (immediateCancelBubble) {
							return true;
						}
					}
				}

				if (cancelBubble) {
					return true;
				}
			}

			{
				setEventProperty(ev, "eventPhase", AT_TARGET);
				setEventProperty(ev, "currentTarget", this);

				this[_dispatchEventOnSelf](ev);
				if (immediateCancelBubble) {
					return true;
				}

				const listeners = this[_listeners];
				for (let i = 0; i < listeners.length; i++) {
					const record = listeners[i];
					if (record.type === ev.type) {
						try {
							record.callback.call(this, ev);
						} catch (err) {
							console.error(err);
						}

						if (immediateCancelBubble) {
							return true;
						}
					}
				}

				if (cancelBubble) {
					return true;
				}
			}

			if (ev.bubbles) {
				setEventProperty(ev, "eventPhase", BUBBLING_PHASE);
				for (let i = 0; i < path.length; i++) {
					const target = path[i];
					setEventProperty(ev, "currentTarget", target);
					const listeners = target[_listeners];
					for (let i = 0; i < listeners.length; i++) {
						const record = listeners[i];
						if (record.type === ev.type && !record.options.capture) {
							try {
								record.callback.call(target, ev);
							} catch (err) {
								console.error(err);
							}

							if (immediateCancelBubble) {
								return true;
							}
						}
					}

					if (cancelBubble) {
						return true;
					}
				}
			}
		} finally {
			setEventProperty(ev, "eventPhase", NONE);
			setEventProperty(ev, "currentTarget", null);
			// eslint-disable-next-line no-unsafe-finally
			return !ev.defaultPrevented;
		}
	}

	[_dispatchEventOnSelf](_ev: Event): void {}
}

CustomEventTarget.dispatchEventOnSelf = _dispatchEventOnSelf;

export function addEventTargetDelegates<T extends CustomEventTarget>(
	target: T,
	delegates: Array<unknown>,
	include: (target1: T) => boolean = (target1) => target === target1,
): void {
	const delegates1 = delegates.filter(isEventTarget);
	for (
		let target1: T | null = target;
		target1 && include(target1);
		target1 = target1[_parent]
	) {
		for (let i = 0; i < delegates1.length; i++) {
			const delegate = delegates1[i];
			if (target1[_delegates].has(delegate)) {
				continue;
			}

			target1[_delegates].add(delegate);
			for (const record of target1[_listeners]) {
				delegate.addEventListener(record.type, record.callback, record.options);
			}
		}
	}
}

export function removeEventTargetDelegates<T extends CustomEventTarget>(
	target: T,
	delegates: Array<unknown>,
	include: (target1: T) => boolean = (target1) => target === target1,
): void {
	const delegates1 = delegates.filter(isEventTarget);
	for (
		let target1: T | null = target;
		target1 && include(target1);
		target1 = target1[_parent]
	) {
		for (let i = 0; i < delegates1.length; i++) {
			const delegate = delegates1[i];
			if (!target1[_delegates].has(delegate)) {
				continue;
			}

			target1[_delegates].delete(delegate);
			for (const record of target1[_listeners]) {
				delegate.removeEventListener(
					record.type,
					record.callback,
					record.options,
				);
			}
		}
	}
}

export function clearEventListeners(target: CustomEventTarget): void {
	const listeners = target[_listeners];
	const delegates = target[_delegates];
	for (let i = 0; i < listeners.length; i++) {
		const record = listeners[i];
		for (const delegate of delegates) {
			delegate.removeEventListener(
				record.type,
				record.callback,
				record.options,
			);
		}
	}

	listeners.length = 0;
	delegates.clear();
}
