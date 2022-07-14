import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";

import {createElement, Child, Context, Element} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("races");

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test("async fn vs value", async () => {
	async function Component(): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 200));
		return <div>Async</div>;
	}

	const p = renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "");
	await new Promise((resolve) => setTimeout(resolve, 100));
	renderer.render("Async component blown away", document.body);
	Assert.is(document.body.innerHTML, "Async component blown away");
	await p;
	Assert.is(document.body.innerHTML, "Async component blown away");
	await new Promise((resolve) => setTimeout(resolve, 300));
	Assert.is(document.body.innerHTML, "Async component blown away");
});

test("fast vs slow", async () => {
	async function Fast(): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 100));
		return <span>Fast</span>;
	}

	async function Slow(): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 200));
		return <span>Slow</span>;
	}

	const p1 = renderer.render(
		<div>
			<Fast />
		</div>,
		document.body,
	);
	const p2 = renderer.render(
		<div>
			<Slow />
		</div>,
		document.body,
	);

	await p1;
	Assert.is(document.body.innerHTML, "<div><span>Fast</span></div>");

	await p2;
	Assert.is(document.body.innerHTML, "<div><span>Slow</span></div>");

	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<div><span>Slow</span></div>");
});

test("slow vs fast", async () => {
	async function Slow(): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 200));
		return <span>Slow</span>;
	}

	async function Fast(): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 100));
		return <span>Fast</span>;
	}

	const p1 = renderer.render(
		<div>
			<Slow />
		</div>,
		document.body,
	);

	const p2 = renderer.render(
		<div>
			<Fast />
		</div>,
		document.body,
	);

	await p1;
	Assert.is(document.body.innerHTML, "<div><span>Fast</span></div>");
	await p2;
	Assert.is(document.body.innerHTML, "<div><span>Fast</span></div>");

	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<div><span>Fast</span></div>");
});

test("async component vs intrinsic", async () => {
	async function Component(): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 200));
		return <div>Async</div>;
	}

	const p = renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "");
	await new Promise((resolve) => setTimeout(resolve, 100));
	renderer.render(<div>Async component blown away</div>, document.body);
	Assert.is(document.body.innerHTML, "<div>Async component blown away</div>");
	await p;
	Assert.is(document.body.innerHTML, "<div>Async component blown away</div>");
	await new Promise((resolve) => setTimeout(resolve, 200));
	Assert.is(document.body.innerHTML, "<div>Async component blown away</div>");
});

test("intrinsic vs async component", async () => {
	async function Component(): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 200));
		return <div>Async</div>;
	}

	renderer.render(<div>This should be blown away</div>, document.body);
	const p = renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>This should be blown away</div>");
	await p;
	Assert.is(document.body.innerHTML, "<div>Async</div>");
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<div>Async</div>");
});

test("slow vs fast in async generator updated via renderer.render", async () => {
	const slowFn = Sinon.fake();
	async function Slow(): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 200));
		slowFn();
		return <div>Slow</div>;
	}

	const fastFn = Sinon.fake();
	async function Fast(): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 100));
		fastFn();
		return <div>Fast</div>;
	}

	async function* Component(this: Context): AsyncGenerator<Child> {
		let i = 0;
		for await (const _ of this) {
			if (i % 2 === 0) {
				yield <Slow />;
			} else {
				yield <Fast />;
			}

			i++;
		}
	}

	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Slow</div>");
	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Fast</div>");
	const p = Promise.resolve(renderer.render(<Component />, document.body));
	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Fast</div>");
	await p;
	Assert.is(document.body.innerHTML, "<div>Fast</div>");
	await new Promise((resolve) => setTimeout(resolve, 200));
	Assert.is(document.body.innerHTML, "<div>Fast</div>");
	Assert.is(slowFn.callCount, 2);
	Assert.is(fastFn.callCount, 2);
});

test("slow vs fast in async generator updated via refresh", async () => {
	async function Slow(): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 200));
		return <div>Slow</div>;
	}

	async function Fast(): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 100));
		return <div>Fast</div>;
	}

	let ctx!: Context;
	async function* Component(this: Context): AsyncGenerator<Child> {
		ctx = this;
		let i = 0;
		for await (const _ of this) {
			if (i % 2 === 0) {
				yield <Slow />;
			} else {
				yield <Fast />;
			}

			i++;
		}
	}

	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Slow</div>");
	await ctx.refresh();
	Assert.is(document.body.innerHTML, "<div>Fast</div>");
	const p = ctx.refresh();
	await ctx.refresh();
	Assert.is(document.body.innerHTML, "<div>Fast</div>");
	await p;
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<div>Fast</div>");
});

test("fast async function vs slow async function in async generator", async () => {
	async function Fast({i}: {i: number}): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 100));
		return <span>Fast {i}</span>;
	}

	async function Slow({i}: {i: number}): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 200));
		return <span>Slow {i}</span>;
	}

	async function* Component(this: Context): AsyncGenerator<Child, any, any> {
		let i = 0;
		for await (const _ of this) {
			yield (
				<div>
					Hello: <Fast i={i} />
				</div>
			);
			yield (
				<div>
					Hello: <Slow i={i} />
				</div>
			);
			i++;
		}
	}

	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello: <span>Fast 0</span></div>");
	await new Promise((resolve) => setTimeout(resolve, 300));
	Assert.is(document.body.innerHTML, "<div>Hello: <span>Slow 0</span></div>");
	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello: <span>Fast 1</span></div>");
	await new Promise((resolve) => setTimeout(resolve, 300));
	Assert.is(document.body.innerHTML, "<div>Hello: <span>Slow 1</span></div>");
	await new Promise((resolve) => setTimeout(resolve, 300));
	Assert.is(document.body.innerHTML, "<div>Hello: <span>Slow 1</span></div>");
});

test("fast async function vs slow async generator in async generator", async () => {
	async function Fast({i}: {i: number}): Promise<Child> {
		await new Promise((resolve) => setTimeout(resolve, 100));
		return <span>Fast {i}</span>;
	}

	const slowFn = Sinon.fake();
	async function* Slow(this: Context, {i}: {i: number}): AsyncGenerator<Child> {
		slowFn();
		await new Promise((resolve) => setTimeout(resolve, 200));
		for await (const _ of this) {
			yield <span>Slow {i}</span>;
		}
	}

	async function* Component(this: Context): AsyncGenerator<Child> {
		let i = 0;
		for await (const _ of this) {
			yield (
				<div>
					Hello: <Fast i={i} />
				</div>
			);
			yield (
				<div>
					Hello: <Slow i={i} />
				</div>
			);
			i++;
		}
	}

	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello: <span>Fast 0</span></div>");
	await new Promise((resolve) => setTimeout(resolve, 300));
	Assert.is(document.body.innerHTML, "<div>Hello: <span>Slow 0</span></div>");
	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello: <span>Fast 1</span></div>");
	await new Promise((resolve) => setTimeout(resolve, 300));
	Assert.is(document.body.innerHTML, "<div>Hello: <span>Slow 1</span></div>");
	await new Promise((resolve) => setTimeout(resolve, 300));
	Assert.is(document.body.innerHTML, "<div>Hello: <span>Slow 1</span></div>");
	Assert.is(slowFn.callCount, 2);
});

test("fast async generator vs slow async function", async () => {
	async function* Fast(this: Context): AsyncGenerator<Element> {
		await new Promise((resolve) => setTimeout(resolve, 100));
		for await (const _ of this) {
			yield <span>Fast</span>;
		}
	}

	async function Slow(): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 200));
		return <span>Slow</span>;
	}

	const p1 = renderer.render(<Fast />, document.body);
	const p2 = renderer.render(<Slow />, document.body);
	await p1;
	Assert.is(document.body.innerHTML, "<span>Fast</span>");
	await p2;
	Assert.is(document.body.innerHTML, "<span>Slow</span>");
	await new Promise((resolve) => setTimeout(resolve, 200));
	Assert.is(document.body.innerHTML, "<span>Slow</span>");
});

test("slow async generator vs fast async function", async () => {
	async function* Slow(this: Context): AsyncGenerator<Element> {
		await new Promise((resolve) => setTimeout(resolve, 200));
		for await (const _ of this) {
			yield <span>Slow</span>;
		}
	}

	async function Fast(): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 100));
		return <span>Fast</span>;
	}

	const p1 = renderer.render(<Slow />, document.body);
	const p2 = renderer.render(<Fast />, document.body);
	await p1;
	Assert.is(document.body.innerHTML, "<span>Fast</span>");
	await p2;
	Assert.is(document.body.innerHTML, "<span>Fast</span>");
	await new Promise((resolve) => setTimeout(resolve, 200));
	Assert.is(document.body.innerHTML, "<span>Fast</span>");
});

test("sync generator with slow children vs fast async function", async () => {
	async function Slow(): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 200));
		return <span>Slow</span>;
	}

	async function Fast(): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 100));
		return <span>Fast</span>;
	}

	function* SlowGen(): Generator<Element> {
		while (true) {
			yield <Slow />;
		}
	}

	const p1 = renderer.render(<SlowGen />, document.body);
	const p2 = renderer.render(<Fast />, document.body);
	await p1;
	Assert.is(document.body.innerHTML, "<span>Fast</span>");
	await p2;
	Assert.is(document.body.innerHTML, "<span>Fast</span>");
	await new Promise((resolve) => setTimeout(resolve, 200));
	Assert.is(document.body.innerHTML, "<span>Fast</span>");
});

test("sync generator with fast children vs fast async function", async () => {
	async function Slow(): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 200));
		return <span>Slow</span>;
	}

	async function Fast(): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 100));
		return <span>Fast</span>;
	}

	function* FastGen(): Generator<Element> {
		while (true) {
			yield <Fast />;
		}
	}

	const p1 = renderer.render(<FastGen />, document.body);
	const p2 = renderer.render(<Slow />, document.body);
	await p1;
	Assert.is(document.body.innerHTML, "<span>Fast</span>");
	await p2;
	Assert.is(document.body.innerHTML, "<span>Slow</span>");
	await new Promise((resolve) => setTimeout(resolve, 200));
	Assert.is(document.body.innerHTML, "<span>Slow</span>");
});

test("slow async component vs intrinsic with fast async children", async () => {
	async function Slow(): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 200));
		return <span>Slow</span>;
	}

	async function Fast(): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 100));
		return <span>Fast</span>;
	}
	const p1 = renderer.render(<Fast />, document.body);
	const p2 = renderer.render(
		<div>
			<Slow />
		</div>,
		document.body,
	);
	await p1;
	Assert.is(document.body.innerHTML, "<span>Fast</span>");
	await p2;
	Assert.is(document.body.innerHTML, "<div><span>Slow</span></div>");
});

test.run();
