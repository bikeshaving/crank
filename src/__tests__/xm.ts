import {c} from "../crank.js";
import {xm} from "../xm.js";

describe("happy path", () => {
	test("single elements", () => {
		expect(xm`<p/>`).toEqual(c("p"));
		expect(xm`<p />`).toEqual(c("p"));
		expect(xm`<p></p>`).toEqual(c("p"));
		expect(xm`<p>hello world</p>`).toEqual(c("p", null, "hello world"));
	});

	test("top-level strings", () => {
		expect(xm`hello world`).toEqual(c("", null, "hello world"));
		expect(xm`hello <p>world</p>`).toEqual(
			c("", null, ...["hello ", c("p", null, "world")]),
		);
		expect(xm`<p>hello</p> world`).toEqual(
			c("", null, ...[c("p", null, "hello"), " world"]),
		);
		expect(xm` hello<span> </span>world `).toEqual(
			c("", null, ...["hello", c("span", null, " "), "world"]),
		);
	});

	test("newlines and whitespace", () => {
		// TODO: Figure out how to test this without fricking editors/linters or
		// whatever getting in the way
		expect(xm`
			<p/>
		`).toEqual(c("p"));
		expect(xm`
			<span>Hello</span> \
			<span>World</span>
		`).toEqual(
			c("", null, ...[c("span", null, "Hello"), " ", c("span", null, "World")]),
		);
	});

	test("string props", () => {
		expect(xm`<p class="foo" />`).toEqual(c("p", {class: "foo"}));
		expect(xm`<p f="foo" b="bar" />`).toEqual(c("p", {f: "foo", b: "bar"}));
		expect(xm`<p f="'foo'" b='"bar"' />`).toEqual(
			c("p", {f: "'foo'", b: '"bar"'}),
		);
	});

	test("string escapes", () => {
		expect(xm`<p a="a\"a\"a\"a" b='b\'b\'b\'b' />`).toEqual(
			c("p", {a: 'a"a"a"a', b: "b'b'b'b"}),
		);
		expect(xm`<p a="\\\"\'\a\b\\\"" />`).toEqual(c("p", {a: `\\"'ab\\"`}));
	});

	test("fragment shorthand", () => {
		expect(xm`
			<p>
				Hello \
				<>world</>
			</p>
		`).toEqual(c("p", null, "Hello ", c("", null, "world")));
	});

	test("tag expressions", () => {
		const T1 = "tag1";
		const T2 = "tag2";
		expect(xm`<${T1}>Hello world</${T1}>`).toEqual(c(T1, null, "Hello world"));
		expect(xm`
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
		expect(xm`
			<div>${ex1} ${ex2}</div>
		`).toEqual(c("div", null, "Hello", " ", "world"));
		expect(xm`
			<div>${ex1}${ex2}</div>
		`).toEqual(c("div", null, "Hello", "world"));

		expect(xm`
			<div>
				<span>${ex1} ${ex2}</span>
			</div>
		`).toEqual(c("div", null, c("span", null, "Hello", " ", "world")));

		expect(xm`
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

		expect(xm`
			${"Hello"} <span>world</span>
		`).toEqual(c("", null, "Hello", " ", c("span", null, "world")));
	});

	test("shorthand boolean props", () => {
		expect(xm`
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
		expect(xm`
			<div class=${"greeting"} style = ${{color: "red"}}>
				Hello world
			</div>
		`).toEqual(c("div", {class: "greeting", style: {color: "red"}}, "Hello world"));
	});

	test("spread prop expressions", () => {
		const props = {
			style: "color: red;",
		};
		expect(xm`<div class="greeting" ...${props}>Hello world</div>`).toEqual(
			c("div", {class: "greeting", style: "color: red;"}, "Hello world"),
		);
		expect(xm`<div class="greeting" ... ${props}>Hello world</div>`).toEqual(
			c("div", {class: "greeting", style: "color: red;"}, "Hello world"),
		);
		expect(xm`<div class="greeting" ...
		${props}>Hello world</div>`).toEqual(
			c("div", {class: "greeting", style: "color: red;"}, "Hello world"),
		);
	});

	test("asymmetric closing tags", () => {
		const Component = "C";
		expect(xm`
			<${Component}>Hello world<//>
		`).toEqual(c(Component, null, "Hello world"));

		expect(xm`
			<${Component}>
				Hello world
			<//Component>
		`).toEqual(c(Component, null, "Hello world"));
	});

	test("weird identifiers", () => {
		expect(xm`
			<$a $b$ _c>
				<-custom-element -prop="foo" _-_="bar" />
				<__ $key=${1}/>
			</$a>
		`).toEqual(
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
		expect(xm`
			<div>
				<!--<span>Hello</span>--><span>world</span>
			</div>
		`).toEqual(c("div", null, c("span", null, "world")));

		expect(xm`
			<div>
				<!--<span>Hello</span>--> <!--<span>world</span>-->
			</div>
		`).toEqual(c("div", null, " "));
	});

	test("comment expressions", () => {
		expect(xm`
			<div>
				<!--
				<${"C"} value=${true} />
				-->
				Hello<!-- world-->
			</div>
		`).toEqual(c("div", null, "Hello"));
	});

	test("prop string expressions", () => {
		expect(xm`
			<p class="${undefined} ${null} ${"a"}-${{a: "1"}}-" />
		`).toEqual(c("p", {class: "  a-[object Object]-"}));
		expect(xm`
			<p class="a${1}\${2}\a${3}\"" />
		`).toEqual(c("p", {class: 'a1${2}a3"'}));
		// Don’t think too hard about escaping.
		expect(xm`
			<p class="a\\${1}\\${2}\\\a${3}\"" />
		`).toEqual(c("p", {class: 'a\\1\\2\\a3"'}));
		expect(xm`
			<p class="a${true}${false}${null}${undefined}b" />
		`).toEqual(c("p", {class: "ab"}));
	});
});

describe("sad path", () => {
	test("unbalanced tags", () => {
		expect(() => {
			xm`<span>`;
		}).toThrow(new SyntaxError('Unmatched opening tag "span"'));
		expect(() => {
			xm`</span>`;
		}).toThrow(new SyntaxError('Unmatched closing tag "span"'));
		expect(() => {
			xm`<div>uhhh</span>`;
		}).toThrow(new SyntaxError('Unmatched closing tag "span", expected "div"'));
	});

	test("invalid characters", () => {
		expect(() => {
			xm`<<>`;
		}).toThrow(new SyntaxError("Unexpected text `<`"));
		expect(() => {
			xm`<p<></p>`;
		}).toThrow(new SyntaxError("Unexpected text `<`"));
		expect(() => {
			xm`<p><</p>`;
		}).toThrow(new SyntaxError("Unexpected text `</`"));
		expect(() => {
			xm`<p</p>`;
		}).toThrow(new SyntaxError("Unexpected text `</`"));
		expect(() => {
			xm`<p ///></p>`;
		}).toThrow(new SyntaxError("Unexpected text `//`"));
		expect(() => {
			xm`<p /p></p>`;
			// debatable, but whatever
		}).toThrow(new SyntaxError("Unexpected text `/`"));
		expect(() => {
			xm`<e p p<></e>`;
		}).toThrow(new SyntaxError("Unexpected text `<`"));
		expect(() => {
			xm`<p class</p>`;
		}).toThrow(new SyntaxError("Unexpected text `</`"));
		expect(() => {
			xm`<p<`;
		}).toThrow(new SyntaxError("Unexpected text `<`"));
		expect(() => {
			xm`<p class=<`;
		}).toThrow(new SyntaxError("Unexpected text `<`"));
		expect(() => {
			xm`<p class==></p>`;
		}).toThrow(new SyntaxError("Unexpected text `=></p>`"));
		expect(() => {
			xm`<p class=</p>`;
		}).toThrow(new SyntaxError("Unexpected text `</p>`"));
		expect(() => {
			xm`<p></p text>`;
		}).toThrow(new SyntaxError("Unexpected text `text`"));
		expect(() => {
			xm`<p></p text`;
		}).toThrow(new SyntaxError("Unexpected text `text`"));
		expect(() => {
			xm`<p><///p>`;
		}).toThrow(new SyntaxError("Unexpected text `/p`"));
		expect(() => {
			xm`<foo="bar">`;
		}).toThrow(new SyntaxError('Unexpected text `="`'));
		expect(() => {
			xm`<foo="\">`;
			// debatable, but whatever
		}).toThrow(new SyntaxError('Unexpected text `="\\"`'));
	});

	// TODO: more information
	test("invalid expressions", () => {
		const exp = {foo: "bar"};
		expect(() => {
			xm`<div ${exp}>`;
		}).toThrow(new SyntaxError("Unexpected expression"));
		expect(() => {
			xm`<${"foo"}${"bar"}>`;
		}).toThrow(new SyntaxError("Unexpected expression"));
		expect(() => {
			xm`<p class${undefined} />`;
		}).toThrow(new SyntaxError("Unexpected expression"));
	});

	test("unbalanced tags with expressions", () => {
		function C() {}
		function D() {}
		expect(() => {
			xm`<${C}>`;
		}).toThrow(new SyntaxError("Unmatched opening tag C()"));
		expect(() => {
			xm`</${C}>`;
		}).toThrow(new SyntaxError("Unmatched closing tag C()"));
		expect(() => {
			xm`<${C}></${D}>`;
		}).toThrow(new SyntaxError("Unmatched closing tag D(), expected C()"));
	});

	// TODO: Figure out a way to test special props and tags
});
