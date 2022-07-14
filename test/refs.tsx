import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";

const test = suite("refs");

import {
	Children,
	Context,
	createElement,
	Element,
	Fragment,
	Raw,
} from "../src/crank.js";
import {renderer} from "../src/dom.js";

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test("basic", () => {
	const fn = Sinon.fake();
	renderer.render(<div crank-ref={fn}>Hello</div>, document.body);

	Assert.is(document.body.innerHTML, "<div>Hello</div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], document.body.firstChild);
});

test("child", () => {
	const fn = Sinon.fake();
	renderer.render(
		<div>
			<span crank-ref={fn}>Hello</span>
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
});

test("Fragment element", () => {
	const fn = Sinon.fake();
	renderer.render(
		<div>
			<Fragment crank-ref={fn}>
				<span>1</span>
				<span>2</span>
				<span>3</span>
			</Fragment>
		</div>,
		document.body,
	);

	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span></div>",
	);
	Assert.is(fn.callCount, 1);
	Assert.equal(
		fn.lastCall.args[0],
		Array.from(document.body.firstChild!.childNodes),
	);
});

test("Raw element", () => {
	const fn = Sinon.fake();
	renderer.render(
		<Raw value="<div>Hello world</div>" crank-ref={fn} />,
		document.body,
	);

	Assert.is(fn.callCount, 1);

	const refArgs = fn.lastCall.args[0];
	Assert.is(refArgs.length, 1);
	Assert.ok(refArgs[0] instanceof Node);
});

test("function component", () => {
	const fn = Sinon.fake();
	function Component(): Element {
		return <span>Hello</span>;
	}

	renderer.render(
		<div>
			<Component crank-ref={fn} />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
});

test("generator component", () => {
	const fn = Sinon.fake();
	function* Component(): Generator<Element> {
		while (true) {
			yield <span>Hello</span>;
		}
	}

	renderer.render(
		<div>
			<Component crank-ref={fn} />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
});

test("async function component", async () => {
	const fn = Sinon.fake();
	async function Component(): Promise<Element> {
		return <span>Hello</span>;
	}

	await renderer.render(
		<div>
			<Component crank-ref={fn} />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
});

test("async generator component", async () => {
	const fn = Sinon.fake();
	async function* Component(this: Context): AsyncGenerator<Element> {
		for await (const _ of this) {
			yield <span>Hello</span>;
		}
	}

	await renderer.render(
		<div>
			<Component crank-ref={fn} />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
});

test("transcluded in function component", async () => {
	function Child({children}: {children: Children}): Children {
		return children;
	}

	const fn = Sinon.fake();
	function Parent(): Element {
		return (
			<div>
				<Child>
					<span crank-ref={fn}>Hello</span>
				</Child>
			</div>
		);
	}

	renderer.render(<Parent />, document.body);

	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
});

test("transcluded in async function component", async () => {
	async function Child({children}: {children: Children}): Promise<Children> {
		await new Promise((resolve) => setTimeout(resolve, 1));
		return children;
	}

	const fn = Sinon.fake();
	function Parent(): Element {
		return (
			<div>
				<Child>
					<span crank-ref={fn}>Hello</span>
				</Child>
			</div>
		);
	}

	const p = renderer.render(<Parent />, document.body);

	Assert.is(fn.callCount, 0);
	await p;
	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
	Assert.is(fn.callCount, 1);
	Assert.is(fn.lastCall.args[0], document.body.firstChild!.firstChild);
});

test.run();
