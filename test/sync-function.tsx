import {describe, test, beforeEach, afterEach, expect} from "@b9g/libuild/test";
import * as Sinon from "sinon";

import {createElement} from "../src/crank.js";
import type {Context, Element} from "../src/crank.js";
import {renderer} from "../src/dom.js";

describe("sync function", () => {
	beforeEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("basic", () => {
		function Component({message}: {message: string}): Element {
			return <span>{message}</span>;
		}

		renderer.render(
			<div>
				<Component message="Hello" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>Hello</span></div>");

		renderer.render(
			<div>
				<Component message="Goodbye" />
			</div>,
			document.body,
		);
		expect(document.body.innerHTML).toBe("<div><span>Goodbye</span></div>");
	});

	test("rerender different return value", () => {
		function Component({ChildTag}: {ChildTag: string}): Element {
			return <ChildTag>Hello world</ChildTag>;
		}

		renderer.render(<Component ChildTag="div" />, document.body);
		expect(document.body.innerHTML).toBe("<div>Hello world</div>");
		renderer.render(<Component ChildTag="span" />, document.body);
		expect(document.body.innerHTML).toBe("<span>Hello world</span>");
	});

	test("async children enqueue", async () => {
		const fn = Sinon.fake();
		async function Child({message}: {message: string}): Promise<Element> {
			fn();
			await new Promise((resolve) => setTimeout(resolve, 100));
			return <div>{message}</div>;
		}

		function Parent({message}: {message: string}): Element {
			return <Child message={message} />;
		}

		const p1 = renderer.render(<Parent message="Hello 1" />, document.body);
		const p2 = renderer.render(<Parent message="Hello 2" />, document.body);
		const p3 = renderer.render(<Parent message="Hello 3" />, document.body);
		const p4 = renderer.render(<Parent message="Hello 4" />, document.body);
		expect(await p1).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div>Hello 1</div>");
		expect(await p2).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div>Hello 4</div>");
		expect(await p3).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div>Hello 4</div>");
		const p5 = renderer.render(<Parent message="Hello 5" />, document.body);
		const p6 = renderer.render(<Parent message="Hello 6" />, document.body);
		const p7 = renderer.render(<Parent message="Hello 7" />, document.body);
		const p8 = renderer.render(<Parent message="Hello 8" />, document.body);
		expect(await p4).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div>Hello 4</div>");
		expect(await p5).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div>Hello 5</div>");
		expect(await p6).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div>Hello 8</div>");
		expect(await p7).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div>Hello 8</div>");
		expect(await p8).toBe(document.body.firstChild);
		expect(document.body.innerHTML).toBe("<div>Hello 8</div>");
		expect(fn.callCount).toBe(4);
	});

	test("refresh called on unmounted component", () => {
		let ctx!: Context;
		function Component(this: Context) {
			ctx = this;
			return null;
		}

		renderer.render(<Component />, document.body);
		renderer.render(null, document.body);
		const mock = Sinon.stub(console, "error");
		try {
			ctx.refresh();
			ctx.refresh();
			expect(mock.callCount).toBe(2);
		} finally {
			mock.restore();
		}
	});

	test("context is passed as second argument", () => {
		let ctx1!: Context;
		let ctx2!: Context;

		function Component(this: Context, _props: any, ctx: Context) {
			ctx1 = this;
			ctx2 = ctx;
			return null;
		}

		renderer.render(<Component />, document.body);
		expect(ctx1).toBe(ctx2);
	});
});
