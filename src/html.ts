import {Portal, Renderer} from "./index";

declare module "./index" {
	interface EventMap extends GlobalEventHandlersEventMap {}
}

interface Value {
	tag: string;
	props: Record<string, any>;
	result?: string;
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

export class StringRenderer extends Renderer<Value, Value | string, string> {
	create(tag: string | symbol, props: Record<string, any>): Value {
		if (typeof tag !== "string") {
			throw new Error(`Unknown tag: ${tag.toString()}`);
		}

		return {tag, props};
	}

	patch(tag: unknown, value: Value, props: Record<string, any>): void {
		value.props = props;
	}

	arrange(tag: any, value: Value, childValues: Array<string | Value>): string {
		if (tag === Portal) {
			return childValues
				.map((value) => (typeof value === "string" ? value : value.result))
				.join("");
		}

		const attrs = printAttrs(value.props);
		const open = `<${tag}${attrs.length ? " " : ""}${attrs}>`;
		let result: string;
		if (voidTags.has(tag)) {
			result = open;
		} else {
			const close = `</${tag}>`;
			const contents =
				"innerHTML" in value.props
					? value.props["innerHTML"]
					: childValues
							.map((value) =>
								typeof value === "string" ? value : value.result,
							)
							.join("");
			result = `${open}${contents}${close}`;
		}

		value.result = result;
		return result;
	}

	destroy(): void {}

	parse(text: string): string {
		return text;
	}

	escape(text: string): string {
		return escapeText(text);
	}

	scope(): void {}
}

export const renderer = new StringRenderer();
