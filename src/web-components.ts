/// <reference lib="dom" />
import {createElement} from "./crank.js";
import type {Children, Component, Context} from "./crank.js";
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

// One CSSStyleSheet (or array) is derived per class, lazily and memoized, so a
// class with `static styles` parses once and shares by reference.
const sheetCache = new WeakMap<Function, ReadonlyArray<CSSStyleSheet>>();

function styleSheetsFor(ctor: any): ReadonlyArray<CSSStyleSheet> {
	let sheets = sheetCache.get(ctor);
	if (sheets) {
		return sheets;
	}

	const styles = ctor.styles;
	const list: Array<string | CSSStyleSheet> =
		styles == null ? [] : Array.isArray(styles) ? styles : [styles];
	sheets = list.map((style) => {
		if (typeof style === "string") {
			const sheet = new CSSStyleSheet();
			sheet.replaceSync(style);
			return sheet;
		}

		return style;
	});
	sheetCache.set(ctor, sheets);
	return sheets;
}

/**
 * Maps the `events` key of the type parameter to typed `on<type>` handler
 * properties. A tuple (`typeof Class.events`) gives names-only typing; an event
 * map gives typed payloads.
 */
export type EventHandlers<O> = O extends {events: infer E}
	? E extends ReadonlyArray<infer N extends string>
		? {[K in N as `on${K}`]: ((ev: Event) => unknown) | null}
		: E extends Record<string, any>
			? {[K in keyof E as `on${string & K}`]: ((ev: E[K]) => unknown) | null}
			: {}
	: {};

export type Props = Record<string, string | null>;

/** What `render` may return: any of Crank's four component forms. */
export type RenderResult =
	| Children
	| PromiseLike<Children>
	| Iterator<Children, Children | void, any>
	| AsyncIterator<Children, Children | void, any>;

export class CrankHTMLElementBase extends HTMLElement {
	/** Attributes that trigger a re-render. Read by the platform. */
	static observedAttributes?: ReadonlyArray<string>;
	/** Emitted event types; generates the `on<type>` handler properties. */
	static events?: ReadonlyArray<string>;
	/** `true` opts the element into form association. Read by the platform. */
	static formAssociated?: boolean;
	/** `false`/omitted: light DOM. `true`/`ShadowRootInit`: shadow DOM. */
	static shadowDOM?: boolean | ShadowRootInit;
	/** CSS, applied once per class via `adoptedStyleSheets`. */
	static styles?:
		| string
		| CSSStyleSheet
		| ReadonlyArray<string | CSSStyleSheet>;

	#root: Element | ShadowRoot;
	#bridge: Component;
	#mounted = false;
	#dirty = false;
	#handlers: Record<string, ((ev: Event) => unknown) | null> =
		Object.create(null);
	#listeners: Record<string, EventListener | undefined> = Object.create(null);

	constructor() {
		super();
		const ctor = this.constructor as typeof CrankHTMLElementBase;

		const shadow = ctor.shadowDOM;
		if (shadow) {
			const init: ShadowRootInit = shadow === true ? {mode: "open"} : shadow;
			// Reuse a declarative shadow root if one is already attached (SSR),
			// otherwise attach one now.
			this.#root = this.shadowRoot ?? this.attachShadow(init);
		} else {
			this.#root = this;
		}

		// A stable per-instance component. The arrow keeps `this` as the element,
		// and `ctx` is passed straight through to `render`.
		this.#bridge = (props: Props, ctx: Context) => this.render(props, ctx);

		const events = ctor.events;
		if (events) {
			for (const type of events) {
				this.#defineEventHandler(type);
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
		if (this.#dirty) {
			return;
		}

		this.#dirty = true;
		queueMicrotask(() => {
			// Already handled — e.g. coalesced into the synchronous first render,
			// which clears the flag.
			if (!this.#dirty) {
				return;
			}

			this.#dirty = false;
			if (this.#mounted) {
				this.#update();
			}
		});
	}

	connectedCallback(): void {
		if (this.#mounted) {
			// A reconnect after a move: the tree is intact, nothing to do.
			return;
		}

		this.#mounted = true;
		this.#dirty = false;
		this.#upgradeProperties();
		this.#adoptStyles();
		if (this.#root === this) {
			// Light DOM: render owns the element's children, so drop any authored
			// content before the first render claims the subtree.
			this.replaceChildren();
		}

		this.#update();
	}

	// Properties assigned before the element was upgraded sit as own data
	// properties shadowing the class accessors. Re-apply each through its
	// accessor so getters/setters (and their re-render) take effect.
	#upgradeProperties(): void {
		for (const key of Object.keys(this)) {
			const own = Object.getOwnPropertyDescriptor(this, key);
			if (!own || !("value" in own)) {
				continue;
			}

			let proto = Object.getPrototypeOf(this);
			while (proto && proto !== HTMLElement.prototype) {
				const desc = Object.getOwnPropertyDescriptor(proto, key);
				if (desc && (desc.get || desc.set)) {
					const value = (this as any)[key];
					delete (this as any)[key];
					(this as any)[key] = value;
					break;
				}

				proto = Object.getPrototypeOf(proto);
			}
		}
	}

	disconnectedCallback(): void {
		// Distinguish a move (immediately reconnected) from a real removal by
		// deferring: only a still-disconnected element unmounts.
		queueMicrotask(() => {
			if (!this.isConnected && this.#mounted) {
				this.#mounted = false;
				renderer.render(null, this.#root);
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

	#props(): Props {
		const names = (this.constructor as typeof CrankHTMLElementBase)
			.observedAttributes;
		const props: Props = {};
		if (names) {
			for (const name of names) {
				props[name] = this.getAttribute(name);
			}
		}

		return props;
	}

	#update(): void {
		let result: unknown;
		try {
			result = renderer.render(
				createElement(this.#bridge, this.#props()),
				this.#root,
			);
		} catch (err) {
			this.#handleError(err);
			return;
		}

		if (
			result != null &&
			typeof (result as PromiseLike<unknown>).then === "function"
		) {
			(result as Promise<unknown>).catch((err) => this.#handleError(err));
		}
	}

	#handleError(err: unknown): void {
		const event = new ErrorEvent("error", {
			error: err,
			message: err instanceof Error ? err.message : String(err),
			cancelable: true,
		});
		// dispatchEvent returns false when a handler calls preventDefault().
		const handled = !this.dispatchEvent(event);
		if (!handled) {
			reportError(err);
		}
	}

	#adoptStyles(): void {
		if (typeof CSSStyleSheet === "undefined") {
			return;
		}

		const sheets = styleSheetsFor(this.constructor);
		if (!sheets.length) {
			return;
		}

		if (this.#root === this) {
			// Light DOM: global, deduped per class.
			const doc = this.ownerDocument;
			const next = doc.adoptedStyleSheets.slice();
			for (const sheet of sheets) {
				if (!next.includes(sheet)) {
					next.push(sheet);
				}
			}

			doc.adoptedStyleSheets = next;
		} else {
			const root = this.#root as ShadowRoot;
			root.adoptedStyleSheets = [...root.adoptedStyleSheets, ...sheets];
		}
	}

	// A faithful event-handler IDL attribute (like onclick): a forwarding closure
	// registered lazily, so a non-null reassignment swaps the value without
	// moving the listener; null removes it; setting again re-registers at the end.
	#defineEventHandler(type: string): void {
		const self = this;
		Object.defineProperty(this, "on" + type, {
			configurable: true,
			enumerable: true,
			get() {
				return self.#handlers[type] ?? null;
			},
			set(value: unknown) {
				const fn =
					typeof value === "function"
						? (value as (ev: Event) => unknown)
						: null;
				if (fn) {
					if (!self.#listeners[type]) {
						const listener: EventListener = (ev) => self.#handlers[type]?.(ev);
						self.#listeners[type] = listener;
						self.addEventListener(type, listener);
					}

					self.#handlers[type] = fn;
				} else if (self.#listeners[type]) {
					self.removeEventListener(type, self.#listeners[type]!);
					self.#listeners[type] = undefined;
					self.#handlers[type] = null;
				}
			},
		});
	}
}

/**
 * Base class for Web Components written with Crank.
 *
 * The optional type parameter is an options object (one key now, room for more
 * later): `{events: typeof Class.events}` types the generated `on<type>` handler
 * properties.
 *
 * ```ts
 * class XMarquee extends CrankHTMLElement<{events: typeof XMarquee.events}> {
 *   static events = ["bounce", "finish"] as const;
 * }
 * ```
 */
export type CrankHTMLElement<O = {}> = CrankHTMLElementBase & EventHandlers<O>;
export const CrankHTMLElement = CrankHTMLElementBase as unknown as {
	new <O = {}>(): CrankHTMLElement<O>;
	prototype: CrankHTMLElementBase;
	observedAttributes?: ReadonlyArray<string>;
	events?: ReadonlyArray<string>;
	formAssociated?: boolean;
	shadowDOM?: boolean | ShadowRootInit;
	styles?: string | CSSStyleSheet | ReadonlyArray<string | CSSStyleSheet>;
};
