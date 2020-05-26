import {
	Default,
	Environment,
	HostContext,
	Intrinsic,
	Raw,
	Renderer,
	Scopes,
	Portal,
} from "./index";

declare module "./index" {
	interface EventMap extends GlobalEventHandlersEventMap {}
}

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

// TODO: refine/explain the NO_TOUCH set
// Gleaned from:
// https://github.com/preactjs/preact/blob/05e5d2c0d2d92c5478eeffdbd96681c96500d29f/src/diff/props.js#L111-L117
const NO_TOUCH = new Set(["form", "list", "type", "size"]);

// TODO: create an allowlist/blocklist of props
function updateProps(
	el: Element,
	props: Record<string, any>,
	newProps: Record<string, any>,
	namespace: string | undefined,
): void {
	for (const name in {...props, ...newProps}) {
		const value = props[name];
		const newValue = newProps[name];

		switch (name) {
			case "children":
				break;
			case "class":
			case "className": {
				if (namespace === undefined) {
					el.className = newValue;
				} else {
					el.setAttribute("class", newValue);
				}

				break;
			}
			case "style": {
				const style: CSSStyleDeclaration = (el as any).style;
				if (style != null) {
					if (newValue == null) {
						el.removeAttribute("style");
					} else if (typeof newValue === "string") {
						style.cssText = newValue;
					} else {
						for (const styleName in {...value, ...newValue}) {
							const styleValue = value && value[styleName];
							const newStyleValue = newValue && newValue[styleName];
							if (newStyleValue == null) {
								style.removeProperty(styleName);
							} else if (styleValue !== newStyleValue) {
								style.setProperty(styleName, newStyleValue);
							}
						}
					}
				}

				break;
			}
			default: {
				if (namespace === undefined && name in el && !NO_TOUCH.has(name)) {
					(el as any)[name] = newValue;
					break;
				} else if (newValue === true) {
					el.setAttribute(name, "");
				} else if (newValue === false || newValue == null) {
					el.removeAttribute(name);
				} else {
					el.setAttribute(name, newValue);
				}

				break;
			}
		}
	}
}

function updateChildren(
	el: Element,
	newChildren: Array<Node | string>,
	dirtyStart?: number,
	// TODO: use dirtyEnd
): void {
	if (newChildren.length === 0) {
		el.textContent = "";
		return;
	}

	let oldChild: Node | null =
		newChildren[dirtyStart!] === undefined
			? el.firstChild
			: (newChildren[dirtyStart!] as Node);
	let ni = dirtyStart || 0;
	while (oldChild !== null && ni < newChildren.length) {
		const newChild = newChildren[ni];
		if (oldChild === newChild) {
			oldChild = oldChild.nextSibling;
			ni++;
		} else if (typeof newChild === "string") {
			if ((oldChild as any).splitText !== undefined) {
				oldChild.nodeValue = newChild;
				oldChild = oldChild.nextSibling;
			} else {
				el.insertBefore(document.createTextNode(newChild), oldChild);
			}

			ni++;
		} else if ((oldChild as any).splitText !== undefined) {
			const nextSibling = oldChild.nextSibling;
			el.removeChild(oldChild);
			oldChild = nextSibling;
		} else {
			el.insertBefore(newChild, oldChild);
			ni++;
			// TODO: this is an optimization for the js frameworks benchmark
			// swap rows, but we need to think a little more about other
			// pathological cases.
			if (oldChild !== newChildren[ni]) {
				const nextSibling = oldChild.nextSibling;
				el.removeChild(oldChild);
				oldChild = nextSibling;
			}
		}
	}

	while (oldChild !== null) {
		const nextSibling = oldChild.nextSibling;
		el.removeChild(oldChild);
		oldChild = nextSibling;
	}

	for (; ni < newChildren.length; ni++) {
		const newChild = newChildren[ni];
		el.appendChild(
			typeof newChild === "string"
				? document.createTextNode(newChild)
				: newChild,
		);
	}
}

function createDocumentFragmentFromHTML(html: string): DocumentFragment {
	if (typeof document.createRange === "function") {
		return document.createRange().createContextualFragment(html);
	} else {
		const fragment = document.createDocumentFragment();
		const childNodes = new DOMParser().parseFromString(html, "text/html").body
			.childNodes;
		for (let i = 0; i < childNodes.length; i++) {
			fragment.appendChild(childNodes[i]);
		}

		return fragment;
	}
}

// TODO: Environment type should probably be Element | DocumentFragment
export const env: Environment<Element> = {
	[Default](tag: string | symbol): Intrinsic<Element> {
		if (typeof tag !== "string") {
			throw new Error(`Unknown tag: ${tag.toString()}`);
		}

		let cachedEl: Element | undefined;
		return function* defaultDOM(this: HostContext): Generator<Element> {
			const ns =
				tag === "svg" ? SVG_NAMESPACE : (this.scope as string | undefined);
			if (cachedEl === undefined) {
				if (ns == null) {
					cachedEl = document.createElement(tag);
				} else {
					cachedEl = document.createElementNS(ns, tag);
				}
			}

			const el = cachedEl.cloneNode() as Element;
			let props: Record<string, any> = {};
			let oldLength = 0;
			try {
				while (true) {
					// We can’t use referential identity of props because we don’t have any
					// restrictions like elements have to be immutable.
					if (this.dirtyProps) {
						updateProps(el, props, this.props, ns);
					}

					if (
						this.dirtyChildren &&
						this.props.innerHTML === undefined &&
						(oldLength > 0 || this.childValues.length > 0)
					) {
						updateChildren(el, this.childValues, this.dirtyStart);
					}

					props = this.props;
					oldLength = this.childValues.length;
					yield el;
				}
			} finally {
				if (this.dirtyRemoval && el.parentNode !== null) {
					el.parentNode.removeChild(el);
				}
			}
		};
	},
	*[Raw](this: HostContext): Generator<Element> {
		while (true) {
			const {value} = this.props;
			if (typeof value === "string") {
				const fragment = createDocumentFragmentFromHTML(value);
				// TODO: figure out what the type of this Environment actually is
				yield (fragment as unknown) as Element;
			} else {
				yield value;
			}
		}
	},
	*[Portal](this: HostContext): Generator<Element> {
		let {root} = this.props;
		try {
			while (true) {
				const {root: newRoot} = this.props;
				if (newRoot == null) {
					throw new TypeError("Portal element is missing root node");
				}

				if (root !== newRoot) {
					updateChildren(root, []);
					root = newRoot;
				}

				if (this.dirtyChildren) {
					updateChildren(root, this.childValues);
				}

				yield root;
			}
		} finally {
			updateChildren(root, []);
		}
	},
	[Scopes]: {
		svg: SVG_NAMESPACE,
		foreignObject: undefined,
	},
};

export class DOMRenderer extends Renderer<Element> {
	constructor() {
		super(env);
	}
}

export const renderer = new DOMRenderer();
