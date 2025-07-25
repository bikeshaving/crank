import {
	Children,
	Context,
	ElementValue,
	Portal,
	Renderer,
	RenderAdapter,
} from "./crank.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export const adapter: Partial<RenderAdapter<Node, string>> = {
	scope({
		scope: xmlns,
		tag,
		props,
	}: {
		scope: string | undefined;
		tag: string | symbol;
		props: Record<string, any>;
	}): string | undefined {
		switch (tag) {
			case Portal:
				// TODO: read the namespace from the portal root element
				xmlns = undefined;
				break;
			case "svg":
				xmlns = SVG_NAMESPACE;
				break;
		}

		return props.xmlns || xmlns;
	},

	create({
		tag,
		scope: xmlns,
	}: {
		tag: string | symbol;
		scope: string | undefined;
	}): Node {
		if (typeof tag !== "string") {
			throw new Error(`Unknown tag: ${String(tag)}`);
		} else if (tag.toLowerCase() === "svg") {
			xmlns = SVG_NAMESPACE;
		}

		return xmlns
			? document.createElementNS(xmlns, tag)
			: document.createElement(tag);
	},

	adopt({
		node,
		tag,
	}: {
		node: Node;
		tag: string | symbol;
	}): Array<Node> | undefined {
		if (typeof tag !== "string" && tag !== Portal) {
			throw new Error(`Unknown tag: ${String(tag)}`);
		}

		// TODO: check props for mismatches and warn
		if (
			typeof tag === "string" &&
			(node.nodeType !== Node.ELEMENT_NODE ||
				tag.toUpperCase() !== (node as Element).tagName.toUpperCase())
		) {
			console.error(`Expected <${tag}> while hydrating but found: `, node);
			return undefined;
		}

		return Array.from(node.childNodes);
	},

	patch({
		node,
		name,
		value,
		oldValue,
		scope: xmlns,
	}: {
		node: Node;
		name: string;
		value: unknown;
		oldValue: unknown;
		scope: string | undefined;
	}): void {
		if (node.nodeType !== Node.ELEMENT_NODE) {
			throw new TypeError(
				`Cannot patch node of type ${node.nodeType}. Expected Element.`,
			);
		}

		const element = node as Element;
		const isSVG = xmlns === SVG_NAMESPACE;
		const colonIndex = name.indexOf(":");
		if (colonIndex !== -1) {
			const ns = name.slice(0, colonIndex);
			const name1 = name.slice(colonIndex + 1);
			switch (ns) {
				case "prop":
					(node as any)[name1] = value;
					return;
				case "attr":
					if (value == null || value === false) {
						element.removeAttribute(name1);
					} else if (value === true) {
						element.setAttribute(name1, "");
					} else if (typeof value === "string") {
						element.setAttribute(name1, value);
					} else {
						element.setAttribute(name, String(value));
					}
					return;
			}
		}
		switch (name) {
			case "style": {
				const style: CSSStyleDeclaration = (element as HTMLElement).style;
				if (style == null) {
					element.setAttribute("style", value as string);
				} else if (value == null || value === false) {
					element.removeAttribute("style");
				} else if (value === true) {
					element.setAttribute("style", "");
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
					element.setAttribute("class", "");
				} else if (value == null) {
					element.removeAttribute("class");
				} else if (!isSVG) {
					if (element.className !== value) {
						(element as any)["className"] = value;
					}
				} else if (element.getAttribute("class") !== value) {
					element.setAttribute("class", value as string);
				}
				break;
			case "innerHTML":
				if (value !== oldValue) {
					element.innerHTML = value as any;
				}

				break;
			default: {
				if (
					name[0] === "o" &&
					name[1] === "n" &&
					name[2] === name[2].toUpperCase() &&
					typeof value === "function"
				) {
					// Support React-style event names (onClick, onChange, etc.)
					name = name.toLowerCase();
				}

				if (
					name in element &&
					// boolean properties will coerce strings, but sometimes they map to
					// enumerated attributes, where truthy strings ("false", "no") map to
					// falsy properties, so we use attributes in this case.
					!(
						typeof value === "string" &&
						typeof (element as any)[name] === "boolean"
					)
				) {
					// walk up the object's prototype chain to find the owner of the
					// named property
					let obj = element;
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
						if ((element as any)[name] !== value || oldValue === undefined) {
							(element as any)[name] = value;
						}
						return;
					}

					// if the property wasn't writable, fall through to the code below
					// which uses setAttribute() instead of assigning directly.
				}

				if (value === true) {
					value = "";
				} else if (value == null || value === false) {
					element.removeAttribute(name);
					return;
				}

				if (element.getAttribute(name) !== value) {
					element.setAttribute(name, value as any);
				}
			}
		}
	},

	arrange({
		tag,
		node,
		props,
		children,
		oldProps,
	}: {
		tag: string | symbol;
		node: Node;
		props: Record<string, any>;
		children: Array<Node>;
		oldProps: Record<string, any> | undefined;
	}): void {
		if (tag === Portal && (node == null || typeof node.nodeType !== "number")) {
			throw new TypeError(
				`<Portal> root is not a node. Received: ${String(node)}`,
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
			("children" in props || (oldProps && "children" in oldProps))
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

				// append excess children
				for (; i < children.length; i++) {
					const newChild = children[i];
					node.insertBefore(newChild, oldChild);
				}
			}
		}
	},

	remove({node, parent}: {node: Node; parent: Node}): void {
		if (node.parentNode === parent) {
			parent.removeChild(node);
		}
	},

	text({
		text,
		hydration,
		value,
	}: {
		text: string;
		hydration: Array<Node> | undefined;
		value: Node | undefined;
	}): Node {
		if (hydration != null) {
			let value = hydration.shift();
			if (!value || value.nodeType !== Node.TEXT_NODE) {
				console.error(`Expected "${text}" while hydrating but found:`, value);
			} else {
				// value is a text node, check if it matches the expected text
				const textData = (value as Text).data;
				if (textData.length > text.length) {
					if (textData.startsWith(text)) {
						// the text node is longer than the expected text, so we
						// reuse the existing text node, but truncate it and unshift the rest
						(value as Text).data = text;
						hydration.unshift(
							document.createTextNode(textData.slice(text.length)),
						);

						return value;
					}
				} else if (textData === text) {
					return value;
				}

				console.error(`Expected "${text}" while hydrating but found:`, value);
			}
		}

		if (value != null) {
			if ((value as Text).data !== text) {
				(value as Text).data = text;
			}

			return value;
		}

		return document.createTextNode(text);
	},

	raw({
		value,
		scope: xmlns,
		hydration,
	}: {
		value: string | Node;
		scope: string | undefined;
		hydration: Array<Node> | undefined;
	}): ElementValue<Node> {
		let nodes: Array<Node>;
		if (typeof value === "string") {
			const el =
				xmlns == null
					? document.createElement("div")
					: document.createElementNS(xmlns, "svg");
			el.innerHTML = value;
			nodes = Array.from(el.childNodes);
		} else {
			nodes = value == null ? [] : Array.isArray(value) ? [...value] : [value];
		}

		if (hydration != null) {
			for (let i = 0; i < nodes.length; i++) {
				const node = nodes[i];
				// check if node is equal to the next node in the hydration array
				const hydrated = hydration.shift();
				try {
					if (node.isEqualNode(hydrated as any)) {
						nodes[i] = hydrated as Node;
					} else {
						console.error(`Node does not match hydration: `, node, hydrated);
					}
				} catch (err) {
					console.error(
						`Error comparing nodes during hydration:\n${err}`,
						node,
						hydrated,
					);
				}
			}
		}

		return nodes.length === 0
			? undefined
			: nodes.length === 1
				? nodes[0]
				: nodes;
	},
};

export class DOMRenderer extends Renderer<Node, string> {
	constructor() {
		super(adapter);
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
		throw new TypeError(`Render root is not a node. Received: ${String(root)}`);
	}
}

export const renderer = new DOMRenderer();

declare global {
	module Crank {
		interface EventMap extends GlobalEventHandlersEventMap {}
	}
}
