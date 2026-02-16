/// <ref lib="dom" />
import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";
import {createElement, Portal} from "../src/crank.js";
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

test("portal targeting iframe body", () => {
	// Create an iframe to get a separate document
	// This tests that ownerDocument is used correctly across different documents
	const iframe = document.createElement("iframe");
	document.body.appendChild(iframe);
	const iframeDoc = iframe.contentDocument!;

	renderer.render(
		<Portal root={iframeDoc.body}>
			<div>Hello from iframe</div>
		</Portal>,
		document.body,
	);

	Assert.is(iframeDoc.body.innerHTML, "<div>Hello from iframe</div>");

	renderer.render(null, document.body);
	Assert.is(iframeDoc.body.innerHTML, "");

	document.body.removeChild(iframe);
});

test("portal with rendered page and hydrate", () => {
	const onclick = Sinon.fake();
	document.body.innerHTML = `<div id="portal"><button>Click</button></div>`;
	const portal = document.getElementById("portal")!;
	const button = portal.firstChild as HTMLButtonElement;
	renderer.render(
		<div>
			Hello world
			<Portal root={portal} hydrate={true}>
				<button onclick={onclick}>Click</button>
			</Portal>
		</div>,
		document.body,
	);

	Assert.is(
		document.body.innerHTML,
		`<div>Hello world</div><div id="portal"><button>Click</button></div>`,
	);
	Assert.is(portal.firstChild, button);
	Assert.is(portal.innerHTML, `<button>Click</button>`);
	button.click();
	Assert.is(onclick.callCount, 1);
});

test("portal out of SVG resets scope to HTML", () => {
	const htmlRoot = document.createElement("div");
	renderer.render(
		<svg viewBox="0 0 100 100">
			<Portal root={htmlRoot}>
				<div>
					<span>Hello from HTML</span>
				</div>
			</Portal>
		</svg>,
		document.body,
	);
	// Children should be created as HTML elements, not SVG elements
	const div = htmlRoot.firstChild as Element;
	Assert.ok(div instanceof HTMLDivElement);
	Assert.is(div.namespaceURI, "http://www.w3.org/1999/xhtml");
});

test("portal into SVG root creates SVG children", () => {
	const svgRoot = document.createElementNS("http://www.w3.org/2000/svg", "g");
	renderer.render(
		<Portal root={svgRoot}>
			<rect width="100" height="100" />
		</Portal>,
		document.body,
	);
	const rect = svgRoot.firstChild as Element;
	Assert.is(rect.namespaceURI, "http://www.w3.org/2000/svg");
	Assert.ok(rect instanceof SVGElement);
});

test.run();
