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
	const err = new Error("sync function throws");
	function Thrower(): never {
		throw err;
	}

	try {
		renderer.render(<Thrower />, document.body);
		Assert.unreachable();
	} catch (err1) {
		Assert.is(err, err1);
	}
});

test("async function throws", async () => {
	const err = new Error("async function throws");

	async function Thrower(): Promise<never> {
		throw err;
	}

	try {
		await renderer.render(<Thrower />, document.body);
		Assert.unreachable();
	} catch (err1) {
		Assert.is(err, err1);
	}
});

test("sync generator throws", () => {
	const err = new Error("sync generator throws");
	function* Thrower() {
		yield 1;
		yield 2;
		throw err;
	}

	renderer.render(<Thrower />, document.body);
	Assert.is(document.body.innerHTML, "1");
	renderer.render(<Thrower />, document.body);
	Assert.is(document.body.innerHTML, "2");

	try {
		renderer.render(<Thrower />, document.body);
		Assert.unreachable();
	} catch (err1) {
		Assert.is(err, err1);
	}
});

test("async generator throws", async () => {
	const err = new Error("async generator throws");
	async function* Thrower(this: Context) {
		let i = 1;
		for await (const _ of this) {
			if (i > 3) {
				throw err;
			}
			yield i++;
		}
	}

	await renderer.render(<Thrower />, document.body);
	await renderer.render(<Thrower />, document.body);
	await renderer.render(<Thrower />, document.body);
	try {
		await renderer.render(<Thrower />, document.body);
		Assert.unreachable();
	} catch (err1) {
		Assert.is(err, err1);
	}
});

test("sync generator throws independently", () => {
	const err = new Error("sync generator throws independently");
	let ctx!: Context;
	function* Thrower(this: Context) {
		ctx = this;
		yield 1;
		yield 2;
		yield 3;
		throw err;
	}

	const mock = Sinon.fake();
	function* Component(this: Context) {
		try {
			while (true) {
				yield (
					<div>
						<Thrower />
					</div>
				);
			}
		} catch (err) {
			mock(err);
			throw err;
		}
	}

	renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>1</div>");
	ctx.refresh();
	ctx.refresh();
	Assert.is(document.body.innerHTML, "<div>3</div>");
	try {
		ctx.refresh();
	} catch (err1) {
		Assert.is(err, err1);
	}

	Assert.is(mock.callCount, 1);
	Assert.is(mock.lastCall.args[0], err);
});

// TODO: figure out how to test for an unhandled promise rejection
// When run this test should fail rather than timing out.
test.skip("async generator throws independently", async () => {
	const err = new Error("async generator throws independently");
	async function* Thrower(this: Context) {
		yield 1;
		yield 2;
		yield 3;
		throw err;
	}

	await renderer.render(<Thrower />, document.body);
	await new Promise(() => {});
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

// TODO: figure out why this test causes an unhandled rejection
// eslint-disable-next-line
test("async generator throws in async generator after yield", async () => {
	const mock = Sinon.fake();
	const err = new Error(
		"async generator throws in async generator after yield",
	);
	async function* Thrower(this: Context) {
		yield 1;
		for await (const _ of this) {
			throw err;
		}
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

	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "1");
	try {
		await renderer.render(<Component />, document.body);
		Assert.unreachable();
	} catch (err1) {
		Assert.is(err, err1);
	}

	Assert.is(mock.callCount, 1);
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

test("nested functions throw independently", () => {
	let ctx!: Context;
	function* Thrower(this: Context): Generator<Child> {
		ctx = this;
		yield <div>Hello</div>;
		throw new Error("nested functions throw independently");
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
	ctx.refresh();
	Assert.is(document.body.innerHTML, "<span>Error</span>");
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

test.run();
