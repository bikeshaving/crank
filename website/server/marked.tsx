/** @jsx createElement */
import {createElement, Fragment, Raw} from "@b9g/crank";
import type {Children, Component, Element} from "@b9g/crank";
import marked from "marked";
// TODO: Allow Token to be extended somehow
import type {Token, Tokens} from "marked";

export interface MarkedProps {
	components?: Record<string, Component<TokenProps>> | undefined;
	[key: string]: unknown;
}

export interface TokenProps {
	token: Token;
	rootProps: MarkedProps;
	children: Children;
	[key: string]: unknown;
}

//interface Space {
// type: 'space';
// raw: string;
//}

//interface Code {
// type: 'code';
// raw: string;
// codeBlockStyle?: 'indented' | undefined;
// lang?: string | undefined;
// text: string;
//}

//interface Heading {
// type: 'heading';
// raw: string;
// depth: number;
// text: string;
// tokens: Token[];
//}

//interface Table {
// type: 'table';
// raw: string;
// align: Array<'center' | 'left' | 'right' | null>;
// header: TableCell[];
// rows: TableCell[][];
//}

//interface TableCell {
// text: string;
// tokens: Token[];
//}

//interface Hr {
// type: 'hr';
// raw: string;
//}

//interface Blockquote {
// type: 'blockquote';
// raw: string;
// text: string;
// tokens: Token[];
//}

//interface List {
// type: 'list';
// raw: string;
// ordered: boolean;
// start: number | '';
// loose: boolean;
// items: ListItem[];
//}

//interface ListItem {
// type: 'list_item';
// raw: string;
// task: boolean;
// checked?: boolean | undefined;
// loose: boolean;
// text: string;
// tokens: Token[];
//}

//interface Paragraph {
// type: 'paragraph';
// raw: string;
// pre?: boolean | undefined;
// text: string;
// tokens: Token[];
//}

//interface HTML {
// type: 'html';
// raw: string;
// pre: boolean;
// text: string;
//}

//interface Text {
// type: 'text';
// raw: string;
// text: string;
// tokens?: Token[] | undefined;
//}

//interface Def {
// type: 'def';
// raw: string;
// tag: string;
// href: string;
// title: string;
//}

//interface Escape {
// type: 'escape';
// raw: string;
// text: string;
//}

//interface Tag {
// type: 'text' | 'html';
// raw: string;
// inLink: boolean;
// inRawBlock: boolean;
// text: string;
//}

//interface Link {
// type: 'link';
// raw: string;
// href: string;
// title: string;
// text: string;
// tokens: Token[];
//}

//interface Image {
// type: 'image';
// raw: string;
// href: string;
// title: string;
// text: string;
//}

//interface Strong {
// type: 'strong';
// raw: string;
// text: string;
// tokens: Token[];
//}

//interface Em {
// type: 'em';
// raw: string;
// text: string;
// tokens: Token[];
//}

//interface Codespan {
// type: 'codespan';
// raw: string;
// text: string;
//}

//interface Br {
// type: 'br';
// raw: string;
//}

//interface Del {
// type: 'del';
// raw: string;
// text: string;
// tokens: Token[];
//}

//interface Generic {
// [index: string]: any;
// type: string;
// raw: string;
// tokens?: Token[] | undefined;
//}

export interface Checkmark {
	type: "checkmark";
	raw: string;
	checked: boolean;
}

export const defaultComponents: Record<string, Component<TokenProps>> = {
	space: () => null,

	code({token}) {
		const {text, lang} = token as Tokens.Code;
		const langClassName = lang ? `language-${lang}` : null;
		return (
			<pre className={langClassName}>
				<code className={langClassName}>{text}</code>
			</pre>
		);
	},

	heading({token, children}) {
		const {depth} = token as Tokens.Heading;
		const Tag = `h${depth}`;
		// TODO: ids
		return <Tag>{children}</Tag>;
	},

	// TODO: type: 'table';

	hr: () => <hr />,

	blockquote({children}) {
		return <blockquote>{children}</blockquote>;
	},

	list({token, children}) {
		const {ordered, start} = token as Tokens.List;
		const Tag = ordered ? "ol" : "ul";

		return <Tag start={start && start !== 1 ? start : null}>{children}</Tag>;
	},

	list_item({children}) {
		return <li>{children}</li>;
	},

	checkmark({token}) {
		const {checked} = token as unknown as Checkmark;
		return <input checked={checked} disabled="" type="checkbox" />;
	},

	paragraph({children}) {
		return <p>{children}</p>;
	},

	html({token}) {
		// TODO: Is this all that’s necessary?
		const {text} = token as Tokens.HTML;
		return <Raw value={text} />;
	},

	// TODO: type: 'def';
	// This token type does not seem to be used by marked.

	// TODO: type: 'text' | 'html';
	// This is for tag tokens, which might not be a thing.

	link({token, children}) {
		const {href, title} = token as Tokens.Link;
		// TODO: url sanitization?
		return (
			<a href={href} title={title}>
				{children}
			</a>
		);
	},

	image({token}) {
		const {href, title, text} = token as Tokens.Image;
		return <img src={href} title={title} alt={text} />;
	},

	strong({children}) {
		return <strong>{children}</strong>;
	},

	em({children}) {
		return <em>{children}</em>;
	},

	codespan({token}) {
		const {text} = token as Tokens.Codespan;
		return <code>{text}</code>;
	},

	br: () => <br />,

	// TODO: type: 'del';
};

function build(
	tokens: Array<Token>,
	props: MarkedProps,
	blockLevel = false,
): Array<Element | string> {
	const result: Array<Element | string> = [];
	for (let i = 0; i < tokens.length; i++) {
		let token = tokens[i];
		let children: Array<Element | string> | undefined;
		// TODO: Don’t hard-code the process of creating children
		switch (token.type) {
			case "escape": {
				result.push(token.text);
				continue;
			}

			case "text": {
				const {tokens: tokens1} = token as Tokens.Text;
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
						children = build(tokens1, props);
					} else {
						result.push(...build(tokens1, props));
						continue;
					}
				} else {
					result.push(token.text);
					continue;
				}

				break;
			}

			case "html": {
				// TODO: handle custom html components here?
				if (demo) {
					console.log(token);
				}
				continue;
			}

			case "table": {
				throw new Error("TODO");
			}

			case "list": {
				const items = token.items.map((item) => ({
					...item,
					loose: (token as Tokens.List).loose,
				}));
				children = build(items, props, token.loose);
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
						tokens.unshift(checkmark as unknown as Token);
					}
				}

				children = build(token.tokens, props, token.loose);
				break;
			}

			case "codespan": {
				// The marked Lexer escapes codespans but escaping is handled by the
				// renderer.
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
				if ("tokens" in token && token.tokens.length) {
					children = build(token.tokens, props);
				}
			}
		}

		const Tag = props.components![token.type];
		if (Tag == null) {
			throw new Error(`Unknown tag "${token.type}"`);
		}

		result.push(createElement(Tag, {token, rootProps: props, children}));
	}

	return result;
}

// TODO: Should the components be passed into the outer function?
export function createComponent(markdown: string): Component<MarkedProps> {
	const tokens = marked.Lexer.lex(markdown);
	return function Marked(props: MarkedProps) {
		props = {
			...props,
			components: {...defaultComponents, ...props.components},
		};

		const children = build(tokens, props, true);
		return createElement(Fragment, {children});
	};
}

import {renderer} from "@b9g/crank/html";
//import {promises as fs} from "node:fs";

let demo = false;
(async () => {
	//const blog = await fs.readFile("./blog/2020-04-15-introducing-crank.md", "utf-8");
	//const Marked = createComponent(blog);
	demo = true;
	const Marked = createComponent(`

<PartsOfJSX prop="value" />
<span class="demo">**Hello?**</sp>

<detail>
I’m more worried about myself, what if *I’m* a carrier.
</detail>
`);
	const html = renderer.render(<Marked />);
	console.log(html);
	demo = false;
})();
