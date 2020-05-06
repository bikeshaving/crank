import {
	HostContext,
	Default,
	Environment,
	Intrinsic,
	Props,
	Raw,
	Renderer,
	Portal,
} from "./index";

declare module "./index" {
	interface EventMap extends GlobalEventHandlersEventMap {}
}

// TODO: create an allowlist/blocklist of props
function updateProps(
	el: Element,
	props: Record<string, any>,
	newProps: Record<string, any>,
): void {
	for (const name in {...props, ...newProps}) {
		const value = props[name];
		const newValue = newProps[name];
		switch (true) {
			case name === "children":
				break;
			case name === "class":
			case name === "className": {
				el.className = newValue;
				break;
			}
			case name === "style" && "style" in el: {
				const style: CSSStyleDeclaration = (el as any).style;
				if (newValue == null) {
					el.removeAttribute("style");
				} else if (typeof newValue === "string") {
					style.cssText = newValue;
				} else {
					for (const styleName in Object.assign({}, value, newValue)) {
						const styleValue = value && value[styleName];
						const newStyleValue = newValue && newValue[styleName];
						if (newStyleValue == null) {
							style.removeProperty(styleName);
						} else if (styleValue !== newStyleValue) {
							style.setProperty(styleName, newStyleValue);
						}
					}
				}

				break;
			}
			default: {
				if (name in el) {
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

// TODO: improve this algorithm
// https://stackoverflow.com/questions/59418120/what-is-the-most-efficient-way-to-update-the-childnodes-of-a-dom-node-with-an-ar
function updateChildren(el: Element, children: Array<Node | string>): void {
	if (el.childNodes.length === 0) {
		const fragment = document.createDocumentFragment();
		for (let child of children) {
			if (typeof child === "string") {
				child = document.createTextNode(child);
			}

			fragment.appendChild(child);
		}

		el.appendChild(fragment);
		return;
	}

	let oldChild = el.firstChild;
	for (const newChild of children) {
		if (oldChild === null) {
			el.appendChild(
				typeof newChild === "string"
					? document.createTextNode(newChild)
					: newChild,
			);
		} else if (typeof newChild === "string") {
			if (oldChild.nodeType === Node.TEXT_NODE) {
				if (oldChild.nodeValue !== newChild) {
					oldChild.nodeValue = newChild;
				}

				oldChild = oldChild.nextSibling;
			} else {
				el.insertBefore(document.createTextNode(newChild), oldChild);
			}
		} else if (oldChild !== newChild) {
			el.insertBefore(newChild, oldChild);
		} else {
			oldChild = oldChild.nextSibling;
		}
	}

	while (oldChild !== null) {
		const nextSibling = oldChild.nextSibling;
		el.removeChild(oldChild);
		oldChild = nextSibling;
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

// TODO: Element should be ParentNode maybe?
export const env: Environment<Element> = {
	[Default](tag: string): Intrinsic<Element> {
		return function* defaultDOM(this: HostContext): Generator<Element> {
			const node = document.createElement(tag);
			let props: Props = {};
			let nextProps: Props;
			let children: Array<Element | string> = [];
			let nextChildren: Array<Element | string>;
			for ({children: nextChildren, ...nextProps} of this) {
				updateProps(node, props, nextProps);
				props = nextProps;
				if (
					!("innerHTML" in nextProps) &&
					(children.length > 0 || nextChildren.length > 0)
				) {
					updateChildren(node, nextChildren);
					children = nextChildren;
				}

				yield node;
			}
		};
	},
	[Raw]({value}): Element {
		if (typeof value === "string") {
			// TODO: figure out what the type of element should actually be
			return (createDocumentFragmentFromHTML(value) as unknown) as Element;
		} else {
			return value;
		}
	},
	*[Portal](this: HostContext, {root}): Generator<Element> {
		if (root == null) {
			throw new TypeError("Portal element is missing root node");
		}

		try {
			for (const {root: newRoot, children} of this) {
				if (newRoot == null) {
					throw new TypeError("Portal element is missing root node");
				}

				if (root !== newRoot) {
					updateChildren(root, []);
					root = newRoot;
				}

				updateChildren(root, children);
				yield root;
			}
		} finally {
			updateChildren(root, []);
		}
	},
};

export class DOMRenderer extends Renderer<Element> {
	constructor() {
		super(env);
	}
}

export const renderer = new DOMRenderer();
