// Experimental streaming HTML renderer (#293).
//
// The HTML renderer assembles bottom-up, so it can't flush early. This builds a
// tree of `string | Tree[] | (() => Promise<Tree>)` from the Crank element tree
// and `walk`s it: async components become deferred functions, which run eagerly
// while output is emitted in strict document (DFS) order.
import {Fragment, Portal, Raw, Text, Copy, isElement} from "./crank.js";
import type {Children, Element} from "./crank.js";
import {escape, printAttrs, voidTags} from "./html.js";

type Tree = string | Array<Tree> | (() => Promise<Tree>);
type Started = string | Array<Started> | Promise<Started>;

const isPromise = (x: any): x is Promise<any> =>
	x != null && typeof x.then === "function";
const isIteratorLike = (x: any): x is Iterator<any> | AsyncIterator<any> =>
	x != null && typeof x.next === "function";

// --- the eager-DFS async-tree walk (validated against issue #293's examples) ---

function start(node: Tree): Started {
	if (typeof node === "function") return node().then(start);
	if (Array.isArray(node)) return node.map(start);
	return node;
}

function emit(
	node: Started,
	onEnter: (value: string) => void,
): string | Promise<string> {
	if (isPromise(node)) return node.then((n) => emit(n, onEnter));
	if (Array.isArray(node)) {
		let result = "";
		let i = 0;
		const next = (): string | Promise<string> => {
			while (i < node.length) {
				const r = emit(node[i], onEnter);
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

	onEnter(node);
	return node;
}

function walk(
	tree: Tree,
	onEnter: (value: string) => void,
): string | Promise<string> {
	return emit(start(tree), onEnter);
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
		const attrs = printAttrs(attrProps(props), isSVG);
		const open = `<${tag}${attrs.length ? " " : ""}${attrs}>`;
		if (voidTags.has(tag)) return open;
		const close = `</${tag}>`;
		let contents: Tree;
		if ("innerHTML" in props) {
			contents = String(props.innerHTML ?? "");
		} else if ("dangerouslySetInnerHTML" in props) {
			contents = props.dangerouslySetInnerHTML?.__html ?? "";
		} else {
			const childScope =
				tag === "svg" ? "svg" : tag === "foreignObject" ? undefined : scope;
			contents = childrenToTree(props.children, parent, childScope);
		}

		return [open, contents, close];
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

/**
 * Render an element to an HTML string, streaming chunks to `writable` in
 * document order as async parts resolve. Resolves to the full string too.
 */
export function renderToStream(
	element: Children,
	writable: WritableStream<string>,
): string | Promise<string> {
	const writer = writable.getWriter();
	const tree = childToTree(element, undefined, undefined);
	const result = walk(tree, (chunk) => {
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
