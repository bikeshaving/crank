/** @jsx createElement */
import {
	createElement,
	Child,
	Children,
	Context,
	Element,
	Fragment,
} from "../index";
import {renderer} from "../dom";

// TODO: start splitting out these tests into separate files

/* eslint-disable no-unreachable */
describe("sync function component", () => {
	afterEach(async () => {
		document.body.innerHTML = "";
		await renderer.render(null, document.body);
	});

	test("basic", () => {
		function Component({message}: {message: string}): Element {
			return <span>{message}</span>;
		}

		renderer.render(
			<div>
				<Component message="Hello" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		renderer.render(
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

		renderer.render(<Component ChildTag="div" />, document.body);
		expect(document.body.innerHTML).toEqual("<div>Hello world</div>");
		renderer.render(<Component ChildTag="span" />, document.body);
		expect(document.body.innerHTML).toEqual("<span>Hello world</span>");
	});

	test("async children enqueue", async () => {
		const Child = jest.fn(async function Child({
			message,
		}: {
			message: string;
		}): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 100));
			return <div>{message}</div>;
		});

		function Parent({message}: {message: string}): Element {
			return <Child message={message} />;
		}

		const p1 = renderer.render(<Parent message="Hello 1" />, document.body);
		const p2 = renderer.render(<Parent message="Hello 2" />, document.body);
		const p3 = renderer.render(<Parent message="Hello 3" />, document.body);
		const p4 = renderer.render(<Parent message="Hello 4" />, document.body);
		await expect(p1).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div>Hello 1</div>");
		await expect(p2).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div>Hello 4</div>");
		await expect(p3).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div>Hello 4</div>");
		const p5 = renderer.render(<Parent message="Hello 5" />, document.body);
		const p6 = renderer.render(<Parent message="Hello 6" />, document.body);
		const p7 = renderer.render(<Parent message="Hello 7" />, document.body);
		const p8 = renderer.render(<Parent message="Hello 8" />, document.body);
		await expect(p4).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div>Hello 4</div>");
		await expect(p5).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div>Hello 5</div>");
		await expect(p6).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div>Hello 8</div>");
		await expect(p7).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div>Hello 8</div>");
		await expect(p8).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div>Hello 8</div>");
		expect(Child).toHaveBeenCalledTimes(4);
	});

	test("event listeners are cleaned up", () => {
		let ctx!: Context;
		function Component(this: Context) {
			ctx = this;
			return <span>Hello</span>;
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		const listener1 = jest.fn();
		const listener2 = jest.fn();
		ctx.addEventListener("foo", listener1);
		ctx.addEventListener("bar", listener1);
		ctx.dispatchEvent(new Event("foo"));
		expect(listener1).toHaveBeenCalledTimes(1);
		expect(listener2).toHaveBeenCalledTimes(0);
		const removeEventListener = jest.spyOn(ctx, "removeEventListener");
		renderer.render(null, document.body);
		expect(removeEventListener).toHaveBeenCalledTimes(2);
		ctx.dispatchEvent(new Event("foo"));
		expect(listener1).toHaveBeenCalledTimes(1);
		expect(listener2).toHaveBeenCalledTimes(0);
	});
});

describe("async function component", () => {
	afterEach(async () => {
		document.body.innerHTML = "";
		await renderer.render(null, document.body);
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
		expect(document.body.innerHTML).toEqual("");
		await expect(p).resolves.toBeDefined();
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
		expect(document.body.innerHTML).toEqual("");
		await expect(p1).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		await expect(p2).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 5</span></div>");
		await expect(p3).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 5</span></div>");
		await expect(p4).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 5</span></div>");
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
		await expect(p5).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 5</span></div>");
		await expect(p6).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 6</span></div>");
		await expect(p7).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 10</span></div>");
		await expect(p8).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 10</span></div>");
		await expect(p9).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 10</span></div>");
		await expect(p10).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div><span>Hello 10</span></div>");
		expect(Component).toHaveBeenCalledTimes(4);
	});

	test("update", async () => {
		const resolves: (() => unknown)[] = [];
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
		expect(document.body.innerHTML).toEqual("");
		resolves[0]();
		await p;
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		p = renderer.render(
			<div>
				<Component message="Hello 2" />
			</div>,
			document.body,
		);
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		resolves[1]();
		await p;
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
		expect(document.body.innerHTML).toEqual("");
		await p1;
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		await p2;
		expect(document.body.innerHTML).toEqual("<div><span>Hello 2</span></div>");
	});

	test("async children enqueue", async () => {
		const Child = jest.fn(async function Child({
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
		await expect(p1).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div>Hello 1</div>");
		await expect(p2).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div>Hello 4</div>");
		await expect(p3).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div>Hello 4</div>");
		const p5 = renderer.render(<Parent message="Hello 5" />, document.body);
		const p6 = renderer.render(<Parent message="Hello 6" />, document.body);
		const p7 = renderer.render(<Parent message="Hello 7" />, document.body);
		const p8 = renderer.render(<Parent message="Hello 8" />, document.body);
		await expect(p4).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div>Hello 4</div>");
		await expect(p5).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div>Hello 5</div>");
		await expect(p6).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div>Hello 8</div>");
		await expect(p7).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div>Hello 8</div>");
		await expect(p8).resolves.toBeDefined();
		expect(document.body.innerHTML).toEqual("<div>Hello 8</div>");
		expect(Child).toHaveBeenCalledTimes(4);
	});
});

describe("sync generator component", () => {
	afterEach(async () => {
		document.body.innerHTML = "";
		await renderer.render(null, document.body);
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

				yield <span>{message}</span>;
			}
		});

		renderer.render(
			<div>
				<Component message="Hello 1" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		renderer.render(
			<div>
				<Component message="Hello 2" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 2</span></div>");
		renderer.render(
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
				yield <span>Hello {i++}</span>;
			}
		}

		renderer.render(
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

				yield <span>{component}</span>;
				mounted = true;
			}
		}

		renderer.render(
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

				yield <span>{component}</span>;
				mounted = true;
			}
		}

		renderer.render(
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
			yield <span>Hello</span>;
			yield null;
			yield <span>Hello again</span>;
		}

		renderer.render(
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

	test("refresh with different child", () => {
		let ctx!: Context;
		function* Component(this: Context): Generator<Child> {
			ctx = this;
			yield <span>1</span>;
			yield <div>2</div>;
			yield <span>3</span>;
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		ctx.refresh();
		expect(document.body.innerHTML).toEqual("<div><div>2</div></div>");
		ctx.refresh();
		expect(document.body.innerHTML).toEqual("<div><span>3</span></div>");
		ctx.refresh();
		expect(document.body.innerHTML).toEqual("<div></div>");
	});

	test("refresh with different child and siblings", () => {
		let ctx!: Context;
		function* Component(this: Context): Generator<Child> {
			if (ctx === undefined) {
				ctx = this;
			}

			yield <span>Hello</span>;
			yield <div>Hello</div>;
			yield <span>Hello</span>;
		}

		renderer.render(
			<div>
				<Component />
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			"<div><span>Hello</span><span>Hello</span></div>",
		);
		ctx.refresh();
		expect(document.body.innerHTML).toEqual(
			"<div><div>Hello</div><span>Hello</span></div>",
		);
		ctx.refresh();
		expect(document.body.innerHTML).toEqual(
			"<div><span>Hello</span><span>Hello</span></div>",
		);
		ctx.refresh();
		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
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

		renderer.render(
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
				if ((ev.target as HTMLElement).id === "button") {
					count++;
					this.refresh();
				}
			});

			for (const _ of this) {
				yield (
					<div>
						<button id="button">Click me</button>
						<span>Button has been clicked {count} times</span>
					</div>
				);
			}
		}

		renderer.render(<Component />, document.body);
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
		async function Component({
			children,
		}: {
			children: Children;
		}): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 100));
			return <span>{children}</span>;
		}

		let ctx!: Context;
		function* Gen(this: Context): Generator<Element> {
			ctx = this;
			let i = 0;
			for (const _ of this) {
				const yielded = yield <Component>Hello {i++}</Component>;
				mock((yielded as any).outerHTML);
			}
		}

		const renderP = renderer.render(
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

	test("refreshing doesn’t cause siblings to update", () => {
		const mock = jest.fn();
		function Sibling(): Element {
			mock();
			return <div>Sibling</div>;
		}

		let ctx!: Context;
		function* Component(this: Context): Generator<Element> {
			ctx = this;
			let i = 0;
			while (true) {
				i++;
				yield <div>Hello {i}</div>;
			}
		}
		renderer.render(
			<Fragment>
				<Component />
				<Sibling />
			</Fragment>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			"<div>Hello 1</div><div>Sibling</div>",
		);
		expect(mock).toHaveBeenCalledTimes(1);
		ctx.refresh();
		expect(document.body.innerHTML).toEqual(
			"<div>Hello 2</div><div>Sibling</div>",
		);
		expect(mock).toHaveBeenCalledTimes(1);
		ctx.refresh();
		ctx.refresh();
		ctx.refresh();
		ctx.refresh();
		ctx.refresh();
		expect(document.body.innerHTML).toEqual(
			"<div>Hello 7</div><div>Sibling</div>",
		);
		expect(mock).toHaveBeenCalledTimes(1);
		renderer.render(
			<Fragment>
				<Component />
				<Sibling />
			</Fragment>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			"<div>Hello 8</div><div>Sibling</div>",
		);
		expect(mock).toHaveBeenCalledTimes(2);
	});

	test("refreshing child doesn’t cause siblings to update", () => {
		const mock = jest.fn();
		function Sibling(): Element {
			mock();
			return <div>Sibling</div>;
		}

		let ctx!: Context;
		function* Child(this: Context): Generator<Element> {
			ctx = this;
			let i = 0;
			while (true) {
				i++;
				yield <div>Hello {i}</div>;
			}
		}

		function* Parent(): Generator<Element> {
			while (true) {
				yield (
					<Fragment>
						<Child />
						<Sibling />
					</Fragment>
				);
			}
		}

		renderer.render(<Parent />, document.body);
		expect(document.body.innerHTML).toEqual(
			"<div>Hello 1</div><div>Sibling</div>",
		);
		expect(mock).toHaveBeenCalledTimes(1);
		ctx.refresh();
		expect(document.body.innerHTML).toEqual(
			"<div>Hello 2</div><div>Sibling</div>",
		);
		expect(mock).toHaveBeenCalledTimes(1);
	});

	test("yield resumes with a node", () => {
		let html: string | undefined;
		function* Component(): Generator<Element> {
			let i = 0;
			while (true) {
				const node: any = yield <div id={i}>{i}</div>;
				html = node.outerHTML;
				i++;
			}
		}

		renderer.render(<Component />, document.body);
		expect(html).toBeUndefined();
		renderer.render(<Component />, document.body);
		expect(html).toEqual('<div id="0">0</div>');
		expect(document.body.innerHTML).toEqual('<div id="1">1</div>');
		renderer.render(<Component />, document.body);
		expect(html).toEqual('<div id="1">1</div>');
		expect(document.body.innerHTML).toEqual('<div id="2">2</div>');
	});

	test("generator returns", () => {
		const Component = jest.fn(function* Component(): Generator<Child> {
			yield "Hello";
			return "Goodbye";
		});

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div>Hello</div>");
		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div>Goodbye</div>");
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
		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div>Goodbye</div>");
		expect(Component).toHaveBeenCalledTimes(1);
		renderer.render(<div>{null}</div>, document.body);
		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div>Hello</div>");
	});

	test("generator returns with async children and concurrent updates", async () => {
		async function Child(): Promise<string> {
			return "child";
		}

		// eslint-disable-next-line require-yield
		const Component = jest.fn(function* Component(): Generator<Child> {
			return <Child />;
		});

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div>child</div>");
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(Component).toHaveBeenCalledTimes(1);
	});

	test("unmount", () => {
		const mock = jest.fn();
		function* Component(): Generator<Child> {
			try {
				let i = 0;
				while (true) {
					yield <div>Hello {i++}</div>;
				}
			} finally {
				mock();
			}
		}

		renderer.render(<Component />, document.body);
		renderer.render(<Component />, document.body);
		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("<div>Hello 2</div>");
		expect(mock).toHaveBeenCalledTimes(0);
		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toEqual("<div></div>");
		expect(mock).toHaveBeenCalledTimes(1);
	});

	test("multiple iterations without a yield throw", () => {
		let i = 0;
		function* Component(this: Context) {
			for (const _ of this) {
				// just so the test suite doesn’t enter an infinite loop
				if (i > 100) {
					yield;
					return;
				}

				i++;
			}
		}

		expect(() => renderer.render(<Component />, document.body)).toThrow(
			"You must yield",
		);
		expect(i).toBe(1);
	});

	// TODO: it would be nice to test this like other components
	test("for await...of throws", async () => {
		let ctx: Context;
		function* Component(this: Context): Generator<null> {
			ctx = this;
			yield null;
		}

		renderer.render(<Component />, document.body);
		await expect((() => ctx![Symbol.asyncIterator]().next())()).rejects.toThrow(
			"Use for...of",
		);
	});
});

describe("async generator component", () => {
	afterEach(() => {
		document.body.innerHTML = "";
		renderer.render(null, document.body);
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

				yield <span>{message}</span>;
			}
		});

		await renderer.render(
			<div>
				<Component message="Hello 1" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		await renderer.render(
			<div>
				<Component message="Hello 2" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 2</span></div>");
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.body.innerHTML).toEqual("<div><span>Hello 2</span></div>");
		await renderer.render(
			<div>
				<Component message="Hello 3" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Final</span></div>");
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.body.innerHTML).toEqual("<div><span>Final</span></div>");
		expect(Component).toHaveBeenCalledTimes(1);
	});

	test("multiple yields per update", async () => {
		let resolve: undefined | (() => unknown);
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
		expect(document.body.innerHTML).toEqual("<div><span>Loading</span></div>");
		await new Promise((resolve) => setTimeout(resolve));
		expect(resolve).toBeDefined();
		resolve!();
		resolve = undefined;
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		await renderer.render(
			<div>
				<Component message="Goodbye" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Loading</span></div>");
		await new Promise((resolve) => setTimeout(resolve));
		expect(resolve).toBeDefined();
		resolve!();
		resolve = undefined;
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toEqual("<div><span>Goodbye</span></div>");
	});

	test("multiple yields sync", async () => {
		async function* Component(
			this: Context,
			{message}: {message: string},
		): AsyncGenerator<Element> {
			for await ({message} of this) {
				yield <span>Loading</span>;
				yield <span>{message}</span>;
			}
		}

		const p = renderer.render(
			<div>
				<Component message="Hello" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("");
		await p;
		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
	});

	test("Fragment parent", async () => {
		let resolve!: () => unknown;
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
		expect(document.body.innerHTML).toEqual("1");
		await new Promise((resolve) => setTimeout(resolve, 100));
		resolve();
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual("2");
	});

	test("yield resumes with an element", async () => {
		let html: string | undefined;
		async function* Component(this: Context) {
			let i = 0;
			for await (const _ of this) {
				const node: any = yield <div id={i}>{i}</div>;
				html = node.outerHTML;
				i++;
			}
		}

		await renderer.render(<Component />, document.body);
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(html).toEqual('<div id="0">0</div>');
		expect(document.body.innerHTML).toEqual('<div id="0">0</div>');
		await renderer.render(<Component />, document.body);
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(html).toEqual('<div id="1">1</div>');
		expect(document.body.innerHTML).toEqual('<div id="1">1</div>');
		await renderer.render(<Component />, document.body);
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(html).toEqual('<div id="2">2</div>');
		expect(document.body.innerHTML).toEqual('<div id="2">2</div>');
	});

	test("yield resumes async children", async () => {
		const t = Date.now();
		const Async = jest.fn(async function Async({
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
				const node: any = yield <Async id={i} />;
				html = node.then((node: HTMLElement) => node.outerHTML);
				await node;
				i++;
			}
		}

		await renderer.render(<Component />, document.body);
		await expect(html).resolves.toEqual('<div id="0">0</div>');
		expect(document.body.innerHTML).toEqual('<div id="0">0</div>');
		expect(Date.now() - t).toBeCloseTo(100, -2);
		await renderer.render(<Component />, document.body);
		await expect(html).resolves.toEqual('<div id="1">1</div>');
		expect(document.body.innerHTML).toEqual('<div id="1">1</div>');
		expect(Date.now() - t).toBeCloseTo(200, -2);
		await renderer.render(<Component />, document.body);
		await expect(html).resolves.toEqual('<div id="2">2</div>');
		expect(document.body.innerHTML).toEqual('<div id="2">2</div>');
		expect(Date.now() - t).toBeCloseTo(300, -2);
		expect(Async).toHaveBeenCalledTimes(3);
	});

	test("concurrent unmount", async () => {
		async function* Component(this: Context): AsyncGenerator<Child> {
			for await (const _ of this) {
				yield "Hello world";
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
		expect(document.body.innerHTML).toEqual("");
		await new Promise((resolve) => setTimeout(resolve, 100));
	});

	test("async generator returns", async () => {
		const Component = jest.fn(async function* Component(
			this: Context,
		): AsyncGenerator<Child> {
			// TODO: I wish there was a way to do this without using for await here
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
		expect(document.body.innerHTML).toEqual("<div>Hello</div>");
		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div>Goodbye</div>");
		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div>Goodbye</div>");
		expect(Component).toHaveBeenCalledTimes(1);
	});

	test("unmount", async () => {
		const mock = jest.fn();
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
		expect(document.body.innerHTML).toEqual("<div>Hello 2</div>");
		expect(mock).toHaveBeenCalledTimes(0);
		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toEqual("<div></div>");
		await new Promise((resolve) => setTimeout(resolve));
		expect(mock).toHaveBeenCalledTimes(1);
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

		await expect(renderer.render(<Component />, document.body)).rejects.toThrow(
			"You must yield",
		);
		expect(i).toBe(1);
	});

	test("for...of throws", async () => {
		let ctx: Context;
		async function* Component(this: Context): AsyncGenerator<null> {
			ctx = this;
			yield null;
			await new Promise(() => {});
		}

		await renderer.render(<Component />, document.body);
		expect(() => ctx[Symbol.iterator]().next()).toThrow("Use for await...of");
	});
});

describe("async races", () => {
	afterEach(async () => {
		document.body.innerHTML = "";
		await renderer.render(null, document.body);
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
		const Slow = jest.fn(async function Slow(): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 200));
			return <div>Slow</div>;
		});

		const Fast = jest.fn(async function Fast(): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 100));
			return <div>Fast</div>;
		});

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
		expect(Slow).toHaveBeenCalledTimes(2);
		expect(Fast).toHaveBeenCalledTimes(2);
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
			return <div>Fast {i}</div>;
		}

		async function Slow({i}: {i: number}): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 200));
			return <div>Slow {i}</div>;
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
			"<div>Hello: <div>Fast 0</div></div>",
		);
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(document.body.innerHTML).toEqual(
			"<div>Hello: <div>Slow 0</div></div>",
		);
		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual(
			"<div>Hello: <div>Fast 1</div></div>",
		);
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(document.body.innerHTML).toEqual(
			"<div>Hello: <div>Slow 1</div></div>",
		);
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(document.body.innerHTML).toEqual(
			"<div>Hello: <div>Slow 1</div></div>",
		);
	});

	test("fast async function vs slow async generator in async generator", async () => {
		async function Fast({i}: {i: number}): Promise<Child> {
			await new Promise((resolve) => setTimeout(resolve, 100));
			return <div>Fast {i}</div>;
		}

		const Slow = jest.fn(async function* Slow(
			this: Context,
			{i}: {i: number},
		): AsyncGenerator<Child> {
			await new Promise((resolve) => setTimeout(resolve, 200));
			for await (const _ of this) {
				yield <div>Slow {i}</div>;
			}
		});

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
			"<div>Hello: <div>Fast 0</div></div>",
		);
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(document.body.innerHTML).toEqual(
			"<div>Hello: <div>Slow 0</div></div>",
		);
		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual(
			"<div>Hello: <div>Fast 1</div></div>",
		);
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(document.body.innerHTML).toEqual(
			"<div>Hello: <div>Slow 1</div></div>",
		);
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(document.body.innerHTML).toEqual(
			"<div>Hello: <div>Slow 1</div></div>",
		);
		expect(Slow).toHaveBeenCalledTimes(2);
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

describe("parent-child refresh cascades", () => {
	afterEach(async () => {
		document.body.innerHTML = "";
		await renderer.render(null, document.body);
	});

	test("sync function parent and sync function child", () => {
		return new Promise((done) => {
			function Child(this: Context) {
				this.dispatchEvent(new Event("test", {bubbles: true}));
				return <span>child</span>;
			}

			function Parent(this: Context) {
				this.addEventListener("test", () => {
					try {
						this.refresh();
						done();
					} catch (err) {
						done(err);
					}
				});

				return (
					<div>
						<Child />
					</div>
				);
			}

			renderer.render(<Parent />, document.body);
			expect(document.body.innerHTML).toEqual("<div><span>child</span></div>");
		});
	});

	test("sync generator parent and sync function child", () => {
		return new Promise((done) => {
			function Child(this: Context) {
				this.dispatchEvent(new Event("test", {bubbles: true}));
				return <span>child</span>;
			}

			function* Parent(this: Context) {
				this.addEventListener("test", () => {
					try {
						this.refresh();
						done();
					} catch (err) {
						done(err);
					}
				});

				while (true) {
					yield (
						<div>
							<Child />
						</div>
					);
				}
			}

			renderer.render(<Parent />, document.body);
			expect(document.body.innerHTML).toEqual("<div><span>child</span></div>");
		});
	});

	test("sync generator parent and sync generator child", () => {
		return new Promise((done) => {
			function* Child(this: Context) {
				while (true) {
					this.dispatchEvent(new Event("test", {bubbles: true}));
					yield <span>child</span>;
				}
			}

			function* Parent(this: Context) {
				this.addEventListener("test", () => {
					try {
						this.refresh();
						done();
					} catch (err) {
						done(err);
					}
				});

				while (true) {
					yield (
						<div>
							<Child />
						</div>
					);
				}
			}

			renderer.render(<Parent />, document.body);
			expect(document.body.innerHTML).toEqual("<div><span>child</span></div>");
		});
	});
});
