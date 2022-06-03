import {c} from "../crank.js";
import {x} from "../template.js";

describe("x", () => {
	test.skip("basic", () => {
		expect(x`<p/>`).toEqual(c("p"));
		//expect(x`<p />`).toEqual(createElement("p"));
		//expect(x`<p></p>`).toEqual(createElement("p"));
	});

	test("basic 1", () => {
		expect(x`hello <p>world</p>`).toEqual(
			c("", null, ...["hello ", c("p", null, "world")]),
		);
		//expect(x`<p />`).toEqual(createElement("p"));
		//expect(x`<p></p>`).toEqual(createElement("p"));
	});

	test.skip("props", () => {
		expect(x`<p/>`).toEqual(c("p"));
		//expect(x`<p class="foo" />`).toEqual(createElement("p", {class: "foo"}));
		//expect(x`<p class=${"foo"} />`).toEqual(createElement("p", {class: "foo"}));
	});

	test.skip("whitespace 1", () => {
		expect(x`
			<p/>
		`).toEqual(c("p"));
	});

	test.skip("whitespace 2", () => {
		const result = c(
			"",
			null,
			...[c("span", null, "Hello"), " ", c("", null, c("span", null, "World"))],
		);
		expect(x`
			<span>Hello</span> \
			<span>World</span>
		`).toEqual(result);
	});
});
