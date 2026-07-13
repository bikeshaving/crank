import {jsx, Raw} from "@b9g/crank/standalone";
import type {Children, Component, Element} from "@b9g/crank";
import {marked} from "marked";
import type {Token, Tokens} from "marked";
// TODO: This is probably a component
/*
Token type definitions from Marked
interface Space {
 type: 'space';
 raw: string;
}

interface Code {
 type: 'code';
 raw: string;
 codeBlockStyle?: 'indented' | undefined;
 lang?: string | undefined;
 text: string;
}

interface Heading {
 type: 'heading';
 raw: string;
 depth: number;
 text: string;
 tokens: Token[];
}

interface Table {
 type: 'table';
 raw: string;
 align: Array<'center' | 'left' | 'right' | null>;
 header: TableCell[];
 rows: TableCell[][];
}

interface TableCell {
 text: string;
 tokens: Token[];
}

interface Hr {
 type: 'hr';
 raw: string;
}

interface Blockquote {
 type: 'blockquote';
 raw: string;
 text: string;
 tokens: Token[];
}

interface List {
 type: 'list';
 raw: string;
 ordered: boolean;
 start: number | '';
 loose: boolean;
 items: ListItem[];
}

interface ListItem {
 type: 'list_item';
 raw: string;
 task: boolean;
 checked?: boolean | undefined;
 loose: boolean;
 text: string;
 tokens: Token[];
}

interface Paragraph {
 type: 'paragraph';
 raw: string;
 pre?: boolean | undefined;
 text: string;
 tokens: Token[];
}

interface HTML {
 type: 'html';
 raw: string;
 pre: boolean;
 text: string;
}

interface Text {
 type: 'text';
 raw: string;
 text: string;
 tokens?: Token[] | undefined;
}

interface Def {
 type: 'def';
 raw: string;
 tag: string;
 href: string;
 title: string;
}

interface Escape {
 type: 'escape';
 raw: string;
 text: string;
}

interface Tag {
 type: 'text' | 'html';
 raw: string;
 inLink: boolean;
 inRawBlock: boolean;
 text: string;
}

interface Link {
 type: 'link';
 raw: string;
 href: string;
 title: string;
 text: string;
 tokens: Token[];
}

interface Image {
 type: 'image';
 raw: string;
 href: string;
 title: string;
 text: string;
}

interface Strong {
 type: 'strong';
 raw: string;
 text: string;
 tokens: Token[];
}

interface Em {
 type: 'em';
 raw: string;
 text: string;
 tokens: Token[];
}

interface Codespan {
 type: 'codespan';
 raw: string;
 text: string;
}

interface Br {
 type: 'br';
 raw: string;
}

interface Del {
 type: 'del';
 raw: string;
 text: string;
 tokens: Token[];
}

interface Generic {
 [index: string]: any;
 type: string;
 raw: string;
 tokens?: Token[] | undefined;
}
*/

export interface Checkmark {
	type: "checkmark";
	raw: string;
	checked: boolean;
}

export interface TokenProps {
	token: Token;
	rootProps: MarkedProps;
	children: Children;
	[key: string]: unknown;
}

// Generate a URL-friendly slug from text
function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

export const defaultComponents: Record<string, Component<TokenProps>> = {
	space: () => null,

	code({token}) {
		const {text, lang} = token as Tokens.Code;
		const langClassName = lang ? `language-${lang}` : null;
		return jsx`
			<pre class=${langClassName}>
				<code class=${langClassName}>${text}</code>
			</pre>
		`;
	},

	heading({token, children}) {
		const {depth, text} = token as Tokens.Heading;
		const tag = `h${depth}`;
		const id = slugify(text);
		return jsx`<${tag} id=${id}>${children} <a class="heading-anchor" href="#${id}">#</a><//>`;
	},

	table({token, rootProps}) {
		const {align, header, rows} = token as Tokens.Table;
		return jsx`
			<table>
				<thead>
					<tr>
						${header.map(
							(cell, index) => jsx`
							<th style=${align[index] ? `text-align: ${align[index]}` : undefined}>
								${build(cell.tokens, rootProps)}
							</th>
						`,
						)}
					</tr>
				</thead>
				<tbody>
					${rows.map(
						(row) => jsx`
						<tr>
							${row.map(
								(cell, cellIndex) => jsx`
								<td style=${align[cellIndex] ? `text-align: ${align[cellIndex]}` : undefined}>
									${build(cell.tokens, rootProps)}
								</td>
							`,
							)}
						</tr>
					`,
					)}
				</tbody>
			</table>
		`;
	},

	hr: () => jsx`<hr />`,

	blockquote({children}) {
		return jsx`<blockquote>${children}</blockquote>`;
	},

	list({token, children}) {
		const {ordered, start} = token as Tokens.List;
		const tag = ordered ? "ol" : "ul";

		return jsx`
			<${tag} start=${start && start !== 1 ? start : null}>${children}<//>
		`;
	},

	list_item({children}) {
		return jsx`<li>${children}</li>`;
	},

	checkmark({token}) {
		const {checked} = token as unknown as Checkmark;
		return jsx`<input checked=${checked} disabled="" type="checkbox" />`;
	},

	paragraph({children}) {
		return jsx`<p>${children}</p>`;
	},

	// html tokens are handled by parseJSX in build(), not through the component
	// system. PascalCase tags resolve against the components map; everything else
	// passes through as Raw markup.

	link({token, children}) {
		const {href, title} = token as Tokens.Link;
		// TODO: url sanitization?
		return jsx`
			<a href=${href} title=${title}>
				${children}
			</a>
		`;
	},

	image({token}) {
		const {href, title, text} = token as Tokens.Image;
		return jsx`<img src=${href} title=${title} alt=${text} />`;
	},

	strong({children}) {
		return jsx`<strong>${children}</strong>`;
	},

	em({children}) {
		return jsx`<em>${children}</em>`;
	},

	codespan({token}) {
		const {text} = token as Tokens.Codespan;
		return jsx`<code>${text}</code>`;
	},

	br: () => jsx`<br />`,

	// TODO: type: 'del';
};

interface BuildProps {
	components?: Record<string, Component<TokenProps>> | undefined;
	[key: string]: unknown;
}

// HTML entity decoder
function decodeHTMLEntities(text: string): string {
	const entities: Record<string, string> = {
		"&amp;": "&",
		"&lt;": "<",
		"&gt;": ">",
		"&quot;": '"',
		"&#39;": "'",
		"&apos;": "'",
	};

	return text.replace(
		/&(?:amp|lt|gt|quot|#39|apos);/g,
		(match) => entities[match] || match,
	);
}

// This function is called recursively to turn an array of tokens into elements.
function build(
	tokens: Array<Token>,
	rootProps: BuildProps,
	blockLevel = false,
): Array<Element | string> {
	const result: Array<Element | string> = [];
	let jsxStack: Array<JSXStackFrame> = [];

	// When the JSX stack is non-empty we're inside a component tag, so all
	// output goes to the top frame's children instead of the result array.
	function emit(...elements: Array<Element | string>) {
		const target =
			jsxStack.length > 0 ? jsxStack[jsxStack.length - 1].children : result;
		target.push(...elements);
	}

	for (let i = 0; i < tokens.length; i++) {
		let token = tokens[i];
		let children: Array<Element | string> | undefined;
		switch (token.type) {
			case "escape": {
				emit(decodeHTMLEntities(token.text));
				continue;
			}

			case "text": {
				const tokens1 = (token as Tokens.Text).tokens;
				// Handling situations where "text" tokens have children for some reason
				if (tokens1 && tokens1.length) {
					if (blockLevel) {
						for (; tokens[i + 1] && tokens[i + 1].type === "text"; i++) {
							tokens1.push(tokens[i + 1]);
						}

						token = {
							type: "paragraph",
							// TODO: populate these properties
							raw: "",
							text: "",
							tokens: tokens1,
						};
						children = build(tokens1, rootProps);
					} else {
						emit(...build(tokens1, rootProps));
						continue;
					}
				} else {
					emit(decodeHTMLEntities(token.text));
					continue;
				}

				break;
			}

			case "html": {
				// marked may lump multiple HTML tags into a single token.
				// Split into individual tag/content segments so parseJSX can
				// handle each one (push/pop stack frames, inline-lex content).
				const segments = splitHTMLSegments(token.raw);
				for (const segment of segments) {
					let elements: Array<Element | string>;
					[elements, jsxStack] = parseJSX(segment, jsxStack, rootProps);
					emit(...elements);
				}
				continue;
			}

			case "table": {
				// Table component handles token processing internally
				break;
			}

			case "list": {
				const list = token as Tokens.List;
				const items = list.items.map((item) => ({
					...item,
					loose: list.loose,
				}));
				children = build(items, rootProps, list.loose);
				break;
			}

			case "list_item": {
				const item = token as Tokens.ListItem;
				// A hack to get a checkmark token inside the paragraph for loose lists.
				if (item.task) {
					const checkmark: Checkmark = {
						type: "checkmark",
						// TODO: fill this in with the raw value?
						raw: "",
						checked: !!item.checked,
					};

					const first = item.tokens?.[0] as {tokens?: Array<Token>} | undefined;
					if (first?.tokens?.length) {
						first.tokens.unshift(checkmark as unknown as Token);
					} else {
						tokens.unshift(checkmark as unknown as Token);
					}
				}

				children = build(item.tokens ?? [], rootProps, item.loose);
				break;
			}

			case "codespan": {
				// The marked Lexer class escapes codespans but the actual escaping is
				// handled by the renderer, so we have to remove the code fences
				// ourselves.
				let text = token.raw.replace(/^`+/, "").replace(/`+$/, "");
				const hasNonSpaceChars = /[^ ]/.test(text);
				const hasSpaceCharsOnBothEnds = /^ /.test(text) && / $/.test(text);
				if (hasNonSpaceChars && hasSpaceCharsOnBothEnds) {
					text = text.substring(1, text.length - 1);
				}

				token.text = text;
				break;
			}

			default: {
				// Every other token type can be handled generically.
				if ("tokens" in token && token.tokens?.length) {
					children = build(token.tokens, rootProps);
				}
			}
		}

		const Tag = rootProps.components![token.type];
		if (Tag == null) {
			throw new Error(`Unknown tag "${token.type}"`);
		}

		emit(jsx`
			<${Tag} token=${token} rootProps=${rootProps}>
				${children}
			<//Tag>
		`);
	}

	return result;
}

interface JSXStackFrame {
	tagName: string;
	props: Record<string, any>;
	children: Array<Element | string>;
}

const rawContentTags = new Set([
	"pre",
	"code",
	"script",
	"style",
	"textarea",
	"title",
	"svg",
	"math",
]);

// Void elements have no closing tag. HTML allows them to be written without a
// trailing slash (<img>, not <img />), in which case they look exactly like an
// open tag — so they must never push a stack frame. Nothing would ever pop it,
// and every subsequent element would be collected as its children and dropped.
// They always pass through as raw markup rather than resolving against the
// components map: an <img> or <link> in an HTML block is markup, not a
// reference to the "image" or "link" token component.
const voidTags = new Set([
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr",
]);

function parseProps(attrs: string): Record<string, string | true> {
	const props: Record<string, string | true> = {};
	const re = /([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;
	let m;
	while ((m = re.exec(attrs))) {
		props[m[1]] = m[2] ?? m[3] ?? true;
	}

	return props;
}

// Split a multi-tag HTML token into individual segments that parseJSX can
// handle one at a time. Each segment is either a complete tag (open, close,
// or self-closing) or a stretch of non-tag text.
function splitHTMLSegments(html: string): Array<string> {
	const segments: Array<string> = [];
	const re = /<\/?[\w-]+(?:\s+[\w-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*\s*\/?>/g;
	let lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = re.exec(html))) {
		if (m.index > lastIndex) {
			const between = html.slice(lastIndex, m.index);
			if (between.trim()) {
				segments.push(between);
			}
		}
		segments.push(m[0]);
		lastIndex = re.lastIndex;
	}

	if (lastIndex < html.length) {
		const tail = html.slice(lastIndex);
		if (tail.trim()) {
			segments.push(tail);
		}
	}

	return segments.length > 0 ? segments : [html];
}

// Parse HTML tokens as JSX, resolving PascalCase tags against the components
// map. Regular HTML passes through as Raw. Component open tags push a stack
// frame; the matching close tag pops and renders, with everything in between
// collected as children (including non-html markdown tokens — see emit() in
// build()).
function parseJSX(
	html: string,
	stack: Array<JSXStackFrame>,
	rootProps: BuildProps,
): [Array<Element | string>, Array<JSXStackFrame>] {
	const results: Array<Element | string> = [];
	let m: RegExpMatchArray | null;

	// Self-closing tag: <Foo /> or <Foo prop="val" />
	m = html.match(
		/^\s*<(\w+)((?:\s+[\w-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*\/>\s*$/s,
	);
	if (m) {
		const [, tagName, attrs] = m;
		if (!rawContentTags.has(tagName) && rootProps.components?.[tagName]) {
			const Tag = rootProps.components[tagName];
			const token = {type: tagName, raw: html, ...parseProps(attrs || "")};
			results.push(jsx`<${Tag} token=${token} rootProps=${rootProps} />`);
			return [results, stack];
		}

		return [[jsx`<${Raw} value=${html} />`], stack];
	}

	// Opening tag: <Foo> or <Foo prop="val">
	m = html.match(
		/^\s*<(\w+)((?:\s+[\w-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*>\s*$/s,
	);
	if (m) {
		const [, tagName, attrs] = m;
		// A void element has no closing tag, so it can never be popped. Emit it
		// rather than opening a frame that would swallow the rest of the document.
		if (voidTags.has(tagName)) {
			return [[jsx`<${Raw} value=${html} />`], stack];
		}

		if (!rawContentTags.has(tagName)) {
			return [
				results,
				[...stack, {tagName, props: parseProps(attrs || ""), children: []}],
			];
		}

		return [[jsx`<${Raw} value=${html} />`], stack];
	}

	// Closing tag: </Foo>
	m = html.match(/^\s*<\/(\w+)\s*>\s*$/s);
	if (m) {
		const tagName = m[1];
		if (stack.length > 0 && stack[stack.length - 1].tagName === tagName) {
			const frame = stack[stack.length - 1];
			stack = stack.slice(0, -1);
			const Tag = rootProps.components?.[tagName];
			if (Tag) {
				const token = {type: tagName, raw: html, ...frame.props};
				results.push(
					jsx`<${Tag} token=${token} rootProps=${rootProps}>${frame.children}<//Tag>`,
				);
			} else {
				results.push(
					jsx`<${Raw} value=${
						"<" +
						tagName +
						Object.entries(frame.props)
							.map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${v}"`))
							.join("") +
						">"
					} />`,
					...frame.children,
					jsx`<${Raw} value=${html} />`,
				);
			}
			return [results, stack];
		}

		return [[jsx`<${Raw} value=${html} />`], stack];
	}

	// Fallback: if we're inside a stack frame, inline-lex as markdown;
	// otherwise pass through as raw HTML.
	if (stack.length > 0) {
		const tokens = marked.Lexer.lexInline(html);
		return [build(tokens, rootProps), stack];
	}

	return [[jsx`<${Raw} value=${html} />`], stack];
}

export interface MarkedProps {
	markdown: string;
	components?: Record<string, Component<TokenProps>> | undefined;
	[key: string]: unknown;
}

export function Marked({markdown, ...props}: MarkedProps) {
	// Configure marked to not encode HTML entities in text
	const tokens = marked.Lexer.lex(markdown, {
		gfm: true,
		breaks: false,
		pedantic: false,
	});
	props = {
		...props,
		components: {...defaultComponents, ...props.components},
	};

	return build(tokens, props, true);
}
