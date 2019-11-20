import {
	Committer,
	Default,
	Element,
	Environment,
	Intrinsic,
	Props,
	Renderer,
	Root,
	View,
} from "../crank";

function updateDOMProps(el: HTMLElement, props: Props): void {
	for (const [key, value] of Object.entries(props)) {
		if (key in el) {
			(el as any)[key] = value;
		} else {
			el.setAttribute(key.toLowerCase(), value);
		}
	}
}

function updateDOMChildren(
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

export const env: Environment<Node> = {
	[Default](tag: string): Intrinsic<Node> {
		return function* defaultDOM({children, ...props}): Committer<Node> {
			const node = document.createElement(tag);
			while (true) {
				updateDOMProps(node, props);
				updateDOMChildren(node, children);
				({children, ...props} = yield node);
			}
		};
	},
	*[Root]({node, children}): Committer<Node> {
		try {
			while (true) {
				updateDOMChildren(node, children);
				({node, children} = yield node);
			}
		} finally {
			updateDOMChildren(node);
		}
	},
};

export const renderer = new Renderer([env]);

export function render(
	elem: Element | null | undefined,
	node?: HTMLElement,
): Promise<View<Node>> | View<Node> | undefined {
	return renderer.render(elem, node);
}
