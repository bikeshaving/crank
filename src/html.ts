import {createElement, Portal, Renderer} from "./crank.js";
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

/**
 * The equivalent of DOM Node for the HTML Renderer. Not to be confused with
 * the DOM's Text node. It's just an object with value string so that
 * we can reference the value of the HTML by reference, not value.
 */
interface TextNode {
	value?: string;
	raw?: string;
	// The opening tag of an element which has been written to a stream, and the
	// props it was printed from.
	open?: string;
	props?: Record<string, any>;
}

/**
 * Something the adapter writes HTML to as nodes are committed.
 *
 * The renderer commits nodes in document order, so the adapter writes each
 * node the first time it is committed: the opening tag of an element when it
 * is patched, text when it is created, and the closing tag of an element when
 * it is arranged.
 */
class Sink {
	/** Everything which has been written. */
	declare text: string;
	/**
	 * An element whose contents are not its children as they are committed:
	 * the innerHTML prop replaces them, and the contents of style and script
	 * elements are escaped as a whole. Nothing is written until the element is
	 * arranged, when its contents are written with its closing tag.
	 */
	declare held: TextNode | undefined;
	constructor() {
		this.text = "";
		this.held = undefined;
	}

	write(chunk: string): void {
		this.text += chunk;
	}
}

/**
 * The root of a render into a stream.
 */
class StreamRoot extends Sink {
	declare writer: WritableStreamDefaultWriter<string>;
	declare error: unknown;
	/** What has been written but not flushed to the stream. */
	declare buffer: string;
	declare timer: ReturnType<typeof setTimeout> | undefined;
	/** The number of boundaries which have been created. */
	declare boundaries: number;
	/** Boundaries whose contents have not been written or abandoned. */
	declare pending: Set<Promise<unknown>>;
	/**
	 * The contents of boundaries which were ready before the document was
	 * finished. They are written after the document, because a template can
	 * only replace a placeholder from the top level of the body.
	 */
	declare patches: Array<string> | undefined;
	/** Whether the contents of any boundary have been written. */
	declare patched: boolean;
	/**
	 * The nonce of the first script element which was written with one. The
	 * scripts which replace fallbacks are written with the same nonce.
	 */
	declare nonce: string | undefined;
	constructor(writer: WritableStreamDefaultWriter<string>) {
		super();
		this.writer = writer;
		this.error = undefined;
		this.buffer = "";
		this.timer = undefined;
		this.boundaries = 0;
		this.pending = new Set();
		this.patches = [];
		this.patched = false;
		this.nonce = undefined;
	}

	write(chunk: string): void {
		if (chunk) {
			this.text += chunk;
			this.buffer += chunk;
			if (this.timer === undefined) {
				// The commit only resumes from promises, so by the time a timer
				// fires, it has written everything it can without waiting for a
				// component.
				this.timer = setTimeout(() => this.flush());
			}
		}
	}

	flush(): void {
		clearTimeout(this.timer);
		this.timer = undefined;
		if (this.buffer) {
			this.writer.write(this.buffer).catch((err) => {
				if (this.error === undefined) {
					this.error = err;
				}
			});
			this.buffer = "";
		}
	}

	/**
	 * Creates a boundary: a part of the document whose contents may be written
	 * after the document, replacing a placeholder.
	 */
	boundary(): Boundary {
		return new Boundary(this, "crank-" + this.boundaries++);
	}

	/**
	 * Writes the contents of a boundary whose placeholder has been written.
	 */
	patch(name: string, contents: string): void {
		// The script which defines $crank() is only written once.
		const patch =
			`<template for="${name}">${contents}</template>` +
			`${OPEN_SCRIPT}${this.nonce === undefined ? "" : ` nonce="${escape(this.nonce)}"`}>` +
			`${this.patched ? "" : PATCH_SCRIPT}$crank("${name}")</script>`;
		this.patched = true;
		if (this.patches) {
			this.patches.push(patch);
		} else {
			this.write(patch);
		}
	}

	/**
	 * Writes whatever part of the document has not been written, then the
	 * contents of its boundaries as they are ready, and closes the stream.
	 */
	async end(result: string): Promise<string> {
		if (!result.startsWith(this.text)) {
			// Part of the tree which had already been written changed before the
			// render finished.
			throw new Error("Rendered HTML does not match what was streamed");
		}

		this.write(result.slice(this.text.length));
		const patches = this.patches!;
		this.patches = undefined;
		for (let i = 0; i < patches.length; i++) {
			this.write(patches[i]);
		}

		while (this.pending.size) {
			await Promise.all(this.pending);
		}

		this.flush();
		await this.writer.close();
		if (this.error !== undefined) {
			throw this.error;
		}

		return this.text;
	}

	abort(reason: unknown): void {
		clearTimeout(this.timer);
		this.writer.abort(reason).catch(() => {});
	}
}

// This module can end up inlined in a script element, where a "<script"
// which follows a "<!--" keeps the element from being closed.
const OPEN_SCRIPT = ["<", "script"].join("");

/**
 * Replaces the placeholder of a boundary with its contents in browsers which
 * do not support <template for>. These browsers parse the processing
 * instructions which mark the placeholder as comments.
 */
const PATCH_SCRIPT =
	"function $crank(n){" +
	"var t=document.querySelector('template[for=\"'+n+'\"]'),w=document.createTreeWalker(document,128),s,e,d=0,r;" +
	"document.currentScript.remove();" +
	"if(!t)return;" +
	"while((s=w.nextNode())&&s.data!=='?start name=\"'+n+'\"');" +
	"if(!s)return;" +
	"for(e=s.nextSibling;e;e=e.nextSibling)" +
	"if(e.nodeType===8)" +
	"if(!e.data.indexOf('?start'))d++;" +
	"else if(e.data==='?end'&&!d--)break;" +
	"r=document.createRange();" +
	"r.setStartBefore(s);" +
	"r.setEndAfter(e||s.parentNode.lastChild);" +
	"r.deleteContents();" +
	"r.insertNode(t.content);" +
	"t.remove()" +
	"}";

/**
 * A part of a document whose contents may be written after the rest of the
 * document. The Suspense component renders its children into a boundary.
 *
 * If the contents are ready when the commit reaches the boundary, they are
 * written in place. Otherwise the fallback is written between the start and
 * end markers, and the contents are written after the document in a template
 * which the browser replaces the fallback with.
 */
class Boundary extends Sink {
	declare stream: StreamRoot;
	declare name: string;
	/** A processing instruction which marks the start of the fallback. */
	declare start: string;
	/** A processing instruction which marks the end of the fallback. */
	declare end: string;
	/** Whether the fallback has been written. */
	declare deferred: boolean;
	/**
	 * The contents if they are to be written in place. The boundary is passed
	 * to a Raw element as a node, which reads its value when it is committed.
	 */
	declare value: string;
	declare settle: () => void;
	constructor(stream: StreamRoot, name: string) {
		super();
		this.stream = stream;
		this.name = name;
		this.start = `<?start name="${name}">`;
		this.end = "<?end>";
		this.deferred = false;
		this.value = "";
		const pending = new Promise<void>((resolve) => (this.settle = resolve));
		stream.pending.add(pending);
		pending.then(() => stream.pending.delete(pending));
	}

	/**
	 * Called when the fallback has been written.
	 */
	defer(): void {
		this.deferred = true;
	}

	/**
	 * Called when the contents have been written to the boundary.
	 */
	close(): void {
		if (this.deferred) {
			this.stream.patch(this.name, this.text);
		} else {
			this.value = this.text;
		}

		this.settle();
	}

	/**
	 * Called when the contents have failed to render. If the fallback has been
	 * written, it stays in the document, and the render rejects with the error
	 * when the stream has closed.
	 */
	abort(err: unknown): boolean {
		if (this.deferred) {
			this.close = NOOP;
			if (this.stream.error === undefined) {
				this.stream.error = err;
			}

			this.settle();
		}

		return this.deferred;
	}
}

function NOOP(): void {}

const SuspenseBoundaries = Symbol.for("crank.SuspenseBoundaries");

/**
 * Tells Suspense components that there is nothing to show a fallback on: they
 * render into a boundary of the stream, or wait for their children when
 * there is no stream.
 */
function BoundaryProvider(
	this: Context,
	{stream, children}: {stream?: StreamRoot; children: Children},
): Children {
	this.provide(SuspenseBoundaries as any, () => stream && stream.boundary());
	return children;
}

/**
 * Returns a writer for a root which is a stream: a WritableStream, or a
 * Node.js writable stream such as an http.ServerResponse.
 */
function getWriter(root: any): WritableStreamDefaultWriter<string> | undefined {
	if (root == null) {
		return undefined;
	} else if (typeof root.getWriter === "function") {
		return root.getWriter();
	} else if (
		typeof root.write === "function" &&
		typeof root.end === "function"
	) {
		return new WritableStream<string>({
			write(chunk) {
				return new Promise((resolve, reject) =>
					root.write(chunk, (err: unknown) => (err ? reject(err) : resolve())),
				);
			},
			close() {
				return new Promise((resolve) => root.end(resolve));
			},
			abort(reason) {
				root.destroy(reason);
			},
		}).getWriter();
	}
}

function printOpen(
	tag: string,
	props: Record<string, any>,
	scope: string | undefined,
): string {
	const attrs = printAttrs(props, scope === "svg" || tag === "foreignObject");
	return `<${tag}${attrs.length ? " " : ""}${attrs}>`;
}

// Whether the contents of an element are something other than its children.
function hasOwnContents(
	tag: string,
	props: Record<string, any>,
	scope: string | undefined,
): boolean {
	return (
		"innerHTML" in props ||
		"dangerouslySetInnerHTML" in props ||
		(rawTextTags.has(tag) && scope !== "svg")
	);
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

		text({
			value,
			oldNode,
			root,
		}: {
			value: string;
			oldNode: TextNode | undefined;
			root: unknown;
		}): TextNode {
			const node = {value: escape(value), raw: value};
			if (root instanceof Sink && !root.held && !oldNode) {
				root.write(node.value);
			}

			return node;
		},

		raw({
			value,
			root,
		}: {
			value: string | TextNode;
			root: unknown;
		}): ElementValue<TextNode> {
			if (root instanceof Sink && !root.held) {
				root.write(typeof value === "string" ? value : value.value || "");
			}

			return value as ElementValue<TextNode>;
		},

		patch({
			tag,
			node,
			props,
			scope,
			root,
		}: {
			tag: string | symbol;
			node: TextNode;
			props: Record<string, any>;
			scope: string | undefined;
			root: unknown;
		}): void {
			if (!(root instanceof Sink) || root.held || typeof tag !== "string") {
				return;
			}

			if (tag === "script" && typeof props.nonce === "string") {
				const stream = root instanceof Boundary ? root.stream : root;
				if ((stream as StreamRoot).nonce === undefined) {
					(stream as StreamRoot).nonce = props.nonce;
				}
			}

			if (node.open === undefined) {
				node.open = printOpen(tag, props, scope);
				node.props = props;
				root.write(node.open);
			}

			if (!voidTags.has(tag) && hasOwnContents(tag, props, scope)) {
				root.held = node;
			}
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
			root,
		}: {
			tag: string | symbol;
			tagName: string;
			node: TextNode;
			props: Record<string, any>;
			children: Array<TextNode | string>;
			scope: string | undefined;
			root: unknown;
		}): void {
			if (tag === Portal) {
				return;
			} else if (typeof tag !== "string") {
				throw new Error(`Unknown tag: ${tagName}`);
			}

			const open =
				node.props === props ? node.open! : printOpen(tag, props, scope);
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
				if (root instanceof Sink) {
					if (root.held === node) {
						root.held = undefined;
						if (!node.value) {
							root.write(`${contents}${close}`);
						}
					} else if (!root.held && !node.value) {
						root.write(close);
					}
				}
			}

			node.value = result;
		},
	};

export class HTMLRenderer extends Renderer<TextNode, string, any, string> {
	constructor() {
		super(impl);
	}

	/**
	 * Renders an element tree to a string of HTML.
	 *
	 * @param root - An optional WritableStream of strings, or a Node.js
	 * writable stream. When it is passed, the HTML is also written to the
	 * stream as it is rendered: everything before an async component is
	 * written without waiting for the component. The stream is closed when the
	 * render finishes and aborted if it fails, and the render always returns a
	 * promise. Any other object is a key, as for other renderers: rendering
	 * with the same key updates the same tree.
	 */
	render(
		children: Children,
		root?: unknown,
		bridge?: Context | undefined,
	): Promise<string> | string {
		const writer = getWriter(root);
		if (writer === undefined) {
			return super.render(
				// Rendering nothing unmounts the tree of a root.
				children == null
					? children
					: createElement(BoundaryProvider, null, children),
				root,
				bridge,
			);
		}

		const stream = new StreamRoot(writer);
		return new Promise<string>((resolve) =>
			resolve(
				super.render(
					createElement(BoundaryProvider, {stream}, children),
					stream,
					bridge,
				),
			),
		)
			.then((result) => stream.end(result))
			.then((text) => {
				// Renders without a root unmount when they finish, and the stream
				// is not a root anything can render into again.
				super.render(null, stream, bridge);
				return text;
			})
			.catch((err) => {
				super.render(null, stream, bridge);
				stream.abort(err);
				throw err;
			});
	}
}

export const renderer = new HTMLRenderer();

declare global {
	module Crank {
		interface EventMap extends GlobalEventHandlersEventMap {}
	}
}
