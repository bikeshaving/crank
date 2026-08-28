import {describe, test, beforeEach, afterEach, expect} from "@b9g/libuild/test";
import * as Sinon from "sinon";

import {createElement} from "../src/crank.js";
import type {Context, Element} from "../src/crank.js";
import {Suspense, SuspenseList} from "../src/async.js";
import {renderer} from "../src/dom.js";

describe("suspense", () => {
	beforeEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	async function Child({timeout}: {timeout?: number}): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, timeout));
		return <span>Child {timeout}</span>;
	}

	test("basic", async () => {
		await renderer.render(
			<Suspense fallback={<span>Loading...</span>} timeout={100}>
				<Child timeout={200} />
			</Suspense>,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<span>Loading...</span>");
		await new Promise((resolve) => setTimeout(resolve, 200));
		expect(document.body.innerHTML).toBe("<span>Child 200</span>");

		await renderer.render(
			<Suspense fallback={<span>Loading...</span>} timeout={100}>
				<Child timeout={200} />
			</Suspense>,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<span>Loading...</span>");
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toBe("<span>Child 200</span>");
	});

	test("no loading", async () => {
		await renderer.render(
			<Suspense fallback={<span>Loading...</span>} timeout={100}>
				<Child timeout={0} />
			</Suspense>,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<span>Child 0</span>");
		await new Promise((resolve) => setTimeout(resolve, 500));
		expect(document.body.innerHTML).toBe("<span>Child 0</span>");
	});

	test("suspense with refresh", async () => {
		let ctx!: Context;

		async function* App(this: Context) {
			ctx = this;
			for await (const _ of this) {
				yield (
					<Suspense fallback={<span>Loading...</span>} timeout={100}>
						<Child timeout={200} />
					</Suspense>
				);
			}
		}

		await renderer.render(<App />, document.body);

		expect(document.body.innerHTML).toBe("<span>Loading...</span>");
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toBe("<span>Child 200</span>");
		await ctx.refresh();
		expect(document.body.innerHTML).toBe("<span>Loading...</span>");
		await new Promise((resolve) => setTimeout(resolve, 120));
		expect(document.body.innerHTML).toBe("<span>Child 200</span>");
	});

	test("suspense with concurrent refresh", async () => {
		let ctx!: Context;

		async function* App(this: Context) {
			ctx = this;
			for await (const _ of this) {
				yield (
					<Suspense fallback={<span>Loading...</span>} timeout={100}>
						<Child timeout={200} />
					</Suspense>
				);
			}
		}

		await renderer.render(<App />, document.body);

		expect(document.body.innerHTML).toBe("<span>Loading...</span>");
		await new Promise((resolve) => setTimeout(resolve, 120));
		expect(document.body.innerHTML).toBe("<span>Child 200</span>");
		const refreshP = ctx.refresh();
		ctx.refresh();
		await refreshP;
		expect(document.body.innerHTML).toBe("<span>Loading...</span>");
		await new Promise((resolve) => setTimeout(resolve, 120));
		expect(document.body.innerHTML).toBe("<span>Child 200</span>");
	});

	test("suspense with concurrent refresh in timeout", async () => {
		let ctx!: Context;

		async function* App(this: Context) {
			ctx = this;
			for await (const _ of this) {
				yield (
					<Suspense fallback={<span>Loading...</span>} timeout={100}>
						<Child timeout={200} />
					</Suspense>
				);
			}
		}

		await renderer.render(<App />, document.body);

		expect(document.body.innerHTML).toBe("<span>Loading...</span>");
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toBe("<span>Child 200</span>");
		const refreshP = ctx.refresh();
		setTimeout(() => ctx.refresh());
		await refreshP;
		expect(document.body.innerHTML).toBe("<span>Loading...</span>");
		await new Promise((resolve) => setTimeout(resolve, 110));
		expect(document.body.innerHTML).toBe("<span>Child 200</span>");
	});

	test("suspense with concurrent refresh after refresh fulfills", async () => {
		let ctx!: Context;

		async function* App(this: Context) {
			ctx = this;
			for await (const _ of this) {
				yield (
					<Suspense fallback={<span>Loading...</span>} timeout={100}>
						<Child timeout={200} />
					</Suspense>
				);
			}
		}

		await renderer.render(<App />, document.body);

		expect(document.body.innerHTML).toBe("<span>Loading...</span>");
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toBe("<span>Child 200</span>");
		const refreshP = ctx.refresh();
		ctx.refresh();
		await refreshP;
		expect(document.body.innerHTML).toBe("<span>Loading...</span>");
		await new Promise((resolve) => setTimeout(resolve, 110));
		expect(document.body.innerHTML).toBe("<span>Child 200</span>");
	});

	test("suspense preserves state on refresh", async () => {
		let ctx!: Context;
		const mock = Sinon.stub();

		async function* StatefulChild(this: Context) {
			mock();
			let count = 0;
			for ({} of this) {
				await new Promise((resolve) => setTimeout(resolve, 200));
				yield <span>Render {count++}</span>;
			}
		}

		async function* App(this: Context) {
			ctx = this;
			for await (const _ of this) {
				yield (
					<Suspense fallback={<span>Loading...</span>} timeout={100}>
						<StatefulChild />
					</Suspense>
				);
			}
		}

		await renderer.render(<App />, document.body);
		expect(document.body.innerHTML).toBe("<span>Loading...</span>");
		await new Promise((resolve) => setTimeout(resolve, 120));
		expect(document.body.innerHTML).toBe("<span>Render 0</span>");
		await ctx.refresh();
		expect(document.body.innerHTML).toBe("<span>Loading...</span>");
		await new Promise((resolve) => setTimeout(resolve, 120));
		expect(document.body.innerHTML).toBe("<span>Render 1</span>");
		expect(mock.callCount).toBe(1);
	});

	test("suspenselist basic together mode", async () => {
		const result = renderer.render(
			<SuspenseList revealOrder="together">
				<Suspense fallback={<span>Loading A...</span>} timeout={50}>
					<Child timeout={100} />
				</Suspense>
				<Suspense fallback={<span>Loading B...</span>} timeout={50}>
					<Child timeout={200} />
				</Suspense>
			</SuspenseList>,
			document.body,
		) as Promise<HTMLElement[]>;

		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe("");

		expect((await result).map((el) => el.outerHTML)).toEqual([
			"<span>Child 100</span>",
			"<span>Child 200</span>",
		]);
		expect(document.body.innerHTML).toBe(
			"<span>Child 100</span><span>Child 200</span>",
		);
	});

	test("suspenselist together with mixed sync/async children", async () => {
		const result = renderer.render(
			<SuspenseList revealOrder="together">
				<span>Sync child</span>
				<Suspense fallback={<span>Loading...</span>} timeout={50}>
					<Child timeout={100} />
				</Suspense>
				<span>Another sync</span>
			</SuspenseList>,
			document.body,
		) as Promise<HTMLElement[]>;

		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe("");

		expect((await result).map((el) => el.outerHTML)).toEqual([
			"<span>Sync child</span>",
			"<span>Child 100</span>",
			"<span>Another sync</span>",
		]);
		expect(document.body.innerHTML).toBe(
			"<span>Sync child</span><span>Child 100</span><span>Another sync</span>",
		);
	});

	test("nested suspenselist together", async () => {
		const result = renderer.render(
			<SuspenseList revealOrder="together">
				<Suspense fallback={<span>Loading outer...</span>} timeout={50}>
					<SuspenseList revealOrder="together">
						<Suspense fallback={<span>Loading inner 1...</span>} timeout={50}>
							<Child timeout={100} />
						</Suspense>
						<Suspense fallback={<span>Loading inner 2...</span>} timeout={50}>
							<Child timeout={150} />
						</Suspense>
					</SuspenseList>
				</Suspense>
				<span>Outer sync</span>
			</SuspenseList>,
			document.body,
		) as Promise<HTMLElement[]>;

		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe("");

		expect((await result).map((el) => el.outerHTML)).toEqual([
			"<span>Child 100</span>",
			"<span>Child 150</span>",
			"<span>Outer sync</span>",
		]);
		expect(document.body.innerHTML).toBe(
			"<span>Child 100</span><span>Child 150</span><span>Outer sync</span>",
		);
	});

	test("suspenselist forwards mode fast-slow", async () => {
		renderer.render(
			<SuspenseList revealOrder="forwards">
				<Suspense fallback={<span>Loading A...</span>} timeout={50}>
					<Child timeout={100} />
				</Suspense>
				<Suspense fallback={<span>Loading B...</span>} timeout={50}>
					<Child timeout={200} />
				</Suspense>
			</SuspenseList>,
			document.body,
		);

		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe("<span>Loading A...</span>");

		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe(
			"<span>Child 100</span><span>Loading B...</span>",
		);

		await new Promise((resolve) => setTimeout(resolve, 120));
		expect(document.body.innerHTML).toBe(
			"<span>Child 100</span><span>Child 200</span>",
		);
	});

	test("suspenselist forwards mode slow-fast", async () => {
		renderer.render(
			<SuspenseList revealOrder="forwards">
				<Suspense fallback={<span>Loading A...</span>} timeout={50}>
					<Child timeout={200} />
				</Suspense>
				<Suspense fallback={<span>Loading B...</span>} timeout={50}>
					<Child timeout={100} />
				</Suspense>
			</SuspenseList>,
			document.body,
		) as Promise<HTMLElement[]>;

		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe("<span>Loading A...</span>");

		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe("<span>Loading A...</span>");

		await new Promise((resolve) => setTimeout(resolve, 120));
		expect(document.body.innerHTML).toBe(
			"<span>Child 200</span><span>Child 100</span>",
		);
	});

	test("suspenselist backwards mode fast-slow", async () => {
		renderer.render(
			<SuspenseList revealOrder="backwards">
				<Suspense fallback={<span>Loading A...</span>} timeout={50}>
					<Child timeout={100} />
				</Suspense>
				<Suspense fallback={<span>Loading B...</span>} timeout={50}>
					<Child timeout={200} />
				</Suspense>
			</SuspenseList>,
			document.body,
		) as Promise<HTMLElement[]>;

		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe("<span>Loading B...</span>");

		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe("<span>Loading B...</span>");

		await new Promise((resolve) => setTimeout(resolve, 120));
		expect(document.body.innerHTML).toBe(
			"<span>Child 100</span><span>Child 200</span>",
		);
	});

	test("suspenselist backwards mode slow-fast", async () => {
		renderer.render(
			<SuspenseList revealOrder="backwards" timeout={50}>
				<Suspense fallback={<span>Loading A...</span>}>
					<Child timeout={200} />
				</Suspense>
				<Suspense fallback={<span>Loading B...</span>}>
					<Child timeout={100} />
				</Suspense>
			</SuspenseList>,
			document.body,
		) as Promise<HTMLElement[]>;

		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe("<span>Loading B...</span>");

		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe(
			"<span>Loading A...</span><span>Child 100</span>",
		);
		await new Promise((resolve) => setTimeout(resolve, 120));
		expect(document.body.innerHTML).toBe(
			"<span>Child 200</span><span>Child 100</span>",
		);
	});

	test("suspenselist forwards collapsed - at most one fallback", async () => {
		renderer.render(
			<SuspenseList revealOrder="forwards" tail="collapsed">
				<Suspense fallback={<span>Loading A...</span>}>
					<Child timeout={100} />
				</Suspense>
				<Suspense fallback={<span>Loading B...</span>}>
					<Child timeout={300} />
				</Suspense>
				<Suspense fallback={<span>Loading C...</span>}>
					<Child timeout={200} />
				</Suspense>
			</SuspenseList>,
			document.body,
		) as Promise<HTMLElement[]>;

		// After fallback timeouts (50ms), should show all fallbacks initially
		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe("<span>Loading A...</span>");

		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe(
			"<span>Child 100</span><span>Loading B...</span>",
		);

		// After C ready (200ms), still waiting for B
		await new Promise((resolve) => setTimeout(resolve, 120));
		expect(document.body.innerHTML).toBe(
			"<span>Child 100</span><span>Loading B...</span>",
		);

		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toBe(
			"<span>Child 100</span><span>Child 300</span><span>Child 200</span>",
		);
	});

	test("suspenselist backwards collapsed - at most one fallback", async () => {
		renderer.render(
			<SuspenseList revealOrder="backwards" tail="collapsed" timeout={50}>
				<Suspense fallback={<span>Loading A...</span>}>
					<Child timeout={200} />
				</Suspense>
				<Suspense fallback={<span>Loading B...</span>}>
					<Child timeout={300} />
				</Suspense>
				<Suspense fallback={<span>Loading C...</span>}>
					<Child timeout={100} />
				</Suspense>
			</SuspenseList>,
			document.body,
		) as Promise<HTMLElement[]>;

		expect(document.body.innerHTML).toBe("");

		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe("<span>Loading C...</span>");

		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe(
			"<span>Loading B...</span><span>Child 100</span>",
		);

		await new Promise((resolve) => setTimeout(resolve, 120));
		expect(document.body.innerHTML).toBe(
			"<span>Loading B...</span><span>Child 100</span>",
		);

		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toBe(
			"<span>Child 200</span><span>Child 300</span><span>Child 100</span>",
		);
	});

	test("suspenselist forwards hidden - no fallbacks", async () => {
		renderer.render(
			<SuspenseList revealOrder="forwards" tail="hidden" timeout={50}>
				<Suspense fallback={<span>Loading A...</span>}>
					<Child timeout={100} />
				</Suspense>
				<Suspense fallback={<span>Loading B...</span>}>
					<Child timeout={300} />
				</Suspense>
				<Suspense fallback={<span>Loading C...</span>}>
					<Child timeout={200} />
				</Suspense>
			</SuspenseList>,
			document.body,
		);

		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe("");

		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe("<span>Child 100</span>");

		await new Promise((resolve) => setTimeout(resolve, 120));
		expect(document.body.innerHTML).toBe("<span>Child 100</span>");

		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toBe(
			"<span>Child 100</span><span>Child 300</span><span>Child 200</span>",
		);
	});

	test("suspenselist backwards hidden - no fallbacks", async () => {
		renderer.render(
			<SuspenseList revealOrder="backwards" tail="hidden">
				<Suspense fallback={<span>Loading A...</span>} timeout={50}>
					<Child timeout={200} />
				</Suspense>
				<Suspense fallback={<span>Loading B...</span>} timeout={50}>
					<Child timeout={300} />
				</Suspense>
				<Suspense fallback={<span>Loading C...</span>} timeout={50}>
					<Child timeout={100} />
				</Suspense>
			</SuspenseList>,
			document.body,
		);

		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe("");

		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe("<span>Child 100</span>");

		await new Promise((resolve) => setTimeout(resolve, 120));
		expect(document.body.innerHTML).toBe("<span>Child 100</span>");

		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toBe(
			"<span>Child 200</span><span>Child 300</span><span>Child 100</span>",
		);
	});

	test("suspenselist together ignores tail", async () => {
		await renderer.render(
			<SuspenseList revealOrder="together" tail="hidden">
				<Suspense fallback={<span>Loading A...</span>} timeout={50}>
					<Child timeout={100} />
				</Suspense>
				<Suspense fallback={<span>Loading B...</span>} timeout={50}>
					<Child timeout={200} />
				</Suspense>
			</SuspenseList>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			"<span>Child 100</span><span>Child 200</span>",
		);
	});

	test("suspenselist forwards resolves with full list", async () => {
		const result = renderer.render(
			<SuspenseList revealOrder="forwards" tail="collapsed">
				<Suspense fallback={<span>Loading A...</span>} timeout={50}>
					<Child timeout={10} />
				</Suspense>
				<Suspense fallback={<span>Loading B...</span>} timeout={50}>
					<Child timeout={1} />
				</Suspense>
				<Suspense fallback={<span>Loading C...</span>} timeout={50}>
					<Child timeout={2} />
				</Suspense>
			</SuspenseList>,
			document.body,
		) as Promise<HTMLElement[]>;

		expect((await result).map((el) => el.outerHTML)).toEqual([
			"<span>Child 10</span>",
			"<span>Child 1</span>",
			"<span>Child 2</span>",
		]);
	});

	test("suspenselist backwards resolves with full list", async () => {
		const result = renderer.render(
			<SuspenseList revealOrder="backwards" tail="collapsed">
				<Suspense fallback={<span>Loading A...</span>} timeout={50}>
					<Child timeout={2} />
				</Suspense>
				<Suspense fallback={<span>Loading B...</span>} timeout={50}>
					<Child timeout={1} />
				</Suspense>
				<Suspense fallback={<span>Loading C...</span>} timeout={50}>
					<Child timeout={10} />
				</Suspense>
			</SuspenseList>,
			document.body,
		) as Promise<HTMLElement[]>;

		expect((await result).map((el) => el.outerHTML)).toEqual([
			"<span>Child 2</span>",
			"<span>Child 1</span>",
			"<span>Child 10</span>",
		]);
	});

	test("suspenselist together resolves with full list", async () => {
		const result = renderer.render(
			<SuspenseList revealOrder="together" tail="collapsed">
				<Suspense fallback={<span>Loading A...</span>} timeout={50}>
					<Child timeout={1} />
				</Suspense>
				<Suspense fallback={<span>Loading B...</span>} timeout={50}>
					<Child timeout={3} />
				</Suspense>
				<Suspense fallback={<span>Loading C...</span>} timeout={50}>
					<Child timeout={2} />
				</Suspense>
			</SuspenseList>,
			document.body,
		) as Promise<HTMLElement[]>;

		expect((await result).map((el) => el.outerHTML)).toEqual([
			"<span>Child 1</span>",
			"<span>Child 3</span>",
			"<span>Child 2</span>",
		]);
	});

	test("suspenselist forwards hidden resolves with full list", async () => {
		const result = renderer.render(
			<SuspenseList revealOrder="forwards" tail="hidden">
				<Suspense fallback={<span>Loading A...</span>} timeout={50}>
					<Child timeout={100} />
				</Suspense>
				<Suspense fallback={<span>Loading B...</span>} timeout={50}>
					<Child timeout={60} />
				</Suspense>
				<Suspense fallback={<span>Loading C...</span>} timeout={50}>
					<Child timeout={80} />
				</Suspense>
			</SuspenseList>,
			document.body,
		) as Promise<HTMLElement[]>;

		expect((await result).map((el) => el.outerHTML)).toEqual([
			"<span>Child 100</span>",
			"<span>Child 60</span>",
			"<span>Child 80</span>",
		]);
	});

	test("suspenselist backwards hidden resolves with full list", async () => {
		const result = renderer.render(
			<SuspenseList revealOrder="backwards" tail="hidden">
				<Suspense fallback={<span>Loading A...</span>} timeout={50}>
					<Child timeout={80} />
				</Suspense>
				<Suspense fallback={<span>Loading B...</span>} timeout={50}>
					<Child timeout={60} />
				</Suspense>
				<Suspense fallback={<span>Loading C...</span>} timeout={50}>
					<Child timeout={100} />
				</Suspense>
			</SuspenseList>,
			document.body,
		) as Promise<HTMLElement[]>;

		expect((await result).map((el) => el.outerHTML)).toEqual([
			"<span>Child 80</span>",
			"<span>Child 60</span>",
			"<span>Child 100</span>",
		]);
	});

	test("suspenselist together hidden resolves with full list", async () => {
		const result = renderer.render(
			<SuspenseList revealOrder="together" tail="hidden">
				<Suspense fallback={<span>Loading A...</span>} timeout={50}>
					<Child timeout={1} />
				</Suspense>
				<Suspense fallback={<span>Loading B...</span>} timeout={50}>
					<Child timeout={3} />
				</Suspense>
				<Suspense fallback={<span>Loading C...</span>} timeout={50}>
					<Child timeout={2} />
				</Suspense>
			</SuspenseList>,
			document.body,
		) as Promise<HTMLElement[]>;

		expect((await result).map((el) => el.outerHTML)).toEqual([
			"<span>Child 1</span>",
			"<span>Child 3</span>",
			"<span>Child 2</span>",
		]);
	});

	test("suspenselist forwards resolves with first children", async () => {
		const result = renderer.render(
			<SuspenseList revealOrder="forwards" tail="collapsed">
				<Suspense fallback={<span>Loading A...</span>} timeout={50}>
					<Child timeout={10} />
				</Suspense>
				<Suspense fallback={<span>Loading B...</span>} timeout={50}>
					<Child timeout={200} />
				</Suspense>
				<Suspense fallback={<span>Loading C...</span>} timeout={50}>
					<Child timeout={300} />
				</Suspense>
			</SuspenseList>,
			document.body,
		) as Promise<HTMLElement>;

		expect((await result).outerHTML).toEqual("<span>Child 10</span>");
	});

	test("suspenselist forwards resolves with children and loading", async () => {
		const result = renderer.render(
			<SuspenseList revealOrder="forwards" tail="collapsed" timeout={50}>
				<Suspense fallback={<span>Loading A...</span>}>
					<Child timeout={200} />
				</Suspense>
				<Suspense fallback={<span>Loading B...</span>}>
					<Child timeout={10} />
				</Suspense>
				<Suspense fallback={<span>Loading C...</span>}>
					<Child timeout={300} />
				</Suspense>
			</SuspenseList>,
			document.body,
		) as Promise<HTMLElement[]>;

		expect((await result).map((el) => el.outerHTML)).toEqual([
			"<span>Child 200</span>",
			"<span>Child 10</span>",
			"<span>Loading C...</span>",
		]);
	});

	test("suspenselist forwards resolves with children but no loading", async () => {
		const result = renderer.render(
			<SuspenseList revealOrder="forwards" tail="collapsed" timeout={50}>
				<Suspense fallback={<span>Loading A...</span>}>
					<Child timeout={10} />
				</Suspense>
				<Suspense fallback={<span>Loading B...</span>}>
					<Child timeout={20} />
				</Suspense>
				<Suspense fallback={<span>Loading C...</span>}>
					<Child timeout={300} />
				</Suspense>
			</SuspenseList>,
			document.body,
		) as Promise<HTMLElement>;

		expect((await result).outerHTML).toEqual("<span>Child 10</span>");
	});

	test("suspense can override suspenselist timeout", async () => {
		renderer.render(
			<SuspenseList revealOrder="forwards" tail="collapsed" timeout={200}>
				<Suspense fallback={<span>Loading A...</span>} timeout={50}>
					<Child timeout={100} />
				</Suspense>
				<Suspense fallback={<span>Loading B...</span>}>
					<Child timeout={300} />
				</Suspense>
			</SuspenseList>,
			document.body,
		);

		// First Suspense has timeout=50, should show fallback at 50ms
		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe("<span>Loading A...</span>");

		// Second Suspense inherits timeout=200 from SuspenseList
		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe("<span>Child 100</span>");

		// Second fallback appears after 200ms total (SuspenseList timeout)
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toBe(
			"<span>Child 100</span><span>Loading B...</span>",
		);

		await new Promise((resolve) => setTimeout(resolve, 120));
		expect(document.body.innerHTML).toBe(
			"<span>Child 100</span><span>Child 300</span>",
		);
	});

	test("suspenselist coordinates nested suspense in components", async () => {
		function NestedComponent(): Element {
			return (
				<Suspense fallback={<span>Loading nested...</span>}>
					<Child timeout={150} />
				</Suspense>
			);
		}

		renderer.render(
			<SuspenseList revealOrder="forwards" tail="collapsed" timeout={50}>
				<Suspense fallback={<span>Loading A...</span>}>
					<Child timeout={100} />
				</Suspense>
				<NestedComponent />
			</SuspenseList>,
			document.body,
		);

		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe("<span>Loading A...</span>");

		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe(
			"<span>Child 100</span><span>Loading nested...</span>",
		);

		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe(
			"<span>Child 100</span><span>Child 150</span>",
		);
	});

	test("suspenselist re-renders", async () => {
		renderer.render(
			<SuspenseList timeout={50}>
				<Suspense fallback={<span>Loading A...</span>}>
					<Child timeout={100} />
				</Suspense>
				<Suspense fallback={<span>Loading B...</span>}>
					<Child timeout={1} />
				</Suspense>
			</SuspenseList>,
			document.body,
		);

		renderer.render(
			<SuspenseList timeout={50}>
				<Suspense fallback={<span>Loading A...</span>}>
					<Child timeout={100} />
				</Suspense>
				<Suspense fallback={<span>Loading B...</span>}>
					<Child timeout={1} />
				</Suspense>
			</SuspenseList>,
			document.body,
		);

		await new Promise((resolve) => setTimeout(resolve, 60));
		expect(document.body.innerHTML).toBe("<span>Loading A...</span>");
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toBe(
			"<span>Child 100</span><span>Child 1</span>",
		);
	});

	// https://github.com/bikeshaving/crank/issues/297
	// TODO: See if we can create a reproduction that does not use setInterval
	test("suspense fallback and children render simultaneously", async () => {
		// Simple loading fallback that refreshes periodically
		function* LoadingFallback(this: Context) {
			let count = 0;
			const interval = setInterval(
				() =>
					this.refresh(() => {
						count++;
					}),
				100,
			);
			this.cleanup(() => clearInterval(interval));

			for ({} of this) {
				yield <div class="fallback">Loading {count}...</div>;
			}
		}

		// Async component that takes time to resolve
		let apiCallCount = 0;

		async function SlowAsyncComponent() {
			const id = ++apiCallCount;
			// Simulate slow network request
			await new Promise((resolve) => setTimeout(resolve, 500));
			return <div class="content">Content {id}</div>;
		}

		// Parent component with button that triggers refresh
		function* App(this: Context) {
			for ({} of this) {
				yield (
					<Suspense fallback={<LoadingFallback />} timeout={300}>
						<SlowAsyncComponent />
					</Suspense>
				);
			}
		}

		// Initial render
		await renderer.render(<App />, document.body);
		renderer.render(<App />, document.body);
		// Wait and check for the bug
		let bugDetected = false;
		for (let i = 0; i < 20; i++) {
			await new Promise((resolve) => setTimeout(resolve, 50));
			const html = document.body.innerHTML;
			if (i === 2) {
				renderer.render(<App />, document.body);
			}

			// Check if BOTH fallback and content are visible
			const hasFallback = html.includes('class="fallback"');
			const hasContent = html.includes('class="content"');

			if (hasFallback && hasContent) {
				bugDetected = true;
				break;
			}
		}

		// Test fails if bug is detected
		expect(
			bugDetected,
		).toBeFalsy();
	});
});
