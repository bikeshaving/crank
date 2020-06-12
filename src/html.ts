import {Renderer} from "./index";

declare module "./index" {
	interface EventMap extends GlobalEventHandlersEventMap {}
}

function escapeText(text: string): string {
	return text.replace(/[&<>"']/g, (m) => {
		switch (m) {
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
				attrs.push(`style="${escapeText(printStyle(value))}"`);
				break;
			case typeof value === "string":
				attrs.push(`${escapeText(name)}="${escapeText(value)}"`);
				break;
			case typeof value === "number":
				attrs.push(`${escapeText(name)}="${value}"`);
				break;
			case value === true:
				attrs.push(`${escapeText(name)}`);
				break;
		}
	}

	return attrs.join(" ");
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

export class StringRenderer extends Renderer<string, string, string> {
	create(
		tag: string | symbol,
		props: Record<string, any>,
		children: Array<string>,
	): string {
		if (typeof tag !== "string") {
			throw new Error(`Unknown tag: ${tag.toString()}`);
		}

		const attrs = printAttrs(props);
		const open = `<${tag}${attrs.length ? " " : ""}${attrs}>`;
		if (voidTags.has(tag)) {
			return open;
		}

		const close = `</${tag}>`;
		if ("innerHTML" in props) {
			return `${open}${props["innerHTML"]}${close}`;
		}

		return `${open}${children.join("")}${close}`;
	}

	patch(): void {}

	arrange(tag: unknown, parent: unknown, children: Array<string>): string {
		return children.join("");
	}

	destroy(): void {}

	parse(text: string): string {
		return text;
	}

	escape(text: string): string {
		return escapeText(text);
	}

	scope(): undefined {
		return undefined;
	}
}

export const renderer = new StringRenderer();
