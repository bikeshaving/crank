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

export abstract class View {
	children: ViewChild[] = [];

	get nodes(): (Node | string)[] {
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

	createViewChild(elem: Element | string): ViewChild {
		if (typeof elem === "string") {
			return elem;
		} else if (typeof elem.tag === "string") {
			return new IntrinsicView(elem, this);
		} else {
			return new ComponentView(elem, this);
		}
	}

	reconcile(elems: Child[]): void {
		const max = Math.max(this.children.length, elems.length);
		for (let i = 0; i < max; i++) {
			const view = this.children[i];
			const elem = elems[i];
			if (view == null) {
				if (elem != null) {
					this.children[i] = this.createViewChild(elem);
				}
			} else if (elem == null) {
				if (typeof view !== "string") {
					view.update();
				}

				delete this.children[i];
			} else if (
				typeof view === "string" ||
				typeof elem === "string" ||
				view.tag !== elem.tag
			) {
				if (typeof view !== "string") {
					view.update();
				}

				this.children[i] = this.createViewChild(elem);
			} else {
				view.update(elem);
			}
		}
	}
}

class ComponentController {
	constructor(private view: ComponentView) {}
}

class ComponentView extends View {
	private controller = new ComponentController(this);
	tag: Component;
	constructor(elem: Element, private parent: View) {
		super();
		if (typeof elem.tag !== "function") {
			throw new Error("Component constructor called with intrinsic element");
		}

		this.tag = elem.tag;
		this.update(elem);
	}

	update(elem?: Element): void {}

	commit(): void {}
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
			yield [this.view.props, this.view.nodes];
		}
	}
}

export class IntrinsicView extends View {
	private controller = new IntrinsicController(this);
	tag: string;
	props: Props = {};
	node?: Node;
	protected iter?: Iterator<Node>;
	constructor(elem: Element, private parent: View) {
		super();
		if (typeof elem.tag !== "string") {
			throw new Error("Called intrinsic view with non-string element");
		}

		this.tag = elem.tag;
		this.update(elem);
	}

	update(elem?: Element): void {
		if (elem == null) {
			delete this.node;
			if (this.iter != null) {
				if (typeof this.iter.return === "function") {
					this.iter.return();
				}

				delete this.iter;
			}

			return;
		}

		this.props = elem.props;
		this.reconcile(elem.children);
		this.commit();
	}

	commit(): void {
		if (this.iter == null) {
			const intrinsic = createBasicIntrinsic(this.tag);
			this.iter = intrinsic.call(this.controller, this.props, this.nodes);
		}

		const result = this.iter.next();
		this.node = result.value;
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

export class RootView extends View {
	constructor(public node: HTMLElement) {
		super();
	}

	update(child?: Element): void {
		this.reconcile(child == null ? [] : [child]);
		this.commit();
	}

	commit(): void {
		updateChildren(this.node, this.nodes);
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

	view.update(elem || undefined);
	return view;
}
