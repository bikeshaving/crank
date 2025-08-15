/// <ref lib="dom" />
import {suite} from "uvu";
import * as Assert from "uvu/assert";
import {Copy, createElement, Fragment, Raw} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("dom");
test.before.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test("simple", () => {
	renderer.render(<h1>Hello world</h1>, document.body);
	Assert.is(document.body.innerHTML, "<h1>Hello world</h1>");
});

test("multiple children", () => {
	renderer.render(
		<div>
			<span>1</span>
			<span>2</span>
			<span>3</span>
			<span>4</span>
		</div>,
		document.body,
	);

	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span><span>4</span></div>",
	);
});

test("nested children", () => {
	renderer.render(
		<div id="1">
			<div id="2">
				<div id="3">Hi</div>
			</div>
		</div>,
		document.body,
	);

	Assert.is(
		document.body.innerHTML,
		'<div id="1"><div id="2"><div id="3">Hi</div></div></div>',
	);

	const div1 = document.getElementById("1")!;
	renderer.render(<div id="1" />, document.body);
	Assert.is(document.body.innerHTML, '<div id="1"></div>');
	Assert.is(document.body.firstChild, div1);
});

test("boolean replaces nested children", () => {
	renderer.render(
		<div id="1">
			<div id="2">
				<div id="3">Hi</div>
			</div>
		</div>,
		document.body,
	);

	Assert.is(
		document.body.innerHTML,
		'<div id="1"><div id="2"><div id="3">Hi</div></div></div>',
	);

	const div1 = document.getElementById("1")!;
	const div2 = document.getElementById("2")!;
	renderer.render(
		<div id="1">
			<div id="2">{true}</div>
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, '<div id="1"><div id="2"></div></div>');
	Assert.is(document.body.firstChild, div1);
	Assert.is(document.body.firstChild!.firstChild, div2);
});

test("attrs", () => {
	renderer.render(
		<Fragment>
			<input id="toggle" type="checkbox" checked={true} data-checked={true} />
			<label for="toggle" />
		</Fragment>,
		document.body,
	);
	// this expectation is based on non-standard jsdom innerHTML behavior jsdom doesn‘t seem to reflect checked property
	Assert.is(
		document.body.innerHTML,
		'<input id="toggle" type="checkbox" data-checked=""><label for="toggle"></label>',
	);
	Assert.is((document.body.firstChild! as any).checked, true);
	renderer.render(
		<Fragment>
			<input id="toggle" type="checkbox" checked={false} data-checked={false} />
			<label for="toggle" class="inactive" />
		</Fragment>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		'<input id="toggle" type="checkbox"><label for="toggle" class="inactive"></label>',
	);
	Assert.is((document.body.firstChild! as any).checked, false);
});

test("doesn’t blow away user-created html when it doesn’t have to", () => {
	renderer.render(<div id="mount" />, document.body);
	Assert.is(document.body.innerHTML, '<div id="mount"></div>');
	document.getElementById("mount")!.innerHTML = "<span>Hello world</span>";
	Assert.is(
		document.body.innerHTML,
		'<div id="mount"><span>Hello world</span></div>',
	);
	renderer.render(<div id="mount" />, document.body);
	Assert.is(
		document.body.innerHTML,
		'<div id="mount"><span>Hello world</span></div>',
	);
});

test("rerender text", () => {
	renderer.render(<h1>Hello world 1</h1>, document.body);
	Assert.is(document.body.innerHTML, "<h1>Hello world 1</h1>");
	const h1 = document.body.firstChild!;
	Assert.is(h1.childNodes.length, 1);
	const text = h1.firstChild!;
	renderer.render(<h1>Hello {"world"} 2</h1>, document.body);
	Assert.is(document.body.innerHTML, "<h1>Hello world 2</h1>");
	Assert.is(document.body.firstChild!, h1);
	Assert.is(h1.childNodes.length, 3);
	Assert.is(document.body.firstChild!.childNodes[0] as Text, text);
	Assert.is((document.body.firstChild!.childNodes[0] as Text).data, "Hello ");
	Assert.is((document.body.firstChild!.childNodes[1] as Text).data, "world");
	Assert.is((document.body.firstChild!.childNodes[2] as Text).data, " 2");
	const text1 = document.body.firstChild!.childNodes[1] as Text;
	const text2 = document.body.firstChild!.childNodes[2] as Text;
	renderer.render(<h1>Hello world {3}</h1>, document.body);
	Assert.is(document.body.innerHTML, "<h1>Hello world 3</h1>");
	Assert.is(document.body.firstChild!, h1);
	Assert.is(h1.childNodes.length, 2);
	Assert.is(document.body.firstChild!.childNodes[0] as Text, text);
	Assert.is(document.body.firstChild!.childNodes[1] as Text, text1);
	Assert.is(text2.parentNode, null);
});

test("rerender different child", () => {
	renderer.render(
		<div>
			<h1>Hello world</h1>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><h1>Hello world</h1></div>");
	const div = document.body.firstChild!;
	renderer.render(
		<div>
			<h2>Hello world</h2>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><h2>Hello world</h2></div>");
	Assert.is(document.body.firstChild!, div);
});

test("rerender text with children", () => {
	renderer.render(<div>Hello world</div>, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello world</div>");
	const div = document.body.firstChild!;
	renderer.render(
		<div>
			<span>1</span>
			<span>2</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>1</span><span>2</span></div>");
	Assert.is(document.body.firstChild!, div);
});

test("rerender children with text", () => {
	renderer.render(
		<div>
			<span>1</span>
			<span>2</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>1</span><span>2</span></div>");
	const div = document.body.firstChild!;
	renderer.render(<div>Hello world</div>, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello world</div>");
	Assert.is(document.body.firstChild!, div);
});

test("rerender more children", () => {
	renderer.render(
		<div>
			<span>1</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	const div = document.body.firstChild!;
	const span = div.firstChild!;
	renderer.render(
		<div>
			<span>1</span>
			<span>2</span>
			<span>3</span>
			<span>4</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span><span>4</span></div>",
	);
	Assert.is(document.body.firstChild!, div);
	Assert.is(document.body.firstChild!.firstChild, span);
});

test("rerender fewer children", () => {
	renderer.render(
		<div>
			<span>1</span>
			<span>2</span>
			<span>3</span>
			<span>4</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span><span>4</span></div>",
	);
	const div = document.body.firstChild!;
	const span = div.firstChild!;
	renderer.render(
		<div>
			<span>1</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	Assert.is(document.body.firstChild!, div);
	Assert.is(document.body.firstChild!.firstChild, span);
});

test("null and undefined", () => {
	renderer.render(<h1>Hello world</h1>, document.body);
	Assert.is(document.body.innerHTML, "<h1>Hello world</h1>");
	renderer.render(null, document.body);
	Assert.is(document.body.innerHTML, "");
	renderer.render(<h1>Hello again</h1>, document.body);
	Assert.is(document.body.innerHTML, "<h1>Hello again</h1>");
	renderer.render(undefined, document.body);
	Assert.is(document.body.innerHTML, "");
});

test("fragment", () => {
	renderer.render(
		<Fragment>
			<span>1</span>
			<span>2</span>
		</Fragment>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<span>1</span><span>2</span>");
	const span1 = document.body.childNodes[0];
	const span2 = document.body.childNodes[1];
	renderer.render(
		<Fragment>
			<span>1</span>
			<span>2</span>
			<span>3</span>
		</Fragment>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<span>1</span><span>2</span><span>3</span>",
	);
	Assert.is(document.body.childNodes[0], span1);
	Assert.is(document.body.childNodes[1], span2);
});

test("fragment with null and undefined", () => {
	renderer.render(
		<Fragment>
			{null}
			{undefined}
		</Fragment>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "");
	renderer.render(
		<Fragment>
			<span>1</span>
			<span>2</span>
		</Fragment>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<span>1</span><span>2</span>");
});

test("iterable", () => {
	renderer.render(["1", 2, <div>3</div>], document.body);
	Assert.is(document.body.innerHTML, "12<div>3</div>");
	renderer.render(null, document.body);
	Assert.is(document.body.innerHTML, "");
});

test("array", () => {
	renderer.render(
		<div>
			<span>1</span>
			{[<span>2</span>, <span>3</span>]}
			<span>4</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span><span>4</span></div>",
	);
	const span1 = document.body.firstChild!.childNodes[0];
	const span4 = document.body.firstChild!.childNodes[3];
	renderer.render(
		<div>
			<span>1</span>
			{[]}
			<span>4</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>1</span><span>4</span></div>");
	Assert.is(document.body.firstChild!.childNodes[0], span1);
	Assert.is(document.body.firstChild!.childNodes[1], span4);
});

test("nested arrays", () => {
	renderer.render(
		<div>
			<span>1</span>
			{[<span>2</span>, [<span>3</span>, <span>4</span>], <span>5</span>]}
			<span>6</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span></div>",
	);
	const span1 = document.body.firstChild!.childNodes[0];
	const span2 = document.body.firstChild!.childNodes[1];
	const span3 = document.body.firstChild!.childNodes[2];
	const span6 = document.body.firstChild!.childNodes[5];
	renderer.render(
		<div>
			<span>1</span>
			{[<span>2</span>, [<span>4</span>]]}
			<span>6</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>4</span><span>6</span></div>",
	);
	Assert.is(document.body.firstChild!.childNodes[0], span1);
	Assert.is(document.body.firstChild!.childNodes[1], span2);
	Assert.is(document.body.firstChild!.childNodes[2], span3);
	Assert.is(document.body.firstChild!.childNodes[3], span6);
});

test("raw html", () => {
	const html = '<span id="raw">Hi</span>';
	renderer.render(
		<div>
			Raw: <Raw value={html} />
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		'<div>Raw: <span id="raw">Hi</span></div>',
	);
	Assert.ok(document.getElementById("raw"));
});

test("raw svg", () => {
	const html = '<circle cx="5" cy="5" r="5" />';
	renderer.render(
		<svg>
			Raw: <Raw value={html} />
		</svg>,
		document.body,
	);

	Assert.is(
		document.body.innerHTML,
		'<svg>Raw: <circle cx="5" cy="5" r="5"></circle></svg>',
	);

	Assert.ok(
		document.body.firstChild!.childNodes[1] instanceof SVGCircleElement,
	);
});

test("raw node", () => {
	var template = document.createElement("template");
	template.innerHTML = '<span id="raw">Hi</span>';
	const span = template.content.firstChild!;
	renderer.render(
		<div>
			Raw: <Raw value={span} />
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		'<div>Raw: <span id="raw">Hi</span></div>',
	);
	Assert.ok(document.getElementById("raw"));
});

test("raw changes", () => {
	let html = '<span id="raw">Hi</span>';
	renderer.render(
		<div>
			Raw: <Raw value={html} />
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		'<div>Raw: <span id="raw">Hi</span></div>',
	);

	html = "RAWRAWRAW<div>Raw</div>RAWRAWRAW";
	renderer.render(
		<div>
			Raw: <Raw value={html} />
		</div>,
		document.body,
	);

	Assert.is(
		document.body.innerHTML,
		"<div>Raw: RAWRAWRAW<div>Raw</div>RAWRAWRAW</div>",
	);
});

test("style text", () => {
	renderer.render(<div style="display: none" />, document.body);
	Assert.is(document.body.innerHTML, '<div style="display: none;"></div>');
	Assert.is((document.body.firstChild as HTMLElement).style.display, "none");
});

test("style object", () => {
	renderer.render(
		<div style={{display: "none", "margin-top": "30px"}} />,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		'<div style="display: none; margin-top: 30px;"></div>',
	);
	Assert.is((document.body.firstChild as HTMLElement).style.display, "none");
	Assert.is((document.body.firstChild as HTMLElement).style.marginTop, "30px");
});

test("style text to object", () => {
	renderer.render(<div style="font-weight: bold" />, document.body);

	Assert.is(document.body.innerHTML, '<div style="font-weight: bold;"></div>');

	renderer.render(<div style={{color: "goldenrod"}} />, document.body);

	Assert.is(document.body.innerHTML, '<div style="color: goldenrod;"></div>');
});

test("outside DOM mutations", () => {
	renderer.render(<div />, document.body);

	const div = document.body.firstChild as HTMLDivElement;
	div.innerHTML = "<span>child</span>";
	renderer.render(<div />, document.body);

	Assert.is(document.body.innerHTML, "<div><span>child</span></div>");
	renderer.render(<div>{[]}</div>, document.body);

	Assert.is(document.body.innerHTML, "<div><span>child</span></div>");
	div.innerHTML = "<span>child</span>";
	renderer.render(<div>{null}</div>, document.body);
	Assert.is(document.body.innerHTML, "<div><span>child</span></div>");
});

test("unknown attribute", () => {
	renderer.render(
		<div
			unknown="value"
			unknown-attribute="value"
			data-unknown-attribute="value"
		/>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		'<div unknown="value" unknown-attribute="value" data-unknown-attribute="value"></div>',
	);

	const div = document.body.firstChild as HTMLDivElement;
	Assert.is(div.getAttribute("unknown"), "value");
	Assert.is(div.getAttribute("unknown-attribute"), "value");
	Assert.is(div.getAttribute("data-unknown-attribute"), "value");
});

test("removing props", () => {
	const input = renderer.render(
		<input dir="rtl" autofocus={true} value="hello" />,
		document.body,
	) as any;

	Assert.is(input.dir, "rtl");
	Assert.is(input.autofocus, true);
	renderer.render(<input />, document.body);
	Assert.is(input.dir, "");
	Assert.is(input.autofocus, false);
});

test("removing styles", () => {
	const div = renderer.render(
		<div style={{color: "red", "background-color": "blue"}} />,
		document.body,
	) as any;

	Assert.is(div.style.color, "red");
	Assert.is(div.style.backgroundColor, "blue");
	renderer.render(<div style={{color: "red"}} />, document.body) as any;
	Assert.is(div.style.color, "red");
	Assert.is(div.style.backgroundColor, "");
});

test("style object camelCase", () => {
	renderer.render(
		<div
			style={{
				fontSize: "16px",
				backgroundColor: "red",
				marginTop: "10px",
				borderRadius: "4px",
				WebkitTransform: "rotate(45deg)",
			}}
		/>,
		document.body,
	);

	// Check HTML output has kebab-case properties
	// Note: Browser normalizes -webkit-transform to transform in innerHTML
	const expectedHTML =
		'<div style="font-size: 16px; background-color: red; margin-top: 10px; border-radius: 4px; transform: rotate(45deg);"></div>';
	Assert.is(document.body.innerHTML, expectedHTML);

	// Check DOM element properties are accessible via camelCase
	const div = document.body.firstChild as HTMLElement;
	Assert.is(div.style.fontSize, "16px");
	Assert.is(div.style.backgroundColor, "red");
	Assert.is(div.style.marginTop, "10px");
	Assert.is(div.style.borderRadius, "4px");
	// Browser normalizes WebkitTransform to transform
	Assert.is(div.style.transform, "rotate(45deg)");
});

test("style object numeric values with px conversion", () => {
	renderer.render(
		<div
			style={{width: 100, height: 200, opacity: 0.5, zIndex: 10, fontSize: 16}}
		/>,
		document.body,
	);

	// Check HTML output - numeric values should have px added except for unitless properties
	const expectedHTML =
		'<div style="width: 100px; height: 200px; opacity: 0.5; z-index: 10; font-size: 16px;"></div>';
	Assert.is(document.body.innerHTML, expectedHTML);

	// Check DOM element properties
	const div = document.body.firstChild as HTMLElement;
	Assert.is(div.style.width, "100px");
	Assert.is(div.style.height, "200px");
	Assert.is(div.style.opacity, "0.5");
	Assert.is(div.style.zIndex, "10");
	Assert.is(div.style.fontSize, "16px");
});

test("uncontrolled props", () => {
	const input = renderer.render(<input value="hello" />, document.body) as any;
	Assert.ok(input instanceof HTMLInputElement);
	Assert.is(input.value, "hello");
	input.value = "world";
	Assert.is(input.value, "world");
	renderer.render(<input value={Copy} />, document.body);
});

test("default props", () => {
	renderer.render(
		<Fragment>
			<input />
			<input type="text" />
		</Fragment>,
		document.body,
	);
	Assert.equal(document.querySelectorAll("input").length, 2);
	Assert.equal(document.querySelectorAll('input[type="text"]').length, 1);
});

test("set/unset default props", () => {
	// Attribute should be set on initial render.
	renderer.render(<input type="text" />, document.body);
	Assert.equal(document.querySelectorAll('input[type="text"]').length, 1);

	// Remove attribute.
	renderer.render(<input />, document.body);
	Assert.equal(document.querySelectorAll('input[type="text"]').length, 0);

	// Attribute should also be set on subsequent renders if it was previously missing.
	renderer.render(<input type="text" />, document.body);
	Assert.equal(document.querySelectorAll('input[type="text"]').length, 1);
});

test("prop: prefix forces prop", () => {
	let el: any;
	renderer.render(
		<custom-el prop:prop="value" ref={(el1: any) => (el = el1)} />,
		document.body,
	);
	Assert.is(el.prop, "value");
});

test("attr: prefix forces attribute", () => {
	let el: any;
	renderer.render(<custom-el ref={(el1: any) => (el = el1)} />, document.body);
	el.attr = "value";
	renderer.render(<custom-el attr:attr="other" />, document.body);
	Assert.is(el.getAttribute("attr"), "other");
	Assert.is(el.attr, "value");
});

test("object classnames basic", () => {
	renderer.render(
		<div
			class={{
				active: true,
				disabled: false,
				primary: true,
			}}
		>
			Test
		</div>,
		document.body,
	);

	const element = document.querySelector("div")!;
	Assert.ok(element.classList.contains("active"));
	Assert.not.ok(element.classList.contains("disabled"));
	Assert.ok(element.classList.contains("primary"));
});

test("object classnames update", () => {
	renderer.render(
		<div
			class={{
				active: true,
				disabled: false,
				primary: true,
			}}
		>
			Test
		</div>,
		document.body,
	);

	let element = document.querySelector("div")!;
	Assert.ok(element.classList.contains("active"));
	Assert.ok(element.classList.contains("primary"));
	Assert.not.ok(element.classList.contains("disabled"));
	Assert.not.ok(element.classList.contains("warning"));

	// Update classnames
	renderer.render(
		<div
			class={{
				active: false,
				disabled: true,
				primary: true,
				warning: true,
			}}
		>
			Test
		</div>,
		document.body,
	);

	element = document.querySelector("div")!;
	Assert.not.ok(element.classList.contains("active"));
	Assert.ok(element.classList.contains("disabled"));
	Assert.ok(element.classList.contains("primary"));
	Assert.ok(element.classList.contains("warning"));
});

test("object classnames string to object transition", () => {
	// Start with string classnames
	renderer.render(<div class="string-class other">Test</div>, document.body);

	let element = document.querySelector("div")!;
	Assert.ok(element.classList.contains("string-class"));
	Assert.ok(element.classList.contains("other"));

	// Switch to object classnames (should clear old string classes)
	renderer.render(
		<div
			class={{
				"object-class": true,
				"new-class": true,
			}}
		>
			Test
		</div>,
		document.body,
	);

	element = document.querySelector("div")!;
	Assert.not.ok(element.classList.contains("string-class"));
	Assert.not.ok(element.classList.contains("other"));
	Assert.ok(element.classList.contains("object-class"));
	Assert.ok(element.classList.contains("new-class"));
});

test("object classnames object to string transition", () => {
	// Start with object classnames
	renderer.render(
		<div
			class={{
				"object-class": true,
				"another-class": true,
			}}
		>
			Test
		</div>,
		document.body,
	);

	let element = document.querySelector("div")!;
	Assert.ok(element.classList.contains("object-class"));
	Assert.ok(element.classList.contains("another-class"));

	// Switch to string classnames (completely replaces class attribute)
	renderer.render(<div class="string-class final">Test</div>, document.body);

	element = document.querySelector("div")!;
	Assert.ok(element.classList.contains("string-class"));
	Assert.ok(element.classList.contains("final"));
	Assert.not.ok(element.classList.contains("object-class"));
	Assert.not.ok(element.classList.contains("another-class"));
});

test.run();
