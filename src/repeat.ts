declare global {
	namespace JSX {
		interface IntrinsicElements {
			[name: string]: any;
		}

		interface ElementChildrenAttribute {}
	}
}

export type Props = Record<string, any>;

export type Tag<TProps extends Props = Props> = Component<Props> | string;

export interface Element<T extends Tag = Tag> {
	tag: T;
	props: Props;
	children: Child[];
}

export function createElement<T extends Tag>(
	tag: T,
	props: Props | null,
	...children: Children
): Element<T> {
	props = Object.assign({}, props);
	return {tag, props, children: children.flat(Infinity)};
}

export type Child = Element | string | null | undefined;

export interface Children extends Array<Children | Child> {}

export type ViewChild = ComponentView | IntrinsicView | string | undefined;

// Components are called with a controller as the value of this.
class ComponentController {
	constructor(private _view: ComponentView) {}
}

class ComponentView {
	tag: Component;
	props?: Props;
	children: Child[] = [];
	constructor(
		elem: Element,
		private parent: ComponentView | IntrinsicView | RootView,
	) {
		if (typeof elem.tag !== "function") {
			throw new Error("Component constructor called with intrinsic element");
		}

		this.tag = elem.tag;
		this.update(elem);
	}

	update(elem: Element): void {}

	commit(): void {}

	destroy(): void {}
}

export type Component<TProps extends Props = Props> = (
	this: ComponentController,
	// TODO: how do we parameterize this type
	props: TProps,
	...children: Child[]
) => Element;

class IntrinsicController {
	constructor(private view: IntrinsicView) {}

	*[Symbol.iterator](): Generator<[Props, (Node | string)[]]> {
		while (true) {
			yield [this.view.props, this.view.childNodes];
		}
	}
}

export class IntrinsicView {
	private controller = new IntrinsicController(this);
	tag: string;
	props: Props = {};
	children: ViewChild[] = [];
	node?: Node;
	protected iter?: Iterator<Node>;
	constructor(
		elem: Element,
		private parent: ComponentView | IntrinsicView | RootView,
	) {
		if (typeof elem.tag !== "string") {
			throw new Error("Called intrinsic view with non-string element");
		}

		this.tag = elem.tag;
		this.update(elem);
	}

	get childNodes(): (Node | string)[] {
		const nodes: (Node | string)[] = [];
		for (const child of this.children) {
			if (typeof child === "string") {
				nodes.push(child);
			} else if (child instanceof IntrinsicView && child.node != null) {
				nodes.push(child.node);
			}
		}

		return nodes;
	}

	update(elem: Element): void {
		this.props = elem.props;
		const max = Math.max(this.children.length, elem.children.length);
		for (let i = 0; i < max; i++) {
			const oldChild = this.children[i];
			const newChild = elem.children[i];
			if (oldChild == null) {
				if (newChild != null) {
					if (typeof newChild === "string") {
						this.children[i] = newChild;
					} else if (typeof newChild.tag === "string") {
						this.children[i] = new IntrinsicView(newChild, this);
					} else {
						// TODO: ComponentView
					}
				}
			} else if (newChild == null) {
				if (typeof oldChild !== "string") {
					oldChild.destroy();
				}

				delete this.children[i];
			} else if (typeof oldChild === "string") {
				if (typeof newChild === "string") {
					this.children[i] = newChild;
				} else if (typeof newChild.tag === "string") {
					this.children[i] = new IntrinsicView(newChild, this);
				} else {
					// TODO: ComponentView
				}
			} else if (typeof newChild === "string") {
				oldChild.destroy();
				this.children[i] = newChild;
			} else if (oldChild.tag !== newChild.tag) {
				oldChild.destroy();
				if (typeof newChild === "string") {
					this.children[i] = newChild;
				} else if (typeof newChild.tag === "string") {
					this.children[i] = new IntrinsicView(newChild, this);
				} else {
					// TODO: ComponentView
				}
			} else {
				oldChild.update(newChild);
			}
		}

		this.commit();
	}

	commit(): void {
		if (this.iter == null) {
			const intrinsic = createBasicIntrinsic(this.tag);
			this.iter = intrinsic.call(this.controller, this.props, this.childNodes);
		}

		const result = this.iter.next();
		this.node = result.value;
	}

	destroy(): void {
		delete this.node;
		if (this.iter == null) {
			return;
		} else if (typeof this.iter.return === "function") {
			this.iter.return();
		}
	}
}

export type Intrinsic = (
	this: IntrinsicController,
	props: Props,
	children: (Node | string)[],
) => Iterator<Node>;

class RootController {
	constructor() {}

	*[Symbol.iterator](): Generator<(Node | string)[]> {}
}

export class RootView {
	tag = "";
	child: ComponentView | IntrinsicView | undefined;
	constructor(public node: HTMLElement) {}

	get childNodes(): (Node | string)[] {
		if (this.child instanceof IntrinsicView && this.child.node != null) {
			return [this.child.node];
		}

		return [];
	}

	update(child: Element | undefined): void {
		// TODO: abstract
		if (this.child == null) {
			if (child != null) {
				if (typeof child.tag === "string") {
					this.child = new IntrinsicView(child, this);
				} else {
					// TODO: ComponentView
				}
			}
		} else if (child == null) {
			this.child.destroy();
			delete this.child;
		} else if (this.child.tag !== child.tag) {
			this.child.destroy();
			if (typeof child.tag === "string") {
				this.child = new IntrinsicView(child, this);
			} else {
				// TODO: ComponentView
			}
		} else {
			this.child.update(child);
		}

		this.commit();
	}

	commit(): void {
		updateChildren(this.node, this.childNodes);
	}

	destroy(): void {
		if (this.child != null) {
			this.child.destroy();
		}

		delete this.child;
	}
}

function updateProps(el: HTMLElement, props: Props): void {
	for (const [key, value] of Object.entries(props)) {
		if (key in el) {
			(el as any)[key] = value;
		} else {
			el.setAttribute(key.toLowerCase(), value);
		}
	}
}

function updateChildren(el: HTMLElement, children: (Node | string)[]): void {
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

	// TODO: is this right?
	const max = Math.max(el.childNodes.length, children.length);
	for (let i = 0; i < max; i++) {
		const oldChild = el.childNodes[i];
		const newChild = children[i];
		if (oldChild == null) {
			if (newChild != null) {
				if (typeof newChild === "string") {
					el.appendChild(document.createTextNode(newChild));
				} else {
					el.appendChild(newChild);
				}
			}
		} else if (newChild == null) {
			el.removeChild(oldChild);
		} else if (typeof newChild === "string") {
			if (oldChild.nodeType === Node.TEXT_NODE) {
				oldChild.nodeValue = newChild;
			} else {
				el.insertBefore(document.createTextNode(newChild), oldChild);
			}
		} else if (oldChild !== newChild) {
			el.insertBefore(newChild, oldChild);
		}
	}
}

function createBasicIntrinsic(tag: string): Intrinsic {
	return function* intrinsic(this: IntrinsicController): Iterator<Node> {
		const el = document.createElement(tag);
		try {
			for (const [props, children] of this) {
				updateProps(el, props);
				updateChildren(el, children);
				yield el;
			}
		} finally {
			el.remove();
		}
	};
}

const views: WeakMap<Node, RootView> = new WeakMap();
export function render(
	elem: Element | null | undefined,
	container: HTMLElement,
): RootView {
	let view: RootView;
	if (views.has(container)) {
		view = views.get(container)!;
	} else {
		view = new RootView(container);
		views.set(container, view);
	}

	if (elem == null) {
		view.destroy();
	} else {
		view.update(elem);
	}

	return view;
}
