import {suite} from "uvu";
import * as Assert from "uvu/assert";

import {createElement} from "../src/crank.js";
import type {Context, Element} from "../src/crank.js";
import {Suspense, SuspenseList} from "../src/async.js";
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
	Assert.is(document.body.innerHTML, "<span>Loading A...</span>");

	await new Promise((resolve) => setTimeout(resolve, 60));
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
	) as Promise<Array<HTMLElement>>;

	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(document.body.innerHTML, "<span>Loading A...</span>");

	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(document.body.innerHTML, "<span>Loading A...</span>");

	await new Promise((resolve) => setTimeout(resolve, 120));
	Assert.is(
		document.body.innerHTML,
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
	) as Promise<Array<HTMLElement>>;

	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(document.body.innerHTML, "<span>Loading B...</span>");

	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(document.body.innerHTML, "<span>Loading B...</span>");

	await new Promise((resolve) => setTimeout(resolve, 120));
	Assert.is(
		document.body.innerHTML,
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
	) as Promise<Array<HTMLElement>>;

	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(document.body.innerHTML, "<span>Loading B...</span>");

	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(
		document.body.innerHTML,
		"<span>Loading A...</span><span>Child 100</span>",
	);
	await new Promise((resolve) => setTimeout(resolve, 120));
	Assert.is(
		document.body.innerHTML,
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

	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(
		document.body.innerHTML,
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
	) as Promise<Array<HTMLElement>>;

	Assert.is(document.body.innerHTML, "");

	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(document.body.innerHTML, "<span>Loading C...</span>");

	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(
		document.body.innerHTML,
		"<span>Loading B...</span><span>Child 100</span>",
	);

	await new Promise((resolve) => setTimeout(resolve, 120));
	Assert.is(
		document.body.innerHTML,
		"<span>Loading B...</span><span>Child 100</span>",
	);

	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(
		document.body.innerHTML,
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
	Assert.is(document.body.innerHTML, "");

	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(document.body.innerHTML, "<span>Child 100</span>");

	await new Promise((resolve) => setTimeout(resolve, 120));
	Assert.is(document.body.innerHTML, "<span>Child 100</span>");

	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(
		document.body.innerHTML,
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
	Assert.is(document.body.innerHTML, "");

	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(document.body.innerHTML, "<span>Child 100</span>");

	await new Promise((resolve) => setTimeout(resolve, 120));
	Assert.is(document.body.innerHTML, "<span>Child 100</span>");

	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(
		document.body.innerHTML,
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

	Assert.is(
		document.body.innerHTML,
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
	) as Promise<Array<HTMLElement>>;

	Assert.equal(
		(await result).map((el) => el.outerHTML),
		["<span>Child 10</span>", "<span>Child 1</span>", "<span>Child 2</span>"],
	);
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
	) as Promise<Array<HTMLElement>>;

	Assert.equal(
		(await result).map((el) => el.outerHTML),
		["<span>Child 2</span>", "<span>Child 1</span>", "<span>Child 10</span>"],
	);
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
	) as Promise<Array<HTMLElement>>;

	Assert.equal(
		(await result).map((el) => el.outerHTML),
		["<span>Child 1</span>", "<span>Child 3</span>", "<span>Child 2</span>"],
	);
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
	) as Promise<Array<HTMLElement>>;

	Assert.equal(
		(await result).map((el) => el.outerHTML),
		[
			"<span>Child 100</span>",
			"<span>Child 60</span>",
			"<span>Child 80</span>",
		],
	);
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
	) as Promise<Array<HTMLElement>>;

	Assert.equal(
		(await result).map((el) => el.outerHTML),
		[
			"<span>Child 80</span>",
			"<span>Child 60</span>",
			"<span>Child 100</span>",
		],
	);
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
	) as Promise<Array<HTMLElement>>;

	Assert.equal(
		(await result).map((el) => el.outerHTML),
		["<span>Child 1</span>", "<span>Child 3</span>", "<span>Child 2</span>"],
	);
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

	Assert.equal((await result).outerHTML, "<span>Child 10</span>");
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
	) as Promise<Array<HTMLElement>>;

	Assert.equal(
		(await result).map((el) => el.outerHTML),
		[
			"<span>Child 200</span>",
			"<span>Child 10</span>",
			"<span>Loading C...</span>",
		],
	);
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

	Assert.equal((await result).outerHTML, "<span>Child 10</span>");
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
	Assert.is(document.body.innerHTML, "<span>Loading A...</span>");

	// Second Suspense inherits timeout=200 from SuspenseList
	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(document.body.innerHTML, "<span>Child 100</span>");

	// Second fallback appears after 200ms total (SuspenseList timeout)
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(
		document.body.innerHTML,
		"<span>Child 100</span><span>Loading B...</span>",
	);

	await new Promise((resolve) => setTimeout(resolve, 120));
	Assert.is(
		document.body.innerHTML,
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
	Assert.is(document.body.innerHTML, "<span>Loading A...</span>");

	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(
		document.body.innerHTML,
		"<span>Child 100</span><span>Loading nested...</span>",
	);

	await new Promise((resolve) => setTimeout(resolve, 60));
	Assert.is(
		document.body.innerHTML,
		"<span>Child 100</span><span>Child 150</span>",
	);
});

test.run();
