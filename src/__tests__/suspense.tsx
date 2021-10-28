import {createElement, Children, Context, Element} from "../crank.js";
import {renderer} from "../dom.js";

async function Fallback({
	children,
	timeout,
}: {
	children: Children;
	timeout: number;
}): Promise<Children> {
	await new Promise((resolve) => setTimeout(resolve, timeout));
	return children;
}

async function* Suspense(
	this: Context,
	{
		children,
		fallback,
		timeout = 100,
	}: {children: Children; fallback: Children; timeout?: number},
): AsyncGenerator<Children> {
	for await ({children, fallback, timeout = 1000} of this) {
		yield <Fallback timeout={timeout}>{fallback}</Fallback>;
		yield children;
	}
}

async function Child({timeout}: {timeout?: number}): Promise<Element> {
	await new Promise((resolve) => setTimeout(resolve, timeout));
	return <span>Child {timeout}</span>;
}

describe("suspense", () => {
	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("basic", async () => {
		await renderer.render(
			<Suspense fallback={<span>Loading...</span>} timeout={100}>
				<Child timeout={200} />
			</Suspense>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<span>Loading...</span>");
		await new Promise((resolve) => setTimeout(resolve, 200));
		expect(document.body.innerHTML).toEqual("<span>Child 200</span>");

		await renderer.render(
			<Suspense fallback={<span>Loading...</span>} timeout={100}>
				<Child timeout={200} />
			</Suspense>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<span>Loading...</span>");
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual("<span>Child 200</span>");
	});

	test("no loading", async () => {
		await renderer.render(
			<Suspense fallback={<span>Loading...</span>} timeout={100}>
				<Child timeout={0} />
			</Suspense>,
			document.body,
		);

		expect(document.body.innerHTML).toEqual("<span>Child 0</span>");
		await new Promise((resolve) => setTimeout(resolve, 500));
		expect(document.body.innerHTML).toEqual("<span>Child 0</span>");
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

		expect(document.body.innerHTML).toEqual("<span>Loading...</span>");
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual("<span>Child 200</span>");
		await ctx.refresh();
		expect(document.body.innerHTML).toEqual("<span>Loading...</span>");
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual("<span>Child 200</span>");
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

		expect(document.body.innerHTML).toEqual("<span>Loading...</span>");
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual("<span>Child 200</span>");
		const refreshP = ctx.refresh();
		ctx.refresh();
		await refreshP;
		expect(document.body.innerHTML).toEqual("<span>Loading...</span>");
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual("<span>Child 200</span>");
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

		expect(document.body.innerHTML).toEqual("<span>Loading...</span>");
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual("<span>Child 200</span>");
		const refreshP = ctx.refresh();
		setTimeout(() => ctx.refresh());
		await refreshP;
		expect(document.body.innerHTML).toEqual("<span>Loading...</span>");
		await new Promise((resolve) => setTimeout(resolve, 110));
		expect(document.body.innerHTML).toEqual("<span>Child 200</span>");
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

		expect(document.body.innerHTML).toEqual("<span>Loading...</span>");
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(document.body.innerHTML).toEqual("<span>Child 200</span>");
		const refreshP = ctx.refresh();
		ctx.refresh();
		await refreshP;
		expect(document.body.innerHTML).toEqual("<span>Loading...</span>");
		await new Promise((resolve) => setTimeout(resolve, 110));
		expect(document.body.innerHTML).toEqual("<span>Child 200</span>");
	});
});
