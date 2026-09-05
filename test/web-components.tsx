/// <reference lib="dom" />
/** @jsx createElement */
import {describe, test, afterEach, expect} from "@b9g/libuild/test";
import {createElement} from "../src/crank.js";
import type {Context} from "../src/crank.js";
import {renderer} from "../src/dom.js";
import {CrankHTMLElement} from "../src/web-components.js";

describe("web-components", () => {
	// Compile-only: the {events} type parameter types the generated on<type>
	// handlers. Never called (constructing an unregistered element would throw).
	function _eventTyping() {
		// Tuple form: names only, each handler typed `(ev: Event) => unknown`.
		class Tuple extends CrankHTMLElement<{events: typeof Tuple.events}> {
			static events = ["bounce", "finish"] as const;
			render() {
				return null;
			}
		}

		const el = new Tuple();
		el.onbounce = (_e: Event) => {};
		el.onfinish = null;
		el.requestUpdate();
		// @ts-expect-error - undeclared handler
		el.onnope = () => {};

		// Event-map form: typed payloads flow to each handler argument.
		class Mapped extends CrankHTMLElement<{
			events: {bounce: CustomEvent<{count: number}>};
		}> {
			render() {
				return null;
			}
		}

		const m = new Mapped();
		m.onbounce = (e: CustomEvent<{count: number}>) => e.detail.count;
		m.onbounce = null;
		// @ts-expect-error - payload is CustomEvent<{count}>, not a plain number
		m.onbounce = (n: number) => n;
	}
	void _eventTyping;

	afterEach(() => {
		document.body.innerHTML = "";
	});

	// A macrotask flush: drains the microtask queue used by requestUpdate.
	const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

	let uid = 0;
	const tag = (name: string) => `${name}-${uid++}`;

	test("sync render produces content synchronously on connect (light DOM)", () => {
		class El extends CrankHTMLElement {
			static observedAttributes = ["label"];
			render({label}: Record<string, string | null>) {
				return <span>{label ?? "default"}</span>;
			}
		}

		const name = tag("x-sync");
		customElements.define(name, El);
		const el = document.createElement(name);
		el.setAttribute("label", "hi");
		document.body.appendChild(el);

		expect(el.innerHTML).toBe("<span>hi</span>");
	});

	test("attribute change re-renders with new props", async () => {
		class El extends CrankHTMLElement {
			static observedAttributes = ["label"];
			render({label}: Record<string, string | null>) {
				return <span>{label}</span>;
			}
		}

		const name = tag("x-attr");
		customElements.define(name, El);
		const el = document.createElement(name);
		el.setAttribute("label", "one");
		document.body.appendChild(el);
		expect(el.innerHTML).toBe("<span>one</span>");

		el.setAttribute("label", "two");
		await flush();
		expect(el.innerHTML).toBe("<span>two</span>");
	});

	test("requestUpdate re-renders for non-attribute state", async () => {
		class El extends CrankHTMLElement {
			#value = "a";
			set value(v: string) {
				this.#value = v;
				this.requestUpdate();
			}
			render() {
				return <span>{this.#value}</span>;
			}
		}

		const name = tag("x-req");
		customElements.define(name, El);
		const el = document.createElement(name) as any;
		document.body.appendChild(el);
		expect(el.innerHTML).toBe("<span>a</span>");

		el.value = "b";
		await flush();
		expect(el.innerHTML).toBe("<span>b</span>");
	});

	test("generator render keeps state across renders", async () => {
		class El extends CrankHTMLElement {
			bump() {
				this.requestUpdate();
			}
			*render(_props: Record<string, string | null>, ctx: Context) {
				let renders = 0;
				for (_props of ctx) {
					renders++;
					yield <span>{renders}</span>;
				}
			}
		}

		const name = tag("x-gen");
		customElements.define(name, El);
		const el = document.createElement(name) as any;
		document.body.appendChild(el);
		expect(el.innerHTML).toBe("<span>1</span>");

		el.bump();
		await flush();
		expect(el.innerHTML).toBe("<span>2</span>");
		el.bump();
		await flush();
		expect(el.innerHTML).toBe("<span>3</span>");
	});

	test("shadow DOM renders into the shadow root with native slots", () => {
		class El extends CrankHTMLElement {
			static shadowDOM = true;
			render() {
				return (
					<article>
						<slot />
					</article>
				);
			}
		}

		const name = tag("x-shadow");
		customElements.define(name, El);
		const el = document.createElement(name);
		el.innerHTML = "<p>light</p>";
		document.body.appendChild(el);

		const root = el.shadowRoot!;
		expect(root).toBeTruthy();
		expect(root.innerHTML).toBe("<article><slot></slot></article>");
		// Light child stays in the light DOM and is projected by the slot.
		expect(el.querySelector("p")!.textContent).toBe("light");
		const slot = root.querySelector("slot")!;
		expect(
			slot.assignedNodes({flatten: true}).includes(el.querySelector("p")!),
		).toEqual(true);
	});

	test("static styles is adopted once per class into the shadow root", () => {
		class El extends CrankHTMLElement {
			static shadowDOM = true;
			static styles = `:host { display: block }`;
			render() {
				return <slot />;
			}
		}

		const name = tag("x-styled");
		customElements.define(name, El);
		const a = document.createElement(name);
		const b = document.createElement(name);
		document.body.append(a, b);

		expect(a.shadowRoot!.adoptedStyleSheets.length).toBe(1);
		// Shared by reference across instances.
		expect(a.shadowRoot!.adoptedStyleSheets[0]).toBe(
			b.shadowRoot!.adoptedStyleSheets[0],
		);
		expect(
			a.shadowRoot!.adoptedStyleSheets[0].cssRules[0].cssText.replace(
				/\s+/g,
				" ",
			),
		).toBe(":host { display: block; }");
	});

	test("static events generates on<type> that fires on dispatch", () => {
		class El extends CrankHTMLElement {
			static events = ["bounce"] as const;
			render() {
				return <span />;
			}
		}

		const name = tag("x-evt");
		customElements.define(name, El);
		const el = document.createElement(name) as any;
		document.body.appendChild(el);

		expect(el.onbounce).toBe(null);
		let got: Event | undefined;
		el.onbounce = (e: Event) => (got = e);
		el.dispatchEvent(new CustomEvent("bounce"));
		expect(got).toBeTruthy();
		expect(got!.type).toBe("bounce");

		el.onbounce = null;
		got = undefined;
		el.dispatchEvent(new CustomEvent("bounce"));
		expect(got).toBe(undefined);
	});

	test("on<type> preserves listener order like the platform", () => {
		class El extends CrankHTMLElement {
			static events = ["ping"] as const;
			render() {
				return <span />;
			}
		}

		const name = tag("x-order");
		customElements.define(name, El);
		const el = document.createElement(name) as any;
		document.body.appendChild(el);

		const calls: string[] = [];
		el.addEventListener("ping", () => calls.push("A"));
		el.onping = () => calls.push("B");
		el.addEventListener("ping", () => calls.push("C"));
		el.dispatchEvent(new CustomEvent("ping"));
		expect(calls).toEqual(["A", "B", "C"]);

		// Reassign keeps position.
		calls.length = 0;
		el.onping = () => calls.push("B2");
		el.dispatchEvent(new CustomEvent("ping"));
		expect(calls).toEqual(["A", "B2", "C"]);

		// null then reassign moves it to the end.
		calls.length = 0;
		el.onping = null;
		el.onping = () => calls.push("B3");
		el.dispatchEvent(new CustomEvent("ping"));
		expect(calls).toEqual(["A", "C", "B3"]);
	});

	test("form association: base re-renders on form callbacks", async () => {
		class El extends CrankHTMLElement {
			static formAssociated = true;
			#internals = this.attachInternals();
			#value: string | null = "5";
			get value() {
				return this.#value;
			}
			set value(v: string | null) {
				this.#value = v;
				this.requestUpdate();
			}
			formResetCallback() {
				super.formResetCallback();
				this.#value = null;
			}
			render() {
				this.#internals.setFormValue(this.#value);
				return <span>{this.#value ?? "empty"}</span>;
			}
		}

		const name = tag("x-field");
		customElements.define(name, El);
		const form = document.createElement("form");
		const el = document.createElement(name) as any;
		form.appendChild(el);
		document.body.appendChild(form);
		expect(el.innerHTML).toBe("<span>5</span>");

		form.reset();
		await flush();
		expect(el.innerHTML).toBe("<span>empty</span>");
	});

	test("render error dispatches a cancelable error event", () => {
		const boom = new Error("boom");
		class El extends CrankHTMLElement {
			render(): never {
				throw boom;
			}
		}

		const name = tag("x-err");
		customElements.define(name, El);
		const el = document.createElement(name);

		let caught: any;
		el.addEventListener("error", (e) => {
			caught = e;
			e.preventDefault(); // suppress reportError so the test doesn't go uncaught
		});
		document.body.appendChild(el);

		expect(caught).toBeTruthy();
		expect(caught.error).toBe(boom);
		expect(caught.defaultPrevented).toBe(true);
	});

	test("a move does not unmount; a real removal cleans up", async () => {
		const cleaned: string[] = [];
		class El extends CrankHTMLElement {
			*render(_props: Record<string, string | null>, ctx: Context) {
				ctx.cleanup(() => cleaned.push("bye"));
				for (_props of ctx) {
					yield <span>here</span>;
				}
			}
		}

		const name = tag("x-move");
		customElements.define(name, El);
		const a = document.createElement("div");
		const b = document.createElement("div");
		document.body.append(a, b);
		const el = document.createElement(name);
		a.appendChild(el);
		expect(el.innerHTML).toBe("<span>here</span>");

		// Move: remove and immediately re-append elsewhere.
		b.appendChild(el);
		await flush();
		expect(cleaned).toEqual([]);
		expect(el.innerHTML).toBe("<span>here</span>");

		// Real removal.
		el.remove();
		await flush();
		expect(cleaned).toEqual(["bye"]);
	});

	test("async function render shows nothing until it resolves", async () => {
		class El extends CrankHTMLElement {
			async render() {
				return <span>async</span>;
			}
		}

		const name = tag("x-async");
		customElements.define(name, El);
		const el = document.createElement(name);
		document.body.appendChild(el);
		expect(el.innerHTML).toBe("");

		await flush();
		expect(el.innerHTML).toBe("<span>async</span>");
	});

	test("async generator render", async () => {
		class El extends CrankHTMLElement {
			async *render() {
				yield <span>ag</span>;
			}
		}

		const name = tag("x-asyncgen");
		customElements.define(name, El);
		const el = document.createElement(name);
		document.body.appendChild(el);

		await flush();
		expect(el.innerHTML).toBe("<span>ag</span>");
	});

	test("requestUpdate coalesces multiple calls into one render", async () => {
		let renders = 0;
		class El extends CrankHTMLElement {
			poke() {
				this.requestUpdate();
			}
			*render(_props: Record<string, string | null>, ctx: Context) {
				for (_props of ctx) {
					renders++;
					yield <span>{renders}</span>;
				}
			}
		}

		const name = tag("x-coalesce");
		customElements.define(name, El);
		const el = document.createElement(name) as any;
		document.body.appendChild(el);
		expect(renders).toBe(1);

		el.poke();
		el.poke();
		el.poke();
		await flush();
		expect(renders).toBe(2);
	});

	test("attributeChangedCallback bails when the value is unchanged", async () => {
		let renders = 0;
		class El extends CrankHTMLElement {
			static observedAttributes = ["x"];
			*render(_props: Record<string, string | null>, ctx: Context) {
				for (_props of ctx) {
					renders++;
					yield <span>{this.getAttribute("x")}</span>;
				}
			}
		}

		const name = tag("x-bail");
		customElements.define(name, El);
		const el = document.createElement(name);
		el.setAttribute("x", "1");
		document.body.appendChild(el);
		expect(renders).toBe(1);

		el.setAttribute("x", "1"); // same value
		await flush();
		expect(renders).toBe(1);

		el.setAttribute("x", "2");
		await flush();
		expect(renders).toBe(2);
	});

	test("in-component try/catch yields a fallback and no error event", () => {
		class El extends CrankHTMLElement {
			static observedAttributes = ["bad"];
			*render(props: Record<string, string | null>, ctx: Context) {
				for (props of ctx) {
					try {
						if (props.bad != null) {
							throw new Error("nope");
						}

						yield <span>ok</span>;
					} catch {
						yield <span>fallback</span>;
					}
				}
			}
		}

		const name = tag("x-fallback");
		customElements.define(name, El);
		const el = document.createElement(name);
		el.setAttribute("bad", "1");
		let errored = false;
		el.addEventListener("error", () => (errored = true));
		document.body.appendChild(el);

		expect(el.innerHTML).toBe("<span>fallback</span>");
		expect(errored).toBe(false);
	});

	test("async render rejection dispatches an error event", async () => {
		const boom = new Error("async boom");
		class El extends CrankHTMLElement {
			async render(): Promise<never> {
				throw boom;
			}
		}

		const name = tag("x-asyncerr");
		customElements.define(name, El);
		const el = document.createElement(name);
		let caught: any;
		el.addEventListener("error", (e) => {
			caught = e;
			e.preventDefault();
		});
		document.body.appendChild(el);

		await flush();
		expect(caught).toBeTruthy();
		expect(caught.error).toBe(boom);
	});

	test("an unhandled render error is reported via reportError", () => {
		const boom = new Error("unhandled boom");
		let reported: unknown;
		const onWindowError = (e: ErrorEvent) => {
			if (e.error === boom) {
				reported = e.error;
				e.preventDefault(); // suppress the uncaught report so the run stays green
			}
		};

		window.addEventListener("error", onWindowError);
		try {
			class El extends CrankHTMLElement {
				render(): never {
					throw boom;
				}
			}

			const name = tag("x-report");
			customElements.define(name, El);
			// No element-level error listener, so the event isn't canceled.
			document.body.appendChild(document.createElement(name));
		} finally {
			window.removeEventListener("error", onWindowError);
		}

		expect(reported).toBe(boom);
	});

	test("form value is submitted via setFormValue", () => {
		class El extends CrankHTMLElement {
			static formAssociated = true;
			#internals = this.attachInternals();
			render() {
				this.#internals.setFormValue("5");
				return <span />;
			}
		}

		const name = tag("x-submit");
		customElements.define(name, El);
		const form = document.createElement("form");
		const el = document.createElement(name);
		el.setAttribute("name", "rating");
		form.appendChild(el);
		document.body.appendChild(form);

		expect(new FormData(form).get("rating")).toBe("5");
	});

	test("formDisabledCallback re-renders with :disabled", async () => {
		class El extends CrankHTMLElement {
			static formAssociated = true;
			render() {
				return <span>{this.matches(":disabled") ? "off" : "on"}</span>;
			}
		}

		const name = tag("x-disabled");
		customElements.define(name, El);
		const fieldset = document.createElement("fieldset");
		const el = document.createElement(name);
		fieldset.appendChild(el);
		document.body.appendChild(fieldset);
		expect(el.innerHTML).toBe("<span>on</span>");

		fieldset.disabled = true;
		await flush();
		expect(el.innerHTML).toBe("<span>off</span>");
	});

	test("light DOM styles adopt into document, deduped per class", () => {
		class El extends CrankHTMLElement {
			static styles = `[data-x-lite] { color: red }`;
			render() {
				return <span />;
			}
		}

		const name = tag("x-lite");
		customElements.define(name, El);
		const before = document.adoptedStyleSheets.length;
		document.body.append(
			document.createElement(name),
			document.createElement(name),
		);

		// One sheet, despite two instances.
		expect(document.adoptedStyleSheets.length).toBe(before + 1);
	});

	test("styles accepts an array and a pre-built CSSStyleSheet", () => {
		const sheet = new CSSStyleSheet();
		sheet.replaceSync(":host { color: blue }");
		class El extends CrankHTMLElement {
			static shadowDOM = true;
			static styles = [":host { color: red }", sheet];
			render() {
				return <slot />;
			}
		}

		const name = tag("x-multi");
		customElements.define(name, El);
		const el = document.createElement(name);
		document.body.appendChild(el);

		const adopted = el.shadowRoot!.adoptedStyleSheets;
		expect(adopted.length).toBe(2);
		// The pre-built sheet is used by reference, not re-parsed.
		expect(adopted[1]).toBe(sheet);
	});

	test("shadowDOM accepts a ShadowRootInit", () => {
		class El extends CrankHTMLElement {
			static shadowDOM = {mode: "open", delegatesFocus: true} as const;
			render() {
				return <slot />;
			}
		}

		const name = tag("x-init");
		customElements.define(name, El);
		const el = document.createElement(name);
		document.body.appendChild(el);

		expect(el.shadowRoot).toBeTruthy();
		expect(el.shadowRoot!.delegatesFocus).toBe(true);
	});

	test("shadowDOM closed mode renders without exposing the root", () => {
		class El extends CrankHTMLElement {
			static shadowDOM = {mode: "closed"} as const;
			render() {
				return <slot />;
			}
		}

		const name = tag("x-closed");
		customElements.define(name, El);
		const el = document.createElement(name);
		el.innerHTML = "<p>light</p>";
		document.body.appendChild(el);

		// A closed root is not exposed on the element, and content rendered into it,
		// so the light DOM keeps only the authored child the slot projects.
		expect(el.shadowRoot).toBe(null);
		expect(el.innerHTML).toBe("<p>light</p>");
	});

	test("a property set before upgrade is re-applied through the accessor", () => {
		const name = tag("x-upgrade");
		// Set the property before the class is defined: it becomes a plain own
		// data property shadowing the (not-yet-existing) accessor.
		const el = document.createElement(name) as any;
		el.value = "early";
		document.body.appendChild(el);

		class El extends CrankHTMLElement {
			#value: string | null = null;
			get value() {
				return this.#value;
			}
			set value(v: string | null) {
				this.#value = v;
				this.requestUpdate();
			}
			render() {
				return <span>{this.#value ?? "none"}</span>;
			}
		}

		customElements.define(name, El); // upgrades the connected element

		expect(el.value).toBe("early");
		expect(el.innerHTML).toBe("<span>early</span>");
	});

	test("light DOM render replaces authored children", () => {
		class El extends CrankHTMLElement {
			render() {
				return <span>owned</span>;
			}
		}

		const name = tag("x-owns");
		customElements.define(name, El);
		const el = document.createElement(name);
		el.innerHTML = "<em>authored</em>";
		document.body.appendChild(el);

		expect(el.innerHTML).toBe("<span>owned</span>");
	});

	// --- integration points ---

	test("Crank's DOM renderer upgrades and renders a custom element", async () => {
		class El extends CrankHTMLElement {
			static shadowDOM = true;
			render() {
				return <b>x</b>;
			}
		}

		const name = tag("x-viacrank");
		customElements.define(name, El);
		const container = document.createElement("div");
		document.body.appendChild(container);
		renderer.render(createElement(name), container);

		await flush();
		const el = container.querySelector(name) as any;
		expect(el.shadowRoot).toBeTruthy();
		expect(el.shadowRoot.innerHTML).toBe("<b>x</b>");
	});

	test("nested custom elements each render their own root", async () => {
		class Inner extends CrankHTMLElement {
			static shadowDOM = true;
			render() {
				return <i>in</i>;
			}
		}
		const innerName = tag("x-inner");
		customElements.define(innerName, Inner);

		class Outer extends CrankHTMLElement {
			static shadowDOM = true;
			render() {
				return createElement(innerName);
			}
		}
		const outerName = tag("x-outer");
		customElements.define(outerName, Outer);

		const outer = document.createElement(outerName) as any;
		document.body.appendChild(outer);
		await flush();

		const inner = outer.shadowRoot.querySelector(innerName);
		expect(inner).toBeTruthy();
		expect(inner.shadowRoot.innerHTML).toBe("<i>in</i>");
	});

	test("ctx.refresh() inside render re-renders with the same props", async () => {
		let n = 0;
		class El extends CrankHTMLElement {
			tick?: () => unknown;
			*render(_props: Record<string, string | null>, ctx: Context) {
				this.tick = () => ctx.refresh();
				for (_props of ctx) {
					n++;
					yield <span>{n}</span>;
				}
			}
		}

		const name = tag("x-refresh");
		customElements.define(name, El);
		const el = document.createElement(name) as any;
		document.body.appendChild(el);
		expect(el.innerHTML).toBe("<span>1</span>");

		el.tick();
		await flush();
		expect(el.innerHTML).toBe("<span>2</span>");
	});

	test("ctx.schedule and ctx.after both fire", async () => {
		const order: string[] = [];
		class El extends CrankHTMLElement {
			render(_props: Record<string, string | null>, ctx: Context) {
				ctx.schedule(() => order.push("schedule"));
				ctx.after(() => order.push("after"));
				return <span />;
			}
		}

		const name = tag("x-sched");
		customElements.define(name, El);
		document.body.appendChild(document.createElement(name));
		await flush();

		expect(order).toEqual(["schedule", "after"]);
	});

	test("provisions flow within an element's own tree", () => {
		function Child(this: Context, _props: {}, ctx: Context) {
			return <span>{ctx.consume("token") as string}</span>;
		}

		class El extends CrankHTMLElement {
			*render(_props: Record<string, string | null>, ctx: Context) {
				ctx.provide("token", "V");
				for (_props of ctx) {
					yield createElement(Child);
				}
			}
		}

		const name = tag("x-provide");
		customElements.define(name, El);
		const el = document.createElement(name);
		document.body.appendChild(el);

		expect(el.innerHTML).toBe("<span>V</span>");
	});

	test("shadow styles take effect (computed style)", () => {
		class El extends CrankHTMLElement {
			static shadowDOM = true;
			static styles = `:host { display: block }`;
			render() {
				return <slot />;
			}
		}

		const name = tag("x-computed");
		customElements.define(name, El);
		const el = document.createElement(name);
		document.body.appendChild(el);

		// Custom elements are display:inline by default; :host overrides it.
		expect(getComputedStyle(el).display).toBe("block");
	});

	test("a property setter reflects to an attribute and re-renders", async () => {
		class El extends CrankHTMLElement {
			static observedAttributes = ["color"];
			get color() {
				return this.getAttribute("color");
			}
			set color(v: string | null) {
				if (v == null) {
					this.removeAttribute("color");
				} else {
					this.setAttribute("color", v);
				}
			}
			render() {
				return <span>{this.getAttribute("color") ?? "none"}</span>;
			}
		}

		const name = tag("x-reflect");
		customElements.define(name, El);
		const el = document.createElement(name) as any;
		document.body.appendChild(el);
		expect(el.innerHTML).toBe("<span>none</span>");

		el.color = "red";
		expect(el.getAttribute("color")).toBe("red");
		await flush();
		expect(el.innerHTML).toBe("<span>red</span>");
	});

	test("on<type> handlers written as regular functions see the element as this", () => {
		class El extends CrankHTMLElement<{events: ["ping"]}> {
			static events = ["ping"] as const;
			render() {
				return null;
			}
		}

		const name = tag("x-this");
		customElements.define(name, El);
		const el = document.createElement(name) as CrankHTMLElement<{
			events: ["ping"];
		}>;
		document.body.appendChild(el);

		let receiver: unknown = null;
		el.onping = function (this: unknown) {
			receiver = this;
		};
		el.dispatchEvent(new CustomEvent("ping"));
		expect(receiver).toBe(el);
	});

	test("an on<type> handler assigned before upgrade survives the upgrade", () => {
		const name = tag("x-early");
		const el = document.createElement(name) as any;
		document.body.appendChild(el);
		const received: Array<Event> = [];
		el.onping = (ev: Event) => received.push(ev);

		class El extends CrankHTMLElement<{events: ["ping"]}> {
			static events = ["ping"] as const;
			render() {
				return null;
			}
		}

		customElements.define(name, El);
		customElements.upgrade(el);
		el.dispatchEvent(new CustomEvent("ping"));
		expect(received.length).toBe(1);
	});

	test("shadow stylesheets are not duplicated by a real remove and re-append", async () => {
		class El extends CrankHTMLElement {
			static shadowDOM = true;
			static styles = "span { color: teal; }";
			render() {
				return <span>styled</span>;
			}
		}

		const name = tag("x-readopt");
		customElements.define(name, El);
		const el = document.createElement(name);
		document.body.appendChild(el);
		expect(el.shadowRoot!.adoptedStyleSheets.length).toBe(1);

		el.remove();
		await flush();
		document.body.appendChild(el);
		await flush();
		expect(el.shadowRoot!.adoptedStyleSheets.length).toBe(1);
	});

	test("a light DOM element inside a shadow root adopts styles into that root", () => {
		class Inner extends CrankHTMLElement {
			static styles = "span { color: crimson; }";
			render() {
				return <span>inner</span>;
			}
		}

		const innerName = tag("x-scoped");
		customElements.define(innerName, Inner);

		class Outer extends CrankHTMLElement {
			static shadowDOM = true;
			render() {
				return createElement(innerName);
			}
		}

		const outerName = tag("x-scope-host");
		customElements.define(outerName, Outer);
		const before = document.adoptedStyleSheets.length;
		const outer = document.createElement(outerName);
		document.body.appendChild(outer);

		expect(document.adoptedStyleSheets.length).toBe(before);
		expect(outer.shadowRoot!.adoptedStyleSheets.length).toBe(1);
	});

	test("a closed declarative shadow root is reused (SSR)", () => {
		const name = tag("x-declarative");
		class El extends CrankHTMLElement {
			static shadowDOM = {mode: "closed"} as const;
			render() {
				return <span>hydrated</span>;
			}
		}

		const container = document.createElement("div");
		(container as any).setHTMLUnsafe(
			`<${name}><template shadowrootmode="closed"><span>ssr</span></template></${name}>`,
		);
		document.body.appendChild(container);
		customElements.define(name, El);
		const el = container.firstElementChild!;
		expect(el.tagName.toLowerCase()).toBe(name);
		// The closed root is invisible from outside; a successful upgrade and
		// empty light DOM show the constructor reused it instead of throwing.
		expect(el instanceof El).toBe(true);
		expect(el.innerHTML).toBe("");
	});
});
