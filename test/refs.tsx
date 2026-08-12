import {describe, test, beforeEach, afterEach, expect} from "@b9g/libuild/test";
import * as Sinon from "sinon";

import {Children, Context, createElement, Element, Raw} from "../src/crank.js";
import {renderer} from "../src/dom.js";

describe("refs", () => {
	beforeEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("basic", () => {
		const fn = Sinon.fake();
		renderer.render(<div ref={fn}>Hello</div>, document.body);

		expect(document.body.innerHTML).toBe("<div>Hello</div>");
		expect(fn.callCount).toBe(1);
		expect(fn.lastCall.args[0]).toBe(document.body.firstChild);
	});

	test("runs once", () => {
		const fn = Sinon.fake();
		renderer.render(<div ref={fn}>Hello</div>, document.body);
		renderer.render(<div ref={fn}>Hello</div>, document.body);
		expect(document.body.innerHTML).toBe("<div>Hello</div>");
		expect(fn.callCount).toBe(1);
		expect(fn.lastCall.args[0]).toBe(document.body.firstChild);
	});

	test("child", () => {
		const fn = Sinon.fake();
		renderer.render(
			<div>
				<span ref={fn}>Hello</span>
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<div><span>Hello</span></div>");
		expect(fn.callCount).toBe(1);
		expect(fn.lastCall.args[0]).toBe(document.body.firstChild!.firstChild);
	});

	test("Raw element", () => {
		const fn = Sinon.fake();
		renderer.render(
			<Raw value="<div>Hello world</div>" ref={fn} />,
			document.body,
		);

		expect(fn.callCount).toBe(1);

		const refArgs = fn.lastCall.args;
		expect(refArgs.length).toBe(1);
		expect(refArgs[0] instanceof Node).toBeTruthy();
	});

	test("function component ref passing", () => {
		const fn = Sinon.fake();
		function Component({ref}: {ref: unknown}): Element {
			return <span ref={ref}>Hello</span>;
		}

		renderer.render(
			<div>
				<Component ref={fn} />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<div><span>Hello</span></div>");
		expect(fn.callCount).toBe(1);
		expect(fn.lastCall.args[0]).toBe(document.body.firstChild!.firstChild);
	});

	test("generator component ref passing", () => {
		const fn = Sinon.fake();
		function* Component({ref}: {ref: unknown}): Generator<Element> {
			while (true) {
				yield <span ref={ref}>Hello</span>;
			}
		}

		renderer.render(
			<div>
				<Component ref={fn} />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<div><span>Hello</span></div>");
		expect(fn.callCount).toBe(1);
		expect(fn.lastCall.args[0]).toBe(document.body.firstChild!.firstChild);
	});

	test("async function component ref passing", async () => {
		const fn = Sinon.fake();
		async function Component({ref}: {ref: unknown}): Promise<Element> {
			return <span ref={ref}>Hello</span>;
		}

		await renderer.render(
			<div>
				<Component ref={fn} />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<div><span>Hello</span></div>");
		expect(fn.callCount).toBe(1);
		expect(fn.lastCall.args[0]).toBe(document.body.firstChild!.firstChild);
	});

	test("async generator component", async () => {
		const fn = Sinon.fake();
		async function* Component(
			this: Context,
			{ref}: {ref: unknown},
		): AsyncGenerator<Element> {
			for await ({ref} of this) {
				yield <span ref={ref}>Hello</span>;
			}
		}

		await renderer.render(
			<div>
				<Component ref={fn} />
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe("<div><span>Hello</span></div>");
		expect(fn.callCount).toBe(1);
		expect(fn.lastCall.args[0]).toBe(document.body.firstChild!.firstChild);
	});

	test("transcluded in function component", async () => {
		function Child({children}: {children: Children}): Children {
			return children;
		}

		const fn = Sinon.fake();
		function Parent(): Element {
			return (
				<div>
					<Child>
						<span ref={fn}>Hello</span>
					</Child>
				</div>
			);
		}

		renderer.render(<Parent />, document.body);

		expect(document.body.innerHTML).toBe("<div><span>Hello</span></div>");
		expect(fn.callCount).toBe(1);
		expect(fn.lastCall.args[0]).toBe(document.body.firstChild!.firstChild);
	});

	test("transcluded in async function component", async () => {
		async function Child({children}: {children: Children}): Promise<Children> {
			await new Promise((resolve) => setTimeout(resolve, 1));
			return children;
		}

		const fn = Sinon.fake();
		function Parent(): Element {
			return (
				<div>
					<Child>
						<span ref={fn}>Hello</span>
					</Child>
				</div>
			);
		}

		const p = renderer.render(<Parent />, document.body);

		expect(fn.callCount).toBe(0);
		await p;
		expect(document.body.innerHTML).toBe("<div><span>Hello</span></div>");
		expect(fn.callCount).toBe(1);
		expect(fn.lastCall.args[0]).toBe(document.body.firstChild!.firstChild);
	});

	test("it works with hydrate", async () => {
		const container = document.createElement("div");
		container.innerHTML = "<div>Hello</div>";
		const div = container.firstChild;
		const fn = Sinon.fake();
		const div1 = renderer.hydrate(<div ref={fn}>Hello</div>, container);
		expect(container.innerHTML).toBe("<div>Hello</div>");
		expect(div).toBe(div1);
		expect(fn.callCount).toBe(1);
		expect(fn.lastCall.args[0]).toBe(div);
	});
});
