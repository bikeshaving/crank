import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";
import {createElement, Context, Element} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("flush");

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test("callback called after insertion into the DOM", () => {
	const fn = Sinon.fake();
	const callback = (el: HTMLElement) => fn(document.body.contains(el));
	function Component(this: Context): Element {
		this.flush(callback);
		return <span>Hello</span>;
	}

	renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<span>Hello</span>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], true);
});

test("callback called once in a function", () => {
	let i = 0;
	const fn = Sinon.fake();
	function Component(this: Context): Element {
		if (i === 0) {
			this.flush(fn);
		}

		return <span>{i++}</span>;
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>0</span></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
});

test("callback called every time in a function", () => {
	let i = 0;
	const fn = Sinon.fake();
	function Component(this: Context): Element {
		this.flush(fn);
		return <span>{i++}</span>;
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>0</span></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	Assert.is(fn.callCount, 2);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
});

test("called called once in a generator", () => {
	const fn = Sinon.fake();
	function* Component(this: Context): Generator<Element> {
		let i = 0;
		this.flush(fn);
		for (const _ of this) {
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
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
});

test("callback called every time in a generator", () => {
	const fn = Sinon.fake();
	function* Component(this: Context): Generator<Element> {
		let i = 0;
		for (const _ of this) {
			this.flush(fn);
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
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	Assert.is(fn.callCount, 2);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
});

test("callback called once in an async function", async () => {
	let i = 0;
	const fn = Sinon.fake();
	async function Component(this: Context) {
		if (i === 0) {
			this.flush(fn);
		}

		return <span>{i++}</span>;
	}

	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>0</span></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);

	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
});

test("callback called every time in an async function", async () => {
	let i = 0;
	const fn = Sinon.fake();
	async function Component(this: Context) {
		this.flush(fn);
		return <span>{i++}</span>;
	}

	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>0</span></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);

	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	Assert.is(fn.callCount, 2);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
});

test("callback called once in an async generator", async () => {
	const fn = Sinon.fake();
	async function* Component(this: Context) {
		let i = 0;
		this.flush(fn);
		for await (const _ of this) {
			yield <span>{i++}</span>;
		}
	}

	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>0</span></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);

	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
});

test("callback called every time in an async generator", async () => {
	const fn = Sinon.fake();
	async function* Component(this: Context) {
		let i = 0;
		for await (const _ of this) {
			this.flush(fn);
			yield <span>{i++}</span>;
		}
	}

	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>0</span></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);

	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	Assert.is(fn.callCount, 2);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
});

test("callback isn’t called when sibling is refreshed", () => {
	const fn1 = Sinon.fake();
	const fn2 = Sinon.fake();
	let ctx1!: Context;
	let ctx2!: Context;
	function* Component(this: Context): Generator<Element> {
		ctx1 = this;
		let i = 0;
		for (const _ of this) {
			this.flush(fn1);
			yield <span>{i++}</span>;
		}
	}

	function* Sibling(this: Context) {
		let i = 0;
		ctx2 = this;
		for (const _ of this) {
			this.flush(fn2);
			yield <span>sibling {i++}</span>;
		}
	}

	renderer.render(
		<div>
			<Component />
			<Sibling />
		</div>,
		document.body,
	);

	Assert.is(
		document.body.innerHTML,
		"<div><span>0</span><span>sibling 0</span></div>",
	);
	Assert.is(fn1.callCount, 1);
	Assert.is(fn2.callCount, 1);
	Assert.is(fn1.lastCall.args[0], document.body.firstChild!.childNodes[0]);
	Assert.is(fn2.lastCall.args[0], document.body.firstChild!.childNodes[1]);
	ctx1.flush(fn1);
	ctx2.refresh();
	Assert.is(
		document.body.innerHTML,
		"<div><span>0</span><span>sibling 1</span></div>",
	);
	Assert.is(fn1.callCount, 1);
	Assert.is(fn2.callCount, 2);
	Assert.is(fn2.lastCall.args[0], document.body.firstChild!.childNodes[1]);
});

test.run();
