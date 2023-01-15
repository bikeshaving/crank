import {
	Children,
	Context,
	ElementValue,
	HydrationData,
	Portal,
	Renderer,
	RendererImpl,
} from "./core.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

interface DOMScope {
	xmlns: string | undefined;
}

export const impl: Partial<RendererImpl<Node, DOMScope>> = {
	parse(text: string): ElementValue<Node> {
		if (typeof document.createRange === "function") {
			const fragment = document.createRange().createContextualFragment(text);
			return Array.from(fragment.childNodes);
		} else {
			const childNodes = new DOMParser().parseFromString(text, "text/html").body
				.childNodes;
			return Array.from(childNodes);
		}
	},

	scope(scope: DOMScope | undefined, tag: string | symbol): DOMScope {
		scope = scope || {xmlns: ""};
		let xmlns = scope.xmlns;
		// TODO: Should we handle xmlns???
		switch (tag) {
			case Portal:
			case "foreignObject":
				xmlns = undefined;
				break;
			case "svg":
				xmlns = SVG_NAMESPACE;
				break;
		}

		return {xmlns};
	},

	create(
		tag: string | symbol,
		_props: unknown,
		scope: DOMScope | undefined,
	): Node {
		let ns: string | undefined = scope ? scope.xmlns : undefined;
		if (typeof tag !== "string") {
			throw new Error(`Unknown tag: ${tag.toString()}`);
		} else if (tag.toLowerCase() === "svg") {
			ns = SVG_NAMESPACE;
		}

		return ns ? document.createElementNS(ns, tag) : document.createElement(tag);
	},

	hydrate(
		tag: string | symbol,
		node: Element,
		props: Record<string, unknown>,
	): HydrationData<Element> | undefined {
		if (typeof tag !== "string" && tag !== Portal) {
			throw new Error(`Unknown tag: ${tag.toString()}`);
		}

		if (
			typeof tag === "string" &&
			tag.toUpperCase() !== (node as Element).tagName
		) {
			return undefined;
		}

		const children = Array.from(node.children);
		// TODO: extract props from nodes
		return {props, children};
	},

	patch(
		_tag: string | symbol,
		// TODO: Why does this assignment work?
		node: HTMLElement | SVGElement,
		name: string,
		// TODO: Stricter typings?
		value: unknown,
		oldValue: unknown,
		scope: DOMScope | undefined,
	): void {
		const isSVG = scope && scope.xmlns === SVG_NAMESPACE;
		switch (name) {
			case "style": {
				const style: CSSStyleDeclaration = node.style;
				if (style == null) {
					node.setAttribute("style", value as string);
				} else if (value == null || value === false) {
					node.removeAttribute("style");
				} else if (value === true) {
					node.setAttribute("style", "");
				} else if (typeof value === "string") {
					if (style.cssText !== value) {
						style.cssText = value;
					}
				} else {
					if (typeof oldValue === "string") {
						style.cssText = "";
					}

					for (const styleName in {...(oldValue as {}), ...(value as {})}) {
						const styleValue = value && (value as any)[styleName];
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
				} else if (value == null) {
					node.removeAttribute("class");
				} else if (!isSVG) {
					if (node.className !== value) {
						(node as any)["className"] = value;
					}
				} else if (node.getAttribute("class") !== value) {
					node.setAttribute("class", value as string);
				}
				break;
			case "innerHTML":
				if (value !== oldValue) {
					node.innerHTML = value as any;
				}

				break;
			default: {
				if (
					name in node &&
					// boolean properties will coerce strings, but sometimes they map to
					// enumerated attributes, where truthy strings ("false", "no") map to
					// falsy properties, so we use attributes in this case.
					!(
						typeof value === "string" &&
						typeof (node as any)[name] === "boolean"
					)
				) {
					// walk up the object's prototype chain to find the owner of the
					// named property
					let obj = node;
					do {
						if (Object.prototype.hasOwnProperty.call(obj, name)) {
							break;
						}
					} while ((obj = Object.getPrototypeOf(obj)));

					// get the descriptor for the named property and check whether it
					// implies that the property is writable
					const descriptor = Object.getOwnPropertyDescriptor(obj, name);
					if (
						descriptor != null &&
						(descriptor.writable === true || descriptor.set !== undefined)
					) {
						(node as any)[name] = value;
						return;
					}

					// if the property wasn't writable, fall through to the code below
					// which uses setAttribute() instead of assigning directly.
				}

				if (value === true) {
					value = "";
				} else if (value == null || value === false) {
					node.removeAttribute(name);
					return;
				}

				if (node.getAttribute(name) !== value) {
					node.setAttribute(name, value as any);
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
			// We don’t want to update elements without explicit children (<div/>),
			// because these elements sometimes have child nodes added via raw
			// DOM manipulations.
			// However, if an element has previously rendered children, we clear the
			// them because it would be surprising not to clear Crank managed
			// children, even if the new element does not have explicit children.
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

				// remove excess DOM nodes
				while (oldChild !== null) {
					const nextSibling = oldChild.nextSibling;
					node.removeChild(oldChild);
					oldChild = nextSibling;
				}

				// append excess children
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

export class DOMRenderer extends Renderer<Node, DOMScope> {
	constructor() {
		super(impl);
	}

	render(
		children: Children,
		root: Node,
		ctx?: Context,
	): Promise<ElementValue<Node>> | ElementValue<Node> {
		validateRoot(root);
		return super.render(children, root, ctx);
	}

	hydrate(
		children: Children,
		root: Node,
		ctx?: Context,
	): Promise<ElementValue<Node>> | ElementValue<Node> {
		validateRoot(root);
		return super.hydrate(children, root, ctx);
	}
}

function validateRoot(root: unknown): asserts root is Node {
	if (
		root === null ||
		(typeof root === "object" && typeof (root as any).nodeType !== "number")
	) {
		throw new TypeError(
			`Render root is not a node. Received: ${JSON.stringify(
				root && root.toString(),
			)}`,
		);
	}
}

export const renderer = new DOMRenderer();

declare global {
	module Crank {
		interface EventMap extends GlobalEventHandlersEventMap {}
	}
}
