import {MaybePromise} from "../pledge";
import {
	Context,
	Default,
	Element,
	Environment,
	Intrinsic,
	Props,
	Renderer,
	Root,
} from "../crank";

export function updateDOMProps(
	el: HTMLElement,
	props: Props,
	newProps: Props,
): void {
	for (let name in Object.assign({}, props, newProps)) {
		if (name === "children") {
			continue;
		} else if (name === "className") {
			name = "class";
		}
		// TODO: throw an error if event props are found

		const value = props[name];
		const newValue = newProps[name];
		if (name === "style") {
			if (typeof newValue === "string") {
				el.setAttribute("style", newValue);
			} else {
				for (const styleName in Object.assign({}, value, newValue)) {
					const styleValue =
						newValue[styleName] == null ? "" : newValue[styleName];
					if (styleName in el.style) {
						(el.style as any)[styleName] = styleValue;
					} else {
						el.style.setProperty(styleName, styleValue);
					}
				}
			}
		} else if (name in el) {
			// TODO: check that there isn’t both innerHTML and children
			(el as any)[name] = newValue;
		} else {
			name = name.toLowerCase();
			if (newValue === true) {
				el.setAttribute(name, "");
			} else if (newValue === false || newValue == null) {
				el.removeAttribute(name);
			} else {
				el.setAttribute(name, newValue);
			}
		}
	}
}

// TODO: improve this algorithm
// https://stackoverflow.com/questions/59418120/what-is-the-most-efficient-way-to-update-the-childnodes-of-a-dom-node-with-an-ar
export function updateDOMChildren(
	el: HTMLElement,
	children: (Node | string)[] = [],
): void {
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

export const env: Environment<HTMLElement> = {
	[Default](tag: string): Intrinsic<HTMLElement> {
		return function* defaultDOM(this: Context, props): Generator<HTMLElement> {
			const node = document.createElement(tag);
			for (const newProps of this) {
				updateDOMProps(node, props, newProps);
				if (!("innerHTML" in newProps)) {
					updateDOMChildren(node, this.childNodes);
				}

				yield node;
				props = newProps;
			}
		};
	},
	*[Root](this: Context, {node}): Generator<HTMLElement> {
		try {
			for (const {node: newNode} of this) {
				if (node !== newNode) {
					updateDOMChildren(node);
					node = newNode;
				}

				updateDOMChildren(node, this.childNodes);
				yield node;
			}
		} finally {
			updateDOMChildren(node);
		}
	},
};

export class DOMRenderer extends Renderer<HTMLElement> {
	env = env;
}

export const renderer = new DOMRenderer();

export function render(
	elem: Element | null | undefined,
	node: HTMLElement,
): MaybePromise<Context | undefined> {
	return renderer.render(elem, node);
}
