import {Context} from "./context";
import {Element, getChildValues} from "./elements";

/*** EVENT TARGET UTILITIES ***/

// EVENT PHASE CONSTANTS
// https://developer.mozilla.org/en-US/docs/Web/API/Event/eventPhase
export const NONE = 0;
export const CAPTURING_PHASE = 1;
export const AT_TARGET = 2;
export const BUBBLING_PHASE = 3;

/**
 * A map of event type strings to Event subclasses. Can be extended via
 * TypeScript module augmentation to have strongly typed event listeners.
 */
export interface EventMap extends Crank.EventMap {
	[type: string]: Event;
}

export type MappedEventListener<T extends string> = (
	ev: EventMap[T],
) => unknown;

export type MappedEventListenerOrEventListenerObject<T extends string> =
	| MappedEventListener<T>
	| {handleEvent: MappedEventListener<T>};

export interface EventListenerRecord {
	type: string;
	callback: MappedEventListener<any>;
	listener: MappedEventListenerOrEventListenerObject<any>;
	options: AddEventListenerOptions;
}

export const listenersMap = new WeakMap<Context, Array<EventListenerRecord>>();

export function normalizeOptions(
	options: AddEventListenerOptions | boolean | null | undefined,
): AddEventListenerOptions {
	if (typeof options === "boolean") {
		return {capture: options};
	} else if (options == null) {
		return {};
	}

	return options;
}

export function isEventTarget(value: any): value is EventTarget {
	return (
		value != null &&
		typeof value.addEventListener === "function" &&
		typeof value.removeEventListener === "function" &&
		typeof value.dispatchEvent === "function"
	);
}

export function setEventProperty<T extends keyof Event>(
	ev: Event,
	key: T,
	value: Event[T],
): void {
	Object.defineProperty(ev, key, {value, writable: false, configurable: true});
}

/**
 * A function to reconstruct an array of every listener given a context and a
 * host element.
 *
 * This function exploits the fact that contexts retain their nearest ancestor
 * host element. We can determine all the contexts which are directly listening
 * to an element by traversing up the context tree and checking that the host
 * element passed in matches the parent context’s host element.
 *
 * TODO: Maybe we can pass in the current context directly, rather than
 * starting from the parent?
 */
export function getListeners(
	ctx: Context | undefined,
	host: Element<string | symbol>,
): Array<EventListenerRecord> {
	let listeners: Array<EventListenerRecord> = [];
	while (ctx !== undefined && ctx._ho === host) {
		const listeners1 = listenersMap.get(ctx);
		if (listeners1) {
			listeners = listeners.concat(listeners1);
		}

		ctx = ctx._pa;
	}

	return listeners;
}

export function clearEventListeners(ctx: Context): void {
	const listeners = listenersMap.get(ctx);
	if (listeners && listeners.length) {
		for (const value of getChildValues(ctx._el)) {
			if (isEventTarget(value)) {
				for (const record of listeners) {
					value.removeEventListener(
						record.type,
						record.callback,
						record.options,
					);
				}
			}
		}

		listeners.length = 0;
	}
}
