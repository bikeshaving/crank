import {suite} from "uvu";
import * as Assert from "uvu/assert";
import {createElement} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("svg");

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test("simple", () => {
	renderer.render(<svg>Hello world</svg>, document.body);
	Assert.ok(document.body.firstChild instanceof SVGElement);
	Assert.ok(document.body.firstChild!.firstChild instanceof Text);
	Assert.is(document.body.firstChild!.firstChild!.nodeValue, "Hello world");
});

test("mdn example", () => {
	renderer.render(
		<svg
			version="1.1"
			baseProfile="full"
			width="300"
			height="200"
			xmlns="http://www.w3.org/2000/svg"
		>
			<rect width="100%" height="100%" fill="red" />
			<circle cx="150" cy="100" r="80" fill="green" />
			<text x="150" y="125" font-size="60" text-anchor="middle" fill="white">
				SVG
			</text>
		</svg>,
		document.body,
	);

	let svgRoot = document.body.firstChild;
	Assert.ok(document.body.firstChild instanceof SVGElement);

	let rect = svgRoot!.childNodes[0] as SVGElement;
	Assert.ok(rect instanceof SVGElement);
	Assert.is(rect.tagName, "rect");
	Assert.is(rect.getAttribute("width"), "100%");
	Assert.is(rect.getAttribute("height"), "100%");
	Assert.is(rect.getAttribute("fill"), "red");

	let circle = svgRoot!.childNodes[1] as SVGElement;
	Assert.ok(circle instanceof SVGElement);
	Assert.is(circle.tagName, "circle");
	Assert.is(circle.getAttribute("cx"), "150");
	Assert.is(circle.getAttribute("cy"), "100");
	Assert.is(circle.getAttribute("r"), "80");
	Assert.is(circle.getAttribute("fill"), "green");

	let text = svgRoot!.childNodes[2] as SVGElement;
	Assert.ok(text instanceof SVGElement);
	Assert.is(text.tagName, "text");
	Assert.is(text.getAttribute("x"), "150");
	Assert.is(text.getAttribute("y"), "125");
	Assert.is(text.getAttribute("font-size"), "60");
	Assert.is(text.getAttribute("text-anchor"), "middle");
	Assert.is(text.getAttribute("fill"), "white");
});

test("foreignObject", () => {
	renderer.render(
		<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
			<foreignObject x="20" y="20" width="160" height="160">
				<div xmlns="http://www.w3.org/1999/xhtml">
					Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed mollis
					mollis mi ut ultricies. Nullam magna ipsum, porta vel dui convallis,
					rutrum imperdiet eros. Aliquam erat volutpat.
				</div>
			</foreignObject>
		</svg>,
		document.body,
	);
	Assert.ok(document.body.firstChild instanceof SVGElement);

	const foreignObject = document.body.firstChild!.firstChild!;
	Assert.ok(foreignObject instanceof SVGElement);
	Assert.is(foreignObject.namespaceURI, "http://www.w3.org/2000/svg");

	const div = foreignObject.firstChild! as HTMLElement;
	Assert.ok(div instanceof HTMLElement);
	Assert.is(div.namespaceURI, "http://www.w3.org/1999/xhtml");
});

test("classes", () => {
	renderer.render(
		<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
			<rect class="rectClass" x="10" y="10" width="100" height="100" />
			<circle class="circleClass" cx="40" cy="50" r="26" />
		</svg>,
		document.body,
	);

	const rect = document.body.firstChild!.firstChild as SVGElement;
	const circle = rect.nextSibling as SVGElement;
	Assert.ok(rect instanceof SVGElement);
	Assert.is(rect.tagName, "rect");
	Assert.ok(circle instanceof SVGElement);
	Assert.is(circle.tagName, "circle");
	Assert.is(rect.getAttribute("class"), "rectClass");
	Assert.is(circle.getAttribute("class"), "circleClass");
});

test("g", () => {
	renderer.render(
		<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
			<g fill="white" stroke="green" stroke-width="5">
				<path d="M10 10" />
				<path d="M 10 10 H 90 V 90 H 10 L 10 10" />
			</g>
		</svg>,
		document.body,
	);

	const g = document.body.firstChild!.firstChild as SVGElement;
	Assert.ok(g instanceof SVGElement);
	Assert.is(g.tagName, "g");
	Assert.ok(g.childNodes[0] instanceof SVGElement);
	Assert.ok(g.childNodes[1] instanceof SVGElement);
});

test("nested", () => {
	renderer.render(
		<svg width="750" height="500" style="background: gray">
			<svg x="200" y="200">
				<circle cx="50" cy="50" r="50" style="fill: red" />
			</svg>
		</svg>,
		document.body,
	);
	const nested = document.body.firstChild!.firstChild as SVGElement;
	Assert.ok(nested instanceof SVGElement);
	Assert.is(nested.tagName, "svg");
	Assert.ok(nested.firstChild instanceof SVGElement);
	Assert.is((nested.firstChild as SVGElement).tagName, "circle");
});

test("non-string values", () => {
	renderer.render(
		<svg xmlns="http://www.w3.org/2000/svg">
			<rect class="rectClass" x={10} y={20.5} width={5000} height={null} />
		</svg>,
		document.body,
	);

	const rect = document.body.firstChild!.firstChild! as SVGElement;
	Assert.ok(rect instanceof SVGElement);
	Assert.is(rect.getAttribute("x"), "10");
	Assert.is(rect.getAttribute("y"), "20.5");
	Assert.is(rect.getAttribute("width"), "5000");
	Assert.is(rect.getAttribute("height"), null);
});

test("custom attributes", () => {
	renderer.render(
		<svg xmlns="http://www.w3.org/2000/svg">
			<circle cx="25" cy="10" r="5" data-foo="abc" barBaz={true} />
		</svg>,
		document.body,
	);

	const circle = document.body.firstChild!.firstChild! as SVGElement;
	Assert.ok(circle instanceof SVGElement);
	Assert.is(circle.getAttribute("cx"), "25");
	Assert.is(circle.getAttribute("cy"), "10");
	Assert.is(circle.getAttribute("r"), "5");
	Assert.is(circle.getAttribute("data-foo"), "abc");
	Assert.is(circle.getAttribute("barBaz"), "");
	Assert.is(circle.getAttribute("does-not-exist"), null);
});

test.run();
