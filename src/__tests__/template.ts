import {c} from "../crank.js";
import {t} from "../template.js";

describe("happy path", () => {
	test("single elements", () => {
		expect(t`<p/>`).toEqual(c("p"));
		expect(t`<p />`).toEqual(c("p"));
		expect(t`<p></p>`).toEqual(c("p"));
		expect(t`<p>hello world</p>`).toEqual(c("p", null, "hello world"));
	});

	test("top-level strings", () => {
		expect(t`hello world`).toEqual(c("", null, "hello world"));
		expect(t`hello <p>world</p>`).toEqual(
			c("", null, ...["hello ", c("p", null, "world")]),
		);
		expect(t`<p>hello</p> world`).toEqual(
			c("", null, ...[c("p", null, "hello"), " world"]),
		);
		expect(t` hello<span> </span>world `).toEqual(
			c("", null, ...["hello", c("span", null, " "), "world"]),
		);
	});

	test("newlines and whitespace", () => {
		// TODO: Figure out how to test this without fricking editors/linters or
		// whatever getting in the way
		expect(t`
			<p/>
		`).toEqual(c("p"));
		expect(t`
			<span>Hello</span> \
			<span>World</span>
		`).toEqual(
			c("", null, ...[c("span", null, "Hello"), " ", c("span", null, "World")]),
		);
	});

	test("string props", () => {
		expect(t`<p class="foo" />`).toEqual(c("p", {class: "foo"}));
		expect(t`<p f="foo" b="bar" />`).toEqual(c("p", {f: "foo", b: "bar"}));
		expect(t`<p f="'foo'" b='"bar"' />`).toEqual(
			c("p", {f: "'foo'", b: '"bar"'}),
		);
	});

	test("string escapes", () => {
		expect(t`<p a="a\"a\"a\"a" b='b\'b\'b\'b' />`).toEqual(
			c("p", {a: 'a"a"a"a', b: "b'b'b'b"}),
		);
		expect(t`<p a="\\\"\'\a\b\\\"" />`).toEqual(c("p", {a: `\\"'ab\\"`}));
	});

	test("fragment shorthand", () => {
		expect(t`
			<p>
				Hello \
				<>world</>
			</p>
		`).toEqual(c("p", null, "Hello ", c("", null, "world")));
	});

	test("tag expressions", () => {
		const T1 = "tag1";
		const T2 = "tag2";
		expect(t`<${T1}>Hello world</${T1}>`).toEqual(c(T1, null, "Hello world"));
		expect(t`
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
		expect(t`
			<div>${ex1} ${ex2}</div>
		`).toEqual(c("div", null, "Hello", " ", "world"));
		expect(t`
			<div>${ex1}${ex2}</div>
		`).toEqual(c("div", null, "Hello", "world"));

		expect(t`
			<div>
				<span>${ex1} ${ex2}</span>
			</div>
		`).toEqual(c("div", null, c("span", null, "Hello", " ", "world")));

		expect(t`
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

		expect(t`
			${"Hello"} <span>world</span>
		`).toEqual(
			c("", null, "Hello", " ", c("span", null, "world")),
		);
	});

	test("shorthand boolean props", () => {
		expect(t`
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
		expect(t`
			<div class=${"greeting"} style = ${{color: "red"}}>
				Hello world
			</div>
		`).toEqual(c("div", {class: "greeting", style: {color: "red"}}, "Hello world"));
	});

	test("spread prop expressions", () => {
		const props = {
			style: "color: red;",
		};
		expect(t`<div class="greeting" ...${props}>Hello world</div>`).toEqual(
			c("div", {class: "greeting", style: "color: red;"}, "Hello world"),
		);
		expect(t`<div class="greeting" ... ${props}>Hello world</div>`).toEqual(
			c("div", {class: "greeting", style: "color: red;"}, "Hello world"),
		);
		expect(t`<div class="greeting" ...
		${props}>Hello world</div>`).toEqual(
			c("div", {class: "greeting", style: "color: red;"}, "Hello world"),
		);
	});

	test("asymmetric closing tags", () => {
		const Component = "C";
		expect(t`
			<${Component}>Hello world<//>
		`).toEqual(c(Component, null, "Hello world"));

		expect(t`
			<${Component}>
				Hello world
			<//Component>
		`).toEqual(c(Component, null, "Hello world"));
	});

	test("weird identifiers", () => {
		expect(t`
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
		expect(t`
			<div>
				<!--<span>Hello</span>--><span>world</span>
			</div>
		`).toEqual(c("div", null, c("span", null, "world")));

		expect(t`
			<div>
				<!--<span>Hello</span>--> <!--<span>world</span>-->
			</div>
		`).toEqual(c("div", null, " "));

		expect(t`
			<div>
				<!--
				<${"C"} value=${true} />
				-->
				Hello<!-- world-->
			</div>
		`).toEqual(c("div", null, "Hello"));
	});

	test("string expressions", () => {
		expect(t`
			<p class="${undefined} ${null} ${"a"}-${{a: "1"}}-" />
		`).toEqual(c("p", {class: "  a-[object Object]-"}));
		expect(t`
			<p class="a${1}\${2}\a${3}\"" />
		`).toEqual(c("p", {class: 'a1${2}a3"'}));
		// Don’t think too hard about escaping.
		expect(t`
			<p class="a\\${1}\\${2}\\\a${3}\"" />
		`).toEqual(c("p", {class: 'a\\1\\2\\a3"'}));

		expect(t`
			<p class="a${true}${false}${null}${undefined}b" />
		`).toEqual(c("p", {class: "ab"}));
	});
});

describe("sad path", () => {
	test("unbalanced tags", () => {
		expect(() => {
			t`<span>`;
		}).toThrow(new SyntaxError('Unmatched opening tag "span"'));
		expect(() => {
			t`</span>`;
		}).toThrow(new SyntaxError('Unmatched closing tag "span"'));
		expect(() => {
			t`<div>uhhh</span>`;
		}).toThrow(
			new SyntaxError('Mismatched closing tag "span" for opening tag "div"'),
		);
	});

	test("invalid characters", () => {
		expect(() => {
			t`<<>`;
		}).toThrow(new SyntaxError("Unexpected text `<`"));
		expect(() => {
			t`<p<></p>`;
		}).toThrow(new SyntaxError("Unexpected text `<`"));
		expect(() => {
			t`<p><</p>`;
		}).toThrow(new SyntaxError("Unexpected text `</`"));
		expect(() => {
			t`<p</p>`;
		}).toThrow(new SyntaxError("Unexpected text `</`"));
		expect(() => {
			t`<p ///></p>`;
		}).toThrow(new SyntaxError("Unexpected text `//`"));
		expect(() => {
			t`<p /p></p>`;
			// debatable, but whatever
		}).toThrow(new SyntaxError("Unexpected text `/`"));
		expect(() => {
			t`<e p p<></e>`;
		}).toThrow(new SyntaxError("Unexpected text `<`"));
		expect(() => {
			t`<p class</p>`;
		}).toThrow(new SyntaxError("Unexpected text `</`"));
		expect(() => {
			t`<p<`;
		}).toThrow(new SyntaxError("Unexpected text `<`"));
		expect(() => {
			t`<p class=<`;
		}).toThrow(new SyntaxError("Unexpected text `<`"));
		expect(() => {
			t`<p class==></p>`;
		}).toThrow(new SyntaxError("Unexpected text `=></p>`"));
		expect(() => {
			t`<p class=</p>`;
		}).toThrow(new SyntaxError("Unexpected text `</p>`"));
		expect(() => {
			t`<p></p text>`;
		}).toThrow(new SyntaxError("Unexpected text `text`"));
		expect(() => {
			t`<p></p text`;
		}).toThrow(new SyntaxError("Unexpected text `text`"));
		expect(() => {
			t`<p><///p>`;
		}).toThrow(new SyntaxError("Unexpected text `/p`"));
		expect(() => {
			t`<foo="bar">`;
		}).toThrow(new SyntaxError('Unexpected text `="`'));
		expect(() => {
			t`<foo="\">`;
			// debatable, but whatever
		}).toThrow(new SyntaxError('Unexpected text `="\\"`'));
	});

	test("invalid expressions", () => {
		const exp = {foo: "bar"};
		expect(() => {
			t`<div ${exp}>`;
		}).toThrow(new SyntaxError('Unexpected expression ${{"foo":"bar"}}'));
		expect(() => {
			t`<${"foo"}${"bar"}>`;
		}).toThrow(new SyntaxError('Unexpected expression ${"bar"}'));
		expect(() => {
			t`<p class${undefined} />`;
		}).toThrow(new SyntaxError("Unexpected expression ${undefined}"));
	});

	// TODO: Figure out a way to test special props and tags
});
