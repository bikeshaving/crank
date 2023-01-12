/// <ref lib="dom" />
import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";
import {createElement, Fragment} from "../src/crank.js";
import type {Context} from "../src/crank.js";

import {renderer} from "../src/dom.js";

const test = suite("hydration");
test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
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

test("async generator component", async () => {
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

test("async component and host", async () => {
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

test("out of order siblings", async () => {
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

test.run();
