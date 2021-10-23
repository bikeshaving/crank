/** @jsx createElement */
import {createElement, Fragment, isElement} from "@b9g/crank";
import type {Children, Component, Element} from "@b9g/crank";
import marked from "marked";
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
export const defaultComponents: Record<string, Component<TokenProps>> = {
	space: () => null,

	code({token}) {
		const {text, lang} = token as Tokens.Code;
		const className = lang ? `language-${lang}` : null;
		return (
			<pre className={className}>
				<code className={className}>{text}</code>
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

		return (
			<Tag start={start && start !== 1 ? start : null}>{children}</Tag>
		);
	},

	list_item({token, children}) {
		const {task, checked, loose} = token as Tokens.ListItem;
		let checkmark: Element | undefined;
		if (task) {
			checkmark = <input checked={checked} disabled="" type="checkbox" />;
			if (loose) {
				// A hack to get the checkmark inside the paragraph in loose lists
				// children should probably always be an array here.
				const childArr = Array.isArray(children) ? children.slice() : [children];
				const firstChild = childArr[0];
				if (isElement(firstChild)) {
					childArr[0] = createElement(
						firstChild.tag,
						firstChild.props,
						createElement(Fragment, null, [checkmark, firstChild.props.children]),
					);
				}

				children = childArr;
				return <li>{childArr}</li>;
			}
		}

		return <li>{checkmark}{children}</li>;
	},

	paragraph({children}) {
		return <p>{children}</p>;
	},

	// TODO: type: 'html';

	// TODO: type: 'def';

	// TODO: type: 'text' | 'html';

	link({token, children}) {
		const {href, title} = token as Tokens.Link;
		// TODO: url sanitization?
		return <a href={href} title={title}>{children}</a>;
	},

	image({token}) {
		const {href, title, text} = token as Tokens.Image;
		return <img href={href} title={title} alt={text} />
	},

	strong({children}) {
		return <strong>{children}</strong>;
	},

	em({children}) {
		return <em>{children}</em>;
	},

	codespan({token}) {
		const {text} = token as Tokens.Code;
		return <code>{text}</code>;
	},

	br: () => <br />,

	// TODO: type: 'del';
};

function build(
	tokens: Array<Token>,
	props: MarkedProps,
	top = false,
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
				const {tokens} = token as Tokens.Text;
				if (tokens && tokens.length) {
					if (top) {
						let raw = token.raw;
						let text = token.text;
						const tokens1: Array<Tokens.Text> = [token as Tokens.Text];
						// TODO: collect adjacent text tokens
						for (; tokens[i + 1] && tokens[i + 1].type === "text"; i++) {
							const token1 = tokens[i + 1] as Tokens.Text;
							tokens1.push(token1);
							raw += token1.raw;
							text += token1.text;
						}

						token = {
							type: 'paragraph',
							raw,
							text,
							tokens: tokens1,
						};
						children = build(tokens1, props);
					} else {
						result.push(...build(tokens, props));
						continue;
					}
				} else {
					result.push(token.text);
					continue;
				}

				break;
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
				children = build(token.tokens, props, top);
				break;
			}

			default: {
				if ("tokens" in token && token.tokens.length) {
					children = build(token.tokens, props);
				}
			}
		}

		const Tag = props.components![token.type] || "unknown";
		result.push(createElement(Tag, {token, rootProps: props, children}));
	}

	return result;
}

export function createComponent(
	markdown: string,
): Component<MarkedProps> {
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
