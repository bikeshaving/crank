import {
	createElement,
	Child,
	Children,
	Context,
	Element,
	Fragment,
} from "../crank.js";
import {renderer} from "../dom.js";

describe("async generator component", () => {
	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
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
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toEqual("<div><span>Hello 1</span></div>");
		await renderer.render(
			<div>
				<Component message="Hello 2" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Hello 2</span></div>");
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toEqual("<div><span>Hello 2</span></div>");
		await renderer.render(
			<div>
				<Component message="Hello 3" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Final</span></div>");
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toEqual("<div><span>Final</span></div>");
		expect(Component).toHaveBeenCalledTimes(1);
	});

	test("multiple yields per update", async () => {
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
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		await renderer.render(
			<div>
				<Component message="Hello" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
	});

	test("Fragment parent", async () => {
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

		expect(document.body.innerHTML).toEqual("1");
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual("1");
		resolve();
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual("2");
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual("2");
	});

	test("yield resumes with an element", async () => {
		let html: string | undefined;
		async function* Component(this: Context) {
			let i = 0;
			for await (const _ of this) {
				const node: HTMLElement = yield <div id={i}>{i}</div>;
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
				const node: Promise<HTMLElement> = yield <Async id={i} />;
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

	test("yield before for await loop", async () => {
		async function* Component(this: Context) {
			let i = 0;
			yield <div>{i++}</div>;
			for await (const _ of this) {
				yield <div>{i++}</div>;
			}
		}

		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("<div>0</div>");
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual("<div>0</div>");
		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("<div>1</div>");
	});

	test("concurrent unmount", async () => {
		const mock = jest.fn();
		async function* Component(this: Context): AsyncGenerator<Child> {
			try {
				for await (const _ of this) {
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
		expect(document.body.innerHTML).toEqual("");
		expect(mock).toHaveBeenCalledTimes(0);
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.body.innerHTML).toEqual("");
		expect(mock).toHaveBeenCalledTimes(1);
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual("");
		expect(mock).toHaveBeenCalledTimes(1);
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
		expect(document.body.innerHTML).toEqual("<div><span>true</span></div>");
		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("<div><span>false</span></div>");
		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("<div><span>true</span></div>");
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
			"Context iterated twice",
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
		expect(() => ctx[Symbol.iterator]().next()).toThrow("Use for await…of");
	});
});
