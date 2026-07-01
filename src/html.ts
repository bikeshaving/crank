import {Portal, Renderer} from "./crank.js";
import type {ElementValue, RenderAdapter} from "./crank.js";
import {camelToKebabCase, formatStyleValue} from "./_css.js";
import {REACT_SVG_PROPS} from "./_svg.js";

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
			const cssName = camelToKebabCase(name);
			const cssValue = formatStyleValue(cssName, value);
			cssStrings.push(`${cssName}:${cssValue};`);
		}
	}

	return cssStrings.join("");
}

function printAttrs(props: Record<string, any>, isSVG?: boolean): string {
	const attrs: string[] = [];
	for (let [name, value] of Object.entries(props)) {
		if (
			name === "innerHTML" ||
			name === "dangerouslySetInnerHTML" ||
			name.startsWith("prop:")
		) {
			continue;
		} else if (name === "htmlFor") {
			if ("for" in props || value == null || value === false) {
				continue;
			}

			attrs.push(`for="${escape(String(value === true ? "" : value))}"`);
		} else if (name === "style") {
			if (typeof value === "string") {
				attrs.push(`style="${escape(value)}"`);
			} else if (typeof value === "object" && value !== null) {
				attrs.push(`style="${escape(printStyleObject(value))}"`);
			}
		} else if (name === "className") {
			if ("class" in props || typeof value !== "string") {
				continue;
			}

			attrs.push(`class="${escape(value)}"`);
		} else if (name === "class") {
			if (typeof value === "string") {
				attrs.push(`class="${escape(value)}"`);
			} else if (typeof value === "object" && value !== null) {
				// class={{"foo bar": true, "baz": false}} syntax
				const classes = Object.keys(value)
					.filter((k) => value[k])
					.join(" ");
				if (classes) {
					attrs.push(`class="${escape(classes)}"`);
				}
			}
		} else {
			if (name.startsWith("attr:")) {
				name = name.slice("attr:".length);
			} else if (isSVG && name in REACT_SVG_PROPS) {
				name = REACT_SVG_PROPS[name];
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

/**
 * The equivalent of DOM Node for the HTML Renderer. Not to be confused with
 * the DOM's Text node. It's just an object with value string so that
 * we can reference the value of the HTML by reference, not value.
 *
 * TextNode is never actually
 */
interface TextNode {
	value?: string;
}

function join(children: Array<TextNode | string>): string {
	let result = "";
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		result += typeof child === "string" ? child : child.value;
	}

	return result;
}

// The opening markup of a host element ("<div ...>"; the whole element for
// void tags) and the closing markup ("</div>"; empty for void). Shared by
// `arrange` (which assembles the full element) and the streaming read, which
// emits them around the element's children.
function printOpen(
	tag: string,
	props: Record<string, any>,
	isSVG: boolean,
): string {
	const attrs = printAttrs(props, isSVG);
	return `<${tag}${attrs.length ? " " : ""}${attrs}>`;
}

function printClose(tag: string): string {
	return voidTags.has(tag) ? "" : `</${tag}>`;
}

export const impl: Partial<RenderAdapter<TextNode, string, TextNode, string>> =
	{
		scope({
			scope,
			tag,
		}: {
			scope: string | undefined;
			tag: string | symbol;
			props: Record<string, any>;
			root: TextNode | undefined;
		}): string | undefined {
			if (tag === Portal) {
				return undefined;
			}

			switch (tag) {
				case "svg":
					return "svg";
				case "math":
					return "math";
				case "foreignObject":
					return undefined;
			}

			return scope;
		},

		create(): TextNode {
			return {value: ""};
		},

		text({value}: {value: string}): TextNode {
			return {value: escape(value)};
		},

		read(value: ElementValue<TextNode>): string {
			if (Array.isArray(value)) {
				return join(value);
			} else if (typeof value === "undefined") {
				return "";
			} else if (typeof value === "string") {
				return value;
			} else {
				return value.value || "";
			}
		},

		arrange({
			tag,
			tagName,
			node,
			props,
			children,
			scope,
		}: {
			tag: string | symbol;
			tagName: string;
			node: TextNode;
			props: Record<string, any>;
			children: Array<TextNode | string>;
			scope: string | undefined;
			root: TextNode | undefined;
		}): void {
			if (tag === Portal) {
				return;
			} else if (typeof tag !== "string") {
				throw new Error(`Unknown tag: ${tagName}`);
			}

			const isSVG = scope === "svg" || tag === "foreignObject";
			const open = printOpen(tag, props, isSVG);
			let result: string;
			if (voidTags.has(tag)) {
				result = open;
			} else {
				const contents =
					"innerHTML" in props
						? props["innerHTML"]
						: "dangerouslySetInnerHTML" in props
							? (props["dangerouslySetInnerHTML"]?.__html ?? "")
							: join(children);
				result = `${open}${contents}${printClose(tag)}`;
			}

			node.value = result;
		},

		open({
			tag,
			props,
			scope,
		}: {
			tag: string | symbol;
			props: Record<string, any>;
			scope: string | undefined;
		}): string {
			if (typeof tag !== "string") {
				return "";
			}

			const open = printOpen(
				tag,
				props,
				scope === "svg" || tag === "foreignObject",
			);
			// Elements whose content is markup rather than committed children carry
			// it here, since the streaming read never descends into them.
			const inner =
				"innerHTML" in props
					? props["innerHTML"]
					: "dangerouslySetInnerHTML" in props
						? (props["dangerouslySetInnerHTML"]?.__html ?? "")
						: "";
			return `${open}${inner}`;
		},

		close({tag}: {tag: string | symbol}): string {
			return typeof tag === "string" ? printClose(tag) : "";
		},
	};

export class HTMLRenderer extends Renderer<TextNode, string, any, string> {
	constructor() {
		super(impl);
	}

	render(children: any, dest?: any, bridge?: any): Promise<string> | string {
		// A WritableStream in the second position selects streaming SSR (per #293);
		// the render still resolves to the full string.
		if (dest != null && typeof dest.getWriter === "function") {
			const writer = dest.getWriter();
			return this.renderStream(
				children,
				(chunk) => writer.write(chunk),
				bridge,
			).then(
				(result) => writer.close().then(() => result),
				(err) =>
					writer.abort(err).then(
						() => Promise.reject(err),
						() => Promise.reject(err),
					),
			);
		}

		// A plain writer-like sink is also accepted; the caller owns its lifetime.
		if (dest != null && typeof dest.write === "function") {
			return this.renderStream(children, (chunk) => dest.write(chunk), bridge);
		}

		return super.render(children, dest, bridge);
	}
}

export const renderer = new HTMLRenderer();

declare global {
	module Crank {
		interface EventMap extends GlobalEventHandlersEventMap {}
	}
}
