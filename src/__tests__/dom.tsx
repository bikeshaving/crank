/// <ref lib="dom" />
/** @jsx createElement */
import {Copy, createElement, Fragment, Portal, Raw} from "../index";
import {renderer} from "../dom";

describe("render", () => {
	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("simple", () => {
		renderer.render(<h1>Hello world</h1>, document.body);
		expect(document.body.innerHTML).toEqual("<h1>Hello world</h1>");
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

		expect(document.body.innerHTML).toEqual(
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

		expect(document.body.innerHTML).toEqual(
			'<div id="1"><div id="2"><div id="3">Hi</div></div></div>',
		);

		const div1 = document.getElementById("1")!;
		renderer.render(<div id="1" />, document.body);
		expect(document.body.innerHTML).toEqual('<div id="1"></div>');
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

		expect(document.body.innerHTML).toEqual(
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

		expect(document.body.innerHTML).toEqual(
			'<div id="1"><div id="2"></div></div>',
		);
		expect(document.body.firstChild).toBe(div1);
		expect(document.body.firstChild!.firstChild).toBe(div2);
	});

	// TODO: move these tests to their own file
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
		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");
		expect(el1.innerHTML).toEqual("Hello from a portal");
		expect(el2.innerHTML).toEqual("<div>Hello from another portal</div>");

		renderer.render(null, document.body);
		expect(document.body.innerHTML).toEqual("");
		expect(el1.innerHTML).toEqual("");
		expect(el2.innerHTML).toEqual("");
	});

	test("portal at root", () => {
		const div = document.createElement("div");
		renderer.render(
			<Portal root={div}>
				<div>Hello world</div>
			</Portal>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("");
		expect(div.innerHTML).toEqual("<div>Hello world</div>");
		renderer.render(null, document.body);
		expect(document.body.innerHTML).toEqual("");
		expect(div.innerHTML).toEqual("");
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
		expect(document.body.innerHTML).toEqual("");
		expect(el1.innerHTML).toEqual("<div>Hello world</div>");
		renderer.render(
			<Portal root={el2}>
				<div>Hello world</div>
			</Portal>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("");
		expect(el1.innerHTML).toEqual("");
		expect(el2.innerHTML).toEqual("<div>Hello world</div>");
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
		expect(document.body.innerHTML).toEqual(
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
		expect(document.body.innerHTML).toEqual(
			'<input id="toggle" type="checkbox"><label for="toggle" class="inactive"></label>',
		);
		expect((document.body.firstChild! as any).checked).toBe(false);
	});

	test("doesn’t blow away user-created html when it doesn’t have to", () => {
		renderer.render(<div id="mount" />, document.body);
		expect(document.body.innerHTML).toEqual('<div id="mount"></div>');
		document.getElementById("mount")!.innerHTML = "<span>Hello world</span>";
		expect(document.body.innerHTML).toEqual(
			'<div id="mount"><span>Hello world</span></div>',
		);
		renderer.render(<div id="mount" />, document.body);
		expect(document.body.innerHTML).toEqual(
			'<div id="mount"><span>Hello world</span></div>',
		);
	});

	test("rerender text", () => {
		renderer.render(<h1>Hello world 1</h1>, document.body);
		expect(document.body.innerHTML).toEqual("<h1>Hello world 1</h1>");
		const h1 = document.body.firstChild!;
		const text = h1.firstChild!;
		renderer.render(<h1>Hello {"world"} 2</h1>, document.body);
		expect(document.body.innerHTML).toEqual("<h1>Hello world 2</h1>");
		expect(document.body.firstChild!).toBe(h1);
		expect(document.body.firstChild!.firstChild!).toBe(text);
		renderer.render(<h1>Hello world {3}</h1>, document.body);
		expect(document.body.innerHTML).toEqual("<h1>Hello world 3</h1>");
		expect(document.body.firstChild!).toBe(h1);
		expect(document.body.firstChild!.firstChild!).toBe(text);
	});

	test("rerender different child", () => {
		renderer.render(
			<div>
				<h1>Hello world</h1>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><h1>Hello world</h1></div>");
		const div = document.body.firstChild!;
		renderer.render(
			<div>
				<h2>Hello world</h2>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><h2>Hello world</h2></div>");
		expect(document.body.firstChild!).toBe(div);
	});

	test("rerender text with children", () => {
		renderer.render(<div>Hello world</div>, document.body);
		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");
		const div = document.body.firstChild!;
		renderer.render(
			<div>
				<span>1</span>
				<span>2</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
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
		expect(document.body.innerHTML).toEqual(
			"<div><span>1</span><span>2</span></div>",
		);
		const div = document.body.firstChild!;
		renderer.render(<div>Hello world</div>, document.body);
		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");
		expect(document.body.firstChild!).toBe(div);
	});

	test("rerender more children", () => {
		renderer.render(
			<div>
				<span>1</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
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
		expect(document.body.innerHTML).toEqual(
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
		expect(document.body.innerHTML).toEqual(
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
		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		expect(document.body.firstChild!).toBe(div);
		expect(document.body.firstChild!.firstChild).toBe(span);
	});

	test("null and undefined", () => {
		renderer.render(<h1>Hello world</h1>, document.body);
		expect(document.body.innerHTML).toEqual("<h1>Hello world</h1>");
		renderer.render(null, document.body);
		expect(document.body.innerHTML).toEqual("");
		renderer.render(<h1>Hello again</h1>, document.body);
		expect(document.body.innerHTML).toEqual("<h1>Hello again</h1>");
		renderer.render(undefined, document.body);
		expect(document.body.innerHTML).toEqual("");
	});

	test("fragment", () => {
		renderer.render(
			<Fragment>
				<span>1</span>
				<span>2</span>
			</Fragment>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<span>1</span><span>2</span>");
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
		expect(document.body.innerHTML).toEqual(
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
		expect(document.body.innerHTML).toEqual("");
		renderer.render(
			<Fragment>
				<span>1</span>
				<span>2</span>
			</Fragment>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<span>1</span><span>2</span>");
	});

	test("iterable", () => {
		renderer.render(["1", 2, <div>3</div>], document.body);
		expect(document.body.innerHTML).toEqual("12<div>3</div>");
		renderer.render(null, document.body);
		expect(document.body.innerHTML).toEqual("");
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
		expect(document.body.innerHTML).toEqual(
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
		expect(document.body.innerHTML).toEqual(
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
		expect(document.body.innerHTML).toEqual(
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
		expect(document.body.innerHTML).toEqual(
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
		expect(document.body.innerHTML).toEqual(
			'<div>Raw: <span id="raw">Hi</span></div>',
		);
		expect(document.getElementById("raw")).toBeDefined();
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
		expect(document.body.innerHTML).toEqual(
			'<div>Raw: <span id="raw">Hi</span></div>',
		);
		expect(document.getElementById("raw")).toBeDefined();
	});

	test("style text", () => {
		renderer.render(<div style="display: none" />, document.body);
		expect(document.body.innerHTML).toEqual(
			'<div style="display: none;"></div>',
		);
		expect((document.body.firstChild as HTMLElement).style.display).toEqual(
			"none",
		);
	});

	test("style object", () => {
		renderer.render(
			<div style={{display: "none", "margin-top": "30px"}} />,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			'<div style="display: none; margin-top: 30px;"></div>',
		);
		expect((document.body.firstChild as HTMLElement).style.display).toEqual(
			"none",
		);
		expect((document.body.firstChild as HTMLElement).style.marginTop).toEqual(
			"30px",
		);
	});

	test("style text to object", () => {
		renderer.render(<div style="font-weight: bold" />, document.body);

		expect(document.body.innerHTML).toEqual(
			'<div style="font-weight: bold;"></div>',
		);

		renderer.render(<div style={{color: "goldenrod"}} />, document.body);

		expect(document.body.innerHTML).toEqual(
			'<div style="color: goldenrod;"></div>',
		);
	});

	test("clearing mutations", () => {
		renderer.render(<div />, document.body);

		const div = document.body.firstChild as HTMLDivElement;
		div.innerHTML = "<span>child</span>";
		renderer.render(<div />, document.body);

		expect(document.body.innerHTML).toEqual("<div><span>child</span></div>");
		renderer.render(<div>{[]}</div>, document.body);

		expect(document.body.innerHTML).toEqual("<div></div>");
		div.innerHTML = "<span>child</span>";
		renderer.render(<div>{null}</div>, document.body);
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

	test("uncontrolled props", () => {
		const input = renderer.render(
			<input value="hello" />,
			document.body,
		) as any;
		expect(input).toBeInstanceOf(HTMLInputElement);
		expect(input.value).toBe("hello");
		input.value = "world";
		expect(input.value).toBe("world");
		renderer.render(<input value={Copy} />, document.body);
	});
});
