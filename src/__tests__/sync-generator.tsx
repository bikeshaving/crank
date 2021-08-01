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

describe("sync generator component", () => {
	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
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
			yield null;
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
			yield null;
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
		await new Promise((resolve) => setTimeout(resolve));
		expect(mock).toHaveBeenCalledWith("<span>Hello 0</span>");
		expect(mock).toHaveBeenCalledTimes(1);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 0</span></div>");
		await refreshP;
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		ctx.refresh();
		await new Promise((resolve) => setTimeout(resolve));
		expect(mock).toHaveBeenCalledWith("<span>Hello 1</span>");
		expect(mock).toHaveBeenCalledTimes(2);
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
		function* Component(): Generator<Element> {
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
		renderer.render(<div>Goodbye</div>, document.body);
		expect(document.body.innerHTML).toEqual("<div>Goodbye</div>");
		expect(mock).toHaveBeenCalledTimes(1);
	});

	test("unmount against string", () => {
		const mock = jest.fn();
		function* Component(): Generator<Element> {
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
		renderer.render(["Goodbye", null], document.body);
		expect(document.body.innerHTML).toEqual("Goodbye");
		expect(mock).toHaveBeenCalledTimes(1);
	});

	test("unmount against null", () => {
		const mock = jest.fn();
		function* Component(): Generator<Element> {
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
		renderer.render([null, "Goodbye"], document.body);
		expect(document.body.innerHTML).toEqual("Goodbye");
		expect(mock).toHaveBeenCalledTimes(1);
	});

	test("unmount against async", async () => {
		const mock = jest.fn();
		function* Component(): Generator<Element> {
			try {
				let i = 0;
				while (true) {
					yield <div>Hello {i++}</div>;
				}
			} finally {
				mock();
			}
		}

		async function Async(): Promise<Element> {
			return <div>Goodbye</div>;
		}

		renderer.render(<Component />, document.body);
		renderer.render(<Component />, document.body);
		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("<div>Hello 2</div>");
		expect(mock).toHaveBeenCalledTimes(0);
		await renderer.render(<Async />, document.body);
		expect(document.body.innerHTML).toEqual("<div>Goodbye</div>");
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
			"Context iterated twice",
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
			"Use for…of",
		);
	});
});
