/** @jsx createElement */
import {createElement, Context, Element} from "../index";
import {renderer} from "../dom";

describe("complete", () => {
	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("callback called after insertion into the DOM", () => {
		const fn = jest.fn();
		const callback = (el: HTMLElement) => {
			fn(document.body.contains(el));
		};
		function Component(this: Context): Element {
			this.complete(callback);
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
				this.complete(fn);
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
			this.complete(fn);
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
		let i = 0;
		const fn = jest.fn();
		function* Component(this: Context): Generator<Element> {
			this.complete(fn);
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
		let i = 0;
		const fn = jest.fn();
		function* Component(this: Context): Generator<Element> {
			for (const _ of this) {
				this.complete(fn);
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
				this.complete(fn);
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
			this.complete(fn);
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
		let i = 0;
		const fn = jest.fn();
		async function* Component(this: Context) {
			this.complete(fn);
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
		let i = 0;
		const fn = jest.fn();
		async function* Component(this: Context) {
			for await (const _ of this) {
				this.complete(fn);
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
});
