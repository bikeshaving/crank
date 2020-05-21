/** @jsx createElement */
import {createElement, Element, Fragment} from "../index";
import {Context} from "../context";
import {renderer} from "../dom";

describe("cleanup", () => {
	afterEach(async () => {
		document.body.innerHTML = "";
		await renderer.render(null, document.body);
	});

	test("function", () => {
		const fn = jest.fn();
		function Component(this: Context): Element {
			this.cleanup(fn);
			return <span>Hello</span>;
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		expect(fn).toHaveBeenCalledTimes(0);
		const span = document.body.firstChild!.firstChild;

		renderer.render(<div />, document.body);
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(span);
	});

	test("generator", () => {
		const fn = jest.fn();
		function* Component(this: Context): Generator<Element> {
			this.cleanup(fn);
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
		expect(fn).toHaveBeenCalledTimes(0);
		const span = document.body.firstChild!.firstChild;

		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toEqual("<div></div>");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(span);
	});

	test("async function", async () => {
		const fn = jest.fn();
		async function Component(this: Context): Promise<Element> {
			this.cleanup(fn);
			await new Promise((resolve) => setTimeout(resolve, 1));
			return <span>Hello</span>;
		}

		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		expect(fn).toHaveBeenCalledTimes(0);
		const span = document.body.firstChild!.firstChild;

		await renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toEqual("<div></div>");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(span);
	});

	test("async generator", async () => {
		const fn = jest.fn();
		async function* Component(this: Context): AsyncGenerator<Element> {
			this.cleanup(fn);
			for await (const _ of this) {
				await new Promise((resolve) => setTimeout(resolve, 1));
				yield <span>Hello</span>;
			}
		}

		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		expect(fn).toHaveBeenCalledTimes(0);
		const span = document.body.firstChild!.firstChild;

		await renderer.render(<div />, document.body);
		// TODO: why is this setTimeout necessary???
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.body.innerHTML).toEqual("<div></div>");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(span);
	});

	test("multiple calls, same fn", () => {
		const fn = jest.fn();
		function* Component(this: Context): Generator<Element> {
			this.cleanup(fn);
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
		expect(fn).toHaveBeenCalledTimes(0);
		const span = document.body.firstChild!.firstChild;

		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toEqual("<div></div>");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(span);
	});

	test("multiple calls, different fns", () => {
		const fn1 = jest.fn();
		const fn2 = jest.fn();
		function* Component(this: Context): Generator<Element> {
			this.cleanup(fn1);
			this.cleanup(fn2);
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
		expect(fn1).toHaveBeenCalledTimes(0);
		expect(fn2).toHaveBeenCalledTimes(0);
		const span = document.body.firstChild!.firstChild;

		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toEqual("<div></div>");
		expect(fn1).toHaveBeenCalledTimes(1);
		expect(fn2).toHaveBeenCalledTimes(1);
		expect(fn1).toHaveBeenCalledWith(span);
		expect(fn2).toHaveBeenCalledWith(span);
	});

	test("multiple calls across updates", () => {
		const fn1 = jest.fn();
		const fn2 = jest.fn();
		function* Component(this: Context): Generator<Element> {
			let i = 0;
			while (true) {
				this.cleanup(fn1);
				this.cleanup(fn2);
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
		expect(fn1).toHaveBeenCalledTimes(0);
		expect(fn2).toHaveBeenCalledTimes(0);
		const span = document.body.firstChild!.firstChild;

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		expect(fn1).toHaveBeenCalledTimes(0);
		expect(fn2).toHaveBeenCalledTimes(0);
		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>2</span></div>");
		expect(fn1).toHaveBeenCalledTimes(0);
		expect(fn2).toHaveBeenCalledTimes(0);
		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>3</span></div>");
		expect(fn1).toHaveBeenCalledTimes(0);
		expect(fn2).toHaveBeenCalledTimes(0);

		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toEqual("<div></div>");
		expect(fn1).toHaveBeenCalledTimes(1);
		expect(fn2).toHaveBeenCalledTimes(1);
		expect(fn1).toHaveBeenCalledWith(span);
		expect(fn2).toHaveBeenCalledWith(span);
	});

	test("component child", () => {
		function Child(): Element {
			return <span>Hello</span>;
		}

		const fn = jest.fn();
		function* Component(this: Context): Generator<Element> {
			this.cleanup(fn);
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
		expect(fn).toHaveBeenCalledTimes(0);
		const span = document.body.firstChild!.firstChild;

		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toEqual("<div></div>");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(span);
	});

	test("async child", async () => {
		async function Child(): Promise<Element> {
			await new Promise((resolve) => setTimeout(resolve, 1));
			return <span>Hello</span>;
		}

		const fn = jest.fn();
		function* Component(this: Context): Generator<Element> {
			this.cleanup(fn);
			while (true) {
				yield <Child />;
			}
		}

		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		expect(fn).toHaveBeenCalledTimes(0);
		const span = document.body.firstChild!.firstChild;

		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toEqual("<div></div>");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(span);
	});

	test("fragment child", () => {
		const fn = jest.fn();
		function* Component(this: Context): Generator<Element> {
			this.cleanup(fn);
			while (true) {
				yield (
					<Fragment>
						<div>1</div>
						<div>2</div>
						<div>3</div>
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
			"<div><div>1</div><div>2</div><div>3</div></div>",
		);
		expect(fn).toHaveBeenCalledTimes(0);
		const children = Array.from(document.body.firstChild!.childNodes);
		renderer.render(<div />, document.body);
		expect(document.body.innerHTML).toEqual("<div></div>");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(children);
	});

	test("hanging child", async () => {
		const fn = jest.fn();
		async function Hanging(): Promise<never> {
			await new Promise(() => {});
			throw new Error("This should never be reached");
		}

		function* Component(this: Context): Generator<Element> {
			this.cleanup(fn);
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
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(undefined);
		await p;
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(undefined);
	});
});
