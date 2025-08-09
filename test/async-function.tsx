import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";

import {createElement, Element} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("async functions");
test.before.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test("basic", async () => {
	async function Component({message}: {message: string}): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 100));
		return <span>{message}</span>;
	}

	const p = renderer.render(
		<div>
			<Component message="Hello" />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "");
	Assert.is(await p, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
});

test("updates enqueue", async () => {
	const fn = Sinon.fake();
	async function Component({message}: {message: string}): Promise<Element> {
		fn();
		await new Promise((resolve) => setTimeout(resolve, 25));
		return <span>{message}</span>;
	}

	const p1 = renderer.render(
		<div>
			<Component message="Hello 1" />
		</div>,
		document.body,
	);
	const p2 = renderer.render(
		<div>
			<Component message="Hello 2" />
		</div>,
		document.body,
	);
	const p3 = renderer.render(
		<div>
			<Component message="Hello 3" />
		</div>,
		document.body,
	);
	const p4 = renderer.render(
		<div>
			<Component message="Hello 4" />
		</div>,
		document.body,
	);
	const p5 = renderer.render(
		<div>
			<Component message="Hello 5" />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "");
	Assert.is(await p1, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div><span>Hello 1</span></div>");
	Assert.is(await p2, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div><span>Hello 5</span></div>");
	Assert.is(await p3, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div><span>Hello 5</span></div>");
	Assert.is(await p4, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div><span>Hello 5</span></div>");
	const p6 = renderer.render(
		<div>
			<Component message="Hello 6" />
		</div>,
		document.body,
	);
	const p7 = renderer.render(
		<div>
			<Component message="Hello 7" />
		</div>,
		document.body,
	);
	const p8 = renderer.render(
		<div>
			<Component message="Hello 8" />
		</div>,
		document.body,
	);
	const p9 = renderer.render(
		<div>
			<Component message="Hello 9" />
		</div>,
		document.body,
	);
	const p10 = renderer.render(
		<div>
			<Component message="Hello 10" />
		</div>,
		document.body,
	);
	Assert.is(await p5, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div><span>Hello 5</span></div>");
	Assert.is(await p6, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div><span>Hello 6</span></div>");
	Assert.is(await p7, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div><span>Hello 10</span></div>");
	Assert.is(await p8, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div><span>Hello 10</span></div>");
	Assert.is(await p9, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div><span>Hello 10</span></div>");
	Assert.is(await p10, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div><span>Hello 10</span></div>");
	Assert.is(fn.callCount, 4);
});

test("update", async () => {
	const resolves: Array<Function> = [];
	async function Component({message}: {message: string}): Promise<Element> {
		await new Promise((resolve) => resolves.push(resolve));
		return <span>{message}</span>;
	}

	let p = renderer.render(
		<div>
			<Component message="Hello 1" />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "");
	resolves[0]();
	await p;
	Assert.is(document.body.innerHTML, "<div><span>Hello 1</span></div>");
	p = renderer.render(
		<div>
			<Component message="Hello 2" />
		</div>,
		document.body,
	);
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<div><span>Hello 1</span></div>");
	resolves[1]();
	await p;
	Assert.is(document.body.innerHTML, "<div><span>Hello 2</span></div>");
	Assert.is(resolves.length, 2);
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

	const p1 = renderer.render(
		<div>
			<Component message="Hello 1" delay={100} />
		</div>,
		document.body,
	);
	const p2 = renderer.render(
		<div>
			<Component message="Hello 2" delay={0} />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "");
	await p1;
	Assert.is(document.body.innerHTML, "<div><span>Hello 1</span></div>");
	await p2;
	Assert.is(document.body.innerHTML, "<div><span>Hello 2</span></div>");
});

test("async children enqueue", async () => {
	const Child = Sinon.fake(async function Child({
		message,
	}: {
		message: string;
	}): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 100));
		return <div>{message}</div>;
	});

	async function Parent({message}: {message: string}): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 50));
		return <Child message={message} />;
	}

	const p1 = renderer.render(<Parent message="Hello 1" />, document.body);
	const p2 = renderer.render(<Parent message="Hello 2" />, document.body);
	const p3 = renderer.render(<Parent message="Hello 3" />, document.body);
	const p4 = renderer.render(<Parent message="Hello 4" />, document.body);
	Assert.is(await p1, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>Hello 1</div>");
	Assert.is(await p2, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>Hello 4</div>");
	Assert.is(await p3, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>Hello 4</div>");
	const p5 = renderer.render(<Parent message="Hello 5" />, document.body);
	const p6 = renderer.render(<Parent message="Hello 6" />, document.body);
	const p7 = renderer.render(<Parent message="Hello 7" />, document.body);
	const p8 = renderer.render(<Parent message="Hello 8" />, document.body);
	Assert.is(await p4, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>Hello 4</div>");
	Assert.is(await p5, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>Hello 5</div>");
	Assert.is(await p6, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>Hello 8</div>");
	Assert.is(await p7, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>Hello 8</div>");
	Assert.is(await p8, document.body.firstChild);
	Assert.is(document.body.innerHTML, "<div>Hello 8</div>");
	Assert.is(Child.callCount, 4);
});

test.run();
