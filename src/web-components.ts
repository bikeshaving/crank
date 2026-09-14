/// <reference lib="dom" />
import {createElement} from "./crank.js";
import type {Component, Context} from "./crank.js";
import {renderer} from "./dom.js";

/**
 * `@b9g/crank/web-components` — write Web Components with Crank.
 *
 * Subclass `CrankHTMLElement`, declare configuration as static fields, and
 * define a `render` method. `render` is a normal Crank component (same forms,
 * same lifecycle), except `this` is the element and `ctx` is an argument.
 *
 * See https://github.com/bikeshaving/crank/issues/360.
 */

/**
 * Maps an `events` tuple or event map to `on<type>` handler properties. Merge
 * it into a subclass as an interface to type the handlers which its
 * `static events` generates:
 *
 * ```ts
 * interface XMarquee extends EventHandlers<{events: typeof XMarquee.events}> {}
 * class XMarquee extends CrankHTMLElement {
 *   static events = ["bounce", "finish"] as const;
 * }
 * ```
 *
 * A tuple gives names-only typing; an event map gives typed payloads.
 */
export type EventHandlers<O> = O extends {events: infer E}
	? E extends ReadonlyArray<infer N extends string>
		? {[K in N as `on${K}`]: ((ev: Event) => unknown) | null}
		: E extends Record<string, any>
			? {[K in keyof E as `on${string & K}`]: ((ev: E[K]) => unknown) | null}
			: {}
	: {};

type Props = Record<string, string | null>;

/** What `render` may return: any of Crank's four component forms. */
type RenderResult = ReturnType<Component<Props>>;

const _ElementState = Symbol.for("crank.ElementState");

interface ElementState {
	root: Element | ShadowRoot;
	bridge: Component;
	mounted: boolean;
	dirty: boolean;
	handlers: Record<string, ((ev: Event) => unknown) | null>;
	listeners: Record<string, EventListener | undefined>;
}

function attachRoot(
	el: CrankHTMLElement,
	shadow: boolean | ShadowRootInit,
): Element | ShadowRoot {
	if (!shadow) {
		return el;
	}

	const init: ShadowRootInit = shadow === true ? {mode: "open"} : shadow;
	// Reuse a declarative shadow root if one is already attached (SSR),
	// otherwise attach one now. A closed declarative shadow root is hidden from
	// the shadowRoot property and makes attachShadow throw; ElementInternals is
	// the one API which exposes it.
	let root = el.shadowRoot;
	if (root === null) {
		try {
			root = el.attachShadow(init);
		} catch (err) {
			root = el.attachInternals().shadowRoot;
			if (root === null) {
				throw err;
			}
		}
	}

	return root;
}

function getProps(el: CrankHTMLElement): Props {
	const names = (el.constructor as typeof CrankHTMLElement)
		.observedAttributes;
	const props: Props = {};
	if (names) {
		for (const name of names) {
			props[name] = el.getAttribute(name);
		}
	}

	return props;
}

// Properties assigned before the element was upgraded sit as own data
// properties shadowing the class accessors. Re-apply each through its accessor
// so getters/setters (and their re-render) take effect.
function upgradeProperties(el: CrankHTMLElement): void {
	for (const key of Object.keys(el)) {
		const own = Object.getOwnPropertyDescriptor(el, key);
		if (!own || !("value" in own)) {
			continue;
		}

		let proto = Object.getPrototypeOf(el);
		while (proto && proto !== HTMLElement.prototype) {
			const desc = Object.getOwnPropertyDescriptor(proto, key);
			if (desc && (desc.get || desc.set)) {
				const value = (el as any)[key];
				delete (el as any)[key];
				(el as any)[key] = value;
				break;
			}

			proto = Object.getPrototypeOf(proto);
		}
	}
}

function updateElement(el: CrankHTMLElement, state: ElementState): void {
	let result: unknown;
	try {
		result = renderer.render(
			createElement(state.bridge, getProps(el)),
			state.root,
		);
	} catch (err) {
		handleError(el, err);
		return;
	}

	if (
		result != null &&
		typeof (result as PromiseLike<unknown>).then === "function"
	) {
		(result as Promise<unknown>).catch((err) => handleError(el, err));
	}
}

function handleError(el: CrankHTMLElement, err: unknown): void {
	const event = new ErrorEvent("error", {
		error: err,
		message: err instanceof Error ? err.message : String(err),
		cancelable: true,
	});
	// dispatchEvent returns false when a handler calls preventDefault().
	const handled = !el.dispatchEvent(event);
	if (!handled) {
		reportError(err);
	}
}

// A faithful event-handler IDL attribute (like onclick): a forwarding closure
// registered lazily, so a non-null reassignment swaps the value without moving
// the listener; null removes it; setting again re-registers at the end. Like
// the platform, the handler is called with `this` set to the element. A value
// assigned before upgrade is re-applied through the accessor.
function defineEventHandler(
	el: CrankHTMLElement,
	state: ElementState,
	type: string,
): void {
	const existing = Object.getOwnPropertyDescriptor(el, "on" + type);
	Object.defineProperty(el, "on" + type, {
		configurable: true,
		enumerable: true,
		get() {
			return state.handlers[type] ?? null;
		},
		set(value: unknown) {
			const fn =
				typeof value === "function" ? (value as (ev: Event) => unknown) : null;
			if (fn) {
				if (!state.listeners[type]) {
					const listener: EventListener = (ev) => {
						const handler = state.handlers[type];
						if (handler) {
							handler.call(el, ev);
						}
					};
					state.listeners[type] = listener;
					el.addEventListener(type, listener);
				}

				state.handlers[type] = fn;
			} else if (state.listeners[type]) {
				el.removeEventListener(type, state.listeners[type]!);
				state.listeners[type] = undefined;
				state.handlers[type] = null;
			}
		},
	});

	if (existing && "value" in existing) {
		(el as any)["on" + type] = existing.value;
	}
}

export class CrankHTMLElement extends HTMLElement {
	/** Attributes that trigger a re-render. Read by the platform. */
	static observedAttributes?: ReadonlyArray<string>;
	/** Emitted event types; generates the `on<type>` handler properties. */
	static events?: ReadonlyArray<string>;
	/** `true` opts the element into form association. Read by the platform. */
	static formAssociated?: boolean;
	/** `false`/omitted: light DOM. `true`/`ShadowRootInit`: shadow DOM. */
	static shadowDOM?: boolean | ShadowRootInit;
	declare [_ElementState]: ElementState;

	constructor() {
		super();
		const ctor = this.constructor as typeof CrankHTMLElement;
		const state: ElementState = {
			root: attachRoot(this, ctor.shadowDOM || false),
			// A stable per-instance component. The arrow keeps `this` as the
			// element, and `ctx` is passed straight through to `render`.
			bridge: (props: Props, ctx: Context) => this.render(props, ctx),
			mounted: false,
			dirty: false,
			handlers: Object.create(null),
			listeners: Object.create(null),
		};
		this[_ElementState] = state;

		const events = ctor.events;
		if (events) {
			for (const type of events) {
				defineEventHandler(this, state, type);
			}
		}
	}

	/**
	 * Override this. `this` is the element, `ctx` is the Crank context, `props`
	 * is the current `observedAttributes` (raw strings or null). May be any of
	 * Crank's four component forms.
	 */
	render(_props: Props, _ctx: Context): RenderResult {
		return undefined;
	}

	/** Request a microtask-batched re-render. The element's one re-render control. */
	requestUpdate(): void {
		const state = this[_ElementState];
		if (state.dirty) {
			return;
		}

		state.dirty = true;
		queueMicrotask(() => {
			// Already handled — e.g. coalesced into the synchronous first render,
			// which clears the flag.
			if (!state.dirty) {
				return;
			}

			state.dirty = false;
			if (state.mounted) {
				updateElement(this, state);
			}
		});
	}

	connectedCallback(): void {
		const state = this[_ElementState];
		if (state.mounted) {
			// A reconnect after a move: the tree is intact, nothing to do.
			return;
		}

		state.mounted = true;
		state.dirty = false;
		upgradeProperties(this);
		if (state.root === this) {
			// Light DOM: render owns the element's children, so drop any authored
			// content before the first render claims the subtree.
			this.replaceChildren();
		}

		updateElement(this, state);
	}

	disconnectedCallback(): void {
		// Distinguish a move (immediately reconnected) from a real removal by
		// deferring: only a still-disconnected element unmounts.
		queueMicrotask(() => {
			const state = this[_ElementState];
			if (!this.isConnected && state.mounted) {
				state.mounted = false;
				renderer.render(null, state.root);
			}
		});
	}

	attributeChangedCallback(
		_name: string,
		oldValue: string | null,
		newValue: string | null,
	): void {
		if (oldValue === newValue) {
			return;
		}

		this.requestUpdate();
	}

	// Form association: the base's whole contribution is a re-render. Authors
	// `super` the data-carrying ones to apply the reset/restore.
	formAssociatedCallback(_form: HTMLFormElement | null): void {
		this.requestUpdate();
	}

	formDisabledCallback(_disabled: boolean): void {
		this.requestUpdate();
	}

	formResetCallback(): void {
		this.requestUpdate();
	}

	formStateRestoreCallback(_state: unknown, _mode: string): void {
		this.requestUpdate();
	}
}

