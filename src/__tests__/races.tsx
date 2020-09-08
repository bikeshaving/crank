/** @jsx createElement */
import {createElement, Child, Context, Element} from "../index";
import {renderer} from "../dom";

describe("races", () => {
	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("async fn vs value", async () => {
		async function Component(): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 200));
			return <div>Async</div>;
		}

		const p = renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("");
		await new Promise((resolve) => setTimeout(resolve, 100));
		renderer.render("Async component blown away", document.body);
		expect(document.body.innerHTML).toEqual("Async component blown away");
		await p;
		expect(document.body.innerHTML).toEqual("Async component blown away");
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(document.body.innerHTML).toEqual("Async component blown away");
	});

	test("fast vs slow", async () => {
		const t = Date.now();
		let t1: number;
		let t2: number;
		async function Fast(): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 100));
			t1 = Date.now();
			return <span>Fast</span>;
		}

		async function Slow(): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 200));
			t2 = Date.now();
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
		expect(Date.now() - t).toBeCloseTo(100, -2);
		expect(document.body.innerHTML).toEqual("<div><span>Fast</span></div>");
		await p2;
		expect(Date.now() - t).toBeCloseTo(200, -2);
		expect(document.body.innerHTML).toEqual("<div><span>Slow</span></div>");
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual("<div><span>Slow</span></div>");
		expect(t1! - t).toBeCloseTo(100, -2);
		expect(t2! - t).toBeCloseTo(200, -2);
	});

	test("slow vs fast", async () => {
		const t = Date.now();
		let t1: number;
		let t2: number;
		async function Slow(): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 200));
			t1 = Date.now();
			return <span>Slow</span>;
		}

		async function Fast(): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 100));
			t2 = Date.now();
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
		expect(Date.now() - t).toBeCloseTo(100, -2);
		expect(document.body.innerHTML).toEqual("<div><span>Fast</span></div>");
		await p2;
		expect(Date.now() - t).toBeCloseTo(100, -2);
		expect(document.body.innerHTML).toEqual("<div><span>Fast</span></div>");
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual("<div><span>Fast</span></div>");
		expect(t1! - t).toBeCloseTo(200, -2);
		expect(t2! - t).toBeCloseTo(100, -2);
	});

	test("async component vs intrinsic", async () => {
		async function Component(): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 200));
			return <div>Async</div>;
		}

		const p = renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("");
		await new Promise((resolve) => setTimeout(resolve, 100));
		renderer.render(<div>Async component blown away</div>, document.body);
		expect(document.body.innerHTML).toEqual(
			"<div>Async component blown away</div>",
		);
		await p;
		expect(document.body.innerHTML).toEqual(
			"<div>Async component blown away</div>",
		);
		await new Promise((resolve) => setTimeout(resolve, 200));
		expect(document.body.innerHTML).toEqual(
			"<div>Async component blown away</div>",
		);
	});

	test("intrinsic vs async component", async () => {
		async function Component(): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 200));
			return <div>Async</div>;
		}

		renderer.render(<div>This should be blown away</div>, document.body);
		const p = renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual(
			"<div>This should be blown away</div>",
		);
		await p;
		expect(document.body.innerHTML).toEqual("<div>Async</div>");
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual("<div>Async</div>");
	});

	test("slow vs fast in async generator updated via renderer.render", async () => {
		const t = Date.now();
		const slowFn = jest.fn();
		async function Slow(): Promise<Element> {
			slowFn();
			await new Promise((resolve) => setTimeout(resolve, 200));
			return <div>Slow</div>;
		}

		const fastFn = jest.fn();
		async function Fast(): Promise<Element> {
			fastFn();
			await new Promise((resolve) => setTimeout(resolve, 100));
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
		expect(document.body.innerHTML).toEqual("<div>Slow</div>");
		expect(Date.now() - t).toBeCloseTo(200, -2);
		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("<div>Fast</div>");
		expect(Date.now() - t).toBeCloseTo(300, -2);
		const p = Promise.resolve(renderer.render(<Component />, document.body));
		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("<div>Fast</div>");
		expect(Date.now() - t).toBeCloseTo(400, -2);
		await p;
		expect(document.body.innerHTML).toEqual("<div>Fast</div>");
		expect(Date.now() - t).toBeCloseTo(400, -2);
		await new Promise((resolve) => setTimeout(resolve, 200));
		expect(document.body.innerHTML).toEqual("<div>Fast</div>");
		expect(slowFn).toHaveBeenCalledTimes(2);
		expect(fastFn).toHaveBeenCalledTimes(2);
	});

	test("slow vs fast in async generator updated via refresh", async () => {
		const t = Date.now();
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
		expect(Date.now() - t).toBeCloseTo(200, -2);
		expect(document.body.innerHTML).toEqual("<div>Slow</div>");
		await ctx.refresh();
		expect(Date.now() - t).toBeCloseTo(300, -2);
		expect(document.body.innerHTML).toEqual("<div>Fast</div>");
		const p = ctx.refresh();
		await ctx.refresh();
		expect(document.body.innerHTML).toEqual("<div>Fast</div>");
		expect(Date.now() - t).toBeCloseTo(400, -2);
		await p;
		expect(Date.now() - t).toBeCloseTo(400, -2);
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual("<div>Fast</div>");
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
		expect(document.body.innerHTML).toEqual(
			"<div>Hello: <span>Fast 0</span></div>",
		);
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(document.body.innerHTML).toEqual(
			"<div>Hello: <span>Slow 0</span></div>",
		);
		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual(
			"<div>Hello: <span>Fast 1</span></div>",
		);
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(document.body.innerHTML).toEqual(
			"<div>Hello: <span>Slow 1</span></div>",
		);
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(document.body.innerHTML).toEqual(
			"<div>Hello: <span>Slow 1</span></div>",
		);
	});

	test("fast async function vs slow async generator in async generator", async () => {
		async function Fast({i}: {i: number}): Promise<Child> {
			await new Promise((resolve) => setTimeout(resolve, 100));
			return <span>Fast {i}</span>;
		}

		const slowFn = jest.fn();
		async function* Slow(
			this: Context,
			{i}: {i: number},
		): AsyncGenerator<Child> {
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
		expect(document.body.innerHTML).toEqual(
			"<div>Hello: <span>Fast 0</span></div>",
		);
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(document.body.innerHTML).toEqual(
			"<div>Hello: <span>Slow 0</span></div>",
		);
		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual(
			"<div>Hello: <span>Fast 1</span></div>",
		);
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(document.body.innerHTML).toEqual(
			"<div>Hello: <span>Slow 1</span></div>",
		);
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(document.body.innerHTML).toEqual(
			"<div>Hello: <span>Slow 1</span></div>",
		);
		expect(slowFn).toHaveBeenCalledTimes(2);
	});

	test("fast async generator vs slow async function", async () => {
		const t = Date.now();
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
		expect(document.body.innerHTML).toEqual("<span>Fast</span>");
		expect(Date.now() - t).toBeCloseTo(100, -2);
		await p2;
		expect(document.body.innerHTML).toEqual("<span>Slow</span>");
		expect(Date.now() - t).toBeCloseTo(200, -2);
	});

	test("slow async generator vs fast async function", async () => {
		const t = Date.now();
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
		expect(document.body.innerHTML).toEqual("<span>Fast</span>");
		expect(Date.now() - t).toBeCloseTo(100, -2);
		await p2;
		expect(document.body.innerHTML).toEqual("<span>Fast</span>");
		expect(Date.now() - t).toBeCloseTo(100, -2);
		await new Promise((resolve) => setTimeout(resolve, 200));
		expect(document.body.innerHTML).toEqual("<span>Fast</span>");
	});

	test("sync generator with slow children vs fast async function", async () => {
		const t = Date.now();
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
		expect(document.body.innerHTML).toEqual("<span>Fast</span>");
		expect(Date.now() - t).toBeCloseTo(100, -2);
		await p2;
		expect(document.body.innerHTML).toEqual("<span>Fast</span>");
		expect(Date.now() - t).toBeCloseTo(100, -2);
		await new Promise((resolve) => setTimeout(resolve, 200));
		expect(document.body.innerHTML).toEqual("<span>Fast</span>");
	});

	test("sync generator with fast children vs fast async function", async () => {
		const t = Date.now();
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
		expect(document.body.innerHTML).toEqual("<span>Fast</span>");
		expect(Date.now() - t).toBeCloseTo(100, -2);
		await p2;
		expect(document.body.innerHTML).toEqual("<span>Slow</span>");
		expect(Date.now() - t).toBeCloseTo(200, -2);
		await new Promise((resolve) => setTimeout(resolve, 200));
		expect(document.body.innerHTML).toEqual("<span>Slow</span>");
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
		expect(document.body.innerHTML).toEqual("<span>Fast</span>");
		await p2;
		expect(document.body.innerHTML).toEqual("<div><span>Slow</span></div>");
	});
});
