import {Portal, Renderer} from "./crank.js";
import type {Children, Context, ElementValue, RenderAdapter} from "./crank.js";
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

function printAttributeEntries(entries: Array<[string, string]>): string {
	return entries
		.map(([name, value]) =>
			value === "" ? escape(name) : `${escape(name)}="${escape(value)}"`,
		)
		.join(" ");
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
	raw?: string;
}

function join(children: Array<TextNode | string>): string {
	let result = "";
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		result += typeof child === "string" ? child : child.value;
	}

	return result;
}

// style and script hold raw text in HTML: the parser never decodes character
// references inside them, and only the element's own closing tag can end them.
const rawTextTags = new Set(["style", "script"]);

function isJSONScriptType(type: unknown): boolean {
	if (typeof type !== "string") {
		return false;
	}

	const type1 = type.trim().toLowerCase();
	return (
		type1 === "importmap" ||
		type1 === "speculationrules" ||
		type1.includes("json")
	);
}

function joinRawText(
	children: Array<TextNode | string>,
	tag: string,
	type: unknown,
): string {
	let result = "";
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		result +=
			typeof child === "string"
				? child
				: child.raw != null
					? child.raw
					: child.value;
	}

	// In valid JSON, < can only appear inside a string, where \u003C is a
	// lossless escape, so JSON scripts can neutralize every parser-significant
	// sequence at once.
	if (tag === "script" && isJSONScriptType(type)) {
		return result
			.replace(/</g, "\\u003C")
			.replace(/\u2028/g, "\\u2028")
			.replace(/\u2029/g, "\\u2029");
	}

	// <\/style and <\/script are identity escapes in CSS, JavaScript strings,
	// and JSON, so neutralizing the closing tag preserves the text's meaning.
	return result.replace(
		new RegExp(`</${tag}`, "gi"),
		(match) => "<\\" + match.slice(1),
	);
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
			return {value: escape(value), raw: value};
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

			const attrs = printAttrs(
				props,
				scope === "svg" || tag === "foreignObject",
			);
			const open = `<${tag}${attrs.length ? " " : ""}${attrs}>`;
			let result: string;
			if (voidTags.has(tag)) {
				result = open;
			} else {
				const close = `</${tag}>`;
				const contents =
					"innerHTML" in props
						? props["innerHTML"]
						: "dangerouslySetInnerHTML" in props
							? (props["dangerouslySetInnerHTML"]?.__html ?? "")
							: rawTextTags.has(tag) && scope !== "svg"
								? joinRawText(children, tag, props["type"])
								: join(children);
				result = `${open}${contents}${close}`;
			}

			node.value = result;
		},
	};

// Classes which can render on the server (CrankHTMLElement) expose a function
// under this key. Given a tag name, it returns a function which prepares an
// element for rendering from its props. The HTML renderer never imports the
// web components module.
const _ServerRender = Symbol.for("crank.ServerRender");

interface ServerRender {
	children: Children;
	template: Record<string, unknown> | null;
	attributes(): Array<[string, string]>;
}

interface Definition {
	ctor: Function;
	prepare(props: Record<string, any>): ServerRender;
}

interface Placeholder {
	tag: string;
	definition: Definition;
	props: Record<string, any>;
	children: string;
}

interface CustomElementState {
	registry: Map<string, Definition>;
	placeholders: Map<string, Placeholder>;
	pattern: RegExp;
}

const states = new WeakMap<HTMLRenderer, CustomElementState>();

const reservedNames = new Set([
	"annotation-xml",
	"color-profile",
	"font-face",
	"font-face-src",
	"font-face-uri",
	"font-face-format",
	"font-face-name",
	"missing-glyph",
]);

// A simplified version of the HTML spec's valid custom element name.
function isValidElementName(name: string): boolean {
	return (
		/^[a-z][^\sA-Z/>=]*-[^\sA-Z/>=]*$/.test(name) && !reservedNames.has(name)
	);
}

function then<T, U>(
	value: Promise<T> | T,
	fn: (value: T) => Promise<U> | U,
): Promise<U> | U {
	return value instanceof Promise ? value.then(fn) : fn(value as T);
}

// Replaces each placeholder in rendered HTML with its element, rendered in a
// root of its own as it would be in a browser.
function expand(
	renderer: HTMLRenderer,
	html: Promise<string> | string,
): Promise<string> | string {
	return then(html, (html) => {
		const {placeholders, pattern} = states.get(renderer)!;
		const parts: Array<Promise<string> | string> = [];
		let isAsync = false;
		let last = 0;
		for (const match of html.matchAll(pattern)) {
			parts.push(html.slice(last, match.index));
			const placeholder = placeholders.get(match[1]);
			placeholders.delete(match[1]);
			const part = placeholder ? expandElement(renderer, placeholder) : "";
			isAsync = isAsync || part instanceof Promise;
			parts.push(part);
			last = match.index + match[0].length;
		}

		if (!parts.length) {
			return html;
		}

		parts.push(html.slice(last));
		return isAsync
			? Promise.all(parts).then((parts) => parts.join(""))
			: parts.join("");
	});
}

function expandElement(
	renderer: HTMLRenderer,
	{tag, definition, props, children}: Placeholder,
): Promise<string> | string {
	const prepared = definition.prepare(props);
	const contents = renderer.render(prepared.children);
	return then(contents, (contents) => {
		if (prepared.template === null) {
			if (children) {
				console.error(
					`<${tag}> renders its own children, so children passed to it are ignored.`,
				);
			}

			return print(contents);
		}

		// Light children follow the declarative shadow root, where slots project
		// them.
		const template = printAttrs(prepared.template);
		return then(expand(renderer, children), (children) =>
			print(`<template ${template}>${contents}</template>${children}`),
		);
	});

	function print(inner: string): string {
		// The element's attributes once it has rendered, as in a browser: props
		// which became properties are not printed, and attributes the element
		// set on itself are.
		const attrs = printAttributeEntries(prepared.attributes());
		return `<${tag}${attrs.length ? " " : ""}${attrs}>${inner}</${tag}>`;
	}
}

export class HTMLRenderer extends Renderer<TextNode, string, any, string> {
	constructor() {
		const registry = new Map<string, Definition>();
		const placeholders = new Map<string, Placeholder>();
		const nonce = Math.random().toString(36).slice(2);
		const ids = new WeakMap<TextNode, string>();
		let nextId = 0;
		super({
			...impl,
			arrange(data) {
				const {tag, node, props, children, scope} = data;
				const definition =
					typeof tag === "string" && scope !== "svg"
						? registry.get(tag)
						: undefined;
				if (!definition) {
					return impl.arrange!(data);
				} else if ("innerHTML" in props || "dangerouslySetInnerHTML" in props) {
					console.error(
						`<${tag as string}> is a defined custom element, so its innerHTML is ignored.`,
					);
				}

				// A defined element renders in a root of its own once this render
				// finishes, so for now it is a placeholder. Text is escaped, so no
				// rendered text can contain one.
				let id = ids.get(node);
				if (id === undefined) {
					id = String(nextId++);
					ids.set(node, id);
				}

				placeholders.set(id, {
					tag: tag as string,
					definition,
					props,
					children: join(children),
				});
				node.value = `<!--crank-element:${nonce}:${id}-->`;
			},
		});
		states.set(this, {
			registry,
			placeholders,
			pattern: new RegExp(`<!--crank-element:${nonce}:(\\d+)-->`, "g"),
		});
	}

	render(
		children: Children,
		root?: any,
		bridge?: Context,
	): Promise<string> | string {
		return expand(this, super.render(children, root, bridge));
	}

	/**
	 * Registers a custom element class with this renderer, the server's
	 * equivalent of `customElements.define`. Each registered tag renders its
	 * contents (a declarative shadow root for shadow DOM elements) in a root of
	 * its own, as in a browser, so the browser can hydrate them.
	 *
	 * Defining the same tag with the same class again does nothing.
	 */
	define(tagName: string, ctor: CustomElementConstructor): void {
		const {registry} = states.get(this)!;
		const existing = registry.get(tagName);
		if (existing && existing.ctor === ctor) {
			return;
		} else if (existing) {
			throw new Error(`<${tagName}> has already been defined`);
		} else if (!isValidElementName(tagName)) {
			throw new SyntaxError(`"${tagName}" is not a valid custom element name`);
		} else if (typeof (ctor as any)[_ServerRender] !== "function") {
			throw new TypeError(
				`Cannot define <${tagName}>: ${ctor.name || "class"} is not a CrankHTMLElement`,
			);
		}

		for (const [name, definition] of registry) {
			if (definition.ctor === ctor) {
				throw new Error(
					`${ctor.name || "class"} has already been defined as <${name}>`,
				);
			}
		}

		registry.set(tagName, {
			ctor,
			prepare: (ctor as any)[_ServerRender](tagName),
		});
	}

	/** Returns the class defined for a tag, if any. */
	get(tagName: string): CustomElementConstructor | undefined {
		return states.get(this)!.registry.get(tagName)?.ctor as
			| CustomElementConstructor
			| undefined;
	}
}

export const renderer = new HTMLRenderer();

declare global {
	module Crank {
		interface EventMap extends GlobalEventHandlersEventMap {}
	}
}
