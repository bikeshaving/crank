import {describe, test, beforeEach, afterEach, expect} from "@b9g/libuild/test";
import * as Sinon from "sinon";
import {createElement, Context} from "../src/crank.js";
import {renderer} from "../src/dom.js";

describe("before", () => {
	beforeEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("does not fire on the initial render", () => {
		const fn = Sinon.fake();
		function* Component(this: Context) {
			for ({} of this) {
				this.before(fn);
				yield <div>hello</div>;
			}
		}

		renderer.render(<Component />, document.body);
		expect(fn.callCount).toBe(0);
		expect(document.body.innerHTML).toBe("<div>hello</div>");
	});

	test("fires on re-render, before the DOM is mutated", () => {
		const seen: Array<string> = [];
		let refresh!: () => unknown;
		let i = 0;
		function* Component(this: Context) {
			refresh = () => this.refresh();
			for ({} of this) {
				this.before(() => seen.push(document.body.innerHTML));
				yield <div>{i++}</div>;
			}
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<div>0</div>");
		refresh();
		// The callback ran while the DOM still held the previous render.
		expect(seen).toEqual(["<div>0</div>"]);
		expect(document.body.innerHTML).toBe("<div>1</div>");
		refresh();
		expect(seen).toEqual(["<div>0</div>", "<div>1</div>"]);
		expect(document.body.innerHTML).toBe("<div>2</div>");
	});

	test("receives the pre-mutation rendered value", () => {
		const values: Array<string> = [];
		let refresh!: () => unknown;
		let i = 0;
		function* Component(this: Context) {
			refresh = () => this.refresh();
			for ({} of this) {
				this.before((value: any) => values.push(value.outerHTML));
				yield <div>{i++}</div>;
			}
		}

		renderer.render(<Component />, document.body);
		refresh();
		expect(values).toEqual(["<div>0</div>"]);
	});

	test("fires once per registration, without accumulating", () => {
		const fn = Sinon.fake();
		let refresh!: () => unknown;
		function* Component(this: Context) {
			refresh = () => this.refresh();
			for ({} of this) {
				this.before(fn);
				yield <div />;
			}
		}

		renderer.render(<Component />, document.body);
		refresh();
		expect(fn.callCount).toBe(1);
		refresh();
		expect(fn.callCount).toBe(2);
		refresh();
		expect(fn.callCount).toBe(3);
	});

	test("discards a registration made during the initial render", () => {
		const fn = Sinon.fake();
		let refresh!: () => unknown;
		function* Component(this: Context) {
			refresh = () => this.refresh();
			// Registered before the loop, so it belongs to the initial render, whose
			// commit has no previous output to read. It is dropped, not deferred to
			// the next commit.
			this.before(fn);
			for ({} of this) {
				yield <div />;
			}
		}

		renderer.render(<Component />, document.body);
		refresh();
		expect(fn.callCount).toBe(0);
		refresh();
		expect(fn.callCount).toBe(0);
	});

	test("does not itself trigger a re-render", () => {
		let renders = 0;
		let refresh!: () => unknown;
		function* Component(this: Context) {
			refresh = () => this.refresh();
			for ({} of this) {
				renders++;
				this.before(() => {});
				yield <div />;
			}
		}

		renderer.render(<Component />, document.body);
		expect(renders).toBe(1);
		refresh();
		expect(renders).toBe(2);
	});

	test("captures a scroll offset which the commit would destroy", () => {
		let captured = -1;
		let refresh!: () => unknown;
		let count = 1;
		function* List(this: Context) {
			refresh = () => this.refresh();
			for ({} of this) {
				this.before((el: any) => (captured = el.scrollTop));
				yield (
					<div style="height: 50px; overflow: auto">
						{Array.from({length: count}, (_, i) => (
							<p style="height: 100px">item {i}</p>
						))}
					</div>
				);
			}
		}

		renderer.render(<List />, document.body);
		const el = document.body.firstChild as HTMLElement;
		el.scrollTop = 30;
		expect(el.scrollTop).toBe(30);
		count = 5;
		refresh();
		expect(captured).toBe(30);
	});

	test("captures the value of an uncontrolled input", () => {
		let captured = "";
		let refresh!: () => unknown;
		let label = "a";
		function* Form(this: Context) {
			refresh = () => this.refresh();
			for ({} of this) {
				this.before((el: any) => (captured = el.querySelector("input").value));
				yield (
					<div>
						<span>{label}</span>
						<input type="text" />
					</div>
				);
			}
		}

		renderer.render(<Form />, document.body);
		const input = document.querySelector("input") as HTMLInputElement;
		input.value = "typed by the user";
		label = "b";
		refresh();
		expect(captured).toBe("typed by the user");
	});

	test("fires in an async generator's for await loop", async () => {
		const seen: Array<string> = [];
		async function* Component(this: Context, {n}: {n: number}) {
			for await ({n} of this) {
				this.before(() => seen.push(document.body.innerHTML));
				yield <div>{n}</div>;
			}
		}

		await renderer.render(<Component n={1} />, document.body);
		expect(document.body.innerHTML).toBe("<div>1</div>");
		expect(seen).toEqual([]);
		await renderer.render(<Component n={2} />, document.body);
		expect(seen).toEqual(["<div>1</div>"]);
		expect(document.body.innerHTML).toBe("<div>2</div>");
	});

	test("fires when a parent re-render pushes new props down", () => {
		const seen: Array<string> = [];
		let refresh!: () => unknown;
		let n = 1;
		function* Child(this: Context, {n}: {n: number}) {
			for ({n} of this) {
				this.before(() => seen.push(document.body.innerHTML));
				yield <span>{n}</span>;
			}
		}

		function* Parent(this: Context) {
			refresh = () => this.refresh();
			for ({} of this) {
				yield <Child n={n} />;
			}
		}

		renderer.render(<Parent />, document.body);
		expect(document.body.innerHTML).toBe("<span>1</span>");
		n = 2;
		refresh();
		expect(seen).toEqual(["<span>1</span>"]);
		expect(document.body.innerHTML).toBe("<span>2</span>");
	});

	test("the value is only accurate during the call", () => {
		// The value is the live node, which the commit then mutates in place, so a
		// snapshot has to be read synchronously. This documents why before() has no
		// promise-returning form.
		let node: any = null;
		let readDuring = "";
		let refresh!: () => unknown;
		let i = 0;
		function* Component(this: Context) {
			refresh = () => this.refresh();
			for ({} of this) {
				this.before((value: any) => {
					node = value;
					readDuring = value.textContent;
				});
				yield <div>{i++}</div>;
			}
		}

		renderer.render(<Component />, document.body);
		refresh();
		expect(readDuring).toBe("0");
		// The same node now shows the new render.
		expect(node.textContent).toBe("1");
	});
});
