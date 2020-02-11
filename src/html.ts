import {Pledge} from "./pledge";
import {
	Child,
	Context,
	Default,
	Environment,
	Intrinsic,
	Portal,
	Props,
	Renderer,
	Text,
} from "./index";

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

function printAttrs(props: Props): string {
	const attrs: string[] = [];
	for (const [name, value] of Object.entries(props)) {
		switch (true) {
			case name === "children":
			case name === "innerHTML":
				break;
			case name === "style":
				attrs.push(`style="${printStyle(value)}"`);
				break;
			case typeof value === "string":
				attrs.push(`${escapeText(name)}="${escapeText(value)}"`);
				break;
			case typeof value === "number":
				attrs.push(`${escapeText(name)}="${value}"`);
				break;
			case typeof value === "boolean":
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
	[Default](tag: string): Intrinsic<string> {
		return function defaultString(this: Context, props: Props): string {
			const attrs = printAttrs(props);
			const open = `<${tag}${attrs.length ? " " : ""}${attrs}>`;
			if (voidTags.has(tag)) {
				return open;
			}

			const close = `</${tag}>`;
			if ("innerHTML" in props) {
				return `${open}${props["innerHTML"]}${close}`;
			}

			return `${open}${this.childNodes.join("")}${close}`;
		};
	},
	[Text](text: string): string {
		return escapeText(text);
	},
	[Portal](this: Context): string {
		return this.childNodes.join("");
	},
};

export class StringRenderer extends Renderer<string> {
	constructor() {
		super(env);
	}

	renderToString(child: Child, key?: object): Promise<string> | string {
		return new Pledge(() => this.render(child, key))
			.then((ctx) => (ctx && ctx.node) || "")
			.execute();
	}
}

export const renderer = new StringRenderer();
