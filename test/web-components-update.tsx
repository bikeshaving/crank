/// <reference lib="dom" />
/** @jsx createElement */
import {describe, test, afterEach, expect} from "@b9g/libuild/test";
import {createElement} from "../src/crank.js";
import {CrankHTMLElement} from "../src/web-components.js";
import type {AttributeProps} from "../src/web-components.js";

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
			static observedAttributes = ["count"] as const;
			render({count}: AttributeProps<typeof El>) {
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

	test("coalesced updates share a promise", () => {
		const name = tag("x-same");
		class El extends CrankHTMLElement {
			static shadow = null;
			render() {
				return null;
			}
		}

		customElements.define(name, El);
		const el = document.createElement(name) as El;
		document.body.appendChild(el);
		el.requestUpdate();
		const a = el.updateComplete;
		el.requestUpdate();
		expect(el.updateComplete).toBe(a);
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

	test("rejects with an unhandled render error, after the error event", async () => {
		const name = tag("x-throw");
		const order: Array<string> = [];
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
		el.addEventListener("error", () => order.push("event"));
		el.fail = true;
		el.requestUpdate();
		let error: unknown;
		await el.updateComplete.catch((err) => {
			order.push("rejection");
			error = err;
		});
		expect((error as Error).message).toBe("boom");
		expect(order).toEqual(["event", "rejection"]);
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
