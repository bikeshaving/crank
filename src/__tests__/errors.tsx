/** @jsx createElement */
import {createElement, Child, Context} from "../index";
import {renderer} from "../dom";

describe("errors", () => {
	afterEach(async () => {
		document.body.innerHTML = "";
		await renderer.render(null, document.body);
	});

	test("sync function throws", () => {
		const error = new Error("sync function throws");
		function Thrower(): never {
			throw error;
		}

		expect(() => renderer.render(<Thrower />, document.body)).toThrow(error);
	});

	test("async function throws", async () => {
		const error = new Error("async function throws");

		async function Thrower(): Promise<never> {
			throw error;
		}

		await expect(renderer.render(<Thrower />, document.body)).rejects.toBe(
			error,
		);
	});

	test("sync generator throws", () => {
		const error = new Error("sync generator throws");
		function* Thrower() {
			yield 1;
			yield 2;
			throw error;
		}

		renderer.render(<Thrower />, document.body);
		expect(document.body.innerHTML).toEqual("1");
		renderer.render(<Thrower />, document.body);
		expect(document.body.innerHTML).toEqual("2");
		expect(() => renderer.render(<Thrower />, document.body)).toThrow(error);
	});

	test("async generator throws", async () => {
		const error = new Error("async generator throws");
		async function* Thrower(this: Context) {
			let i = 1;
			for await (const _ of this) {
				if (i > 3) {
					throw error;
				}
				yield i++;
			}
		}

		await renderer.render(<Thrower />, document.body);
		await renderer.render(<Thrower />, document.body);
		await renderer.render(<Thrower />, document.body);
		await expect(renderer.render(<Thrower />, document.body)).rejects.toBe(
			error,
		);
	});

	test("sync generator throws independently", () => {
		const error = new Error("sync generator throws independently");
		let ctx!: Context;
		function* Thrower(this: Context) {
			ctx = this;
			yield 1;
			yield 2;
			yield 3;
			throw error;
		}

		const mock = jest.fn();
		function* Component(this: Context) {
			try {
				while (true) {
					yield (
						<div>
							<Thrower />
						</div>
					);
				}
			} catch (err) {
				mock(err);
				throw err;
			}
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("<div>1</div>");
		ctx.refresh();
		ctx.refresh();
		expect(document.body.innerHTML).toEqual("<div>3</div>");
		expect(() => {
			ctx.refresh();
		}).toThrow(error);
		expect(mock).toHaveBeenCalledTimes(1);
		expect(mock).toHaveBeenCalledWith(error);
	});

	// TODO: figure out how to test for an unhandled promise rejection
	// When run this test should fail rather than timing out.
	// eslint-disable-next-line
	test.skip("async generator throws independently", async () => {
		const error = new Error("async generator throws independently");
		async function* Thrower(this: Context) {
			yield 1;
			yield 2;
			yield 3;
			throw error;
		}

		await renderer.render(<Thrower />, document.body);
	});

	test("async generator throws in async generator", async () => {
		const mock = jest.fn();
		const error = new Error("async generator throws in async generator");
		/* eslint-disable require-yield */
		async function* Thrower() {
			throw error;
		}
		/* eslint-enable require-yield */

		async function* Component(this: Context) {
			try {
				for await (const _ of this) {
					yield <Thrower />;
				}
			} catch (err) {
				mock();
				throw err;
			}
		}

		await expect(renderer.render(<Component />, document.body)).rejects.toBe(
			error,
		);
		expect(mock).toHaveBeenCalledTimes(1);
	});

	// TODO: figure out why this test causes an unhandled rejection
	// eslint-disable-next-line
	test.skip("async generator throws in async generator after yield", async () => {
		const mock = jest.fn();
		const error = new Error(
			"async generator throws in async generator after yield",
		);
		async function* Thrower(this: Context) {
			yield 1;
			for await (const _ of this) {
				throw error;
			}
		}

		async function* Component(this: Context) {
			try {
				for await (const _ of this) {
					yield <Thrower />;
				}
			} catch (err) {
				mock();
				throw err;
			}
		}

		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("1");
		await renderer.render(<Component />, document.body);
		await expect(renderer.render(<Component />, document.body)).rejects.toBe(
			error,
		);
		expect(mock).toHaveBeenCalledTimes(1);
		await new Promise(() => {});
	});

	test("sync function throws, sync generator catches", () => {
		function Thrower(): never {
			throw new Error("sync function throws, sync generator catches");
		}

		function* Component(): Generator<Child> {
			try {
				yield <Thrower />;
			} catch (err) {
				return <span>Error</span>;
			}
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("<span>Error</span>");
	});

	test("async function throws, sync generator catches", async () => {
		async function Thrower(): Promise<never> {
			throw new Error("async function throws, sync generator catches");
		}

		function* Component(): Generator<Child> {
			try {
				yield <Thrower />;
			} catch (err) {
				return <span>Error</span>;
			}
		}

		await renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<div><span>Error</span></div>");
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(document.body.innerHTML).toEqual("<div><span>Error</span></div>");
	});

	// TODO: figure out what’s going on here
	// eslint-disable-next-line
	test.skip("restart", () => {
		const error = new Error("restart");
		function* Thrower() {
			yield 1;
			yield 2;
			yield 3;
			throw error;
		}

		const mock = jest.fn();
		function* Component(this: Context) {
			while (true) {
				try {
					yield (
						<div>
							<Thrower />
						</div>
					);
				} catch (err) {
					mock(err);
					this.schedule(() => this.refresh());
					yield null;
				}
			}
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("<div>1</div>");
		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("<div>2</div>");
		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("<div>3</div>");
		renderer.render(<Component />, document.body);
		expect(mock).toHaveBeenCalledTimes(1);
		expect(mock).toHaveBeenCalledWith(error);
		expect(document.body.innerHTML).toEqual("");
		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("<div>1</div>");
	});
});
