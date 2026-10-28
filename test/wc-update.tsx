/// <reference lib="dom" />
/** @jsx createElement */
import {describe, test, afterEach, expect} from "@b9g/libuild/test";
import {createElement} from "../src/crank.js";
import type {Context} from "../src/crank.js";
import {CrankHTMLElement} from "../src/wc.js";
import type {ElementProps} from "../src/wc.js";

describe("updateComplete", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	let uid = 0;
	const tag = (name: string) => `${name}-update-${uid++}`;

	test("resolves after an attribute change renders", async () => {
		const name = tag("x-count");
		class El extends CrankHTMLElement<typeof El> {
			static shadow = null;
			static props = {count: Number};
			render({count}: ElementProps<typeof El>) {
				return <span>{count}</span>;
			}
		}

		customElements.define(name, El);
		const el = document.createElement(name) as El;
		el.setAttribute("count", "1");
		document.body.appendChild(el);
		el.setAttribute("count", "2");
		expect(el.innerHTML).toBe("<span>1</span>");
		await el.updateComplete;
		expect(el.innerHTML).toBe("<span>2</span>");
	});

	test("waits for an async render", async () => {
		const name = tag("x-async");
		let n = 0;
		class El extends CrankHTMLElement {
			static shadow = null;
			async render() {
				await new Promise((resolve) => setTimeout(resolve, 5));
				return <span>{++n}</span>;
			}
		}

		customElements.define(name, El);
		const el = document.createElement(name) as El;
		document.body.appendChild(el);
		await el.updateComplete;
		expect(el.innerHTML).toBe("<span>1</span>");
		el.requestUpdate();
		await el.updateComplete;
		expect(el.innerHTML).toBe("<span>2</span>");
	});

	test("waits for updates requested while it is pending", async () => {
		const name = tag("x-chain");
		let n = 0;
		class El extends CrankHTMLElement {
			static shadow = null;
			async render() {
				await new Promise((resolve) => setTimeout(resolve, 5));
				n++;
				if (n === 2) {
					this.requestUpdate();
				}

				return <span>{n}</span>;
			}
		}

		customElements.define(name, El);
		const el = document.createElement(name) as El;
		document.body.appendChild(el);
		el.requestUpdate();
		await el.updateComplete;
		expect(el.innerHTML).toBe(`<span>${n}</span>`);
		expect(n).toBeGreaterThanOrEqual(3);
	});

	test("coalesced updates render once", async () => {
		const name = tag("x-same");
		let renders = 0;
		class El extends CrankHTMLElement {
			static shadow = null;
			render() {
				renders++;
				return null;
			}
		}

		customElements.define(name, El);
		const el = document.createElement(name) as El;
		document.body.appendChild(el);
		el.requestUpdate();
		el.requestUpdate();
		await el.updateComplete;
		expect(renders).toBe(2);
	});

	test("resolves when nothing is pending", async () => {
		const name = tag("x-idle");
		class El extends CrankHTMLElement {
			static shadow = null;
			render() {
				return null;
			}
		}

		customElements.define(name, El);
		const el = document.createElement(name) as El;
		await el.updateComplete;
		el.requestUpdate();
		// Not connected, so the request renders nothing.
		await el.updateComplete;
	});

	test("render errors go to the error event, and updateComplete resolves", async () => {
		const name = tag("x-throw");
		const errors: Array<unknown> = [];
		class El extends CrankHTMLElement {
			static shadow = null;
			fail = false;
			render() {
				if (this.fail) {
					throw new Error("boom");
				}

				return null;
			}
		}

		customElements.define(name, El);
		const el = document.createElement(name) as El;
		document.body.appendChild(el);
		el.addEventListener("error", (ev) => {
			ev.preventDefault();
			errors.push((ev as ErrorEvent).error);
		});
		el.fail = true;
		el.requestUpdate();
		await el.updateComplete;
		expect((errors[0] as Error).message).toBe("boom");
	});

	test("resolves when an error event listener handles the error", async () => {
		const name = tag("x-handled");
		class El extends CrankHTMLElement {
			static shadow = null;
			fail = false;
			render() {
				if (this.fail) {
					throw new Error("boom");
				}

				return null;
			}
		}

		customElements.define(name, El);
		const el = document.createElement(name) as El;
		document.body.appendChild(el);
		el.addEventListener("error", (ev) => ev.preventDefault());
		el.fail = true;
		el.requestUpdate();
		await el.updateComplete;
	});
});

describe("recovering from render errors", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	test("an element renders again after an async render rejects", async () => {
		const name = "x-recover-async";
		let fail = true;
		class El extends CrankHTMLElement {
			async render() {
				await new Promise((resolve) => setTimeout(resolve, 1));
				if (fail) {
					throw new Error("boom");
				}

				return <span>ok</span>;
			}
		}

		customElements.define(name, El);
		const el = document.createElement(name) as El;
		el.addEventListener("error", (ev) => ev.preventDefault());
		document.body.appendChild(el);
		await el.updateComplete;
		fail = false;
		el.requestUpdate();
		await el.updateComplete;
		expect(el.shadowRoot!.innerHTML).toBe("<span>ok</span>");
	});

	test("a generator render renders again after it throws", async () => {
		const name = "x-recover-generator";
		let fail = true;
		class El extends CrankHTMLElement {
			*render(_props: unknown, ctx: Context) {
				for ({} of ctx) {
					if (fail) {
						throw new Error("boom");
					}

					yield <span>ok</span>;
				}
			}
		}

		customElements.define(name, El);
		const el = document.createElement(name) as El;
		el.addEventListener("error", (ev) => ev.preventDefault());
		document.body.appendChild(el);
		expect(el.shadowRoot!.innerHTML).toBe("");
		fail = false;
		el.requestUpdate();
		await el.updateComplete;
		expect(el.shadowRoot!.innerHTML).toBe("<span>ok</span>");
	});

	test("light DOM fallback content goes once a later render commits", async () => {
		const name = "x-recover-fallback";
		let fail = true;
		class El extends CrankHTMLElement {
			static shadow = null;
			render() {
				if (fail) {
					throw new Error("boom");
				}

				return <span>ok</span>;
			}
		}

		customElements.define(name, El);
		const container = document.createElement("div");
		container.innerHTML = `<${name}><i>fallback</i></${name}>`;
		const el = container.firstElementChild as El;
		el.addEventListener("error", (ev) => ev.preventDefault());
		document.body.appendChild(container);
		expect(el.innerHTML).toBe("<i>fallback</i>");
		fail = false;
		el.requestUpdate();
		await el.updateComplete;
		expect(el.innerHTML).toBe("<span>ok</span>");
	});
});
