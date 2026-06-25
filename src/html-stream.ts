// Experimental streaming HTML renderer (#293).
//
// One eager-DFS walk over the element tree with two emission points:
//
//   - onEnter(chunk) fires literal markup in strict document order. A consumer
//     that flushes onEnter immediately gets streaming SSR (bytes leave before
//     later async siblings resolve).
//   - onExit(info)   fires when an element subtree has fully resolved, carrying
//     its assembled html. This is the commit/arrange point: children fire before
//     their parents, siblings in document order — exactly arrange order. A
//     consumer that acts only on onExit gets atomic, bottom-up commit (today's
//     html.ts behavior, and the shape a DOM renderer needs to keep rollback).
//
// Atomic is the buffered special case of streaming: the walk's return value is
// the fully assembled string, byte-identical to the non-streaming renderer.
import {Fragment, Portal, Raw, Text, Copy, isElement} from "./crank.js";
import type {Children, Element} from "./crank.js";
import {escape, printOpen, printClose, voidTags} from "./html.js";

// An element subtree: open tag, inner Tree, close tag, plus the tag/props so an
// onExit consumer can arrange it. Non-element markup is just a string.
interface ElementNode {
	tag: string;
	props: Record<string, any>;
	open: string;
	children: Tree;
	close: string;
}

type Tree = string | Array<Tree> | (() => Promise<Tree>) | ElementNode;

interface StartedElement {
	tag: string;
	props: Record<string, any>;
	open: string;
	children: Started;
	close: string;
}

type Started = string | Array<Started> | Promise<Started> | StartedElement;

export interface ExitInfo {
	tag: string;
	props: Record<string, any>;
	html: string;
}

const isPromise = (x: any): x is Promise<any> =>
	x != null && typeof x.then === "function";
const isIteratorLike = (x: any): x is Iterator<any> | AsyncIterator<any> =>
	x != null && typeof x.next === "function";

// --- the eager-DFS async-tree walk ---

// start() descends the tree and fires every deferred thunk, so all async
// branches run concurrently (the fan-out). Thunks become promises.
function start(node: Tree): Started {
	if (typeof node === "function") return node().then(start);
	if (Array.isArray(node)) return node.map(start);
	if (typeof node === "object" && node !== null) {
		return {...node, children: start(node.children)};
	}

	return node;
}

// emit() descends the started tree in document order, firing onEnter for markup
// as it lands and onExit when each element subtree completes. Returns the
// assembled string for the node (so parents can assemble from children).
function emit(
	node: Started,
	onEnter: (chunk: string) => void,
	onExit: (info: ExitInfo) => void,
): string | Promise<string> {
	if (isPromise(node)) {
		return node.then((n) => emit(n, onEnter, onExit));
	}

	if (Array.isArray(node)) {
		let result = "";
		let i = 0;
		const next = (): string | Promise<string> => {
			while (i < node.length) {
				const r = emit(node[i], onEnter, onExit);
				i++;
				if (isPromise(r)) {
					return r.then((s) => {
						result += s;
						return next();
					});
				}

				result += r;
			}

			return result;
		};

		return next();
	}

	if (typeof node === "object" && node !== null) {
		onEnter(node.open);
		const inner = emit(node.children, onEnter, onExit);
		const finish = (innerHTML: string): string => {
			onEnter(node.close);
			const html = node.open + innerHTML + node.close;
			onExit({tag: node.tag, props: node.props, html});
			return html;
		};

		return isPromise(inner) ? inner.then(finish) : finish(inner);
	}

	onEnter(node);
	return node;
}

function walk(
	tree: Tree,
	onEnter: (chunk: string) => void,
	onExit: (info: ExitInfo) => void,
): string | Promise<string> {
	return emit(start(tree), onEnter, onExit);
}

// --- a minimal one-shot SSR context ---

class StreamContext {
	props: Record<string, any>;
	parent: StreamContext | undefined;
	provisions: Map<unknown, unknown> | undefined;
	constructor(props: Record<string, any>, parent: StreamContext | undefined) {
		this.props = props;
		this.parent = parent;
	}

	// A one-shot render: `for...of this` / `for await...of this` yields the props
	// once. refresh/schedule/after/cleanup are no-ops server-side.
	*[Symbol.iterator]() {
		yield this.props;
	}
	async *[Symbol.asyncIterator]() {
		yield this.props;
	}
	refresh() {}
	schedule() {}
	after() {}
	cleanup() {}
	provide(key: unknown, value: unknown) {
		(this.provisions ??= new Map()).set(key, value);
	}
	consume(key: unknown): unknown {
		for (let c: StreamContext | undefined = this; c; c = c.parent) {
			if (c.provisions?.has(key)) return c.provisions.get(key);
		}

		return undefined;
	}
}

// --- element tree → Tree ---

// Special props that are not HTML attributes.
const SPECIAL_PROPS = ["children", "key", "ref", "copy", "hydrate"];
function attrProps(props: Record<string, any>): Record<string, any> {
	let result = props;
	for (const key of SPECIAL_PROPS) {
		if (key in props) {
			if (result === props) result = {...props};
			delete result[key];
		}
	}

	return result;
}

function childToTree(
	child: unknown,
	parent: StreamContext | undefined,
	scope: string | undefined,
): Tree {
	if (child == null || typeof child === "boolean") return "";
	if (typeof child === "string") return escape(child);
	if (typeof child === "number") return escape(String(child));
	if (Array.isArray(child)) {
		return child.map((c) => childToTree(c, parent, scope));
	}

	if (isElement(child)) return elementToTree(child, parent, scope);
	return escape(String(child));
}

function childrenToTree(
	children: Children,
	parent: StreamContext | undefined,
	scope: string | undefined,
): Tree {
	return childToTree(children, parent, scope);
}

function elementToTree(
	el: Element,
	parent: StreamContext | undefined,
	scope: string | undefined,
): Tree {
	const {tag, props} = el as {tag: any; props: Record<string, any>};
	if (tag === Fragment || tag === Portal) {
		return childrenToTree(props.children, parent, scope);
	} else if (tag === Raw) {
		return typeof props.value === "string" ? props.value : "";
	} else if (tag === Text) {
		return escape(String(props.value ?? ""));
	} else if (tag === Copy) {
		return "";
	} else if (typeof tag === "string") {
		const isSVG = scope === "svg" || tag === "foreignObject";
		const open = printOpen(tag, attrProps(props), isSVG);
		if (voidTags.has(tag)) {
			return {tag, props, open, children: "", close: ""};
		}

		let children: Tree;
		if ("innerHTML" in props) {
			children = String(props.innerHTML ?? "");
		} else if ("dangerouslySetInnerHTML" in props) {
			children = props.dangerouslySetInnerHTML?.__html ?? "";
		} else {
			const childScope =
				tag === "svg" ? "svg" : tag === "foreignObject" ? undefined : scope;
			children = childrenToTree(props.children, parent, childScope);
		}

		return {tag, props, open, children, close: printClose(tag)};
	} else if (typeof tag === "function") {
		return componentToTree(tag, props, parent, scope);
	}

	return "";
}

function componentToTree(
	tag: Function,
	props: Record<string, any>,
	parent: StreamContext | undefined,
	scope: string | undefined,
): Tree {
	const ctx = new StreamContext(props, parent);
	const result = tag.call(ctx, props, ctx);
	if (isIteratorLike(result)) {
		if (typeof (result as any)[Symbol.asyncIterator] === "function") {
			// async generator: defer to its first yield
			return () =>
				(result as AsyncIterator<Children>)
					.next()
					.then((it) => childrenToTree(it.value as Children, ctx, scope));
		}

		// sync generator: take its first yield
		const it = (result as Iterator<Children>).next();
		return childrenToTree(it.value as Children, ctx, scope);
	} else if (isPromise(result)) {
		// async function component: defer
		return () =>
			result.then((children: Children) =>
				childrenToTree(children, ctx, scope),
			);
	}

	// sync function component
	return childrenToTree(result as Children, ctx, scope);
}

// --- public surface ---

/**
 * The shared traversal. Builds the Tree from `element` and walks it once,
 * driving both emission points. `onEnter` receives markup in document order;
 * `onExit` receives each element subtree as it completes. Resolves to the fully
 * assembled string (atomic output, byte-identical to the string renderer).
 */
export function renderWalk(
	element: Children,
	onEnter: (chunk: string) => void = () => {},
	onExit: (info: ExitInfo) => void = () => {},
): string | Promise<string> {
	const tree = childToTree(element, undefined, undefined);
	return walk(tree, onEnter, onExit);
}

/**
 * Atomic render: the same walk, revealing nothing until the whole tree resolves.
 * Equivalent to listening only on the root's onExit.
 */
export function renderToString(element: Children): string | Promise<string> {
	return renderWalk(element);
}

/**
 * Streaming render: the same walk, flushing each onEnter chunk to `writable` in
 * document order as async parts resolve. Resolves to the full string too.
 */
export function renderToStream(
	element: Children,
	writable: WritableStream<string>,
): string | Promise<string> {
	const writer = writable.getWriter();
	const result = renderWalk(element, (chunk) => {
		if (chunk) writer.write(chunk);
	});

	if (isPromise(result)) {
		return result.then((str) => {
			writer.close();
			return str;
		});
	}

	writer.close();
	return result;
}
