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

	// TODO: figure out how to test for an unhandled promise rejection
	// eslint-disable-next-line
	test.skip("async generator throws independently", async () => {
		const error = new Error("async generator throws independently");
		async function* Thrower(this: Context) {
			yield 1;
			yield 2;
			yield 3;
			throw error;
		}

		renderer.render(<Thrower />, document.body);
		await new Promise(() => {});
	});

	test("async generator throws in async generator", async () => {
		const error = new Error("async generator throws in async generator");
		/* eslint-disable require-yield */
		async function* Thrower() {
			throw error;
		}
		/* eslint-enable require-yield */

		async function* Component(this: Context) {
			for await (const _ of this) {
				yield <Thrower />;
			}
		}

		await expect(renderer.render(<Component />, document.body)).rejects.toBe(
			error,
		);
	});

	test("sync function throws, sync generator catches", () => {
		function Thrower(): Promise<never> {
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
});
