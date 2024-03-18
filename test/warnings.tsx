import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";

import {createElement} from "../src/crank.js";
import type {Child, Context} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("warnings");

let mock: Sinon.SinonStub;

test.before.each(() => {
	mock = Sinon.stub(console, "error");
});

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
	mock.restore();
});

test("sync component warns on implicit return", () => {
	function Component() {}

	renderer.render(<Component />, document.body);
	Assert.is(mock.callCount, 1);
});

test("async component warns on implicit return", async () => {
	async function Component() {}

	await renderer.render(<Component />, document.body);
	Assert.is(mock.callCount, 1);
});

test("sync generator component warns on implicit return", async () => {
	function* Component() {}

	await renderer.render(<Component />, document.body);
	Assert.is(mock.callCount, 1);
});

test("for of with multiple yields", async () => {
	function* Component(this: Context): Generator<Child> {
		for ({} of this) {
			yield <div>Hello</div>;
			yield <div>Goodbye</div>;
		}
	}

	renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello</div>");
	renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Goodbye</div>");
	Assert.is(mock.callCount, 1);
});

test("for of with multiple yields in async generator component", async () => {
	async function* Component(this: Context): AsyncGenerator<Child> {
		for ({} of this) {
			yield <div>Hello</div>;
			yield <div>Goodbye</div>;
		}
	}

	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello</div>");
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<div>Hello</div>");
	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Goodbye</div>");
	Assert.is(mock.callCount, 1);
});

test.run();
