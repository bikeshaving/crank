import {Portal, Renderer} from "./crank.js";
import type {
	Children,
	Context,
	ElementValue,
	RenderAdapter,
} from "./crank.js";
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

function printOpen(
	tag: string,
	props: Record<string, any>,
	isSVG: boolean,
): string {
	const attrs = printAttrs(props, isSVG);
	return `<${tag}${attrs.length ? " " : ""}${attrs}>`;
}

// The markup a host element injects instead of walking child retainers:
// dangerouslySetInnerHTML/innerHTML content. Undefined when the element's
// contents come from its children.
function printRawContents(props: Record<string, any>): string | undefined {
	if ("innerHTML" in props) {
		return props["innerHTML"];
	} else if ("dangerouslySetInnerHTML" in props) {
		return props["dangerouslySetInnerHTML"]?.__html ?? "";
	}

	return undefined;
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

			const open = printOpen(tag, props, scope === "svg" || tag === "foreignObject");
			let result: string;
			if (voidTags.has(tag)) {
				result = open;
			} else {
				const contents = printRawContents(props) ?? join(children);
				result = `${open}${contents}</${tag}>`;
			}

			node.value = result;
		},

		// Streaming: `open` serializes the opening tag (plus any raw innerHTML
		// contents, which have no child retainers to walk), and `close` the
		// closing tag. Together with the children emitted in between, the stream
		// reproduces exactly what `arrange` assembles into node.value.
		open({
			tag,
			tagName,
			props,
			scope,
		}: {
			tag: string | symbol;
			tagName: string;
			props: Record<string, any>;
			scope: string | undefined;
			root: TextNode | undefined;
		}): string {
			if (typeof tag !== "string") {
				throw new Error(`Unknown tag: ${tagName}`);
			}

			const open = printOpen(tag, props, scope === "svg" || tag === "foreignObject");
			if (voidTags.has(tag)) {
				return open;
			}

			return open + (printRawContents(props) ?? "");
		},

		close({
			tag,
			tagName,
		}: {
			tag: string | symbol;
			tagName: string;
			props: Record<string, any>;
			scope: string | undefined;
			root: TextNode | undefined;
		}): string {
			if (typeof tag !== "string") {
				throw new Error(`Unknown tag: ${tagName}`);
			}

			return voidTags.has(tag) ? "" : `</${tag}>`;
		},
	};

/**
 * A destination for streaming HTML output: a write callback, a WHATWG
 * WritableStream, or any object with a `write(chunk)` method (e.g. a Node.js
 * Writable or http.ServerResponse).
 */
export type HTMLSink =
	| ((chunk: string) => unknown)
	| WritableStream<string>
	| {write(chunk: string): unknown};

export class HTMLRenderer extends Renderer<TextNode, string, any, string> {
	constructor() {
		super(impl);
	}

	/**
	 * Renders an element tree to an HTML string.
	 *
	 * @param children - The element tree to render.
	 * @param rootOrDest - Either a root (an opaque key the renderer caches
	 * renders against) or a streaming destination — a write callback, a WHATWG
	 * WritableStream, or a Node-style writable. When a destination is given,
	 * markup is written to it in document order as the tree commits, so the
	 * static shell flushes before async components settle; the call still
	 * resolves to the complete HTML string, and a WritableStream is closed once
	 * the render settles.
	 * @param bridge - An optional bridge context (see the base renderer).
	 *
	 * @returns The rendered HTML, or a promise of it when the tree renders
	 * asynchronously or streams to a WritableStream.
	 */
	render(
		children: Children,
		rootOrDest?: any,
		bridge?: Context | undefined,
	): Promise<string> | string {
		let root: any;
		let dest: HTMLSink | undefined;
		if (isSink(rootOrDest)) {
			dest = rootOrDest;
		} else {
			root = rootOrDest;
		}

		if (dest == null) {
			return super.render(children, root, bridge);
		}

		let sink: (chunk: string) => unknown;
		let finish: (() => unknown) | undefined;
		if (typeof dest === "function") {
			sink = dest;
		} else if (typeof (dest as WritableStream<string>).getWriter === "function") {
			const writer = (dest as WritableStream<string>).getWriter();
			sink = (chunk) => writer.write(chunk);
			finish = () => writer.close();
		} else {
			sink = (chunk) => (dest as {write(chunk: string): unknown}).write(chunk);
		}

		const result = super.render(children, root, bridge, sink);
		if (finish) {
			return Promise.resolve(result).then((html) => {
				finish!();
				return html;
			});
		}

		return result;
	}
}

// A streaming destination is a write callback or an object exposing a
// WritableStream-style `getWriter` or a Node-style `write`. A root, by
// contrast, is an opaque cache key with neither.
function isSink(value: unknown): value is HTMLSink {
	return (
		typeof value === "function" ||
		(value != null &&
			(typeof (value as {getWriter?: unknown}).getWriter === "function" ||
				typeof (value as {write?: unknown}).write === "function"))
	);
}

export const renderer = new HTMLRenderer();

declare global {
	module Crank {
		interface EventMap extends GlobalEventHandlersEventMap {}
	}
}
