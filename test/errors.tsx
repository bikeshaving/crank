import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";

import {createElement, Child, Context} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("errors");
test.before.each(() => {
	document.body.innerHTML = "";
});

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

test("sync gen throws", () => {
	function* Thrower(this: Context) {
		let i = 0;
		for ({} of this) {
			if (i >= 2) {
				throw new Error("sync gen throws");
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
		Assert.is(err.message, "sync gen throws");
	}
});

test("async gen throws", async () => {
	async function* Thrower(this: Context) {
		let i = 0;
		for await ({} of this) {
			if (i >= 2) {
				throw new Error("async gen throws");
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
		Assert.is(err.message, "async gen throws");
	}
});

test("sync gen throws refresh call", () => {
	let ctx!: Context;
	function* Thrower(this: Context) {
		ctx = this;
		let i = 0;
		for ({} of this) {
			if (i >= 2) {
				throw new Error("sync gen throws by refresh");
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
		Assert.is(err.message, "sync gen throws by refresh");
	}
});

test("sync gen throws by parent refresh", () => {
	function* Thrower(this: Context) {
		let i = 0;
		for ({} of this) {
			if (i >= 2) {
				throw new Error("sync gen throws by parent refresh");
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
		Assert.is(err.message, "sync gen throws by parent refresh");
	}
});

test("async gen throws by parent sync gen refresh", async () => {
	async function* Thrower(this: Context) {
		let i = 0;
		for await ({} of this) {
			if (i >= 2) {
				throw new Error("async gen throws by parent sync gen refresh");
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
		Assert.is(err.message, "async gen throws by parent sync gen refresh");
		mock();
	}

	Assert.is(mock.callCount, 1);
});

test("for await of throws in for await of", async () => {
	/* eslint-disable require-yield */
	async function* Thrower(this: Context) {
		for await ({} of this) {
			throw new Error("for await of throws in for await of");
		}
	}

	async function* Parent(this: Context) {
		for await ({} of this) {
			yield (
				<div>
					<Thrower />
				</div>
			);
		}
	}

	try {
		await renderer.render(<Parent />, document.body);
		Assert.unreachable();
	} catch (err: any) {
		Assert.is(err.message, "for await of throws in for await of");
	}

	Assert.is(document.body.innerHTML, "");
});

test("async gen throws by parent async gen refresh", async () => {
	async function* Thrower(this: Context) {
		let i = 0;
		for await ({} of this) {
			if (i >= 2) {
				throw new Error("async gen throws by parent async gen refresh");
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
		Assert.is(err.message, "async gen throws by parent async gen refresh");
		mock();
	}

	Assert.is(mock.callCount, 1);
});

test("async gen returns after child throws", async () => {
	async function Thrower(this: Context) {
		throw new Error("async gen returns after child throws");
	}

	async function* Component(this: Context) {
		try {
			for await ({} of this) {
				yield <Thrower />;
			}
		} catch (err: any) {
			return <span>{err.message}</span>;
		}
	}

	await renderer.render(<Component />, document.body);
	Assert.is(
		document.body.innerHTML,
		"<span>async gen returns after child throws</span>",
	);
});

test("async gen throws independently", async () => {
	async function* Thrower(this: Context) {
		yield 1;
		yield 2;
		yield 3;
		await new Promise((resolve) => setTimeout(resolve));
		throw new Error("async gen throws independently");
	}

	let resolve: (err: Error) => void;
	const err = new Promise<Error>((resolve1) => {
		resolve = resolve1;
	});
	const handler = (ev: PromiseRejectionEvent) => {
		if (ev.reason.message === "async gen throws independently") {
			ev.preventDefault();
			resolve(ev.reason);
		}
	};
	try {
		window.addEventListener("unhandledrejection", handler);

		await renderer.render(<Thrower />, document.body);
		await new Promise((resolve) => setTimeout(resolve, 100));
		Assert.is(document.body.innerHTML, "3");
		Assert.is((await err).message, "async gen throws independently");
	} finally {
		window.removeEventListener("unhandledrejection", handler);
	}
});

test("async gen rethrows after child error", async () => {
	const mock = Sinon.fake();
	async function Thrower(this: Context) {
		throw new Error("async gen rethrows after child error");
	}

	async function* Component(this: Context) {
		try {
			for await (const _ of this) {
				yield <Thrower />;
			}
		} catch (err) {
			mock();
			throw new Error("async gen rethrows after child error 1");
		}
	}

	try {
		await renderer.render(<Component />, document.body);
		Assert.unreachable();
	} catch (err: any) {
		Assert.is(err.message, "async gen rethrows after child error 1");
	}

	Assert.is(mock.callCount, 1);
});

test("async gen rethrows after child error in async gen", async () => {
	const mock = Sinon.fake();
	/* eslint-disable require-yield */
	async function* Thrower() {
		throw new Error("async gen rethrows after child error in async gen");
	}
	/* eslint-enable require-yield */

	async function* Component(this: Context) {
		try {
			for await (const _ of this) {
				yield <Thrower />;
			}
		} catch (err) {
			mock();
			throw new Error("async gen rethrows after child error in async gen 1");
		}
	}

	try {
		await renderer.render(<Component />, document.body);
		Assert.unreachable();
	} catch (err: any) {
		Assert.is(
			err.message,
			"async gen rethrows after child error in async gen 1",
		);
	}

	Assert.is(mock.callCount, 1);
});

test("async gen throws in async gen after yield", async () => {
	const mock = Sinon.fake();
	async function* Thrower(this: Context) {
		yield 1;
		for await ({} of this) {
			throw new Error("async gen throws in async gen after yield");
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
		Assert.is(err.message, "async gen throws in async gen after yield");
		mock();
	}

	Assert.is(mock.callCount, 2);
});

test("sync function throws, sync gen catches", () => {
	function Thrower(): never {
		throw new Error("sync function throws, sync gen catches");
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

test("async function throws, sync gen catches", async () => {
	async function Thrower(): Promise<never> {
		throw new Error("async function throws, sync gen catches");
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

test("nested gen function throws with refresh can be caught by parent", () => {
	let throwerCtx!: Context;
	function* Thrower(this: Context): Generator<Child> {
		throwerCtx = this;
		yield <div>Hello</div>;
		throw new Error(
			"nested gen function throws with refresh can be caught by parent",
		);
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

	throwerCtx.refresh();
	Assert.is(document.body.innerHTML, "<span>Error</span>");
});

test("nested async gen function throws with refresh can be caught by parent", async () => {
	let throwerCtx!: Context;
	async function* Thrower(this: Context): AsyncGenerator<Child> {
		throwerCtx = this;
		yield <div>Hello</div>;
		for await ({} of this) {
			throw new Error(
				"nested async gen function throws with refresh can be caught by parent",
			);
		}
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

	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello</div>");

	await throwerCtx.refresh();
	Assert.is(document.body.innerHTML, "<span>Error</span>");
});

test("nested async gen function throws independently", async () => {
	async function* Thrower(this: Context): AsyncGenerator<Child> {
		for await ({} of this) {
			yield <div>Hello</div>;
			throw new Error("nested async gen function throws independently");
		}
	}

	const mock = Sinon.fake();
	const onUnhandledRejection = (ev: PromiseRejectionEvent) => {
		if (
			ev.reason.message === "nested async gen function throws independently"
		) {
			ev.preventDefault();
			mock();
		}
	};
	try {
		window.addEventListener("unhandledrejection", onUnhandledRejection);
		await renderer.render(<Thrower />, document.body);

		Assert.is(document.body.innerHTML, "<div>Hello</div>");
		await new Promise((resolve) => setTimeout(resolve, 100));
		Assert.is(mock.callCount, 1);
	} finally {
		window.removeEventListener("unhandledrejection", onUnhandledRejection);
	}
});

test("nested async gen throws independently can be caught by parent", async () => {
	async function* Thrower(this: Context): AsyncGenerator<Child> {
		for await ({} of this) {
			yield <div>Hello</div>;
			throw new Error(
				"nested async gen throws independently can be caught by parent",
			);
		}
	}

	function PassThrough() {
		return <Thrower />;
	}

	const mock = Sinon.fake();
	function* Component(this: Context): Generator<Child> {
		for ({} of this) {
			try {
				yield <PassThrough />;
			} catch (err) {
				mock();
				return <span>Error</span>;
			}
		}
	}

	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<span>Error</span>");
	Assert.is(mock.callCount, 1);
});

test.run();
