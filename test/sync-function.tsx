import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";

import {createElement} from "../src/crank.js";
import type {Context, Element} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("sync function");
test.before.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test("basic", () => {
	function Component({message}: {message: string}): Element {
		return <span>{message}</span>;
	}

	renderer.render(
		<div>
			<Component message="Hello" />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");

	renderer.render(
		<div>
			<Component message="Goodbye" />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>Goodbye</span></div>");
});

test("rerender different return value", () => {
	function Component({ChildTag}: {ChildTag: string}): Element {
		return <ChildTag>Hello world</ChildTag>;
	}

	renderer.render(<Component ChildTag="div" />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello world</div>");
	renderer.render(<Component ChildTag="span" />, document.body);
	Assert.is(document.body.innerHTML, "<span>Hello world</span>");
});

test("async children enqueue", async () => {
	const fn = Sinon.fake();
	async function Child({message}: {message: string}): Promise<Element> {
		fn();
		await new Promise((resolve) => setTimeout(resolve, 100));
		return <div>{message}</div>;
	}

	function Parent({message}: {message: string}): Element {
		return <Child message={message} />;
	}

	const p1 = renderer.render(<Parent message="Hello 1" />, document.body);
	const p2 = renderer.render(<Parent message="Hello 2" />, document.body);
	const p3 = renderer.render(<Parent message="Hello 3" />, document.body);
	const p4 = renderer.render(<Parent message="Hello 4" />, document.body);
	Assert.is(await p1, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>Hello 1</div>");
	Assert.is(await p2, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>Hello 4</div>");
	Assert.is(await p3, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>Hello 4</div>");
	const p5 = renderer.render(<Parent message="Hello 5" />, document.body);
	const p6 = renderer.render(<Parent message="Hello 6" />, document.body);
	const p7 = renderer.render(<Parent message="Hello 7" />, document.body);
	const p8 = renderer.render(<Parent message="Hello 8" />, document.body);
	Assert.is(await p4, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>Hello 4</div>");
	Assert.is(await p5, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>Hello 5</div>");
	Assert.is(await p6, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>Hello 8</div>");
	Assert.is(await p7, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>Hello 8</div>");
	Assert.is(await p8, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>Hello 8</div>");
	Assert.is(fn.callCount, 4);
});

test("refresh called on unmounted component", () => {
	let ctx!: Context;
	function Component(this: Context) {
		ctx = this;
		return null;
	}

	renderer.render(<Component />, document.body);
	renderer.render(null, document.body);
	const mock = Sinon.stub(console, "error");
	try {
		ctx.refresh();
		ctx.refresh();
		Assert.is(mock.callCount, 2);
	} finally {
		mock.restore();
	}
});

test("context is passed as second argument", () => {
	let ctx1!: Context;
	let ctx2!: Context;

	function Component(this: Context, _props: any, ctx: Context) {
		ctx1 = this;
		ctx2 = ctx;
		return null;
	}

	renderer.render(<Component />, document.body);
	Assert.is(ctx1, ctx2);
});

test.run();
