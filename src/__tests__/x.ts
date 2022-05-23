import {createElement} from "../crank.js";
import {x} from "../x.js";

describe("x", () => {
	test("basic", () => {
		expect(x`<p/>`).toEqual(createElement("p"));
		expect(x`<p />`).toEqual(createElement("p"));
		expect(x`<p></p>`).toEqual(createElement("p"));
		expect(x`<p>a</p>`).toEqual(createElement("p"));
	});

	test("props", () => {
		expect(x`<p/>`).toEqual(createElement("p"));
		//expect(x`<p class="foo" />`).toEqual(createElement("p", {class: "foo"}));
		//expect(x`<p class=${"foo"} />`).toEqual(createElement("p", {class: "foo"}));
	});
});
