/// <ref lib="dom" />
import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";
import {createElement, Fragment, Raw} from "../src/crank.js";
import type {Context} from "../src/crank.js";

import {renderer} from "../src/dom.js";

const test = suite("hydration");
let consoleError: Sinon.SinonStub;
test.before.each(() => {
	consoleError = Sinon.stub(console, "error");
});

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
	consoleError.restore();
});

test("simple", () => {
	document.body.innerHTML = "<button>Click</button>";
	const button = document.body.firstChild as HTMLButtonElement;
	const onclick = Sinon.fake();
	renderer.hydrate(<button onclick={onclick}>Click</button>, document.body);

	Assert.is(document.body.innerHTML, "<button>Click</button>");
	Assert.is(document.body.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
});

test("fragment", () => {
	document.body.innerHTML = "<button>Click</button>";
	const button = document.body.firstChild as HTMLButtonElement;
	const onclick = Sinon.fake();
	renderer.hydrate(
		<Fragment>
			<button onclick={onclick}>Click</button>
		</Fragment>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<button>Click</button>");
	Assert.is(document.body.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
});

test("sync function component", () => {
	document.body.innerHTML = "<button>Click</button>";
	const button = document.body.firstChild as HTMLButtonElement;

	const onclick = Sinon.fake();
	const Component = Sinon.fake(function Component() {
		return <button onclick={onclick}>Click</button>;
	});

	renderer.hydrate(<Component />, document.body);

	Assert.ok(Component.called);
	Assert.is(document.body.innerHTML, "<button>Click</button>");
	Assert.is(document.body.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
});

test("sync generator component", () => {
	document.body.innerHTML = "<button>Click</button>";
	const button = document.body.firstChild as HTMLButtonElement;

	const onclick = Sinon.fake();
	const Component = Sinon.fake(function* Component(this: Context) {
		for ({} of this) {
			yield <button onclick={onclick}>Click</button>;
		}
	});

	renderer.hydrate(<Component />, document.body);

	Assert.ok(Component.called);
	Assert.is(document.body.innerHTML, "<button>Click</button>");
	Assert.is(document.body.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
});

test("refresh", () => {
	document.body.innerHTML = "<button>Click</button>";
	const button = document.body.firstChild as HTMLButtonElement;

	const onclick = Sinon.fake();
	const Component = Sinon.fake(function* Component(this: Context) {
		let count = 0;
		for ({} of this) {
			yield (
				<button
					onclick={() => {
						onclick();
						count++;
						this.refresh();
					}}
				>
					Click {count}
				</button>
			);
		}
	});

	renderer.hydrate(<Component />, document.body);

	Assert.ok(Component.called);
	Assert.is(document.body.innerHTML, "<button>Click 0</button>");
	Assert.is(document.body.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(document.body.innerHTML, "<button>Click 1</button>");
	Assert.is(document.body.firstChild, button);
});

test("async function component", async () => {
	document.body.innerHTML = "<button>Click</button>";
	const button = document.body.firstChild as HTMLButtonElement;

	const onclick = Sinon.fake();
	const Component = Sinon.fake(async function Component() {
		return <button onclick={onclick}>Click</button>;
	});

	await renderer.hydrate(<Component />, document.body);

	Assert.ok(Component.called);
	Assert.is(document.body.innerHTML, "<button>Click</button>");
	Assert.is(document.body.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
});

test.skip("async generator component", async () => {
	document.body.innerHTML = "<button>Click</button>";
	const button = document.body.firstChild as HTMLButtonElement;

	const onclick = Sinon.fake();
	const Component = Sinon.fake(async function* Component(this: Context) {
		for await ({} of this) {
			yield <button onclick={onclick}>Click</button>;
		}
	});

	await renderer.hydrate(<Component />, document.body);

	Assert.ok(Component.called);
	Assert.is(document.body.innerHTML, "<button>Click</button>");
	Assert.is(document.body.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
});

test.skip("async component and host sibling", async () => {
	document.body.innerHTML =
		"<div><div><button>Slow</button></div><button>Fast</button></div>";
	const div = document.body.firstChild!;
	const button1 = div.childNodes[0].childNodes[0] as HTMLButtonElement;
	const button2 = div.childNodes[1] as HTMLButtonElement;
	const onclick1 = Sinon.fake();
	const onclick2 = Sinon.fake();
	async function Component() {
		await new Promise((resolve) => setTimeout(resolve, 5));
		return (
			<div>
				<button onclick={onclick1}>Slow</button>
			</div>
		);
	}

	await renderer.hydrate(
		<div>
			<Component />
			<button onclick={onclick2}>Fast</button>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><div><button>Slow</button></div><button>Fast</button></div>",
	);
	Assert.is(document.body.firstChild, div);
	Assert.is(document.body.firstChild!.childNodes[0].childNodes[0], button1);
	Assert.is(document.body.firstChild!.childNodes[1], button2);
	button1.click();
	button2.click();
	Assert.ok(onclick1.called);
	Assert.ok(onclick2.called);
});

test("async sibling components resolve out of order", async () => {
	document.body.innerHTML =
		"<div><button>Slow</button><button>Fast</button></div>";
	const div = document.body.firstChild!;
	const button1 = div.childNodes[0] as HTMLButtonElement;
	const button2 = div.childNodes[1] as HTMLButtonElement;
	const onclick1 = Sinon.fake();
	const onclick2 = Sinon.fake();
	async function Slow() {
		await new Promise((resolve) => setTimeout(resolve, 5));
		return <button onclick={onclick1}>Slow</button>;
	}

	async function Fast() {
		return <button onclick={onclick2}>Fast</button>;
	}

	function Component() {
		return (
			<div>
				<Slow />
				<Fast />
			</div>
		);
	}

	await renderer.hydrate(<Component />, document.body);
	Assert.is(
		document.body.innerHTML,
		"<div><button>Slow</button><button>Fast</button></div>",
	);

	Assert.is(document.body.firstChild, div);
	Assert.is(document.body.firstChild!.childNodes[0], button1);
	Assert.is(document.body.firstChild!.childNodes[1], button2);
	button1.click();
	button2.click();
	Assert.ok(onclick1.called);
	Assert.ok(onclick2.called);
});

test.skip("text sibling", async () => {
	document.body.innerHTML = "<div>Text1<button>Click</button>Text2</div>";
	const div = document.body.firstChild!;
	const text1 = div.childNodes[0] as Text;
	const button = div.childNodes[1] as HTMLButtonElement;
	const text2 = div.childNodes[2] as Text;
	const Component = Sinon.fake(function () {
		return (
			<Fragment>
				Text1<button onclick={onclick}>Click</button>Text2
			</Fragment>
		);
	});

	renderer.hydrate(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(
		document.body.innerHTML,
		"<div>Text1<button>Click</button>Text2</div>",
	);

	Assert.is(document.body.firstChild, div);
	Assert.is(document.body.firstChild!.childNodes[0], text1);
	Assert.is(document.body.firstChild!.childNodes[1], button);
	Assert.is(document.body.firstChild!.childNodes[2], text2);
});

test.skip("split text", async () => {
	document.body.innerHTML = "<div>Text1Text2<button>Click</button></div>";
	const div = document.body.firstChild!;
	const text = div.childNodes[0] as Text;
	const button = div.childNodes[1] as HTMLButtonElement;
	const Component = Sinon.fake(function () {
		return (
			<Fragment>
				{"Text1"}
				{"Text2"}
				<button onclick={onclick}>Click</button>
			</Fragment>
		);
	});

	renderer.hydrate(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(
		document.body.innerHTML,
		"<div>Text1Text2<button>Click</button></div>",
	);

	Assert.is(document.body.firstChild, div);
	Assert.is(document.body.firstChild!.childNodes[0], text);
	Assert.is(document.body.firstChild!.childNodes[1], button);
});

test("mismatched tag", () => {
	document.body.innerHTML = "<div>Hello</div>";
	const onclick = Sinon.fake();
	const Component = Sinon.fake(function () {
		return <button onclick={onclick}>Click</button>;
	});

	renderer.hydrate(<Component />, document.body);
	Assert.ok(Component.called);
	Assert.is(document.body.innerHTML, "<button>Click</button>");
	Assert.is(consoleError.callCount, 1);
});

test("mismatched text", () => {
	document.body.innerHTML = "<button>Do not click</button>";
	const button = document.body.firstChild as HTMLButtonElement;
	const onclick = Sinon.fake();

	const Component = Sinon.fake(function () {
		return <button onclick={onclick}>Click</button>;
	});

	renderer.hydrate(<Component />, document.body);
	Assert.ok(Component.called);
	Assert.is(document.body.innerHTML, "<button>Click</button>");
	Assert.is(document.body.firstChild, button);
	button.click();
	Assert.ok(onclick.called);
	Assert.is(consoleError.callCount, 1);
});

test("raw element", () => {
	document.body.innerHTML = "<div><div>Raw</div><button>Click</button></div>";
	const onclick = Sinon.fake();
	const button = document.body.childNodes[0].childNodes[1] as HTMLButtonElement;
	const Component = Sinon.fake(function () {
		return (
			<div>
				<Raw value="<div>Raw</div>" />
				<button onclick={onclick}>Click</button>
			</div>
		);
	});

	renderer.hydrate(<Component />, document.body);
	Assert.ok(Component.called);
	Assert.is(
		document.body.innerHTML,
		"<div><div>Raw</div><button>Click</button></div>",
	);
	Assert.is(document.body.childNodes[0].childNodes[1], button);
	button.click();
	Assert.ok(onclick.called);
});

test.skip("raw multiple elements", () => {
	document.body.innerHTML =
		"<div><div>Raw 1</div><div>Raw 2</div><button>Click</button></div>";
	const onclick = Sinon.fake();
	const button = document.body.childNodes[0].childNodes[2] as HTMLButtonElement;
	const Component = Sinon.fake(function () {
		return (
			<div>
				<Raw value="<div>Raw 1</div><div>Raw 2</div>" />
				<button onclick={onclick}>Click</button>
			</div>
		);
	});

	renderer.hydrate(<Component />, document.body);
	Assert.ok(Component.called);
	Assert.is(
		document.body.innerHTML,
		"<div><div>Raw 1</div><div>Raw 2</div><button>Click</button></div>",
	);
	Assert.is(document.body.childNodes[0].childNodes[2], button);
	button.click();
	Assert.ok(onclick.called);
});

test.skip("raw text", () => {
	document.body.innerHTML = "<div>Raw<button>Click</button></div>";
	const onclick = Sinon.fake();
	const button = document.body.childNodes[0].childNodes[1] as HTMLButtonElement;
	const Component = Sinon.fake(function () {
		return (
			<div>
				<Raw value="Raw" />
				<button onclick={onclick}>Click</button>
			</div>
		);
	});

	renderer.hydrate(<Component />, document.body);
	Assert.ok(Component.called);
	Assert.is(document.body.innerHTML, "<div>Raw<button>Click</button></div>");
	Assert.is(document.body.childNodes[0].childNodes[1], button);
	button.click();
	Assert.ok(onclick.called);
});

test.skip("raw comment", () => {
	document.body.innerHTML =
		"<div><!-- comment -->Hello<button>Click</button></div>";
	const onclick = Sinon.fake();
	const button = document.body.childNodes[0].childNodes[2] as HTMLButtonElement;
	const Component = Sinon.fake(function () {
		return (
			<div>
				<Raw value="<!-- comment -->" />
				Hello
				<button onclick={onclick}>Click</button>
			</div>
		);
	});

	renderer.hydrate(<Component />, document.body);
	Assert.ok(Component.called);
	Assert.is(
		document.body.innerHTML,
		"<div><!-- comment -->Hello<button>Click</button></div>",
	);

	button.click();
	Assert.ok(onclick.called);
});

test.run();
