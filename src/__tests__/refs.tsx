/** @jsx createElement */
import {
	Children,
	Context,
	createElement,
	Element,
	Fragment,
	Raw,
} from "../index";
import {renderer} from "../dom";

describe("refs", () => {
	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("basic", () => {
		const fn = jest.fn();
		renderer.render(<div crank-ref={fn}>Hello</div>, document.body);

		expect(document.body.innerHTML).toEqual("<div>Hello</div>");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(document.body.firstChild);
	});

	test("child", () => {
		const fn = jest.fn();
		renderer.render(
			<div>
				<span crank-ref={fn}>Hello</span>
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
	});

	test("Fragment element", () => {
		const fn = jest.fn();
		renderer.render(
			<div>
				<Fragment crank-ref={fn}>
					<span>1</span>
					<span>2</span>
					<span>3</span>
				</Fragment>
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

	test("Raw element", () => {
		const fn = jest.fn();
		renderer.render(
			<Raw value="<div>Hello world</div>" crank-ref={fn} />,
			document.body,
		);

		expect(fn).toHaveBeenCalledTimes(1);

		const refArg = fn.mock.calls[0][0];
		expect(Array.isArray(refArg)).toBe(true);
		expect(refArg.length).toBe(1);
		expect(refArg[0]).toBeInstanceOf(Node);
	});

	test("function component", () => {
		const fn = jest.fn();
		function Component(): Element {
			return <span>Hello</span>;
		}

		renderer.render(
			<div>
				<Component crank-ref={fn} />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
	});

	test("generator component", () => {
		const fn = jest.fn();
		function* Component(): Generator<Element> {
			while (true) {
				yield <span>Hello</span>;
			}
		}

		renderer.render(
			<div>
				<Component crank-ref={fn} />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
	});

	test("async function component", async () => {
		const fn = jest.fn();
		async function Component(): Promise<Element> {
			return <span>Hello</span>;
		}

		await renderer.render(
			<div>
				<Component crank-ref={fn} />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
	});

	test("async generator component", async () => {
		const fn = jest.fn();
		async function* Component(this: Context): AsyncGenerator<Element> {
			for await (const _ of this) {
				yield <span>Hello</span>;
			}
		}

		await renderer.render(
			<div>
				<Component crank-ref={fn} />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
	});

	test("transcluded in function component", async () => {
		function Child({children}: {children: Children}): Children {
			return children;
		}

		const fn = jest.fn();
		function Parent(): Element {
			return (
				<div>
					<Child>
						<span crank-ref={fn}>Hello</span>
					</Child>
				</div>
			);
		}

		renderer.render(<Parent />, document.body);

		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
	});

	test("transcluded in async function component", async () => {
		async function Child({children}: {children: Children}): Promise<Children> {
			await new Promise((resolve) => setTimeout(resolve, 1));
			return children;
		}

		const fn = jest.fn();
		function Parent(): Element {
			return (
				<div>
					<Child>
						<span crank-ref={fn}>Hello</span>
					</Child>
				</div>
			);
		}

		const p = renderer.render(<Parent />, document.body);

		expect(fn).toHaveBeenCalledTimes(0);
		await p;
		expect(document.body.innerHTML).toEqual("<div><span>Hello</span></div>");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
	});
});
