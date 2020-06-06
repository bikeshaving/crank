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
}

function normalizeOptions(
	options?: boolean | null | AddEventListenerOptions,
): AddEventListenerOptions {
	let capture = false;
	let passive: boolean | undefined;
	let once: boolean | undefined;
	if (typeof options === "boolean") {
		capture = options;
	} else if (options != null) {
		capture = !!options.capture;
		passive = options.passive;
		once = options.once;
	}

	return {capture, passive, once};
}

export function isEventTarget(value: any): value is EventTarget {
	return (
		value != null &&
		typeof value.addEventListener === "function" &&
		typeof value.removeEventListener === "function" &&
		typeof value.dispatchEvent === "function"
	);
}

function recordsEqual(
	record1: EventListenerRecord,
	record2: EventListenerRecord,
): boolean {
	return (
		record1.type === record2.type &&
		record1.callback === record2.callback &&
		record1.options.capture === record2.options.capture
	);
}

function logError(err: unknown): void {
	/* eslint-disable no-console */
	if (typeof console !== "undefined" && typeof console.error === "function") {
		console.error(err);
	}
	/* eslint-enable no-console */
}

function setEventProperty<T extends keyof Event>(
	ev: Event,
	key: T,
	value: Event[T],
): void {
	Object.defineProperty(ev, key, {
		value,
		writable: false,
		configurable: true,
	});
}

export class CrankEventTarget implements EventTarget {
	parent: CrankEventTarget | undefined;
	_listeners: EventListenerRecord[] | undefined;
	// TODO: let this be an EventTarget to save on memory
	_delegates: Set<EventTarget> | undefined;
	constructor(parent?: CrankEventTarget | undefined) {
		this.parent = parent;
	}

	addEventListener<T extends string>(
		type: T,
		callback: MappedEventListener<T> | null,
		options?: boolean | AddEventListenerOptions,
	): void {
		if (callback == null) {
			return;
		} else if (typeof callback === "object") {
			// TODO: support handleEvent style listeners
			throw new Error("EventListener objects not supported");
		} else if (typeof this._listeners === "undefined") {
			this._listeners = [];
		}

		options = normalizeOptions(options);
		const record: EventListenerRecord = {type, callback, options};
		const idx = this._listeners.findIndex(recordsEqual.bind(null, record));
		if (idx !== -1) {
			return;
		}

		this._listeners.push(record);
		if (options.once) {
			const self = this;
			callback = function (this: any, ev) {
				const result = callback!.call(this, ev);
				self.removeEventListener(record.type, record.callback, record.options);
				return result;
			};
		}

		if (typeof this._delegates !== "undefined") {
			for (const delegate of this._delegates) {
				delegate.addEventListener(type, callback, options);
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
		const record: EventListenerRecord = {type, callback, options};
		const idx = this._listeners.findIndex(recordsEqual.bind(null, record));
		if (idx === -1) {
			return;
		}

		this._listeners.splice(idx, 1);
		if (typeof this._delegates !== "undefined") {
			for (const delegate of this._delegates) {
				delegate.removeEventListener(type, callback, options);
			}
		}
	}

	dispatchEvent(ev: Event): boolean {
		const path: CrankEventTarget[] = [];
		for (
			let parent = this.parent;
			parent !== undefined;
			parent = parent.parent
		) {
			path.push(parent);
		}

		let stopped = false;
		const stopImmediatePropagation = ev.stopImmediatePropagation;
		ev.stopImmediatePropagation = () => {
			stopped = true;
			return stopImmediatePropagation.apply(ev, arguments as any);
		};

		setEventProperty(ev, "target", this);
		setEventProperty(ev, "eventPhase", CAPTURING_PHASE);

		for (let i = path.length - 1; i >= 0; i--) {
			const et = path[i];
			setEventProperty(ev, "currentTarget", et);
			if (typeof et._listeners !== "undefined") {
				for (const record of et._listeners) {
					if (record.type === ev.type && record.options.capture) {
						try {
							record.callback.call(this, ev);
						} catch (err) {
							logError(err);
						}

						if (stopped) {
							break;
						}
					}
				}
			}

			if (stopped || ev.cancelBubble) {
				setEventProperty(ev, "eventPhase", NONE);
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
						logError(err);
					}

					if (stopped) {
						break;
					}
				}
			}

			if (stopped || ev.cancelBubble) {
				setEventProperty(ev, "eventPhase", NONE);
				return !ev.defaultPrevented;
			}
		}

		if (ev.bubbles) {
			setEventProperty(ev, "eventPhase", BUBBLING_PHASE);
			for (const et of path) {
				setEventProperty(ev, "currentTarget", et);
				if (typeof et._listeners !== "undefined") {
					for (const record of et._listeners) {
						if (record.type === ev.type && !record.options.capture) {
							try {
								record.callback.call(this, ev);
							} catch (err) {
								logError(err);
							}

							if (stopped) {
								break;
							}
						}
					}
				}

				if (stopped || ev.cancelBubble) {
					setEventProperty(ev, "eventPhase", NONE);
					return !ev.defaultPrevented;
				}
			}
		}

		setEventProperty(ev, "eventPhase", NONE);
		return !ev.defaultPrevented;
	}
}

export function setDelegates(
	et: CrankEventTarget,
	// TODO: allow delegates to be anything
	delegates: Iterable<unknown>,
): void {
	const delegates1 = new Set(Array.from(delegates).filter(isEventTarget));
	if (typeof et._listeners !== "undefined") {
		let removed: Set<EventTarget>;
		let added: Set<EventTarget>;
		if (et._delegates === undefined) {
			removed = new Set();
			added = delegates1;
		} else {
			removed = new Set(
				Array.from(et._delegates).filter((d) => !delegates1.has(d)),
			);
			added = new Set(
				Array.from(delegates1).filter((d) => !et._delegates!.has(d)),
			);
		}

		for (const delegate of removed) {
			for (const record of et._listeners) {
				delegate.removeEventListener(
					record.type,
					record.callback,
					record.options,
				);
			}
		}

		for (const delegate of added) {
			for (const record of et._listeners) {
				delegate.addEventListener(record.type, record.callback, record.options);
			}
		}
	}

	et._delegates = delegates1;
}

export function clearEventListeners(et: CrankEventTarget): void {
	if (typeof et._listeners !== "undefined") {
		// We shallow copy _listeners because removeEventListener will mutate it.
		const records = et._listeners.slice();
		for (const record of records) {
			et.removeEventListener(record.type, record.callback, record.options);
		}
	}
}
