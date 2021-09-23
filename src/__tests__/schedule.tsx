/** @jsx createElement */
import {
	createElement,
	Children,
	Context,
	Copy,
	Element,
	Fragment,
} from "../index";
import {renderer} from "../dom";

describe("schedule", () => {
	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("function once", () => {
		let i = 0;
		const fn = jest.fn();
		function Component(this: Context): Element {
			if (i === 0) {
				this.schedule(fn);
			}

			return <span>{i++}</span>;
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>0</span></div>");
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
		expect(fn).toHaveBeenCalledTimes(1);

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	test("function every", () => {
		let i = 0;
		const fn = jest.fn();
		function Component(this: Context): Element {
			this.schedule(fn);
			return <span>{i++}</span>;
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>0</span></div>");
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
		expect(fn).toHaveBeenCalledTimes(1);
		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
		expect(fn).toHaveBeenCalledTimes(2);
	});

	test("generator once", () => {
		const fn = jest.fn();
		function* Component(this: Context): Generator<Element> {
			this.schedule(fn);
			let i = 0;
			while (true) {
				yield <span>{i++}</span>;
			}
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>0</span></div>");
		expect(fn).toHaveBeenCalledTimes(1);

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		expect(fn).toHaveBeenCalledTimes(1);
	});

	test("generator every", () => {
		const fn = jest.fn();
		function* Component(this: Context): Generator<Element> {
			let i = 0;
			while (true) {
				this.schedule(fn);
				yield <span>{i++}</span>;
			}
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>0</span></div>");
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
		expect(fn).toHaveBeenCalledTimes(1);
		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
		expect(fn).toHaveBeenCalledTimes(2);
	});

	test("async function once", async () => {
		let i = 0;
		const fn = jest.fn();
		async function Component(this: Context): Promise<Element> {
			if (i === 0) {
				this.schedule(fn);
			}

			await new Promise((resolve) => setTimeout(resolve, 1));
			return <span>{i++}</span>;
		}

		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>0</span></div>");
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
		expect(fn).toHaveBeenCalledTimes(1);

		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		expect(fn).toHaveBeenCalledTimes(1);
	});

	test("async function every", async () => {
		let i = 0;
		const fn = jest.fn();
		async function Component(this: Context): Promise<Element> {
			this.schedule(fn);
			await new Promise((resolve) => setTimeout(resolve, 1));
			return <span>{i++}</span>;
		}

		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>0</span></div>");
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
		expect(fn).toHaveBeenCalledTimes(1);

		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		expect(fn).toHaveBeenCalledTimes(2);
	});

	test("async generator once", async () => {
		const fn = jest.fn();
		async function* Component(this: Context): AsyncGenerator<Element> {
			this.schedule(fn);
			let i = 0;
			for await (const _ of this) {
				yield <span>{i++}</span>;
			}
		}

		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>0</span></div>");
		expect(fn).toHaveBeenCalledTimes(1);

		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		expect(fn).toHaveBeenCalledTimes(1);
	});

	test("async generator every", async () => {
		const fn = jest.fn();
		async function* Component(this: Context): AsyncGenerator<Element> {
			let i = 0;
			for await (const _ of this) {
				this.schedule(fn);
				yield <span>{i++}</span>;
			}
		}

		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>0</span></div>");
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
		expect(fn).toHaveBeenCalledTimes(1);
		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
		expect(fn).toHaveBeenCalledTimes(2);
	});

	test("multiple calls, same fn", () => {
		const fn = jest.fn();
		function* Component(this: Context): Generator<Element> {
			this.schedule(fn);
			this.schedule(fn);
			while (true) {
				yield <span>Hello</span>;
			}
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		const span = document.body.firstChild!.firstChild;
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(span);
	});

	test("multiple calls, different fns", () => {
		const fn1 = jest.fn();
		const fn2 = jest.fn();
		function* Component(this: Context): Generator<Element> {
			this.schedule(fn1);
			this.schedule(fn2);
			while (true) {
				yield <span>Hello</span>;
			}
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		const span = document.body.firstChild!.firstChild;
		expect(fn1).toHaveBeenCalledTimes(1);
		expect(fn1).toHaveBeenCalledWith(span);
		expect(fn2).toHaveBeenCalledTimes(1);
		expect(fn2).toHaveBeenCalledWith(span);
	});

	test("multiple calls across updates", () => {
		const fn1 = jest.fn();
		const fn2 = jest.fn();
		function* Component(this: Context): Generator<Element> {
			let i = 0;
			while (true) {
				this.schedule(fn1);
				this.schedule(fn2);
				this.schedule(fn2);
				yield <span>{i++}</span>;
			}
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>0</span></div>");
		const span = document.body.firstChild!.firstChild;

		expect(fn1).toHaveBeenCalledTimes(1);
		expect(fn2).toHaveBeenCalledTimes(1);
		expect(fn1).toHaveBeenCalledWith(span);
		expect(fn2).toHaveBeenCalledWith(span);

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		expect(fn1).toHaveBeenCalledTimes(2);
		expect(fn2).toHaveBeenCalledTimes(2);
		expect(fn1).toHaveBeenCalledWith(span);
		expect(fn2).toHaveBeenCalledWith(span);

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>2</span></div>");
		expect(fn1).toHaveBeenCalledTimes(3);
		expect(fn2).toHaveBeenCalledTimes(3);
		expect(fn1).toHaveBeenCalledWith(span);
		expect(fn2).toHaveBeenCalledWith(span);
	});

	test("refresh", () => {
		const mock = jest.fn();
		function* Component(this: Context): Generator<Element> {
			let i = 0;
			while (true) {
				mock();
				if (i % 2 === 0) {
					this.schedule(() => this.refresh());
				}
				yield <span>{i++}</span>;
			}
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>3</span></div>");
		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>5</span></div>");
		expect(mock).toHaveBeenCalledTimes(6);
	});

	test("refresh copy", () => {
		function* Component(this: Context): Generator<Element> {
			this.schedule(() => this.refresh());
			const span = (yield <span />) as HTMLSpanElement;
			while (true) {
				span.className = "manual";
				span.textContent = "Hello world";
				yield <Copy />;
			}
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual(
			'<div><span class="manual">Hello world</span></div>',
		);
	});

	test("refresh copy alternating", () => {
		function* Component(this: Context): Generator<Element> {
			let i = 0;
			let span: HTMLSpanElement | undefined;
			while (true) {
				if (span === undefined) {
					this.schedule(() => this.refresh());
					span = (yield <span />) as HTMLSpanElement;
				} else {
					span.className = "manual";
					span.textContent = (i++).toString();
					span = undefined;
					yield <Copy />;
				}
			}
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual(
			'<div><span class="manual">0</span></div>',
		);
	});

	test("component child", () => {
		const fn = jest.fn();
		function Child(): Element {
			return <span>Hello</span>;
		}

		function* Component(this: Context): Generator<Element> {
			this.schedule(fn);
			while (true) {
				yield <Child />;
			}
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");

		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
	});

	test("fragment child", () => {
		const fn = jest.fn();
		function* Component(this: Context): Generator<Element> {
			this.schedule(fn);
			while (true) {
				yield (
					<Fragment>
						<span>1</span>
						<span>2</span>
						<span>3</span>
					</Fragment>
				);
			}
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual(
			"<div><span>1</span><span>2</span><span>3</span></div>",
		);

		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(
			Array.from(document.body.firstChild!.childNodes),
		);
	});

	test("async children once", async () => {
		const fn = jest.fn();
		async function Child({children}: {children: Children}): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 5));
			return <span>{children}</span>;
		}

		function* Component(this: Context): Generator<Element> {
			this.schedule(fn);
			while (true) {
				yield <Child>async</Child>;
			}
		}

		const p = renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(fn).toHaveBeenCalledTimes(0);
		await p;
		expect(document.body.innerHTML).toEqual("<div><span>async</span></div>");
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	test("async children every", async () => {
		const fn = jest.fn();
		async function Child({children}: {children: Children}): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 5));
			return <span>{children}</span>;
		}

		function* Component(this: Context): Generator<Element> {
			let i = 0;
			while (true) {
				this.schedule(fn);
				yield <Child>async {i++}</Child>;
			}
		}

		let p = renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(fn).toHaveBeenCalledTimes(0);
		await p;
		expect(document.body.innerHTML).toEqual("<div><span>async 0</span></div>");
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
		expect(fn).toHaveBeenCalledTimes(1);
		p = renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(fn).toHaveBeenCalledTimes(1);
		await p;
		expect(document.body.innerHTML).toEqual("<div><span>async 1</span></div>");
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
		expect(fn).toHaveBeenCalledTimes(2);
	});

	test("hanging child", async () => {
		const fn = jest.fn();
		async function Hanging(): Promise<never> {
			await new Promise(() => {});
			throw new Error("This should never be reached");
		}

		function* Component(this: Context): Generator<Element> {
			this.schedule(fn);
			while (true) {
				yield <Hanging />;
			}
		}

		const p = renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(fn).toHaveBeenCalledTimes(0);
		expect(document.body.innerHTML).toEqual("");
		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toEqual("<div></div>");
		expect(fn).toHaveBeenCalledTimes(0);
		await p;
		expect(fn).toHaveBeenCalledTimes(0);
	});

	// https://github.com/bikeshaving/crank/issues/199
	test("refresh with component", () => {
		function Component({children}: {children: Children}) {
			return <p>{children}</p>;
		}

		function* Parent(this: Context) {
			this.schedule(() => this.refresh());
			yield <p>Render 1</p>;
			yield <Component>Render 2</Component>;
		}

		renderer.render(<Parent />, document.body);
		expect(document.body.innerHTML).toEqual("<p>Render 2</p>");
	});
});
