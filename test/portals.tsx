import {describe, test, beforeEach, afterEach, expect} from "@b9g/libuild/test";
/// <ref lib="dom" />
import * as Sinon from "sinon";
import {createElement, Portal} from "../src/crank.js";
import {renderer} from "../src/dom.js";

describe("portal", () => {
	beforeEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	afterEach(() => {
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
		expect(document.body.innerHTML).toBe("<div>Hello world</div>");
		expect(el1.innerHTML).toBe("Hello from a portal");
		expect(el2.innerHTML).toBe("<div>Hello from another portal</div>");

		renderer.render(null, document.body);
		expect(document.body.innerHTML).toBe("");
		expect(el1.innerHTML).toBe("");
		expect(el2.innerHTML).toBe("");
	});

	test("portal at root", () => {
		const div = document.createElement("div");
		renderer.render(
			<Portal root={div}>
				<div>Hello world</div>
			</Portal>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("");
		expect(div.innerHTML).toBe("<div>Hello world</div>");
		renderer.render(null, document.body);
		expect(document.body.innerHTML).toBe("");
		expect(div.innerHTML).toBe("");
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
		expect(document.body.innerHTML).toBe("");
		expect(el1.innerHTML).toBe("<div>Hello world</div>");
		renderer.render(
			<Portal root={el2}>
				<div>Hello world</div>
			</Portal>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("");
		expect(el1.innerHTML).toBe("");
		expect(el2.innerHTML).toBe("<div>Hello world</div>");
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

		expect(iframeDoc.body.innerHTML).toBe("<div>Hello from iframe</div>");

		renderer.render(null, document.body);
		expect(iframeDoc.body.innerHTML).toBe("");

		document.body.removeChild(iframe);
	});

	test("portal with rendered page and hydrate", () => {
		const onclick = Sinon.fake();
		document.body.innerHTML = "<div id=\"portal\"><button>Click</button></div>";
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

		expect(document.body.innerHTML).toBe(
			"<div>Hello world</div><div id=\"portal\"><button>Click</button></div>",
		);
		expect(portal.firstChild).toBe(button);
		expect(portal.innerHTML).toBe("<button>Click</button>");
		button.click();
		expect(onclick.callCount).toBe(1);
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
		expect(div instanceof HTMLDivElement).toBeTruthy();
		expect(div.namespaceURI).toBe("http://www.w3.org/1999/xhtml");
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
		expect(rect.namespaceURI).toBe("http://www.w3.org/2000/svg");
		expect(rect instanceof SVGElement).toBeTruthy();
	});
});
