import {c} from "../crank.js";
import {x} from "../template.js";

describe("x", () => {
	test("single elements", () => {
		expect(x`<p/>`).toEqual(c("p"));
		expect(x`<p />`).toEqual(c("p"));
		expect(x`<p></p>`).toEqual(c("p"));
		expect(x`<p>hello world</p>`).toEqual(c("p", null, "hello world"));
	});

	test("top-level strings", () => {
		expect(x`hello world`).toEqual(c("", null, "hello world"));
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

	test("newlines and whitespace", () => {
		// TODO: Figure out how to test this without fricking editors/linters or
		// whatever getting in the way
		expect(x`
			<p/>
		`).toEqual(c("p"));
		expect(x`
			<span>Hello</span> \
			<span>World</span>
		`).toEqual(
			c("", null, ...[c("span", null, "Hello"), " ", c("span", null, "World")]),
		);
	});

	test("string props", () => {
		expect(x`<p class="foo" />`).toEqual(c("p", {class: "foo"}));
		expect(x`<p f="foo" b="bar" />`).toEqual(c("p", {f: "foo", b: "bar"}));
		expect(x`<p f="'foo'" b='"bar"' />`).toEqual(
			c("p", {f: "'foo'", b: '"bar"'}),
		);
	});

	test("tag expressions", () => {
		const T1 = "tag1";
		const T2 = "tag2";
		expect(x`<${T1}>Hello world</${T1}>`).toEqual(c(T1, null, "Hello world"));
		expect(x`
			<${T1}>
				<${T2}>
					Hello world
				</${T2}>
			</${T1}>
		`).toEqual(c(T1, null, c(T2, null, "Hello world")));
	});

	test("children expressions", () => {
		const ex1 = "Hello";
		const ex2 = "world";
		expect(x`
			<div>${ex1} ${ex2}</div>
		`).toEqual(c("div", null, "Hello", " ", "world"));

		expect(x`
			<div>
				<span>${ex1} ${ex2}</span>
			</div>
		`).toEqual(c("div", null, c("span", null, "Hello", " ", "world")));

		expect(x`
			<div><span>${null} ${undefined} ${true} ${false} ${1} ${2}</span></div>
		`).toEqual(
			c(
				"div",
				null,
				c(
					"span",
					null,
					...[null, " ", undefined, " ", true, " ", false, " ", 1, " ", 2],
				),
			),
		);
	});

	test("shorthand boolean props", () => {
		expect(x`
			<label><input type="checkbox" checked name="attendance" disabled />Present</label>
		`).toEqual(
			c(
				"label",
				null,
				c("input", {
					type: "checkbox",
					checked: true,
					name: "attendance",
					disabled: true,
				}),
				"Present",
			),
		);
	});

	test("prop expressions", () => {
		expect(x`
			<div class=${"foo" + "bar"}>
				<span></span>
			</div>
		`).toEqual(c("div", {class: "foobar"}, c("span")));
	});

	test("spread prop expressions", () => {
		const props = {
			style: "color: red;",
		};
		expect(x`<div class="greeting" ...${props}>Hello world</div>`).toEqual(
			c("div", {class: "greeting", style: "color: red;"}, "Hello world"),
		);
	});

	test("asymmetric closing tags", () => {
		const Component = "C";
		expect(x`
			<${Component}>Hello world<//>
		`).toEqual(c(Component, null, "Hello world"));

		expect(x`
			<${Component}>
				Hello world
			<//Component>
		`).toEqual(c(Component, null, "Hello world"));
	});

	test("comments", () => {
		expect(x`
			<div>
				<!--<span>Hello</span>--><span>world</span>
			</div>
		`).toEqual(c("div", null, c("span", null, "world")));

		expect(x`
			<div>
				<!--<span>Hello</span>--> <!--<span>world</span>-->
			</div>
		`).toEqual(c("div", null, " "));

		expect(x`
			<div>
				<!--
				<${"C"} value=${true} />
				-->
				Hello<!-- world-->
			</div>
		`).toEqual(c("div", null, "Hello"));
	});
});
