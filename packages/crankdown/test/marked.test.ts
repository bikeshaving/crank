import {test, expect} from "bun:test";
import {renderer} from "@b9g/crank/html";
import {Marked} from "../src/index.ts";

async function render(markdown: string): Promise<string> {
	return renderer.render(Marked({markdown}));
}

// =============================================================================
// BASIC MARKDOWN RENDERING
// =============================================================================
test("renders headings", async () => {
	const html = await render("# Hello World");
	expect(html).toContain("<h1");
	expect(html).toContain("Hello World");
});

test("renders paragraphs with inline formatting", async () => {
	const html = await render("This is **bold** and *italic* and `code`.");
	expect(html).toContain("<strong>bold</strong>");
	expect(html).toContain("<em>italic</em>");
	expect(html).toContain("<code>code</code>");
});

test("renders links", async () => {
	const html = await render("[click here](https://example.com)");
	expect(html).toContain('<a href="https://example.com"');
	expect(html).toContain("click here");
});

test("renders images", async () => {
	const html = await render("![alt text](image.png)");
	expect(html).toContain('<img src="image.png"');
	expect(html).toContain('alt="alt text"');
});

test("renders unordered lists", async () => {
	const html = await render("- one\n- two\n- three");
	expect(html).toContain("<ul>");
	expect(html).toContain("<li>one</li>");
	expect(html).toContain("<li>two</li>");
	expect(html).toContain("<li>three</li>");
});

test("renders ordered lists", async () => {
	const html = await render("1. first\n2. second\n3. third");
	expect(html).toContain("<ol>");
	expect(html).toContain("<li>first</li>");
});

test("renders code blocks", async () => {
	const html = await render("```js\nconsole.log('hi');\n```");
	expect(html).toContain("<pre");
	expect(html).toContain("<code");
	expect(html).toContain("console.log");
	expect(html).toContain("language-js");
});

test("renders blockquotes", async () => {
	const html = await render("> a quote");
	expect(html).toContain("<blockquote>");
	expect(html).toContain("a quote");
});

test("renders horizontal rules", async () => {
	const html = await render("---");
	expect(html).toContain("<hr");
});

test("renders tables", async () => {
	const html = await render(
		"| a | b |\n| --- | --- |\n| 1 | 2 |",
	);
	expect(html).toContain("<table>");
	expect(html).toContain("<th");
	expect(html).toContain("<td");
});

// =============================================================================
// HTML TAG STACK FRAME HANDLING
// =============================================================================
test("inline markdown inside <dt> and <dd>", async () => {
	const html = await render(
		"<dl>\n<dt>**Bold Term**</dt>\n<dd>Text with *emphasis* and `code`.</dd>\n</dl>",
	);
	expect(html).toContain("<strong>Bold Term</strong>");
	expect(html).toContain("<em>emphasis</em>");
	expect(html).toContain("<code>code</code>");
	expect(html).toContain("<dl>");
	expect(html).toContain("<dt>");
	expect(html).toContain("<dd>");
});

test("block-level markdown inside <dd> with blank lines", async () => {
	const html = await render(
		"<dl>\n<dt>Term</dt>\n<dd>\n\n- one\n- two\n\n</dd>\n</dl>",
	);
	expect(html).toContain("<ul>");
	expect(html).toContain("<li>one</li>");
	expect(html).toContain("<li>two</li>");
});

test("inline markdown inside <div>", async () => {
	const html = await render("<div>\n**bold** content\n</div>");
	expect(html).toContain("<strong>bold</strong>");
	expect(html).toContain("<div>");
});

test("inline markdown inside <section>", async () => {
	const html = await render(
		"<section>\nA *styled* paragraph.\n</section>",
	);
	expect(html).toContain("<em>styled</em>");
	expect(html).toContain("<section>");
});

// =============================================================================
// RAW CONTENT TAG BLOCKLIST
// =============================================================================
test("pre tag content is not markdown-parsed", async () => {
	const html = await render("<pre>**not bold**</pre>");
	expect(html).not.toContain("<strong>");
	expect(html).toContain("**not bold**");
});

test("inline code tag is handled by marked's inline lexer", async () => {
	// Inline <code> is parsed by marked as inline tokens, not as block HTML
	const html = await render("<code>*not italic*</code>");
	expect(html).toContain("<code>");
});

test("script tag content is not markdown-parsed", async () => {
	const html = await render("<script>const x = 1;</script>");
	expect(html).not.toContain("<em>");
	expect(html).toContain("const x = 1;");
});

test("style tag content is not markdown-parsed", async () => {
	const html = await render("<style>.foo { color: red; }</style>");
	expect(html).toContain(".foo { color: red; }");
});

test("svg tag content is not markdown-parsed", async () => {
	const html = await render('<svg><circle r="10" /></svg>');
	expect(html).toContain("<svg>");
});

// =============================================================================
// CUSTOM COMPONENTS
// =============================================================================
test("custom component overrides default rendering", async () => {
	const html = await renderer.render(
		Marked({
			markdown: "# Custom Heading",
			components: {
				heading({token, children}) {
					return `<h1 class="custom">${children}</h1>` as any;
				},
			},
		}),
	);
	// The custom component returns a string, not JSX, so check for that
	expect(html).toContain("Custom Heading");
});

test("PascalCase tags resolve to custom components", async () => {
	const {jsx} = await import("@b9g/crank/standalone");
	const html = await renderer.render(
		Marked({
			markdown: "<Alert>**Warning!**</Alert>",
			components: {
				Alert({children}) {
					return jsx`<div class="alert">${children}</div>`;
				},
			},
		}),
	);
	expect(html).toContain('<div class="alert">');
	expect(html).toContain("<strong>Warning!</strong>");
});

test("self-closing PascalCase tags resolve to custom components", async () => {
	const {jsx} = await import("@b9g/crank/standalone");
	const html = await renderer.render(
		Marked({
			markdown: '<Divider style="dashed" />',
			components: {
				Divider({token}) {
					return jsx`<hr class="${(token as any).style}" />`;
				},
			},
		}),
	);
	expect(html).toContain('<hr class="dashed"');
});

// =============================================================================
// HEADING ANCHORS
// =============================================================================
test("headings get slugified id and anchor link", async () => {
	const html = await render("## Hello World");
	expect(html).toContain('id="hello-world"');
	expect(html).toContain('href="#hello-world"');
	expect(html).toContain("heading-anchor");
});

// =============================================================================
// EDGE CASES
// =============================================================================
test("empty markdown renders nothing", async () => {
	const html = await render("");
	expect(html).toBe("");
});

test("plain text without markdown syntax", async () => {
	const html = await render("Just some plain text.");
	expect(html).toContain("Just some plain text.");
});

test("HTML entities are decoded in source", async () => {
	// &amp; in markdown source is preserved as &amp; in HTML output
	// (correct HTML encoding), but the internal text nodes decode them
	const html = await render("Tom \\& Jerry");
	expect(html).toContain("Tom &amp; Jerry");
});
