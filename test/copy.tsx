import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";

import {Context, Copy, createElement, Element, Fragment} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("copy");

test.after.each(() => {
	document.body.innerHTML = "";
	renderer.render(null, document.body);
});

test("copy of nothing", () => {
	renderer.render(<Copy />, document.body);
	Assert.is(document.body.innerHTML, "");
});

test("copy of nothing keyed", () => {
	renderer.render(<Copy crank-key="key" />, document.body);
	Assert.is(document.body.innerHTML, "");
});

test("copy of nothing between elements", () => {
	renderer.render(
		<div>
			<span>1</span>
			<span>2</span>
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>1</span><span>2</span></div>");

	renderer.render(
		<div>
			<span>1</span>
			<Copy />
			<span>2</span>
		</div>,
		document.body,
	);

	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>2</span></div>",
	);
});

test("copy of nothing keyed between elements", () => {
	renderer.render(
		<div>
			<span>1</span>
			<span>2</span>
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>1</span><span>2</span></div>");

	renderer.render(
		<div>
			<span>1</span>
			<Copy crank-key="key" />
			<span>2</span>
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>1</span><span>2</span></div>");
});

test("elements replaced with copies", () => {
	renderer.render(
		<div>
			<span>1</span>
			<span>2</span>
			<span>3</span>
		</div>,
		document.body,
	);

	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span></div>",
	);

	renderer.render(
		<div>
			<Copy />
			<Copy />
			<Copy />
		</div>,
		document.body,
	);

	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span></div>",
	);
});

test("elements replaced with keyed copies", () => {
	renderer.render(
		<div>
			<span>1</span>
			<span>2</span>
			<span>3</span>
		</div>,
		document.body,
	);

	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span></div>",
	);

	renderer.render(
		<div>
			<Copy crank-key="1" />
			<Copy crank-key="2" />
			<Copy crank-key="3" />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div></div>");
});

test("copy intrinsic", () => {
	renderer.render(<div>Hello</div>, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello</div>");
	renderer.render(<Copy />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello</div>");
});

test("copy component", () => {
	function Component({message}: {message: string}): Element {
		return <span>{message}</span>;
	}

	renderer.render(
		<div>
			<Component message="Hello" />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
	renderer.render(
		<div>
			<Copy />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
});

test("copy array return value", () => {
	function Component({copy}: {copy?: boolean}) {
		if (copy) {
			return <Copy />;
		} else {
			return [1, 2, 3];
		}
	}

	renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "123");
	renderer.render(<Component copy={true} />, document.body);
	Assert.is(document.body.innerHTML, "123");
});

test("copy children", () => {
	let spans = [
		<span crank-key="2">2</span>,
		<span crank-key="3">3</span>,
		<span crank-key="4">4</span>,
		<span crank-key="5">5</span>,
		<span crank-key="6">6</span>,
	];
	renderer.render(
		<div>
			<span>1</span>
			{spans}
			<span>7</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span></div>",
	);
	const span1 = document.body.firstChild!.childNodes[0];
	const span2 = document.body.firstChild!.childNodes[1];
	const span3 = document.body.firstChild!.childNodes[2];
	const span4 = document.body.firstChild!.childNodes[3];
	const span5 = document.body.firstChild!.childNodes[4];
	const span6 = document.body.firstChild!.childNodes[5];
	const span7 = document.body.firstChild!.childNodes[6];
	spans = spans.reverse().map((el) => <Copy crank-key={el.key} />);
	renderer.render(
		<div>
			<span>1</span>
			{spans}
			<span>7</span>
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>6</span><span>5</span><span>4</span><span>3</span><span>2</span><span>7</span></div>",
	);
	renderer.render(
		<div>
			<span>1</span>
			{spans}
			<span>7</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.firstChild!.childNodes[0], span1);
	Assert.is(document.body.firstChild!.childNodes[1], span6);
	Assert.is(document.body.firstChild!.childNodes[2], span5);
	Assert.is(document.body.firstChild!.childNodes[3], span4);
	Assert.is(document.body.firstChild!.childNodes[4], span3);
	Assert.is(document.body.firstChild!.childNodes[5], span2);
	Assert.is(document.body.firstChild!.childNodes[6], span7);
	spans = spans.reverse().map((el) => <Copy crank-key={el.key} />);
	renderer.render(
		<div>
			<span>1</span>
			{spans}
			<span>7</span>
		</div>,
		document.body,
	);
	Assert.is(document.body.firstChild!.childNodes[0], span1);
	Assert.is(document.body.firstChild!.childNodes[1], span2);
	Assert.is(document.body.firstChild!.childNodes[2], span3);
	Assert.is(document.body.firstChild!.childNodes[3], span4);
	Assert.is(document.body.firstChild!.childNodes[4], span5);
	Assert.is(document.body.firstChild!.childNodes[5], span6);
	Assert.is(document.body.firstChild!.childNodes[6], span7);
});

test("copy async element", async () => {
	async function Component() {
		await new Promise((resolve) => setTimeout(resolve));
		return <span>Hello</span>;
	}

	const p1 = renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	const p2 = renderer.render(<Copy />, document.body);
	Assert.ok(p2 instanceof Promise);
	Assert.is(await p1, await p2);
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
});

test("copy async function", async () => {
	async function Component() {
		await new Promise((resolve) => setTimeout(resolve));
		return <span>Hello</span>;
	}

	const p1 = renderer.render(<Component />, document.body);
	const p2 = renderer.render(<Copy />, document.body);
	Assert.ok(p2 instanceof Promise);
	Assert.is(await p1, await p2);

	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<span>Hello</span>");
});

test("copy async generator", async () => {
	async function* Component(this: Context) {
		for await (const _ of this) {
			await new Promise((resolve) => setTimeout(resolve));
			yield <span>Hello</span>;
		}
	}

	const p1 = renderer.render(<Component />, document.body);
	const p2 = renderer.render(<Copy />, document.body);
	Assert.ok(p2 instanceof Promise);
	Assert.is(await p1, await p2);
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<span>Hello</span>");
});

test("copy async fragment", async () => {
	async function Component() {
		return <span>Hello</span>;
	}

	const p1 = renderer.render(
		<Fragment>
			<Component />
		</Fragment>,
		document.body,
	);

	const p2 = renderer.render(<Copy />, document.body);
	Assert.ok(p2 instanceof Promise);
	Assert.is(await p1, await p2);
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<span>Hello</span>");
});

// https://github.com/bikeshaving/crank/issues/196
test("copy async generator siblings with refresh", async () => {
	async function* Component(this: Context) {
		let i = 0;
		for await (const _ of this) {
			await new Promise((resolve) => setTimeout(resolve));
			yield <span>{i}</span>;
			i++;
		}
	}

	let ctx!: Context;
	function* Parent(this: Context) {
		ctx = this;
		let i = 1;
		for (const _ of this) {
			const children = Array.from({length: i}, (_, j) =>
				i === j + 1 ? <Component /> : <Copy />,
			);

			yield <div>{children}</div>;
			i++;
		}
	}

	await renderer.render(<Parent />, document.body);
	Assert.is(document.body.innerHTML, "<div><span>0</span></div>");
	await ctx.refresh();
	Assert.is(document.body.innerHTML, "<div><span>0</span><span>0</span></div>");
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<div><span>0</span><span>0</span></div>");
});

test("refs", () => {
	renderer.render(<div>Hello</div>, document.body);
	const mock = Sinon.fake();
	renderer.render(<Copy crank-ref={mock} />, document.body);
	Assert.is(mock.lastCall.args[0], document.body.firstChild);
});

test("async refs", async () => {
	async function Component() {
		await new Promise((resolve) => setTimeout(resolve));
		return <span>Hello</span>;
	}

	const p = renderer.render(<Component />, document.body);
	const mock = Sinon.fake();
	renderer.render(<Copy crank-ref={mock} />, document.body);
	Assert.is(mock.callCount, 0);
	await p;
	Assert.is(mock.lastCall.args[0], document.body.firstChild);
});

test.run();
