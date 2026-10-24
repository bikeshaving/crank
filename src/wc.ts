/// <reference lib="dom" preserve="true" />
import {createElement} from "./crank.js";
import {camelToKebabCase, formatStyleValue} from "./_css.js";
import type {Children, Component, Context} from "./crank.js";
import {renderer} from "./dom.js";

/**
 * `@b9g/crank/wc` — write Web Components with Crank.
 *
 * Subclass `CrankHTMLElement`, declare configuration as static fields, and
 * define a `render` method. `render` is a normal Crank component (same forms,
 * same lifecycle), except `this` is the element and `ctx` is an argument.
 *
 * See https://github.com/bikeshaving/crank/issues/360.
 */

/**
 * Maps an `events` tuple or event map to `on<type>` handler properties.
 * `CrankHTMLElement<typeof X>` applies it for you. Merge it into a subclass of
 * an element to type events the subclass adds:
 *
 * ```ts
 * class XMarquee extends CrankHTMLElement<{events: readonly ["bounce"]}> {
 *   static events: ReadonlyArray<string> = ["bounce"];
 * }
 *
 * interface XFancy extends EventHandlers<{events: readonly ["sparkle"]}> {}
 * class XFancy extends XMarquee {
 *   static events = [...XMarquee.events, "sparkle"];
 * }
 * ```
 *
 * A tuple gives names-only typing; an event map gives typed payloads.
 */
export type EventHandlers<O> = O extends {events: infer E}
	? E extends ReadonlyArray<infer N extends string>
		? {[K in N as HandlerName<K>]: ((ev: Event) => unknown) | null}
		: E extends Record<string, any>
			? {
					[K in keyof E as HandlerName<string & K>]:
						| ((ev: E[K]) => unknown)
						| null;
				}
			: {}
	: {};

// Event types with a built-in handler property (onchange, oninput, ...) keep
// the platform's, which already fires for dispatched events of that type.
type HandlerName<K extends string> = `on${K}` extends keyof HTMLElement
	? never
	: `on${K}`;

type Props = Record<string, string | null>;

/**
 * What `CrankHTMLElement` reads its types from: usually the class itself
 * (`typeof X`), whose static fields have these shapes.
 */
export interface ElementOptions {
	events?: ReadonlyArray<string> | Record<string, Event>;
	observedAttributes?: ReadonlyArray<string>;
}

/**
 * The props `render` receives: one per observed attribute, as a raw string or
 * null. Without literal attribute names (`as const`), any string key.
 */
export type AttributeProps<O = {}> = O extends {
	observedAttributes: ReadonlyArray<infer N extends string>;
}
	? string extends N
		? Props
		: {[K in N]: string | null}
	: Props;

/** What `render` may return: any of Crank's four component forms. */
type RenderResult = ReturnType<Component<Props>>;

// Read by the HTML renderer's define(). Given a tag name, returns a function
// which prepares an element for rendering on the server from its props. The
// HTML renderer only needs what that returns, so it never imports this module.
const _ServerRender = Symbol.for("crank.ServerRender");

interface ServerRender {
	/** The element's contents, rendered by the HTML renderer in its own root. */
	children: Children;
	/** Attributes for a declarative shadow root's template, or null for light DOM. */
	template: Record<string, unknown> | null;
	/** The element's attributes, read once its contents have rendered. */
	attributes(): Array<[string, string]>;
}

// Read by the DOM renderer, which leaves a light DOM element's children to the
// element when the tree containing it hydrates or re-renders.
const _OwnsChildren = Symbol.for("crank.OwnsChildren");

/*** FLAGS ***/
// Element state flags, as in Crank's retainers.
const IsMounted = 1 << 0;
const IsWaiting = 1 << 1;
const IsDirty = 1 << 2;
// Server shim flags.
const HasInternals = 1 << 0;

function getFlag(state: {f: number}, flag: number): boolean {
	return !!(state.f & flag);
}

function setFlag(state: {f: number}, flag: number, value = true): void {
	if (value) {
		state.f |= flag;
	} else {
		state.f &= ~flag;
	}
}

/*** SERVER SHIM ***/
interface ServerElementState {
	localName: string;
	attributes: Map<string, string>;
	shadowRoot: {mode: ShadowRootMode; host: object} | null;
	f: number;
}

const serverStates = new WeakMap<object, ServerElementState>();

// The tag of the element being constructed by a server component, read by the
// shim so localName works in the constructor.
let constructingTagName = "";

function getServerState(el: object): ServerElementState {
	let state = serverStates.get(el);
	if (!state) {
		state = {
			localName: constructingTagName,
			attributes: new Map(),
			shadowRoot: null,
			f: 0,
		};
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
	constructor() {
		super();
		getServerState(this);
	}

	get localName(): string {
		return getServerState(this).localName;
	}

	get tagName(): string {
		return this.localName.toUpperCase();
	}

	get nodeName(): string {
		return this.tagName;
	}

	get isConnected(): boolean {
		return false;
	}

	get dataset(): Record<string, string | undefined> {
		return new Proxy({} as Record<string, string | undefined>, {
			get: (_, key) =>
				typeof key === "string"
					? (this.getAttribute(toDataAttribute(key)) ?? undefined)
					: undefined,
			set: (_, key, value) => {
				if (typeof key === "string") {
					this.setAttribute(toDataAttribute(key), value);
				}

				return true;
			},
			deleteProperty: (_, key) => {
				if (typeof key === "string") {
					this.removeAttribute(toDataAttribute(key));
				}

				return true;
			},
		});
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
		if (getFlag(state, HasInternals)) {
			throw new Error("ElementInternals already attached");
		}

		setFlag(state, HasInternals);
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

function toDataAttribute(key: string): string {
	return "data-" + key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
}

// String properties which reflect an attribute.
for (const [prop, attr] of [
	["id", "id"],
	["className", "class"],
	["title", "title"],
	["lang", "lang"],
	["dir", "dir"],
	["slot", "slot"],
]) {
	Object.defineProperty(ServerHTMLElement.prototype, prop, {
		configurable: true,
		get(this: ServerHTMLElement) {
			return this.getAttribute(attr) ?? "";
		},
		set(this: ServerHTMLElement, value: unknown) {
			this.setAttribute(attr, value);
		},
	});
}

Object.defineProperty(ServerHTMLElement.prototype, "hidden", {
	configurable: true,
	get(this: ServerHTMLElement) {
		return this.hasAttribute("hidden");
	},
	set(this: ServerHTMLElement, value: unknown) {
		this.toggleAttribute("hidden", !!value);
	},
});

// The shim has no node tree, layout, or document, so code which needs one
// fails with a message rather than reading undefined.
function unavailable(this: ServerHTMLElement, name: string): never {
	throw new Error(
		`<${this.localName}>.${name} is unavailable while rendering on the server. Use it in browser-only code, such as an event listener or connectedCallback, or check this.isConnected first.`,
	);
}

for (const name of [
	"ownerDocument",
	"parentNode",
	"parentElement",
	"children",
	"childNodes",
	"firstChild",
	"style",
	"classList",
]) {
	Object.defineProperty(ServerHTMLElement.prototype, name, {
		configurable: true,
		get(this: ServerHTMLElement) {
			return unavailable.call(this, name);
		},
	});
}

for (const name of [
	"closest",
	"querySelector",
	"querySelectorAll",
	"getRootNode",
	"focus",
	"blur",
	"getBoundingClientRect",
	"append",
	"appendChild",
	"replaceChildren",
]) {
	Object.defineProperty(ServerHTMLElement.prototype, name, {
		configurable: true,
		writable: true,
		value(this: ServerHTMLElement) {
			return unavailable.call(this, name + "()");
		},
	});
}

function attributeChanged(
	el: object,
	name: string,
	oldValue: string | null,
	newValue: string | null,
): void {
	const observed = (el.constructor as typeof CrankHTMLElementImpl)
		.observedAttributes;
	if (observed && observed.includes(name)) {
		(el as CrankHTMLElementImpl).attributeChangedCallback(
			name,
			oldValue,
			newValue,
		);
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
	f: number;
	// The pending async render, if any.
	inflight: Promise<unknown> | undefined;
	// Created when updateComplete is read while the element is busy.
	completion: Completion | undefined;
	// Light DOM children present at first connect, removed once a render
	// commits.
	placeholder: Array<Node> | undefined;
	handlers: Record<string, ((ev: Event) => unknown) | null>;
	listeners: Record<string, EventListener | undefined>;
}

interface Completion {
	promise: Promise<void>;
	resolve: () => void;
	reject: (err: unknown) => void;
}

function isBusy(state: ElementState): boolean {
	return getFlag(state, IsDirty | IsWaiting) || state.inflight !== undefined;
}

// Resolves updateComplete once nothing is pending.
function settle(state: ElementState): void {
	if (state.completion && !isBusy(state)) {
		const completion = state.completion;
		state.completion = undefined;
		completion.resolve();
	}
}

const states = new WeakMap<CrankHTMLElementImpl, ElementState>();

function attachRoot(
	el: CrankHTMLElementImpl,
	init: ShadowRootInit | null,
): Element | ShadowRoot {
	if (init == null) {
		return el;
	}

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

function getProps(el: CrankHTMLElementImpl): Props {
	const names = (el.constructor as typeof CrankHTMLElementImpl)
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
function upgradeProperties(el: CrankHTMLElementImpl): void {
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

// Runs a render, routing its errors through handleError and tracking it as
// in flight until it settles.
function run(
	el: CrankHTMLElementImpl,
	state: ElementState,
	fn: () => unknown,
): void {
	let result: unknown;
	try {
		result = fn();
	} catch (err) {
		handleError(el, state, err);
		settle(state);
		return;
	}

	if (
		result != null &&
		typeof (result as PromiseLike<unknown>).then === "function"
	) {
		const inflight: Promise<unknown> = (result as Promise<unknown>).then(
			() => {
				if (state.inflight === inflight) {
					state.inflight = undefined;
				}

				removePlaceholder(el, state);
				settle(state);
			},
			(err) => {
				if (state.inflight === inflight) {
					state.inflight = undefined;
				}

				handleError(el, state, err);
				settle(state);
			},
		);
		state.inflight = inflight;
	} else {
		removePlaceholder(el, state);
		settle(state);
	}
}

function removePlaceholder(
	el: CrankHTMLElementImpl,
	state: ElementState,
): void {
	if (state.placeholder) {
		for (const node of state.placeholder) {
			if (node.parentNode === el) {
				el.removeChild(node);
			}
		}

		state.placeholder = undefined;
	}
}

function updateElement(
	el: CrankHTMLElementImpl,
	state: ElementState,
	hydrate = false,
): void {
	const children = createElement(state.bridge, getProps(el));
	run(el, state, () =>
		hydrate
			? renderer.hydrate(children, state.root)
			: renderer.render(children, state.root),
	);
}

function mountElement(el: CrankHTMLElementImpl, state: ElementState): void {
	setFlag(state, IsMounted);
	upgradeProperties(el);
	// Pre-upgrade properties re-applied above may have requested an update,
	// which this first render covers.
	setFlag(state, IsDirty, false);
	if (state.root === el) {
		// Light DOM children are a placeholder, whether server rendered or
		// written by hand as fallback content, so the first render builds fresh
		// content and the placeholder is removed once a render commits. Until an
		// async render commits, it stays visible.
		state.placeholder = el.firstChild ? Array.from(el.childNodes) : undefined;
		updateElement(el, state);
	} else {
		const root = state.root as ShadowRoot;
		const template = el.firstElementChild;
		if (
			!root.firstChild &&
			template instanceof HTMLTemplateElement &&
			template.hasAttribute("shadowrootmode")
		) {
			// Defined before the parser reached it, the element attached its
			// shadow root first, so the parser left the declarative shadow root as
			// an ordinary template. Move its content into the shadow root.
			root.append(template.content);
			template.remove();
		}

		// A shadow root with content is a declarative shadow root, which only a
		// server produces, so the first render adopts it.
		updateElement(el, state, root.firstChild !== null);
	}
}

function constructForServer(
	ctor: typeof CrankHTMLElementImpl,
	tagName: string,
): CrankHTMLElementImpl {
	const previous = constructingTagName;
	constructingTagName = tagName;
	try {
		return new ctor();
	} catch (err) {
		if (typeof HTMLElement !== "undefined") {
			// A real HTMLElement subclass can only be constructed once defined.
			throw new Error(
				`<${tagName}> could not be constructed. Where there is a DOM, register the class with customElements.define before rendering it with the HTML renderer.`,
				{cause: err},
			);
		}

		throw err;
	} finally {
		constructingTagName = previous;
	}
}

// The element's attributes, from the shim on the server or the DOM in a browser.
function getAttributeEntries(
	el: CrankHTMLElementImpl,
): Array<[string, string]> {
	const state = serverStates.get(el);
	return state
		? Array.from(state.attributes)
		: Array.from(el.attributes, (attr) => [attr.name, attr.value]);
}

/** Prepares an instance of an element class for rendering on the server. */
function renderForServer(
	ctor: typeof CrankHTMLElementImpl,
	tagName: string,
	props: Record<string, any>,
): ServerRender {
	const el = constructForServer(ctor, tagName);
	applyProps(el, props);
	return {
		children: createElement(states.get(el)!.bridge, getProps(el)),
		template: ctor.shadow == null ? null : getTemplateProps(ctor.shadow),
		attributes: () => getAttributeEntries(el),
	};
}

// The template attributes declarative shadow DOM defines for ShadowRootInit
// options. Other options have no attribute form. Unset ones print nothing.
function getTemplateProps(init: ShadowRootInit): Record<string, unknown> {
	return {
		shadowrootmode: init.mode,
		shadowrootdelegatesfocus: init.delegatesFocus,
		shadowrootclonable: init.clonable,
		shadowrootserializable: init.serializable,
	};
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

function isWritable(el: object, name: string): boolean {
	for (
		let proto: object | null = el;
		proto && proto !== Object.prototype;
		proto = Object.getPrototypeOf(proto)
	) {
		const desc = Object.getOwnPropertyDescriptor(proto, name);
		if (desc) {
			return !!(desc.writable || desc.set);
		}
	}

	return false;
}

function printStyle(style: Record<string, any>): string {
	let result = "";
	for (const [name, value] of Object.entries(style)) {
		if (value != null) {
			const cssName = camelToKebabCase(name);
			result += `${cssName}:${formatStyleValue(cssName, value)};`;
		}
	}

	return result;
}

// Mirrors how the DOM renderer applies props to an element: properties the
// element defines are assigned, everything else becomes an attribute.
function applyProps(
	el: CrankHTMLElementImpl,
	props: Record<string, any>,
): void {
	for (const name in props) {
		const value = props[name];
		if (skippedProps.has(name) || typeof value === "function") {
			continue;
		} else if (name.startsWith("prop:")) {
			(el as any)[name.slice("prop:".length)] = value;
		} else if (name.startsWith("attr:")) {
			setAttribute(el, name.slice("attr:".length), value);
		} else if (name === "class" || name === "className") {
			if (typeof value === "object" && value !== null) {
				// class={{"foo bar": true, baz: false}} syntax
				setAttribute(
					el,
					"class",
					Object.keys(value)
						.filter((k) => value[k])
						.join(" ") || null,
				);
			} else {
				setAttribute(el, "class", value);
			}
		} else if (name === "style") {
			setAttribute(
				el,
				"style",
				typeof value === "object" && value !== null ? printStyle(value) : value,
			);
		} else if (
			name in el &&
			isWritable(el, name) &&
			!(typeof value === "string" && typeof (el as any)[name] === "boolean")
		) {
			(el as any)[name] = value;
		} else {
			setAttribute(el, name, value);
		}
	}
}

function setAttribute(
	el: CrankHTMLElementImpl,
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

// A render error goes to exactly one place: an error event handler which
// calls preventDefault(), else whoever awaits updateComplete, else the global
// scope. The event fires before the promise rejects.
function handleError(
	el: CrankHTMLElementImpl,
	state: ElementState,
	err: unknown,
): void {
	const event = new ErrorEvent("error", {
		error: err,
		message: err instanceof Error ? err.message : String(err),
		cancelable: true,
	});
	// dispatchEvent returns false when a handler calls preventDefault().
	const handled = !el.dispatchEvent(event);
	const completion = state.completion;
	state.completion = undefined;
	if (completion) {
		if (handled) {
			completion.resolve();
		} else {
			completion.reject(err);
		}
	} else if (!handled) {
		if (typeof reportError === "function") {
			reportError(err);
		} else {
			// Some test environments lack reportError; rethrow outside this
			// call, as reportError would report it.
			queueMicrotask(() => {
				throw err;
			});
		}
	}
}

// A faithful event-handler IDL attribute (like onclick): a forwarding closure
// registered lazily, so a non-null reassignment swaps the value without moving
// the listener; null removes it; setting again re-registers at the end. Like
// the platform, the handler is called with `this` set to the element. A value
// assigned before upgrade is re-applied through the accessor.
function defineEventHandler(
	el: CrankHTMLElementImpl,
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

class CrankHTMLElementImpl<O extends ElementOptions = {}> extends Base {
	/** Attributes that trigger a re-render. Read by the platform. */
	static observedAttributes?: ReadonlyArray<string>;
	/** Emitted event types; generates the `on<type>` handler properties. */
	static events?: ReadonlyArray<string>;
	/** `true` opts the element into form association. Read by the platform. */
	static formAssociated?: boolean;
	/**
	 * Options for the element's shadow root, passed to `attachShadow`. Defaults
	 * to an open shadow root. `null` renders into the element itself (light
	 * DOM) instead.
	 */
	static shadow: ShadowRootInit | null = {mode: "open"};

	constructor() {
		super();
		const ctor = this.constructor as typeof CrankHTMLElementImpl;
		if (ctor.shadow == null) {
			Object.defineProperty(this, _OwnsChildren, {value: true});
		}

		const state: ElementState = {
			root: attachRoot(this, ctor.shadow),
			// A stable per-instance component. The arrow keeps `this` as the
			// element, and `ctx` is passed straight through to `render`.
			bridge: (props: Props, ctx: Context) =>
				this.render(props as AttributeProps<O>, ctx),
			f: 0,
			inflight: undefined,
			completion: undefined,
			placeholder: undefined,
			handlers: Object.create(null),
			listeners: Object.create(null),
		};
		states.set(this, state);

		const events = ctor.events;
		if (events) {
			for (const type of events) {
				// A built-in handler property (onchange, oninput, ...) already fires
				// for dispatched events of its type.
				if (!("on" + type in Base.prototype)) {
					defineEventHandler(this, state, type);
				}
			}
		}
	}

	/**
	 * Override this. `this` is the element, `ctx` is the Crank context, `props`
	 * is the current `observedAttributes` (raw strings or null). May be any of
	 * Crank's four component forms.
	 */
	render(
		_props: AttributeProps<O>,
		_ctx: Context<AttributeProps<O>>,
	): RenderResult {
		return undefined;
	}

	/**
	 * Requests a microtask-batched re-render, from the element's own setters and
	 * methods. Inside `render`, use `ctx.refresh()`.
	 */
	requestUpdate(): void {
		const state = states.get(this)!;
		if (getFlag(state, IsDirty)) {
			return;
		}

		setFlag(state, IsDirty);
		queueMicrotask(() => {
			// Already handled — e.g. coalesced into the synchronous first render,
			// which clears the flag.
			if (!getFlag(state, IsDirty)) {
				return;
			}

			setFlag(state, IsDirty, false);
			if (getFlag(state, IsMounted)) {
				updateElement(this, state);
			} else {
				settle(state);
			}
		});
	}

	/**
	 * A promise which resolves when the element has no update pending and its
	 * latest render has settled, including an async render. It rejects with a
	 * render error not handled by an `error` event listener. An element which is
	 * not connected has nothing pending, so the promise resolves.
	 *
	 * Read it after the change you are waiting on: a later update replaces it
	 * with a new promise.
	 */
	get updateComplete(): Promise<void> {
		const state = states.get(this)!;
		if (!isBusy(state)) {
			return Promise.resolve();
		}

		if (!state.completion) {
			let resolve!: () => void;
			let reject!: (err: unknown) => void;
			const promise = new Promise<void>((resolve1, reject1) => {
				resolve = resolve1;
				reject = reject1;
			});
			state.completion = {promise, resolve, reject};
		}

		return state.completion.promise;
	}

	connectedCallback(): void {
		const state = states.get(this)!;
		if (getFlag(state, IsMounted | IsWaiting)) {
			// A reconnect after a move: the tree is intact, nothing to do.
			return;
		}

		const doc = this.ownerDocument;
		if (doc.readyState === "loading") {
			// The parser may still be adding this element's server rendered
			// content, so wait for the whole document before adopting it.
			setFlag(state, IsWaiting);
			doc.addEventListener(
				"DOMContentLoaded",
				() => {
					setFlag(state, IsWaiting, false);
					if (this.isConnected) {
						mountElement(this, state);
					} else {
						settle(state);
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
			if (!this.isConnected && getFlag(state, IsMounted)) {
				setFlag(state, IsMounted, false);
				run(this, state, () => renderer.render(null, state.root));
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
	// `super` formResetCallback and formStateRestoreCallback to act on them.
	formAssociatedCallback(_form: HTMLFormElement | null): void {
		this.requestUpdate();
	}

	formDisabledCallback(_disabled: boolean): void {
		this.requestUpdate();
	}

	formResetCallback(): void {
		this.requestUpdate();
	}

	formStateRestoreCallback(
		_state: File | string | FormData | null,
		_mode: "restore" | "autocomplete",
	): void {
		this.requestUpdate();
	}
}

// Defined outside the class so it stays out of the published types. Subclasses
// inherit it, with `this` as the subclass.
Object.defineProperty(CrankHTMLElementImpl, _ServerRender, {
	value(
		this: typeof CrankHTMLElementImpl,
		tagName: string,
	): (props: Record<string, any>) => ServerRender {
		return (props) => renderForServer(this, tagName, props);
	},
});

/**
 * The base class for custom elements rendered by Crank. Pass the class itself
 * as the type argument to type its generated `on<type>` handlers and the props
 * `render` receives from its `static events` and `static observedAttributes`:
 *
 * ```ts
 * class XMarquee extends CrankHTMLElement<typeof XMarquee> {
 *   static events = ["bounce", "finish"] as const;
 *   static observedAttributes = ["scrollamount"] as const;
 *   render({scrollamount}: AttributeProps<typeof XMarquee>) {
 *     return scrollamount;
 *   }
 * }
 * ```
 *
 * For typed event payloads, pass an event map instead:
 * `CrankHTMLElement<{events: {pick: CustomEvent<number>}}>`.
 */
export type CrankHTMLElement<O extends ElementOptions = {}> =
	CrankHTMLElementImpl<O> & EventHandlers<O>;

export const CrankHTMLElement: Omit<
	typeof CrankHTMLElementImpl,
	"prototype"
> & {
	new <O extends ElementOptions = {}>(): CrankHTMLElement<O>;
	prototype: CrankHTMLElementImpl<any>;
} = CrankHTMLElementImpl as any;

Object.defineProperty(CrankHTMLElementImpl, "name", {
	value: "CrankHTMLElement",
});
