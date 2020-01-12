import {Pledge} from "./pledge";
import {
	Child,
	Context,
	Default,
	Environment,
	Intrinsic,
	Props,
	Renderer,
	Root,
	Text,
} from "./crank";

// https://stackoverflow.com/a/28458409/
function escapeText(text: string): string {
	return text.replace(/[&<"']/g, (m) => {
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

const voids = new Set([
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
	[Root](this: Context): string {
		return this.childNodes.join("");
	},
	[Text](text: string): string {
		return escapeText(text);
	},
	[Default](tag: string): Intrinsic<string> {
		return function defaultString(this: Context, props: Props): string {
			const attrs = printAttrs(props);
			const open = `<${tag}${attrs.length ? " " : ""}${attrs}>`;
			if (voids.has(tag)) {
				return open;
			}

			const close = `</${tag}>`;
			if ("innerHTML" in props) {
				return `${open}${props["innerHTML"]}${close}`;
			}

			return `${open}${this.childNodes.join("")}${close}`;
		};
	},
};

export class StringRenderer extends Renderer<string> {
	env = env;
}

export const renderer = new StringRenderer();

export function renderToString(child: Child): Promise<string> | string {
	return new Pledge(renderer.render(child)).then(
		(ctx) => (ctx && ctx.node) || "",
	);
}
