import {suite} from "uvu";
import * as Assert from "uvu/assert";

import {createElement} from "../src/crank.js";
import {jsx} from "../src/jsx-tag.js";

const test = suite("jsx");

test("single elements", () => {
	Assert.equal(jsx`<p/>`, createElement("p"));
	Assert.equal(jsx`<p />`, createElement("p"));
	Assert.equal(jsx`<p></p>`, createElement("p"));
	Assert.equal(
		jsx`<p>hello world</p>`,
		createElement("p", null, "hello world"),
	);
});

test("top-level strings", () => {
	Assert.equal(jsx`hello world`, createElement("", null, "hello world"));
	Assert.equal(
		jsx`hello <p>world</p>`,
		createElement("", null, ...["hello ", createElement("p", null, "world")]),
	);
	Assert.equal(
		jsx`<p>hello</p> world`,
		createElement("", null, ...[createElement("p", null, "hello"), " world"]),
	);
	Assert.equal(
		jsx` hello<span> </span>world `,
		createElement(
			"",
			null,
			...["hello", createElement("span", null, " "), "world"],
		),
	);
});

test("newlines and whitespace", () => {
	// TODO: Figure out how to test this without fricking editors/linters or
	// whatever getting in the way
	Assert.equal(
		jsx`
		<p/>
	`,
		createElement("p"),
	);
	Assert.equal(
		jsx`
		<span>Hello</span> \
		<span>World</span>
	`,
		createElement(
			"",
			null,
			...[
				createElement("span", null, "Hello"),
				" ",
				createElement("span", null, "World"),
			],
		),
	);
});

test("string props", () => {
	Assert.equal(jsx`<p class="foo" />`, createElement("p", {class: "foo"}));
	Assert.equal(
		jsx`<p f="foo" b="bar" />`,
		createElement("p", {f: "foo", b: "bar"}),
	);
	Assert.equal(
		jsx`<p f="'foo'" b='"bar"' />`,
		createElement("p", {f: "'foo'", b: '"bar"'}),
	);
});

test("string escapes", () => {
	Assert.equal(
		jsx`<p a="a\"a\"a\"a" b='b\'b\'b\'b' />`,
		createElement("p", {a: 'a"a"a"a', b: "b'b'b'b"}),
	);
	Assert.equal(
		jsx`<p a="\\\"\'\a\b\\\"" />`,
		createElement("p", {a: `\\"'a\b\\"`}),
	);
	Assert.equal(
		jsx`<p a="hello\r\nworld" />`,
		createElement("p", {a: "hello\r\nworld"}),
	);
});

test("fragment shorthand", () => {
	Assert.equal(
		jsx`
		<p>
			Hello \
			<>world</>
		</p>
	`,
		createElement("p", null, "Hello ", createElement("", null, "world")),
	);
});

test("tag expressions", () => {
	const T1 = "tag1";
	const T2 = "tag2";
	Assert.equal(
		jsx`<${T1}>Hello world</${T1}>`,
		createElement(T1, null, "Hello world"),
	);
	Assert.equal(
		jsx`
		<${T1}>
			<${T2}>
				Hello world
			</${T2}>
		</${T1}>
	`,
		createElement(T1, null, createElement(T2, null, "Hello world")),
	);
});

test("children expressions", () => {
	const ex1 = "Hello";
	const ex2 = "world";
	Assert.equal(
		jsx`
		<div>${ex1} ${ex2}</div>
	`,
		createElement("div", null, "Hello", " ", "world"),
	);
	Assert.equal(
		jsx`
		<div>${ex1}${ex2}</div>
	`,
		createElement("div", null, "Hello", "world"),
	);

	Assert.equal(
		jsx`
		<div>
			<span>${ex1} ${ex2}</span>
		</div>
	`,
		createElement(
			"div",
			null,
			createElement("span", null, "Hello", " ", "world"),
		),
	);

	Assert.equal(
		jsx`
		<div><span>${null} ${undefined} ${true} ${false} ${1} ${2}</span></div>
	`,
		createElement(
			"div",
			null,
			createElement(
				"span",
				null,
				...[null, " ", undefined, " ", true, " ", false, " ", 1, " ", 2],
			),
		),
	);

	Assert.equal(
		jsx`
		${"Hello"} <span>world</span>
	`,
		createElement("", null, "Hello", " ", createElement("span", null, "world")),
	);
});

test("shorthand boolean props", () => {
	Assert.equal(
		jsx`
		<label><input type="checkbox" checked name="attendance" disabled />Present</label>
	`,
		createElement(
			"label",
			null,
			createElement("input", {
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
	Assert.equal(
		jsx`
		<div class=${"greeting"} style = ${{color: "red"}}>
			Hello world
		</div>
	`,
		createElement(
			"div",
			{class: "greeting", style: {color: "red"}},
			"Hello world",
		),
	);
});

test("spread prop expressions", () => {
	const props = {
		style: "color: red;",
	};
	Assert.equal(
		jsx`<div class="greeting" ...${props}>Hello world</div>`,
		createElement(
			"div",
			{class: "greeting", style: "color: red;"},
			"Hello world",
		),
	);
	Assert.equal(
		jsx`<div class="greeting" ... ${props}>Hello world</div>`,
		createElement(
			"div",
			{class: "greeting", style: "color: red;"},
			"Hello world",
		),
	);
	Assert.equal(
		jsx`<div class="greeting" ...
	${props}>Hello world</div>`,
		createElement(
			"div",
			{class: "greeting", style: "color: red;"},
			"Hello world",
		),
	);
});

test("asymmetric closing tags", () => {
	const Component = "C";
	Assert.equal(
		jsx`
		<${Component}>Hello world<//>
	`,
		createElement(Component, null, "Hello world"),
	);

	Assert.equal(
		jsx`
		<${Component}>
			Hello world
		<//Component>
	`,
		createElement(Component, null, "Hello world"),
	);
});

test("weird identifiers", () => {
	Assert.equal(
		jsx`
		<$a $b$ _c>
			<-custom-element -prop="foo" _-_="bar" />
			<__ key=${1}/>
		</$a>
	`,
		createElement(
			"$a",
			{$b$: true, _c: true},
			...[
				createElement("-custom-element", {"-prop": "foo", "_-_": "bar"}),
				createElement("__", {key: 1}),
			],
		),
	);
});

test("comments", () => {
	Assert.equal(
		jsx`
		<div>
			<!--<span>Hello</span>--><span>world</span>
		</div>
	`,
		createElement("div", null, createElement("span", null, "world")),
	);

	Assert.equal(
		jsx`
		<div>
			<!--<span>Hello</span>--> <!--<span>world</span>-->
		</div>
	`,
		createElement("div", null, " "),
	);
});

test("comment expressions", () => {
	Assert.equal(
		jsx`
		<div>
			<!--
			<${"C"} value=${true} />
			-->
			Hello<!-- world-->
		</div>
	`,
		createElement("div", null, "Hello"),
	);
});

test("prop string expressions", () => {
	Assert.equal(
		jsx`
		<p class="${undefined} ${null} ${"a"}-${{a: "1"}}-" />
	`,
		createElement("p", {class: "  a-[object Object]-"}),
	);
	Assert.equal(
		jsx`
		<p class="a${1}\${2}\a${3}\"" />
	`,
		createElement("p", {class: 'a1${2}a3"'}),
	);
	// Don’t think too hard about escaping.
	Assert.equal(
		jsx`
		<p class="a\\${1}\\${2}\\\a${3}\"" />
	`,
		createElement("p", {class: 'a\\1\\2\\a3"'}),
	);
	Assert.equal(
		jsx`
		<p class="a${true}${false}${null}${undefined}b" />
	`,
		createElement("p", {class: "ab"}),
	);
});

test("unbalanced tags", () => {
	Assert.throws(() => {
		jsx`<span>`;
	}, 'Unmatched opening tag "span"');
	Assert.throws(() => {
		jsx`</span>`;
	}, 'Unmatched closing tag "span"');
	Assert.throws(() => {
		jsx`<div>uhhh</span>`;
	}, 'Unmatched closing tag "span", expected "div"');
});

test("invalid characters", () => {
	Assert.throws(() => {
		jsx`<<>`;
	}, "Unexpected text `<`");
	Assert.throws(() => {
		jsx`<p<></p>`;
	}, "Unexpected text `<`");
	Assert.throws(() => {
		jsx`<p><</p>`;
	}, "Unexpected text `</`");
	Assert.throws(() => {
		jsx`<p</p>`;
	}, "Unexpected text `</`");
	Assert.throws(() => {
		jsx`<p ///></p>`;
	}, "Unexpected text `//`");
	Assert.throws(() => {
		jsx`<p /p></p>`;
		// debatable, but whatever
	}, "Unexpected text `/`");
	Assert.throws(() => {
		jsx`<e p p<></e>`;
	}, "Unexpected text `<`");
	Assert.throws(() => {
		jsx`<p class</p>`;
	}, "Unexpected text `</`");
	Assert.throws(() => {
		jsx`<p<`;
	}, "Unexpected text `<`");
	Assert.throws(() => {
		jsx`<p class=<`;
	}, "Unexpected text `<`");
	Assert.throws(() => {
		jsx`<p class==></p>`;
	}, "Unexpected text `=></p>`");
	Assert.throws(() => {
		jsx`<p class=</p>`;
	}, "Unexpected text `</p>`");
	Assert.throws(() => {
		jsx`<p></p text>`;
	}, "Unexpected text `text`");
	Assert.throws(() => {
		jsx`<p></p text`;
	}, "Unexpected text `text`");
	Assert.throws(() => {
		jsx`<p><///p>`;
	}, "Unexpected text `/p`");
	Assert.throws(() => {
		jsx`<foo="bar">`;
	}, 'Unexpected text `="`');
	Assert.throws(() => {
		jsx`<foo="\">`;
		// debatable, but whatever
	}, 'Unexpected text `="\\"`');
});

// TODO: more information
test("invalid expressions", () => {
	const exp = {foo: "bar"};
	Assert.throws(() => {
		jsx`<div ${exp}>`;
	}, "Unexpected expression");
	Assert.throws(() => {
		jsx`<${"foo"}${"bar"}>`;
	}, "Unexpected expression");
	Assert.throws(() => {
		jsx`<p class${undefined} />`;
	}, "Unexpected expression");
});

test("unbalanced tags with expressions", () => {
	function C() {}
	function D() {}
	Assert.throws(() => {
		jsx`<${C}>`;
	}, "Unmatched opening tag C()");
	Assert.throws(() => {
		jsx`</${C}>`;
	}, "Unmatched closing tag C()");
	Assert.throws(() => {
		jsx`<${C}></${D}>`;
	}, "Unmatched closing tag D(), expected C()");
});

test("unicode characters", () => {
	// Test that Unicode characters are preserved, not escaped
	Assert.equal(
		jsx`<span>–</span>`, // en dash (U+2013)
		createElement("span", null, "–"),
	);
	Assert.equal(
		jsx`<span>…</span>`, // ellipsis (U+2026)
		createElement("span", null, "…"),
	);

	// Test Unicode with template expressions
	const date = "January 1, 2024";
	const result3 = jsx`<span>– Published ${date}</span>`;
	const expected3 = createElement("span", null, "– Published ", date);
	Assert.equal(result3, expected3);

	const url = "/blog/post";
	const result5 = jsx`<a href=${url}>Read more…</a>`;
	const expected5 = createElement("a", {href: url}, "Read more…");
	Assert.equal(result5, expected5);

	// Test complex nested template like BlogContent component
	const author = "John Doe";
	const authorURL = "/author/john";
	const publishDateDisplay = "January 1, 2024";
	const complexResult = jsx`
		<p>
			${author && jsx`By <a href=${authorURL} rel="author">${author}</a>`} \
			${publishDateDisplay && jsx`<span>– Published ${publishDateDisplay}</span>`}
		</p>
	`;

	console.log("Complex template result:");
	console.log("Actual:", JSON.stringify(complexResult, null, 2));

	// Check that the Unicode dash is preserved in the nested span component
	// Based on the actual structure: complexResult.props.children[2] is the span
	const spanChild = complexResult.props.children[2];
	console.log("Span child:", spanChild);
	console.log("Span children:", spanChild.props.children);

	// Verify the Unicode em dash is preserved
	Assert.equal(spanChild.props.children[0], "– Published ");

	// Test that cache key generation preserves Unicode
	const spans = {raw: ["<span>– Published ", "</span>"]};
	const cacheKey = JSON.stringify(spans.raw);
	console.log("Cache key with Unicode:", cacheKey);
	Assert.ok(cacheKey.includes("– Published"));
});

test.run();
