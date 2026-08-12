import {describe, test, beforeEach, afterEach, expect} from "@b9g/libuild/test";
import * as Sinon from "sinon";

import {createElement} from "../src/crank.js";
import {renderer} from "../src/dom.js";

describe("reuse", () => {
	beforeEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("reused intrinsic", () => {
		const el = <span>1</span>;
		renderer.render(
			<div>
				{el}
				{el}
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>1</span></div>",
		);
	});

	test("reused intrinsic with element in between", () => {
		const el = <span>1</span>;
		renderer.render(
			<div>
				{el}
				<span>2</span>
				{el}
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>2</span><span>1</span></div>",
		);
	});

	test("reused function component", () => {
		const fn = Sinon.fake();
		function Component() {
			fn();
			return <span>1</span>;
		}

		const el = <Component />;
		renderer.render(
			<div>
				{el}
				{el}
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>1</span></div>",
		);
		expect(fn.callCount).toBe(2);
	});

	test("reused generator component", () => {
		const fn = Sinon.fake();
		function* Component() {
			fn();
			while (true) {
				yield <span>1</span>;
			}
		}

		const el = <Component />;
		renderer.render(
			<div>
				{el}
				{el}
			</div>,
			document.body,
		);

		expect(document.body.innerHTML).toBe(
			"<div><span>1</span><span>1</span></div>",
		);
		expect(fn.callCount).toBe(2);
	});

	test("toggle reused element", () => {
		function* Component() {
			let toggle = true;
			const el = <span>1</span>;
			while (true) {
				yield toggle ? el : <span>2</span>;
				toggle = !toggle;
			}
		}

		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<span>1</span>");
		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<span>2</span>");
		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<span>1</span>");
		renderer.render(<Component />, document.body);
		expect(document.body.innerHTML).toBe("<span>2</span>");
	});
});
