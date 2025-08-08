import {suite} from "uvu";
import * as Assert from "uvu/assert";

import {
	createElement,
	Children,
	Context,
	Element,
	Fragment,
} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("suspense");
test.before.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

async function SuspenseFallback(
	this: Context,
	{
		children,
		timeout,
		suspenseCtx,
		controller,
	}: {
		children: Children;
		timeout: number;
		suspenseCtx: Context;
		controller?: SuspenseListController;
	},
): Children {
	this.schedule(async () => {
		if (controller) {
			await controller.scheduleFallback(suspenseCtx);
		}
	});
	await new Promise((resolve) => setTimeout(resolve, timeout));
	return children;
}

function SuspenseChildren(
	this: Context,
	{
		children,
		suspenseCtx,
		controller,
	}: {
		children: Children;
		suspenseCtx: Context;
		controller?: SuspenseListController;
	},
): Children {
	this.schedule(async () => {
		if (controller) {
			await controller.scheduleChildren(suspenseCtx);
		}
	});

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
	const controller = this.consume(SuspenseListController);
	if (controller) {
		controller.register(this);
	}

	for await ({children, fallback, timeout = 1000} of this) {
		if (
			controller &&
			controller.tail === "hidden" &&
			controller.revealOrder !== "together"
		) {
			// TODO: Yielding null doesn't seem to let async generator components re-render independently...
			yield <Fragment />;
		} else if (!controller || controller.revealOrder !== "together") {
			yield (
				<SuspenseFallback
					timeout={timeout}
					suspenseCtx={this}
					controller={controller}
				>
					{fallback}
				</SuspenseFallback>
			);
		}

		yield (
			<SuspenseChildren suspenseCtx={this} controller={controller}>
				{children}
			</SuspenseChildren>
		);
	}
}

const SuspenseListController = Symbol.for("SuspenseListController");

interface SuspenseListController {
	revealOrder?: "forwards" | "backwards" | "together";
	tail?: "collapsed" | "hidden";
	register(ctx: Context): void;
	scheduleFallback(ctx: Context): Promise<void>;
	scheduleChildren(ctx: Context): Promise<void>;
}

// SuspenseList - coordinates the reveal order of multiple async children
function* SuspenseList(
	this: Context,
	{
		children,
		revealOrder = "forwards",
		tail = "collapsed",
	}: {
		children: Children;
		revealOrder?: "forwards" | "backwards" | "together";
		tail?: "collapsed" | "hidden";
	},
): Generator<Children> {
	let registering = true;
	const suspenseItems: Array<{
		ctx: Context;
		childrenResolver: () => void;
		childrenPromise: Promise<void>;
	}> = [];

	const controller: SuspenseListController = {
		revealOrder,
		tail,
		register(ctx: Context) {
			if (registering) {
				let childrenResolver: () => void;

				const childrenPromise = new Promise<void>(
					(r) => (childrenResolver = r),
				);

				suspenseItems.push({
					ctx,
					childrenResolver: childrenResolver!,
					childrenPromise,
				});
				return;
			}

			console.error("<Suspense> registered on <SuspenseList> asynchronously.");
		},

		async scheduleFallback(ctx: Context) {
			const index = suspenseItems.findIndex((item) => item.ctx === ctx);
			if (index === -1) {
				throw new Error("Unregistered Suspense context");
			}

			// Fallback coordination with tail support
			if (revealOrder === "forwards") {
				await Promise.all(
					suspenseItems.slice(0, index).map((item) => item.childrenPromise),
				);
			} else if (revealOrder === "backwards") {
				await Promise.all(
					suspenseItems.slice(index + 1).map((item) => item.childrenPromise),
				);
			}
		},

		async scheduleChildren(ctx: Context) {
			const index = suspenseItems.findIndex((item) => item.ctx === ctx);
			if (index === -1) {
				throw new Error("Unregistered Suspense context");
			}

			// This children content is ready
			suspenseItems[index].childrenResolver();
			// Children coordination - determine when this content should show
			if (revealOrder === "together") {
				await Promise.all(suspenseItems.map((item) => item.childrenPromise));
			} else if (revealOrder === "forwards") {
				await Promise.all(
					suspenseItems.slice(0, index + 1).map((item) => item.childrenPromise),
				);
			} else if (revealOrder === "backwards") {
				await Promise.all(
					suspenseItems.slice(index).map((item) => item.childrenPromise),
				);
			}
		},
	};

	this.provide(SuspenseListController, controller);
	for ({children, revealOrder = "forwards", tail = "collapsed"} of this) {
		registering = true;
		suspenseItems.length = 0;
		controller.revealOrder = revealOrder;
		controller.tail = tail;
		setTimeout(() => {
			registering = false;
		});
		yield children;
	}
}

async function Child({timeout}: {timeout?: number}): Promise<Element> {
	await new Promise((resolve) => setTimeout(resolve, timeout));
	return <span>Child {timeout}</span>;
}

test.after.each(() => {
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

	Assert.is(document.body.innerHTML, "<span>Loading...</span>");
	await new Promise((resolve) => setTimeout(resolve, 200));
	Assert.is(document.body.innerHTML, "<span>Child 200</span>");

	await renderer.render(
		<Suspense fallback={<span>Loading...</span>} timeout={100}>
			<Child timeout={200} />
		</Suspense>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<span>Loading...</span>");
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<span>Child 200</span>");
});

test("no loading", async () => {
	await renderer.render(
		<Suspense fallback={<span>Loading...</span>} timeout={100}>
			<Child timeout={0} />
		</Suspense>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<span>Child 0</span>");
	await new Promise((resolve) => setTimeout(resolve, 500));
	Assert.is(document.body.innerHTML, "<span>Child 0</span>");
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

	Assert.is(document.body.innerHTML, "<span>Loading...</span>");
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<span>Child 200</span>");
	await ctx.refresh();
	Assert.is(document.body.innerHTML, "<span>Loading...</span>");
	await new Promise((resolve) => setTimeout(resolve, 120));
	Assert.is(document.body.innerHTML, "<span>Child 200</span>");
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

	Assert.is(document.body.innerHTML, "<span>Loading...</span>");
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<span>Child 200</span>");
	const refreshP = ctx.refresh();
	ctx.refresh();
	await refreshP;
	Assert.is(document.body.innerHTML, "<span>Loading...</span>");
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<span>Child 200</span>");
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

	Assert.is(document.body.innerHTML, "<span>Loading...</span>");
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<span>Child 200</span>");
	const refreshP = ctx.refresh();
	setTimeout(() => ctx.refresh());
	await refreshP;
	Assert.is(document.body.innerHTML, "<span>Loading...</span>");
	await new Promise((resolve) => setTimeout(resolve, 110));
	Assert.is(document.body.innerHTML, "<span>Child 200</span>");
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

	Assert.is(document.body.innerHTML, "<span>Loading...</span>");
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<span>Child 200</span>");
	const refreshP = ctx.refresh();
	ctx.refresh();
	await refreshP;
	Assert.is(document.body.innerHTML, "<span>Loading...</span>");
	await new Promise((resolve) => setTimeout(resolve, 110));
	Assert.is(document.body.innerHTML, "<span>Child 200</span>");
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
	) as Promise<Array<HTMLElement>>;

	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(document.body.innerHTML, "");

	Assert.equal(
		(await result).map((el) => el.outerHTML),
		["<span>Child 100</span>", "<span>Child 200</span>"],
	);
	Assert.is(
		document.body.innerHTML,
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
	) as Promise<Array<HTMLElement>>;

	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(document.body.innerHTML, "");

	Assert.equal(
		(await result).map((el) => el.outerHTML),
		[
			"<span>Sync child</span>",
			"<span>Child 100</span>",
			"<span>Another sync</span>",
		],
	);
	Assert.is(
		document.body.innerHTML,
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
	) as Promise<Array<HTMLElement>>;

	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(document.body.innerHTML, "");

	Assert.equal(
		(await result).map((el) => el.outerHTML),
		[
			"<span>Child 100</span>",
			"<span>Child 150</span>",
			"<span>Outer sync</span>",
		],
	);
	Assert.is(
		document.body.innerHTML,
		"<span>Child 100</span><span>Child 150</span><span>Outer sync</span>",
	);
});

test("suspenselist forwards mode fast-slow", async () => {
	const result = renderer.render(
		<SuspenseList revealOrder="forwards">
			<Suspense fallback={<span>Loading A...</span>} timeout={50}>
				<Child timeout={100} />
			</Suspense>
			<Suspense fallback={<span>Loading B...</span>} timeout={50}>
				<Child timeout={200} />
			</Suspense>
		</SuspenseList>,
		document.body,
	) as Promise<Array<HTMLElement>>;
	// Both loading initially
	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(document.body.innerHTML, "<span>Loading A...</span>");

	Assert.equal(
		(await result).map((el) => el.outerHTML),
		["<span>Child 100</span>", "<span>Loading B...</span>"],
	);

	Assert.is(
		document.body.innerHTML,
		"<span>Child 100</span><span>Loading B...</span>",
	);

	await new Promise((resolve) => setTimeout(resolve, 120));
	Assert.is(
		document.body.innerHTML,
		"<span>Child 100</span><span>Child 200</span>",
	);
});

test("suspenselist forwards mode slow-fast", async () => {
	const result = renderer.render(
		<SuspenseList revealOrder="forwards">
			<Suspense fallback={<span>Loading A...</span>} timeout={50}>
				<Child timeout={200} />
			</Suspense>
			<Suspense fallback={<span>Loading B...</span>} timeout={50}>
				<Child timeout={100} />
			</Suspense>
		</SuspenseList>,
		document.body,
	) as Promise<Array<HTMLElement>>;

	// Both loading initially
	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(document.body.innerHTML, "<span>Loading A...</span>");

	// After second child ready (100ms), should still wait for first
	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(document.body.innerHTML, "<span>Loading A...</span>");

	Assert.equal(
		(await result).map((el) => el.outerHTML),
		["<span>Child 200</span>", "<span>Child 100</span>"],
	);

	Assert.is(
		document.body.innerHTML,
		"<span>Child 200</span><span>Child 100</span>",
	);
});

test("suspenselist backwards mode slow-fast", async () => {
	const result = renderer.render(
		<SuspenseList revealOrder="backwards">
			<Suspense fallback={<span>Loading A...</span>} timeout={50}>
				<Child timeout={100} />
			</Suspense>
			<Suspense fallback={<span>Loading B...</span>} timeout={50}>
				<Child timeout={200} />
			</Suspense>
		</SuspenseList>,
		document.body,
	) as Promise<Array<HTMLElement>>;

	// Both loading initially
	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(document.body.innerHTML, "<span>Loading B...</span>");

	Assert.equal(
		(await result).map((el) => el.outerHTML),
		["<span>Child 100</span>", "<span>Child 200</span>"],
	);

	Assert.is(
		document.body.innerHTML,
		"<span>Child 100</span><span>Child 200</span>",
	);
});

test("suspenselist backwards mode fast-slow", async () => {
	const result = renderer.render(
		<SuspenseList revealOrder="backwards">
			<Suspense fallback={<span>Loading A...</span>} timeout={50}>
				<Child timeout={200} />
			</Suspense>
			<Suspense fallback={<span>Loading B...</span>} timeout={50}>
				<Child timeout={100} />
			</Suspense>
		</SuspenseList>,
		document.body,
	) as Promise<Array<HTMLElement>>;

	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(document.body.innerHTML, "<span>Loading B...</span>");

	Assert.equal(
		(await result).map((el) => el.outerHTML),
		["<span>Loading A...</span>", "<span>Child 100</span>"],
	);

	Assert.is(
		document.body.innerHTML,
		"<span>Loading A...</span><span>Child 100</span>",
	);
});

test("suspenselist forwards collapsed - at most one fallback", async () => {
	// Don't await the render - let it progress asynchronously
	const renderPromise = renderer.render(
		<SuspenseList revealOrder="forwards" tail="collapsed">
			<Suspense fallback={<span>Loading A...</span>} timeout={50}>
				<Child timeout={100} />
			</Suspense>
			<Suspense fallback={<span>Loading B...</span>} timeout={50}>
				<Child timeout={300} />
			</Suspense>
			<Suspense fallback={<span>Loading C...</span>} timeout={50}>
				<Child timeout={200} />
			</Suspense>
		</SuspenseList>,
		document.body,
	) as Promise<Array<HTMLElement>>;

	// After fallback timeouts (50ms), should show all fallbacks initially
	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(document.body.innerHTML, "<span>Loading A...</span>");

	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(
		document.body.innerHTML,
		"<span>Child 100</span><span>Loading B...</span>",
	);

	// After C ready (200ms), still waiting for B
	await new Promise((resolve) => setTimeout(resolve, 120));
	Assert.is(
		document.body.innerHTML,
		"<span>Child 100</span><span>Loading B...</span>",
	);

	Assert.equal(
		(await renderPromise).map((el) => el.outerHTML),
		[
			"<span>Child 100</span>",
			"<span>Child 300</span>",
			"<span>Child 200</span>",
		],
	);

	Assert.is(
		document.body.innerHTML,
		"<span>Child 100</span><span>Child 300</span><span>Child 200</span>",
	);
});

test("suspenselist forwards hidden - no fallbacks for waiting", async () => {
	const renderPromise = renderer.render(
		<SuspenseList revealOrder="forwards" tail="hidden">
			<Suspense fallback={<span>Loading A...</span>} timeout={50}>
				<Child timeout={100} />
			</Suspense>
			<Suspense fallback={<span>Loading B...</span>} timeout={50}>
				<Child timeout={200} />
			</Suspense>
		</SuspenseList>,
		document.body,
	) as Promise<Array<HTMLElement>>;

	// TODO: is this correct behavior? Should we at least wait for first child?
	Assert.is(await renderPromise, undefined);
	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(document.body.innerHTML, "");

	// After A ready (100ms), show A and nothing for B (hidden)
	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(document.body.innerHTML, "<span>Child 100</span>");

	// After B ready (200ms), both show
	await new Promise((resolve) => setTimeout(resolve, 120));
	Assert.is(
		document.body.innerHTML,
		"<span>Child 100</span><span>Child 200</span>",
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

	Assert.is(
		document.body.innerHTML,
		"<span>Child 100</span><span>Child 200</span>",
	);

	// After both ready, both reveal together
	await new Promise((resolve) => setTimeout(resolve, 120));
	Assert.is(
		document.body.innerHTML,
		"<span>Child 100</span><span>Child 200</span>",
	);
});

test.run();
