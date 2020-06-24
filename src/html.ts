import {ElementValue, Portal, Renderer} from "./index";

declare module "./index" {
	interface EventMap extends GlobalEventHandlersEventMap {}
}

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

function printStyle(style: Record<string, string>): string {
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
				attrs.push(`style="${escape(printStyle(value))}"`);
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
	result: string;
}

function join(children: Array<Node | string>): string {
	let result = "";
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		result += typeof child === "string" ? child : child.result;
	}

	return result;
}

export class StringRenderer extends Renderer<Node | string, string> {
	scope(): void {}

	create(): Node {
		return {result: ""};
	}

	read(value: ElementValue<Node>): string {
		if (Array.isArray(value)) {
			return join(value);
		} else if (typeof value === "undefined") {
			return "";
		} else if (typeof value === "string") {
			return value;
		} else {
			return value.result;
		}
	}

	patch(): void {}

	arrange(
		tag: any,
		node: Node,
		props: Record<string, any>,
		children: Array<Node | string>,
	): void {
		if (tag === Portal) {
			return;
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

		node.result = result;
	}

	parse(text: string): string {
		return text;
	}

	escape(text: string): string {
		return escape(text);
	}
}

export const renderer = new StringRenderer();
