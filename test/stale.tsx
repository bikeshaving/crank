import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";
import {createElement, Context} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("stale");

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
			this.stale(fn);
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
			this.stale(() => calls.push("stale"));
			i++;
			calls.push("render" + i);
			yield <div>{i}</div>;
		}
	}

	renderer.render(<Component />, document.body);
	Assert.equal(calls, ["render1"]);
	refresh();
	Assert.equal(calls, ["render1", "stale", "render2"]);
	refresh();
	Assert.equal(calls, ["render1", "stale", "render2", "stale", "render3"]);
});

test("fires once per registration", () => {
	const fn = Sinon.fake();
	let refresh!: () => unknown;
	function* Component(this: Context) {
		refresh = () => this.refresh();
		for ({} of this) {
			this.stale(fn);
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
			this.stale(() => {});
			renders++;
			yield <div />;
		}
	}

	renderer.render(<Component />, document.body);
	Assert.is(renders, 1);
	refresh();
	Assert.is(renders, 2);
});

// --- the unification: retirement covers unmount too ---

test("fires on unmount, with an undefined successor", async () => {
	let fired = false;
	let successorValue: unknown = "unset";
	function* Component(this: Context) {
		for ({} of this) {
			this.stale((successor) => {
				fired = true;
				successor.then((v) => (successorValue = v));
			});
			yield <div />;
		}
	}

	renderer.render(<Component />, document.body);
	Assert.is(fired, false);
	renderer.render(null, document.body);
	await tick();
	Assert.is(fired, true);
	Assert.is(successorValue, undefined);
});

// --- the successor promise carries the next render's result ---

test("the successor promise resolves with the next render's result", async () => {
	let resolved: unknown = "pending";
	let refresh!: () => unknown;
	function* Component(this: Context) {
		refresh = () => this.refresh();
		let i = 0;
		for ({} of this) {
			i++;
			if (i === 1) {
				this.stale((successor) => successor.then((v) => (resolved = v)));
			}
			yield <span>{i}</span>;
		}
	}

	renderer.render(<Component />, document.body);
	await tick();
	Assert.is(resolved, "pending");
	refresh();
	await tick();
	Assert.ok(resolved instanceof HTMLElement);
	Assert.is((resolved as HTMLElement).outerHTML, "<span>2</span>");
});

test("the zero-arg form returns the successor promise", async () => {
	let value: unknown = "pending";
	let refresh!: () => unknown;
	function* Component(this: Context, {n}: {n: number}) {
		refresh = () => this.refresh();
		let started = false;
		for ({n} of this) {
			if (!started) {
				started = true;
				this.stale().then((v) => (value = v));
			}

			yield <span>{n}</span>;
		}
	}

	renderer.render(<Component n={1} />, document.body);
	await tick();
	Assert.is(value, "pending");
	refresh();
	await tick();
	Assert.ok(value instanceof HTMLElement);
});

// --- THE crux: does the pre-emptive fire actually cancel in-flight async work? ---

test("aborts in-flight async work when re-rendered while suspended", async () => {
	let aborted = false;
	let release!: () => void;
	const inFlight = new Promise<void>((resolve) => (release = resolve));
	async function* Component(this: Context, {n}: {n: number}) {
		for await ({n} of this) {
			const controller = new AbortController();
			controller.signal.addEventListener("abort", () => (aborted = true));
			this.stale(() => controller.abort());
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
	// Did stale() fire and abort the in-flight work, without waiting for it?
	Assert.is(aborted, true);
	release();
});

test.run();
