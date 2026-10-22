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

// Read by the HTML renderer's define(), which only needs the component.
const _ServerComponent = Symbol.for("crank.ServerComponent");

// Read by the DOM renderer, which leaves a light DOM element's children to the
// element when the tree containing it hydrates or re-renders.
const _OwnsChildren = Symbol.for("crank.OwnsChildren");

/*** SERVER SHIM ***/
interface ServerElementState {
	attributes: Map<string, string>;
	shadowRoot: {mode: ShadowRootMode; host: object} | null;
	hasInternals: boolean;
}

const serverStates = new WeakMap<object, ServerElementState>();

function getServerState(el: object): ServerElementState {
	let state = serverStates.get(el);
	if (!state) {
		state = {attributes: new Map(), shadowRoot: null, hasInternals: false};
		serverStates.set(el, state);
	}

	return state;
}

/**
 * Stands in for HTMLElement where there is no DOM, so element classes load and
 * construct on the server. It backs attributes, shadow root and
 * ElementInternals bookkeeping, and events, but not a node tree: on the server
 * render emits HTML through the HTML renderer.
 */
class ServerHTMLElement extends EventTarget {
	get isConnected(): boolean {
		return false;
	}

	get shadowRoot(): object | null {
		const root = getServerState(this).shadowRoot;
		return root && root.mode === "open" ? root : null;
	}

	getAttribute(name: string): string | null {
		return getServerState(this).attributes.get(name.toLowerCase()) ?? null;
	}

	getAttributeNames(): Array<string> {
		return Array.from(getServerState(this).attributes.keys());
	}

	hasAttribute(name: string): boolean {
		return getServerState(this).attributes.has(name.toLowerCase());
	}

	setAttribute(name: string, value: unknown): void {
		name = name.toLowerCase();
		const oldValue = this.getAttribute(name);
		const newValue = String(value);
		getServerState(this).attributes.set(name, newValue);
		attributeChanged(this, name, oldValue, newValue);
	}

	removeAttribute(name: string): void {
		name = name.toLowerCase();
		const oldValue = this.getAttribute(name);
		if (oldValue !== null) {
			getServerState(this).attributes.delete(name);
			attributeChanged(this, name, oldValue, null);
		}
	}

	toggleAttribute(name: string, force?: boolean): boolean {
		const on = force ?? !this.hasAttribute(name);
		if (on) {
			if (!this.hasAttribute(name)) {
				this.setAttribute(name, "");
			}
		} else {
			this.removeAttribute(name);
		}

		return on;
	}

	attachShadow(init: ShadowRootInit): object {
		const state = getServerState(this);
		if (state.shadowRoot) {
			throw new Error("Element already hosts a shadow root");
		}

		state.shadowRoot = {mode: init.mode, host: this};
		return state.shadowRoot;
	}

	attachInternals(): object {
		const state = getServerState(this);
		if (state.hasInternals) {
			throw new Error("ElementInternals already attached");
		}

		state.hasInternals = true;
		// Form values and validity only mean something in a browser form.
		return {
			form: null,
			labels: [],
			shadowRoot: null,
			states: new Set<string>(),
			validity: {valid: true},
			validationMessage: "",
			willValidate: false,
			setFormValue() {},
			setValidity() {},
			checkValidity: () => true,
			reportValidity: () => true,
		};
	}

	matches(): boolean {
		return false;
	}
}

function attributeChanged(
	el: object,
	name: string,
	oldValue: string | null,
	newValue: string | null,
): void {
	const observed = (el.constructor as typeof CrankHTMLElement)
		.observedAttributes;
	if (observed && observed.includes(name)) {
		(el as CrankHTMLElement).attributeChangedCallback(name, oldValue, newValue);
	}
}

const Base: typeof HTMLElement =
	typeof HTMLElement === "undefined"
		? (ServerHTMLElement as unknown as typeof HTMLElement)
		: HTMLElement;

/*** ELEMENT STATE ***/
interface ElementState {
	root: Element | ShadowRoot;
	bridge: Component;
	mounted: boolean;
	waiting: boolean;
	dirty: boolean;
	handlers: Record<string, ((ev: Event) => unknown) | null>;
	listeners: Record<string, EventListener | undefined>;
}

const states = new WeakMap<CrankHTMLElement, ElementState>();

function getShadowInit(shadow: true | ShadowRootInit): ShadowRootInit {
	return shadow === true ? {mode: "open"} : shadow;
}

function attachRoot(
	el: CrankHTMLElement,
	shadow: boolean | ShadowRootInit | undefined,
): Element | ShadowRoot {
	if (!shadow) {
		return el;
	}

	const init = getShadowInit(shadow);
	// An open declarative shadow root (from server rendered HTML) is already
	// attached, and the first render hydrates it. A closed one is hidden, and
	// attachShadow with the same mode empties and returns it, so the first
	// render starts fresh.
	if (el.shadowRoot) {
		if (el.shadowRoot.mode !== init.mode) {
			console.error(
				`<${el.localName}> found an ${el.shadowRoot.mode} declarative shadow root but is configured as ${init.mode}`,
			);
		}

		return el.shadowRoot;
	}

	try {
		return el.attachShadow(init);
	} catch (err) {
		throw new Error(
			`<${el.localName}> could not attach a shadow root. A declarative shadow root with a different mode may already be attached.`,
			{cause: err},
		);
	}
}

function getProps(el: CrankHTMLElement): Props {
	const names = (el.constructor as typeof CrankHTMLElement).observedAttributes;
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
		while (proto && proto !== Base.prototype) {
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

function catchErrors(el: CrankHTMLElement, fn: () => unknown): void {
	let result: unknown;
	try {
		result = fn();
	} catch (err) {
		handleError(el, err);
		return;
	}

	if (
		result != null &&
		typeof (result as PromiseLike<unknown>).then === "function"
	) {
		(result as Promise<unknown>).then(undefined, (err) => handleError(el, err));
	}
}

function updateElement(
	el: CrankHTMLElement,
	state: ElementState,
	hydrate = false,
): void {
	const children = createElement(state.bridge, getProps(el));
	catchErrors(el, () =>
		hydrate
			? renderer.hydrate(children, state.root)
			: renderer.render(children, state.root),
	);
}

function mountElement(el: CrankHTMLElement, state: ElementState): void {
	state.mounted = true;
	upgradeProperties(el);
	// Pre-upgrade properties re-applied above may have requested an update,
	// which this first render covers.
	state.dirty = false;
	// Existing content is server rendered: the first render adopts it, and
	// mismatched or leftover nodes are replaced.
	updateElement(el, state, state.root.firstChild !== null);
}

/** Lazily builds the component which renders an element class on the server. */
const serverComponents = new WeakMap<Function, Component>();

function getServerComponent(ctor: typeof CrankHTMLElement): Component {
	let comp = serverComponents.get(ctor);
	if (!comp) {
		comp = function* (this: Context, props: Record<string, any>) {
			const el = new ctor();
			const bridge = states.get(el)!.bridge;
			for (props of this) {
				applyProps(el, props);
				const content = createElement(bridge, getProps(el));
				if (ctor.shadowDOM) {
					const init = getShadowInit(ctor.shadowDOM);
					// Light children follow the template, where slots project them.
					yield [
						createElement(
							"template",
							{
								shadowrootmode: init.mode,
								shadowrootdelegatesfocus: init.delegatesFocus,
								shadowrootclonable: init.clonable,
								shadowrootserializable: init.serializable,
							},
							content,
						),
						props.children,
					];
				} else {
					yield content;
				}
			}
		};

		serverComponents.set(ctor, comp);
	}

	return comp;
}

const skippedProps = new Set([
	"children",
	"key",
	"ref",
	"copy",
	"hydrate",
	"innerHTML",
	"dangerouslySetInnerHTML",
]);

// Mirrors how the DOM renderer applies props to an element: properties the
// element defines are assigned, everything else becomes an attribute.
function applyProps(el: CrankHTMLElement, props: Record<string, any>): void {
	for (const name in props) {
		const value = props[name];
		if (skippedProps.has(name) || typeof value === "function") {
			continue;
		} else if (name.startsWith("prop:")) {
			(el as any)[name.slice("prop:".length)] = value;
		} else if (name.startsWith("attr:")) {
			setAttribute(el, name.slice("attr:".length), value);
		} else if (
			name in el &&
			!(typeof value === "string" && typeof (el as any)[name] === "boolean")
		) {
			(el as any)[name] = value;
		} else {
			setAttribute(el, name, value);
		}
	}
}

function setAttribute(
	el: CrankHTMLElement,
	name: string,
	value: unknown,
): void {
	if (value == null || value === false) {
		el.removeAttribute(name);
	} else if (value === true) {
		el.setAttribute(name, "");
	} else if (typeof value === "string" || typeof value === "number") {
		el.setAttribute(name, String(value));
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

export class CrankHTMLElement extends Base {
	/** Attributes that trigger a re-render. Read by the platform. */
	static observedAttributes?: ReadonlyArray<string>;
	/** Emitted event types; generates the `on<type>` handler properties. */
	static events?: ReadonlyArray<string>;
	/** `true` opts the element into form association. Read by the platform. */
	static formAssociated?: boolean;
	/** `false`/omitted: light DOM. `true`/`ShadowRootInit`: shadow DOM. */
	static shadowDOM?: boolean | ShadowRootInit;

	/** @internal Renders this class with the HTML renderer. */
	static get [_ServerComponent](): Component {
		return getServerComponent(this);
	}

	constructor() {
		super();
		const ctor = this.constructor as typeof CrankHTMLElement;
		if (!ctor.shadowDOM) {
			Object.defineProperty(this, _OwnsChildren, {value: true});
		}

		const state: ElementState = {
			root: attachRoot(this, ctor.shadowDOM),
			// A stable per-instance component. The arrow keeps `this` as the
			// element, and `ctx` is passed straight through to `render`.
			bridge: (props: Props, ctx: Context) => this.render(props, ctx),
			mounted: false,
			waiting: false,
			dirty: false,
			handlers: Object.create(null),
			listeners: Object.create(null),
		};
		states.set(this, state);

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
		const state = states.get(this)!;
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
		const state = states.get(this)!;
		if (state.mounted || state.waiting) {
			// A reconnect after a move: the tree is intact, nothing to do.
			return;
		}

		const doc = this.ownerDocument;
		if (doc.readyState === "loading") {
			// The parser may still be adding this element's server rendered
			// content, so wait for the whole document before adopting it.
			state.waiting = true;
			doc.addEventListener(
				"DOMContentLoaded",
				() => {
					state.waiting = false;
					if (this.isConnected) {
						mountElement(this, state);
					}
				},
				{once: true},
			);
		} else {
			mountElement(this, state);
		}
	}

	disconnectedCallback(): void {
		// Distinguish a move (immediately reconnected) from a real removal by
		// deferring: only a still-disconnected element unmounts.
		queueMicrotask(() => {
			const state = states.get(this)!;
			if (!this.isConnected && state.mounted) {
				state.mounted = false;
				catchErrors(this, () => renderer.render(null, state.root));
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
