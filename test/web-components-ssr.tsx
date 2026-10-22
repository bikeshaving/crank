/// <reference lib="dom" />
/** @jsx createElement */
import {describe, test, afterEach, expect} from "@b9g/libuild/test";
import {createElement} from "../src/crank.js";
import type {Context} from "../src/crank.js";
import {renderer} from "../src/dom.js";
import {HTMLRenderer} from "../src/html.js";
import {CrankHTMLElement} from "../src/web-components.js";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("web-components SSR", () => {
	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	let uid = 0;
	const tag = (name: string) => `${name}-ssr-${uid++}`;

	function serve(html: string): HTMLElement {
		const container = document.createElement("div");
		(container as any).setHTMLUnsafe(html);
		document.body.appendChild(container);
		return container;
	}

	test("renders a light DOM element's contents", () => {
		const name = tag("x-money");
		class El extends CrankHTMLElement {
			static shadow = null;

			static observedAttributes = ["amount"];
			render({amount}: Record<string, string | null>) {
				return <span>${(Number(amount) / 100).toFixed(2)}</span>;
			}
		}

		customElements.define(name, El);
		const html = new HTMLRenderer();
		html.define(name, El);
		expect(html.render(createElement(name, {amount: "4999"}))).toBe(
			`<${name} amount="4999"><span>$49.99</span></${name}>`,
		);
	});

	test("renders a shadow DOM element as a declarative shadow root", () => {
		const name = tag("x-card");
		class El extends CrankHTMLElement {
			render() {
				return (
					<b>
						<slot />
					</b>
				);
			}
		}

		customElements.define(name, El);
		const html = new HTMLRenderer();
		html.define(name, El);
		expect(html.render(createElement(name, null, <p>light</p>))).toBe(
			`<${name}><template shadowrootmode="open"><b><slot></slot></b></template><p>light</p></${name}>`,
		);
	});

	test("emits shadow root options as template attributes", () => {
		const name = tag("x-closed");
		class El extends CrankHTMLElement {
			static shadow = {mode: "closed", delegatesFocus: true} as const;
			render() {
				return <i />;
			}
		}

		customElements.define(name, El);
		const html = new HTMLRenderer();
		html.define(name, El);
		expect(html.render(createElement(name, null))).toBe(
			`<${name}><template shadowrootmode="closed" shadowrootdelegatesfocus><i></i></template></${name}>`,
		);
	});

	test("expands nested elements", () => {
		const inner = tag("x-inner");
		const outer = tag("x-outer");
		class Inner extends CrankHTMLElement {
			static shadow = null;

			render() {
				return "inner";
			}
		}

		class Outer extends CrankHTMLElement {
			static shadow = null;

			render() {
				return createElement(inner, null);
			}
		}

		customElements.define(inner, Inner);
		customElements.define(outer, Outer);
		const html = new HTMLRenderer();
		html.define(inner, Inner);
		html.define(outer, Outer);
		expect(html.render(createElement(outer, null))).toBe(
			`<${outer}><${inner}>inner</${inner}></${outer}>`,
		);
	});

	test("assigns properties the element defines", () => {
		const name = tag("x-list");
		class El extends CrankHTMLElement {
			static shadow = null;

			_items: Array<string> = [];
			get items() {
				return this._items;
			}

			set items(value) {
				this._items = value;
				this.requestUpdate();
			}

			render() {
				return this.items.map((item) => <li>{item}</li>);
			}
		}

		customElements.define(name, El);
		const html = new HTMLRenderer();
		html.define(name, El);
		expect(html.render(createElement(name, {items: ["a", "b"]}))).toBe(
			`<${name}><li>a</li><li>b</li></${name}>`,
		);
	});

	test("async render", async () => {
		const name = tag("x-async");
		class El extends CrankHTMLElement {
			static shadow = null;

			async render() {
				await new Promise((resolve) => setTimeout(resolve));
				return <span>loaded</span>;
			}
		}

		customElements.define(name, El);
		const html = new HTMLRenderer();
		html.define(name, El);
		expect(await html.render(createElement(name, null))).toBe(
			`<${name}><span>loaded</span></${name}>`,
		);
	});

	test("define rejects classes which are not CrankHTMLElements", () => {
		const html = new HTMLRenderer();
		expect(() => html.define("x-nope", class {} as any)).toThrow(
			"is not a CrankHTMLElement",
		);
	});

	function captureWarnings(fn: () => void): Array<unknown> {
		const warnings: Array<unknown> = [];
		const warn = console.warn;
		const error = console.error;
		console.warn = console.error = (...args: Array<unknown>) =>
			warnings.push(args[0]);
		try {
			fn();
		} finally {
			console.warn = warn;
			console.error = error;
		}

		return warnings;
	}

	test("a light DOM element replaces server rendered content", () => {
		const name = tag("x-light");
		let renders = 0;
		class El extends CrankHTMLElement {
			static shadow = null;
			render() {
				renders++;
				return <span>hello</span>;
			}
		}

		const container = serve(`<${name}><span>hello</span></${name}>`);
		const span = container.querySelector("span")!;
		const warnings = captureWarnings(() => customElements.define(name, El));
		expect(container.innerHTML).toBe(`<${name}><span>hello</span></${name}>`);
		expect(container.querySelector("span")).not.toBe(span);
		expect(renders).toBe(1);
		expect(warnings).toEqual([]);
	});

	test("a light DOM element replaces hand-written fallback content", () => {
		const name = tag("x-time");
		class El extends CrankHTMLElement {
			static shadow = null;
			static observedAttributes = ["datetime"];
			render({datetime}: Record<string, string | null>) {
				return <time>{datetime}</time>;
			}
		}

		const container = serve(`<${name} datetime="2026-10-22">Oct 22</${name}>`);
		const warnings = captureWarnings(() => customElements.define(name, El));
		expect(container.innerHTML).toBe(
			`<${name} datetime="2026-10-22"><time>2026-10-22</time></${name}>`,
		);
		expect(warnings).toEqual([]);
	});

	test("an async light DOM render keeps the placeholder until it commits", async () => {
		const name = tag("x-slow");
		class El extends CrankHTMLElement {
			static shadow = null;
			async render() {
				await new Promise((resolve) => setTimeout(resolve, 5));
				return <b>ready</b>;
			}
		}

		const container = serve(`<${name}>loading</${name}>`);
		customElements.define(name, El);
		const el = container.firstElementChild as El;
		expect(el.innerHTML).toBe("loading");
		await el.updateComplete;
		expect(el.innerHTML).toBe("<b>ready</b>");
	});

	test("a page hydrated before an element is defined keeps its content", () => {
		const name = tag("x-later");
		class El extends CrankHTMLElement {
			static shadow = null;
			render() {
				return <span>own</span>;
			}
		}

		const html = new HTMLRenderer();
		html.define(name, El);
		function App() {
			return <main>{createElement(name, null)}</main>;
		}

		const container = document.createElement("div");
		document.body.appendChild(container);
		// A browser-side element class can render on the server only once
		// defined, so write the server output by hand.
		container.innerHTML = `<main><${name}><span>own</span></${name}></main>`;
		const warnings = captureWarnings(() =>
			renderer.hydrate(<App />, container),
		);
		expect(container.innerHTML).toBe(
			`<main><${name}><span>own</span></${name}></main>`,
		);
		expect(warnings).toEqual([]);
		customElements.define(name, El);
		expect(container.innerHTML).toBe(
			`<main><${name}><span>own</span></${name}></main>`,
		);
		renderer.render(null, container);
	});

	test("an element defined after the markup is parsed adopts its nodes", () => {
		const name = tag("x-late");
		class El extends CrankHTMLElement {
			render() {
				return <span>hello</span>;
			}
		}

		const container = serve(
			`<${name}><template shadowrootmode="open"><span>hello</span></template></${name}>`,
		);
		const el = container.firstElementChild!;
		const span = el.shadowRoot!.firstChild;
		customElements.define(name, El);
		expect(el.shadowRoot!.innerHTML).toBe("<span>hello</span>");
		expect(el.shadowRoot!.firstChild).toBe(span);
	});

	test("an open declarative shadow root is hydrated, not appended to", () => {
		const name = tag("x-open");
		class El extends CrankHTMLElement {
			render() {
				return <span>client</span>;
			}
		}

		const container = serve(
			`<${name}><template shadowrootmode="open"><span>ssr</span></template></${name}>`,
		);
		customElements.define(name, El);
		const el = container.firstElementChild!;
		expect(el.shadowRoot!.innerHTML).toBe("<span>client</span>");
	});

	test("a closed declarative shadow root is rendered fresh", () => {
		const name = tag("x-closed");
		let root: ShadowRoot | null = null;
		class El extends CrankHTMLElement {
			static shadow = {mode: "closed"} as const;
			render(_props: unknown, ctx: Context) {
				ctx.after((value: any) => {
					root = value.getRootNode();
				});
				return <span>client</span>;
			}
		}

		serve(
			`<${name}><template shadowrootmode="closed"><span>ssr</span></template></${name}>`,
		);
		customElements.define(name, El);
		expect(root!.innerHTML).toBe("<span>client</span>");
	});

	test("the author's attachInternals call still works with a declarative shadow root", () => {
		const name = tag("x-internals");
		let internals: ElementInternals | undefined;
		class El extends CrankHTMLElement {
			static formAssociated = true;
			constructor() {
				super();
				internals = this.attachInternals();
			}

			render() {
				return <span />;
			}
		}

		serve(
			`<${name}><template shadowrootmode="open"><span></span></template></${name}>`,
		);
		customElements.define(name, El);
		expect(internals).toBeDefined();
	});

	test("a page hydrated by Crank keeps a light DOM element's own content", async () => {
		const name = tag("x-own");
		class El extends CrankHTMLElement {
			static shadow = null;

			static observedAttributes = ["n"];
			render({n}: Record<string, string | null>) {
				return <span>{n}</span>;
			}
		}

		const html = new HTMLRenderer();
		html.define(name, El);
		customElements.define(name, El);
		function App({n}: {n: string}) {
			return <main>{createElement(name, {n})}</main>;
		}

		document.body.innerHTML = html.render(<App n="1" />) as string;
		const span = document.body.querySelector("span");
		renderer.hydrate(<App n="1" />, document.body);
		expect(document.body.innerHTML).toBe(
			`<main><${name} n="1"><span>1</span></${name}></main>`,
		);
		expect(document.body.querySelector("span")).toBe(span);

		renderer.render(<App n="2" />, document.body);
		await flush();
		expect(document.body.innerHTML).toBe(
			`<main><${name} n="2"><span>2</span></${name}></main>`,
		);
	});

	test("a shadow DOM element hydrates with its light children", () => {
		const name = tag("x-wrap");
		class El extends CrankHTMLElement {
			render() {
				return (
					<b>
						<slot />
					</b>
				);
			}
		}

		const html = new HTMLRenderer();
		html.define(name, El);
		customElements.define(name, El);
		function App() {
			return createElement(name, null, <p>light</p>);
		}

		const container = document.createElement("div");
		(container as any).setHTMLUnsafe(html.render(<App />));
		document.body.appendChild(container);
		const p = container.querySelector("p");
		renderer.hydrate(<App />, container);
		const el = container.firstElementChild!;
		expect(el.innerHTML).toBe("<p>light</p>");
		expect(el.shadowRoot!.innerHTML).toBe("<b><slot></slot></b>");
		expect(container.querySelector("p")).toBe(p);
	});

	test("children passed to a light DOM element are reported", () => {
		const name = tag("x-kids");
		class El extends CrankHTMLElement {
			static shadow = null;

			render() {
				return <span>own</span>;
			}
		}

		customElements.define(name, El);
		const errors: Array<unknown> = [];
		const error = console.error;
		console.error = (...args: Array<unknown>) => errors.push(args[0]);
		try {
			renderer.render(createElement(name, null, <b>child</b>), document.body);
		} finally {
			console.error = error;
		}

		expect(document.body.innerHTML).toBe(`<${name}><span>own</span></${name}>`);
		expect(errors.length).toBe(1);
	});
});

describe("web-components state", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	let uid = 0;
	const tag = (name: string) => `${name}-state-${uid++}`;

	test("a closed shadow root is not reachable through a global symbol", () => {
		const name = tag("x-private");
		class El extends CrankHTMLElement {
			static shadow = {mode: "closed"} as const;
			render() {
				return <span />;
			}
		}

		customElements.define(name, El);
		const el = document.createElement(name);
		for (const sym of Object.getOwnPropertySymbols(el)) {
			expect(String((el as any)[sym]?.root)).not.toContain("ShadowRoot");
		}
	});

	test("a property set before upgrade renders once", async () => {
		const name = tag("x-preset");
		let renders = 0;
		const el = document.createElement(name) as any;
		el.label = "preset";
		document.body.appendChild(el);
		class El extends CrankHTMLElement {
			static shadow = null;

			_label = "";
			get label() {
				return this._label;
			}

			set label(value) {
				this._label = value;
				this.requestUpdate();
			}

			render() {
				renders++;
				return <span>{this.label}</span>;
			}
		}

		customElements.define(name, El);
		await flush();
		expect(el.innerHTML).toBe("<span>preset</span>");
		expect(renders).toBe(1);
	});
});

describe("web-components SSR parity", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	let uid = 0;
	const tag = (name: string) => `${name}-parity-${uid++}`;

	test("the server tag prints the element's own attributes", () => {
		const name = tag("x-attrs");
		class El extends CrankHTMLElement {
			static shadow = null;
			label = "";
			render() {
				this.setAttribute("role", "button");
				return this.label;
			}
		}

		customElements.define(name, El);
		const html = new HTMLRenderer();
		html.define(name, El);
		expect(
			html.render(
				createElement(name, {
					label: "hi",
					class: {a: true, b: false},
					open: true,
				}),
			),
		).toBe(`<${name} class="a" open role="button">hi</${name}>`);
	});

	test("a getter-only property becomes an attribute", () => {
		const name = tag("x-getter");
		class El extends CrankHTMLElement {
			static shadow = null;
			get value() {
				return "fixed";
			}

			render() {
				return this.value;
			}
		}

		customElements.define(name, El);
		const html = new HTMLRenderer();
		html.define(name, El);
		expect(html.render(createElement(name, {value: "x"}))).toBe(
			`<${name} value="x">fixed</${name}>`,
		);
	});

	test("meta props stay on the host", () => {
		const name = tag("x-meta");
		class El extends CrankHTMLElement {
			static shadow = null;
			render() {
				return "ok";
			}
		}

		customElements.define(name, El);
		const html = new HTMLRenderer();
		html.define(name, El);
		const errors: Array<unknown> = [];
		const error = console.error;
		console.error = (...args: Array<unknown>) => errors.push(args[0]);
		try {
			expect(
				html.render(createElement(name, {key: "k", copy: "!a", hydrate: "!a"})),
			).toBe(`<${name}>ok</${name}>`);
		} finally {
			console.error = error;
		}

		expect(errors).toEqual([]);
	});

	test("define validates names and classes", () => {
		const a = tag("x-def");
		const b = tag("x-def");
		class El extends CrankHTMLElement {}
		class Other extends CrankHTMLElement {}
		const html = new HTMLRenderer();
		expect(() => html.define("div", El)).toThrow(
			"not a valid custom element name",
		);
		expect(() => html.define("font-face", El)).toThrow(
			"not a valid custom element name",
		);
		html.define(a, El);
		// Defining the same tag with the same class again is a no-op.
		html.define(a, El);
		expect(html.get(a)).toBe(El);
		expect(() => html.define(a, Other)).toThrow("already been defined");
		expect(() => html.define(b, El)).toThrow("already been defined");
	});

	test("an undefined class reports how to fix it", () => {
		const name = tag("x-undefined");
		class El extends CrankHTMLElement {}
		const html = new HTMLRenderer();
		html.define(name, El);
		expect(() => html.render(createElement(name, null))).toThrow(
			"customElements.define",
		);
	});

	test("events named like built-in handlers keep the platform's handler", () => {
		const name = tag("x-change");
		class El extends CrankHTMLElement {
			static events = ["change", "bounce"] as const;
			render() {
				return null;
			}
		}

		customElements.define(name, El);
		const el = document.createElement(name) as El & {onbounce: unknown};
		expect(Object.getOwnPropertyDescriptor(el, "onchange")).toBe(undefined);
		expect(Object.getOwnPropertyDescriptor(el, "onbounce")).toBeDefined();
		let fired = 0;
		el.onchange = () => fired++;
		el.dispatchEvent(new Event("change"));
		expect(fired).toBe(1);
	});
});

describe("web-components SSR isolation", () => {
	test("provisions do not cross an element, as in a browser", () => {
		const name = "x-consumer-ssr-isolation";
		class El extends CrankHTMLElement {
			static shadow = null;
			render(_props: unknown, ctx: Context) {
				return String(ctx.consume("theme"));
			}
		}

		customElements.define(name, El);
		const html = new HTMLRenderer();
		html.define(name, El);
		function* Provider(this: Context, {children}: {children: unknown}) {
			this.provide("theme", "dark");
			for ({children} of this) {
				yield children as any;
			}
		}

		expect(
			html.render(
				<Provider>
					<main>{createElement(name, null)}</main>
				</Provider>,
			),
		).toBe(`<main><${name}>undefined</${name}></main>`);
	});
});
