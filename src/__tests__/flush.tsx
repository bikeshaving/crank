/** @jsx createElement */
import {createElement, Context, Element} from "../index";
import {renderer} from "../dom";

describe("flush", () => {
	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("callback called after insertion into the DOM", () => {
		const fn = jest.fn();
		const callback = (el: HTMLElement) => fn(document.body.contains(el));
		function Component(this: Context): Element {
			this.flush(callback);
			return <span>Hello</span>;
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("<span>Hello</span>");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toBeCalledWith(true);
	});

	test("callback called once in a function", () => {
		let i = 0;
		const fn = jest.fn();
		function Component(this: Context): Element {
			if (i === 0) {
				this.flush(fn);
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
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
	});

	test("callback called every time in a function", () => {
		let i = 0;
		const fn = jest.fn();
		function Component(this: Context): Element {
			this.flush(fn);
			return <span>{i++}</span>;
		}

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>0</span></div>");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		expect(fn).toHaveBeenCalledTimes(2);
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
	});

	test("called called once in a generator", () => {
		const fn = jest.fn();
		function* Component(this: Context): Generator<Element> {
			let i = 0;
			this.flush(fn);
			for (const _ of this) {
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
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
	});

	test("callback called every time in a generator", () => {
		const fn = jest.fn();
		function* Component(this: Context): Generator<Element> {
			let i = 0;
			for (const _ of this) {
				this.flush(fn);
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
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);

		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		expect(fn).toHaveBeenCalledTimes(2);
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
	});

	test("callback called once in an async function", async () => {
		let i = 0;
		const fn = jest.fn();
		async function Component(this: Context) {
			if (i === 0) {
				this.flush(fn);
			}

			return <span>{i++}</span>;
		}

		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<div><span>0</span></div>");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);

		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
	});

	test("callback called every time in an async function", async () => {
		let i = 0;
		const fn = jest.fn();
		async function Component(this: Context) {
			this.flush(fn);
			return <span>{i++}</span>;
		}

		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>0</span></div>");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);

		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		expect(fn).toHaveBeenCalledTimes(2);
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
	});

	test("callback called once in an async generator", async () => {
		const fn = jest.fn();
		async function* Component(this: Context) {
			let i = 0;
			this.flush(fn);
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
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);

		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
	});

	test("callback called every time in an async generator", async () => {
		const fn = jest.fn();
		async function* Component(this: Context) {
			let i = 0;
			for await (const _ of this) {
				this.flush(fn);
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
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);

		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>1</span></div>");
		expect(fn).toHaveBeenCalledTimes(2);
		expect(fn).toHaveBeenCalledWith(document.body.firstChild!.firstChild);
	});

	test("callback isn’t called when sibling is refreshed", () => {
		const fn1 = jest.fn();
		const fn2 = jest.fn();
		let ctx1!: Context;
		let ctx2!: Context;
		function* Component(this: Context): Generator<Element> {
			ctx1 = this;
			let i = 0;
			for (const _ of this) {
				this.flush(fn1);
				yield <span>{i++}</span>;
			}
		}

		function* Sibling(this: Context) {
			let i = 0;
			ctx2 = this;
			for (const _ of this) {
				this.flush(fn2);
				yield <span>sibling {i++}</span>;
			}
		}

		renderer.render(
			<div>
				<Component />
				<Sibling />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual(
			"<div><span>0</span><span>sibling 0</span></div>",
		);
		expect(fn1).toHaveBeenCalledTimes(1);
		expect(fn2).toHaveBeenCalledTimes(1);
		expect(fn1).toHaveBeenCalledWith(document.body.firstChild!.childNodes[0]);
		expect(fn2).toHaveBeenCalledWith(document.body.firstChild!.childNodes[1]);
		ctx1.flush(fn1);
		ctx2.refresh();
		expect(document.body.innerHTML).toEqual(
			"<div><span>0</span><span>sibling 1</span></div>",
		);
		expect(fn1).toHaveBeenCalledTimes(1);
		expect(fn2).toHaveBeenCalledTimes(2);
		expect(fn2).toHaveBeenCalledWith(document.body.firstChild!.childNodes[1]);
	});
});
