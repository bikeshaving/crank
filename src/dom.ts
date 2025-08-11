import {
	Children,
	Context,
	ElementValue,
	Portal,
	Renderer,
	RenderAdapter,
} from "./crank.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function emitHydrationWarning(
	propName: string,
	quietProps: Set<string> | undefined,
	expectedValue: any,
	actualValue: any,
	element: Element,
	displayName?: string,
) {
	const checkName = propName;
	const showName = displayName || propName;
	if (!quietProps || !quietProps.has(checkName)) {
		if (expectedValue === null || expectedValue === false) {
			console.warn(
				`Expected "${showName}" to be missing but found ${String(actualValue)} while hydrating:`,
				element,
			);
		} else if (expectedValue === true || expectedValue === "") {
			console.warn(
				`Expected "${showName}" to be ${expectedValue === true ? "present" : '""'} but found ${String(actualValue)} while hydrating:`,
				element,
			);
		} else {
			console.warn(
				`Expected "${showName}" to be "${String(expectedValue)}" but found ${String(actualValue)} while hydrating:`,
				element,
			);
		}
	}
}

function isWritableProperty(element: Element, name: string): boolean {
	// walk up the object's prototype chain to find the owner
	let propOwner = element;
	do {
		if (Object.prototype.hasOwnProperty.call(propOwner, name)) {
			break;
		}
	} while ((propOwner = Object.getPrototypeOf(propOwner)));

	if (propOwner === null) {
		return false;
	}

	// get the descriptor for the named property and check whether it implies
	// that the property is writable
	const descriptor = Object.getOwnPropertyDescriptor(propOwner, name);
	if (
		descriptor != null &&
		(descriptor.writable === true || descriptor.set !== undefined)
	) {
		return true;
	}

	return false;
}

export const adapter: Partial<RenderAdapter<Node, string, Element>> = {
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
		tagName,
		scope: xmlns,
	}: {
		tag: string | symbol;
		tagName: string;
		scope: string | undefined;
	}): Node {
		if (typeof tag !== "string") {
			throw new Error(`Unknown tag: ${tagName}`);
		} else if (tag.toLowerCase() === "svg") {
			xmlns = SVG_NAMESPACE;
		}

		return xmlns
			? document.createElementNS(xmlns, tag)
			: document.createElement(tag);
	},

	adopt({
		tag,
		tagName,
		node,
	}: {
		tag: string | symbol;
		tagName: string;
		node: Node | undefined;
	}): Array<Node> | undefined {
		if (typeof tag !== "string" && tag !== Portal) {
			throw new Error(`Unknown tag: ${tagName}`);
		}

		if (
			node == null ||
			(typeof tag === "string" &&
				(node.nodeType !== Node.ELEMENT_NODE ||
					tag.toLowerCase() !== (node as Element).tagName.toLowerCase()))
		) {
			console.warn(`Expected <${tagName}> while hydrating but found: `, node);
			return;
		}

		return Array.from(node.childNodes);
	},

	patch({
		tagName,
		node,
		props,
		oldProps,
		scope: xmlns,
		copyProps,
		quietProps,
		isHydrating,
	}: {
		node: Node;
		tagName: string;
		props: Record<string, any>;
		oldProps: Record<string, any> | undefined;
		scope: string | undefined;
		copyProps: Set<string> | undefined;
		quietProps: Set<string> | undefined;
		isHydrating: boolean;
	}): void {
		if (node.nodeType !== Node.ELEMENT_NODE) {
			throw new TypeError(`Cannot patch node: ${String(node)}`);
		} else if (props.class && props.className) {
			console.error(
				`Both "class" and "className" set in props for <${tagName}>. Use one or the other.`,
			);
		}

		const element = node as Element;
		const isSVG = xmlns === SVG_NAMESPACE;
		for (let name in {...oldProps, ...props}) {
			let value = props[name];
			const oldValue = oldProps ? oldProps[name] : undefined;
			{
				if (copyProps != null && copyProps.has(name)) {
					continue;
				}
				// handle prop:name or attr:name properties
				const colonIndex = name.indexOf(":");
				if (colonIndex !== -1) {
					const [ns, name1] = [
						name.slice(0, colonIndex),
						name.slice(colonIndex + 1),
					];
					switch (ns) {
						case "prop":
							(node as any)[name1] = value;
							continue;
						case "attr":
							if (value == null || value === false) {
								if (isHydrating && element.hasAttribute(name1)) {
									emitHydrationWarning(
										name,
										quietProps,
										value,
										element.getAttribute(name1),
										element,
									);
								}
								element.removeAttribute(name1);
							} else if (value === true) {
								if (isHydrating && !element.hasAttribute(name1)) {
									emitHydrationWarning(name, quietProps, value, null, element);
								}
								element.setAttribute(name1, "");
							} else if (typeof value !== "string") {
								value = String(value);
							}

							if (isHydrating && element.getAttribute(name1) !== value) {
								emitHydrationWarning(
									name,
									quietProps,
									value,
									element.getAttribute(name1),
									element,
								);
							}

							element.setAttribute(name1, String(value));
							continue;
					}
				}
			}

			switch (name) {
				case "style": {
					const style = (element as HTMLElement | SVGElement).style;
					if (value == null || value === false) {
						if (isHydrating && style.cssText !== "") {
							emitHydrationWarning(
								name,
								quietProps,
								value,
								style.cssText,
								element,
							);
						}
						element.removeAttribute("style");
					} else if (value === true) {
						if (isHydrating && style.cssText !== "") {
							emitHydrationWarning(
								name,
								quietProps,
								"",
								style.cssText,
								element,
							);
						}
						element.setAttribute("style", "");
					} else if (typeof value === "string") {
						if (style.cssText !== value) {
							if (isHydrating) {
								emitHydrationWarning(
									name,
									quietProps,
									value,
									style.cssText,
									element,
								);
							}

							style.cssText = value;
						}
					} else {
						if (typeof oldValue === "string") {
							// if the old value was a string, we need to clear the style
							// TODO: only clear the styles enumerated in the old value
							style.cssText = "";
						}

						for (const styleName in {...oldValue, ...value}) {
							const styleValue = value && (value as any)[styleName];
							if (styleValue == null) {
								if (isHydrating && style.getPropertyValue(styleName) !== "") {
									emitHydrationWarning(
										name,
										quietProps,
										null,
										style.getPropertyValue(styleName),
										element,
										`style.${styleName}`,
									);
								}
								style.removeProperty(styleName);
							} else if (style.getPropertyValue(styleName) !== styleValue) {
								if (isHydrating) {
									emitHydrationWarning(
										name,
										quietProps,
										styleValue,
										style.getPropertyValue(styleName),
										element,
										`style.${styleName}`,
									);
								}
								style.setProperty(styleName, styleValue);
							}
						}
					}

					break;
				}
				case "class":
				case "className":
					if (value === true) {
						if (isHydrating && element.getAttribute("class") !== "") {
							emitHydrationWarning(
								name,
								quietProps,
								"",
								element.getAttribute("class"),
								element,
							);
						}
						element.setAttribute("class", "");
					} else if (value == null) {
						if (isHydrating && element.hasAttribute("class")) {
							emitHydrationWarning(
								name,
								quietProps,
								value,
								element.getAttribute("class"),
								element,
							);
						}

						element.removeAttribute("class");
					} else if (typeof value === "object") {
						// class={{"included-class": true, "excluded-class": false}} syntax
						if (typeof oldValue === "string") {
							// if the old value was a string, we need to clear all classes
							element.setAttribute("class", "");
						}

						let shouldIssueWarning = false;
						const hydratingClasses = isHydrating
							? new Set(Array.from(element.classList))
							: undefined;
						const hydratingClassName = isHydrating
							? element.getAttribute("class")
							: undefined;

						for (const className in {...oldValue, ...value}) {
							const classValue = value && value[className];
							if (classValue) {
								element.classList.add(className);
								if (hydratingClasses && hydratingClasses.has(className)) {
									hydratingClasses.delete(className);
								} else if (isHydrating) {
									shouldIssueWarning = true;
								}
							} else {
								element.classList.remove(className);
							}
						}

						if (
							shouldIssueWarning ||
							(hydratingClasses && hydratingClasses.size > 0)
						) {
							emitHydrationWarning(
								name,
								quietProps,
								Object.keys(value)
									.filter((k) => value[k])
									.join(" "),
								hydratingClassName || "",
								element,
							);
						}
					} else if (!isSVG) {
						if (element.className !== value) {
							if (isHydrating) {
								emitHydrationWarning(
									name,
									quietProps,
									value,
									element.className,
									element,
								);
							}
							element.className = value;
						}
					} else if (element.getAttribute("class") !== value) {
						if (isHydrating) {
							emitHydrationWarning(
								name,
								quietProps,
								value,
								element.getAttribute("class"),
								element,
							);
						}
						element.setAttribute("class", value as string);
					}
					break;
				case "innerHTML":
					if (value !== oldValue) {
						if (isHydrating) {
							emitHydrationWarning(
								name,
								quietProps,
								value,
								element.innerHTML,
								element,
							);
						}
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

					// try to set the property directly
					if (
						name in element &&
						// boolean properties will coerce strings, but sometimes they map to
						// enumerated attributes, where truthy strings ("false", "no") map to
						// falsy properties, so we force using setAttribute.
						!(
							typeof value === "string" &&
							typeof (element as any)[name] === "boolean"
						) &&
						isWritableProperty(element, name)
					) {
						if ((element as any)[name] !== value || oldValue === undefined) {
							if (
								isHydrating &&
								typeof (element as any)[name] === "string" &&
								(element as any)[name] !== value
							) {
								emitHydrationWarning(
									name,
									quietProps,
									value,
									(element as any)[name],
									element,
								);
							}
							// if the property is writable, assign it directly
							(element as any)[name] = value;
						}

						continue;
					}

					if (value === true) {
						value = "";
					} else if (value == null || value === false) {
						if (isHydrating && element.hasAttribute(name)) {
							emitHydrationWarning(
								name,
								quietProps,
								value,
								element.getAttribute(name),
								element,
							);
						}

						element.removeAttribute(name);
						continue;
					}

					if (element.getAttribute(name) !== value) {
						if (isHydrating) {
							emitHydrationWarning(
								name,
								quietProps,
								value,
								element.getAttribute(name),
								element,
							);
						}

						element.setAttribute(name, value as any);
					}
				}
			}
		}
	},

	arrange({
		tag,
		node,
		props,
		children,
	}: {
		tag: string | symbol;
		node: Node;
		props: Record<string, any>;
		children: Array<Node>;
	}): void {
		if (tag === Portal && (node == null || typeof node.nodeType !== "number")) {
			throw new TypeError(
				`<Portal> root is not a node. Received: ${String(node)}`,
			);
		}

		if (!("innerHTML" in props)) {
			let oldChild = node.firstChild;
			for (let i = 0; i < children.length; i++) {
				const newChild = children[i];
				if (oldChild === newChild) {
					// the child is already in the right place, so we can skip it
					oldChild = oldChild.nextSibling;
				} else {
					node.insertBefore(newChild, oldChild);
				}
			}
		}
	},

	remove({
		node,
		parentNode,
		isNested,
	}: {
		node: Node;
		parentNode: Node;
		isNested: boolean;
	}): void {
		if (!isNested && node.parentNode === parentNode) {
			parentNode.removeChild(node);
		}
	},

	text({
		value,
		oldNode,
		hydrationNodes,
	}: {
		value: string;
		hydrationNodes: Array<Node> | undefined;
		oldNode: Node | undefined;
	}): Node {
		if (hydrationNodes != null) {
			let node = hydrationNodes.shift();
			if (!node || node.nodeType !== Node.TEXT_NODE) {
				console.warn(`Expected "${value}" while hydrating but found:`, node);
			} else {
				// value is a text node, check if it matches the expected text
				const textData = (node as Text).data;
				if (textData.length > value.length) {
					if (textData.startsWith(value)) {
						// the text node is longer than the expected text, so we
						// reuse the existing text node, but truncate it and unshift the rest
						(node as Text).data = value;
						hydrationNodes.unshift(
							document.createTextNode(textData.slice(value.length)),
						);

						return node;
					}
				} else if (textData === value) {
					return node;
				}

				// We log textData and not node because node will be mutated
				console.warn(
					`Expected "${value}" while hydrating but found:`,
					textData,
				);
				oldNode = node;
			}
		}

		if (oldNode != null) {
			if ((oldNode as Text).data !== value) {
				(oldNode as Text).data = value;
			}

			return oldNode;
		}

		return document.createTextNode(value);
	},

	raw({
		value,
		scope: xmlns,
		hydrationNodes,
	}: {
		value: string | Node;
		scope: string | undefined;
		hydrationNodes: Array<Node> | undefined;
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

		if (hydrationNodes != null) {
			for (let i = 0; i < nodes.length; i++) {
				const node = nodes[i];
				// check if node is equal to the next node in the hydration array
				const hydrationNode = hydrationNodes.shift();
				if (
					hydrationNode &&
					typeof hydrationNode === "object" &&
					typeof hydrationNode.nodeType === "number" &&
					node.isEqualNode(hydrationNode as Node)
				) {
					nodes[i] = hydrationNode as Node;
				} else {
					console.warn(
						`Expected <Raw value="${String(value)}"> while hydrating but found:`,
						hydrationNode,
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

export class DOMRenderer extends Renderer<Node, string, Element> {
	constructor() {
		super(adapter);
	}

	render(
		children: Children,
		root: Element,
		ctx?: Context,
	): Promise<ElementValue<Node>> | ElementValue<Node> {
		validateRoot(root);
		return super.render(children, root, ctx);
	}

	hydrate(
		children: Children,
		root: Element,
		ctx?: Context,
	): Promise<ElementValue<Node>> | ElementValue<Node> {
		validateRoot(root);
		return super.hydrate(children, root, ctx);
	}
}

function validateRoot(root: unknown): asserts root is Element {
	if (
		root === null ||
		(typeof root === "object" && typeof (root as any).nodeType !== "number")
	) {
		throw new TypeError(`Render root is not a node. Received: ${String(root)}`);
	} else if ((root as Node).nodeType !== Node.ELEMENT_NODE) {
		throw new TypeError(
			`Render root must be an element node. Received: ${String(root)}`,
		);
	}
}

export const renderer = new DOMRenderer();

declare global {
	module Crank {
		interface EventMap extends GlobalEventHandlersEventMap {}
	}
}
