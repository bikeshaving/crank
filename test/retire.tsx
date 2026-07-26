import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";
import {createElement, Context} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("retire");

test.before.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

const tick = () => new Promise((resolve) => setTimeout(resolve));

test("does not fire on the initial render", () => {
	const fn = Sinon.fake();
	function* Component(this: Context) {
		for ({} of this) {
			this.retire(fn);
			yield <div>hello</div>;
		}
	}

	renderer.render(<Component />, document.body);
	Assert.is(fn.callCount, 0);
	Assert.is(document.body.innerHTML, "<div>hello</div>");
});

test("fires when the render is retired by a refresh", () => {
	const calls: Array<string> = [];
	let refresh!: () => unknown;
	function* Component(this: Context) {
		refresh = () => this.refresh();
		let i = 0;
		for ({} of this) {
			this.retire(() => calls.push("retire"));
			i++;
			calls.push("render" + i);
			yield <div>{i}</div>;
		}
	}

	renderer.render(<Component />, document.body);
	Assert.equal(calls, ["render1"]);
	refresh();
	Assert.equal(calls, ["render1", "retire", "render2"]);
	refresh();
	Assert.equal(calls, ["render1", "retire", "render2", "retire", "render3"]);
});

test("fires on unmount", async () => {
	const fn = Sinon.fake();
	function* Component(this: Context) {
		for ({} of this) {
			this.retire(fn);
			yield <div />;
		}
	}

	renderer.render(<Component />, document.body);
	Assert.is(fn.callCount, 0);
	renderer.render(null, document.body);
	await tick();
	Assert.is(fn.callCount, 1);
});

test("fires once per registration", () => {
	const fn = Sinon.fake();
	let refresh!: () => unknown;
	function* Component(this: Context) {
		refresh = () => this.refresh();
		for ({} of this) {
			this.retire(fn);
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
			this.retire(() => {});
			renders++;
			yield <div />;
		}
	}

	renderer.render(<Component />, document.body);
	Assert.is(renders, 1);
	refresh();
	Assert.is(renders, 2);
});

test("aborts in-flight async work when re-rendered while suspended", async () => {
	let aborted = false;
	let release!: () => void;
	const inFlight = new Promise<void>((resolve) => (release = resolve));
	async function* Component(this: Context, {n}: {n: number}) {
		for await ({n} of this) {
			const controller = new AbortController();
			controller.signal.addEventListener("abort", () => (aborted = true));
			this.retire(() => controller.abort());
			yield <div>loading {n}</div>;
			await inFlight;
			yield <div>done {n}</div>;
		}
	}

	await renderer.render(<Component n={1} />, document.body);
	// The component is now suspended at `await inFlight` (work in flight).
	Assert.is(aborted, false);
	// Re-render with new props while the previous render is still in flight.
	renderer.render(<Component n={2} />, document.body);
	await tick();
	// retire() fired and aborted the in-flight work, without waiting for it.
	Assert.is(aborted, true);
	release();
});

test("the zero-arg form returns a promise that resolves when retired", async () => {
	let resolved = false;
	let refresh!: () => unknown;
	function* Component(this: Context, {n}: {n: number}) {
		refresh = () => this.refresh();
		let started = false;
		for ({n} of this) {
			if (!started) {
				started = true;
				this.retire().then(() => (resolved = true));
			}

			yield <span>{n}</span>;
		}
	}

	renderer.render(<Component n={1} />, document.body);
	await tick();
	Assert.is(resolved, false);
	refresh();
	await tick();
	Assert.is(resolved, true);
});

test.run();
