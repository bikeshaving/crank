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
	afterEach(async () => {
		document.body.innerHTML = "";
		await renderer.render(null, document.body);
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

	test("refresh copy", () => {
		function* Component(this: Context): Generator<Element> {
			this.schedule(() => this.refresh());
			const span = (yield <span />) as HTMLSpanElement;
			while (true) {
				span.className = "manual";
				span.textContent = "Hello world";
				yield <span />;
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

	test("fragment child", () => {
		let fn = jest.fn();
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

		expect(fn).toHaveBeenCalledWith(
			Array.from(document.body.firstChild!.childNodes),
		);
	});

	test("async children once", async () => {
		let fn = jest.fn();
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
		let fn = jest.fn();
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
});
