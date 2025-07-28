/// <ref lib="dom" />
import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";
import {Portal, createElement, Fragment} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("portal");
test.before.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test("portal", () => {
	const el1 = document.createElement("div");
	const el2 = document.createElement("div");
	renderer.render(
		<div>
			Hello world
			<Portal root={el1}>Hello from a portal</Portal>
			<Portal root={el2}>
				<div>Hello from another portal</div>
			</Portal>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div>Hello world</div>");
	Assert.is(el1.innerHTML, "Hello from a portal");
	Assert.is(el2.innerHTML, "<div>Hello from another portal</div>");

	renderer.render(null, document.body);
	Assert.is(document.body.innerHTML, "");
	Assert.is(el1.innerHTML, "");
	Assert.is(el2.innerHTML, "");
});

test("portal at root", () => {
	const div = document.createElement("div");
	renderer.render(
		<Portal root={div}>
			<div>Hello world</div>
		</Portal>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "");
	Assert.is(div.innerHTML, "<div>Hello world</div>");
	renderer.render(null, document.body);
	Assert.is(document.body.innerHTML, "");
	Assert.is(div.innerHTML, "");
});

test("changing root", () => {
	const el1 = document.createElement("div");
	const el2 = document.createElement("div");
	renderer.render(
		<Portal root={el1}>
			<div>Hello world</div>
		</Portal>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "");
	Assert.is(el1.innerHTML, "<div>Hello world</div>");
	renderer.render(
		<Portal root={el2}>
			<div>Hello world</div>
		</Portal>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "");
	Assert.is(el1.innerHTML, "");
	Assert.is(el2.innerHTML, "<div>Hello world</div>");
});

test("portal with rendered page", () => {
	const onclick = Sinon.fake();
	document.body.innerHTML = `<div id="portal"><button>Click</button></div>`;
	const portal = document.getElementById("portal")!;
	const button = portal.firstChild as HTMLButtonElement;
	renderer.render(
		<div>
			Hello world
			<Portal root={portal} hydration={true}>
				<button onclick={onclick}>Click</button>
			</Portal>
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, `<div id="portal"><button>Click</button></div><div>Hello world</div>`);
	Assert.is(portal.firstChild, button);
	Assert.is(portal.innerHTML, `<button>Click</button>`);
	button.click();
	Assert.is(onclick.callCount, 1);
});

test.run();
