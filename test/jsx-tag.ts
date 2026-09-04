import {describe, test, beforeEach, afterEach, expect} from "@b9g/libuild/test";
import {createElement} from "../src/crank.js";
import {jsx} from "../src/jsx-tag.js";
import {renderer} from "../src/dom.js";

describe("jsx", () => {
	test("single elements", () => {
		expect(jsx`<p/>`).toEqual(createElement("p"));
		expect(jsx`<p />`).toEqual(createElement("p"));
		expect(jsx`<p></p>`).toEqual(createElement("p"));
		expect(jsx`<p>hello world</p>`).toEqual(
			createElement("p", null, "hello world"),
		);
	});

	test("top-level strings", () => {
		expect(jsx`hello world`).toEqual(createElement("", null, "hello world"));
		expect(jsx`hello <p>world</p>`).toEqual(
			createElement("", null, ...["hello ", createElement("p", null, "world")]),
		);
		expect(jsx`<p>hello</p> world`).toEqual(
			createElement("", null, ...[createElement("p", null, "hello"), " world"]),
		);
		expect(jsx` hello<span> </span>world `).toEqual(
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
		expect(jsx`
		<p/>
	`).toEqual(createElement("p"));
		expect(jsx`
		<span>Hello</span> \
		<span>World</span>
	`).toEqual(
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

	test("text-text newlines are preserved as a newline (#359)", () => {
		// A newline between two text runs is preserved as a single newline. Unlike
		// JSX, which collapses it to a space, the template has no formatter reflowing
		// it, so the line break is the author's intent: it renders as a space in
		// normal flow and as a real line break in a `<pre>`.
		expect(jsx`<p>alpha
beta</p>`).toEqual(createElement("p", null, "alpha\n", "beta"));
		// Everything between two text runs is preserved verbatim: the blank line
		// stays two newlines, and the indentation before `three` is kept.
		expect(jsx`<p>one
two

   three</p>`).toEqual(
			createElement("p", null, "one\n", "two\n\n   ", "three"),
		);
		// A newline adjacent to an element is still stripped as layout: only the
		// text-text break is kept.
		expect(jsx`<p>alpha
<b>x</b>
beta</p>`).toEqual(
			createElement("p", null, "alpha", createElement("b", null, "x"), "beta"),
		);
	});

	test("preserves significant whitespace verbatim (diverges from JSX collapse)", () => {
		// Interior spaces within a line are preserved, not collapsed.
		expect(jsx`<p>a   b</p>`).toEqual(createElement("p", null, "a   b"));
		// A newline before an expression is stripped as layout — the expression
		// boundary is structural, like an element.
		expect(jsx`<p>a
${"X"}</p>`).toEqual(createElement("p", null, "a", "X"));
		// Leading whitespace on the first line of a text run is preserved (it is not
		// indentation following a newline); the break to the next line is kept.
		expect(jsx`<p>  Hello
World</p>`).toEqual(createElement("p", null, "  Hello\n", "World"));
		// Whitespace-only text between elements is preserved on a single line ...
		expect(jsx`<p><b>x</b>   <i>y</i></p>`).toEqual(
			createElement(
				"p",
				null,
				createElement("b", null, "x"),
				"   ",
				createElement("i", null, "y"),
			),
		);
		// ... and removed entirely when it spans a newline.
		expect(jsx`<p><b>x</b>
<i>y</i></p>`).toEqual(
			createElement(
				"p",
				null,
				createElement("b", null, "x"),
				createElement("i", null, "y"),
			),
		);
	});

	test("string props", () => {
		expect(jsx`<p class="foo" />`).toEqual(createElement("p", {class: "foo"}));
		expect(jsx`<p f="foo" b="bar" />`).toEqual(
			createElement("p", {f: "foo", b: "bar"}),
		);
		expect(jsx`<p f="'foo'" b='"bar"' />`).toEqual(
			createElement("p", {f: "'foo'", b: '"bar"'}),
		);
	});

	test("string escapes", () => {
		expect(jsx`<p a="a\"a\"a\"a" b='b\'b\'b\'b' />`).toEqual(
			createElement("p", {a: 'a"a"a"a', b: "b'b'b'b"}),
		);
		expect(jsx`<p a="\\\"\'\a\b\\\"" />`).toEqual(
			createElement("p", {a: `\\"'a\b\\"`}),
		);
		expect(jsx`<p a="hello\r\nworld" />`).toEqual(
			createElement("p", {a: "hello\r\nworld"}),
		);
	});

	test("fragment shorthand", () => {
		expect(jsx`
		<p>
			Hello \
			<>world</>
		</p>
	`).toEqual(
			createElement("p", null, "Hello ", createElement("", null, "world")),
		);
	});

	test("tag expressions", () => {
		const T1 = "tag1";
		const T2 = "tag2";
		expect(jsx`<${T1}>Hello world</${T1}>`).toEqual(
			createElement(T1, null, "Hello world"),
		);
		expect(jsx`
		<${T1}>
			<${T2}>
				Hello world
			</${T2}>
		</${T1}>
	`).toEqual(createElement(T1, null, createElement(T2, null, "Hello world")));
	});

	test("children expressions", () => {
		const ex1 = "Hello";
		const ex2 = "world";
		expect(jsx`
		<div>${ex1} ${ex2}</div>
	`).toEqual(createElement("div", null, "Hello", " ", "world"));
		expect(jsx`
		<div>${ex1}${ex2}</div>
	`).toEqual(createElement("div", null, "Hello", "world"));

		expect(jsx`
		<div>
			<span>${ex1} ${ex2}</span>
		</div>
	`).toEqual(
			createElement(
				"div",
				null,
				createElement("span", null, "Hello", " ", "world"),
			),
		);

		expect(jsx`
		<div><span>${null} ${undefined} ${true} ${false} ${1} ${2}</span></div>
	`).toEqual(
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

		expect(jsx`
		${"Hello"} <span>world</span>
	`).toEqual(
			createElement(
				"",
				null,
				"Hello",
				" ",
				createElement("span", null, "world"),
			),
		);
	});

	test("shorthand boolean props", () => {
		expect(jsx`
		<label><input type="checkbox" checked name="attendance" disabled />Present</label>
	`).toEqual(
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
		expect(jsx`
		<div class=${"greeting"} style = ${{color: "red"}}>
			Hello world
		</div>
	`).toEqual(
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
		expect(jsx`<div class="greeting" ...${props}>Hello world</div>`).toEqual(
			createElement(
				"div",
				{class: "greeting", style: "color: red;"},
				"Hello world",
			),
		);
		expect(jsx`<div class="greeting" ... ${props}>Hello world</div>`).toEqual(
			createElement(
				"div",
				{class: "greeting", style: "color: red;"},
				"Hello world",
			),
		);
		expect(jsx`<div class="greeting" ...
	${props}>Hello world</div>`).toEqual(
			createElement(
				"div",
				{class: "greeting", style: "color: red;"},
				"Hello world",
			),
		);
	});

	test("asymmetric closing tags", () => {
		const Component = "C";
		expect(jsx`
		<${Component}>Hello world<//>
	`).toEqual(createElement(Component, null, "Hello world"));

		expect(jsx`
		<${Component}>
			Hello world
		<//Component>
	`).toEqual(createElement(Component, null, "Hello world"));
	});

	test("weird identifiers", () => {
		expect(jsx`
		<$a $b$ _c>
			<-custom-element -prop="foo" _-_="bar" />
			<__ key=${1}/>
		</$a>
	`).toEqual(
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
		expect(jsx`
		<div>
			<!--<span>Hello</span>--><span>world</span>
		</div>
	`).toEqual(createElement("div", null, createElement("span", null, "world")));

		expect(jsx`
		<div>
			<!--<span>Hello</span>--> <!--<span>world</span>-->
		</div>
	`).toEqual(createElement("div", null, " "));
	});

	test("comment expressions", () => {
		expect(jsx`
		<div>
			<!--
			<${"C"} value=${true} />
			-->
			Hello<!-- world-->
		</div>
	`).toEqual(createElement("div", null, "Hello"));
	});

	test("prop string expressions", () => {
		expect(jsx`
		<p class="${undefined} ${null} ${"a"}-${{a: "1"}}-" />
	`).toEqual(createElement("p", {class: "  a-[object Object]-"}));
		expect(jsx`
		<p class="a${1}\${2}\a${3}\"" />
	`).toEqual(createElement("p", {class: 'a1${2}a3"'}));
		// Don’t think too hard about escaping.
		expect(jsx`
		<p class="a\\${1}\\${2}\\\a${3}\"" />
	`).toEqual(createElement("p", {class: 'a\\1\\2\\a3"'}));
		expect(jsx`
		<p class="a${true}${false}${null}${undefined}b" />
	`).toEqual(createElement("p", {class: "ab"}));
	});

	test("unbalanced tags", () => {
		expect(() => {
			jsx`<span>`;
		}).toThrow('Unmatched opening tag "span"');
		expect(() => {
			jsx`</span>`;
		}).toThrow('Unmatched closing tag "span"');
		expect(() => {
			jsx`<div>uhhh</span>`;
		}).toThrow('Unmatched closing tag "span", expected "div"');
	});

	test("invalid characters", () => {
		expect(() => {
			jsx`<<>`;
		}).toThrow("Unexpected text `<`");
		expect(() => {
			jsx`<p<></p>`;
		}).toThrow("Unexpected text `<`");
		expect(() => {
			jsx`<p><</p>`;
		}).toThrow("Unexpected text `</`");
		expect(() => {
			jsx`<p</p>`;
		}).toThrow("Unexpected text `</`");
		expect(() => {
			jsx`<p ///></p>`;
		}).toThrow("Unexpected text `//`");
		expect(() => {
			jsx`<p /p></p>`;
			// debatable, but whatever
		}).toThrow("Unexpected text `/`");
		expect(() => {
			jsx`<e p p<></e>`;
		}).toThrow("Unexpected text `<`");
		expect(() => {
			jsx`<p class</p>`;
		}).toThrow("Unexpected text `</`");
		expect(() => {
			jsx`<p<`;
		}).toThrow("Unexpected text `<`");
		expect(() => {
			jsx`<p class=<`;
		}).toThrow("Unexpected text `<`");
		expect(() => {
			jsx`<p class==></p>`;
		}).toThrow("Unexpected text `=></p>`");
		expect(() => {
			jsx`<p class=</p>`;
		}).toThrow("Unexpected text `</p>`");
		expect(() => {
			jsx`<p></p text>`;
		}).toThrow("Unexpected text `text`");
		expect(() => {
			jsx`<p></p text`;
		}).toThrow("Unexpected text `text`");
		expect(() => {
			jsx`<p><///p>`;
		}).toThrow("Unexpected text `/p`");
		expect(() => {
			jsx`<foo="bar">`;
		}).toThrow('Unexpected text `="`');
		expect(() => {
			jsx`<foo="\">`;
			// debatable, but whatever
		}).toThrow('Unexpected text `="\\"`');
	});

	// TODO: more information
	test("invalid expressions", () => {
		const exp = {foo: "bar"};
		expect(() => {
			jsx`<div ${exp}>`;
		}).toThrow("Unexpected expression");
		expect(() => {
			jsx`<${"foo"}${"bar"}>`;
		}).toThrow("Unexpected expression");
		expect(() => {
			jsx`<p class${undefined} />`;
		}).toThrow("Unexpected expression");
	});

	test("unbalanced tags with expressions", () => {
		function C() {}
		function D() {}
		expect(() => {
			jsx`<${C}>`;
		}).toThrow("Unmatched opening tag C()");
		expect(() => {
			jsx`</${C}>`;
		}).toThrow("Unmatched closing tag C()");
		expect(() => {
			jsx`<${C}></${D}>`;
		}).toThrow("Unmatched closing tag D(), expected C()");
	});

	test("unicode characters", () => {
		// Test that Unicode characters are preserved, not escaped
		expect(jsx`<span>–</span>`).toEqual(
			// en dash (U+2013)
			createElement("span", null, "–"),
		);
		expect(jsx`<span>…</span>`).toEqual(
			// ellipsis (U+2026)
			createElement("span", null, "…"),
		);

		// Test Unicode with template expressions
		const date = "January 1, 2024";
		const result3 = jsx`<span>– Published ${date}</span>`;
		const expected3 = createElement("span", null, "– Published ", date);
		expect(result3).toEqual(expected3);

		const url = "/blog/post";
		const result5 = jsx`<a href=${url}>Read more…</a>`;
		const expected5 = createElement("a", {href: url}, "Read more…");
		expect(result5).toEqual(expected5);

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

		// Check that the Unicode dash is preserved in the nested span component
		// Based on the actual structure: complexResult.props.children[2] is the span
		const spanChild = complexResult.props.children[2];

		// Verify the Unicode em dash is preserved
		expect(spanChild.props.children[0]).toEqual("– Published ");

		// Test that cache key generation preserves Unicode
		const spans = {raw: ["<span>– Published ", "</span>"]};
		const cacheKey = JSON.stringify(spans.raw);
		expect(cacheKey.includes("– Published")).toBeTruthy();
	});

	test("error messages include context", () => {
		try {
			jsx`<div>\n  </span>`;
			throw new Error("should have thrown");
		} catch (e: any) {
			expect(e).toBeInstanceOf(SyntaxError);
			expect(e.message.includes("^")).toBeTruthy() /* includes caret pointer */;
			expect(
				e.message.includes("|"),
			).toBeTruthy() /* includes context gutter */;
		}
	});

	test("multiline error messages include context", () => {
		try {
			jsx`
			<div>
				</span>
			</div>
		`;
			throw new Error("should have thrown");
		} catch (e: any) {
			expect(e).toBeInstanceOf(SyntaxError);
			expect(
				e.message.includes("Unmatched closing tag"),
			).toBeTruthy() /* has base message */;
			expect(e.message.includes("^")).toBeTruthy() /* includes caret pointer */;
			expect(
				e.message.includes("|"),
			).toBeTruthy() /* includes context gutter */;
		}
	});

	test("namespaced prop names", () => {
		expect(jsx`<div attr:foo="bar" />`).toEqual(
			createElement("div", {"attr:foo": "bar"}),
		);
		expect(jsx`<input prop:value="x" />`).toEqual(
			createElement("input", {"prop:value": "x"}),
		);
		expect(jsx`<use xlink:href="#icon" />`).toEqual(
			createElement("use", {"xlink:href": "#icon"}),
		);
		expect(jsx`<svg xmlns:xlink="http://www.w3.org/1999/xlink" />`).toEqual(
			createElement("svg", {
				"xmlns:xlink": "http://www.w3.org/1999/xlink",
			}),
		);
		expect(jsx`<div attr:foo=${"bar"} />`).toEqual(
			createElement("div", {"attr:foo": "bar"}),
		);
	});

	test("namespaced tag names", () => {
		expect(jsx`<svg:circle r="5" />`).toEqual(
			createElement("svg:circle", {r: "5"}),
		);
	});

	test("colons in text and attribute values", () => {
		expect(jsx`<p>ratio 3:1</p>`).toEqual(
			createElement("p", null, "ratio 3:1"),
		);
		expect(jsx`<div style="color: red" href="https://example.com" />`).toEqual(
			createElement("div", {
				style: "color: red",
				href: "https://example.com",
			}),
		);
	});

	test("invalid namespaced names", () => {
		expect(() => {
			jsx`<div :foo="1" />`;
		}).toThrow("Invalid prop name `:foo`");
		expect(() => {
			jsx`<div foo:="1" />`;
		}).toThrow("Invalid prop name `foo:`");
		expect(() => {
			jsx`<:foo />`;
		}).toThrow("Invalid tag name `:foo`");
		expect(() => {
			jsx`<foo: />`;
		}).toThrow("Invalid tag name `foo:`");
		expect(() => {
			jsx`<div a:b:c="1" />`;
		}).toThrow("Invalid prop name `a:b:c`");
	});
});

describe("jsx static caching", () => {
	beforeEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	afterEach(() => {
		renderer.render(null, document.body);
		document.body.innerHTML = "";
	});

	test("static templates return the same element", () => {
		const el1 = jsx`<div class="a"><span>hello</span></div>`;
		const el2 = jsx`<div class="a"><span>hello</span></div>`;
		expect(el1).toBe(el2);
	});

	test("static subtrees are shared between calls", () => {
		const el1 = jsx`<div>${1}<span class="s">static</span></div>`;
		const el2 = jsx`<div>${2}<span class="s">static</span></div>`;
		expect(el1).not.toBe(el2);
		expect((el1.props.children as any)[0]).toEqual(1);
		expect((el2.props.children as any)[0]).toEqual(2);
		expect((el1.props.children as any)[1]).toBe((el2.props.children as any)[1]);
	});

	test("dynamic props are not cached", () => {
		const el1 = jsx`<div class=${"a"} />`;
		const el2 = jsx`<div class=${"b"} />`;
		expect(el1).not.toBe(el2);
		expect(el1.props.class).toEqual("a");
		expect(el2.props.class).toEqual("b");
	});

	test("interpolated prop strings are not cached", () => {
		const el1 = jsx`<div class="a ${"b"}" />`;
		const el2 = jsx`<div class="a ${"c"}" />`;
		expect(el1).not.toBe(el2);
		expect(el1.props.class).toEqual("a b");
		expect(el2.props.class).toEqual("a c");
	});

	test("spread props are not cached", () => {
		const el1 = jsx`<div ...${{class: "a"}} />`;
		const el2 = jsx`<div ...${{class: "b"}} />`;
		expect(el1).not.toBe(el2);
		expect(el1.props.class).toEqual("a");
		expect(el2.props.class).toEqual("b");
	});

	test("comment expressions do not prevent caching", () => {
		const el1 = jsx`<div><!-- ${1} --></div>`;
		const el2 = jsx`<div><!-- ${2} --></div>`;
		expect(el1).toBe(el2);
	});

	test("static templates are skipped on re-render", () => {
		renderer.render(jsx`<div class="a">hello</div>`, document.body);
		const div = document.body.firstChild as HTMLElement;
		expect(div.className).toEqual("a");
		div.setAttribute("class", "changed");
		renderer.render(jsx`<div class="a">hello</div>`, document.body);
		expect(document.body.firstChild).toBe(div);
		expect(div.getAttribute("class")).toEqual("changed");
	});

	test("different templates still patch", () => {
		renderer.render(jsx`<div class="a">hello</div>`, document.body);
		const div = document.body.firstChild as HTMLElement;
		renderer.render(jsx`<div class="b">hello</div>`, document.body);
		expect(document.body.firstChild).toBe(div);
		expect(div.className).toEqual("b");
	});

	test("static subtrees render correctly inside dynamic templates", () => {
		for (const i of [1, 2]) {
			renderer.render(
				jsx`<div><p>${i}</p><span class="s">static</span></div>`,
				document.body,
			);
			expect(document.body.innerHTML).toEqual(
				`<div><p>${i}</p><span class="s">static</span></div>`,
			);
		}
	});

	test("the same cached element renders at multiple positions", () => {
		const items = [1, 2, 3].map(() => jsx`<li class="s">item</li>`);
		expect(items[0]).toBe(items[1]);
		expect(items[1]).toBe(items[2]);
		for (let i = 0; i < 2; i++) {
			renderer.render(jsx`<ul>${items}</ul>`, document.body);
			expect(document.body.innerHTML).toEqual(
				`<ul><li class="s">item</li><li class="s">item</li><li class="s">item</li></ul>`,
			);
		}
	});

	test("cached elements can be unmounted and remounted", () => {
		renderer.render(jsx`<div class="a">hello</div>`, document.body);
		renderer.render(null, document.body);
		expect(document.body.innerHTML).toEqual("");
		renderer.render(jsx`<div class="a">hello</div>`, document.body);
		expect(document.body.innerHTML).toEqual(`<div class="a">hello</div>`);
	});

	test("cached elements render into multiple roots", () => {
		const root1 = document.createElement("div");
		const root2 = document.createElement("div");
		document.body.appendChild(root1);
		document.body.appendChild(root2);
		try {
			renderer.render(jsx`<p class="s">shared</p>`, root1);
			renderer.render(jsx`<p class="s">shared</p>`, root2);
			expect(root1.innerHTML).toEqual(`<p class="s">shared</p>`);
			expect(root2.innerHTML).toEqual(`<p class="s">shared</p>`);
			expect(root1.firstChild).not.toBe(root2.firstChild);
			renderer.render(jsx`<p class="s">shared</p>`, root1);
			renderer.render(jsx`<p class="s">shared</p>`, root2);
			expect(root1.innerHTML).toEqual(`<p class="s">shared</p>`);
			expect(root2.innerHTML).toEqual(`<p class="s">shared</p>`);
		} finally {
			renderer.render(null, root1);
			renderer.render(null, root2);
			root1.remove();
			root2.remove();
		}
	});
});
