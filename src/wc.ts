/// <reference lib="dom" preserve="true" />
import {createElement} from "./crank.js";
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

type Props = Record<string, unknown>;

/**
 * A prop's declared type in `static props`: `String`, `Number` and `Boolean`
 * reflect to an attribute, an array of keywords reflects to one of those
 * keywords, and `Object` is a property only.
 */
export type PropType =
	| StringConstructor
	| NumberConstructor
	| BooleanConstructor
	| ObjectConstructor
	| ReadonlyArray<string>;

/**
 * What `CrankHTMLElement` reads its types from: usually the class itself
 * (`typeof X`), whose static fields have these shapes.
 */
export interface ElementOptions {
	events?: ReadonlyArray<string> | Record<string, Event>;
	props?: Record<string, PropType>;
}

type PropValue<T> = T extends BooleanConstructor
	? boolean
	: T extends NumberConstructor
		? number | null
		: T extends StringConstructor
			? string | null
			: T extends ReadonlyArray<infer K extends string>
				? K
				: unknown;

/**
 * The properties `static props` declares, as `render` receives them and as
 * they read on the element: `string | null`, `number | null`, `boolean`, the
 * keyword union (declare the array `as const`), or `unknown` for `Object`.
 */
export type ElementProps<O = {}> = O extends {props: infer P}
	? {[K in keyof P]: PropValue<P[K]>}
	: {};

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
}

// Read by the DOM renderer, which leaves a light DOM element's children to the
// element when the tree containing it hydrates or re-renders.
const _OwnsChildren = Symbol.for("crank.OwnsChildren");

/*** SERVER SHIM ***/
interface ServerElementState {
	localName: string;
	attributes: Map<string, string>;
	shadowRoot: {mode: ShadowRootMode; host: object} | null;
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
// Each element's render root: the element itself for light DOM, or its shadow
// root, which is unreachable from outside when closed.
const roots = new WeakMap<CrankHTMLElementImpl, Element | ShadowRoot>();

// Elements with a batched update waiting for its microtask.
const dirty = new Set<CrankHTMLElementImpl>();

// Each element's latest render while it is async, for updateComplete.
const renders = new WeakMap<CrankHTMLElementImpl, Promise<unknown>>();

// Each element's render method, bound to the element, as the component
// rendered into its root. Its identity is stable, so updates reuse its state.
const components = new WeakMap<CrankHTMLElementImpl, Component>();

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
	const declared = (el.constructor as typeof CrankHTMLElementImpl).props;
	const props: Props = {};
	if (declared) {
		for (const name in declared) {
			props[name] = (el as any)[name];
		}
	}

	return props;
}

// Classes whose declared props have accessors on their prototype.
const defined = new WeakSet<Function>();
// Values of Object props, which never become attributes.
const objectProps = new WeakMap<object, Map<string, unknown>>();

function hasOwnAccessor(ctor: Function, name: string): boolean {
	let proto = ctor.prototype;
	while (proto && proto !== Base.prototype) {
		const desc = Object.getOwnPropertyDescriptor(proto, name);
		if (desc && (desc.get || desc.set)) {
			return true;
		}

		proto = Object.getPrototypeOf(proto);
	}

	return false;
}

// Defines an accessor on the class for each declared prop, once per class. An
// accessor the author wrote anywhere below the base is left alone.
function defineProps(ctor: typeof CrankHTMLElementImpl): void {
	if (defined.has(ctor)) {
		return;
	}

	defined.add(ctor);
	const declared = ctor.props;
	if (!declared) {
		return;
	}

	for (const name in declared) {
		if (!hasOwnAccessor(ctor, name)) {
			Object.defineProperty(
				ctor.prototype,
				name,
				createAccessor(name, declared[name]),
			);
		}
	}
}

function createAccessor(name: string, type: PropType): PropertyDescriptor {
	const attr = name.toLowerCase();
	const descriptor: PropertyDescriptor = {configurable: true, enumerable: true};
	if (type === Boolean) {
		descriptor.get = function (this: Element) {
			return this.hasAttribute(attr);
		};
		descriptor.set = function (this: Element, value: unknown) {
			this.toggleAttribute(attr, !!value);
		};
	} else if (type === Number) {
		descriptor.get = function (this: Element) {
			const value = this.getAttribute(attr);
			if (value === null || value.trim() === "") {
				return null;
			}

			const n = Number(value);
			return Number.isFinite(n) ? n : null;
		};
		descriptor.set = function (this: Element, value: unknown) {
			if (value == null) {
				this.removeAttribute(attr);
			} else if (typeof value === "number" && !Number.isFinite(value)) {
				throw new TypeError(
					`<${this.localName}>.${name} cannot be set to ${String(value)}`,
				);
			} else {
				this.setAttribute(attr, String(value));
			}
		};
	} else if (type === String) {
		descriptor.get = function (this: Element) {
			return this.getAttribute(attr);
		};
		descriptor.set = function (this: Element, value: unknown) {
			if (value == null) {
				this.removeAttribute(attr);
			} else {
				this.setAttribute(attr, String(value));
			}
		};
	} else if (Array.isArray(type)) {
		const keywords = type as ReadonlyArray<string>;
		const match = (value: string): string | undefined => {
			const lower = value.toLowerCase();
			return keywords.find((keyword) => keyword.toLowerCase() === lower);
		};
		descriptor.get = function (this: Element) {
			const value = this.getAttribute(attr);
			return (value === null ? undefined : match(value)) ?? keywords[0];
		};
		descriptor.set = function (this: Element, value: unknown) {
			if (value == null) {
				this.removeAttribute(attr);
			} else {
				this.setAttribute(attr, match(String(value)) ?? String(value));
			}
		};
	} else {
		descriptor.get = function (this: object) {
			const values = objectProps.get(this);
			return values && values.get(name);
		};
		descriptor.set = function (this: CrankHTMLElementImpl, value: unknown) {
			let values = objectProps.get(this);
			if (!values) {
				values = new Map();
				objectProps.set(this, values);
			}

			values.set(name, value);
			this.requestUpdate();
		};
	}

	return descriptor;
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

function update(el: CrankHTMLElementImpl): void {
	if (el.ownerDocument.readyState === "loading") {
		// The element renders once the document is parsed (connectedCallback).
		return;
	}

	const root = roots.get(el)!;
	const children = createElement(components.get(el)!, getProps(el));
	let result: unknown;
	try {
		// A shadow root with content holds a declarative shadow root, which only
		// a server produces, so it is hydrated. Hydrating a root which has
		// already rendered just updates it.
		result =
			root !== el && root.firstChild
				? renderer.hydrate(children, root)
				: renderer.render(children, root);
	} catch (err) {
		fail(el, root, err);
		return;
	}

	if (result instanceof Promise) {
		const settled: Promise<void> = result.then(
			(value) => {
				if (renders.get(el) === settled) {
					renders.delete(el);
				}

				replaceChildren(el, root, value);
			},
			(err) => {
				if (renders.get(el) === settled) {
					renders.delete(el);
				}

				fail(el, root, err);
			},
		);
		renders.set(el, settled);
	} else {
		replaceChildren(el, root, result);
	}
}

// A light DOM element renders all of its children, so once a render commits,
// children it did not render (server output or fallback content written by
// hand, present before the first render) are removed.
function replaceChildren(
	el: CrankHTMLElementImpl,
	root: Element | ShadowRoot,
	value: unknown,
): void {
	if (root === el) {
		const rendered = new Set(Array.isArray(value) ? value : [value]);
		for (const node of Array.from(el.childNodes)) {
			if (!rendered.has(node)) {
				el.removeChild(node);
			}
		}
	}
}

// Reports a render error, and unmounts the failed render so the next update
// renders afresh: a generator which threw cannot continue.
function fail(
	el: CrankHTMLElementImpl,
	root: Element | ShadowRoot,
	err: unknown,
): void {
	handleError(el, err);
	renderer.render(null, root);
}

function connect(el: CrankHTMLElementImpl): void {
	upgradeProperties(el);
	// The render below covers updates requested before it.
	dirty.delete(el);
	const root = roots.get(el)!;
	const template = el.firstElementChild;
	if (
		root !== el &&
		!root.firstChild &&
		template instanceof HTMLTemplateElement &&
		template.hasAttribute("shadowrootmode")
	) {
		// Defined before the parser reached it, the element attached its shadow
		// root first, so the parser left the declarative shadow root as an
		// ordinary template. Move its content into the shadow root.
		root.append(template.content);
		template.remove();
	}

	update(el);
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

/** Prepares an instance of an element class for rendering on the server. */
function renderForServer(
	ctor: typeof CrankHTMLElementImpl,
	tagName: string,
	props: Record<string, any>,
): ServerRender {
	const el = constructForServer(ctor, tagName);
	applyProps(el, props);
	return {
		children: createElement(components.get(el)!, getProps(el)),
		template: ctor.shadow == null ? null : getTemplateProps(ctor.shadow),
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

// Gives the element its props, so render can read them. Declared props go
// through their accessors. Other props become attributes, except objects (an
// items array, say), which have no attribute form and are assigned as
// properties.
function applyProps(
	el: CrankHTMLElementImpl,
	props: Record<string, any>,
): void {
	const declared = (el.constructor as typeof CrankHTMLElementImpl).props;
	for (const name in props) {
		const value = props[name];
		if (name === "children" || typeof value === "function") {
			continue;
		} else if (declared && name in declared) {
			(el as any)[name] = value;
		} else if (typeof value === "object" && value !== null) {
			(el as any)[name] = value;
		} else if (value === true) {
			el.setAttribute(name, "");
		} else if (value != null && value !== false) {
			el.setAttribute(name, String(value));
		}
	}
}

// A render error dispatches a cancelable error event on the element, and is
// reported to the global scope unless a listener calls preventDefault().
function handleError(el: CrankHTMLElementImpl, err: unknown): void {
	const event = new ErrorEvent("error", {
		error: err,
		message: err instanceof Error ? err.message : String(err),
		cancelable: true,
	});
	// dispatchEvent returns false when a listener calls preventDefault().
	if (!el.dispatchEvent(event)) {
		return;
	} else if (typeof reportError === "function") {
		reportError(err);
	} else {
		// Some test environments lack reportError; rethrow outside this call,
		// as reportError would report it.
		queueMicrotask(() => {
			throw err;
		});
	}
}

// A faithful event-handler IDL attribute (like onclick): a forwarding closure
// registered lazily, so a non-null reassignment swaps the value without moving
// the listener; null removes it; setting again re-registers at the end. Like
// the platform, the handler is called with `this` set to the element. A value
// assigned before upgrade is re-applied through the accessor.
function defineEventHandler(el: CrankHTMLElementImpl, type: string): void {
	let handler: ((ev: Event) => unknown) | null = null;
	let listener: EventListener | null = null;
	const existing = Object.getOwnPropertyDescriptor(el, "on" + type);
	Object.defineProperty(el, "on" + type, {
		configurable: true,
		enumerable: true,
		get() {
			return handler;
		},
		set(value: unknown) {
			if (typeof value === "function") {
				if (!listener) {
					listener = (ev) => handler && handler.call(el, ev);
					el.addEventListener(type, listener);
				}

				handler = value as (ev: Event) => unknown;
			} else if (listener) {
				el.removeEventListener(type, listener);
				listener = null;
				handler = null;
			}
		},
	});

	if (existing && "value" in existing) {
		(el as any)["on" + type] = existing.value;
	}
}

class CrankHTMLElementImpl<O extends ElementOptions = {}> extends Base {
	/**
	 * The element's properties and their types. `String`, `Number`, `Boolean`
	 * and keyword arrays reflect to the attribute of the same name, lowercased;
	 * `Object` props are properties only. Each becomes an accessor on the
	 * element and a prop `render` receives.
	 */
	static props?: Record<string, PropType>;

	/** Read by the platform. Derived from `props`. */
	static get observedAttributes(): ReadonlyArray<string> {
		const declared = this.props;
		const names: Array<string> = [];
		if (declared) {
			for (const name in declared) {
				if (declared[name] !== Object) {
					names.push(name.toLowerCase());
				}
			}
		}

		return names;
	}
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
		defineProps(ctor);
		if (ctor.shadow == null) {
			Object.defineProperty(this, _OwnsChildren, {value: true});
		}

		roots.set(this, attachRoot(this, ctor.shadow));
		components.set(this, (props: Props, ctx: Context) =>
			this.render(props as ElementProps<O>, ctx),
		);
		const events = ctor.events;
		if (events) {
			for (const type of events) {
				// A built-in handler property (onchange, oninput, ...) already fires
				// for dispatched events of its type.
				if (!("on" + type in Base.prototype)) {
					defineEventHandler(this, type);
				}
			}
		}
	}

	/**
	 * Override this. `this` is the element, `ctx` is the Crank context, `props`
	 * holds the current value of each declared prop. May be any of Crank's four
	 * component forms.
	 */
	render(
		_props: ElementProps<O>,
		_ctx: Context<ElementProps<O>>,
	): RenderResult {
		return undefined;
	}

	/**
	 * Requests a microtask-batched re-render, from the element's own setters and
	 * methods. Inside `render`, use `ctx.refresh()`.
	 */
	requestUpdate(): void {
		if (!dirty.has(this)) {
			dirty.add(this);
			queueMicrotask(() => {
				// Already covered if the element connected in the meantime.
				if (dirty.delete(this) && this.isConnected) {
					update(this);
				}
			});
		}
	}

	/**
	 * A promise which resolves when the element has no update pending and its
	 * latest render has settled, including an async render. Render errors go to
	 * the error event, not to this promise.
	 */
	get updateComplete(): Promise<void> {
		return (async () => {
			// A batched update runs in a microtask queued before this one, and
			// may start a render which requests another.
			do {
				await renders.get(this);
			} while (dirty.has(this) || renders.has(this));
		})();
	}

	connectedCallback(): void {
		const doc = this.ownerDocument;
		if (doc.readyState === "loading") {
			// The parser may still be adding this element's server rendered
			// content, so wait for the whole document before rendering.
			doc.addEventListener(
				"DOMContentLoaded",
				() => this.isConnected && connect(this),
				{once: true},
			);
		} else {
			// After a move, this re-renders an element which is already mounted,
			// which updates it in place.
			connect(this);
		}
	}

	disconnectedCallback(): void {
		// A move disconnects and reconnects the element in one task, so only an
		// element still disconnected in a microtask unmounts.
		queueMicrotask(() => {
			if (!this.isConnected) {
				renderer.render(null, roots.get(this)!);
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
 * as the type argument to type its generated `on<type>` handlers and
 * properties from its `static events` and `static props`:
 *
 * ```ts
 * class XMarquee extends CrankHTMLElement<typeof XMarquee> {
 *   static events = ["bounce", "finish"] as const;
 *   static props = {speed: Number, paused: Boolean};
 *   render({speed, paused}: ElementProps<typeof XMarquee>) {
 *     return paused ? null : speed;
 *   }
 * }
 * ```
 *
 * For typed event payloads, pass an event map instead:
 * `CrankHTMLElement<{events: {pick: CustomEvent<number>}}>`.
 */
export type CrankHTMLElement<O extends ElementOptions = {}> =
	CrankHTMLElementImpl<O> & EventHandlers<O> & ElementProps<O>;

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
