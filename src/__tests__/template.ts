import {createElement} from "../crank.js";
import {x} from "../template.js";

describe("x", () => {
	test("basic", () => {
		expect(x`<p/>`).toEqual(createElement("p"));
		expect(x`<p />`).toEqual(createElement("p"));
		expect(x`<p></p>`).toEqual(createElement("p"));
	});

	test("props", () => {
		expect(x`<p/>`).toEqual(createElement("p"));
		//expect(x`<p class="foo" />`).toEqual(createElement("p", {class: "foo"}));
		//expect(x`<p class=${"foo"} />`).toEqual(createElement("p", {class: "foo"}));
	});

	test("whitespace", () => {
		const result = createElement(
			"",
			null,
			...[
				createElement("span", null, "Hello"),
				" ",
				createElement("", null, createElement("span", null, "World")),
			],
		);
		expect(x`
			<span>Hello</span> \
			<span>World</span>
		`).toEqual(result);
	});
});
