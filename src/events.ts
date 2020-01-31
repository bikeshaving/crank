import {EventTarget as EventTargetShim} from "event-target-shim";

interface EventListenerRecord {
	type: string;
	callback: EventListenerOrEventListenerObject;
	options: AddEventListenerOptions;
}

function normalizeOptions(
	options?: boolean | AddEventListenerOptions,
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

// TODO: strongly typed events somehow
export class CrankEventTarget extends EventTargetShim implements EventTarget {
	constructor(private parent?: CrankEventTarget) {
		super();
	}

	// TODO: maybe use a helper class?
	// we need a map from:
	// type -> capture -> listener record
	// for efficient querying
	private listeners: EventListenerRecord[] = [];

	private _delegates: Set<EventTarget> = new Set();

	get delegates(): Set<EventTarget> {
		return this._delegates;
	}

	set delegates(delegates: Set<EventTarget>) {
		const removed = new Set(
			Array.from(this._delegates).filter((d) => !delegates.has(d)),
		);
		const added = new Set(
			Array.from(delegates).filter((d) => !this._delegates.has(d)),
		);

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

		this._delegates = delegates;
	}

	addEventListener(
		type: string,
		callback: EventListenerOrEventListenerObject | null,
		options?: boolean | AddEventListenerOptions,
	): unknown {
		if (callback == null) {
			return;
		}

		options = normalizeOptions(options);
		const record: EventListenerRecord = {type, callback, options};
		if (options.once) {
			if (typeof callback === "object") {
				throw new Error("options.once not implemented for listener objects");
			} else {
				const self = this;
				record.callback = function(ev: any) {
					const result = callback.call(this, ev);
					self.removeEventListener(
						record.type,
						record.callback,
						record.options,
					);
					return result;
				};
			}
		}

		if (record.type.slice(0, 6) !== "crank.") {
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
		}

		for (const delegate of this.delegates) {
			delegate.addEventListener(type, callback, options);
		}

		return super.addEventListener(type, callback, options);
	}

	removeEventListener(
		type: string,
		callback: EventListenerOrEventListenerObject | null,
		options?: EventListenerOptions | boolean,
	): void {
		if (callback == null) {
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
		for (const delegate of this.delegates) {
			delegate.removeEventListener(type, callback, options);
		}

		return super.removeEventListener(type, callback, options);
	}

	clearEventListeners(): void {
		for (const listener of this.listeners.slice()) {
			this.removeEventListener(
				listener.type,
				listener.callback,
				listener.options,
			);
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

export function isEventTarget(value: any): value is EventTarget {
	return (
		value != null &&
		typeof value.addEventListener === "function" &&
		typeof value.removeEventListener === "function" &&
		typeof value.dispatchEvent === "function"
	);
}
