/** @jsx createElement */
import {createElement, Fragment, Portal, Raw} from "../index";
import {renderer} from "../dom";
import "./_mutation-observer";
import {createHTML} from "./_utils";

describe("render", () => {
	let observer: MutationObserver;
	function observe() {
		observer.observe(document.body, {
			childList: true,
			attributes: true,
			characterData: true,
			subtree: true,
		});
	}

	beforeEach(() => {
		observer = new MutationObserver(() => {});
	});

	afterEach(() => {
		document.body.innerHTML = "";
		renderer.render(null, document.body);
		observer.disconnect();
	});

	test("simple", () => {
		observe();
		renderer.render(<h1>Hello world</h1>, document.body);
		expect(document.body.innerHTML).toEqual("<h1>Hello world</h1>");
		expect(observer.takeRecords()).toEqualMutationRecords([
			{addedNodes: [createHTML("<h1>Hello world</h1>")]},
		]);
	});

	test("multiple children", () => {
		observe();
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
		expect(observer.takeRecords()).toEqualMutationRecords([
			{
				addedNodes: [
					createHTML(
						"<div><span>1</span><span>2</span><span>3</span><span>4</span></div>",
					),
				],
			},
		]);
	});

	test("nested children", () => {
		observe();
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
		expect(observer.takeRecords()).toEqualMutationRecords([
			{
				addedNodes: [
					createHTML(
						'<div id="1"><div id="2"><div id="3">Hi</div></div></div>',
					),
				],
			},
		]);
		renderer.render(<div id="1" />, document.body);
		expect(document.body.innerHTML).toEqual('<div id="1"></div>');

		const records = observer.takeRecords();
		expect(records).toEqualMutationRecords([
			{
				target: document.body.firstChild,
				removedNodes: [createHTML('<div id="2"><div id="3">Hi</div></div>')],
			},
		]);
	});

	test("boolean replaces nested children", () => {
		observe();
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
		expect(observer.takeRecords()).toEqualMutationRecords([
			{
				addedNodes: [
					createHTML(
						'<div id="1"><div id="2"><div id="3">Hi</div></div></div>',
					),
				],
			},
		]);
		renderer.render(<div id="1">{true}</div>, document.body);
		expect(document.body.innerHTML).toEqual('<div id="1"></div>');
		expect(observer.takeRecords()).toEqualMutationRecords([
			{
				target: document.body.firstChild,
				removedNodes: [createHTML('<div id="2"><div id="3">Hi</div></div>')],
			},
		]);
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
		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");
		expect(el1.innerHTML).toEqual("Hello from a portal");
		expect(el2.innerHTML).toEqual("<div>Hello from another portal</div>");
	});

	test("root portal", () => {
		renderer.render(
			<Portal root={document.body}>
				<div>Hello world</div>
			</Portal>,
		);
		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");
	});

	test("root portal with changing root", () => {
		const el1 = document.createElement("div");
		const el2 = document.createElement("div");
		const key = {};
		renderer.render(
			<Portal root={el1}>
				<div>Hello world</div>
			</Portal>,
			key,
		);
		expect(el1.innerHTML).toEqual("<div>Hello world</div>");
		expect(el2.innerHTML).toEqual("");
		renderer.render(
			<Portal root={el2}>
				<div>Hello world</div>
			</Portal>,
			key,
		);
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
		observe();
		renderer.render(<h1>Hello {"world"} 2</h1>, document.body);
		expect(document.body.innerHTML).toEqual("<h1>Hello world 2</h1>");
		expect(observer.takeRecords()).toEqualMutationRecords([
			{
				type: "characterData",
				target: createHTML("Hello world 2"),
				oldValue: "Hello world 1",
			},
		]);
		renderer.render(<h1>Hello world {3}</h1>, document.body);
		expect(document.body.innerHTML).toEqual("<h1>Hello world 3</h1>");
		expect(observer.takeRecords()).toEqualMutationRecords([
			{
				type: "characterData",
				target: createHTML("Hello world 3"),
				oldValue: "Hello world 2",
			},
		]);
	});

	test("rerender different child", () => {
		renderer.render(
			<div>
				<h1>Hello world</h1>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><h1>Hello world</h1></div>");
		observe();
		renderer.render(
			<div>
				<h2>Hello world</h2>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><h2>Hello world</h2></div>");
		expect(observer.takeRecords()).toEqualMutationRecords([
			{
				target: document.body.firstChild,
				addedNodes: [createHTML("<h2>Hello world</h2>")],
			},
			{
				target: document.body.firstChild,
				removedNodes: [createHTML("<h1>Hello world</h1>")],
			},
		]);
	});

	test("rerender text with children", () => {
		renderer.render(<div>Hello world</div>, document.body);
		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");
		observe();
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
		expect(observer.takeRecords()).toEqualMutationRecords([
			{
				target: document.body.firstChild,
				addedNodes: [createHTML("<span>1</span>")],
			},
			{
				target: createHTML("<div><span>1</span><span>2</span></div>"),
				removedNodes: [createHTML("Hello world")],
			},
			{
				target: document.body.firstChild,
				addedNodes: [createHTML("<span>2</span>")],
				previousSibling: createHTML("<span>1</span>"),
			},
		]);
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
		observe();
		renderer.render(<div>Hello world</div>, document.body);
		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");
		expect(observer.takeRecords()).toEqualMutationRecords([
			{
				target: document.body.firstChild,
				addedNodes: [createHTML("Hello world")],
			},
			{
				target: document.body.firstChild,
				removedNodes: [createHTML("<span>1</span>")],
			},
			{
				target: document.body.firstChild,
				removedNodes: [createHTML("<span>2</span>")],
			},
		]);
	});

	test("rerender more children", () => {
		renderer.render(
			<div>
				<span>1</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		observe();
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
		expect(observer.takeRecords()).toEqualMutationRecords([
			{
				target: document.body.firstChild,
				addedNodes: [createHTML("<span>2</span>")],
			},
			{
				target: document.body.firstChild,
				addedNodes: [createHTML("<span>3</span>")],
			},
			{
				target: document.body.firstChild,
				addedNodes: [createHTML("<span>4</span>")],
			},
		]);
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
		observe();
		renderer.render(
			<div>
				<span>1</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		expect(observer.takeRecords()).toEqualMutationRecords([
			{
				target: document.body.firstChild,
				removedNodes: [createHTML("<span>2</span>")],
			},
			{
				target: document.body.firstChild,
				removedNodes: [createHTML("<span>3</span>")],
			},
			{
				target: document.body.firstChild,
				removedNodes: [createHTML("<span>4</span>")],
			},
		]);
	});

	test("render null", () => {
		renderer.render(<h1>Hello world</h1>, document.body);
		expect(document.body.innerHTML).toEqual("<h1>Hello world</h1>");
		observe();
		renderer.render(null, document.body);
		expect(document.body.innerHTML).toEqual("");
		expect(observer.takeRecords()).toEqualMutationRecords([
			{removedNodes: [createHTML("<h1>Hello world</h1>")]},
		]);
		renderer.render(<h1>Hello again</h1>, document.body);
		expect(document.body.innerHTML).toEqual("<h1>Hello again</h1>");
		expect(observer.takeRecords()).toEqualMutationRecords([
			{addedNodes: [createHTML("<h1>Hello again</h1>")]},
		]);
		renderer.render(null, document.body);
		expect(document.body.innerHTML).toEqual("");
		expect(observer.takeRecords()).toEqualMutationRecords([
			{removedNodes: [createHTML("<h1>Hello again</h1>")]},
		]);
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
		observe();
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
		expect(observer.takeRecords()).toEqualMutationRecords([
			{
				target: document.body,
				addedNodes: [createHTML("<span>3</span>")],
			},
		]);
	});

	test("rerendering fragment", () => {
		renderer.render(
			<Fragment>
				{undefined}
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
		observe();
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
		expect(observer.takeRecords()).toEqualMutationRecords([
			{
				target: document.body.firstChild,
				removedNodes: [createHTML("<span>2</span>")],
			},
			{
				target: document.body.firstChild,
				removedNodes: [createHTML("<span>3</span>")],
			},
			// current algorithm will move existing nodes before the to-be-removed nodes
			{
				target: document.body.firstChild,
				addedNodes: [createHTML("<span>4</span>")],
				removedNodes: [createHTML("<span>4</span>")],
			},
		]);
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
		observe();
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
		expect(observer.takeRecords()).toEqualMutationRecords([
			{
				target: createHTML("4"),
				oldValue: "3",
				type: "characterData",
			},
			{
				target: document.body.firstChild,
				removedNodes: [createHTML("<span>4</span>")],
			},
			{
				target: document.body.firstChild,
				removedNodes: [createHTML("<span>5</span>")],
			},
			// current algorithm will move existing nodes before the to-be-removed nodes
			{
				target: document.body.firstChild,
				addedNodes: [createHTML("<span>6</span>")],
				removedNodes: [createHTML("<span>6</span>")],
			},
		]);
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
		const el = createHTML('<span id="raw">Hi</span>');
		renderer.render(
			<div>
				Raw: <Raw value={el} />
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
		expect((document.body.firstChild! as HTMLElement).style.display).toEqual(
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
		expect((document.body.firstChild! as HTMLElement).style.display).toEqual(
			"none",
		);
		expect((document.body.firstChild! as HTMLElement).style.marginTop).toEqual(
			"30px",
		);
	});
});
