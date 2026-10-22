import {describe, test, beforeEach, afterEach, expect} from "@b9g/libuild/test";
import {createElement} from "../src/crank.js";
import {renderer} from "../src/dom.js";

describe("mathml", () => {
	beforeEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("simple math element", () => {
		renderer.render(<math>Hello world</math>, document.body);
		const mathElement = document.body.firstChild as Element;
		expect(mathElement instanceof Element).toBeTruthy();
		// Check if MathMLElement is available in this environment
		if (typeof MathMLElement !== "undefined") {
			expect(mathElement instanceof MathMLElement).toBeTruthy();
		}
		expect(mathElement.tagName).toBe("math");
		expect(mathElement.namespaceURI).toBe("http://www.w3.org/1998/Math/MathML");
		expect(mathElement.firstChild instanceof Text).toBeTruthy();
		expect(mathElement.firstChild!.nodeValue).toBe("Hello world");
	});

	test("quadratic formula", () => {
		renderer.render(
			<math xmlns="http://www.w3.org/1998/Math/MathML">
				<mrow>
					<mi>x</mi>
					<mo>=</mo>
					<mfrac>
						<mrow>
							<mo>-</mo>
							<mi>b</mi>
							<mo>±</mo>
							<msqrt>
								<msup>
									<mi>b</mi>
									<mn>2</mn>
								</msup>
								<mo>-</mo>
								<mn>4</mn>
								<mi>a</mi>
								<mi>c</mi>
							</msqrt>
						</mrow>
						<mrow>
							<mn>2</mn>
							<mi>a</mi>
						</mrow>
					</mfrac>
				</mrow>
			</math>,
			document.body,
		);

		const mathRoot = document.body.firstChild as Element;
		expect(mathRoot instanceof Element).toBeTruthy();
		if (typeof MathMLElement !== "undefined") {
			expect(mathRoot instanceof MathMLElement).toBeTruthy();
		}
		expect(mathRoot.tagName).toBe("math");
		expect(mathRoot.namespaceURI).toBe("http://www.w3.org/1998/Math/MathML");

		// Check that child elements are also in MathML namespace
		const mrow = mathRoot.firstChild as Element;
		expect(mrow instanceof Element).toBeTruthy();
		if (typeof MathMLElement !== "undefined") {
			expect(mrow instanceof MathMLElement).toBeTruthy();
		}
		expect(mrow.tagName).toBe("mrow");
		expect(mrow.namespaceURI).toBe("http://www.w3.org/1998/Math/MathML");

		const mi = mrow.firstChild as Element;
		expect(mi instanceof Element).toBeTruthy();
		if (typeof MathMLElement !== "undefined") {
			expect(mi instanceof MathMLElement).toBeTruthy();
		}
		expect(mi.tagName).toBe("mi");
		expect(mi.namespaceURI).toBe("http://www.w3.org/1998/Math/MathML");
		expect(mi.textContent).toBe("x");
	});

	test("mixed content with foreignObject-like behavior", () => {
		renderer.render(
			<math xmlns="http://www.w3.org/1998/Math/MathML">
				<mrow>
					<mi>f</mi>
					<mo>=</mo>
					<semantics>
						<mrow>
							<mi>x</mi>
							<mo>+</mo>
							<mn>1</mn>
						</mrow>
						<annotation-xml encoding="MathML-Content">
							{/* This would contain Content MathML */}
							<apply xmlns="http://www.w3.org/1998/Math/MathML">
								<plus />
								<ci>x</ci>
								<cn>1</cn>
							</apply>
						</annotation-xml>
					</semantics>
				</mrow>
			</math>,
			document.body,
		);

		const mathRoot = document.body.firstChild as Element;
		expect(mathRoot instanceof Element).toBeTruthy();
		if (typeof MathMLElement !== "undefined") {
			expect(mathRoot instanceof MathMLElement).toBeTruthy();
		}
		expect(mathRoot.namespaceURI).toBe("http://www.w3.org/1998/Math/MathML");

		// Check semantics element
		const semantics = mathRoot.querySelector("semantics");
		expect(semantics instanceof Element).toBeTruthy();
		if (typeof MathMLElement !== "undefined") {
			expect(semantics instanceof MathMLElement).toBeTruthy();
		}
		expect(semantics!.namespaceURI).toBe("http://www.w3.org/1998/Math/MathML");

		// Check annotation-xml element
		const annotationXML = mathRoot.querySelector("annotation-xml");
		expect(annotationXML instanceof Element).toBeTruthy();
		if (typeof MathMLElement !== "undefined") {
			expect(annotationXML instanceof MathMLElement).toBeTruthy();
		}
		expect(annotationXML!.namespaceURI).toBe(
			"http://www.w3.org/1998/Math/MathML",
		);
	});

	test("attributes work correctly", () => {
		renderer.render(
			<math xmlns="http://www.w3.org/1998/Math/MathML">
				<mfrac linethickness="2px">
					<mi>a</mi>
					<mi>b</mi>
				</mfrac>
			</math>,
			document.body,
		);

		const mfrac = document.body.firstChild!.firstChild as Element;
		expect(mfrac instanceof Element).toBeTruthy();
		if (typeof MathMLElement !== "undefined") {
			expect(mfrac instanceof MathMLElement).toBeTruthy();
		}
		expect(mfrac.tagName).toBe("mfrac");
		expect(mfrac.getAttribute("linethickness")).toBe("2px");
	});

	test("class attribute (not className)", () => {
		renderer.render(
			<math xmlns="http://www.w3.org/1998/Math/MathML">
				<mi class="variable">x</mi>
				<mo class="operator">+</mo>
				<mn class="number">1</mn>
			</math>,
			document.body,
		);

		const mi = document.body.firstChild!.childNodes[0] as Element;
		const mo = document.body.firstChild!.childNodes[1] as Element;
		const mn = document.body.firstChild!.childNodes[2] as Element;

		expect(mi instanceof Element).toBeTruthy();
		if (typeof MathMLElement !== "undefined") {
			expect(mi instanceof MathMLElement).toBeTruthy();
		}
		expect(mi.tagName).toBe("mi");
		expect(mi.getAttribute("class")).toBe("variable");

		expect(mo instanceof Element).toBeTruthy();
		if (typeof MathMLElement !== "undefined") {
			expect(mo instanceof MathMLElement).toBeTruthy();
		}
		expect(mo.tagName).toBe("mo");
		expect(mo.getAttribute("class")).toBe("operator");

		expect(mn instanceof Element).toBeTruthy();
		if (typeof MathMLElement !== "undefined") {
			expect(mn instanceof MathMLElement).toBeTruthy();
		}
		expect(mn.tagName).toBe("mn");
		expect(mn.getAttribute("class")).toBe("number");
	});

	test("non-string attribute values", () => {
		renderer.render(
			<math xmlns="http://www.w3.org/1998/Math/MathML">
				<mspace width={10} height={20.5} depth={null} />
			</math>,
			document.body,
		);

		const mspace = document.body.firstChild!.firstChild as Element;
		expect(mspace instanceof Element).toBeTruthy();
		if (typeof MathMLElement !== "undefined") {
			expect(mspace instanceof MathMLElement).toBeTruthy();
		}
		expect(mspace.tagName).toBe("mspace");
		expect(mspace.getAttribute("width")).toBe("10");
		expect(mspace.getAttribute("height")).toBe("20.5");
		expect(mspace.getAttribute("depth")).toBe(null);
	});

	test("custom attributes and data attributes", () => {
		renderer.render(
			<math xmlns="http://www.w3.org/1998/Math/MathML">
				<mi data-variable="x" customAttr="value">
					x
				</mi>
			</math>,
			document.body,
		);

		const mi = document.body.firstChild!.firstChild as Element;
		expect(mi instanceof Element).toBeTruthy();
		if (typeof MathMLElement !== "undefined") {
			expect(mi instanceof MathMLElement).toBeTruthy();
		}
		expect(mi.getAttribute("data-variable")).toBe("x");
		expect(mi.getAttribute("customAttr")).toBe("value");
		expect(mi.textContent).toBe("x");
	});

	test("nested math elements", () => {
		renderer.render(
			<div>
				<p>The solution is:</p>
				<math xmlns="http://www.w3.org/1998/Math/MathML">
					<mrow>
						<mi>x</mi>
						<mo>=</mo>
						<mn>42</mn>
					</mrow>
				</math>
				<p>That's the answer!</p>
			</div>,
			document.body,
		);

		const div = document.body.firstChild as Element;
		expect(div instanceof HTMLElement).toBeTruthy();
		expect(div.tagName).toBe("DIV");

		const mathElement = div.childNodes[1] as Element;
		expect(mathElement instanceof Element).toBeTruthy();
		if (typeof MathMLElement !== "undefined") {
			expect(mathElement instanceof MathMLElement).toBeTruthy();
		}
		expect(mathElement.tagName).toBe("math");
		expect(mathElement.namespaceURI).toBe("http://www.w3.org/1998/Math/MathML");

		const mrow = mathElement.firstChild as Element;
		if (typeof MathMLElement !== "undefined") {
			expect(mrow instanceof MathMLElement).toBeTruthy();
		}
		expect(mrow.namespaceURI).toBe("http://www.w3.org/1998/Math/MathML");
	});
});
