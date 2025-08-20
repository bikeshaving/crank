import {suite} from "uvu";
import * as Assert from "uvu/assert";
import {createElement} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("mathml");
test.before.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test("simple math element", () => {
	renderer.render(<math>Hello world</math>, document.body);
	const mathElement = document.body.firstChild as Element;
	Assert.ok(mathElement instanceof Element);
	// Check if MathMLElement is available in this environment
	if (typeof MathMLElement !== "undefined") {
		Assert.ok(mathElement instanceof MathMLElement);
	}
	Assert.is(mathElement.tagName, "math");
	Assert.is(mathElement.namespaceURI, "http://www.w3.org/1998/Math/MathML");
	Assert.ok(mathElement.firstChild instanceof Text);
	Assert.is(mathElement.firstChild!.nodeValue, "Hello world");
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
	Assert.ok(mathRoot instanceof Element);
	if (typeof MathMLElement !== "undefined") {
		Assert.ok(mathRoot instanceof MathMLElement);
	}
	Assert.is(mathRoot.tagName, "math");
	Assert.is(mathRoot.namespaceURI, "http://www.w3.org/1998/Math/MathML");

	// Check that child elements are also in MathML namespace
	const mrow = mathRoot.firstChild as Element;
	Assert.ok(mrow instanceof Element);
	if (typeof MathMLElement !== "undefined") {
		Assert.ok(mrow instanceof MathMLElement);
	}
	Assert.is(mrow.tagName, "mrow");
	Assert.is(mrow.namespaceURI, "http://www.w3.org/1998/Math/MathML");

	const mi = mrow.firstChild as Element;
	Assert.ok(mi instanceof Element);
	if (typeof MathMLElement !== "undefined") {
		Assert.ok(mi instanceof MathMLElement);
	}
	Assert.is(mi.tagName, "mi");
	Assert.is(mi.namespaceURI, "http://www.w3.org/1998/Math/MathML");
	Assert.is(mi.textContent, "x");
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
	Assert.ok(mathRoot instanceof Element);
	Assert.is(mathRoot.namespaceURI, "http://www.w3.org/1998/Math/MathML");

	// Check semantics element
	const semantics = mathRoot.querySelector("semantics");
	Assert.ok(semantics instanceof Element);
	Assert.is(semantics.namespaceURI, "http://www.w3.org/1998/Math/MathML");

	// Check annotation-xml element
	const annotationXml = mathRoot.querySelector("annotation-xml");
	Assert.ok(annotationXml instanceof Element);
	Assert.is(annotationXml.namespaceURI, "http://www.w3.org/1998/Math/MathML");
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
	Assert.ok(mfrac instanceof Element);
	Assert.is(mfrac.tagName, "mfrac");
	Assert.is(mfrac.getAttribute("linethickness"), "2px");
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

	Assert.ok(mi instanceof Element);
	Assert.is(mi.tagName, "mi");
	Assert.is(mi.getAttribute("class"), "variable");

	Assert.ok(mo instanceof Element);
	Assert.is(mo.tagName, "mo");
	Assert.is(mo.getAttribute("class"), "operator");

	Assert.ok(mn instanceof Element);
	Assert.is(mn.tagName, "mn");
	Assert.is(mn.getAttribute("class"), "number");
});

test("non-string attribute values", () => {
	renderer.render(
		<math xmlns="http://www.w3.org/1998/Math/MathML">
			<mspace width={10} height={20.5} depth={null} />
		</math>,
		document.body,
	);

	const mspace = document.body.firstChild!.firstChild as Element;
	Assert.ok(mspace instanceof Element);
	Assert.is(mspace.tagName, "mspace");
	Assert.is(mspace.getAttribute("width"), "10");
	Assert.is(mspace.getAttribute("height"), "20.5");
	Assert.is(mspace.getAttribute("depth"), null);
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
	Assert.ok(mi instanceof Element);
	Assert.is(mi.getAttribute("data-variable"), "x");
	Assert.is(mi.getAttribute("customAttr"), "value");
	Assert.is(mi.textContent, "x");
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
	Assert.ok(div instanceof HTMLElement);
	Assert.is(div.tagName, "DIV");

	const mathElement = div.childNodes[1] as Element;
	Assert.ok(mathElement instanceof Element);
	Assert.is(mathElement.tagName, "math");
	Assert.is(mathElement.namespaceURI, "http://www.w3.org/1998/Math/MathML");

	const mrow = mathElement.firstChild as Element;
	Assert.is(mrow.namespaceURI, "http://www.w3.org/1998/Math/MathML");
});

test.run();
