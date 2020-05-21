import {ComponentNode} from "./index";
import {MaybePromise} from "./utils";
import {EventTarget} from "event-target-shim";

export interface ProvisionMap {}

const componentNodes = new WeakMap<Context<any>, ComponentNode<any, any>>();
const eventTargets = new WeakMap<Context<any>, EventTarget>();

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

export class Context<TProps = any> {
	parent: Context | undefined;
	constructor(host: ComponentNode<any, TProps>, parent: Context | undefined) {
		this.parent = parent;
		eventTargets.set(this, new EventTarget());
		componentNodes.set(this, host);
	}

	listeners: EventListenerRecord[] | undefined = undefined;

	/* eslint-disable no-dupe-class-members */
	get<T extends keyof ProvisionMap>(name: T): ProvisionMap[T];
	get(name: any): any;
	get(name: any) {
		return componentNodes.get(this)!.get(name);
	}

	set<T extends keyof ProvisionMap>(name: T, value: ProvisionMap[T]): void;
	set(name: any, value: any): void;
	set(name: any, value: any) {
		componentNodes.get(this)!.set(name, value);
	}
	/* eslint-enable no-dupe-class-members */

	[Symbol.iterator](): Generator<TProps> {
		return componentNodes.get(this)![Symbol.iterator]();
	}

	[Symbol.asyncIterator](): AsyncGenerator<TProps> {
		return componentNodes.get(this)![Symbol.asyncIterator]();
	}

	refresh(): MaybePromise<undefined> {
		return componentNodes.get(this)!.refresh();
	}

	schedule(callback: (value: unknown) => unknown): void {
		return componentNodes.get(this)!.schedule(callback);
	}

	cleanup(callback: (value: unknown) => unknown): void {
		return componentNodes.get(this)!.cleanup(callback);
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

		const delegate = componentNodes.get(this)!.delegate;
		const delegates = componentNodes.get(this)!.delegates;
		if (delegate !== undefined) {
			delegate.addEventListener(type, callback, options);
		} else if (delegates !== undefined) {
			for (const delegate of delegates) {
				delegate.addEventListener(type, callback, options);
			}
		}
		const eventTarget = eventTargets.get(this);
		return eventTarget!.addEventListener(type, callback, options);
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

		const delegate = componentNodes.get(this)!.delegate;
		const delegates = componentNodes.get(this)!.delegates;

		if (delegate !== undefined) {
			delegate.removeEventListener(type, callback, options);
		} else if (delegates !== undefined) {
			for (const delegate of delegates) {
				delegate.removeEventListener(type, callback, options);
			}
		}
		const eventTarget = eventTargets.get(this);
		return eventTarget!.removeEventListener(type, callback, options);
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
		const eventTarget = eventTargets.get(this);
		let continued = eventTarget!.dispatchEvent(ev);
		if (continued && ev.bubbles && this.parent !== undefined) {
			// TODO: implement event capturing
			continued = this.parent.dispatchEvent(ev);
		}

		return continued;
	}
}
