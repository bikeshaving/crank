import {Portal, Renderer} from "./crank.js";
import type {ElementValue, RenderAdapter} from "./crank.js";

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

function printStyleObject(style: Record<string, any>): string {
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
	for (let [name, value] of Object.entries(props)) {
		// TODO: Because printAttrs is called in arrange, special props are not filtered out.
		// This should be handled by the core library.
		if (
			name === "children" ||
			name === "innerHTML" ||
			// TODO: Should we filter out props in the core library?
			name === "key" ||
			name === "ref" ||
			name === "copy" ||
			name.startsWith("prop:")
		) {
			continue;
		} else if (name === "style") {
			if (typeof value === "string") {
				attrs.push(`style="${escape(value)}"`);
			} else if (typeof value === "object") {
				attrs.push(`style="${escape(printStyleObject(value))}"`);
			}
		} else if (name === "className") {
			if ("class" in props || typeof value !== "string") {
				continue;
			}

			attrs.push(`class="${escape(value)}"`);
		} else {
			if (name.startsWith("attr:")) {
				name = name.slice("attr:".length);
			}
			if (typeof value === "string") {
				attrs.push(`${escape(name)}="${escape(value)}"`);
			} else if (typeof value === "number") {
				attrs.push(`${escape(name)}="${value}"`);
			} else if (value === true) {
				attrs.push(`${escape(name)}`);
			}
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

export const impl: Partial<RenderAdapter<Node, undefined, any, string>> = {
	create(): Node {
		return {value: ""};
	},

	text({text}: {text: string}): Node {
		return {value: escape(text)};
	},

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
	},

	arrange({
		tag,
		node,
		props,
		children,
	}: {
		tag: string | symbol;
		node: Node;
		props: Record<string, any>;
		children: Array<Node | string>;
	}): void {
		if (tag === Portal) {
			return;
		} else if (typeof tag !== "string") {
			throw new Error(`Unknown tag: ${String(tag)}`);
		}

		const attrs = printAttrs(props);
		const open = `<${tag}${attrs.length ? " " : ""}${attrs}>`;
		let result: string;
		if (voidTags.has(tag)) {
			result = open;
		} else {
			const close = `</${tag}>`;
			const contents =
				"innerHTML" in props ? props["innerHTML"] : join(children);
			result = `${open}${contents}${close}`;
		}

		node.value = result;
	},
};

export class HTMLRenderer extends Renderer<Node, undefined, any, string> {
	constructor() {
		super(impl);
	}
}

export const renderer = new HTMLRenderer();

declare global {
	module Crank {
		interface EventMap extends GlobalEventHandlersEventMap {}
	}
}
