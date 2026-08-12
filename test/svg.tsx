import {describe, test, beforeEach, afterEach, expect} from "@b9g/libuild/test";
import {createElement} from "../src/crank.js";
import {renderer} from "../src/dom.js";

describe("svg", () => {
	beforeEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("simple", () => {
		renderer.render(<svg>Hello world</svg>, document.body);
		expect(document.body.firstChild instanceof SVGElement).toBeTruthy();
		expect(document.body.firstChild!.firstChild instanceof Text).toBeTruthy();
		expect(document.body.firstChild!.firstChild!.nodeValue).toBe("Hello world");
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
		expect(document.body.firstChild instanceof SVGElement).toBeTruthy();

		let rect = svgRoot!.childNodes[0] as SVGElement;
		expect(rect instanceof SVGElement).toBeTruthy();
		expect(rect.tagName).toBe("rect");
		expect(rect.getAttribute("width")).toBe("100%");
		expect(rect.getAttribute("height")).toBe("100%");
		expect(rect.getAttribute("fill")).toBe("red");

		let circle = svgRoot!.childNodes[1] as SVGElement;
		expect(circle instanceof SVGElement).toBeTruthy();
		expect(circle.tagName).toBe("circle");
		expect(circle.getAttribute("cx")).toBe("150");
		expect(circle.getAttribute("cy")).toBe("100");
		expect(circle.getAttribute("r")).toBe("80");
		expect(circle.getAttribute("fill")).toBe("green");

		let text = svgRoot!.childNodes[2] as SVGElement;
		expect(text instanceof SVGElement).toBeTruthy();
		expect(text.tagName).toBe("text");
		expect(text.getAttribute("x")).toBe("150");
		expect(text.getAttribute("y")).toBe("125");
		expect(text.getAttribute("font-size")).toBe("60");
		expect(text.getAttribute("text-anchor")).toBe("middle");
		expect(text.getAttribute("fill")).toBe("white");
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
		expect(document.body.firstChild instanceof SVGElement).toBeTruthy();

		const foreignObject = document.body.firstChild!.firstChild!;
		expect(foreignObject instanceof SVGElement).toBeTruthy();
		expect((foreignObject as Element).namespaceURI).toBe(
			"http://www.w3.org/2000/svg",
		);

		const div = foreignObject.firstChild! as HTMLElement;
		expect(div instanceof HTMLElement).toBeTruthy();
		expect(div.namespaceURI).toBe("http://www.w3.org/1999/xhtml");
	});

	test("foreignObject children are HTML without explicit xmlns", () => {
		renderer.render(
			<svg viewBox="0 0 200 200">
				<foreignObject x="20" y="20" width="160" height="160">
					<div>
						<p>Hello</p>
					</div>
				</foreignObject>
			</svg>,
			document.body,
		);
		const foreignObject = document.body.firstChild!.firstChild!;
		expect(foreignObject instanceof SVGElement).toBeTruthy();

		const div = foreignObject.firstChild! as Element;
		expect(div instanceof HTMLDivElement).toBeTruthy();
		expect(div.namespaceURI).toBe("http://www.w3.org/1999/xhtml");

		const p = div.firstChild! as Element;
		expect(p instanceof HTMLParagraphElement).toBeTruthy();
		expect(p.namespaceURI).toBe("http://www.w3.org/1999/xhtml");
	});

	test("foreignObject itself gets SVG prop normalization", () => {
		renderer.render(
			<svg viewBox="0 0 200 200">
				{/* eslint-disable-next-line crank/no-react-svg-props */}
				<foreignObject clipPath="url(#clip)" colorInterpolation="sRGB">
					<div>Hello</div>
				</foreignObject>
			</svg>,
			document.body,
		);
		const foreignObject = document.body.firstChild!.firstChild! as SVGElement;
		expect(foreignObject instanceof SVGElement).toBeTruthy();
		// SVG props should be normalized on foreignObject itself
		expect(foreignObject.getAttribute("clip-path")).toBe("url(#clip)");
		expect(foreignObject.getAttribute("color-interpolation")).toBe("sRGB");
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
		expect(rect instanceof SVGElement).toBeTruthy();
		expect(rect.tagName).toBe("rect");
		expect(circle instanceof SVGElement).toBeTruthy();
		expect(circle.tagName).toBe("circle");
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
		expect(g instanceof SVGElement).toBeTruthy();
		expect(g.tagName).toBe("g");
		expect(g.childNodes[0] instanceof SVGElement).toBeTruthy();
		expect(g.childNodes[1] instanceof SVGElement).toBeTruthy();
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
		expect(nested instanceof SVGElement).toBeTruthy();
		expect(nested.tagName).toBe("svg");
		expect(nested.firstChild instanceof SVGElement).toBeTruthy();
		expect((nested.firstChild as SVGElement).tagName).toBe("circle");
	});

	test("non-string values", () => {
		renderer.render(
			<svg xmlns="http://www.w3.org/2000/svg">
				<rect class="rectClass" x={10} y={20.5} width={5000} height={null} />
			</svg>,
			document.body,
		);

		const rect = document.body.firstChild!.firstChild! as SVGElement;
		expect(rect instanceof SVGElement).toBeTruthy();
		expect(rect.getAttribute("x")).toBe("10");
		expect(rect.getAttribute("y")).toBe("20.5");
		expect(rect.getAttribute("width")).toBe("5000");
		expect(rect.getAttribute("height")).toBe(null);
	});

	test("custom attributes", () => {
		renderer.render(
			<svg xmlns="http://www.w3.org/2000/svg">
				<circle cx="25" cy="10" r="5" data-foo="abc" barBaz={true} />
			</svg>,
			document.body,
		);

		const circle = document.body.firstChild!.firstChild! as SVGElement;
		expect(circle instanceof SVGElement).toBeTruthy();
		expect(circle.getAttribute("cx")).toBe("25");
		expect(circle.getAttribute("cy")).toBe("10");
		expect(circle.getAttribute("r")).toBe("5");
		expect(circle.getAttribute("data-foo")).toBe("abc");
		expect(circle.getAttribute("barBaz")).toBe("");
		expect(circle.getAttribute("does-not-exist")).toBe(null);
	});

	/* eslint-disable crank/no-react-svg-props */
	test("React-style camelCase SVG attributes", () => {
		renderer.render(
			<svg>
				<path
					strokeWidth="2"
					strokeLinecap="round"
					fillOpacity="0.5"
					clipPath="url(#clip)"
				/>
			</svg>,
			document.body,
		);

		const path = document.body.firstChild!.firstChild! as SVGElement;
		expect(path instanceof SVGElement).toBeTruthy();
		expect(path.getAttribute("stroke-width")).toBe("2");
		expect(path.getAttribute("stroke-linecap")).toBe("round");
		expect(path.getAttribute("fill-opacity")).toBe("0.5");
		expect(path.getAttribute("clip-path")).toBe("url(#clip)");
	});

	test("React-style text SVG attributes", () => {
		renderer.render(
			<svg>
				<text textAnchor="middle" dominantBaseline="central" />
			</svg>,
			document.body,
		);

		const text = document.body.firstChild!.firstChild! as SVGElement;
		expect(text.getAttribute("text-anchor")).toBe("middle");
		expect(text.getAttribute("dominant-baseline")).toBe("central");
	});

	test("SVG camelCase attributes that are already correct", () => {
		renderer.render(
			<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">
				<circle cx="50" cy="50" r="40" />
			</svg>,
			document.body,
		);

		const svg = document.body.firstChild! as SVGElement;
		expect(svg.getAttribute("viewBox")).toBe("0 0 100 100");
		expect(svg.getAttribute("preserveAspectRatio")).toBe("xMidYMid");
	});
});
