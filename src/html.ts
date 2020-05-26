import {
	Default,
	Environment,
	HostContext,
	Intrinsic,
	IntrinsicProps,
	Portal,
	Renderer,
	Text,
} from "./index";

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
				throw new Error("Bad match");
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

function printAttrs(props: IntrinsicProps<string>): string {
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

export const env: Environment<string> = {
	[Default](tag: string | symbol): Intrinsic<string> {
		if (typeof tag !== "string") {
			throw new Error(`Unknown tag: ${tag.toString()}`);
		}

		return function defaultString(this: HostContext): string {
			const attrs = printAttrs(this.props);
			const open = `<${tag}${attrs.length ? " " : ""}${attrs}>`;
			if (voidTags.has(tag)) {
				return open;
			}

			const close = `</${tag}>`;
			if ("innerHTML" in this.props) {
				return `${open}${this.props["innerHTML"]}${close}`;
			}

			return `${open}${this.childValues.join("")}${close}`;
		};
	},
	[Text](text: string): string {
		return escapeText(text);
	},
	[Portal](this: HostContext): string {
		return this.childValues.join("");
	},
};

export class StringRenderer extends Renderer<string> {
	constructor() {
		super(env);
	}
}

export const renderer = new StringRenderer();
