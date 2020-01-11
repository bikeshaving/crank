/** @jsx createElement */
import "./_mutation-observer";
import {createElement, Fragment} from "../crank";
import {createHTML} from "./_utils";
import {render} from "../dom";
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
		render(null, document.body);
		observer.disconnect();
	});

	test("simple", () => {
		observe();
		render(<h1>Hello world</h1>, document.body);
		expect(document.body.innerHTML).toEqual("<h1>Hello world</h1>");
		expect(observer.takeRecords()).toEqualMutationRecords([
			{addedNodes: [createHTML("<h1>Hello world</h1>")]},
		]);
	});

	test("multiple children", () => {
		observe();
		render(
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
		render(
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
		render(<div id="1" />, document.body);
		expect(document.body.innerHTML).toEqual('<div id="1"></div>');
		expect(observer.takeRecords()).toEqualMutationRecords([
			{
				target: document.body.firstChild,
				removedNodes: [createHTML('<div id="2"><div id="3">Hi</div></div>')],
			},
		]);
	});

	test("boolean replaces nested children", () => {
		observe();
		render(
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
		render(<div id="1">{true}</div>, document.body);
		expect(document.body.innerHTML).toEqual('<div id="1"></div>');
		expect(observer.takeRecords()).toEqualMutationRecords([
			{
				target: document.body.firstChild,
				removedNodes: [createHTML('<div id="2"><div id="3">Hi</div></div>')],
			},
		]);
	});

	test("attrs", () => {
		render(
			<Fragment>
				<input id="toggle" type="checkbox" checked data-checked />
				<label for="toggle" />
			</Fragment>,
			document.body,
		);
		// jsdom doesn‘t seem to reflect checked property
		expect(document.body.innerHTML).toEqual(
			'<input id="toggle" type="checkbox" data-checked=""><label for="toggle"></label>',
		);
		expect((document.body.firstChild! as any).checked).toBe(true);
		observe();
		render(
			<Fragment>
				<input id="toggle" type="checkbox" />
				<label for="toggle" class="inactive" />
			</Fragment>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			'<input id="toggle" type="checkbox"><label for="toggle" class="inactive"></label>',
		);
		expect((document.body.firstChild! as any).checked).toBe(false);
	});

	test("rerender text", () => {
		render(<h1>Hello world 1</h1>, document.body);
		expect(document.body.innerHTML).toEqual("<h1>Hello world 1</h1>");
		observe();
		render(<h1>Hello {"world"} 2</h1>, document.body);
		expect(document.body.innerHTML).toEqual("<h1>Hello world 2</h1>");
		expect(observer.takeRecords()).toEqualMutationRecords([
			{
				type: "characterData",
				target: createHTML("Hello world 2"),
				oldValue: "Hello world 1",
			},
		]);
		render(<h1>Hello world {3}</h1>, document.body);
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
		render(
			<div>
				<h1>Hello world</h1>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><h1>Hello world</h1></div>");
		observe();
		render(
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
		render(<div>Hello world</div>, document.body);
		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");
		observe();
		render(
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
		render(
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
		render(<div>Hello world</div>, document.body);
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
		render(
			<div>
				<span>1</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		observe();
		render(
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
		render(
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
		render(
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
		render(<h1>Hello world</h1>, document.body);
		expect(document.body.innerHTML).toEqual("<h1>Hello world</h1>");
		observe();
		render(null, document.body);
		expect(document.body.innerHTML).toEqual("");
		expect(observer.takeRecords()).toEqualMutationRecords([
			{removedNodes: [createHTML("<h1>Hello world</h1>")]},
		]);
		render(<h1>Hello again</h1>, document.body);
		expect(document.body.innerHTML).toEqual("<h1>Hello again</h1>");
		expect(observer.takeRecords()).toEqualMutationRecords([
			{addedNodes: [createHTML("<h1>Hello again</h1>")]},
		]);
		render(null, document.body);
		expect(document.body.innerHTML).toEqual("");
		expect(observer.takeRecords()).toEqualMutationRecords([
			{removedNodes: [createHTML("<h1>Hello again</h1>")]},
		]);
	});

	test("fragment", () => {
		render(
			<Fragment>
				<span>1</span>
				<span>2</span>
			</Fragment>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<span>1</span><span>2</span>");
		observe();
		render(
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
		render(
			<Fragment>
				{undefined}
				{undefined}
			</Fragment>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("");
		render(
			<Fragment>
				<span>1</span>
				<span>2</span>
			</Fragment>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<span>1</span><span>2</span>");
	});

	test("array", () => {
		render(
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
		render(
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
		render(
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
		render(
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

	test("keyed child moves forward", () => {
		render(
			<div>
				<span crank-key="1">1</span>
				<span>2</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			"<div><span>1</span><span>2</span></div>",
		);
		const span1 = document.body.firstChild!.firstChild;
		render(
			<div>
				<span>0</span>
				<span crank-key="1">1</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			"<div><span>0</span><span>1</span></div>",
		);
		expect(document.body.firstChild!.lastChild).toBe(span1);
	});

	test("keyed child moves backward", () => {
		render(
			<div>
				<span>1</span>
				<span crank-key="2">2</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			"<div><span>1</span><span>2</span></div>",
		);
		const span2 = document.body.firstChild!.lastChild;
		render(
			<div>
				<span crank-key="2">2</span>
				<span>3</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			"<div><span>2</span><span>3</span></div>",
		);
		expect(document.body.firstChild!.firstChild).toBe(span2);
	});

	test("keyed array", () => {
		const spans = [
			<span crank-key="2">2</span>,
			<span crank-key="3">3</span>,
			<span crank-key="4">4</span>,
		];
		render(
			<div>
				<span>1</span>
				{spans}
				<span>5</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>",
		);
		observe();
		const span1 = document.body.firstChild!.childNodes[0];
		const span2 = document.body.firstChild!.childNodes[1];
		const span3 = document.body.firstChild!.childNodes[2];
		const span4 = document.body.firstChild!.childNodes[3];
		const span5 = document.body.firstChild!.childNodes[4];
		spans.splice(1, 1);
		render(
			<div>
				<span>1</span>
				{spans}
				<span>5</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			"<div><span>1</span><span>2</span><span>4</span><span>5</span></div>",
		);
		expect(observer.takeRecords()).toEqualMutationRecords([
			{
				target: document.body.firstChild,
				removedNodes: [createHTML("<span>3</span>")],
			},
			{
				target: document.body.firstChild,
				addedNodes: [createHTML("<span>5</span>")],
				removedNodes: [createHTML("<span>5</span>")],
			},
			{
				target: document.body.firstChild,
				addedNodes: [createHTML("<span>4</span>")],
				removedNodes: [createHTML("<span>4</span>")],
			},
		]);
		expect(document.body.firstChild!.childNodes[0]).toBe(span1);
		expect(document.body.firstChild!.childNodes[1]).toBe(span2);
		expect(document.body.firstChild!.childNodes[2]).toBe(span4);
		expect(document.body.firstChild!.childNodes[3]).toBe(span5);
		expect(document.body.contains(span3)).toBe(false);
	});

	test("reversed keyed array", () => {
		const spans = [
			<span crank-key="2">2</span>,
			<span crank-key="3">3</span>,
			<span crank-key="4">4</span>,
			<span crank-key="5">5</span>,
			<span crank-key="6">6</span>,
		];
		render(
			<div>
				<span>1</span>
				{spans}
				<span>7</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span></div>",
		);
		const span1 = document.body.firstChild!.childNodes[0];
		const span2 = document.body.firstChild!.childNodes[1];
		const span3 = document.body.firstChild!.childNodes[2];
		const span4 = document.body.firstChild!.childNodes[3];
		const span5 = document.body.firstChild!.childNodes[4];
		const span6 = document.body.firstChild!.childNodes[5];
		const span7 = document.body.firstChild!.childNodes[6];
		spans.reverse();
		render(
			<div>
				<span>1</span>
				{spans}
				<span>7</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			"<div><span>1</span><span>6</span><span>5</span><span>4</span><span>3</span><span>2</span><span>7</span></div>",
		);
		render(
			<div>
				<span>1</span>
				{spans}
				<span>7</span>
			</div>,
			document.body,
		);
		expect(document.body.firstChild!.childNodes[0]).toBe(span1);
		expect(document.body.firstChild!.childNodes[1]).toBe(span6);
		expect(document.body.firstChild!.childNodes[2]).toBe(span5);
		expect(document.body.firstChild!.childNodes[3]).toBe(span4);
		expect(document.body.firstChild!.childNodes[4]).toBe(span3);
		expect(document.body.firstChild!.childNodes[5]).toBe(span2);
		expect(document.body.firstChild!.childNodes[6]).toBe(span7);
		spans.reverse();
		render(
			<div>
				<span>1</span>
				{spans}
				<span>7</span>
			</div>,
			document.body,
		);
		expect(document.body.firstChild!.childNodes[0]).toBe(span1);
		expect(document.body.firstChild!.childNodes[1]).toBe(span2);
		expect(document.body.firstChild!.childNodes[2]).toBe(span3);
		expect(document.body.firstChild!.childNodes[3]).toBe(span4);
		expect(document.body.firstChild!.childNodes[4]).toBe(span5);
		expect(document.body.firstChild!.childNodes[5]).toBe(span6);
		expect(document.body.firstChild!.childNodes[6]).toBe(span7);
	});

	test("keyed child added", () => {
		render(
			<div>
				<span crank-key="2">2</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>2</span></div>");
		const span2 = document.body.firstChild!.lastChild;
		render(
			<div>
				<span crank-key="1">1</span>
				<span crank-key="2">2</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			"<div><span>1</span><span>2</span></div>",
		);
		expect(document.body.firstChild!.lastChild).toBe(span2);
	});

	test("keyed only child", () => {
		render(
			<div>
				<span>1</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		observe();
		let span1 = document.body.firstChild!.firstChild;
		render(
			<div>
				<span crank-key="1">1</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		expect(document.body.firstChild!.firstChild).not.toBe(span1);
		expect(observer.takeRecords()).toEqualMutationRecords([
			{
				target: document.body.firstChild,
				addedNodes: [createHTML("<span>1</span>")],
			},
			{
				target: document.body.firstChild,
				removedNodes: [createHTML("<span>1</span>")],
			},
		]);
		span1 = document.body.firstChild!.firstChild;
		render(
			<div>
				<span>1</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		expect(document.body.firstChild!.firstChild).not.toBe(span1);
		expect(observer.takeRecords()).toEqualMutationRecords([
			{
				target: document.body.firstChild,
				addedNodes: [createHTML("<span>1</span>")],
			},
			{
				target: document.body.firstChild,
				removedNodes: [createHTML("<span>1</span>")],
			},
		]);
	});
});
