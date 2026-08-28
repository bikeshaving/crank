import {describe, test, beforeEach, afterEach, expect} from "@b9g/libuild/test";
import * as Sinon from "sinon";

import type {Child, Context} from "../src/crank.js";
import {createElement} from "../src/crank.js";
import {renderer} from "../src/dom.js";

describe("errors", () => {
	beforeEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("sync function throws", () => {
		function Thrower(): never {
			throw new Error("sync function throws");
		}

		try {
			renderer.render(<Thrower />, document.body);
			throw new Error("unreachable");
		} catch (err: any) {
			expect(err.message).toBe("sync function throws");
		}
	});

	test("async function throws", async () => {
		async function Thrower(): Promise<never> {
			throw new Error("async function throws");
		}

		try {
			await renderer.render(<Thrower />, document.body);
			throw new Error("unreachable");
		} catch (err: any) {
			expect(err.message).toBe("async function throws");
		}
	});

	test("sync gen throws", () => {
		function* Thrower(this: Context) {
			let i = 0;
			for ({} of this) {
				if (i >= 2) {
					throw new Error("sync gen throws");
				}

				yield i++;
			}
		}

		renderer.render(<Thrower />, document.body);
		expect(document.body.innerHTML).toBe("0");
		renderer.render(<Thrower />, document.body);
		expect(document.body.innerHTML).toBe("1");

		try {
			renderer.render(<Thrower />, document.body);
			throw new Error("unreachable");
		} catch (err: any) {
			expect(err.message).toBe("sync gen throws");
		}
	});

	test("async gen for await throws", async () => {
		async function* Thrower(this: Context) {
			let i = 0;
			for await ({} of this) {
				if (i >= 2) {
					throw new Error("async gen for await throws");
				}

				yield i++;
			}
		}

		await renderer.render(<Thrower />, document.body);
		expect(document.body.innerHTML).toBe("0");
		await renderer.render(<Thrower />, document.body);
		expect(document.body.innerHTML).toBe("1");
		try {
			await renderer.render(<Thrower />, document.body);
			throw new Error("unreachable");
		} catch (err: any) {
			expect(err.message).toBe("async gen for await throws");
		}
	});

	test("sync gen throws refresh call", () => {
		let ctx!: Context;

		function* Thrower(this: Context) {
			ctx = this;
			let i = 0;
			for ({} of this) {
				if (i >= 2) {
					throw new Error("sync gen throws by refresh");
				}

				yield i++;
			}
		}

		renderer.render(<Thrower />, document.body);
		expect(document.body.innerHTML).toBe("0");
		ctx.refresh();
		expect(document.body.innerHTML).toBe("1");
		try {
			ctx.refresh();
			throw new Error("unreachable");
		} catch (err: any) {
			expect(err.message).toBe("sync gen throws by refresh");
		}
	});

	test("sync gen throws by parent refresh", () => {
		function* Thrower(this: Context) {
			let i = 0;
			for ({} of this) {
				if (i >= 2) {
					throw new Error("sync gen throws by parent refresh");
				}

				yield i++;
			}
		}

		let ctx!: Context;

		function* Parent(this: Context) {
			ctx = this;
			for ({} of this) {
				yield (
					<div>
						<Thrower />
					</div>
				);
			}
		}

		renderer.render(<Parent />, document.body);
		expect(document.body.innerHTML).toBe("<div>0</div>");
		ctx.refresh();
		expect(document.body.innerHTML).toBe("<div>1</div>");
		try {
			ctx.refresh();
			throw new Error("unreachable");
		} catch (err: any) {
			expect(err.message).toBe("sync gen throws by parent refresh");
		}
	});

	test("async gen throws by parent sync gen refresh", async () => {
		async function* Thrower(this: Context) {
			let i = 0;
			for await ({} of this) {
				if (i >= 2) {
					throw new Error("async gen throws by parent sync gen refresh");
				}

				yield i++;
			}
		}

		let ctx!: Context;

		function* Parent(this: Context) {
			ctx = this;
			for ({} of this) {
				yield (
					<div>
						<Thrower />
					</div>
				);
			}
		}

		await renderer.render(<Parent />, document.body);
		expect(document.body.innerHTML).toBe("<div>0</div>");
		await ctx.refresh();
		expect(document.body.innerHTML).toBe("<div>1</div>");
		const mock = Sinon.fake();
		try {
			await ctx.refresh();
			throw new Error("unreachable");
		} catch (err: any) {
			expect(err.message).toBe("async gen throws by parent sync gen refresh");
			mock();
		}

		expect(mock.callCount).toBe(1);
	});

	test("for await of throws in for await of", async () => {
		/* eslint-disable require-yield */
		async function* Thrower(this: Context) {
			for await ({} of this) {
				throw new Error("for await of throws in for await of");
			}
		}

		async function* Parent(this: Context) {
			for await ({} of this) {
				yield (
					<div>
						<Thrower />
					</div>
				);
			}
		}

		try {
			await renderer.render(<Parent />, document.body);
			throw new Error("unreachable");
		} catch (err: any) {
			expect(err.message).toBe("for await of throws in for await of");
		}

		expect(document.body.innerHTML).toBe("");
	});

	test("async gen throws by parent async gen refresh", async () => {
		async function* Thrower(this: Context) {
			let i = 0;
			for await ({} of this) {
				if (i >= 2) {
					throw new Error("async gen throws by parent async gen refresh");
				}

				yield i++;
			}
		}

		let parentCtx!: Context;

		async function* Parent(this: Context) {
			parentCtx = this;
			for await ({} of this) {
				yield (
					<div>
						<Thrower />
					</div>
				);
			}
		}

		await renderer.render(<Parent />, document.body);
		expect(document.body.innerHTML).toBe("<div>0</div>");
		await parentCtx.refresh();
		expect(document.body.innerHTML).toBe("<div>1</div>");
		const mock = Sinon.fake();
		try {
			await parentCtx.refresh();
			throw new Error("unreachable");
		} catch (err: any) {
			expect(err.message).toBe("async gen throws by parent async gen refresh");
			mock();
		}

		expect(mock.callCount).toBe(1);
	});

	test("async gen returns after child throws", async () => {
		async function Thrower(this: Context) {
			throw new Error("async gen returns after child throws");
		}

		async function* Component(this: Context) {
			try {
				for await ({} of this) {
					yield <Thrower />;
				}
			} catch (err: any) {
				return <span>{err.message}</span>;
			}
		}

		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe(
			"<span>async gen returns after child throws</span>",
		);
	});

	test("async gen throws independently", async () => {
		async function* Thrower(this: Context) {
			for await ({} of this) {
				yield 1;
				yield 2;
				yield 3;
				await new Promise((resolve) => setTimeout(resolve));
				throw new Error("async gen throws independently");
			}
		}

		let resolve: (err: Error) => void;
		const err = new Promise<Error>((resolve1) => {
			resolve = resolve1;
		});
		const onUnhandledRejection = (ev: PromiseRejectionEvent) => {
			if (ev.reason.message === "async gen throws independently") {
				ev.preventDefault();
				resolve(ev.reason);
			}
		};
		try {
			window.addEventListener("unhandledrejection", onUnhandledRejection);

			await renderer.render(<Thrower />, document.body);
			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(document.body.innerHTML).toBe("3");
			expect((await err).message).toBe("async gen throws independently");
		} finally {
			window.removeEventListener("unhandledrejection", onUnhandledRejection);
		}
	});

	test("async gen rethrows after child error", async () => {
		const mock = Sinon.fake();

		async function Thrower(this: Context) {
			throw new Error("async gen rethrows after child error");
		}

		async function* Component(this: Context) {
			try {
				for await (const _ of this) {
					yield <Thrower />;
				}
			} catch (err) {
				mock();
				throw new Error("async gen rethrows after child error 1");
			}
		}

		try {
			await renderer.render(<Component />, document.body);
			throw new Error("unreachable");
		} catch (err: any) {
			expect(err.message).toBe("async gen rethrows after child error 1");
		}

		expect(mock.callCount).toBe(1);
	});

	test("async gen rethrows after child error in async gen", async () => {
		const mock = Sinon.fake();

		/* eslint-disable require-yield */
		async function* Thrower() {
			throw new Error("async gen rethrows after child error in async gen");
		}
		/* eslint-enable require-yield */

		async function* Component(this: Context) {
			try {
				for await (const _ of this) {
					yield <Thrower />;
				}
			} catch (err) {
				mock();
				throw new Error("async gen rethrows after child error in async gen 1");
			}
		}

		try {
			await renderer.render(<Component />, document.body);
			throw new Error("unreachable");
		} catch (err: any) {
			expect(err.message).toBe(
				"async gen rethrows after child error in async gen 1",
			);
		}

		expect(mock.callCount).toBe(1);
	});

	test("async gen throws in async gen after yield", async () => {
		const mock = Sinon.fake();

		async function* Thrower(this: Context) {
			yield 1;
			for await ({} of this) {
				throw new Error("async gen throws in async gen after yield");
			}
		}

		async function* Component(this: Context) {
			try {
				for await ({} of this) {
					yield <Thrower />;
				}
			} catch (err) {
				mock();
				throw err;
			}
		}

		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("1");
		try {
			await renderer.render(<Component />, document.body);
			throw new Error("unreachable");
		} catch (err: any) {
			expect(err.message).toBe("async gen throws in async gen after yield");
			mock();
		}

		expect(mock.callCount).toBe(2);
	});

	test("delayed async function throws but is raced with faster component", async () => {
		async function DelayedThrower(): Promise<never> {
			await new Promise((resolve) => setTimeout(resolve, 100));
			throw new Error(
				"delayed async function throws but is raced with faster component",
			);
		}

		async function FastComponent(): Promise<Child> {
			await new Promise((resolve) => setTimeout(resolve, 50));
			return <span>Fast Component</span>;
		}

		async function* Component(this: Context): AsyncGenerator<Child> {
			for ({} of this) {
				yield <DelayedThrower />;
				yield <FastComponent />;
			}
		}

		try {
			await renderer.render(<Component />, document.body);
			throw new Error("unreachable");
		} catch (err: any) {
			expect(err.message).toBe(
				"delayed async function throws but is raced with faster component",
			);
		}

		expect(document.body.innerHTML).toBe("");
	});

	test("async siblings throw", async () => {
		async function Child1(): Promise<Child> {
			await new Promise((resolve) => setTimeout(resolve, 50));
			throw new Error("async siblings throw - Child1");
		}

		async function Child2(): Promise<Child> {
			await new Promise((resolve) => setTimeout(resolve));
			throw new Error("async siblings throw - Child1");
		}

		async function* Component(this: Context): AsyncGenerator<Child> {
			for ({} of this) {
				yield (
					<div>
						<Child1 />
						<Child2 />
					</div>
				);
			}
		}

		try {
			await renderer.render(<Component />, document.body);
			throw new Error("unreachable");
		} catch (err: any) {
			expect(err.message).toBe("async siblings throw - Child1");
		}
	});

	test("sync function throws, sync gen catches", () => {
		function Thrower(): never {
			throw new Error("sync function throws, sync gen catches");
		}

		function* Component(): Generator<Child> {
			try {
				yield <Thrower />;
			} catch (err) {
				return <span>Error</span>;
			}
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<span>Error</span>");
	});

	test("nested sync functions", () => {
		function Thrower(): never {
			throw new Error("nested sync functions");
		}

		function PassThrough() {
			return <Thrower />;
		}

		function* Component(): Generator<Child> {
			try {
				yield <PassThrough />;
			} catch (err) {
				return <span>Error</span>;
			}
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<span>Error</span>");
	});

	test("async function throws, sync gen catches", async () => {
		async function Thrower(): Promise<never> {
			throw new Error("async function throws, sync gen catches");
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

		expect(document.body.innerHTML).toBe("<div><span>Error</span></div>");
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(document.body.innerHTML).toBe("<div><span>Error</span></div>");
	});

	test("error recovery", () => {
		const err = new Error("error recovery");

		function* Thrower() {
			yield 1;
			yield 2;
			yield 3;
			throw err;
		}

		const mock = Sinon.fake();

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
					yield <div>Restarting</div>;
				}
			}
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<div>1</div>");
		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<div>2</div>");
		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<div>3</div>");
		renderer.render(<Component />, document.body);
		expect(mock.callCount).toBe(1);
		expect(mock.lastCall.args[0]).toBe(err);
		expect(document.body.innerHTML).toBe("<div>Restarting</div>");
		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<div>1</div>");
	});

	test("async gen causes unhandled rejection", async () => {
		async function One() {
			await new Promise((r) => setTimeout(r, 100));
			return <div>Hello</div>;
		}

		async function Two() {
			await new Promise((r) => setTimeout(r, 200));
			throw new Error("async gen causes unhandled rejection");
		}

		async function* Loader(this: Context) {
			for await ({} of this) {
				yield <One />;
				yield <Two />;
			}
		}

		let resolve: (err: Error) => void;
		const err = new Promise<any>((r) => (resolve = r));
		const onUnhandledRejection = (ev: PromiseRejectionEvent) => {
			if (ev.reason.message === "async gen causes unhandled rejection") {
				resolve(ev.reason);
				ev.preventDefault();
			}
		};
		try {
			window.addEventListener("unhandledrejection", onUnhandledRejection);
			await renderer.render(<Loader />, document.body);
			expect(document.body.innerHTML).toBe("<div>Hello</div>");
			expect((await err).message).toBe("async gen causes unhandled rejection");
		} finally {
			window.removeEventListener("unhandledrejection", onUnhandledRejection);
		}
	});

	test("nested gen function throws with refresh can be caught by parent", () => {
		let throwerCtx!: Context;

		function* Thrower(this: Context): Generator<Child> {
			throwerCtx = this;
			yield <div>Hello</div>;
			throw new Error(
				"nested gen function throws with refresh can be caught by parent",
			);
		}

		function PassThrough() {
			return <Thrower />;
		}

		function* Component(): Generator<Child> {
			while (true) {
				try {
					yield <PassThrough />;
				} catch (err) {
					return <span>Error</span>;
				}
			}
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<div>Hello</div>");

		throwerCtx.refresh();
		expect(document.body.innerHTML).toBe("<span>Error</span>");
	});

	test("nested async gen function throws with refresh can be caught by parent", async () => {
		let throwerCtx!: Context;

		async function* Thrower(this: Context): AsyncGenerator<Child> {
			throwerCtx = this;
			yield <div>Hello</div>;
			for await ({} of this) {
				throw new Error(
					"nested async gen function throws with refresh can be caught by parent",
				);
			}
		}

		function PassThrough() {
			return <Thrower />;
		}

		function* Component(): Generator<Child> {
			while (true) {
				try {
					yield <PassThrough />;
				} catch (err) {
					return <span>Error</span>;
				}
			}
		}

		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<div>Hello</div>");

		await throwerCtx.refresh();
		expect(document.body.innerHTML).toBe("<span>Error</span>");
	});

	test("nested async gen function throws independently", async () => {
		async function* Thrower(this: Context): AsyncGenerator<Child> {
			for await ({} of this) {
				yield <div>Hello</div>;
				throw new Error("nested async gen function throws independently");
			}
		}

		let resolve: (err: Error) => void;
		const err = new Promise<Error>((r) => (resolve = r));
		const onUnhandledRejection = (ev: PromiseRejectionEvent) => {
			if (
				ev.reason.message === "nested async gen function throws independently"
			) {
				resolve(ev.reason);
				ev.preventDefault();
			}
		};
		try {
			window.addEventListener("unhandledrejection", onUnhandledRejection);
			await renderer.render(<Thrower />, document.body);
			expect(document.body.innerHTML).toBe("<div>Hello</div>");
			expect((await err).message).toBe(
				"nested async gen function throws independently",
			);
		} finally {
			window.removeEventListener("unhandledrejection", onUnhandledRejection);
		}
	});

	test("nested async gen throws independently can be caught by parent", async () => {
		async function* Thrower(this: Context) {
			for await ({} of this) {
				yield <div>Hello</div>;
				throw new Error(
					"nested async gen throws independently can be caught by parent",
				);
			}
		}

		function PassThrough() {
			return <Thrower />;
		}

		const mock = Sinon.fake();

		function* Component(this: Context) {
			for ({} of this) {
				try {
					yield <PassThrough />;
				} catch (err) {
					mock();
					return <span>Error</span>;
				}
			}
		}

		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<span>Error</span>");
		expect(mock.callCount).toBe(1);
	});

	test("async gen with for await of rejects children passed back in awaited", async () => {
		const mock = Sinon.fake();

		/* eslint-disable require-yield */
		async function* Thrower(this: Context) {
			for await ({} of this) {
				throw new Error(
					"async gen with for await of rejects children passed back in awaited",
				);
			}
		}

		async function* Component(this: Context): AsyncGenerator<Child, void, any> {
			for await ({} of this) {
				const p = yield <Thrower />;

				try {
					await p;
				} catch (err: any) {
					mock(err);
					yield <span>Okay!</span>;
				}
			}
		}

		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<span>Okay!</span>");
		expect(mock.callCount).toBe(1);
		expect(mock.lastCall.args[0].message).toBe(
			"async gen with for await of rejects children passed back in awaited",
		);
	});

	test("async gen with for await of rejects children passed back in then", async () => {
		const mock = Sinon.fake();

		/* eslint-disable require-yield */
		async function* Thrower(this: Context) {
			for ({} of this) {
				throw new Error(
					"async gen with for await of rejects children passed back in then",
				);
			}
		}

		async function* Component(this: Context): AsyncGenerator<Child, void, any> {
			for await ({} of this) {
				const p = yield <Thrower />;
				p.then(() => {
					throw new Error("unreachable");
				}).catch((err: Error) => {
					mock(err);
				});

				await new Promise((resolve) => setTimeout(resolve, 100));
				yield <span>Okay!</span>;
			}
		}

		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<span>Okay!</span>");
		expect(mock.callCount).toBe(1);
		expect(mock.lastCall.args[0].message).toBe(
			"async gen with for await of rejects children passed back in then",
		);
	});

	test("async gen with for await of rejects children passed back in catch", async () => {
		const mock = Sinon.fake();

		/* eslint-disable require-yield */
		async function* Thrower(this: Context) {
			for ({} of this) {
				throw new Error(
					"async gen with for await of rejects children passed back in catch",
				);
			}
		}

		async function* Component(this: Context): AsyncGenerator<Child, void, any> {
			for await ({} of this) {
				const p = yield <Thrower />;

				p.catch((err: Error) => {
					mock(err);
				});

				await new Promise((resolve) => setTimeout(resolve, 100));
				yield <span>Okay!</span>;
			}
		}

		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<span>Okay!</span>");
		expect(mock.callCount).toBe(1);
		expect(mock.lastCall.args[0].message).toBe(
			"async gen with for await of rejects children passed back in catch",
		);
	});
});
