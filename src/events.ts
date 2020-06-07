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
		!record1.options.capture === !record2.options.capture
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
	Object.defineProperty(ev, key, {value, writable: false, configurable: true});
}

export class CrankEventTarget implements EventTarget {
	parent: CrankEventTarget | undefined;
	_listeners: EventListenerRecord[] | undefined;
	_delegates: Set<EventTarget> | EventTarget | undefined;
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
		if (this._listeners.some(recordsEqual.bind(null, record))) {
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
			if (isEventTarget(this._delegates)) {
				this._delegates.addEventListener(type, callback, options);
			} else {
				for (const delegate of this._delegates) {
					delegate.addEventListener(type, callback, options);
				}
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
		const i = this._listeners.findIndex(recordsEqual.bind(null, record));
		if (i === -1) {
			return;
		}

		this._listeners.splice(i, 1);
		if (typeof this._delegates !== "undefined") {
			if (isEventTarget(this._delegates)) {
				this._delegates.removeEventListener(type, callback, options);
			} else {
				for (const delegate of this._delegates) {
					delegate.removeEventListener(type, callback, options);
				}
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
								logError(err);
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
							logError(err);
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
									logError(err);
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
}

export function setDelegates(et: CrankEventTarget, delegates: unknown): void {
	if (typeof et._delegates === "undefined") {
		if (isEventTarget(delegates)) {
			et._delegates = delegates;
			if (typeof et._listeners !== "undefined") {
				for (const record of et._listeners) {
					et._delegates.addEventListener(
						record.type,
						record.callback,
						record.options,
					);
				}
			}
		} else if (Array.isArray(delegates)) {
			et._delegates = new Set(delegates.filter(isEventTarget));
			if (typeof et._listeners !== "undefined") {
				for (const record of et._listeners) {
					for (const delegate of et._delegates) {
						delegate.addEventListener(
							record.type,
							record.callback,
							record.options,
						);
					}
				}
			}
		}
	} else if (isEventTarget(et._delegates)) {
		if (isEventTarget(delegates)) {
			if (et._delegates !== delegates) {
				if (typeof et._listeners !== "undefined") {
					for (const record of et._listeners) {
						et._delegates.removeEventListener(
							record.type,
							record.callback,
							record.options,
						);
						delegates.addEventListener(
							record.type,
							record.callback,
							record.options,
						);
					}
				}

				et._delegates = delegates;
			}
		} else if (Array.isArray(delegates)) {
			const delegates1 = new Set(delegates.filter(isEventTarget));
			if (typeof et._listeners !== "undefined") {
				for (const record of et._listeners) {
					et._delegates.removeEventListener(
						record.type,
						record.callback,
						record.options,
					);
					for (const delegate of delegates1) {
						delegate.addEventListener(
							record.type,
							record.callback,
							record.options,
						);
					}
				}
			}

			et._delegates = delegates1;
		} else {
			et._delegates = undefined;
		}
	} else {
		const delegates1 = et._delegates;
		let delegates2: Set<EventTarget>;
		if (isEventTarget(delegates)) {
			delegates2 = new Set([delegates]);
			et._delegates = delegates;
		} else if (Array.isArray(delegates)) {
			delegates2 = new Set(delegates.filter(isEventTarget));
			et._delegates = delegates2;
		} else {
			delegates2 = new Set();
			et._delegates = undefined;
		}

		if (typeof et._listeners !== "undefined") {
			const removed = new Set(
				Array.from(delegates1).filter((d) => !delegates2.has(d)),
			);
			const added = new Set(
				Array.from(delegates2).filter((d) => !delegates1.has(d)),
			);

			for (const record of et._listeners) {
				for (const delegate of removed) {
					delegate.removeEventListener(
						record.type,
						record.callback,
						record.options,
					);
				}
				for (const delegate of added) {
					delegate.addEventListener(
						record.type,
						record.callback,
						record.options,
					);
				}
			}
		}
	}
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
