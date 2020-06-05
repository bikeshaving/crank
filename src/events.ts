import {EventTarget as EventTargetShim} from "event-target-shim";

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
		// TODO: maybe we don’t need these checks
		typeof value.removeEventListener === "function" &&
		typeof value.dispatchEvent === "function"
	);
}

export class CrankEventTarget extends EventTargetShim implements EventTarget {
	// TODO: maybe use a helper class?
	// we need a map from:
	// type -> capture -> listener record
	// for efficient querying
	private listeners: EventListenerRecord[] | undefined = undefined;
	private delegate: EventTarget | undefined = undefined;
	private delegates: Set<EventTarget> | undefined = undefined;
	constructor(protected parent: CrankEventTarget | undefined) {
		super();
	}

	setDelegate(delegate: EventTarget) {
		if (this.delegates !== undefined) {
			if (this.listeners !== undefined) {
				for (const delegate of this.delegates) {
					for (const listener of this.listeners) {
						delegate.removeEventListener(
							listener.type,
							listener.callback,
							listener.options,
						);
					}
				}
			}

			this.delegates = undefined;
		}

		if (this.delegate !== delegate) {
			if (this.listeners !== undefined) {
				if (this.delegate !== undefined) {
					for (const listener of this.listeners) {
						this.delegate.removeEventListener(
							listener.type,
							listener.callback,
							listener.options,
						);
					}
				}

				for (const listener of this.listeners) {
					delegate.addEventListener(
						listener.type,
						listener.callback,
						listener.options,
					);
				}
			}

			this.delegate = delegate;
		}
	}

	setDelegates(delegates: Iterable<unknown>) {
		if (this.delegate !== undefined) {
			this.delegates = new Set([this.delegate]);
			this.delegate = undefined;
		}

		const delegates1 = new Set(Array.from(delegates).filter(isEventTarget));
		if (this.listeners !== undefined) {
			let removed: Set<EventTarget>;
			let added: Set<EventTarget>;
			if (this.delegates === undefined) {
				removed = new Set();
				added = delegates1;
			} else {
				removed = new Set(
					Array.from(this.delegates).filter((d) => !delegates1.has(d)),
				);
				added = new Set(
					Array.from(delegates1).filter((d) => !this.delegates!.has(d)),
				);
			}

			for (const delegate of removed) {
				for (const listener of this.listeners) {
					delegate.removeEventListener(
						listener.type,
						listener.callback,
						listener.options,
					);
				}
			}

			for (const delegate of added) {
				for (const listener of this.listeners) {
					delegate.addEventListener(
						listener.type,
						listener.callback,
						listener.options,
					);
				}
			}
		}

		this.delegates = delegates1;
	}

	addEventListener<T extends string>(
		type: T,
		callback: MappedEventListener<T> | null,
		options?: boolean | AddEventListenerOptions,
	): void {
		if (callback == null) {
			return;
		} else if (typeof callback === "object") {
			throw new Error("Listener objects are not supported");
		} else if (this.listeners === undefined) {
			this.listeners = [];
		}

		options = normalizeOptions(options);
		const record: EventListenerRecord = {type, callback, options};
		if (options.once) {
			const self = this;
			record.callback = function (ev: any) {
				const result = callback.call(this, ev);
				self.removeEventListener(record.type, record.callback, record.options);
				return result;
			};
		}

		const idx = this.listeners.findIndex((record1) => {
			return (
				record.type === record1.type &&
				record.callback === record1.callback &&
				record.options.capture === record1.options.capture
			);
		});

		if (idx <= -1) {
			this.listeners.push(record);
		}

		if (this.delegate !== undefined) {
			this.delegate.addEventListener(type, callback, options);
		} else if (this.delegates !== undefined) {
			for (const delegate of this.delegates) {
				delegate.addEventListener(type, callback, options);
			}
		}

		return super.addEventListener(type, callback, options);
	}

	removeEventListener<T extends string>(
		type: T,
		callback: MappedEventListener<T> | null,
		options?: EventListenerOptions | boolean,
	): void {
		if (callback == null || this.listeners === undefined) {
			return;
		}

		const capture =
			typeof options === "boolean" ? options : !!(options && options.capture);
		const idx = this.listeners.findIndex((record) => {
			return (
				record.type === type &&
				record.callback === callback &&
				record.options.capture === capture
			);
		});
		const record = this.listeners[idx];
		if (record !== undefined) {
			this.listeners.splice(idx, 1);
		}

		if (this.delegate !== undefined) {
			this.delegate.removeEventListener(type, callback, options);
		} else if (this.delegates !== undefined) {
			for (const delegate of this.delegates) {
				delegate.removeEventListener(type, callback, options);
			}
		}

		return super.removeEventListener(type, callback, options);
	}

	clearEventListeners(): void {
		if (this.listeners !== undefined) {
			// we slice this.listeners to create a shallow copy because
			// this.removeEventListener will mutate the listeners array
			for (const listener of this.listeners.slice()) {
				this.removeEventListener(
					listener.type,
					listener.callback,
					listener.options,
				);
			}
		}
	}

	// TODO: ev is any because event-target-shim has a weird dispatchEvent type
	dispatchEvent(ev: any): boolean {
		let continued = super.dispatchEvent(ev);
		if (continued && ev.bubbles && this.parent !== undefined) {
			// TODO: implement event capturing
			continued = this.parent.dispatchEvent(ev);
		}

		return continued;
	}
}
