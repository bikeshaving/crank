import {describe, test, beforeEach, afterEach, expect} from "@b9g/libuild/test";
/// <ref lib="dom" />
import {Copy, Fragment, Raw} from "../src/crank.js";
import type {Context, createElement} from "../src/crank.js";
import {renderer} from "../src/dom.js";

describe("dom", () => {
	beforeEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("simple", () => {
		renderer.render(<h1>Hello world</h1>, document.body);
		expect(document.body.innerHTML).toBe("<h1>Hello world</h1>");
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

		expect(document.body.innerHTML).toBe(
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

		expect(document.body.innerHTML).toBe(
			'<div id="1"><div id="2"><div id="3">Hi</div></div></div>',
		);

		const div1 = document.getElementById("1")!;
		renderer.render(<div id="1" />, document.body);
		expect(document.body.innerHTML).toBe('<div id="1"></div>');
		expect(document.body.firstChild).toBe(div1);
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

		expect(document.body.innerHTML).toBe(
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

		expect(document.body.innerHTML).toBe(
			'<div id="1"><div id="2"></div></div>',
		);
		expect(document.body.firstChild).toBe(div1);
		expect(document.body.firstChild!.firstChild).toBe(div2);
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
		expect(document.body.innerHTML).toBe(
			'<input id="toggle" type="checkbox" data-checked=""><label for="toggle"></label>',
		);
		expect((document.body.firstChild! as any).checked).toBe(true);
		renderer.render(
			<Fragment>
				<input
					id="toggle"
					type="checkbox"
					checked={false}
					data-checked={false}
				/>
				<label for="toggle" class="inactive" />
			</Fragment>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			'<input id="toggle" type="checkbox"><label for="toggle" class="inactive"></label>',
		);
		expect((document.body.firstChild! as any).checked).toBe(false);
	});

	test("doesn’t blow away user-created html when it doesn’t have to", () => {
		renderer.render(<div id="mount" />, document.body);
		expect(document.body.innerHTML).toBe('<div id="mount"></div>');
		document.getElementById("mount")!.innerHTML = "<span>Hello world</span>";
		expect(document.body.innerHTML).toBe(
			'<div id="mount"><span>Hello world</span></div>',
		);
		renderer.render(<div id="mount" />, document.body);
		expect(document.body.innerHTML).toBe(
			'<div id="mount"><span>Hello world</span></div>',
		);
	});

	test("rerender text", () => {
		renderer.render(<h1>Hello world 1</h1>, document.body);
		expect(document.body.innerHTML).toBe("<h1>Hello world 1</h1>");
		const h1 = document.body.firstChild!;
		expect(h1.childNodes.length).toBe(1);
		const text = h1.firstChild!;
		renderer.render(<h1>Hello {"world"} 2</h1>, document.body);
		expect(document.body.innerHTML).toBe("<h1>Hello world 2</h1>");
		expect(document.body.firstChild!).toBe(h1);
		expect(h1.childNodes.length).toBe(3);
		expect(document.body.firstChild!.childNodes[0] as Text).toBe(text);
		expect((document.body.firstChild!.childNodes[0] as Text).data).toBe(
			"Hello ",
		);
		expect((document.body.firstChild!.childNodes[1] as Text).data).toBe(
			"world",
		);
		expect((document.body.firstChild!.childNodes[2] as Text).data).toBe(" 2");
		const text1 = document.body.firstChild!.childNodes[1] as Text;
		const text2 = document.body.firstChild!.childNodes[2] as Text;
		renderer.render(<h1>Hello world {3}</h1>, document.body);
		expect(document.body.innerHTML).toBe("<h1>Hello world 3</h1>");
		expect(document.body.firstChild!).toBe(h1);
		expect(h1.childNodes.length).toBe(2);
		expect(document.body.firstChild!.childNodes[0] as Text).toBe(text);
		expect(document.body.firstChild!.childNodes[1] as Text).toBe(text1);
		expect(text2.parentNode).toBe(null);
	});

	test("rerender different child", () => {
		renderer.render(
			<div>
				<h1>Hello world</h1>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><h1>Hello world</h1></div>");
		const div = document.body.firstChild!;
		renderer.render(
			<div>
				<h2>Hello world</h2>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><h2>Hello world</h2></div>");
		expect(document.body.firstChild!).toBe(div);
	});

	test("rerender text with children", () => {
		renderer.render(<div>Hello world</div>, document.body);
		expect(document.body.innerHTML).toBe("<div>Hello world</div>");
		const div = document.body.firstChild!;
		renderer.render(
			<div>
				<span>1</span>
				<span>2</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>2</span></div>",
		);
		expect(document.body.firstChild!).toBe(div);
	});

	test("rerender children with text", () => {
		renderer.render(
			<div>
				<span>1</span>
				<span>2</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>2</span></div>",
		);
		const div = document.body.firstChild!;
		renderer.render(<div>Hello world</div>, document.body);
		expect(document.body.innerHTML).toBe("<div>Hello world</div>");
		expect(document.body.firstChild!).toBe(div);
	});

	test("rerender more children", () => {
		renderer.render(
			<div>
				<span>1</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>1</span></div>");
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
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>2</span><span>3</span><span>4</span></div>",
		);
		expect(document.body.firstChild!).toBe(div);
		expect(document.body.firstChild!.firstChild).toBe(span);
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
		expect(document.body.innerHTML).toBe(
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
		expect(document.body.innerHTML).toBe("<div><span>1</span></div>");
		expect(document.body.firstChild!).toBe(div);
		expect(document.body.firstChild!.firstChild).toBe(span);
	});

	test("null and undefined", () => {
		renderer.render(<h1>Hello world</h1>, document.body);
		expect(document.body.innerHTML).toBe("<h1>Hello world</h1>");
		renderer.render(null, document.body);
		expect(document.body.innerHTML).toBe("");
		renderer.render(<h1>Hello again</h1>, document.body);
		expect(document.body.innerHTML).toBe("<h1>Hello again</h1>");
		renderer.render(undefined, document.body);
		expect(document.body.innerHTML).toBe("");
	});

	test("fragment", () => {
		renderer.render(
			<Fragment>
				<span>1</span>
				<span>2</span>
			</Fragment>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<span>1</span><span>2</span>");
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
		expect(document.body.innerHTML).toBe(
			"<span>1</span><span>2</span><span>3</span>",
		);
		expect(document.body.childNodes[0]).toBe(span1);
		expect(document.body.childNodes[1]).toBe(span2);
	});

	test("fragment with null and undefined", () => {
		renderer.render(
			<Fragment>
				{null}
				{undefined}
			</Fragment>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("");
		renderer.render(
			<Fragment>
				<span>1</span>
				<span>2</span>
			</Fragment>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<span>1</span><span>2</span>");
	});

	test("iterable", () => {
		renderer.render(["1", 2, <div>3</div>], document.body);
		expect(document.body.innerHTML).toBe("12<div>3</div>");
		renderer.render(null, document.body);
		expect(document.body.innerHTML).toBe("");
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
		expect(document.body.innerHTML).toBe(
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
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>4</span></div>",
		);
		expect(document.body.firstChild!.childNodes[0]).toBe(span1);
		expect(document.body.firstChild!.childNodes[1]).toBe(span4);
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
		expect(document.body.innerHTML).toBe(
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
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>2</span><span>4</span><span>6</span></div>",
		);
		expect(document.body.firstChild!.childNodes[0]).toBe(span1);
		expect(document.body.firstChild!.childNodes[1]).toBe(span2);
		expect(document.body.firstChild!.childNodes[2]).toBe(span3);
		expect(document.body.firstChild!.childNodes[3]).toBe(span6);
	});

	test("raw html", () => {
		const html = '<span id="raw">Hi</span>';
		renderer.render(
			<div>
				Raw: <Raw value={html} />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			'<div>Raw: <span id="raw">Hi</span></div>',
		);
		expect(document.getElementById("raw")).toBeTruthy();
	});

	test("raw svg", () => {
		const html = '<circle cx="5" cy="5" r="5" />';
		renderer.render(
			<svg>
				Raw: <Raw value={html} />
			</svg>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			'<svg>Raw: <circle cx="5" cy="5" r="5"></circle></svg>',
		);

		expect(
			document.body.firstChild!.childNodes[1] instanceof SVGCircleElement,
		).toBeTruthy();
	});

	test("raw node", () => {
		const template = document.createElement("template");
		template.innerHTML = '<span id="raw">Hi</span>';
		const span = template.content.firstChild!;
		renderer.render(
			<div>
				Raw: <Raw value={span} />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			'<div>Raw: <span id="raw">Hi</span></div>',
		);
		expect(document.getElementById("raw")).toBeTruthy();
	});

	test("raw changes", () => {
		let html = '<span id="raw">Hi</span>';
		renderer.render(
			<div>
				Raw: <Raw value={html} />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			'<div>Raw: <span id="raw">Hi</span></div>',
		);

		html = "RAWRAWRAW<div>Raw</div>RAWRAWRAW";
		renderer.render(
			<div>
				Raw: <Raw value={html} />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			"<div>Raw: RAWRAWRAW<div>Raw</div>RAWRAWRAW</div>",
		);
	});

	test("style text", () => {
		renderer.render(<div style="display: none" />, document.body);
		expect(document.body.innerHTML).toBe('<div style="display: none;"></div>');
		expect((document.body.firstChild as HTMLElement).style.display).toBe(
			"none",
		);
	});

	test("style object", () => {
		renderer.render(
			<div style={{display: "none", "margin-top": "30px"}} />,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			'<div style="display: none; margin-top: 30px;"></div>',
		);
		expect((document.body.firstChild as HTMLElement).style.display).toBe(
			"none",
		);
		expect((document.body.firstChild as HTMLElement).style.marginTop).toBe(
			"30px",
		);
	});

	test("style text to object", () => {
		renderer.render(<div style="font-weight: bold" />, document.body);

		expect(document.body.innerHTML).toBe(
			'<div style="font-weight: bold;"></div>',
		);

		renderer.render(<div style={{color: "goldenrod"}} />, document.body);

		expect(document.body.innerHTML).toBe(
			'<div style="color: goldenrod;"></div>',
		);
	});

	test("outside DOM mutations", () => {
		renderer.render(<div />, document.body);

		const div = document.body.firstChild as HTMLDivElement;
		div.innerHTML = "<span>child</span>";
		renderer.render(<div />, document.body);

		expect(document.body.innerHTML).toBe("<div><span>child</span></div>");
		renderer.render(<div>{[]}</div>, document.body);

		expect(document.body.innerHTML).toBe("<div><span>child</span></div>");
		div.innerHTML = "<span>child</span>";
		renderer.render(<div>{null}</div>, document.body);
		expect(document.body.innerHTML).toBe("<div><span>child</span></div>");
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
		expect(document.body.innerHTML).toBe(
			'<div unknown="value" unknown-attribute="value" data-unknown-attribute="value"></div>',
		);

		const div = document.body.firstChild as HTMLDivElement;
		expect(div.getAttribute("unknown")).toBe("value");
		expect(div.getAttribute("unknown-attribute")).toBe("value");
		expect(div.getAttribute("data-unknown-attribute")).toBe("value");
	});

	test("removing props", () => {
		const input = renderer.render(
			<input dir="rtl" autofocus={true} value="hello" />,
			document.body,
		) as any;

		expect(input.dir).toBe("rtl");
		expect(input.autofocus).toBe(true);
		renderer.render(<input />, document.body);
		expect(input.dir).toBe("");
		expect(input.autofocus).toBe(false);
	});

	test("removing styles", () => {
		const div = renderer.render(
			<div style={{color: "red", "background-color": "blue"}} />,
			document.body,
		) as any;

		expect(div.style.color).toBe("red");
		expect(div.style.backgroundColor).toBe("blue");
		renderer.render(<div style={{color: "red"}} />, document.body) as any;
		expect(div.style.color).toBe("red");
		expect(div.style.backgroundColor).toBe("");
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
		expect(document.body.innerHTML).toBe(expectedHTML);

		// Check DOM element properties are accessible via camelCase
		const div = document.body.firstChild as HTMLElement;
		expect(div.style.fontSize).toBe("16px");
		expect(div.style.backgroundColor).toBe("red");
		expect(div.style.marginTop).toBe("10px");
		expect(div.style.borderRadius).toBe("4px");
		// Browser normalizes WebkitTransform to transform
		expect(div.style.transform).toBe("rotate(45deg)");
	});

	test("style object numeric values with px conversion", () => {
		renderer.render(
			<div
				style={{
					width: 100,
					height: 200,
					opacity: 0.5,
					zIndex: 10,
					fontSize: 16,
				}}
			/>,
			document.body,
		);

		// Check HTML output - numeric values should have px added except for unitless properties
		const expectedHTML =
			'<div style="width: 100px; height: 200px; opacity: 0.5; z-index: 10; font-size: 16px;"></div>';
		expect(document.body.innerHTML).toBe(expectedHTML);

		// Check DOM element properties
		const div = document.body.firstChild as HTMLElement;
		expect(div.style.width).toBe("100px");
		expect(div.style.height).toBe("200px");
		expect(div.style.opacity).toBe("0.5");
		expect(div.style.zIndex).toBe("10");
		expect(div.style.fontSize).toBe("16px");
	});

	test("uncontrolled props", () => {
		const input = renderer.render(
			<input value="hello" />,
			document.body,
		) as any;
		expect(input instanceof HTMLInputElement).toBeTruthy();
		expect(input.value).toBe("hello");
		input.value = "world";
		expect(input.value).toBe("world");
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
		expect(document.querySelectorAll("input").length).toEqual(2);
		expect(document.querySelectorAll('input[type="text"]').length).toEqual(1);
	});

	test("set/unset default props", () => {
		// Attribute should be set on initial render.
		renderer.render(<input type="text" />, document.body);
		expect(document.querySelectorAll('input[type="text"]').length).toEqual(1);

		// Remove attribute.
		renderer.render(<input />, document.body);
		expect(document.querySelectorAll('input[type="text"]').length).toEqual(0);

		// Attribute should also be set on subsequent renders if it was previously missing.
		renderer.render(<input type="text" />, document.body);
		expect(document.querySelectorAll('input[type="text"]').length).toEqual(1);
	});

	test("prop: prefix forces prop", () => {
		let el: any;
		renderer.render(
			<custom-el prop:prop="value" ref={(el1: any) => (el = el1)} />,
			document.body,
		);
		expect(el.prop).toBe("value");
	});

	test("attr: prefix forces attribute", () => {
		let el: any;
		renderer.render(
			<custom-el ref={(el1: any) => (el = el1)} />,
			document.body,
		);
		el.attr = "value";
		renderer.render(<custom-el attr:attr="other" />, document.body);
		expect(el.getAttribute("attr")).toBe("other");
		expect(el.attr).toBe("value");
	});

	test("attr: prefix removes attribute when null", () => {
		renderer.render(<div attr:data-x="hello" />, document.body);
		const div = document.body.firstChild as HTMLElement;
		expect(div.getAttribute("data-x")).toBe("hello");

		renderer.render(<div attr:data-x={null} />, document.body);
		expect(div.getAttribute("data-x")).toBe(null);
	});

	test("attr: prefix removes attribute when false", () => {
		renderer.render(<div attr:data-x="hello" />, document.body);
		const div = document.body.firstChild as HTMLElement;
		expect(div.getAttribute("data-x")).toBe("hello");

		renderer.render(<div attr:data-x={false} />, document.body);
		expect(div.getAttribute("data-x")).toBe(null);
	});

	test("attr: prefix sets empty string when true", () => {
		renderer.render(<div attr:data-x={true} />, document.body);
		const div = document.body.firstChild as HTMLElement;
		expect(div.getAttribute("data-x")).toBe("");
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
		expect(element.classList.contains("active")).toBeTruthy();
		expect(element.classList.contains("disabled")).toBeFalsy();
		expect(element.classList.contains("primary")).toBeTruthy();
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
		expect(element.classList.contains("active")).toBeTruthy();
		expect(element.classList.contains("primary")).toBeTruthy();
		expect(element.classList.contains("disabled")).toBeFalsy();
		expect(element.classList.contains("warning")).toBeFalsy();

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
		expect(element.classList.contains("active")).toBeFalsy();
		expect(element.classList.contains("disabled")).toBeTruthy();
		expect(element.classList.contains("primary")).toBeTruthy();
		expect(element.classList.contains("warning")).toBeTruthy();
	});

	test("object classnames string to object transition", () => {
		// Start with string classnames
		renderer.render(<div class="string-class other">Test</div>, document.body);

		let element = document.querySelector("div")!;
		expect(element.classList.contains("string-class")).toBeTruthy();
		expect(element.classList.contains("other")).toBeTruthy();

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
		expect(element.classList.contains("string-class")).toBeFalsy();
		expect(element.classList.contains("other")).toBeFalsy();
		expect(element.classList.contains("object-class")).toBeTruthy();
		expect(element.classList.contains("new-class")).toBeTruthy();
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
		expect(element.classList.contains("object-class")).toBeTruthy();
		expect(element.classList.contains("another-class")).toBeTruthy();

		// Switch to string classnames (completely replaces class attribute)
		renderer.render(<div class="string-class final">Test</div>, document.body);

		element = document.querySelector("div")!;
		expect(element.classList.contains("string-class")).toBeTruthy();
		expect(element.classList.contains("final")).toBeTruthy();
		expect(element.classList.contains("object-class")).toBeFalsy();
		expect(element.classList.contains("another-class")).toBeFalsy();
	});

	test("object classnames with space-separated keys", () => {
		renderer.render(
			<div
				class={{
					"w-5 h-5 rounded-full flex items-center justify-center": true,
					"bg-green-500 text-white": true,
					"bg-gray-200 text-gray-400": false,
				}}
			>
				Test
			</div>,
			document.body,
		);

		const element = document.querySelector("div")!;
		// All classes from truthy keys should be present
		expect(element.classList.contains("w-5")).toBeTruthy();
		expect(element.classList.contains("h-5")).toBeTruthy();
		expect(element.classList.contains("rounded-full")).toBeTruthy();
		expect(element.classList.contains("flex")).toBeTruthy();
		expect(element.classList.contains("items-center")).toBeTruthy();
		expect(element.classList.contains("justify-center")).toBeTruthy();
		expect(element.classList.contains("bg-green-500")).toBeTruthy();
		expect(element.classList.contains("text-white")).toBeTruthy();
		// Classes from falsy keys should not be present
		expect(element.classList.contains("bg-gray-200")).toBeFalsy();
		expect(element.classList.contains("text-gray-400")).toBeFalsy();
	});

	test("object classnames with space-separated keys update", () => {
		renderer.render(
			<div
				class={{
					"base-class shared": true,
					"variant-a extra-a": true,
					"variant-b extra-b": false,
				}}
			>
				Test
			</div>,
			document.body,
		);

		let element = document.querySelector("div")!;
		expect(element.classList.contains("base-class")).toBeTruthy();
		expect(element.classList.contains("shared")).toBeTruthy();
		expect(element.classList.contains("variant-a")).toBeTruthy();
		expect(element.classList.contains("extra-a")).toBeTruthy();
		expect(element.classList.contains("variant-b")).toBeFalsy();
		expect(element.classList.contains("extra-b")).toBeFalsy();

		// Update: swap which variant is active
		renderer.render(
			<div
				class={{
					"base-class shared": true,
					"variant-a extra-a": false,
					"variant-b extra-b": true,
				}}
			>
				Test
			</div>,
			document.body,
		);

		element = document.querySelector("div")!;
		expect(element.classList.contains("base-class")).toBeTruthy();
		expect(element.classList.contains("shared")).toBeTruthy();
		expect(element.classList.contains("variant-a")).toBeFalsy();
		expect(element.classList.contains("extra-a")).toBeFalsy();
		expect(element.classList.contains("variant-b")).toBeTruthy();
		expect(element.classList.contains("extra-b")).toBeTruthy();
	});

	test("object classnames with overlapping space-separated keys", () => {
		// When two keys share a class, toggling one shouldn't remove the shared class
		renderer.render(
			<div
				class={{
					"a b": true,
					"b c": true,
				}}
			>
				Test
			</div>,
			document.body,
		);

		let element = document.querySelector("div")!;
		expect(element.classList.contains("a")).toBeTruthy();
		expect(element.classList.contains("b")).toBeTruthy();
		expect(element.classList.contains("c")).toBeTruthy();

		// Toggle first key off - "b" should remain because "b c" is still true
		renderer.render(
			<div
				class={{
					"a b": false,
					"b c": true,
				}}
			>
				Test
			</div>,
			document.body,
		);

		element = document.querySelector("div")!;
		expect(element.classList.contains("a")).toBeFalsy();
		expect(element.classList.contains("b")).toBeTruthy(); // Still present from "b c"
		expect(element.classList.contains("c")).toBeTruthy();

		// Toggle both off
		renderer.render(
			<div
				class={{
					"a b": false,
					"b c": false,
				}}
			>
				Test
			</div>,
			document.body,
		);

		element = document.querySelector("div")!;
		expect(element.classList.contains("a")).toBeFalsy();
		expect(element.classList.contains("b")).toBeFalsy();
		expect(element.classList.contains("c")).toBeFalsy();
	});

	test("relative src should not cause unnecessary updates", () => {
		// Track how many times src property is set
		let srcSetCount = 0;
		const originalDescriptor = Object.getOwnPropertyDescriptor(
			HTMLIFrameElement.prototype,
			"src",
		)!;
		Object.defineProperty(HTMLIFrameElement.prototype, "src", {
			get: originalDescriptor.get,
			set(value) {
				srcSetCount++;
				originalDescriptor.set!.call(this, value);
			},
			configurable: true,
		});

		try {
			// Initial render
			renderer.render(<iframe src="/test-path" />, document.body);
			expect(srcSetCount).toBe(
				1,
			);

			// Re-render with same src
			renderer.render(<iframe src="/test-path" />, document.body);
			expect(srcSetCount).toBe(
				1,
			);

			// Re-render with different src
			renderer.render(<iframe src="/different-path" />, document.body);
			expect(srcSetCount).toBe(2);
		} finally {
			// Restore original property
			Object.defineProperty(
				HTMLIFrameElement.prototype,
				"src",
				originalDescriptor,
			);
		}
	});

	test("relative href should not cause unnecessary updates", () => {
		// Track how many times href property is set
		let hrefSetCount = 0;
		const originalDescriptor = Object.getOwnPropertyDescriptor(
			HTMLAnchorElement.prototype,
			"href",
		)!;
		Object.defineProperty(HTMLAnchorElement.prototype, "href", {
			get: originalDescriptor.get,
			set(value) {
				hrefSetCount++;
				originalDescriptor.set!.call(this, value);
			},
			configurable: true,
		});

		try {
			// Initial render
			renderer.render(<a href="/test-link">Link</a>, document.body);
			expect(hrefSetCount).toBe(
				1,
			);

			// Re-render with same href
			renderer.render(<a href="/test-link">Link</a>, document.body);
			expect(hrefSetCount).toBe(
				1,
			);

			// Re-render with different href
			renderer.render(<a href="/different-link">Link</a>, document.body);
			expect(hrefSetCount).toBe(2);
		} finally {
			// Restore original property
			Object.defineProperty(
				HTMLAnchorElement.prototype,
				"href",
				originalDescriptor,
			);
		}
	});

	test("absolute URLs should work correctly for src", () => {
		let srcSetCount = 0;
		const originalDescriptor = Object.getOwnPropertyDescriptor(
			HTMLIFrameElement.prototype,
			"src",
		)!;
		Object.defineProperty(HTMLIFrameElement.prototype, "src", {
			get: originalDescriptor.get,
			set(value) {
				srcSetCount++;
				originalDescriptor.set!.call(this, value);
			},
			configurable: true,
		});

		try {
			// Initial render with absolute URL
			renderer.render(<iframe src="https://example.com/page" />, document.body);
			expect(srcSetCount).toBe(1);

			// Re-render with same absolute URL
			renderer.render(<iframe src="https://example.com/page" />, document.body);
			expect(srcSetCount).toBe(
				1,
			);
		} finally {
			Object.defineProperty(
				HTMLIFrameElement.prototype,
				"src",
				originalDescriptor,
			);
		}
	});

	// Prop patching: two-loop iteration (removals then updates)
	test("simultaneous prop add, remove, and update", () => {
		const div = renderer.render(
			<div id="old" data-a="1" data-b="2" />,
			document.body,
		) as HTMLElement;
		expect(div.id).toBe("old");
		expect(div.getAttribute("data-a")).toBe("1");
		expect(div.getAttribute("data-b")).toBe("2");

		renderer.render(
			<div id="new" data-b="changed" data-c="3" />,
			document.body,
		);
		expect(div.id).toBe("new"); // updated
		expect(div.getAttribute("data-a")).toBe(null); // removed
		expect(div.getAttribute("data-b")).toBe("changed"); // updated
		expect(div.getAttribute("data-c")).toBe("3"); // added
	});

	test("remove all props", () => {
		const div = renderer.render(
			<div dir="rtl" data-a="1" data-b="2" />,
			document.body,
		) as HTMLElement;
		expect(div.dir).toBe("rtl");
		expect(div.getAttribute("data-a")).toBe("1");

		renderer.render(<div />, document.body);
		expect(div.dir).toBe("");
		expect(div.getAttribute("data-a")).toBe(null);
		expect(div.getAttribute("data-b")).toBe(null);
	});

	test("add props to element that had none", () => {
		const div = renderer.render(<div />, document.body) as HTMLElement;
		expect(div.id).toBe("");

		renderer.render(<div id="added" data-x="y" />, document.body);
		expect(div.id).toBe("added");
		expect(div.getAttribute("data-x")).toBe("y");
	});

	test("event handler swap across renders", () => {
		const calls: string[] = [];
		renderer.render(<button onclick={() => calls.push("a")} />, document.body);
		const button = document.body.firstChild as HTMLButtonElement;
		button.click();
		expect(calls).toEqual(["a"]);

		renderer.render(<button onclick={() => calls.push("b")} />, document.body);
		button.click();
		expect(calls).toEqual(["a", "b"]);
	});

	test("event handler removal", () => {
		const calls: string[] = [];
		renderer.render(
			<button onclick={() => calls.push("clicked")} />,
			document.body,
		);
		const button = document.body.firstChild as HTMLButtonElement;
		button.click();
		expect(calls).toEqual(["clicked"]);

		renderer.render(<button />, document.body);
		button.click();
		expect(calls).toEqual(["clicked"]); // no new call after removal
	});

	test("event handler add and remove different events simultaneously", () => {
		const calls: string[] = [];
		renderer.render(<div onclick={() => calls.push("click")} />, document.body);
		const div = document.body.firstChild as HTMLDivElement;
		div.click();
		expect(calls).toEqual(["click"]);

		// Remove onclick, add onmouseenter
		renderer.render(
			<div onmouseenter={() => calls.push("mouseenter")} />,
			document.body,
		);
		div.click();
		expect(calls).toEqual(["click"]); // onclick removed
		div.dispatchEvent(new MouseEvent("mouseenter"));
		expect(calls).toEqual(["click", "mouseenter"]); // onmouseenter added
	});

	// Style object two-loop: partial overlap
	test("style object partial overlap across renders", () => {
		const div = renderer.render(
			<div style={{color: "red", fontSize: "12px", margin: "5px"}} />,
			document.body,
		) as HTMLElement;
		expect(div.style.color).toBe("red");
		expect(div.style.fontSize).toBe("12px");
		expect(div.style.margin).toBe("5px");

		// color removed, fontSize updated, padding added, margin removed
		renderer.render(
			<div style={{fontSize: "14px", padding: "10px"}} />,
			document.body,
		);
		expect(div.style.color).toBe(""); // removed
		expect(div.style.fontSize).toBe("14px"); // updated
		expect(div.style.margin).toBe(""); // removed
		expect(div.style.padding).toBe("10px"); // added
	});

	test("style object with explicit null values", () => {
		const div = renderer.render(
			<div style={{color: "red", fontSize: "12px", margin: "5px"}} />,
			document.body,
		) as HTMLElement;
		expect(div.style.color).toBe("red");
		expect(div.style.fontSize).toBe("12px");
		expect(div.style.margin).toBe("5px");

		// Explicitly null out color, keep fontSize, update margin
		renderer.render(
			<div style={{color: null, fontSize: "12px", margin: "10px"}} />,
			document.body,
		);
		expect(div.style.color).toBe(""); // explicitly removed
		expect(div.style.fontSize).toBe("12px"); // unchanged
		expect(div.style.margin).toBe("10px"); // updated
	});

	test("style object to empty object clears all styles", () => {
		const div = renderer.render(
			<div style={{color: "red", fontSize: "12px"}} />,
			document.body,
		) as HTMLElement;
		expect(div.style.color).toBe("red");
		expect(div.style.fontSize).toBe("12px");

		renderer.render(<div style={{}} />, document.body);
		expect(div.style.color).toBe(""); // removed
		expect(div.style.fontSize).toBe(""); // removed
	});

	test("style object completely disjoint sets across renders", () => {
		const div = renderer.render(
			<div style={{color: "red", margin: "5px"}} />,
			document.body,
		) as HTMLElement;
		expect(div.style.color).toBe("red");
		expect(div.style.margin).toBe("5px");

		// Completely different properties
		renderer.render(
			<div style={{padding: "10px", border: "1px solid black"}} />,
			document.body,
		);
		expect(div.style.color).toBe(""); // removed
		expect(div.style.margin).toBe(""); // removed
		expect(div.style.padding).toBe("10px"); // added
		expect(div.style.border).toBe("1px solid black"); // added
	});

	// Class object two-loop: partial overlap
	test("class object partial overlap across renders", () => {
		renderer.render(
			<div class={{active: true, highlight: true, large: true}}>Test</div>,
			document.body,
		);
		const div = document.querySelector("div")!;
		expect(div.classList.contains("active")).toBeTruthy();
		expect(div.classList.contains("highlight")).toBeTruthy();
		expect(div.classList.contains("large")).toBeTruthy();

		// active removed, highlight kept, small added, large removed
		renderer.render(
			<div class={{active: false, highlight: true, small: true}}>Test</div>,
			document.body,
		);
		expect(div.classList.contains("active")).toBeFalsy(); // removed
		expect(div.classList.contains("highlight")).toBeTruthy(); // kept
		expect(div.classList.contains("large")).toBeFalsy(); // removed (not in new)
		expect(div.classList.contains("small")).toBeTruthy(); // added
	});

	test("class object all classes removed", () => {
		renderer.render(
			<div class={{a: true, b: true, c: true}}>Test</div>,
			document.body,
		);
		const div = document.querySelector("div")!;
		expect(div.classList.contains("a")).toBeTruthy();
		expect(div.classList.contains("b")).toBeTruthy();
		expect(div.classList.contains("c")).toBeTruthy();

		renderer.render(
			<div class={{a: false, b: false, c: false}}>Test</div>,
			document.body,
		);
		expect(div.classList.contains("a")).toBeFalsy();
		expect(div.classList.contains("b")).toBeFalsy();
		expect(div.classList.contains("c")).toBeFalsy();
	});

	test("class object to empty object clears classes", () => {
		renderer.render(<div class={{x: true, y: true}}>Test</div>, document.body);
		const div = document.querySelector("div")!;
		expect(div.classList.contains("x")).toBeTruthy();
		expect(div.classList.contains("y")).toBeTruthy();

		renderer.render(<div class={{}}>Test</div>, document.body);
		expect(div.classList.contains("x")).toBeFalsy();
		expect(div.classList.contains("y")).toBeFalsy();
	});

	// Mixed prop types changing simultaneously
	test("style, class, and attributes all change in single render", () => {
		renderer.render(
			<div id="old" style={{color: "red"}} class={{active: true}} data-x="1">
				Test
			</div>,
			document.body,
		);
		const div = document.querySelector("div")!;
		expect(div.id).toBe("old");
		expect(div.style.color).toBe("red");
		expect(div.classList.contains("active")).toBeTruthy();
		expect(div.getAttribute("data-x")).toBe("1");

		renderer.render(
			<div
				id="new"
				style={{fontSize: "14px"}}
				class={{highlight: true}}
				data-y="2"
			>
				Test
			</div>,
			document.body,
		);
		expect(div.id).toBe("new"); // updated
		expect(div.style.color).toBe(""); // removed
		expect(div.style.fontSize).toBe("14px"); // added
		expect(div.classList.contains("active")).toBeFalsy(); // removed
		expect(div.classList.contains("highlight")).toBeTruthy(); // added
		expect(div.getAttribute("data-x")).toBe(null); // removed
		expect(div.getAttribute("data-y")).toBe("2"); // added
	});

	test("htmlFor sets for attribute", () => {
		renderer.render(<label htmlFor="email">Email</label>, document.body);
		const label = document.body.firstChild as HTMLLabelElement;
		expect(label.getAttribute("for")).toBe("email");
	});

	test("htmlFor removes for attribute when null", () => {
		renderer.render(<label htmlFor="email">Email</label>, document.body);
		renderer.render(<label htmlFor={null}>Email</label>, document.body);
		const label = document.body.firstChild as HTMLLabelElement;
		expect(label.getAttribute("for")).toBe(null);
	});

	test("htmlFor skipped when for is also present", () => {
		renderer.render(
			<label for="email" htmlFor="other">
				Email
			</label>,
			document.body,
		);
		const label = document.body.firstChild as HTMLLabelElement;
		expect(label.getAttribute("for")).toBe("email");
	});

	test("className skipped when class is also present", () => {
		renderer.render(<div class="real" className="ignored" />, document.body);
		const div = document.body.firstChild as HTMLDivElement;
		expect(div.getAttribute("class")).toBe("real");
	});

	test("dangerouslySetInnerHTML sets innerHTML", () => {
		renderer.render(
			<div dangerouslySetInnerHTML={{__html: "<b>bold</b>"}} />,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><b>bold</b></div>");
	});

	test("dangerouslySetInnerHTML does not insert children", () => {
		renderer.render(
			<div dangerouslySetInnerHTML={{__html: "<b>bold</b>"}} />,
			document.body,
		);
		const div = document.body.firstChild as HTMLElement;
		expect(div.innerHTML).toBe("<b>bold</b>");
		expect(div.childNodes.length).toBe(1);
	});

	test("dangerouslySetInnerHTML updates", () => {
		renderer.render(
			<div dangerouslySetInnerHTML={{__html: "<b>first</b>"}} />,
			document.body,
		);
		renderer.render(
			<div dangerouslySetInnerHTML={{__html: "<i>second</i>"}} />,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><i>second</i></div>");
	});

	// Child cardinality transitions — exercises the diffChild/diffChildren boundary
	test("zero to one child", () => {
		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
		renderer.render(
			<div>
				<span>a</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>a</span></div>");
	});

	test("one to zero children", () => {
		renderer.render(
			<div>
				<span>a</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>a</span></div>");
		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
	});

	test("one to many children", () => {
		renderer.render(
			<div>
				<span>a</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>a</span></div>");
		renderer.render(
			<div>
				<span>a</span>
				<span>b</span>
				<span>c</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>a</span><span>b</span><span>c</span></div>",
		);
	});

	test("many to one child", () => {
		renderer.render(
			<div>
				<span>a</span>
				<span>b</span>
				<span>c</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>a</span><span>b</span><span>c</span></div>",
		);
		renderer.render(
			<div>
				<span>only</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>only</span></div>");
	});

	test("many to zero children", () => {
		renderer.render(
			<div>
				<span>a</span>
				<span>b</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>a</span><span>b</span></div>",
		);
		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
	});

	test("zero to many children", () => {
		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
		renderer.render(
			<div>
				<span>a</span>
				<span>b</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>a</span><span>b</span></div>",
		);
	});

	test("one to one child, same tag reuse", () => {
		renderer.render(
			<div>
				<span>first</span>
			</div>,
			document.body,
		);
		const span = document.body.querySelector("span")!;
		renderer.render(
			<div>
				<span>second</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>second</span></div>");
		expect(document.body.querySelector("span")).toBe(
			span,
		);
	});

	test("one to one child, different tag", () => {
		renderer.render(
			<div>
				<span>hello</span>
			</div>,
			document.body,
		);
		renderer.render(
			<div>
				<b>hello</b>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><b>hello</b></div>");
	});

	test("one text to one element", () => {
		renderer.render(<div>hello</div>, document.body);
		expect(document.body.innerHTML).toBe("<div>hello</div>");
		renderer.render(
			<div>
				<span>hello</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>hello</span></div>");
	});

	test("one element to one text", () => {
		renderer.render(
			<div>
				<span>hello</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>hello</span></div>");
		renderer.render(<div>hello</div>, document.body);
		expect(document.body.innerHTML).toBe("<div>hello</div>");
	});

	test("one to one child with null intermediate", () => {
		renderer.render(
			<div>
				<span>a</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>a</span></div>");
		renderer.render(<div>{null}</div>, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
		renderer.render(
			<div>
				<span>b</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>b</span></div>");
	});

	test("one to one child with boolean intermediate", () => {
		renderer.render(
			<div>
				<span>a</span>
			</div>,
			document.body,
		);
		renderer.render(<div>{false}</div>, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
		renderer.render(
			<div>
				<span>b</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>b</span></div>");
	});

	test("one child with key to one child with different key", () => {
		renderer.render(
			<div>
				<span key="a">a</span>
			</div>,
			document.body,
		);
		const span1 = document.body.querySelector("span")!;
		renderer.render(
			<div>
				<span key="b">b</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>b</span></div>");
		expect(document.body.querySelector("span")).not.toBe(
			span1,
		);
	});

	test("one child with key to one child without key", () => {
		renderer.render(
			<div>
				<span key="a">a</span>
			</div>,
			document.body,
		);
		const span1 = document.body.querySelector("span")!;
		renderer.render(
			<div>
				<span>b</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>b</span></div>");
		expect(document.body.querySelector("span")).not.toBe(
			span1,
		);
	});

	test("one child without key to one child with key", () => {
		renderer.render(
			<div>
				<span>a</span>
			</div>,
			document.body,
		);
		const span1 = document.body.querySelector("span")!;
		renderer.render(
			<div>
				<span key="b">b</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>b</span></div>");
		expect(document.body.querySelector("span")).not.toBe(
			span1,
		);
	});

	test("one keyed child to many children", () => {
		renderer.render(
			<div>
				<span key="a">a</span>
			</div>,
			document.body,
		);
		renderer.render(
			<div>
				<span key="a">a</span>
				<span key="b">b</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>a</span><span>b</span></div>",
		);
	});

	test("many children to one keyed child", () => {
		renderer.render(
			<div>
				<span key="a">a</span>
				<span key="b">b</span>
			</div>,
			document.body,
		);
		renderer.render(
			<div>
				<span key="a">a</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>a</span></div>");
	});

	test("fragment single child transition", () => {
		function Component({count}: {count: number}) {
			const children = [];
			for (let i = 0; i < count; i++) {
				children.push(<span>{i}</span>);
			}
			return <div>{children}</div>;
		}

		renderer.render(<Component count={1} />, document.body);
		expect(document.body.innerHTML).toBe("<div><span>0</span></div>");
		renderer.render(<Component count={3} />, document.body);
		expect(document.body.innerHTML).toBe(
			"<div><span>0</span><span>1</span><span>2</span></div>",
		);
		renderer.render(<Component count={1} />, document.body);
		expect(document.body.innerHTML).toBe("<div><span>0</span></div>");
		renderer.render(<Component count={0} />, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
		renderer.render(<Component count={1} />, document.body);
		expect(document.body.innerHTML).toBe("<div><span>0</span></div>");
	});

	test("component single child transition", () => {
		function* Inner(this: Context, {message}: {message: string}): Generator {
			let count = 0;
			for ({message} of this) {
				count++;
				yield (
					<span>
						{message} ({count})
					</span>
				);
			}
		}

		renderer.render(
			<div>
				<Inner message="a" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>a (1)</span></div>");
		renderer.render(
			<div>
				<Inner message="b" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>b (2)</span></div>");
		renderer.render(<div>{null}</div>, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
		// Re-mounting should reset the generator
		renderer.render(
			<div>
				<Inner message="c" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>c (1)</span></div>");
	});

	test("rapid cardinality cycling", () => {
		for (let round = 0; round < 3; round++) {
			renderer.render(<div />, document.body);
			expect(document.body.innerHTML).toBe(
				"<div></div>",
			);

			renderer.render(
				<div>
					<span>one</span>
				</div>,
				document.body,
			);
			expect(document.body.innerHTML).toBe(
				"<div><span>one</span></div>",
			);

			renderer.render(
				<div>
					<span>a</span>
					<span>b</span>
					<span>c</span>
				</div>,
				document.body,
			);
			expect(document.body.innerHTML).toBe(
				"<div><span>a</span><span>b</span><span>c</span></div>",
			);
		}
	});

	test("async component as single child", async () => {
		async function Async({msg}: {msg: string}) {
			await new Promise((r) => setTimeout(r, 10));
			return <span>{msg}</span>;
		}

		const p1 = renderer.render(
			<div>
				<Async msg="hello" />
			</div>,
			document.body,
		);
		// while async is pending, nothing is committed yet
		expect(document.body.innerHTML).toBe("");
		await p1;
		expect(document.body.innerHTML).toBe("<div><span>hello</span></div>");

		// update the async component
		const p2 = renderer.render(
			<div>
				<Async msg="world" />
			</div>,
			document.body,
		);
		await p2;
		expect(document.body.innerHTML).toBe("<div><span>world</span></div>");

		// transition from async single child to sync single child
		renderer.render(
			<div>
				<b>sync</b>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><b>sync</b></div>");
	});

	test("array child implicitly wrapped in fragment", () => {
		// An array child gets wrapped in a Fragment by narrow(), exercising
		// diffChild placing a Fragment then recursing into diffChildren.
		const items = [<li key="a">a</li>, <li key="b">b</li>];
		renderer.render(<ul>{items}</ul>, document.body);
		expect(document.body.innerHTML).toBe("<ul><li>a</li><li>b</li></ul>");

		// Transition from array (Fragment) to single element
		renderer.render(
			<ul>
				<li>only</li>
			</ul>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<ul><li>only</li></ul>");

		// Back to array
		renderer.render(
			<ul>{[<li key="x">x</li>, <li key="y">y</li>, <li key="z">z</li>]}</ul>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<ul><li>x</li><li>y</li><li>z</li></ul>",
		);
	});

	test("Copy element as single child", () => {
		function* Counter(this: Context): Generator {
			let count = 0;
			for (const _ of this) {
				count++;
				yield <span>{count}</span>;
			}
		}

		renderer.render(
			<div>
				<Counter />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>1</span></div>");
		renderer.render(
			<div>
				<Counter />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>2</span></div>");
		// Copy should preserve the component without re-rendering
		renderer.render(
			<div>
				<Copy />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>2</span></div>");
		// Render again — Copy doesn't increment the counter
		renderer.render(
			<div>
				<Copy />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>2</span></div>");
		// Regular render increments again
		renderer.render(
			<div>
				<Counter />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>3</span></div>");
	});

	test("same element reference skips re-render", () => {
		let renderCount = 0;

		function Tracker(): ReturnType<typeof createElement> {
			renderCount++;
			return <span>rendered</span>;
		}

		const el = <Tracker />;
		renderer.render(<div>{el}</div>, document.body);
		expect(renderCount).toBe(1);
		expect(document.body.innerHTML).toBe("<div><span>rendered</span></div>");
		// Same reference — should skip
		renderer.render(<div>{el}</div>, document.body);
		expect(renderCount).toBe(1);
		// New element — should re-render
		renderer.render(
			<div>
				<Tracker />
			</div>,
			document.body,
		);
		expect(renderCount).toBe(2);
	});

	test("nullish child unmounts component subtree", () => {
		const cleanups: string[] = [];

		function* Child(this: Context, {name}: {name: string}): Generator {
			try {
				for ({name} of this) {
					yield <span>{name}</span>;
				}
			} finally {
				cleanups.push(name);
			}
		}

		renderer.render(
			<div>
				<Child name="a" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>a</span></div>");
		expect(cleanups).toEqual([]);

		// null should unmount the component and fire cleanup
		renderer.render(<div>{null}</div>, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
		expect(cleanups).toEqual(["a"]);

		// mount again
		renderer.render(
			<div>
				<Child name="b" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>b</span></div>");

		// undefined should also unmount
		renderer.render(<div>{undefined}</div>, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
		expect(cleanups).toEqual(["a", "b"]);

		// false should also unmount
		renderer.render(
			<div>
				<Child name="c" />
			</div>,
			document.body,
		);
		renderer.render(<div>{false}</div>, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
		expect(cleanups).toEqual(["a", "b", "c"]);
	});

	test("nullish child unmounts nested component tree", () => {
		const cleanups: string[] = [];

		function* Leaf(this: Context, {id}: {id: string}): Generator {
			try {
				for ({id} of this) {
					yield <span>{id}</span>;
				}
			} finally {
				cleanups.push(id);
			}
		}

		function Branch({id}: {id: string}) {
			return (
				<div>
					<Leaf id={`${id}-1`} />
					<Leaf id={`${id}-2`} />
				</div>
			);
		}

		renderer.render(
			<div>
				<Branch id="a" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><div><span>a-1</span><span>a-2</span></div></div>",
		);

		// Nulling out the single Branch child should unmount both leaves
		renderer.render(<div>{null}</div>, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
		expect(cleanups.sort()).toEqual(["a-1", "a-2"]);
	});

	test("number child", () => {
		renderer.render(<div>{42}</div>, document.body);
		expect(document.body.innerHTML).toBe("<div>42</div>");
		renderer.render(<div>{0}</div>, document.body);
		expect(document.body.innerHTML).toBe("<div>0</div>");
		// transition number → element
		renderer.render(
			<div>
				<span>text</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>text</span></div>");
		// transition element → number
		renderer.render(<div>{99}</div>, document.body);
		expect(document.body.innerHTML).toBe("<div>99</div>");
	});

	test("boolean and undefined children clear content", () => {
		renderer.render(
			<div>
				<span>hello</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>hello</span></div>");
		renderer.render(<div>{false}</div>, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
		renderer.render(
			<div>
				<span>back</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>back</span></div>");
		renderer.render(<div>{undefined}</div>, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
		renderer.render(
			<div>
				<span>again</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>again</span></div>");
		renderer.render(<div>{true}</div>, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
	});

	test("generator component preserves state through single-child path", () => {
		function* Stateful(this: Context, {label}: {label: string}): Generator {
			let renders = 0;
			for ({label} of this) {
				renders++;
				yield (
					<span>
						{label}:{renders}
					</span>
				);
			}
		}

		renderer.render(
			<div>
				<Stateful label="a" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>a:1</span></div>");
		// Re-render with same tag — should reuse retainer and preserve state
		renderer.render(
			<div>
				<Stateful label="b" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>b:2</span></div>");
		renderer.render(
			<div>
				<Stateful label="c" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>c:3</span></div>");
		// Transition to many — first Stateful is reused, second is new
		renderer.render(
			<div>
				<Stateful label="x" />
				<Stateful label="y" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div><span>x:4</span><span>y:1</span></div>",
		);
		// Back to single — first Stateful keeps state, second unmounted
		renderer.render(
			<div>
				<Stateful label="z" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>z:5</span></div>");
	});
});
