import {
	Children,
	Context,
	Element as CrankElement,
	ElementValue,
	Portal,
	Renderer,
} from "./index";

declare module "./index" {
	interface EventMap extends GlobalEventHandlersEventMap {}
}

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export class DOMRenderer extends Renderer<Node, string | undefined> {
	render(
		children: Children,
		root: Node,
		ctx?: Context,
	): Promise<ElementValue<Node>> | ElementValue<Node> {
		if (!(root instanceof Node)) {
			throw new TypeError("root is not a node");
		}

		return super.render(children, root, ctx);
	}

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
	}

	scope(
		el: CrankElement<string | symbol>,
		scope: string | undefined,
	): string | undefined {
		switch (el.tag) {
			case Portal:
			case "foreignObject":
				return undefined;
			case "svg":
				return SVG_NAMESPACE;
			default:
				return scope;
		}
	}

	create(el: CrankElement<string | symbol>, ns: string | undefined): Node {
		if (typeof el.tag !== "string") {
			throw new Error(`Unknown tag: ${el.tag.toString()}`);
		}

		if (el.tag === "svg") {
			ns = SVG_NAMESPACE;
		}

		return ns
			? document.createElementNS(ns, el.tag)
			: document.createElement(el.tag);
	}

	patch(
		el: CrankElement<string | symbol>,
		node: Element,
		ns: string | undefined,
	): void {
		for (let name in el.props) {
			let forceAttribute = false;
			const value = el.props[name];
			switch (name) {
				case "children":
					break;
				case "style": {
					const style: CSSStyleDeclaration = (node as any).style;
					if (style == null) {
						node.setAttribute("style", value);
					} else {
						if (value == null) {
							node.removeAttribute("style");
						} else if (typeof value === "string") {
							style.cssText = value;
						} else {
							for (const styleName in value) {
								const styleValue = value && value[styleName];
								if (styleValue == null) {
									style.removeProperty(styleName);
								} else {
									style.setProperty(styleName, styleValue);
								}
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
					} else if (!ns) {
						(node as any)["className"] = value;
					} else {
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
					} else if (!forceAttribute && !ns && name in node) {
						(node as any)[name] = value;
					} else if (value === true) {
						node.setAttribute(name, "");
					} else if (value === false) {
						node.removeAttribute(name);
					} else {
						node.setAttribute(name, value);
					}
				}
			}
		}
	}

	arrange(
		el: CrankElement<string | symbol>,
		parent: Node,
		children: Array<Node | string>,
	): void {
		if (el.tag === Portal && !(parent instanceof Node)) {
			throw new TypeError("Portal root is not a node");
		}

		if (
			!("innerHTML" in el.props) &&
			(children.length !== 0 || (parent as any).__cranky)
		) {
			if (children.length === 0) {
				parent.textContent = "";
				return;
			}

			let oldChild = parent.firstChild;
			let i = 0;
			while (oldChild !== null && i < children.length) {
				const newChild = children[i];
				if (oldChild === newChild) {
					oldChild = oldChild.nextSibling;
					i++;
				} else if (typeof newChild === "string") {
					if (oldChild.nodeType === Node.TEXT_NODE) {
						oldChild.nodeValue = newChild;
						oldChild = oldChild.nextSibling;
					} else {
						parent.insertBefore(document.createTextNode(newChild), oldChild);
					}

					i++;
				} else if (oldChild.nodeType === Node.TEXT_NODE) {
					const nextSibling = oldChild.nextSibling;
					parent.removeChild(oldChild);
					oldChild = nextSibling;
				} else {
					parent.insertBefore(newChild, oldChild);
					i++;
					// TODO: this is an optimization for the js frameworks benchmark swap rows, but we need to think a little more about other cases like prepending.
					if (oldChild !== children[i]) {
						const nextSibling = oldChild.nextSibling;
						parent.removeChild(oldChild);
						oldChild = nextSibling;
					}
				}
			}

			while (oldChild !== null) {
				const nextSibling = oldChild.nextSibling;
				parent.removeChild(oldChild);
				oldChild = nextSibling;
			}

			for (; i < children.length; i++) {
				const newChild = children[i];
				parent.appendChild(
					typeof newChild === "string"
						? document.createTextNode(newChild)
						: newChild,
				);
			}

			if (children.length > 0) {
				(parent as any).__cranky = true;
			} else if ((parent as any).__cranky) {
				(parent as any).__cranky = false;
			}
		}
	}
}

export const renderer = new DOMRenderer();
