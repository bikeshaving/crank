import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";

import {createElement, Context, Element, Fragment} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("cleanup");

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test("function", () => {
	const fn = Sinon.fake();
	function Component(this: Context): Element {
		this.cleanup(fn);
		return <span>Hello</span>;
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
	Assert.is(fn.callCount, 0);
	const span = document.body.firstChild!.firstChild;

	renderer.render(<div />, document.body);
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], span);
});

test("generator", () => {
	const fn = Sinon.fake();
	function* Component(this: Context): Generator<Element> {
		this.cleanup(fn);
		while (true) {
			yield <span>Hello</span>;
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
	Assert.is(fn.callCount, 0);
	const span = document.body.firstChild!.firstChild;

	renderer.render(<div />, document.body);
	Assert.is(document.body.innerHTML, "<div></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], span);
});

test("async function", async () => {
	const fn = Sinon.fake();
	async function Component(this: Context): Promise<Element> {
		this.cleanup(fn);
		await new Promise((resolve) => setTimeout(resolve, 1));
		return <span>Hello</span>;
	}

	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
	Assert.is(fn.callCount, 0);
	const span = document.body.firstChild!.firstChild;

	await renderer.render(<div />, document.body);
	Assert.is(document.body.innerHTML, "<div></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], span);
});

test("async generator", async () => {
	const fn = Sinon.fake();
	async function* Component(this: Context): AsyncGenerator<Element> {
		this.cleanup(fn);
		for await (const _ of this) {
			await new Promise((resolve) => setTimeout(resolve, 1));
			yield <span>Hello</span>;
		}
	}

	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
	Assert.is(fn.callCount, 0);
	const span = document.body.firstChild!.firstChild;

	await renderer.render(<div />, document.body);
	// TODO: why is this setTimeout necessary???
	await new Promise((resolve) => setTimeout(resolve, 0));
	Assert.is(document.body.innerHTML, "<div></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], span);
});

test("multiple calls, same fn", () => {
	const fn = Sinon.fake();
	function* Component(this: Context): Generator<Element> {
		this.cleanup(fn);
		while (true) {
			yield <span>Hello</span>;
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
	Assert.is(fn.callCount, 0);
	const span = document.body.firstChild!.firstChild;

	renderer.render(<div />, document.body);
	Assert.is(document.body.innerHTML, "<div></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], span);
});

test("multiple calls, different fns", () => {
	const fn1 = Sinon.fake();
	const fn2 = Sinon.fake();
	function* Component(this: Context): Generator<Element> {
		this.cleanup(fn1);
		this.cleanup(fn2);
		while (true) {
			yield <span>Hello</span>;
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
	Assert.is(fn1.callCount, 0);
	Assert.is(fn2.callCount, 0);
	const span = document.body.firstChild!.firstChild;

	renderer.render(<div />, document.body);
	Assert.is(document.body.innerHTML, "<div></div>");
	Assert.is(fn1.callCount, 1);
	Assert.is(fn2.callCount, 1);
	Assert.is(fn1.lastCall.args[0], span);
	Assert.is(fn2.lastCall.args[0], span);
});

test("multiple calls across updates", () => {
	const fn1 = Sinon.fake();
	const fn2 = Sinon.fake();
	function* Component(this: Context): Generator<Element> {
		let i = 0;
		while (true) {
			this.cleanup(fn1);
			this.cleanup(fn2);
			yield <span>{i++}</span>;
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>0</span></div>");
	Assert.is(fn1.callCount, 0);
	Assert.is(fn2.callCount, 0);
	const span = document.body.firstChild!.firstChild;

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	Assert.is(fn1.callCount, 0);
	Assert.is(fn2.callCount, 0);
	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>2</span></div>");
	Assert.is(fn1.callCount, 0);
	Assert.is(fn2.callCount, 0);
	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>3</span></div>");
	Assert.is(fn1.callCount, 0);
	Assert.is(fn2.callCount, 0);

	renderer.render(<div />, document.body);
	Assert.is(document.body.innerHTML, "<div></div>");
	Assert.is(fn1.callCount, 1);
	Assert.is(fn2.callCount, 1);
	Assert.is(fn1.lastCall.args[0], span);
	Assert.is(fn2.lastCall.args[0], span);
});

test("component child", () => {
	function Child(): Element {
		return <span>Hello</span>;
	}

	const fn = Sinon.fake();
	function* Component(this: Context): Generator<Element> {
		this.cleanup(fn);
		while (true) {
			yield <Child />;
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
	Assert.is(fn.callCount, 0);
	const span = document.body.firstChild!.firstChild;

	renderer.render(<div />, document.body);
	Assert.is(document.body.innerHTML, "<div></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], span);
});

test("async child", async () => {
	async function Child(): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 1));
		return <span>Hello</span>;
	}

	const fn = Sinon.fake();
	function* Component(this: Context): Generator<Element> {
		this.cleanup(fn);
		while (true) {
			yield <Child />;
		}
	}

	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
	Assert.is(fn.callCount, 0);
	const span = document.body.firstChild!.firstChild;

	renderer.render(<div />, document.body);
	Assert.is(document.body.innerHTML, "<div></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], span);
});

test("fragment child", () => {
	const fn = Sinon.fake();
	function* Component(this: Context): Generator<Element> {
		this.cleanup(fn);
		while (true) {
			yield (
				<Fragment>
					<div>1</div>
					<div>2</div>
					<div>3</div>
				</Fragment>
			);
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><div>1</div><div>2</div><div>3</div></div>",
	);
	Assert.is(fn.callCount, 0);
	const children = Array.from(document.body.firstChild!.childNodes);
	renderer.render(<div />, document.body);
	Assert.is(document.body.innerHTML, "<div></div>");
	Assert.is(fn.callCount, 1);
	Assert.equal(fn.lastCall.args[0], children);
});

test("hanging child", async () => {
	const fn = Sinon.fake();
	async function Hanging(): Promise<never> {
		await new Promise(() => {});
		throw new Error("This should never be reached");
	}

	function* Component(this: Context): Generator<Element> {
		this.cleanup(fn);
		while (true) {
			yield <Hanging />;
		}
	}

	const p = renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(fn.callCount, 0);
	Assert.is(document.body.innerHTML, "");
	renderer.render(<div />, document.body);
	Assert.is(document.body.innerHTML, "<div></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], undefined);
	await p;
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], undefined);
});

test("cleanup is called even if component is prematurely unmounted", async () => {
	const fn = Sinon.fake();
	async function* Component() {
		fn();
		await new Promise((r) => setTimeout(r, 100));
		this.cleanup(() => {
			fn();
		});
		for ({} of this) {
			yield null;
		}
	}

	renderer.render(<Component />, document.body);
	renderer.render(null, document.body);

	Assert.is(fn.callCount, 1);
	await new Promise((r) => setTimeout(r, 200));
	Assert.is(fn.callCount, 2);
});

test.run();
