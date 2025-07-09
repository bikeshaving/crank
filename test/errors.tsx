import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";

import {createElement, Child, Context} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("errors");

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test("sync function throws", () => {
	function Thrower(): never {
		throw new Error("sync function throws");
	}

	try {
		renderer.render(<Thrower />, document.body);
		Assert.unreachable();
	} catch (err: any) {
		Assert.is(err.message, "sync function throws");
	}
});

test("async function throws", async () => {
	async function Thrower(): Promise<never> {
		throw new Error("async function throws");
	}

	try {
		await renderer.render(<Thrower />, document.body);
		Assert.unreachable();
	} catch (err: any) {
		Assert.is(err.message, "async function throws");
	}
});

test("sync generator throws", () => {
	function* Thrower(this: Context) {
		let i = 0;
		for ({} of this) {
			if (i >= 2) {
				throw new Error("sync generator throws");
			}

			yield i++;
		}
	}

	renderer.render(<Thrower />, document.body);
	Assert.is(document.body.innerHTML, "0");
	renderer.render(<Thrower />, document.body);
	Assert.is(document.body.innerHTML, "1");

	try {
		renderer.render(<Thrower />, document.body);
		Assert.unreachable();
	} catch (err: any) {
		Assert.is(err.message, "sync generator throws");
	}
});

test("async generator throws", async () => {
	async function* Thrower(this: Context) {
		let i = 0;
		for await ({} of this) {
			if (i >= 2) {
				throw new Error("async generator throws");
			}

			yield i++;
		}
	}

	await renderer.render(<Thrower />, document.body);
	Assert.is(document.body.innerHTML, "0");
	await renderer.render(<Thrower />, document.body);
	Assert.is(document.body.innerHTML, "1");
	try {
		await renderer.render(<Thrower />, document.body);
		Assert.unreachable();
	} catch (err: any) {
		Assert.is(err.message, "async generator throws");
	}
});

test("sync generator throws refresh call", () => {
	let ctx!: Context;
	function* Thrower(this: Context) {
		ctx = this;
		let i = 0;
		for ({} of this) {
			if (i >= 2) {
				throw new Error("sync generator throws by refresh");
			}

			yield i++;
		}
	}

	renderer.render(<Thrower />, document.body);
	Assert.is(document.body.innerHTML, "0");
	ctx.refresh();
	Assert.is(document.body.innerHTML, "1");
	try {
		ctx.refresh();
		Assert.unreachable();
	} catch (err: any) {
		Assert.is(err.message, "sync generator throws by refresh");
	}
});

test("sync generator throws by parent refresh", () => {
	function* Thrower(this: Context) {
		let i = 0;
		for ({} of this) {
			if (i >= 2) {
				throw new Error("sync generator throws by parent refresh");
			}

			yield i++;
		}
	}

	let ctx!: Context;
	function* Parent(this: Context) {
		ctx = this;
		for ({} of this) {
			yield (
				<div>
					<Thrower />
				</div>
			);
		}
	}

	renderer.render(<Parent />, document.body);
	Assert.is(document.body.innerHTML, "<div>0</div>");
	ctx.refresh();
	Assert.is(document.body.innerHTML, "<div>1</div>");
	try {
		ctx.refresh();
		Assert.unreachable();
	} catch (err: any) {
		Assert.is(err.message, "sync generator throws by parent refresh");
	}
});

test("async generator throws by parent sync generator refresh", async () => {
	async function* Thrower(this: Context) {
		let i = 0;
		for await ({} of this) {
			if (i >= 2) {
				throw new Error(
					"async generator throws by parent sync generator refresh",
				);
			}

			yield i++;
		}
	}

	let ctx!: Context;
	function* Parent(this: Context) {
		ctx = this;
		for ({} of this) {
			yield (
				<div>
					<Thrower />
				</div>
			);
		}
	}

	await renderer.render(<Parent />, document.body);
	Assert.is(document.body.innerHTML, "<div>0</div>");
	await ctx.refresh();
	Assert.is(document.body.innerHTML, "<div>1</div>");
	const mock = Sinon.fake();
	try {
		await ctx.refresh();
		Assert.unreachable();
	} catch (err: any) {
		Assert.is(
			err.message,
			"async generator throws by parent sync generator refresh",
		);
		mock();
	}

	Assert.is(mock.callCount, 1);
});

test("async generator throws by parent async generator refresh", async () => {
	async function* Thrower(this: Context) {
		let i = 0;
		for await ({} of this) {
			if (i >= 2) {
				throw new Error(
					"async generator throws by parent async generator refresh",
				);
			}

			yield i++;
		}
	}

	let parentCtx!: Context;
	async function* Parent(this: Context) {
		parentCtx = this;
		for await ({} of this) {
			yield (
				<div>
					<Thrower />
				</div>
			);
		}
	}

	await renderer.render(<Parent />, document.body);
	Assert.is(document.body.innerHTML, "<div>0</div>");
	await parentCtx.refresh();
	Assert.is(document.body.innerHTML, "<div>1</div>");
	const mock = Sinon.fake();
	try {
		await parentCtx.refresh();
		Assert.unreachable();
	} catch (err: any) {
		Assert.is(
			err.message,
			"async generator throws by parent async generator refresh",
		);
		mock();
	}

	Assert.is(mock.callCount, 1);
});

test("async generator throws independently", async () => {
	async function* Thrower(this: Context) {
		yield 1;
		yield 2;
		yield 3;
		await new Promise((resolve) => setTimeout(resolve));
		throw new Error("async generator throws independently");
	}

	const mock = Sinon.fake();
	try {
		window.addEventListener("unhandledrejection", (ev) => {
			if (ev.reason.message === "async generator throws independently") {
				ev.preventDefault();
				mock();
			}
		});

		await renderer.render(<Thrower />, document.body);
		await new Promise((resolve) => setTimeout(resolve, 20));
		Assert.is(document.body.innerHTML, "3");
		Assert.is(mock.callCount, 1);
	} finally {
		window.removeEventListener("unhandledrejection", mock);
	}
});

test("async generator rethrows child error", async () => {
	const mock = Sinon.fake();
	async function Thrower(this: Context) {
		throw new Error("async generator rethrows child error");
	}

	async function* Component(this: Context) {
		try {
			for await (const _ of this) {
				yield <Thrower />;
			}
		} catch (err) {
			mock();
			throw err;
		}
	}

	try {
		await renderer.render(<Component />, document.body);
		Assert.unreachable();
	} catch (err: any) {
		Assert.is(err.message, "async generator rethrows child error");
	}
});

test("async generator throws in async generator", async () => {
	const mock = Sinon.fake();
	/* eslint-disable require-yield */
	async function* Thrower() {
		throw new Error("async generator throws in async generator");
	}
	/* eslint-enable require-yield */

	async function* Component(this: Context) {
		try {
			for await (const _ of this) {
				yield <Thrower />;
			}
		} catch (err) {
			mock();
			throw err;
		}
	}

	try {
		await renderer.render(<Component />, document.body);
		Assert.unreachable();
	} catch (err: any) {
		Assert.is(err.message, "async generator throws in async generator");
	}

	Assert.is(mock.callCount, 1);
});

test("async generator throws in async generator after yield", async () => {
	const mock = Sinon.fake();
	async function* Thrower(this: Context) {
		yield 1;
		for await ({} of this) {
			throw new Error("async generator throws in async generator after yield");
		}
	}

	async function* Component(this: Context) {
		try {
			for await ({} of this) {
				yield <Thrower />;
			}
		} catch (err) {
			mock();
			throw err;
		}
	}

	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "1");
	try {
		await renderer.render(<Component />, document.body);
		Assert.unreachable();
	} catch (err: any) {
		Assert.is(
			err.message,
			"async generator throws in async generator after yield",
		);
		mock();
	}

	Assert.is(mock.callCount, 2);
});

test("sync function throws, sync generator catches", () => {
	function Thrower(): never {
		throw new Error("sync function throws, sync generator catches");
	}

	function* Component(): Generator<Child> {
		try {
			yield <Thrower />;
		} catch (err) {
			return <span>Error</span>;
		}
	}

	renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<span>Error</span>");
});

test("nested sync functions", () => {
	function Thrower(): never {
		throw new Error("nested sync functions");
	}

	function PassThrough() {
		return <Thrower />;
	}

	function* Component(): Generator<Child> {
		try {
			yield <PassThrough />;
		} catch (err) {
			return <span>Error</span>;
		}
	}

	renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<span>Error</span>");
});

test("nested generator function throws with refresh", async () => {
	let throwerCtx!: Context;
	function* Thrower(this: Context): Generator<Child> {
		throwerCtx = this;
		yield <div>Hello</div>;
		throw new Error("nested generator function throws with refresh");
	}

	function PassThrough() {
		return <Thrower />;
	}

	function* Component(): Generator<Child> {
		while (true) {
			try {
				yield <PassThrough />;
			} catch (err) {
				return <span>Error</span>;
			}
		}
	}

	renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello</div>");

	const mock = Sinon.fake();
	try {
		await throwerCtx.refresh();
		Assert.is(document.body.innerHTML, "<span>Error</span>");
	} catch (err: any) {
		Assert.is(err.message, "nested generator function throws with refresh");
		mock();
	}

	Assert.is(mock.callCount, 1);
});

test("async function throws, sync generator catches", async () => {
	async function Thrower(): Promise<never> {
		throw new Error("async function throws, sync generator catches");
	}

	function* Component(): Generator<Child> {
		try {
			yield <Thrower />;
		} catch (err) {
			return <span>Error</span>;
		}
	}

	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>Error</span></div>");
	await new Promise((resolve) => setTimeout(resolve, 20));
	Assert.is(document.body.innerHTML, "<div><span>Error</span></div>");
});

test("restart", () => {
	const err = new Error("restart");
	function* Thrower() {
		yield 1;
		yield 2;
		yield 3;
		throw err;
	}

	const mock = Sinon.fake();
	function* Component(this: Context) {
		while (true) {
			try {
				yield (
					<div>
						<Thrower />
					</div>
				);
			} catch (err) {
				mock(err);
				yield <div>Restarting</div>;
			}
		}
	}

	renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>1</div>");
	renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>2</div>");
	renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>3</div>");
	renderer.render(<Component />, document.body);
	Assert.is(mock.callCount, 1);
	Assert.is(mock.lastCall.args[0], err);
	Assert.is(document.body.innerHTML, "<div>Restarting</div>");
	renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>1</div>");
});

test("async gen causes unhandled rejection", async () => {
	async function One() {
		await new Promise((r) => setTimeout(r, 100));
		return <div>Hello</div>;
	}

	async function Two() {
		await new Promise((r) => setTimeout(r, 200));
		throw new Error("async gen causes unhandled rejection");
	}

	async function* Loader(this: Context) {
		for await ({} of this) {
			yield <One />;
			yield <Two />;
		}
	}

	await renderer.render(<Loader />, document.body);
	window.addEventListener("unhandledrejection", (ev) => {
		if (ev.reason.message === "async gen causes unhandled rejection") {
			resolve(ev.reason);
			ev.preventDefault();
		}
	});

	let resolve: any;
	const p = new Promise<any>((r) => (resolve = r));
	const err = await p;
	Assert.is(err.message, "async gen causes unhandled rejection");
});

// TODO:
test.skip("refresh throws and is caught by parent", () => {
	const err = new Error("refresh throws and is caught by parent");
	let throwerCtx!: Context;
	function* Thrower(this: Context) {
		throwerCtx = this;
		yield 1;
		throw err;
	}

	function* Parent(this: Context) {
		for ({} of this) {
			try {
				yield (
					<div>
						<Thrower />
					</div>
				);
			} catch (err) {
				return <span>Error</span>;
			}
		}
	}

	renderer.render(<Parent />, document.body);
	Assert.is(document.body.innerHTML, "<div>1</div>");
	// TODO: Should throwerCtx.refresh() throw an error if it is caught by a parent component?
	try {
		throwerCtx.refresh();
	} catch (err) {
		Assert.unreachable(
			"Refresh should not throw an error if caught by a parent",
		);
	}
	Assert.is(document.body.innerHTML, "<span>Error</span>");
});

test.run();
