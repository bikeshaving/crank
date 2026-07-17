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

test("fires before a re-render via refresh, in order", () => {
	const calls: Array<string> = [];
	let refresh!: () => unknown;
	function* Component(this: Context) {
		refresh = () => this.refresh();
		let i = 0;
		for ({} of this) {
			this.before(() => calls.push("before"));
			i++;
			calls.push("render" + i);
			yield <div>{i}</div>;
		}
	}

	renderer.render(<Component />, document.body);
	Assert.equal(calls, ["render1"]);
	refresh();
	Assert.equal(calls, ["render1", "before", "render2"]);
	refresh();
	Assert.equal(calls, ["render1", "before", "render2", "before", "render3"]);
});

test("fires before a re-render driven by a prop change", () => {
	const calls: Array<string> = [];
	function* Child(this: Context, {n}: {n: number}) {
		for ({n} of this) {
			this.before(() => calls.push("before"));
			calls.push("child" + n);
			yield <span>{n}</span>;
		}
	}

	function App({n}: {n: number}) {
		return <Child n={n} />;
	}

	renderer.render(<App n={1} />, document.body);
	Assert.equal(calls, ["child1"]);
	renderer.render(<App n={2} />, document.body);
	Assert.equal(calls, ["child1", "before", "child2"]);
});

test("fires once per registration", () => {
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
});

test("does not itself trigger a re-render", () => {
	let renders = 0;
	let refresh!: () => unknown;
	function* Component(this: Context) {
		refresh = () => this.refresh();
		for ({} of this) {
			this.before(() => {});
			renders++;
			yield <div />;
		}
	}

	renderer.render(<Component />, document.body);
	Assert.is(renders, 1);
	refresh();
	Assert.is(renders, 2);
});

test("can abort in-flight work on re-render (AbortController)", () => {
	let controller!: AbortController;
	let firstSignal!: AbortSignal;
	let refresh!: () => unknown;
	function* Component(this: Context) {
		refresh = () => this.refresh();
		controller = new AbortController();
		let first = true;
		for ({} of this) {
			this.before(() => {
				controller.abort();
				controller = new AbortController();
			});
			if (first) {
				firstSignal = controller.signal;
				first = false;
			}

			yield <div />;
		}
	}

	renderer.render(<Component />, document.body);
	Assert.is(firstSignal.aborted, false);
	refresh();
	Assert.is(firstSignal.aborted, true);
});

test("fires before re-render for async generators (for await)", async () => {
	const calls: Array<string> = [];
	async function* Child(this: Context, {n}: {n: number}) {
		for await ({n} of this) {
			this.before(() => calls.push("before" + n));
			calls.push("child" + n);
			yield <span>{n}</span>;
		}
	}

	await renderer.render(<Child n={1} />, document.body);
	Assert.equal(calls, ["child1"]);
	await renderer.render(<Child n={2} />, document.body);
	Assert.equal(calls, ["child1", "before1", "child2"]);
});

test("the zero-arg form returns a promise that resolves before the next re-render", async () => {
	let resolved = false;
	let value: unknown = "unset";
	function* Component(this: Context, {n}: {n: number}) {
		let started = false;
		for ({n} of this) {
			if (!started) {
				started = true;
				this.before().then((v) => {
					resolved = true;
					value = v;
				});
			}

			yield <span>{n}</span>;
		}
	}

	renderer.render(<Component n={1} />, document.body);
	await new Promise((resolve) => setTimeout(resolve));
	// No re-render has happened, so the promise is still pending.
	Assert.is(resolved, false);

	renderer.render(<Component n={2} />, document.body);
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(resolved, true);
	Assert.is(value, undefined);
});

test.run();
