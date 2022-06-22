import {createElement} from "../crank.js";
import {renderer} from "../dom.js";

// TODO: jsdom doesn’t seem to export the entire SVG class hierarchy so these tests are going to be mostly incomplete for now
// https://github.com/jsdom/jsdom/issues/2128
describe("render", () => {
	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("simple", () => {
		renderer.render(<svg>Hello world</svg>, document.body);
		expect(document.body.firstChild).toBeInstanceOf(SVGElement);
		expect(document.body.firstChild!.firstChild).toBeInstanceOf(Text);
		expect(document.body.firstChild!.firstChild!.nodeValue).toEqual(
			"Hello world",
		);
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
		expect(document.body.firstChild).toBeInstanceOf(SVGElement);

		let rect = svgRoot!.childNodes[0] as SVGElement;
		expect(rect).toBeInstanceOf(SVGElement);
		expect(rect.tagName).toEqual("rect");
		expect(rect.getAttribute("width")).toEqual("100%");
		expect(rect.getAttribute("height")).toEqual("100%");
		expect(rect.getAttribute("fill")).toEqual("red");

		let circle = svgRoot!.childNodes[1] as SVGElement;
		expect(circle).toBeInstanceOf(SVGElement);
		expect(circle.tagName).toEqual("circle");
		expect(circle.getAttribute("cx")).toEqual("150");
		expect(circle.getAttribute("cy")).toEqual("100");
		expect(circle.getAttribute("r")).toEqual("80");
		expect(circle.getAttribute("fill")).toEqual("green");

		let text = svgRoot!.childNodes[2] as SVGElement;
		expect(text).toBeInstanceOf(SVGElement);
		expect(text.tagName).toEqual("text");
		expect(text.getAttribute("x")).toEqual("150");
		expect(text.getAttribute("y")).toEqual("125");
		expect(text.getAttribute("font-size")).toEqual("60");
		expect(text.getAttribute("text-anchor")).toEqual("middle");
		expect(text.getAttribute("fill")).toEqual("white");
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
		expect(document.body.firstChild).toBeInstanceOf(SVGElement);
		expect(document.body.firstChild!.firstChild!.firstChild).toBeInstanceOf(
			HTMLElement,
		);
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
		expect(rect).toBeInstanceOf(SVGElement);
		expect(rect.tagName).toEqual("rect");
		expect(circle).toBeInstanceOf(SVGElement);
		expect(circle.tagName).toEqual("circle");
		expect(rect.getAttribute("class")).toBe("rectClass");
		expect(circle.getAttribute("class")).toBe("circleClass");
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
		expect(g).toBeInstanceOf(SVGElement);
		expect(g.tagName).toEqual("g");
		expect(g.childNodes[0]).toBeInstanceOf(SVGElement);
		expect(g.childNodes[1]).toBeInstanceOf(SVGElement);
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
		expect(nested).toBeInstanceOf(SVGElement);
		expect(nested.tagName).toEqual("svg");
		expect(nested.firstChild).toBeInstanceOf(SVGElement);
		expect((nested.firstChild as SVGElement).tagName).toEqual("circle");
	});

	test("non-string values", () => {
		renderer.render(
			<svg xmlns="http://www.w3.org/2000/svg">
				<rect class="rectClass" x={10} y={20.5} width={5_000} height={null} />
			</svg>,
			document.body,
		);

		const rect = document.body.firstChild!.firstChild! as SVGElement;
		expect(rect).toBeInstanceOf(SVGElement);
		expect(rect.getAttribute("x")).toEqual("10");
		expect(rect.getAttribute("y")).toEqual("20.5");
		expect(rect.getAttribute("width")).toEqual("5000");
		expect(rect.getAttribute("height")).toEqual(null);
	});

	test("custom attributes", () => {
		renderer.render(
			<svg xmlns="http://www.w3.org/2000/svg">
				<circle cx="25" cy="10" r="5" data-foo="abc" barBaz={true} />
			</svg>,
			document.body,
		);

		const circle = document.body.firstChild!.firstChild! as SVGElement;
		expect(circle).toBeInstanceOf(SVGElement);
		expect(circle.getAttribute("cx")).toEqual("25");
		expect(circle.getAttribute("cy")).toEqual("10");
		expect(circle.getAttribute("r")).toEqual("5");
		expect(circle.getAttribute("data-foo")).toEqual("abc");
		expect(circle.getAttribute("barBaz")).toEqual("");
		expect(circle.getAttribute("does-not-exist")).toEqual(null);
	});
});
