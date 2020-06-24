import {Portal, Renderer, TagProps} from "./index";

declare module "./index" {
	interface EventMap extends GlobalEventHandlersEventMap {}
}

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

// TODO: refine/explain the NO_TOUCH set
// Gleaned from:
// https://github.com/preactjs/preact/blob/05e5d2c0d2d92c5478eeffdbd96681c96500d29f/src/diff/props.js#L111-L117
const NO_TOUCH = new Set(["form", "list", "type", "size"]);

export class DOMRenderer extends Renderer<Node, undefined> {
	scope(
		tag: string | symbol,
		props: Record<string, any>,
		scope: string | undefined,
	): string | undefined {
		switch (tag) {
			case Portal:
			case "foreignObject":
				return undefined;
			case "svg":
				return SVG_NAMESPACE;
			default:
				return scope;
		}
	}

	create<TTag extends string | symbol>(
		tag: TTag,
		props: Record<string, any>,
		ns: string | undefined,
	): Node {
		if (tag === Portal) {
			if (!(props.root instanceof Node)) {
				throw new Error("Portal must have a root of type Node");
			}

			return props.root;
		} else if (typeof tag !== "string") {
			throw new Error(`Unknown tag: ${tag.toString()}`);
		}

		if (tag === "svg") {
			ns = SVG_NAMESPACE;
		}

		if (ns !== undefined) {
			return document.createElementNS(ns, tag);
		}

		return document.createElement(tag);
	}

	patch<TTag extends string | symbol>(
		tag: TTag,
		el: Element,
		props: TagProps<TTag>,
		ns: string | undefined,
	): void {
		for (const name in props) {
			const value = props[name];
			switch (name) {
				case "children":
					break;
				case "class":
				case "className": {
					if (value == null) {
						el.removeAttribute("class");
					} else if (ns === undefined) {
						el.className = value;
					} else {
						el.setAttribute("class", value);
					}

					break;
				}
				case "style": {
					const style: CSSStyleDeclaration = (el as any).style;
					if (style == null) {
						el.setAttribute("style", value);
					} else {
						if (value == null) {
							el.removeAttribute("style");
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
				default: {
					if (ns === undefined && name in el && !NO_TOUCH.has(name)) {
						(el as any)[name] = value;
					} else if (value === true) {
						el.setAttribute(name, "");
					} else if (value === false || value == null) {
						el.removeAttribute(name);
					} else {
						el.setAttribute(name, value);
					}
				}
			}
		}

		if ("innerHTML" in props) {
			(el as any).__crankInnerHTML = "innerHTML" in props;
		} else if ((el as any).__crankInnerHTML) {
			(el as any).__crankInnerHTML = false;
		}
	}

	arrange<TTag extends string | symbol>(
		tag: TTag,
		parent: Node,
		children: Array<Node | string>,
	): void {
		if (parent === undefined) {
			throw new Error("Missing root");
		}

		if (
			!(parent as any).__crankInnerHTML &&
			(children.length !== 0 || (parent as any).__crankArranged)
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
			(parent as any).__crankArranged = children.length > 0;
		}
	}

	escape(text: string): string {
		return text;
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
}

export const renderer = new DOMRenderer();
