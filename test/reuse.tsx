import {suite} from "uvu";
import * as Assert from "uvu/assert";
import * as Sinon from "sinon";

import {createElement} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("reuse");

test.after.each(() => {
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

	Assert.is(document.body.innerHTML, "<div><span>1</span><span>1</span></div>");
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

	Assert.is(
		document.body.innerHTML,
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

	Assert.is(document.body.innerHTML, "<div><span>1</span><span>1</span></div>");
	Assert.is(fn.callCount, 2);
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

	Assert.is(document.body.innerHTML, "<div><span>1</span><span>1</span></div>");
	Assert.is(fn.callCount, 2);
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
	Assert.is(document.body.innerHTML, "<span>1</span>");
	renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<span>2</span>");
	renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<span>1</span>");
	renderer.render(<Component />, document.body);
	Assert.is(document.body.innerHTML, "<span>2</span>");
});

test.run();
