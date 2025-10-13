import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";

import {createElement, Fragment, Portal, Raw, Text} from "../src/crank.js";
import type {Child, Context} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("warnings");

Error.stackTraceLimit = 1000;

let mock: Sinon.SinonStub;

test.before.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
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

test("for of with multiple yields is fine when scheduling", () => {
	let ctx: Context;
	function* Component(this: Context): Generator<Child> {
		ctx = this;
		let renderCount = 0;
		for ({} of this) {
			renderCount++;
			// Only call schedule on first and second renders
			if (renderCount <= 2) {
				this.schedule(() => this.refresh());
			}
			yield <div>Render {renderCount}</div>;
			yield <div>Second {renderCount}</div>;
		}
	}

	renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Second 1</div>");
	Assert.is(mock.callCount, 0);

	// Second render - should not warn because schedule() is called
	ctx!.refresh();
	Assert.is(document.body.innerHTML, "<div>Second 2</div>");
	Assert.is(mock.callCount, 0);

	// Third render - should warn because schedule() is NOT called
	ctx!.refresh();
	Assert.is(document.body.innerHTML, "<div>Render 3</div>");
	ctx!.refresh();
	Assert.is(document.body.innerHTML, "<div>Second 3</div>");
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

test("for of with multiple yields is fine when scheduling in async generator component", async () => {
	let ctx: Context;
	async function* Component(this: Context): AsyncGenerator<Child> {
		ctx = this;
		let renderCount = 0;
		for ({} of this) {
			renderCount++;
			// Only call schedule on first and second renders
			if (renderCount <= 2) {
				this.schedule(() => this.refresh());
			}
			yield <div>Render {renderCount}</div>;
			yield <div>Second {renderCount}</div>;
		}
	}

	// First render - should not warn because schedule() is called
	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Second 1</div>");
	Assert.is(mock.callCount, 0);

	// Second render - should not warn because schedule() is called
	await ctx!.refresh();
	// TODO: async updating is not yet implemented
	Assert.is(document.body.innerHTML, "<div>Render 2</div>");
	Assert.is(mock.callCount, 0);

	// Third render - should warn because schedule() is NOT called
	await ctx!.refresh();
	// TODO: async updating is not yet implemented
	Assert.is(document.body.innerHTML, "<div>Render 3</div>");

	await ctx!.refresh();
	Assert.is(mock.callCount, 1);
});

test("class and className both defined warns", () => {
	renderer.render(
		<div class="foo" className="bar">
			Test
		</div>,
		document.body,
	);
	Assert.is(mock.callCount, 1);
	Assert.match(mock.firstCall.args[0], /Both "class" and "className" set/);
});

test("string copy prop on Fragment warns", () => {
	renderer.render(<Fragment copy="!children">Test</Fragment>, document.body);
	Assert.is(mock.callCount, 1);
	Assert.match(mock.firstCall.args[0], /String copy prop ignored for <>/);
});

test("string hydrate prop on Fragment warns", () => {
	renderer.render(<Fragment hydrate="!children">Test</Fragment>, document.body);
	Assert.is(mock.callCount, 1);
	Assert.match(mock.firstCall.args[0], /String hydrate prop ignored for <>/);
});

test("string copy prop on Portal warns", () => {
	const portal = document.createElement("div");
	renderer.render(
		<Portal root={portal} copy="!children">
			Test
		</Portal>,
		document.body,
	);
	Assert.is(mock.callCount, 1);
	Assert.match(
		mock.firstCall.args[0],
		/String copy prop ignored for <crank\.Portal>/,
	);
});

test("string hydrate prop on Portal warns", () => {
	const portal = document.createElement("div");
	renderer.render(
		<Portal root={portal} hydrate="!children">
			Test
		</Portal>,
		document.body,
	);
	Assert.is(mock.callCount, 1);
	Assert.match(
		mock.firstCall.args[0],
		/String hydrate prop ignored for <crank\.Portal>/,
	);
});

test("string copy prop on Text warns", () => {
	renderer.render(<Text value="Test" copy="!children" />, document.body);
	Assert.is(mock.callCount, 1);
	Assert.match(
		mock.firstCall.args[0],
		/String copy prop ignored for <crank\.Text>/,
	);
});

test("string hydrate prop on Text warns", () => {
	renderer.render(<Text value="Test" hydrate="!children" />, document.body);
	Assert.is(mock.callCount, 1);
	Assert.match(
		mock.firstCall.args[0],
		/String hydrate prop ignored for <crank\.Text>/,
	);
});

test("string copy prop on Raw warns", () => {
	renderer.render(
		<Raw value="<div>Test</div>" copy="!children" />,
		document.body,
	);
	Assert.is(mock.callCount, 1);
	Assert.match(
		mock.firstCall.args[0],
		/String copy prop ignored for <crank\.Raw>/,
	);
});

test("string hydrate prop on Raw warns", () => {
	renderer.render(
		<Raw value="<div>Test</div>" hydrate="!children" />,
		document.body,
	);
	Assert.is(mock.callCount, 1);
	Assert.match(
		mock.firstCall.args[0],
		/String hydrate prop ignored for <crank\.Raw>/,
	);
});

test("string copy prop on component warns", () => {
	function TestComponent() {
		return <div>Test</div>;
	}
	renderer.render(<TestComponent copy="!children" />, document.body);
	Assert.is(mock.callCount, 1);
	Assert.match(
		mock.firstCall.args[0],
		/String copy prop ignored for <TestComponent>/,
	);
});

test("string hydrate prop on component warns", () => {
	function TestComponent() {
		return <div>Test</div>;
	}
	renderer.render(<TestComponent hydrate="!children" />, document.body);
	Assert.is(mock.callCount, 1);
	Assert.match(
		mock.firstCall.args[0],
		/String hydrate prop ignored for <TestComponent>/,
	);
});

test("hydrating document.body warns", () => {
	const warnMock = Sinon.stub(console, "warn");
	try {
		document.body.innerHTML = "<div>test</div>";
		renderer.hydrate(<div>test</div>, document.body);
		Assert.is(warnMock.callCount, 1);
		Assert.match(
			warnMock.firstCall.args[0],
			/Hydrating body is discouraged as it is destructive/,
		);
	} finally {
		warnMock.restore();
	}
});

test.run();
