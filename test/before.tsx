import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";
import {createElement, Context} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("before");

test.before.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test.after.each(() => {
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
	Assert.is(fn.callCount, 0);
	Assert.is(document.body.innerHTML, "<div>hello</div>");
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
	Assert.is(document.body.innerHTML, "<div>0</div>");
	refresh();
	// The callback ran while the DOM still held the previous render.
	Assert.equal(seen, ["<div>0</div>"]);
	Assert.is(document.body.innerHTML, "<div>1</div>");
	refresh();
	Assert.equal(seen, ["<div>0</div>", "<div>1</div>"]);
	Assert.is(document.body.innerHTML, "<div>2</div>");
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
	Assert.equal(values, ["<div>0</div>"]);
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
	Assert.is(fn.callCount, 1);
	refresh();
	Assert.is(fn.callCount, 2);
	refresh();
	Assert.is(fn.callCount, 3);
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
	Assert.is(fn.callCount, 0);
	refresh();
	Assert.is(fn.callCount, 0);
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
	Assert.is(renders, 1);
	refresh();
	Assert.is(renders, 2);
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
	Assert.is(el.scrollTop, 30);
	count = 5;
	refresh();
	Assert.is(captured, 30);
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
	Assert.is(captured, "typed by the user");
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
	Assert.is(document.body.innerHTML, "<div>1</div>");
	Assert.equal(seen, []);
	await renderer.render(<Component n={2} />, document.body);
	Assert.equal(seen, ["<div>1</div>"]);
	Assert.is(document.body.innerHTML, "<div>2</div>");
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
	Assert.is(document.body.innerHTML, "<span>1</span>");
	n = 2;
	refresh();
	Assert.equal(seen, ["<span>1</span>"]);
	Assert.is(document.body.innerHTML, "<span>2</span>");
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
	Assert.is(readDuring, "0");
	// The same node now shows the new render.
	Assert.is(node.textContent, "1");
});

test.run();
