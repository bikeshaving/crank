import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";

const test = suite("sync generator");

import {createElement, Fragment, Raw} from "../src/crank.js";
import type {Child, Children, Context, Element} from "../src/crank.js";
import {renderer} from "../src/dom.js";

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test("basic", () => {
	const Component = Sinon.fake(function* Component(
		this: Context,
		{message}: {message: string},
	): Generator<Element> {
		let i = 0;
		for ({message} of this) {
			if (++i > 2) {
				return <span>Final</span>;
			}

			yield <span>{message}</span>;
		}
	});

	renderer.render(
		<div>
			<Component message="Hello 1" />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>Hello 1</span></div>");
	renderer.render(
		<div>
			<Component message="Hello 2" />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>Hello 2</span></div>");
	renderer.render(
		<div>
			<Component message="Hello 3" />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>Final</span></div>");
	Assert.is(Component.callCount, 1);
});

test("refresh", () => {
	let ctx!: Context;
	function* Component(this: Context): Generator<Element> {
		ctx = this;
		let i = 1;
		while (true) {
			yield <span>Hello {i++}</span>;
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<div><span>Hello 1</span></div>");
	ctx.refresh();
	Assert.is(document.body.innerHTML, "<div><span>Hello 2</span></div>");
	ctx.refresh();
	ctx.refresh();
	Assert.is(document.body.innerHTML, "<div><span>Hello 4</span></div>");
});

test("updating undefined to component", () => {
	function NestedComponent() {
		return <span>Hello</span>;
	}

	let ctx!: Context;
	function* Component(this: Context): Generator<Element> {
		ctx = this;
		let mounted = false;
		while (true) {
			let component: Element | undefined;
			if (mounted) {
				component = <NestedComponent />;
			}

			yield <span>{component}</span>;
			mounted = true;
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span></span></div>");
	ctx.refresh();
	Assert.is(
		document.body.innerHTML,
		"<div><span><span>Hello</span></span></div>",
	);
});

test("refresh undefined to nested component", () => {
	function NestedComponent() {
		return <span>Hello</span>;
	}

	let ctx!: Context;
	function* Component(this: Context): Generator<Element> {
		ctx = this;
		let mounted = false;
		while (true) {
			let component: Element | undefined;
			if (mounted) {
				component = <NestedComponent />;
			}

			yield <span>{component}</span>;
			mounted = true;
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span></span></div>");
	ctx.refresh();
	Assert.is(
		document.body.innerHTML,
		"<div><span><span>Hello</span></span></div>",
	);
});

test("refresh null to element", () => {
	let ctx!: Context;
	function* Component(this: Context): Generator<Child> {
		ctx = this;
		yield null;
		yield <span>Hello</span>;
		yield null;
		yield <span>Hello again</span>;
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div></div>");
	ctx.refresh();
	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
	ctx.refresh();
	Assert.is(document.body.innerHTML, "<div></div>");
	ctx.refresh();
	Assert.is(document.body.innerHTML, "<div><span>Hello again</span></div>");
});

test("refresh with different child", () => {
	let ctx!: Context;
	function* Component(this: Context): Generator<Child> {
		ctx = this;
		yield <span>1</span>;
		yield <div>2</div>;
		yield <span>3</span>;
		yield null;
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	ctx.refresh();
	Assert.is(document.body.innerHTML, "<div><div>2</div></div>");
	ctx.refresh();
	Assert.is(document.body.innerHTML, "<div><span>3</span></div>");
	ctx.refresh();
	Assert.is(document.body.innerHTML, "<div></div>");
});

test("refresh with different child and siblings", () => {
	let ctx!: Context;
	function* Component(this: Context): Generator<Child> {
		if (ctx === undefined) {
			ctx = this;
		}

		yield <span>Hello</span>;
		yield <div>Hello</div>;
		yield <span>Hello</span>;
		yield null;
	}

	renderer.render(
		<div>
			<Component />
			<Component />
		</div>,
		document.body,
	);
	Assert.is(
		document.body.innerHTML,
		"<div><span>Hello</span><span>Hello</span></div>",
	);
	ctx.refresh();
	Assert.is(
		document.body.innerHTML,
		"<div><div>Hello</div><span>Hello</span></div>",
	);
	ctx.refresh();
	Assert.is(
		document.body.innerHTML,
		"<div><span>Hello</span><span>Hello</span></div>",
	);
	ctx.refresh();
	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
});

test("refresh fragment", () => {
	let ctx!: Context;
	function* Component(this: Context): Generator<Child> {
		ctx = this;
		yield (
			<Fragment>
				{null}
				<span>2</span>
				{null}
			</Fragment>
		);
		yield (
			<Fragment>
				<span>1</span>
				<span>2</span>
				<span>3</span>
			</Fragment>
		);
		yield (
			<Fragment>
				<span>1</span>
				{null}
				{null}
			</Fragment>
		);
		yield (
			<Fragment>
				{null}
				{null}
				<span>3</span>
			</Fragment>
		);
		yield (
			<Fragment>
				{true}
				{false}
				{undefined}
			</Fragment>
		);
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>2</span></div>");
	ctx.refresh();
	Assert.is(
		document.body.innerHTML,
		"<div><span>1</span><span>2</span><span>3</span></div>",
	);
	ctx.refresh();
	Assert.is(document.body.innerHTML, "<div><span>1</span></div>");
	ctx.refresh();
	Assert.is(document.body.innerHTML, "<div><span>3</span></div>");
	ctx.refresh();
	Assert.is(document.body.innerHTML, "<div></div>");
});

test("refresh component yielding raw with static content", () => {
	let ctx!: Context;
	function* Component(this: Context): Generator<Child> {
		ctx = this;
		while (true) {
			yield (
				<span>
					<Raw value="Hello" />
				</span>
			);
		}
	}

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
	ctx.refresh();
	Assert.is(document.body.innerHTML, "<div><span>Hello</span></div>");
});

test("async children", async () => {
	const mock = Sinon.fake();
	async function Component({children}: {children: Children}): Promise<Element> {
		await new Promise((resolve) => setTimeout(resolve, 100));
		return <span>{children}</span>;
	}

	let ctx!: Context;
	function* Gen(this: Context): Generator<Element> {
		ctx = this;
		let i = 0;
		for (const _ of this) {
			const yielded = yield <Component>Hello {i++}</Component>;
			mock((yielded as any).outerHTML);
		}
	}

	const renderP = renderer.render(
		<div>
			<Gen />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "");
	await renderP;
	Assert.is(document.body.innerHTML, "<div><span>Hello 0</span></div>");
	const refreshP = ctx.refresh();
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(mock.callCount, 1);
	Assert.is(mock.lastCall.firstArg, "<span>Hello 0</span>");
	Assert.is(document.body.innerHTML, "<div><span>Hello 0</span></div>");
	await refreshP;
	Assert.is(document.body.innerHTML, "<div><span>Hello 1</span></div>");
	ctx.refresh();
	await new Promise((resolve) => setTimeout(resolve));
	Assert.is(mock.callCount, 2);
	Assert.is(mock.lastCall.firstArg, "<span>Hello 1</span>");
});

test("refreshing doesn’t cause siblings to update", () => {
	const mock = Sinon.fake();
	function Sibling(): Element {
		mock();
		return <div>Sibling</div>;
	}

	let ctx!: Context;
	function* Component(this: Context): Generator<Element> {
		ctx = this;
		let i = 0;
		while (true) {
			i++;
			yield <div>Hello {i}</div>;
		}
	}
	renderer.render(
		<Fragment>
			<Component />
			<Sibling />
		</Fragment>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div>Hello 1</div><div>Sibling</div>");
	Assert.is(mock.callCount, 1);
	ctx.refresh();
	Assert.is(document.body.innerHTML, "<div>Hello 2</div><div>Sibling</div>");
	Assert.is(mock.callCount, 1);
	ctx.refresh();
	ctx.refresh();
	ctx.refresh();
	ctx.refresh();
	ctx.refresh();
	Assert.is(document.body.innerHTML, "<div>Hello 7</div><div>Sibling</div>");
	Assert.is(mock.callCount, 1);
	renderer.render(
		<Fragment>
			<Component />
			<Sibling />
		</Fragment>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div>Hello 8</div><div>Sibling</div>");
	Assert.is(mock.callCount, 2);
});

test("refreshing child doesn’t cause siblings to update", () => {
	const mock = Sinon.fake();
	function Sibling(): Element {
		mock();
		return <div>Sibling</div>;
	}

	let ctx!: Context;
	function* Child(this: Context): Generator<Element> {
		ctx = this;
		let i = 0;
		while (true) {
			i++;
			yield <div>Hello {i}</div>;
		}
	}

	function* Parent(): Generator<Element> {
		while (true) {
			yield (
				<Fragment>
					<Child />
					<Sibling />
				</Fragment>
			);
		}
	}

	renderer.render(<Parent />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello 1</div><div>Sibling</div>");
	Assert.is(mock.callCount, 1);
	ctx.refresh();
	Assert.is(document.body.innerHTML, "<div>Hello 2</div><div>Sibling</div>");
	Assert.is(mock.callCount, 1);
});

test("yield resumes with a node", () => {
	let html: string | undefined;
	function* Component(): Generator<Element> {
		let i = 0;
		while (true) {
			const node: any = yield <div id={i}>{i}</div>;
			html = node.outerHTML;
			i++;
		}
	}

	renderer.render(<Component />, document.body);
	Assert.is(html, undefined);
	renderer.render(<Component />, document.body);
	Assert.is(html, '<div id="0">0</div>');
	Assert.is(document.body.innerHTML, '<div id="1">1</div>');
	renderer.render(<Component />, document.body);
	Assert.is(html, '<div id="1">1</div>');
	Assert.is(document.body.innerHTML, '<div id="2">2</div>');
});

test("generator returns", () => {
	const Component = Sinon.fake(function* Component(): Generator<Child> {
		yield "Hello";
		return "Goodbye";
	});

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div>Hello</div>");
	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div>Goodbye</div>");
	Assert.is(Component.callCount, 1);
	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div>Hello</div>");
	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div>Goodbye</div>");
	Assert.is(Component.callCount, 2);
	renderer.render(<div>{null}</div>, document.body);
	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div>Hello</div>");
	Assert.is(Component.callCount, 3);
});

// TODO: not sure what the point of this test is with the new generator return behavior
test("generator returns with async children and concurrent updates", async () => {
	async function Child(): Promise<string> {
		return "child";
	}

	// eslint-disable-next-line require-yield
	const Component = Sinon.fake(function* Component(): Generator<Child> {
		return <Child />;
	});

	renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	await renderer.render(
		<div>
			<Component />
		</div>,
		document.body,
	);
	Assert.is(document.body.innerHTML, "<div>child</div>");
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(Component.callCount, 2);
});

test("while true try/finally", () => {
	const beforeYieldFn = Sinon.fake();
	const afterYieldFn = Sinon.fake();
	const finallyFn = Sinon.fake();
	function* Component() {
		try {
			let i = 0;
			while (true) {
				beforeYieldFn();
				yield <div>Hello {i++}</div>;
				afterYieldFn();
			}
		} finally {
			finallyFn();
		}
	}

	renderer.render(<Component />, document.body);
	Assert.is(beforeYieldFn.callCount, 1);
	Assert.is(afterYieldFn.callCount, 0);
	renderer.render(<Component />, document.body);
	Assert.is(beforeYieldFn.callCount, 2);
	Assert.is(afterYieldFn.callCount, 1);
	renderer.render(<Component />, document.body);
	Assert.is(beforeYieldFn.callCount, 3);
	Assert.is(afterYieldFn.callCount, 2);
	Assert.is(document.body.innerHTML, "<div>Hello 2</div>");
	Assert.is(finallyFn.callCount, 0);
	renderer.render(null, document.body);
	Assert.is(beforeYieldFn.callCount, 3);
	Assert.is(afterYieldFn.callCount, 2);
	Assert.is(document.body.innerHTML, "");
	Assert.is(finallyFn.callCount, 1);
});

test("for... of", () => {
	const beforeYieldFn = Sinon.fake();
	const afterYieldFn = Sinon.fake();
	const afterLoopFn = Sinon.fake();
	const finallyFn = Sinon.fake();
	function* Component(this: Context) {
		try {
			let i = 0;
			for ({} of this) {
				beforeYieldFn();
				yield <div>Hello {i++}</div>;
				afterYieldFn();
			}

			afterLoopFn();
		} finally {
			finallyFn();
		}
	}

	renderer.render(<Component />, document.body);
	Assert.is(beforeYieldFn.callCount, 1);
	Assert.is(afterYieldFn.callCount, 0);
	renderer.render(<Component />, document.body);
	Assert.is(beforeYieldFn.callCount, 2);
	Assert.is(afterYieldFn.callCount, 1);
	renderer.render(<Component />, document.body);
	Assert.is(beforeYieldFn.callCount, 3);
	Assert.is(afterYieldFn.callCount, 2);
	Assert.is(document.body.innerHTML, "<div>Hello 2</div>");
	Assert.is(finallyFn.callCount, 0);
	renderer.render(null, document.body);
	Assert.is(beforeYieldFn.callCount, 3);
	Assert.is(afterYieldFn.callCount, 3);
	Assert.is(document.body.innerHTML, "");
	Assert.is(afterLoopFn.callCount, 1);
	Assert.is(finallyFn.callCount, 1);
});

test("try/finally triggered by div", () => {
	const mock = Sinon.fake();
	function* Component(): Generator<Element> {
		try {
			let i = 0;
			while (true) {
				yield <div>Hello {i++}</div>;
			}
		} finally {
			mock();
		}
	}

	renderer.render(<Component />, document.body);
	renderer.render(<Component />, document.body);
	renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello 2</div>");
	Assert.is(mock.callCount, 0);
	renderer.render(<div>Goodbye</div>, document.body);
	Assert.is(document.body.innerHTML, "<div>Goodbye</div>");
	Assert.is(mock.callCount, 1);
});

test("try/finally triggered by rendering string", () => {
	const mock = Sinon.fake();
	function* Component(): Generator<Element> {
		try {
			let i = 0;
			while (true) {
				yield <div>Hello {i++}</div>;
			}
		} finally {
			mock();
		}
	}
	renderer.render(<Component />, document.body);
	renderer.render(<Component />, document.body);
	renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello 2</div>");
	Assert.is(mock.callCount, 0);
	renderer.render(["Goodbye", null], document.body);
	Assert.is(document.body.innerHTML, "Goodbye");
	Assert.is(mock.callCount, 1);
});

test("try/finally triggerd by rendering async", async () => {
	const mock = Sinon.fake();
	function* Component(): Generator<Element> {
		try {
			let i = 0;
			while (true) {
				yield <div>Hello {i++}</div>;
			}
		} finally {
			mock();
		}
	}

	async function Async(): Promise<Element> {
		return <div>Goodbye</div>;
	}

	renderer.render(<Component />, document.body);
	renderer.render(<Component />, document.body);
	renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello 2</div>");
	Assert.is(mock.callCount, 0);
	await renderer.render(<Async />, document.body);
	Assert.is(mock.callCount, 1);
	Assert.is(document.body.innerHTML, "<div>Goodbye</div>");
});

test("Context iterator returns on unmount", () => {
	const mock = Sinon.fake();
	function* Component(this: Context): Generator<Element> {
		let i = 0;
		for ({} of this) {
			yield <div>Hello {i++}</div>;
		}

		mock();
	}

	renderer.render(<Component />, document.body);
	renderer.render(<Component />, document.body);
	renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello 2</div>");
	Assert.is(mock.callCount, 0);
	renderer.render(null, document.body);
	Assert.is(mock.callCount, 1);
});

test("return called when component continues to yield", () => {
	const mock = Sinon.fake();
	function* Component(this: Context, {}): Generator<Element> {
		let i = 0;
		for ({} of this) {
			yield <div>Hello {i++}</div>;
		}

		mock();
		yield <div>Exited {i++}</div>;
		mock();
		Assert.unreachable();
	}

	renderer.render(<Component />, document.body);
	renderer.render(<Component />, document.body);
	renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<div>Hello 2</div>");
	Assert.is(mock.callCount, 0);
	renderer.render(null, document.body);
	Assert.is(mock.callCount, 1);
});

test("multiple iterations without a yield throw", () => {
	let i = 0;
	function* Component(this: Context) {
		for (const _ of this) {
			// just so the test suite doesn’t enter an infinite loop
			if (i > 100) {
				yield;
				return;
			}

			i++;
		}
	}

	Assert.throws(
		() => renderer.render(<Component />, document.body),
		"Context iterated twice",
	);
	Assert.is(i, 1);
});

// TODO: it would be nice to test this like other components
test("for await...of throws", async () => {
	let ctx: Context;
	function* Component(this: Context): Generator<null> {
		ctx = this;
		yield null;
	}

	renderer.render(<Component />, document.body);
	try {
		await ctx![Symbol.asyncIterator]().next();
		Assert.unreachable();
	} catch (err: any) {
		Assert.is(err.message, "Use for…of in sync generator components");
	}
});

test.run();
