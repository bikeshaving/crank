import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";

import {createElement, Context, Fragment} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("rearranging");

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

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
	headerCtx = undefined;
	asyncHeaderCtx = undefined;
});

test("changing children", () => {
	renderer.render(<Header />, document.body);
	Assert.is(document.body.innerHTML, "<h1>0</h1>");
	headerCtx!.refresh();
	Assert.is(document.body.innerHTML, "<h2>1</h2>");
	headerCtx!.refresh();
	Assert.is(document.body.innerHTML, "<h3>2</h3>");
});

test("changing children nested in a fragment", () => {
	renderer.render(
		<Fragment>
			<Header />
		</Fragment>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<h1>0</h1>");
	headerCtx!.refresh();
	Assert.is(document.body.innerHTML, "<h2>1</h2>");
	headerCtx!.refresh();
	Assert.is(document.body.innerHTML, "<h3>2</h3>");
});

test("changing children nested in a function component", () => {
	let ctx!: Context;
	function Component(this: Context) {
		ctx = this;
		return <Header />;
	}

	renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<h1>0</h1>");
	headerCtx!.refresh();
	Assert.is(document.body.innerHTML, "<h2>1</h2>");
	headerCtx!.refresh();
	Assert.is(document.body.innerHTML, "<h3>2</h3>");
	ctx.refresh();
	Assert.is(document.body.innerHTML, "<h4>3</h4>");
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
	Assert.is(document.body.innerHTML, "<h1>0</h1>");
	headerCtx!.refresh();
	Assert.is(document.body.innerHTML, "<h2>1</h2>");
	headerCtx!.refresh();
	Assert.is(document.body.innerHTML, "<h3>2</h3>");
	ctx.refresh();
	Assert.is(document.body.innerHTML, "<h4>3</h4>");
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
	Assert.is(document.body.innerHTML, "<h1>0</h1>");
	headerCtx!.refresh();
	Assert.is(document.body.innerHTML, "<h2>1</h2>");
	headerCtx!.refresh();
	Assert.is(document.body.innerHTML, "<h3>2</h3>");
	ctx.refresh();
	Assert.is(document.body.innerHTML, "<h4>3</h4>");
});

test("changing children nested in an async component", async () => {
	let ctx!: Context;
	async function Component(this: Context) {
		ctx = this;
		return <Header />;
	}

	await renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<h1>0</h1>");
	headerCtx!.refresh();
	Assert.is(document.body.innerHTML, "<h2>1</h2>");
	headerCtx!.refresh();
	Assert.is(document.body.innerHTML, "<h3>2</h3>");
	await ctx.refresh();
	Assert.is(document.body.innerHTML, "<h4>3</h4>");
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
	Assert.is(document.body.innerHTML, "<h1>0</h1>");
	headerCtx!.refresh();
	Assert.is(document.body.innerHTML, "<h2>1</h2>");
	headerCtx!.refresh();
	Assert.is(document.body.innerHTML, "<h3>2</h3>");
	await ctx.refresh();
	Assert.is(document.body.innerHTML, "<h4>3</h4>");
});

test.skip("arrange doesn’t get called when the children don’t change", () => {
	let ctx!: Context;
	function* Component(this: Context) {
		ctx = this;
		for (const _ of this) {
			yield "unchanging";
		}
	}

	const spy = Sinon.spy(
		(renderer as any)[Symbol.for("crank.RendererImpl")],
		"arrange",
	);
	renderer.render(<Component />, document.body);
	Assert.is(spy.callCount, 1);
	Assert.is(document.body.innerHTML, "unchanging");
	ctx!.refresh();
	Assert.is(document.body.innerHTML, "unchanging");
	ctx!.refresh();
	Assert.is(document.body.innerHTML, "unchanging");
	ctx!.refresh();
	Assert.is(document.body.innerHTML, "unchanging");
	Assert.is(spy.callCount, 1);
	spy.restore();
});

test("changing children with a sibling in a fragment", () => {
	function Sibling() {
		return <p>Sibling</p>;
	}
	renderer.render([<Header />, <Sibling />], document.body);

	Assert.is(document.body.innerHTML, "<h1>0</h1><p>Sibling</p>");

	headerCtx!.refresh();
	Assert.is(document.body.innerHTML, "<h2>1</h2><p>Sibling</p>");
});

test("changing children nested in multiple components", () => {
	function Nested(this: Context, {count}: {count: number}) {
		if (count <= 0) {
			return <Header />;
		}

		return <Nested count={count - 1} />;
	}

	renderer.render(<Nested count={100} />, document.body);
	Assert.is(document.body.innerHTML, "<h1>0</h1>");
	headerCtx!.refresh();
	Assert.is(document.body.innerHTML, "<h2>1</h2>");
	headerCtx!.refresh();
	Assert.is(document.body.innerHTML, "<h3>2</h3>");
});

test("changing async generator component children", async () => {
	await renderer.render(<AsyncHeader />, document.body);
	Assert.is(document.body.innerHTML, "<h1>0</h1>");
	await asyncHeaderCtx!.refresh();
	Assert.is(document.body.innerHTML, "<h2>1</h2>");
	await asyncHeaderCtx!.refresh();
	Assert.is(document.body.innerHTML, "<h3>2</h3>");
});

test.run();
