import {describe, test, beforeEach, afterEach, expect} from "@b9g/libuild/test";
import * as Sinon from "sinon";
import {createElement, Context} from "../src/crank.js";
import {renderer} from "../src/dom.js";

describe("interrupt", () => {
	beforeEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	const tick = () => new Promise((resolve) => setTimeout(resolve));

	function deferred(): [Promise<void>, () => void] {
		let release!: () => void;
		const promise = new Promise<void>((resolve) => (release = resolve));
		return [promise, release];
	}

	test("does not fire when the render commits", () => {
		const fn = Sinon.fake();
		let refresh!: () => unknown;
		function* Component(this: Context) {
			refresh = () => this.refresh();
			for ({} of this) {
				this.interrupt(fn);
				yield <div>hello</div>;
			}
		}

		renderer.render(<Component />, document.body);
		expect(fn.callCount).toBe(0);
		refresh();
		refresh();
		expect(fn.callCount).toBe(0);
		expect(document.body.innerHTML).toBe("<div>hello</div>");
	});

	test("does not fire on unmount when the render committed", async () => {
		const fn = Sinon.fake();
		function* Component(this: Context) {
			for ({} of this) {
				this.interrupt(fn);
				yield <div />;
			}
		}

		renderer.render(<Component />, document.body);
		renderer.render(null, document.body);
		await tick();
		expect(fn.callCount).toBe(0);
	});

	test("fires when a render is superseded before it commits", async () => {
		const fn = Sinon.fake();
		const [inFlight, release] = deferred();
		async function Component(this: Context, {n}: {n: number}) {
			this.interrupt(fn);
			if (n === 1) {
				await inFlight;
			}

			return <div>{n}</div>;
		}

		renderer.render(<Component n={1} />, document.body);
		await tick();
		expect(fn.callCount).toBe(0);
		renderer.render(<Component n={2} />, document.body);
		await tick();
		expect(fn.callCount).toBe(1);
		release();
	});

	test("fires when the component unmounts with a render in flight", async () => {
		const fn = Sinon.fake();
		const [inFlight, release] = deferred();
		async function Component(this: Context) {
			this.interrupt(fn);
			await inFlight;
			return <div />;
		}

		renderer.render(<Component />, document.body);
		await tick();
		expect(fn.callCount).toBe(0);
		renderer.render(null, document.body);
		await tick();
		expect(fn.callCount).toBe(1);
		release();
	});

	test("fires at most once per registration", async () => {
		const fn = Sinon.fake();
		const [inFlight, release] = deferred();
		async function Component(this: Context, {n}: {n: number}) {
			if (n === 1) {
				this.interrupt(fn);
				await inFlight;
			}

			return <div>{n}</div>;
		}

		renderer.render(<Component n={1} />, document.body);
		await tick();
		renderer.render(<Component n={2} />, document.body);
		await tick();
		expect(fn.callCount).toBe(1);
		renderer.render(<Component n={3} />, document.body);
		await tick();
		expect(fn.callCount).toBe(1);
		release();
	});

	test("does not itself trigger a re-render", async () => {
		let renders = 0;
		const [inFlight, release] = deferred();
		async function Component(this: Context, {n}: {n: number}) {
			renders++;
			this.interrupt(() => {});
			if (n === 1) {
				await inFlight;
			}

			return <div>{n}</div>;
		}

		renderer.render(<Component n={1} />, document.body);
		await tick();
		expect(renders).toBe(1);
		const rendered = renderer.render(<Component n={2} />, document.body);
		await tick();
		release();
		await rendered;
		await tick();
		expect(renders).toBe(2);
	});

	test("aborts in-flight async work when re-rendered while suspended", async () => {
		let aborted = false;
		const [inFlight, release] = deferred();
		async function* Component(this: Context, {n}: {n: number}) {
			for await ({n} of this) {
				yield <div>loading {n}</div>;
				const controller = new AbortController();
				controller.signal.addEventListener("abort", () => (aborted = true));
				this.interrupt(() => controller.abort());
				await inFlight;
				yield <div>done {n}</div>;
			}
		}

		await renderer.render(<Component n={1} />, document.body);
		// The component is now suspended at `await inFlight` (work in flight).
		expect(aborted).toBe(false);
		// Re-render with new props while the previous render is still in flight.
		renderer.render(<Component n={2} />, document.body);
		await tick();
		// interrupt() fired and aborted the in-flight work, without waiting for it.
		expect(aborted).toBe(true);
		release();
	});

	test("the zero-arg form returns a promise that resolves on interrupt", async () => {
		let resolved = false;
		const [inFlight, release] = deferred();
		async function Component(this: Context, {n}: {n: number}) {
			if (n === 1) {
				this.interrupt().then(() => (resolved = true));
				await inFlight;
			}

			return <span>{n}</span>;
		}

		renderer.render(<Component n={1} />, document.body);
		await tick();
		expect(resolved).toBe(false);
		renderer.render(<Component n={2} />, document.body);
		await tick();
		expect(resolved).toBe(true);
		release();
	});
});
