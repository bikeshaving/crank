import {xm} from "@b9g/crank";
import type {Children, Component, Element} from "@b9g/crank";
import {marked} from "marked";
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
	token: marked.Token;
	rootProps: MarkedProps;
	children: Children;
	[key: string]: unknown;
}

export const defaultComponents: Record<string, Component<TokenProps>> = {
	space: () => null,

	code({token}) {
		const {text, lang} = token as marked.Tokens.Code;
		const langClassName = lang ? `language-${lang}` : null;
		return xm`
			<pre class=${langClassName}>
				<code class=${langClassName}>${text}</code>
			</pre>
		`;
	},

	heading({token, children}) {
		const {depth} = token as marked.Tokens.Heading;
		const tag = `h${depth}`;
		return xm`<${tag}>${children}<//>`;
	},

	// TODO: type: 'table';

	hr: () => xm`<hr />`,

	blockquote({children}) {
		return xm`<blockquote>${children}</blockquote>`;
	},

	list({token, children}) {
		const {ordered, start} = token as marked.Tokens.List;
		const tag = ordered ? "ol" : "ul";

		return xm`
			<${tag} start=${start && start !== 1 ? start : null}>${children}<//>
		`;
	},

	list_item({children}) {
		return xm`<li>${children}</li>`;
	},

	checkmark({token}) {
		const {checked} = token as unknown as Checkmark;
		return xm`<input checked=${checked} disabled="" type="checkbox" />`;
	},

	paragraph({children}) {
		return xm`<p>${children}</p>`;
	},

	html({token}) {
		// TODO: Is this all that’s necessary?
		const {text} = token as marked.Tokens.HTML;
		return xm`<$RAW value=${text} />`;
	},

	// TODO: type: 'def';
	// This token type does not seem to be used by marked.

	// TODO: type: 'text' | 'html';
	// This is for tag tokens, which might not be a thing.

	link({token, children}) {
		const {href, title} = token as marked.Tokens.Link;
		// TODO: url sanitization?
		return xm`
			<a href=${href} title=${title}>
				${children}
			</a>
		`;
	},

	image({token}) {
		const {href, title, text} = token as marked.Tokens.Image;
		return xm`<img src=${href} title=${title} alt=${text} />`;
	},

	strong({children}) {
		return xm`<strong>${children}</strong>`;
	},

	em({children}) {
		return xm`<em>${children}</em>`;
	},

	codespan({token}) {
		const {text} = token as marked.Tokens.Codespan;
		return xm`<code>${text}</code>`;
	},

	br: () => xm`<br />`,

	// TODO: type: 'del';
};

interface BuildProps {
	components?: Record<string, Component<TokenProps>> | undefined;
	[key: string]: unknown;
}

// This function is called recursively to turn an array of tokens into elements.
function build(
	tokens: Array<marked.Token>,
	rootProps: BuildProps,
	blockLevel = false,
): Array<Element | string> {
	const result: Array<Element | string> = [];
	let jsxStack: Array<JSXStackFrame> = [];
	for (let i = 0; i < tokens.length; i++) {
		let token = tokens[i];
		let children: Array<Element | string> | undefined;
		// TODO: Don’t hard-code the process of creating children?
		switch (token.type) {
			case "escape": {
				result.push(token.text);
				continue;
			}

			case "text": {
				const tokens1 = (token as marked.Tokens.Text).tokens;
				// Handling situations where “text” tokens have children for some reason
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
						result.push(...build(tokens1, rootProps));
						continue;
					}
				} else {
					result.push(token.text);
					continue;
				}

				break;
			}

			case "html": {
				let elements: Array<Element | string>;
				[elements, jsxStack] = parseJSX(token.raw, jsxStack);
				result.push(...elements);
				continue;
			}

			case "table": {
				// Don’t got no need for tables yet.
				throw new Error("TODO");
			}

			case "list": {
				const items = token.items.map((item) => ({
					...item,
					loose: (token as marked.Tokens.List).loose,
				}));
				children = build(items, rootProps, token.loose);
				break;
			}

			case "list_item": {
				// A hack to get a checkmark token inside the paragraph for loose lists.
				if (token.task) {
					const checkmark: Checkmark = {
						type: "checkmark",
						// TODO: fill this in with the raw value?
						raw: "",
						checked: !!token.checked,
					};

					if (
						token.tokens[0] &&
						(token.tokens[0] as any).tokens &&
						(token.tokens[0] as any).tokens.length
					) {
						(token.tokens[0] as any).tokens.unshift(checkmark);
					} else {
						tokens.unshift(checkmark as unknown as marked.Token);
					}
				}

				children = build(token.tokens, rootProps, token.loose);
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
				if ("tokens" in token && token.tokens.length) {
					children = build(token.tokens, rootProps);
				}
			}
		}

		const Tag = rootProps.components![token.type];
		if (Tag == null) {
			throw new Error(`Unknown tag "${token.type}"`);
		}

		result.push(xm`
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

type JSXLexerMode = "none" | "open" | "props";

// I have to write a parser to handle HTML as JSX 😔
function parseJSX(
	html: string,
	stack: Array<JSXStackFrame>,
): [Array<Element | string>, Array<JSXStackFrame>] {
	let mode: JSXLexerMode = "none";
	let loop = 0;
	for (let i = 0; i < html.length; ) {
		let left = html.slice(i);
		let match: RegExpMatchArray | null;
		if ((match = left.match(/^\s+/))) {
			// Dealing with whitespace.
			i += match[0].length;
		} else {
			switch (mode) {
				case "none": {
					if ((match = left.match(/^<!--/))) {
						// we assume comments aren’t split across several tokens
						const closeMatch = left.slice(i + match[0].length).match("-->");
						if (closeMatch) {
							// Not really sure why RegExpMatchArray.index could possibly be
							// `undefined`.
							i +=
								match[0].length +
								(closeMatch.index || 0) +
								closeMatch[0].length;

							// TODO: Emit comments maybe.
						}
					}
					if (left[0] === "<") {
						mode = "open";
						i++;
					} else if ((match = left.match(/[^<>]/))) {
						// Add the raw text as children
						i += match[0].length;
					} else {
						throw new Error("TODO");
					}

					break;
				}

				case "open": {
					let closing = false;
					if (left[0] === "/") {
						closing = true;
						i++;
						left = left.slice(1);
					}

					if ((match = left.match(/^\w+/))) {
						const tag = match[0];
						i += tag.length;
						mode = "props";
						if (closing) {
							//if (tags[tags.length - 1] !== tag) {
							//	console.error({tag, tags});
							//	throw new Error("Tag mismatch");
							//}
							//console.log(["POPPING TAG", tag]);
						} else {
							//console.log(["PUSHING TAG", tag]);
						}
					}

					break;
				}

				case "props": {
					if (left[0] === ">") {
						mode = "none";
						i++;
					} else if ((match = left.match(/^(\w+)(?:\s*=\s*('|")(\w+)\2)?/))) {
						// second match group is for attr quotes
						//const [, key, , value] = match;
						//console.log({key, value, match});
						i += match[0].length;
					} else {
						throw new Error(`Unexpected character: ${left[0] || "EOF"}`);
					}

					break;
				}
			}
		}

		loop++;

		if (loop >= 100) {
			throw new Error(`Non-terminating input: ${JSON.stringify(left)}`);
		}
	}

	return [[], stack];
}

export interface MarkedProps {
	markdown: string;
	components?: Record<string, Component<TokenProps>> | undefined;
	[key: string]: unknown;
}

export function Marked({markdown, ...props}: MarkedProps) {
	const tokens = marked.Lexer.lex(markdown);
	props = {
		...props,
		components: {...defaultComponents, ...props.components},
	};

	return build(tokens, props, true);
}

/* Scratchpad
import {renderer} from "@b9g/crank/html";
const test1 = "<div>Hello world</div>";
const test2 = "<div>\n\nHello *world*</div>";
const test3 = '<poop type="4">*uhhhh*</poop>';
const test4 = '<div class="hey">Hello</div>';
const test5 = '<span>`<hello>`</span>';
const test6 = '<PartsOfJSX />';
const test7 = '<b>Hello <i>World</i></b>';
const test8 = "<div>Hello <span>World</span></div>";
const test9 = "<span>Hello <span>World</span></span>";
var fuck = false;
fuck = true;
console.log(renderer.render(xm`<${Marked} markdown=${test1}/>`));
fuck = false;
*/
