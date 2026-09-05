import {describe, test, beforeEach, afterEach, expect} from "@b9g/libuild/test";
import * as Sinon from "sinon";

import {createElement, Fragment, Raw} from "../src/crank.js";
import type {Child, Children, Context, Element} from "../src/crank.js";
import {renderer} from "../src/dom.js";

describe("sync generator", () => {
	beforeEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	afterEach(() => {
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
		expect(document.body.innerHTML).toBe("<div><span>Hello 1</span></div>");
		renderer.render(
			<div>
				<Component message="Hello 2" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>Hello 2</span></div>");
		renderer.render(
			<div>
				<Component message="Hello 3" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>Final</span></div>");
		expect(Component.callCount).toBe(1);
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

		expect(document.body.innerHTML).toBe("<div><span>Hello 1</span></div>");
		ctx.refresh();
		expect(document.body.innerHTML).toBe("<div><span>Hello 2</span></div>");
		ctx.refresh();
		ctx.refresh();
		expect(document.body.innerHTML).toBe("<div><span>Hello 4</span></div>");
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
		expect(document.body.innerHTML).toBe("<div><span></span></div>");
		ctx.refresh();
		expect(document.body.innerHTML).toBe(
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
		expect(document.body.innerHTML).toBe("<div><span></span></div>");
		ctx.refresh();
		expect(document.body.innerHTML).toBe(
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
		expect(document.body.innerHTML).toBe("<div></div>");
		ctx.refresh();
		expect(document.body.innerHTML).toBe("<div><span>Hello</span></div>");
		ctx.refresh();
		expect(document.body.innerHTML).toBe("<div></div>");
		ctx.refresh();
		expect(document.body.innerHTML).toBe("<div><span>Hello again</span></div>");
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
		expect(document.body.innerHTML).toBe("<div><span>1</span></div>");
		ctx.refresh();
		expect(document.body.innerHTML).toBe("<div><div>2</div></div>");
		ctx.refresh();
		expect(document.body.innerHTML).toBe("<div><span>3</span></div>");
		ctx.refresh();
		expect(document.body.innerHTML).toBe("<div></div>");
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
		expect(document.body.innerHTML).toBe(
			"<div><span>Hello</span><span>Hello</span></div>",
		);
		ctx.refresh();
		expect(document.body.innerHTML).toBe(
			"<div><div>Hello</div><span>Hello</span></div>",
		);
		ctx.refresh();
		expect(document.body.innerHTML).toBe(
			"<div><span>Hello</span><span>Hello</span></div>",
		);
		ctx.refresh();
		expect(document.body.innerHTML).toBe("<div><span>Hello</span></div>");
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
		expect(document.body.innerHTML).toBe("<div><span>2</span></div>");
		ctx.refresh();
		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>2</span><span>3</span></div>",
		);
		ctx.refresh();
		expect(document.body.innerHTML).toBe("<div><span>1</span></div>");
		ctx.refresh();
		expect(document.body.innerHTML).toBe("<div><span>3</span></div>");
		ctx.refresh();
		expect(document.body.innerHTML).toBe("<div></div>");
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
		expect(document.body.innerHTML).toBe("<div><span>Hello</span></div>");
		ctx.refresh();
		expect(document.body.innerHTML).toBe("<div><span>Hello</span></div>");
	});

	test("async children", async () => {
		const mock = Sinon.fake();

		async function Component({
			children,
		}: {
			children: Children;
		}): Promise<Element> {
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
		expect(document.body.innerHTML).toBe("");
		await renderP;
		expect(document.body.innerHTML).toBe("<div><span>Hello 0</span></div>");
		const refreshP = ctx.refresh();
		await new Promise((resolve) => setTimeout(resolve));
		expect(mock.callCount).toBe(1);
		expect(mock.lastCall.firstArg).toBe("<span>Hello 0</span>");
		expect(document.body.innerHTML).toBe("<div><span>Hello 0</span></div>");
		await refreshP;
		expect(document.body.innerHTML).toBe("<div><span>Hello 1</span></div>");
		ctx.refresh();
		await new Promise((resolve) => setTimeout(resolve));
		expect(mock.callCount).toBe(2);
		expect(mock.lastCall.firstArg).toBe("<span>Hello 1</span>");
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
		expect(document.body.innerHTML).toBe(
			"<div>Hello 1</div><div>Sibling</div>",
		);
		expect(mock.callCount).toBe(1);
		ctx.refresh();
		expect(document.body.innerHTML).toBe(
			"<div>Hello 2</div><div>Sibling</div>",
		);
		expect(mock.callCount).toBe(1);
		ctx.refresh();
		ctx.refresh();
		ctx.refresh();
		ctx.refresh();
		ctx.refresh();
		expect(document.body.innerHTML).toBe(
			"<div>Hello 7</div><div>Sibling</div>",
		);
		expect(mock.callCount).toBe(1);
		renderer.render(
			<Fragment>
				<Component />
				<Sibling />
			</Fragment>,
			document.body,
		);
		expect(document.body.innerHTML).toBe(
			"<div>Hello 8</div><div>Sibling</div>",
		);
		expect(mock.callCount).toBe(2);
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
		expect(document.body.innerHTML).toBe(
			"<div>Hello 1</div><div>Sibling</div>",
		);
		expect(mock.callCount).toBe(1);
		ctx.refresh();
		expect(document.body.innerHTML).toBe(
			"<div>Hello 2</div><div>Sibling</div>",
		);
		expect(mock.callCount).toBe(1);
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
		expect(html).toBe(undefined);
		renderer.render(<Component />, document.body);
		expect(html).toBe('<div id="0">0</div>');
		expect(document.body.innerHTML).toBe('<div id="1">1</div>');
		renderer.render(<Component />, document.body);
		expect(html).toBe('<div id="1">1</div>');
		expect(document.body.innerHTML).toBe('<div id="2">2</div>');
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
		expect(document.body.innerHTML).toBe("<div>Hello</div>");
		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div>Goodbye</div>");
		expect(Component.callCount).toBe(1);
		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div>Hello</div>");
		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div>Goodbye</div>");
		expect(Component.callCount).toBe(2);
		renderer.render(<div>{null}</div>, document.body);
		renderer.render(
			<div>
				<Component />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div>Hello</div>");
		expect(Component.callCount).toBe(3);
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
		expect(document.body.innerHTML).toBe("<div>child</div>");
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(Component.callCount).toBe(2);
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
		expect(beforeYieldFn.callCount).toBe(1);
		expect(afterYieldFn.callCount).toBe(0);
		renderer.render(<Component />, document.body);
		expect(beforeYieldFn.callCount).toBe(2);
		expect(afterYieldFn.callCount).toBe(1);
		renderer.render(<Component />, document.body);
		expect(beforeYieldFn.callCount).toBe(3);
		expect(afterYieldFn.callCount).toBe(2);
		expect(document.body.innerHTML).toBe("<div>Hello 2</div>");
		expect(finallyFn.callCount).toBe(0);
		renderer.render(null, document.body);
		expect(beforeYieldFn.callCount).toBe(3);
		expect(afterYieldFn.callCount).toBe(2);
		expect(document.body.innerHTML).toBe("");
		expect(finallyFn.callCount).toBe(1);
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
		expect(beforeYieldFn.callCount).toBe(1);
		expect(afterYieldFn.callCount).toBe(0);
		renderer.render(<Component />, document.body);
		expect(beforeYieldFn.callCount).toBe(2);
		expect(afterYieldFn.callCount).toBe(1);
		renderer.render(<Component />, document.body);
		expect(beforeYieldFn.callCount).toBe(3);
		expect(afterYieldFn.callCount).toBe(2);
		expect(document.body.innerHTML).toBe("<div>Hello 2</div>");
		expect(finallyFn.callCount).toBe(0);
		renderer.render(null, document.body);
		expect(beforeYieldFn.callCount).toBe(3);
		expect(afterYieldFn.callCount).toBe(3);
		expect(document.body.innerHTML).toBe("");
		expect(afterLoopFn.callCount).toBe(1);
		expect(finallyFn.callCount).toBe(1);
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
		expect(document.body.innerHTML).toBe("<div>Hello 2</div>");
		expect(mock.callCount).toBe(0);
		renderer.render(<div>Goodbye</div>, document.body);
		expect(document.body.innerHTML).toBe("<div>Goodbye</div>");
		expect(mock.callCount).toBe(1);
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
		expect(document.body.innerHTML).toBe("<div>Hello 2</div>");
		expect(mock.callCount).toBe(0);
		renderer.render(["Goodbye", null], document.body);
		expect(document.body.innerHTML).toBe("Goodbye");
		expect(mock.callCount).toBe(1);
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
		expect(document.body.innerHTML).toBe("<div>Hello 2</div>");
		expect(mock.callCount).toBe(0);
		await renderer.render(<Async />, document.body);
		expect(mock.callCount).toBe(1);
		expect(document.body.innerHTML).toBe("<div>Goodbye</div>");
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
		expect(document.body.innerHTML).toBe("<div>Hello 2</div>");
		expect(mock.callCount).toBe(0);
		renderer.render(null, document.body);
		expect(mock.callCount).toBe(1);
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
			throw new Error("unreachable");
		}

		renderer.render(<Component />, document.body);
		renderer.render(<Component />, document.body);
		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<div>Hello 2</div>");
		expect(mock.callCount).toBe(0);
		renderer.render(null, document.body);
		expect(mock.callCount).toBe(1);
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

		expect(() => renderer.render(<Component />, document.body)).toThrow(
			"context iterated twice without a yield",
		);
		expect(i).toBe(1);
	});
});
