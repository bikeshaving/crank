import {suite} from "uvu";
import * as Assert from "uvu/assert";

import {c} from "../src/crank.js";
import {xm} from "../src/xm.js";

const test = suite("xm");

test("single elements", () => {
	Assert.equal(xm`<p/>`, c("p"));
	Assert.equal(xm`<p />`, c("p"));
	Assert.equal(xm`<p></p>`, c("p"));
	Assert.equal(xm`<p>hello world</p>`, c("p", null, "hello world"));
});

test("top-level strings", () => {
	Assert.equal(xm`hello world`, c("", null, "hello world"));
	Assert.equal(
		xm`hello <p>world</p>`,
		c("", null, ...["hello ", c("p", null, "world")]),
	);
	Assert.equal(
		xm`<p>hello</p> world`,
		c("", null, ...[c("p", null, "hello"), " world"]),
	);
	Assert.equal(
		xm` hello<span> </span>world `,
		c("", null, ...["hello", c("span", null, " "), "world"]),
	);
});

test("newlines and whitespace", () => {
	// TODO: Figure out how to test this without fricking editors/linters or
	// whatever getting in the way
	Assert.equal(
		xm`
		<p/>
	`,
		c("p"),
	);
	Assert.equal(
		xm`
		<span>Hello</span> \
		<span>World</span>
	`,
		c("", null, ...[c("span", null, "Hello"), " ", c("span", null, "World")]),
	);
});

test("string props", () => {
	Assert.equal(xm`<p class="foo" />`, c("p", {class: "foo"}));
	Assert.equal(xm`<p f="foo" b="bar" />`, c("p", {f: "foo", b: "bar"}));
	Assert.equal(xm`<p f="'foo'" b='"bar"' />`, c("p", {f: "'foo'", b: '"bar"'}));
});

test("string escapes", () => {
	Assert.equal(
		xm`<p a="a\"a\"a\"a" b='b\'b\'b\'b' />`,
		c("p", {a: 'a"a"a"a', b: "b'b'b'b"}),
	);
	Assert.equal(xm`<p a="\\\"\'\a\b\\\"" />`, c("p", {a: `\\"'ab\\"`}));
});

test("fragment shorthand", () => {
	Assert.equal(
		xm`
		<p>
			Hello \
			<>world</>
		</p>
	`,
		c("p", null, "Hello ", c("", null, "world")),
	);
});

test("tag expressions", () => {
	const T1 = "tag1";
	const T2 = "tag2";
	Assert.equal(xm`<${T1}>Hello world</${T1}>`, c(T1, null, "Hello world"));
	Assert.equal(
		xm`
		<${T1}>
			<${T2}>
				Hello world
			</${T2}>
		</${T1}>
	`,
		c(T1, null, c(T2, null, "Hello world")),
	);
});

test("children expressions", () => {
	const ex1 = "Hello";
	const ex2 = "world";
	Assert.equal(
		xm`
		<div>${ex1} ${ex2}</div>
	`,
		c("div", null, "Hello", " ", "world"),
	);
	Assert.equal(
		xm`
		<div>${ex1}${ex2}</div>
	`,
		c("div", null, "Hello", "world"),
	);

	Assert.equal(
		xm`
		<div>
			<span>${ex1} ${ex2}</span>
		</div>
	`,
		c("div", null, c("span", null, "Hello", " ", "world")),
	);

	Assert.equal(
		xm`
		<div><span>${null} ${undefined} ${true} ${false} ${1} ${2}</span></div>
	`,
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

	Assert.equal(
		xm`
		${"Hello"} <span>world</span>
	`,
		c("", null, "Hello", " ", c("span", null, "world")),
	);
});

test("shorthand boolean props", () => {
	Assert.equal(
		xm`
		<label><input type="checkbox" checked name="attendance" disabled />Present</label>
	`,
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
	Assert.equal(
		xm`
		<div class=${"greeting"} style = ${{color: "red"}}>
			Hello world
		</div>
	`,
		c("div", {class: "greeting", style: {color: "red"}}, "Hello world"),
	);
});

test("spread prop expressions", () => {
	const props = {
		style: "color: red;",
	};
	Assert.equal(
		xm`<div class="greeting" ...${props}>Hello world</div>`,
		c("div", {class: "greeting", style: "color: red;"}, "Hello world"),
	);
	Assert.equal(
		xm`<div class="greeting" ... ${props}>Hello world</div>`,
		c("div", {class: "greeting", style: "color: red;"}, "Hello world"),
	);
	Assert.equal(
		xm`<div class="greeting" ...
	${props}>Hello world</div>`,
		c("div", {class: "greeting", style: "color: red;"}, "Hello world"),
	);
});

test("asymmetric closing tags", () => {
	const Component = "C";
	Assert.equal(
		xm`
		<${Component}>Hello world<//>
	`,
		c(Component, null, "Hello world"),
	);

	Assert.equal(
		xm`
		<${Component}>
			Hello world
		<//Component>
	`,
		c(Component, null, "Hello world"),
	);
});

test("weird identifiers", () => {
	Assert.equal(
		xm`
		<$a $b$ _c>
			<-custom-element -prop="foo" _-_="bar" />
			<__ $key=${1}/>
		</$a>
	`,
		c(
			"$a",
			{$b$: true, _c: true},
			...[
				c("-custom-element", {"-prop": "foo", "_-_": "bar"}),
				c("__", {$key: 1}),
			],
		),
	);
});

test("comments", () => {
	Assert.equal(
		xm`
		<div>
			<!--<span>Hello</span>--><span>world</span>
		</div>
	`,
		c("div", null, c("span", null, "world")),
	);

	Assert.equal(
		xm`
		<div>
			<!--<span>Hello</span>--> <!--<span>world</span>-->
		</div>
	`,
		c("div", null, " "),
	);
});

test("comment expressions", () => {
	Assert.equal(
		xm`
		<div>
			<!--
			<${"C"} value=${true} />
			-->
			Hello<!-- world-->
		</div>
	`,
		c("div", null, "Hello"),
	);
});

test("prop string expressions", () => {
	Assert.equal(
		xm`
		<p class="${undefined} ${null} ${"a"}-${{a: "1"}}-" />
	`,
		c("p", {class: "  a-[object Object]-"}),
	);
	Assert.equal(
		xm`
		<p class="a${1}\${2}\a${3}\"" />
	`,
		c("p", {class: 'a1${2}a3"'}),
	);
	// Don’t think too hard about escaping.
	Assert.equal(
		xm`
		<p class="a\\${1}\\${2}\\\a${3}\"" />
	`,
		c("p", {class: 'a\\1\\2\\a3"'}),
	);
	Assert.equal(
		xm`
		<p class="a${true}${false}${null}${undefined}b" />
	`,
		c("p", {class: "ab"}),
	);
});

test("unbalanced tags", () => {
	Assert.throws(() => {
		xm`<span>`;
	}, 'Unmatched opening tag "span"');
	Assert.throws(() => {
		xm`</span>`;
	}, 'Unmatched closing tag "span"');
	Assert.throws(() => {
		xm`<div>uhhh</span>`;
	}, 'Unmatched closing tag "span", expected "div"');
});

test("invalid characters", () => {
	Assert.throws(() => {
		xm`<<>`;
	}, "Unexpected text `<`");
	Assert.throws(() => {
		xm`<p<></p>`;
	}, "Unexpected text `<`");
	Assert.throws(() => {
		xm`<p><</p>`;
	}, "Unexpected text `</`");
	Assert.throws(() => {
		xm`<p</p>`;
	}, "Unexpected text `</`");
	Assert.throws(() => {
		xm`<p ///></p>`;
	}, "Unexpected text `//`");
	Assert.throws(() => {
		xm`<p /p></p>`;
		// debatable, but whatever
	}, "Unexpected text `/`");
	Assert.throws(() => {
		xm`<e p p<></e>`;
	}, "Unexpected text `<`");
	Assert.throws(() => {
		xm`<p class</p>`;
	}, "Unexpected text `</`");
	Assert.throws(() => {
		xm`<p<`;
	}, "Unexpected text `<`");
	Assert.throws(() => {
		xm`<p class=<`;
	}, "Unexpected text `<`");
	Assert.throws(() => {
		xm`<p class==></p>`;
	}, "Unexpected text `=></p>`");
	Assert.throws(() => {
		xm`<p class=</p>`;
	}, "Unexpected text `</p>`");
	Assert.throws(() => {
		xm`<p></p text>`;
	}, "Unexpected text `text`");
	Assert.throws(() => {
		xm`<p></p text`;
	}, "Unexpected text `text`");
	Assert.throws(() => {
		xm`<p><///p>`;
	}, "Unexpected text `/p`");
	Assert.throws(() => {
		xm`<foo="bar">`;
	}, 'Unexpected text `="`');
	Assert.throws(() => {
		xm`<foo="\">`;
		// debatable, but whatever
	}, 'Unexpected text `="\\"`');
});

// TODO: more information
test("invalid expressions", () => {
	const exp = {foo: "bar"};
	Assert.throws(() => {
		xm`<div ${exp}>`;
	}, "Unexpected expression");
	Assert.throws(() => {
		xm`<${"foo"}${"bar"}>`;
	}, "Unexpected expression");
	Assert.throws(() => {
		xm`<p class${undefined} />`;
	}, "Unexpected expression");
});

test("unbalanced tags with expressions", () => {
	function C() {}
	function D() {}
	Assert.throws(() => {
		xm`<${C}>`;
	}, "Unmatched opening tag C()");
	Assert.throws(() => {
		xm`</${C}>`;
	}, "Unmatched closing tag C()");
	Assert.throws(() => {
		xm`<${C}></${D}>`;
	}, "Unmatched closing tag D(), expected C()");
});

test.run();
