import {
	Children,
	Context,
	ElementValue,
	HydrationData,
	Portal,
	Renderer,
	RendererImpl,
} from "./crank.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export const impl: Partial<RendererImpl<Node, string>> = {
	scope(
		xmlns: string | undefined,
		tag: string | symbol,
		props: Record<string, any>
	): string | undefined {
		switch (tag) {
			case Portal:
				xmlns = undefined;
				break;
			case "svg":
				xmlns = SVG_NAMESPACE;
				break;
		}

		return props.xmlns || xmlns;
	},

	create(
		tag: string | symbol,
		_props: unknown,
		xmlns: string | undefined,
	): Node {
		if (typeof tag !== "string") {
			throw new Error(`Unknown tag: ${tag.toString()}`);
		} else if (tag.toLowerCase() === "svg") {
			xmlns = SVG_NAMESPACE;
		}

		return xmlns
			? document.createElementNS(xmlns, tag)
			: document.createElement(tag);
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
			// TODO: consider pros and cons of hydration warnings
			//console.error(`Expected <${tag}> while hydrating but found:`, node);
			return undefined;
		}

		const children: Array<string | Element> = [];
		for (let i = 0; i < node.childNodes.length; i++) {
			const child = node.childNodes[i];
			if (child.nodeType === Node.TEXT_NODE) {
				children.push((child as Text).data);
			} else if (child.nodeType === Node.ELEMENT_NODE) {
				children.push(child as Element);
			}
		}

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
		xmlns: string | undefined,
	): void {
		const isSVG = xmlns === SVG_NAMESPACE;
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
						if ((node as any)[name] !== value || oldValue === undefined) {
							(node as any)[name] = value;
						}
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

	text(
		text: string,
		_scope: string | undefined,
		hydrationData: HydrationData<Element> | undefined,
	): string {
		if (hydrationData != null) {
			let value = hydrationData.children.shift();
			if (typeof value !== "string" || !value.startsWith(text)) {
				// TODO: consider pros and cons of hydration warnings
				//console.error(`Expected "${text}" while hydrating but found:`, value);
			} else if (text.length < value.length) {
				value = value.slice(text.length);
				hydrationData.children.unshift(value);
			}
		}

		return text;
	},

	raw(
		value: string | Node,
		xmlns: string | undefined,
		hydrationData: HydrationData<Element> | undefined,
	): ElementValue<Node> {
		let result: ElementValue<Node>;
		if (typeof value === "string") {
			const el =
				xmlns == null
					? document.createElement("div")
					: document.createElementNS(xmlns, "svg");
			el.innerHTML = value;
			if (el.childNodes.length === 0) {
				result = undefined;
			} else if (el.childNodes.length === 1) {
				result = el.childNodes[0];
			} else {
				result = Array.from(el.childNodes);
			}
		} else {
			result = value;
		}

		if (hydrationData != null) {
			// TODO: maybe we should warn on incorrect values
			if (Array.isArray(result)) {
				for (let i = 0; i < result.length; i++) {
					const node = result[i];
					if (
						typeof node !== "string" &&
						(node.nodeType === Node.ELEMENT_NODE ||
							node.nodeType === Node.TEXT_NODE)
					) {
						hydrationData.children.shift();
					}
				}
			} else if (result != null && typeof result !== "string") {
				if (
					result.nodeType === Node.ELEMENT_NODE ||
					result.nodeType === Node.TEXT_NODE
				) {
					hydrationData.children.shift();
				}
			}
		}

		return result;
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
