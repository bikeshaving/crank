/** @jsx createElement */
import {createElement, Context, Fragment} from "../index";
import {renderer} from "../dom";

describe("rearranging", () => {
	let headerCtx: Context | undefined;
	function* Header(this: Context) {
		headerCtx = this;
		let i = 0;
		for (const _ of this) {
			const Header = `h${(i % 6) + 1}`;
			yield <Header>{i}</Header>;
			i++;
		}
	}

	let asyncHeaderCtx: Context | undefined;
	async function* AsyncHeader(this: Context) {
		asyncHeaderCtx = this;
		let i = 0;
		for await (const _ of this) {
			const Header = `h${(i % 6) + 1}`;
			yield <Header>{i}</Header>;
			i++;
		}
	}

	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
		headerCtx = undefined;
		asyncHeaderCtx = undefined;
	});

	test("changing children", () => {
		renderer.render(<Header />, document.body);
		expect(document.body.innerHTML).toEqual("<h1>0</h1>");
		headerCtx!.refresh();
		expect(document.body.innerHTML).toEqual("<h2>1</h2>");
		headerCtx!.refresh();
		expect(document.body.innerHTML).toEqual("<h3>2</h3>");
	});

	test("changing children nested in a fragment", () => {
		renderer.render(
			<Fragment>
				<Header />
			</Fragment>,
			document.body,
		);
		expect(document.body.innerHTML).toEqual("<h1>0</h1>");
		headerCtx!.refresh();
		expect(document.body.innerHTML).toEqual("<h2>1</h2>");
		headerCtx!.refresh();
		expect(document.body.innerHTML).toEqual("<h3>2</h3>");
	});

	test("changing children nested in a function component", () => {
		let ctx!: Context;
		function Component(this: Context) {
			ctx = this;
			return <Header />;
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("<h1>0</h1>");
		headerCtx!.refresh();
		expect(document.body.innerHTML).toEqual("<h2>1</h2>");
		headerCtx!.refresh();
		expect(document.body.innerHTML).toEqual("<h3>2</h3>");
		ctx.refresh();
		expect(document.body.innerHTML).toEqual("<h4>3</h4>");
	});

	test("changing children nested in a generator component", () => {
		let ctx!: Context;
		function* Component(this: Context) {
			ctx = this;
			while (true) {
				yield (
					<Fragment>
						<Header />
					</Fragment>
				);
			}
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("<h1>0</h1>");
		headerCtx!.refresh();
		expect(document.body.innerHTML).toEqual("<h2>1</h2>");
		headerCtx!.refresh();
		expect(document.body.innerHTML).toEqual("<h3>2</h3>");
		ctx.refresh();
		expect(document.body.innerHTML).toEqual("<h4>3</h4>");
	});

	test("changing children nested in a fragment in a generator component", () => {
		let ctx!: Context;
		function* Component(this: Context) {
			ctx = this;
			while (true) {
				yield <Header />;
			}
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("<h1>0</h1>");
		headerCtx!.refresh();
		expect(document.body.innerHTML).toEqual("<h2>1</h2>");
		headerCtx!.refresh();
		expect(document.body.innerHTML).toEqual("<h3>2</h3>");
		ctx.refresh();
		expect(document.body.innerHTML).toEqual("<h4>3</h4>");
	});

	test("changing children nested in an async component", async () => {
		let ctx!: Context;
		async function Component(this: Context) {
			ctx = this;
			return <Header />;
		}

		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("<h1>0</h1>");
		headerCtx!.refresh();
		expect(document.body.innerHTML).toEqual("<h2>1</h2>");
		headerCtx!.refresh();
		expect(document.body.innerHTML).toEqual("<h3>2</h3>");
		await ctx.refresh();
		expect(document.body.innerHTML).toEqual("<h4>3</h4>");
	});

	test("changing children nested in an async generator component", async () => {
		let ctx!: Context;
		async function* Component(this: Context) {
			ctx = this;
			for await (const _ of this) {
				yield <Header />;
			}
		}

		await renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toEqual("<h1>0</h1>");
		headerCtx!.refresh();
		expect(document.body.innerHTML).toEqual("<h2>1</h2>");
		headerCtx!.refresh();
		expect(document.body.innerHTML).toEqual("<h3>2</h3>");
		await ctx.refresh();
		expect(document.body.innerHTML).toEqual("<h4>3</h4>");
	});

	test("arrange doesn’t get called when the children don’t change", () => {
		let ctx!: Context;
		function* Component(this: Context) {
			ctx = this;
			for (const _ of this) {
				yield "unchanging";
			}
		}

		const spy = jest.spyOn(
			(renderer as any)[Symbol.for("crank.RendererImpl")],
			"arrange",
		);
		renderer.render(<Component />, document.body);
		expect(spy).toHaveBeenCalledTimes(1);
		expect(document.body.innerHTML).toEqual("unchanging");
		ctx!.refresh();
		expect(document.body.innerHTML).toEqual("unchanging");
		ctx!.refresh();
		expect(document.body.innerHTML).toEqual("unchanging");
		ctx!.refresh();
		expect(document.body.innerHTML).toEqual("unchanging");
		expect(spy).toHaveBeenCalledTimes(1);
		spy.mockClear();
	});

	test("changing children with a sibling in a fragment", () => {
		function Sibling() {
			return <p>Sibling</p>;
		}
		renderer.render([<Header />, <Sibling />], document.body);

		expect(document.body.innerHTML).toBe("<h1>0</h1><p>Sibling</p>");

		headerCtx!.refresh();
		expect(document.body.innerHTML).toBe("<h2>1</h2><p>Sibling</p>");
	});

	test("changing children nested in multiple components", () => {
		function Nested(this: Context, {count}: {count: number}) {
			if (count <= 0) {
				return <Header />;
			}

			return <Nested count={count - 1} />;
		}

		renderer.render(<Nested count={100} />, document.body);
		expect(document.body.innerHTML).toBe("<h1>0</h1>");
		headerCtx!.refresh();
		expect(document.body.innerHTML).toBe("<h2>1</h2>");
		headerCtx!.refresh();
		expect(document.body.innerHTML).toBe("<h3>2</h3>");
	});

	test("changing async generator component children", async () => {
		await renderer.render(<AsyncHeader />, document.body);
		expect(document.body.innerHTML).toBe("<h1>0</h1>");
		await asyncHeaderCtx!.refresh();
		expect(document.body.innerHTML).toBe("<h2>1</h2>");
		await asyncHeaderCtx!.refresh();
		expect(document.body.innerHTML).toBe("<h3>2</h3>");
	});
});
