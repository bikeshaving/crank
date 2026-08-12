import {describe, test, beforeEach, afterEach, expect} from "@b9g/libuild/test";
import * as Sinon from "sinon";

import {
	createElement,
	Child,
	Children,
	Context,
	Element,
	Fragment,
} from "../src/crank.js";
import {renderer} from "../src/dom.js";

describe("async generator", () => {
	beforeEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("basic", async () => {
		const Component = Sinon.fake(async function* Component(
			this: Context,
			{message}: {message: string},
		): AsyncGenerator<Element> {
			let i = 0;
			for ({message} of this) {
				if (++i > 2) {
					return <span>Final</span>;
				}

				yield <span>{message}</span>;
			}
		});

		await renderer.render(
			<div>
				<Component message="Hello 1" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>Hello 1</span></div>");
		await renderer.render(
			<div>
				<Component message="Hello 2" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>Hello 2</span></div>");
		await renderer.render(
			<div>
				<Component message="Hello 3" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>Final</span></div>");
		expect(Component.callCount).toBe(1);
	});

	test("refresh", async () => {
		let ctx!: Context;
		async function* Component(this: Context): AsyncGenerator<Element> {
			ctx = this;
			let i = 1;
			while (true) {
				yield <span>Hello {i++}</span>;
			}
		}

		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<div><span>Hello 1</span></div>");
		await ctx.refresh();
		expect(document.body.innerHTML).toBe("<div><span>Hello 2</span></div>");
		await ctx.refresh();
		await ctx.refresh();
		expect(document.body.innerHTML).toBe("<div><span>Hello 4</span></div>");
	});

	test("refreshing doesn’t cause siblings to update", async () => {
		const mock = Sinon.fake();
		function Sibling(): Element {
			mock();
			return <div>Sibling</div>;
		}

		let ctx!: Context;
		async function* Component(this: Context): AsyncGenerator<Element> {
			ctx = this;
			let i = 0;
			while (true) {
				i++;
				yield <div>Hello {i}</div>;
			}
		}
		await renderer.render(
			<Fragment>
				<Component />
				<Sibling />
			</Fragment>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div>Hello 1</div><div>Sibling</div>",
		);
		expect(mock.callCount).toBe(1);
		await ctx.refresh();
		expect(document.body.innerHTML).toBe(
			"<div>Hello 2</div><div>Sibling</div>",
		);
		expect(mock.callCount).toBe(1);
		await ctx.refresh();
		await ctx.refresh();
		await ctx.refresh();
		await ctx.refresh();
		await ctx.refresh();
		expect(document.body.innerHTML).toBe(
			"<div>Hello 7</div><div>Sibling</div>",
		);
		expect(mock.callCount).toBe(1);
		await renderer.render(
			<Fragment>
				<Component />
				<Sibling />
			</Fragment>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div>Hello 8</div><div>Sibling</div>",
		);
		expect(mock.callCount).toBe(2);
	});

	test("while (true) loop", async () => {
		async function* Timer(this: Context): AsyncGenerator<Element> {
			let i = 0;
			while (true) {
				yield <span>{i++}</span>;
			}
		}

		await renderer.render(<Timer />, document.body);
		expect(document.body.innerHTML).toBe("<span>0</span>");
		await new Promise((resolve) => setTimeout(resolve, 50));
		// Should still be paused at first yield!
		expect(document.body.innerHTML).toBe("<span>0</span>");
		await renderer.render(<Timer />, document.body);
		expect(document.body.innerHTML).toBe("<span>1</span>");
		await renderer.render(<Timer />, document.body);
		expect(document.body.innerHTML).toBe("<span>2</span>");
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(document.body.innerHTML).toBe("<span>2</span>");
	});

	test("for...of yield resumes with elements", async () => {
		let node: HTMLElement | undefined;
		async function* Component(this: Context) {
			let i = 0;
			for ({} of this) {
				node = yield <div id={i}>{i}</div>;
				i++;
			}
		}

		await renderer.render(<Component />, document.body);
		expect(node).toBe(undefined);
		await renderer.render(<Component />, document.body);
		expect(node!.outerHTML).toBe('<div id="1">1</div>');
		expect(document.body.innerHTML).toBe('<div id="1">1</div>');
		await renderer.render(<Component />, document.body);
		expect(node!.outerHTML).toBe('<div id="2">2</div>');
		expect(document.body.innerHTML).toBe('<div id="2">2</div>');
	});

	test("for...of yield resumes with elements with async children", async () => {
		async function Child({id}: {id: number}) {
			await new Promise((resolve) => setTimeout(resolve));
			return <div id={id}>{id}</div>;
		}
		let node: HTMLElement | undefined;
		async function* Component(this: Context) {
			let i = 0;
			for ({} of this) {
				node = yield <Child id={i} />;
				i++;
			}
		}

		await renderer.render(<Component />, document.body);
		expect(node).toBe(undefined);
		await renderer.render(<Component />, document.body);
		expect(node!.outerHTML).toBe('<div id="1">1</div>');
		expect(document.body.innerHTML).toBe('<div id="1">1</div>');
		await renderer.render(<Component />, document.body);
		expect(node!.outerHTML).toBe('<div id="2">2</div>');
		expect(document.body.innerHTML).toBe('<div id="2">2</div>');
	});

	test("for await...of", async () => {
		async function* Component(
			this: Context,
			{message}: {message: string},
		): AsyncGenerator<Element> {
			for await ({message} of this) {
				yield <span>{message}</span>;
			}
		}

		await renderer.render(<Component message="Hello" />, document.body);
		expect(document.body.innerHTML).toBe("<span>Hello</span>");
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe("<span>Hello</span>");
		await renderer.render(<Component message="Hello again" />, document.body);
		expect(document.body.innerHTML).toBe("<span>Hello again</span>");
	});

	test("for await...of nested", async () => {
		const Component = Sinon.fake(async function* Component(
			this: Context,
			{message}: {message: string},
		): AsyncGenerator<Element> {
			let i = 0;
			for await ({message} of this) {
				if (i >= 2) {
					return <span>Final</span>;
				}

				yield <span>{message}</span>;
				i++;
			}
		});

		await renderer.render(
			<div>
				<Component message="Hello 1" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>Hello 1</span></div>");
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe("<div><span>Hello 1</span></div>");
		await renderer.render(
			<div>
				<Component message="Hello 2" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>Hello 2</span></div>");
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe("<div><span>Hello 2</span></div>");
		await renderer.render(
			<div>
				<Component message="Hello 3" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>Final</span></div>");
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe("<div><span>Final</span></div>");
		expect(Component.callCount).toBe(1);
	});

	test("for await...of multiple yields per update", async () => {
		let resolve: undefined | Function;
		async function* Component(
			this: Context,
			{message}: {message: string},
		): AsyncGenerator<Element> {
			for await ({message} of this) {
				yield <span>Loading</span>;
				await new Promise((resolve1) => (resolve = resolve1));
				yield <span>{message}</span>;
			}
		}

		await renderer.render(
			<div>
				<Component message="Hello" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>Loading</span></div>");
		await new Promise((resolve) => setTimeout(resolve));
		resolve!();
		resolve = undefined;
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe("<div><span>Hello</span></div>");
		await renderer.render(
			<div>
				<Component message="Goodbye" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>Loading</span></div>");
		await new Promise((resolve) => setTimeout(resolve));
		resolve!();
		resolve = undefined;
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe("<div><span>Goodbye</span></div>");
	});

	test("for await...of multiple yields per update sync", async () => {
		async function* Component(
			this: Context,
			{message}: {message: string},
		): AsyncGenerator<Element> {
			for await ({message} of this) {
				yield <span>{message} 1</span>;
				yield <span>{message} 2</span>;
				yield <span>{message} 3</span>;
			}
		}

		const result = (await renderer.render(
			<div>
				<Component message="Hello" />
			</div>,
			document.body,
		)) as HTMLElement;

		expect(result.outerHTML).toBe("<div><span>Hello 3</span></div>");
		expect(document.body.innerHTML).toBe("<div><span>Hello 3</span></div>");

		await Promise.resolve();
		expect(document.body.innerHTML).toBe("<div><span>Hello 3</span></div>");
	});

	test("for await...of with Fragment parent", async () => {
		let resolve!: Function;
		async function* Component(this: Context) {
			for await (const _ of this) {
				yield 1;
				await new Promise((resolve1) => (resolve = resolve1));
				yield 2;
			}
		}

		await renderer.render(
			<Fragment>
				<Component />
			</Fragment>,
			document.body,
		);

		expect(document.body.innerHTML).toBe("1");
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(document.body.innerHTML).toBe("1");
		resolve();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.body.innerHTML).toBe("2");
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(document.body.innerHTML).toBe("2");
	});

	test("for await...of yield resumes with a promise of an element", async () => {
		let nodeP: Promise<HTMLElement> | undefined;
		async function* Component(this: Context) {
			let i = 0;
			for await ({} of this) {
				nodeP = yield <div id={i}>{i}</div>;
				i++;
			}
		}

		await renderer.render(<Component />, document.body);
		let html = (await nodeP!).outerHTML;
		expect(html).toBe('<div id="0">0</div>');
		expect(document.body.innerHTML).toBe('<div id="0">0</div>');
		await renderer.render(<Component />, document.body);
		html = (await nodeP!).outerHTML;
		expect(html).toBe('<div id="1">1</div>');
		expect(document.body.innerHTML).toBe('<div id="1">1</div>');
		await renderer.render(<Component />, document.body);
		html = (await nodeP!).outerHTML;
		expect(html).toBe('<div id="2">2</div>');
		expect(document.body.innerHTML).toBe('<div id="2">2</div>');
	});

	test("for await...of yield resumes async children", async () => {
		const t = Date.now();
		const Async = Sinon.fake(async function Async({
			id,
		}: {
			id: number;
		}): Promise<Child> {
			await new Promise((resolve) => setTimeout(resolve, 100));
			return <div id={id}>{id}</div>;
		});

		let html: Promise<string> | undefined;
		async function* Component(this: Context) {
			let i = 0;
			for await (const _ of this) {
				const node: Promise<HTMLElement> = yield <Async id={i} />;
				html = node.then((node: HTMLElement) => node.outerHTML);
				await node;
				i++;
			}
		}

		await renderer.render(<Component />, document.body);
		expect(await html).toBe('<div id="0">0</div>');
		expect(document.body.innerHTML).toBe('<div id="0">0</div>');
		// TODO: Find a better way to test the timings
		expect(Date.now() - t > 100 - 30 && Date.now() - t < 100 + 30).toBeTruthy();
		await renderer.render(<Component />, document.body);
		expect(await html).toBe('<div id="1">1</div>');
		expect(document.body.innerHTML).toBe('<div id="1">1</div>');
		expect(Date.now() - t > 200 - 30 && Date.now() - t < 200 + 30).toBeTruthy();
		await renderer.render(<Component />, document.body);
		expect(await html).toBe('<div id="2">2</div>');
		expect(document.body.innerHTML).toBe('<div id="2">2</div>');
		expect(Date.now() - t > 300 - 30 && Date.now() - t < 300 + 30).toBeTruthy();
		expect(Async.callCount).toBe(3);
	});

	test("yield before for await loop", async () => {
		async function* Component(this: Context) {
			let i = 0;
			yield <div>{i++}</div>;
			for await (const _ of this) {
				yield <div>{i++}</div>;
			}
		}

		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<div>0</div>");
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toBe("<div>0</div>");
		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<div>1</div>");
	});

	test("concurrent unmount", async () => {
		const mock = Sinon.fake();
		async function* Component(this: Context): AsyncGenerator<Child> {
			try {
				for await ({} of this) {
					yield "Hello world";
				}
			} finally {
				mock();
			}
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		renderer.render(null, document.body);
		expect(document.body.innerHTML).toBe("");
		expect(mock.callCount).toBe(0);
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe("");
		expect(mock.callCount).toBe(1);
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toBe("");
		expect(mock.callCount).toBe(1);
	});

	test("async generator returns", async () => {
		const Component = Sinon.fake(async function* Component(
			this: Context,
		): AsyncGenerator<Child> {
			let started = false;
			for await (const _ of this) {
				if (started) {
					return "Goodbye";
				} else {
					yield "Hello";
					started = true;
				}
			}
		});

		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div>Hello</div>");
		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div>Goodbye</div>");
		expect(Component.callCount).toBe(1);
		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div>Hello</div>");
		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div>Goodbye</div>");
		expect(Component.callCount).toBe(2);
		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div>Hello</div>");
		expect(Component.callCount).toBe(3);
	});

	test("try/finally", async () => {
		const mock = Sinon.fake();
		async function* Component(this: Context): AsyncGenerator<Child> {
			try {
				let i = 0;
				for await (const _ of this) {
					yield <div>Hello {i++}</div>;
				}
			} finally {
				mock();
			}
		}

		await renderer.render(<Component />, document.body);
		await renderer.render(<Component />, document.body);
		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<div>Hello 2</div>");
		expect(mock.callCount).toBe(0);
		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toBe("<div></div>");
		await new Promise((resolve) => setTimeout(resolve));
		expect(mock.callCount).toBe(1);
	});

	test("for...of", async () => {
		const beforeYieldFn = Sinon.fake();
		const afterYieldFn = Sinon.fake();
		const afterLoopFn = Sinon.fake();
		async function* Component(this: Context) {
			let i = 0;
			for ({} of this) {
				beforeYieldFn();
				yield <div>Hello {i++}</div>;
				afterYieldFn();
			}

			afterLoopFn();
		}

		await renderer.render(<Component />, document.body);
		expect(beforeYieldFn.callCount).toBe(1);
		expect(afterYieldFn.callCount).toBe(0);
		expect(document.body.innerHTML).toBe("<div>Hello 0</div>");
		await renderer.render(<Component />, document.body);
		expect(beforeYieldFn.callCount).toBe(2);
		expect(afterYieldFn.callCount).toBe(1);
		expect(document.body.innerHTML).toBe("<div>Hello 1</div>");

		renderer.render(null, document.body);
		expect(document.body.innerHTML).toBe("");
		await new Promise((resolve) => setTimeout(resolve));
		expect(afterLoopFn.callCount).toBe(1);
	});

	test("for...of delayed", async () => {
		const beforeYieldFn = Sinon.fake();
		const afterYieldFn = Sinon.fake();
		const afterLoopFn = Sinon.fake();
		async function* Component(this: Context) {
			let i = 0;
			await new Promise((resolve) => setTimeout(resolve));
			for ({} of this) {
				beforeYieldFn();
				yield <div>Hello {i++}</div>;
				afterYieldFn();
			}

			afterLoopFn();
		}

		const p = renderer.render(<Component />, document.body);
		expect(beforeYieldFn.callCount).toBe(0);
		expect(afterYieldFn.callCount).toBe(0);
		await p;
		expect(beforeYieldFn.callCount).toBe(1);
		expect(afterYieldFn.callCount).toBe(0);
		expect(document.body.innerHTML).toBe("<div>Hello 0</div>");
		await renderer.render(<Component />, document.body);
		expect(beforeYieldFn.callCount).toBe(2);
		expect(afterYieldFn.callCount).toBe(1);
		expect(document.body.innerHTML).toBe("<div>Hello 1</div>");

		renderer.render(null, document.body);
		expect(document.body.innerHTML).toBe("");
		await new Promise((resolve) => setTimeout(resolve));
		expect(afterLoopFn.callCount).toBe(1);
	});

	test("for await...of", async () => {
		const beforeYieldFn = Sinon.fake();
		const afterYieldFn = Sinon.fake();
		const afterLoopFn = Sinon.fake();
		async function* Component(this: Context): AsyncGenerator<Child> {
			let i = 0;
			for await (const _ of this) {
				beforeYieldFn();
				yield <div>Hello {i++}</div>;
				afterYieldFn();
			}

			afterLoopFn();
		}

		await renderer.render(<Component />, document.body);
		expect(beforeYieldFn.callCount).toBe(1);
		expect(afterYieldFn.callCount).toBe(1);
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(beforeYieldFn.callCount).toBe(1);
		expect(afterYieldFn.callCount).toBe(1);
		await renderer.render(<Component />, document.body);
		expect(beforeYieldFn.callCount).toBe(2);
		expect(afterYieldFn.callCount).toBe(2);
		await renderer.render(<Component />, document.body);
		expect(beforeYieldFn.callCount).toBe(3);
		expect(afterYieldFn.callCount).toBe(3);
		expect(document.body.innerHTML).toBe("<div>Hello 2</div>");
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(beforeYieldFn.callCount).toBe(3);
		expect(afterYieldFn.callCount).toBe(3);
		expect(afterLoopFn.callCount).toBe(0);
		renderer.render(null, document.body);
		expect(document.body.innerHTML).toBe("");
		await new Promise((resolve) => setTimeout(resolve));
		expect(afterLoopFn.callCount).toBe(1);
	});

	test("for await...of with await in loop", async () => {
		const beforeYieldFn = Sinon.fake();
		const afterYieldFn = Sinon.fake();
		const afterLoopFn = Sinon.fake();
		async function* Component(this: Context): AsyncGenerator<Child> {
			let i = 0;
			for await (const _ of this) {
				await new Promise((r) => setTimeout(r, 10));
				beforeYieldFn();
				yield <div>Hello {i++}</div>;
				afterYieldFn();
			}

			afterLoopFn();
		}

		// first render
		await renderer.render(<Component />, document.body);
		expect(beforeYieldFn.callCount).toBe(1);
		expect(afterYieldFn.callCount).toBe(1);
		expect(document.body.innerHTML).toBe("<div>Hello 0</div>");

		// second render
		await renderer.render(<Component />, document.body);
		expect(beforeYieldFn.callCount).toBe(2);
		expect(afterYieldFn.callCount).toBe(2);
		expect(document.body.innerHTML).toBe("<div>Hello 1</div>");

		// third render is interrupted by unmount
		renderer.render(<Component />, document.body);
		await new Promise((resolve) => setTimeout(resolve));
		renderer.render(null, document.body);
		expect(document.body.innerHTML).toBe("");
		expect(afterLoopFn.callCount).toBe(0);
		expect(document.body.innerHTML).toBe("");

		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(afterLoopFn.callCount).toBe(1);
	});

	test("for await...of with multiple yields", async () => {
		const beforeYieldFn = Sinon.fake();
		const afterYieldFn = Sinon.fake();
		const afterLoopFn = Sinon.fake();
		async function* Component(this: Context): AsyncGenerator<Child> {
			let i = 0;
			for await ({} of this) {
				i++;
				beforeYieldFn();
				yield <div>Hello {i}</div>;
				await new Promise((r) => setTimeout(r, 10));
				yield <div>Goodbye {i}</div>;
				afterYieldFn();
			}

			afterLoopFn();
		}

		// first render
		await renderer.render(<Component />, document.body);
		expect(beforeYieldFn.callCount).toBe(1);
		expect(afterYieldFn.callCount).toBe(0);
		expect(document.body.innerHTML).toBe("<div>Hello 1</div>");
		await new Promise((r) => setTimeout(r, 10));
		expect(beforeYieldFn.callCount).toBe(1);
		expect(afterYieldFn.callCount).toBe(1);
		expect(document.body.innerHTML).toBe("<div>Goodbye 1</div>");

		// second render
		await renderer.render(<Component />, document.body);
		expect(beforeYieldFn.callCount).toBe(2);
		expect(afterYieldFn.callCount).toBe(1);
		expect(document.body.innerHTML).toBe("<div>Hello 2</div>");
		await new Promise((r) => setTimeout(r, 10));
		expect(beforeYieldFn.callCount).toBe(2);
		expect(afterYieldFn.callCount).toBe(2);
		expect(document.body.innerHTML).toBe("<div>Goodbye 2</div>");

		// third render is interrupted by unmount
		renderer.render(<Component />, document.body);
		renderer.render(null, document.body);
		expect(document.body.innerHTML).toBe("");
		expect(afterLoopFn.callCount).toBe(0);
		expect(document.body.innerHTML).toBe("");

		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(afterLoopFn.callCount).toBe(1);
	});

	test("Context iterator returns on unmount", async () => {
		const mock = Sinon.fake();
		async function* Component(this: Context): AsyncGenerator<Element> {
			let i = 0;
			for await ({} of this) {
				yield <div>Hello {i++}</div>;
			}

			mock();
		}

		await renderer.render(<Component />, document.body);
		await renderer.render(<Component />, document.body);
		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<div>Hello 2</div>");
		expect(mock.callCount).toBe(0);
		renderer.render(null, document.body);
		await new Promise((resolve) => setTimeout(resolve));
		expect(mock.callCount).toBe(1);
	});

	test("return called when component continues to yield", async () => {
		const mock = Sinon.fake();
		async function* Component(this: Context) {
			let i = 0;
			for await ({} of this) {
				yield <div>Hello {i++}</div>;
			}

			mock();
			yield <div>Exited {i++}</div>;
			mock();
			throw new Error("unreachable");
		}

		await renderer.render(<Component />, document.body);
		await renderer.render(<Component />, document.body);
		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<div>Hello 2</div>");
		expect(mock.callCount).toBe(0);
		renderer.render(null, document.body);
		await new Promise((resolve) => setTimeout(resolve));
		expect(mock.callCount).toBe(1);
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(mock.callCount).toBe(1);
	});

	// https://github.com/bikeshaving/crank/pull/121
	test("unmount edge case", async () => {
		function Switch({children, active}: {children: Children; active: boolean}) {
			if (!active) {
				return null;
			}

			return children;
		}

		async function* AsyncGen(this: Context) {
			for await (const _ of this) {
				yield <span>true</span>;
			}
		}

		function* Component() {
			let toggle = true;
			while (true) {
				yield (
					<div>
						<Switch active={toggle}>
							<AsyncGen />
						</Switch>
						<Switch active={!toggle}>
							<span>false</span>
						</Switch>
					</div>
				);

				toggle = !toggle;
			}
		}

		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<div><span>true</span></div>");
		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<div><span>false</span></div>");
		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<div><span>true</span></div>");
	});

	test("multiple iterations without a yield throw", async () => {
		let i = 0;
		async function* Component(this: Context) {
			for await (const _ of this) {
				// just so the test suite doesn’t enter an infinite loop
				if (i > 100) {
					yield;
					return;
				}

				i++;
			}
		}

		const fn = Sinon.fake();

		try {
			await renderer.render(<Component />, document.body);
			throw new Error("unreachable");
		} catch (err: any) {
			expect(
				err.message.endsWith("context iterated twice without a yield"),
			).toBeTruthy();
			fn();
		}

		expect(i).toBe(1);
		expect(fn.callCount).toBe(1);
	});

	test("for...of enqueues", async () => {
		const fn = Sinon.fake();
		async function* Component(
			this: Context<typeof Component>,
			{message}: {message: string},
		) {
			for ({message} of this) {
				await new Promise((resolve) => setTimeout(resolve));
				fn();
				yield <span>{message}</span>;
			}
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

		expect(await p1).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div><span>Hello 1</span></div>");
		expect(await p2).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div><span>Hello 5</span></div>");
		expect(await p3).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div><span>Hello 5</span></div>");
		expect(await p4).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div><span>Hello 5</span></div>");
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
		expect(await p5).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div><span>Hello 5</span></div>");
		expect(await p6).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div><span>Hello 6</span></div>");
		expect(await p7).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div><span>Hello 10</span></div>");
		expect(await p8).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div><span>Hello 10</span></div>");
		expect(await p9).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div><span>Hello 10</span></div>");
		expect(await p10).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div><span>Hello 10</span></div>");
		expect(fn.callCount).toBe(4);
	});

	test("for await...of updates enqueue", async () => {
		const beforeAwaitFn = Sinon.fake();
		async function* Component(this: Context, {callIndex}: {callIndex: number}) {
			let runIndex = 1;
			for await ({callIndex} of this) {
				beforeAwaitFn();
				await new Promise((resolve) => setTimeout(resolve, 25));
				yield (
					<div>
						run {runIndex}, call {callIndex}
					</div>
				);
				runIndex++;
			}
		}

		const p1 = renderer.render(<Component callIndex={1} />, document.body);
		const p2 = renderer.render(<Component callIndex={2} />, document.body);
		const p3 = renderer.render(<Component callIndex={3} />, document.body);
		const p4 = renderer.render(<Component callIndex={4} />, document.body);
		const p5 = renderer.render(<Component callIndex={5} />, document.body);

		expect(await p1).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div>run 1, call 1</div>");
		expect(beforeAwaitFn.callCount).toBe(2);
		expect(await p2).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div>run 2, call 5</div>");
		expect(await p3).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div>run 2, call 5</div>");
		expect(await p4).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div>run 2, call 5</div>");

		const p6 = renderer.render(<Component callIndex={6} />, document.body);
		const p7 = renderer.render(<Component callIndex={7} />, document.body);
		const p8 = renderer.render(<Component callIndex={8} />, document.body);
		const p9 = renderer.render(<Component callIndex={9} />, document.body);
		const p10 = renderer.render(<Component callIndex={10} />, document.body);

		expect(await p5).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div>run 2, call 5</div>");
		expect(await p6).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div>run 3, call 6</div>");
		expect(await p7).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div>run 4, call 10</div>");
		expect(await p8).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div>run 4, call 10</div>");
		expect(await p9).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div>run 4, call 10</div>");
		expect(await p10).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div>run 4, call 10</div>");
		expect(beforeAwaitFn.callCount).toBe(4);
	});

	test("stale renders are skipped", async () => {
		const characterDatas: Array<string> = [];
		const mutationObserver = new MutationObserver((records) => {
			for (const record of records) {
				if (record.type === "characterData") {
					characterDatas.push(record.target.textContent!);
				}
			}
		});

		mutationObserver.observe(document.body, {
			characterData: true,
			subtree: true,
		});
		let resolve: undefined | Function;
		async function* Component(this: Context, {message}: {message: string}) {
			for await ({message} of this) {
				yield <span>{message} before</span>;
				await new Promise((resolve1) => (resolve = resolve1));
				yield <span>{message} after</span>;
			}
		}

		try {
			await renderer.render(<Component message="Hello" />, document.body);
			expect(document.body.innerHTML).toBe("<span>Hello before</span>");
			resolve!();
			await new Promise((resolve) => setTimeout(resolve));
			expect(document.body.innerHTML).toBe("<span>Hello after</span>");
			await renderer.render(<Component message="Hello again" />, document.body);
			expect(document.body.innerHTML).toBe("<span>Hello again before</span>");
			const resolve1 = resolve;
			const p = renderer.render(<Component message="Goodbye" />, document.body);
			resolve1!();
			await p;
			expect(document.body.innerHTML).toBe("<span>Goodbye before</span>");
			expect(characterDatas).toEqual([
				" after",
				"Hello again",
				" before",
				"Goodbye",
			]);
		} finally {
			mutationObserver.disconnect();
		}
	});

	test("for...of then for...await of then for...of", async () => {
		const beforeYieldFn = Sinon.fake();
		const afterYieldFn = Sinon.fake();
		const afterLoopFn = Sinon.fake();
		async function* Component(this: Context) {
			let i = 0;
			for ({} of this) {
				beforeYieldFn();
				yield <div>for...of {i++}</div>;
				afterYieldFn();
				break;
			}

			afterLoopFn();
			for await ({} of this) {
				beforeYieldFn();
				yield <div>for await...of {i++}</div>;
				// this code executes immediately because we are in a for await...of loop
				afterYieldFn();
				if (i === 4) {
					break;
				}
			}

			afterLoopFn();

			for ({} of this) {
				beforeYieldFn();
				yield <div>for...of {i++}</div>;
				afterYieldFn();
			}

			afterLoopFn();
		}

		await renderer.render(<Component />, document.body);
		expect(beforeYieldFn.callCount).toBe(1);
		expect(afterYieldFn.callCount).toBe(0);
		expect(document.body.innerHTML).toBe("<div>for...of 0</div>");

		await renderer.render(<Component />, document.body);
		expect(afterLoopFn.callCount).toBe(1);
		expect(beforeYieldFn.callCount).toBe(2);
		expect(afterYieldFn.callCount).toBe(2);
		expect(document.body.innerHTML).toBe("<div>for await...of 1</div>");

		await renderer.render(<Component />, document.body);

		expect(afterLoopFn.callCount).toBe(1);
		expect(beforeYieldFn.callCount).toBe(3);
		expect(afterYieldFn.callCount).toBe(3);
		expect(document.body.innerHTML).toBe("<div>for await...of 2</div>");

		await renderer.render(<Component />, document.body);
		expect(afterLoopFn.callCount).toBe(2);
		expect(beforeYieldFn.callCount).toBe(5);
		expect(afterYieldFn.callCount).toBe(4);
		expect(document.body.innerHTML).toBe("<div>for...of 4</div>");

		await renderer.render(<Component />, document.body);
		expect(afterLoopFn.callCount).toBe(2);
		expect(beforeYieldFn.callCount).toBe(6);
		expect(afterYieldFn.callCount).toBe(5);
		expect(document.body.innerHTML).toBe("<div>for...of 5</div>");

		await renderer.render(null, document.body);
		expect(document.body.innerHTML).toBe("");
		await new Promise((resolve) => setTimeout(resolve));
		expect(afterLoopFn.callCount).toBe(3);
	});

	test("for await...of waits for nephew", async () => {
		let mock = Sinon.fake();
		async function* Component(this: Context) {
			for await ({} of this) {
				yield <div>Children 1</div>;
				mock();
				yield <div>Children 2</div>;
			}
		}

		let resolveNephew: Function;
		async function Nephew() {
			await new Promise((resolve) => (resolveNephew = resolve));
			return <span>Nephew</span>;
		}

		function Passthrough() {
			return (
				<div>
					<Nephew />
				</div>
			);
		}

		renderer.render(
			<div>
				<div>
					<Passthrough />
				</div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe("");
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(document.body.innerHTML).toBe("");
		expect(mock.callCount).toBe(1);
		resolveNephew!();
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toBe(
			"<div><div><div><span>Nephew</span></div></div><div>Children 2</div></div>",
		);
	});

	// https://github.com/bikeshaving/crank/issues/334
	test("refresh before yield does not throw", async () => {
		async function* Component(this: Context) {
			await Promise.resolve();
			this.refresh();
			this.refresh();
			for (const {} of this) {
				yield <span>Hello</span>;
			}
		}

		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>Hello</span></div>");
	});
});
