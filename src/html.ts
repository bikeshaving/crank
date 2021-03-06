import {Element, ElementValue, Portal, Renderer} from "./crank";

const voidTags = new Set([
	"area",
	"base",
	"br",
	"col",
	"command",
	"embed",
	"hr",
	"img",
	"input",
	"keygen",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr",
]);

function escape(text: string): string {
	return text.replace(/[&<>"']/g, (match) => {
		switch (match) {
			case "&":
				return "&amp;";
			case "<":
				return "&lt;";
			case ">":
				return "&gt;";
			case '"':
				return "&quot;";
			case "'":
				return "&#039;";
			default:
				return "";
		}
	});
}

function printStyleObject(style: Record<string, string>): string {
	const cssStrings = [];
	for (const [name, value] of Object.entries(style)) {
		if (value != null) {
			cssStrings.push(`${name}:${value};`);
		}
	}

	return cssStrings.join("");
}

function printAttrs(props: Record<string, any>): string {
	const attrs: string[] = [];
	for (const [name, value] of Object.entries(props)) {
		switch (true) {
			case name === "children":
			case name === "innerHTML":
				break;
			case name === "style":
				if (typeof value === "string") {
					attrs.push(`style="${escape(value)}"`);
				} else {
					attrs.push(`style="${escape(printStyleObject(value))}"`);
				}
				break;
			case typeof value === "string":
				attrs.push(`${escape(name)}="${escape(value)}"`);
				break;
			case typeof value === "number":
				attrs.push(`${escape(name)}="${value}"`);
				break;
			case value === true:
				attrs.push(`${escape(name)}`);
				break;
		}
	}

	return attrs.join(" ");
}

interface Node {
	value: string;
}

function join(children: Array<Node | string>): string {
	let result = "";
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		result += typeof child === "string" ? child : child.value;
	}

	return result;
}

export class HTMLRenderer extends Renderer<
	Node | string,
	undefined,
	unknown,
	string
> {
	create(): Node {
		return {value: ""};
	}

	escape(text: string): string {
		return escape(text);
	}

	read(value: ElementValue<Node>): string {
		if (Array.isArray(value)) {
			return join(value);
		} else if (typeof value === "undefined") {
			return "";
		} else if (typeof value === "string") {
			return value;
		} else {
			return value.value;
		}
	}

	arrange(
		el: Element<string | symbol>,
		node: Node,
		children: Array<Node | string>,
	): void {
		if (el.tag === Portal) {
			return;
		} else if (typeof el.tag !== "string") {
			throw new Error(`Unknown tag: ${el.tag.toString()}`);
		}

		const attrs = printAttrs(el.props);
		const open = `<${el.tag}${attrs.length ? " " : ""}${attrs}>`;
		let result: string;
		if (voidTags.has(el.tag)) {
			result = open;
		} else {
			const close = `</${el.tag}>`;
			const contents =
				"innerHTML" in el.props ? el.props["innerHTML"] : join(children);
			result = `${open}${contents}${close}`;
		}

		node.value = result;
	}
}

export const renderer = new HTMLRenderer();

/**
 * @deprecated
 */
export const StringRenderer = HTMLRenderer;

declare global {
	module Crank {
		interface EventMap extends GlobalEventHandlersEventMap {}
	}
}
