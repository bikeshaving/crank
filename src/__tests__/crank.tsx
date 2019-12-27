/** @jsx createElement */
import "core-js";
import {Repeater} from "@repeaterjs/repeater";
import {createElement, Child, Context, Fragment} from "../crank";
import {render} from "../envs/dom";
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

describe("sync function component", () => {
	afterEach(async () => {
		document.body.innerHTML = "";
		await render(null, document.body);
	});

	test("basic", () => {
		function Component({message}: {message: string}): Element {
			return <span>{message}</span>;
		}

		render(
			<div>
				<Component message="Hello" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		render(
			<div>
				<Component message="Goodbye" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Goodbye</span></div>");
	});

	test("rerender different return value", () => {
		function Component({ChildTag}: {ChildTag: string}): Element {
			return <ChildTag>Hello world</ChildTag>;
		}

		render(<Component ChildTag="div" />, document.body);
		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");
		render(<Component ChildTag="span" />, document.body);
		expect(document.body.innerHTML).toEqual("<span>Hello world</span>");
	});
});

describe("async function component", () => {
	afterEach(async () => {
		document.body.innerHTML = "";
		await render(null, document.body);
	});

	test("basic", async () => {
		async function Component({message}: {message: string}): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 100));
			return <span>{message}</span>;
		}

		const viewP = render(
			<div>
				<Component message="Hello" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("");
		await expect(viewP).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
	});

	test("updates enqueue", async () => {
		const Component = jest.fn(async function Component({
			message,
		}: {
			message: string;
		}): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 25));
			return <span>{message}</span>;
		});

		const viewP1 = render(
			<div>
				<Component message="Hello 1" />
			</div>,
			document.body,
		);
		const viewP2 = render(
			<div>
				<Component message="Hello 2" />
			</div>,
			document.body,
		);
		const viewP3 = render(
			<div>
				<Component message="Hello 3" />
			</div>,
			document.body,
		);
		const viewP4 = render(
			<div>
				<Component message="Hello 4" />
			</div>,
			document.body,
		);
		const viewP5 = render(
			<div>
				<Component message="Hello 5" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("");
		await expect(viewP1).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		await expect(viewP2).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 5</span></div>");
		await expect(viewP3).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 5</span></div>");
		await expect(viewP4).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 5</span></div>");
		const viewP6 = render(
			<div>
				<Component message="Hello 6" />
			</div>,
			document.body,
		);
		const viewP7 = render(
			<div>
				<Component message="Hello 7" />
			</div>,
			document.body,
		);
		const viewP8 = render(
			<div>
				<Component message="Hello 8" />
			</div>,
			document.body,
		);
		const viewP9 = render(
			<div>
				<Component message="Hello 9" />
			</div>,
			document.body,
		);
		const viewP10 = render(
			<div>
				<Component message="Hello 10" />
			</div>,
			document.body,
		);
		await expect(viewP5).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 5</span></div>");
		await expect(viewP6).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 6</span></div>");
		await expect(viewP7).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 10</span></div>");
		await expect(viewP8).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 10</span></div>");
		await expect(viewP9).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 10</span></div>");
		await expect(viewP10).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 10</span></div>");
		expect(Component).toHaveBeenCalledTimes(4);
	});

	test("update", async () => {
		const resolves: (() => unknown)[] = [];
		async function Component({message}: {message: string}): Promise<Element> {
			await new Promise((resolve) => resolves.push(resolve));
			return <span>{message}</span>;
		}

		let viewP = render(
			<div>
				<Component message="Hello 1" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("");
		resolves[0]();
		await viewP;
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		viewP = render(
			<div>
				<Component message="Hello 2" />
			</div>,
			document.body,
		);
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		resolves[1]();
		await viewP;
		expect(document.body.innerHTML).toEqual("<div><span>Hello 2</span></div>");
		expect(resolves.length).toEqual(2);
	});

	test("out of order", async () => {
		async function Component({
			message,
			delay,
		}: {
			message: string;
			delay: number;
		}): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, delay));
			return <span>{message}</span>;
		}

		const viewP1 = render(
			<div>
				<Component message="Hello 1" delay={100} />
			</div>,
			document.body,
		);
		const viewP2 = render(
			<div>
				<Component message="Hello 2" delay={0} />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("");
		await viewP1;
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		await viewP2;
		expect(document.body.innerHTML).toEqual("<div><span>Hello 2</span></div>");
	});

	test("race where first wins", async () => {
		const t = Date.now();
		let t1: number;
		let t2: number;
		async function Loading(): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 50));
			t1 = Date.now();
			return <span>Loading...</span>;
		}

		async function Component(): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 100));
			t2 = Date.now();
			return <span>Loaded</span>;
		}

		const viewP1 = render(
			<div>
				<Loading />
			</div>,
			document.body,
		);
		const viewP2 = render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		await viewP1;
		expect(document.body.innerHTML).toEqual(
			"<div><span>Loading...</span></div>",
		);
		await viewP2;
		expect(document.body.innerHTML).toEqual("<div><span>Loaded</span></div>");
		expect(t1! - t).toBeCloseTo(50, -2);
		expect(t2! - t).toBeCloseTo(100, -2);
	});

	test("race where second wins", async () => {
		const t = Date.now();
		let t1: number;
		let t2: number;
		const promise = new Promise((resolve) => setTimeout(resolve, 100));
		async function Loading(): Promise<Element> {
			await promise;
			t1 = Date.now();
			return <span>Loading...</span>;
		}

		async function Component(): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 50));
			t2 = Date.now();
			return <span>Loaded</span>;
		}

		const viewP1 = render(
			<div>
				<Loading />
			</div>,
			document.body,
		);
		const viewP2 = render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		await viewP1;
		expect(document.body.innerHTML).toEqual("<div><span>Loaded</span></div>");
		await viewP2;
		expect(document.body.innerHTML).toEqual("<div><span>Loaded</span></div>");
		await promise;
		expect(document.body.innerHTML).toEqual("<div><span>Loaded</span></div>");
		expect(t1! - t).toBeCloseTo(100, -2);
		expect(t2! - t).toBeCloseTo(50, -2);
	});
});

describe("sync generator component", () => {
	afterEach(async () => {
		document.body.innerHTML = "";
		await render(null, document.body);
	});

	test("basic", () => {
		const Component = jest.fn(function* Component(
			this: Context,
			{message}: {message: string},
		): Generator<Element> {
			let i = 0;
			for ({message} of this) {
				if (++i > 2) {
					return <span>Final</span>;
				}

				yield (<span>{message}</span>);
			}
		});

		render(
			<div>
				<Component message="Hello 1" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		render(
			<div>
				<Component message="Hello 2" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 2</span></div>");
		render(
			<div>
				<Component message="Hello 3" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Final</span></div>");
		expect(Component).toHaveBeenCalledTimes(1);
	});

	test("refresh", () => {
		let ctx!: Context;
		function* Component(this: Context): Generator<Element> {
			ctx = this;
			let i = 1;
			while (true) {
				yield (<span>Hello {i++}</span>);
			}
		}

		render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		ctx.refresh();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 2</span></div>");
		ctx.refresh();
		ctx.refresh();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 4</span></div>");
	});

	test("updating undefined to component", () => {
		function NestedComponent() {
			return <span>Hello</span>;
		}

		let ctx!: Context;
		function* Component(this: Context): Generator<Element> {
			ctx = this;
			let mounted = false;
			while (true) {
				let component: Element | undefined;
				if (mounted) {
					component = <NestedComponent />;
				}

				yield (<span>{component}</span>);
				mounted = true;
			}
		}

		render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span></span></div>");
		ctx.refresh();
		expect(document.body.innerHTML).toEqual(
			"<div><span><span>Hello</span></span></div>",
		);
	});

	test("refresh undefined to nested component", () => {
		function NestedComponent() {
			return <span>Hello</span>;
		}

		let ctx!: Context;
		function* Component(this: Context): Generator<Element> {
			ctx = this;
			let mounted = false;
			while (true) {
				let component: Element | undefined;
				if (mounted) {
					component = <NestedComponent />;
				}

				yield (<span>{component}</span>);
				mounted = true;
			}
		}

		render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span></span></div>");
		ctx.refresh();
		expect(document.body.innerHTML).toEqual(
			"<div><span><span>Hello</span></span></div>",
		);
	});

	test("refresh null to element", () => {
		let ctx!: Context;
		function* Component(this: Context): Generator<Child> {
			ctx = this;
			yield null;
			yield (<span>Hello</span>);
			yield null;
			yield (<span>Hello again</span>);
		}

		render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div></div>");
		ctx.refresh();
		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		ctx.refresh();
		expect(document.body.innerHTML).toEqual("<div></div>");
		ctx.refresh();
		expect(document.body.innerHTML).toEqual(
			"<div><span>Hello again</span></div>",
		);
	});

	test("refresh fragment", () => {
		let ctx!: Context;
		function* Component(this: Context): Generator<Child> {
			ctx = this;
			yield (
				<Fragment>
					{null}
					<span>2</span>
					{null}
				</Fragment>
			);
			yield (
				<Fragment>
					<span>1</span>
					<span>2</span>
					<span>3</span>
				</Fragment>
			);
		}

		render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>2</span></div>");
		ctx.refresh();
		expect(document.body.innerHTML).toEqual(
			"<div><span>1</span><span>2</span><span>3</span></div>",
		);
	});

	test("events", () => {
		function* Component(this: Context): Generator<Element> {
			let count = 0;
			this.addEventListener("click", (ev) => {
				// TODO: fix typings for event listeners
				// @ts-ignore
				if (ev.target.id === "button") {
					count++;
					this.refresh();
				}
			});

			// eslint-disable-next-line
			for (const props of this) {
				yield (
					<div>
						<button id="button">Click me</button>
						<span>Button has been clicked {count} times</span>
					</div>
				);
			}
		}

		render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual(
			'<div><button id="button">Click me</button><span>Button has been clicked 0 times</span></div>',
		);

		const button = document.getElementById("button")!;
		button.click();
		expect(document.body.innerHTML).toEqual(
			'<div><button id="button">Click me</button><span>Button has been clicked 1 times</span></div>',
		);
	});

	test("async children", async () => {
		const mock = jest.fn();
		async function Component({children}: {children: any}): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 100));
			return <span>{children}</span>;
		}

		let ctx!: Context;
		function* Gen(this: Context): Generator<Element> {
			ctx = this;
			let i = 0;
			for (const _ of this) {// eslint-disable-line
				const yielded = yield (<Component>Hello {i++}</Component>);
				mock((yielded as any).outerHTML);
			}
		}

		const renderP = render(
			<div>
				<Gen />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("");
		await renderP;
		expect(document.body.innerHTML).toEqual("<div><span>Hello 0</span></div>");
		const refreshP = ctx.refresh();
		await Promise.resolve();
		expect(mock).toHaveBeenCalledTimes(1);
		expect(mock).toHaveBeenCalledWith("<span>Hello 0</span>");
		expect(document.body.innerHTML).toEqual("<div><span>Hello 0</span></div>");
		await refreshP;
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		ctx.refresh();
		await Promise.resolve();
		expect(mock).toHaveBeenCalledTimes(2);
		expect(mock).toHaveBeenCalledWith("<span>Hello 1</span>");
	});
});

describe("async generator component", () => {
	afterEach(async () => {
		document.body.innerHTML = "";
		await render(null, document.body);
	});

	test("basic", async () => {
		const Component = jest.fn(async function* Component(
			this: Context,
			{message}: {message: string},
		): AsyncGenerator<Element> {
			let i = 0;
			for await ({message} of this) {
				if (++i > 2) {
					return <span>Final</span>;
				}

				yield (<span>{message}</span>);
			}
		});

		await render(
			<div>
				<Component message="Hello 1" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		await render(
			<div>
				<Component message="Hello 2" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 2</span></div>");
		await render(
			<div>
				<Component message="Hello 3" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Final</span></div>");
		expect(Component).toHaveBeenCalledTimes(1);
	});

	test("multiple yields per update", async () => {
		let resolve!: () => unknown;
		const Component = async function* Component(
			this: Context,
			{message}: {message: string},
		): AsyncGenerator<Element> {
			for await ({message} of this) {
				yield (<span>Loading</span>);
				await new Promise((resolve1) => (resolve = resolve1));
				yield (<span>{message}</span>);
			}
		};

		const viewP = render(
			<div>
				<Component message="Hello" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("");
		await expect(viewP).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div><span>Loading</span></div>");
		resolve();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		await render(
			<div>
				<Component message="Goodbye" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Loading</span></div>");
		resolve();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.body.innerHTML).toEqual("<div><span>Goodbye</span></div>");
	});

	test("multiple updates", async () => {
		let push!: (value: Element) => unknown;
		function Component(): AsyncGenerator<Element> {
			return new Repeater((push1) => (push = push1));
		}

		let renderP = render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		push(<span>Hello 1</span>);
		await renderP;
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		push(<span>Hello 2</span>);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.body.innerHTML).toEqual("<div><span>Hello 2</span></div>");
		push(<span>Hello 3</span>);
		await new Promise((resolve) => setTimeout(resolve, 0));
		push(<span>Hello 4</span>);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 3</span></div>");
	});

	test("async unmount", async () => {
		let cleanup!: () => unknown;
		async function* Component(this: Context, {message}: {message: string}) {
			if (cleanup !== undefined) {
				throw new Error("Rendered component twice");
			}

			try {
				for await ({message} of this) {
					yield (<span>{message}</span>);
				}
			} finally {
				await new Promise((resolve) => (cleanup = resolve));
			}
		}

		await render(
			<div>
				<Component message="Hello 1" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		render(<div />, document.body);
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		cleanup();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.body.innerHTML).toEqual("<div></div>");
	});

	test("async unmount preserves hanging children", async () => {
		let cleanup!: () => unknown;
		async function* Component(this: Context, {message}: {message: string}) {
			if (cleanup !== undefined) {
				throw new Error("Rendered component twice");
			}

			try {
				for await ({message} of this) {
					yield (<span>{message}</span>);
				}
			} finally {
				await new Promise((resolve) => (cleanup = resolve));
			}
		}

		await render(
			<div>
				<Component message="Hello 1" />
				<span>Goodbye 1</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			"<div><span>Hello 1</span><span>Goodbye 1</span></div>",
		);
		render(<div />, document.body);
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		render(
			<div>
				<span>Hello 2</span>
				<span>Goodbye 2</span>
			</div>,
			document.body,
		);
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual(
			"<div><span>Hello 1</span><span>Goodbye 2</span></div>",
		);
		cleanup();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.body.innerHTML).toEqual(
			"<div><span>Hello 2</span><span>Goodbye 2</span></div>",
		);
		render(
			<div>
				{null}
				<span>Goodbye 2</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			"<div><span>Goodbye 2</span></div>",
		);
		render(
			<div>
				<span>Hello 3</span>
				<span>Goodbye 2</span>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			"<div><span>Hello 3</span><span>Goodbye 2</span></div>",
		);
	});

	test("parents wait for async unmount", async () => {
		let cleanup!: () => unknown;
		async function* Component(this: Context, {message}: {message: string}) {
			if (cleanup !== undefined) {
				throw new Error("Rendered component twice");
			}

			try {
				for await ({message} of this) {
					yield (<span>{message}</span>);
				}
			} finally {
				await new Promise((resolve) => (cleanup = resolve));
			}
		}

		await render(
			<div>
				<div>
					<Component message="Hello 1" />
				</div>
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			"<div><div><span>Hello 1</span></div></div>",
		);
		const renderP = render(null, document.body);
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual(
			"<div><div><span>Hello 1</span></div></div>",
		);
		cleanup();
		await renderP;
		expect(document.body.innerHTML).toEqual("");
	});
});
