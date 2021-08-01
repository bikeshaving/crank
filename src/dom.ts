import {
	Children,
	Context,
	ElementValue,
	Portal,
	Renderer,
	RendererImpl,
} from "./crank";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const impl: Partial<RendererImpl<Node, string>> = {
	parse(text: string): DocumentFragment {
		if (typeof document.createRange === "function") {
			return document.createRange().createContextualFragment(text);
		} else {
			const fragment = document.createDocumentFragment();
			const childNodes = new DOMParser().parseFromString(text, "text/html").body
				.childNodes;
			for (let i = 0; i < childNodes.length; i++) {
				fragment.appendChild(childNodes[i]);
			}

			return fragment;
		}
	},

	scope(scope: string, tag: string | symbol): string | undefined {
		// TODO: Should we handle xmlns?
		switch (tag) {
			case Portal:
			case "foreignObject":
				return undefined;
			case "svg":
				return SVG_NAMESPACE;
			default:
				return scope;
		}
	},

	create(tag: string | symbol, _props: unknown, ns: string | undefined): Node {
		if (typeof tag !== "string") {
			throw new Error(`Unknown tag: ${tag.toString()}`);
		} else if (tag === "svg") {
			ns = SVG_NAMESPACE;
		}

		return ns ? document.createElementNS(ns, tag) : document.createElement(tag);
	},

	patch(
		_tag: string | symbol,
		node: Element,
		props: Record<string, any>,
		oldProps: Record<string, any> = {},
	): void {
		const isSVG = node.namespaceURI === SVG_NAMESPACE;
		for (let name in {...oldProps, ...props}) {
			let forceAttribute = false;
			const value = props[name];
			switch (name) {
				case "children":
					break;
				case "style": {
					const style: CSSStyleDeclaration = (node as HTMLElement | SVGElement)
						.style;
					if (style == null) {
						node.setAttribute("style", value);
					} else if (value == null) {
						node.removeAttribute("style");
					} else if (typeof value === "string") {
						if (style.cssText !== value) {
							style.cssText = value;
						}
					} else {
						const oldValue = oldProps.style;
						for (const styleName in {...oldValue, ...value}) {
							const styleValue = value && value[styleName];
							if (styleValue == null) {
								style.removeProperty(styleName);
							} else if (style.getPropertyValue(styleName) !== styleValue) {
								style.setProperty(styleName, styleValue);
							}
						}
					}

					break;
				}
				case "class":
				case "className":
					if (value === true) {
						node.setAttribute("class", "");
					} else if (!value) {
						node.removeAttribute("class");
					} else if (!isSVG) {
						if (node.className !== value) {
							(node as any)["className"] = value;
						}
					} else if (node.getAttribute("class") !== value) {
						node.setAttribute("class", value);
					}
					break;
				// Gleaned from:
				// https://github.com/preactjs/preact/blob/05e5d2c0d2d92c5478eeffdbd96681c96500d29f/src/diff/props.js#L111-L117
				// TODO: figure out why we use setAttribute for each of these
				case "form":
				case "list":
				case "type":
				case "size":
					forceAttribute = true;
				// fallthrough
				default: {
					if (value == null) {
						node.removeAttribute(name);
					} else if (
						typeof value === "function" ||
						typeof value === "object" ||
						(!forceAttribute && !isSVG && name in node)
					) {
						if ((node as any)[name] !== value) {
							(node as any)[name] = value;
						}
					} else if (value === true) {
						node.setAttribute(name, "");
					} else if (value === false) {
						node.removeAttribute(name);
					} else if (node.getAttribute(name) !== value) {
						node.setAttribute(name, value);
					}
				}
			}
		}
	},

	arrange(
		tag: string | symbol,
		node: Node,
		props: Record<string, any>,
		children: Array<Element | string>,
		_oldProps: Record<string, any> | undefined,
		oldChildren: Array<Element | string> | undefined,
	): void {
		if (tag === Portal && (node == null || typeof node.nodeType !== "number")) {
			throw new TypeError(
				`Portal root is not a node. Received: ${JSON.stringify(
					node && node.toString(),
				)}`,
			);
		}

		if (
			!("innerHTML" in props) &&
			("children" in props || (oldChildren && oldChildren.length))
		) {
			if (children.length === 0) {
				node.textContent = "";
			} else {
				let oldChild = node.firstChild;
				let i = 0;
				while (oldChild !== null && i < children.length) {
					const newChild = children[i];
					if (oldChild === newChild) {
						oldChild = oldChild.nextSibling;
						i++;
					} else if (typeof newChild === "string") {
						if (oldChild.nodeType === Node.TEXT_NODE) {
							if ((oldChild as Text).data !== newChild) {
								(oldChild as Text).data = newChild;
							}

							oldChild = oldChild.nextSibling;
						} else {
							node.insertBefore(document.createTextNode(newChild), oldChild);
						}

						i++;
					} else if (oldChild.nodeType === Node.TEXT_NODE) {
						const nextSibling = oldChild.nextSibling;
						node.removeChild(oldChild);
						oldChild = nextSibling;
					} else {
						node.insertBefore(newChild, oldChild);
						i++;
						// TODO: This is an optimization but we need to think a little more about other cases like prepending.
						if (oldChild !== children[i]) {
							const nextSibling = oldChild.nextSibling;
							node.removeChild(oldChild);
							oldChild = nextSibling;
						}
					}
				}

				while (oldChild !== null) {
					const nextSibling = oldChild.nextSibling;
					node.removeChild(oldChild);
					oldChild = nextSibling;
				}

				for (; i < children.length; i++) {
					const newChild = children[i];
					node.appendChild(
						typeof newChild === "string"
							? document.createTextNode(newChild)
							: newChild,
					);
				}
			}
		}
	},
};

export class DOMRenderer extends Renderer<Node, string> {
	constructor() {
		super(impl);
	}

	render(
		children: Children,
		root: Node,
		ctx?: Context,
	): Promise<ElementValue<Node>> | ElementValue<Node> {
		if (root == null || typeof root.nodeType !== "number") {
			throw new TypeError(
				`Render root is not a node. Received: ${JSON.stringify(
					root && root.toString(),
				)}`,
			);
		}

		return super.render(children, root, ctx);
	}
}

export const renderer = new DOMRenderer();

declare global {
	module Crank {
		interface EventMap extends GlobalEventHandlersEventMap {}
	}
}
