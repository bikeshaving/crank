import {c} from "../crank.js";
import {x} from "../template.js";

describe("x", () => {
	test("single element", () => {
		expect(x`<p/>`).toEqual(c("p"));
		expect(x`<p />`).toEqual(c("p"));
		expect(x`<p></p>`).toEqual(c("p"));
	});

	test("top-level strings", () => {
		expect(x`hello <p>world</p>`).toEqual(
			c("", null, ...["hello ", c("p", null, "world")]),
		);
		expect(x`<p>hello</p> world`).toEqual(
			c("", null, ...[c("p", null, "hello"), " world"]),
		);
		expect(x` hello<span> </span>world `).toEqual(
			c("", null, ...["hello", c("span", null, " "), "world"]),
		);
	});

	test("whitespace", () => {
		expect(x`
			<p/>
		`).toEqual(c("p"));
		expect(x`
			<span>Hello</span> \
			<span>World</span>
		`).toEqual(
			c("", null, ...[c("span", null, "Hello"), " ", c("span", null, "World")]),
		);
		// TODO: Figure out how to test trailing whitespace without vim fucking deleting it for me lol
	});

	test("basic string props", () => {
		expect(x`<p class="foo" />`).toEqual(c("p", {class: "foo"}));
		expect(x`<p f="foo" b="bar" />`).toEqual(c("p", {f: "foo", b: "bar"}));
		expect(x`<p f="'foo'" b='"bar"' />`).toEqual(
			c("p", {f: "'foo'", b: '"bar"'}),
		);
	});

	test("tag expressions", () => {
		const T = "tag";
		expect(x`
			<${T}>
				Hello world
			</${T}>
		`).toEqual(c(T, null, "Hello world"));
	});
});
