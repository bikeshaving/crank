function isPromiseLike(value: any): value is PromiseLike<unknown> {
	return value != null && typeof value.then === "function";
}

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
	return {
		tag,
		props: Object.assign({}, props),
		children: children.flat(Infinity),
	};
}

// TODO: rename to Node?
export type Text = string | number;
export type Child = Element | Text | boolean | null | undefined;

export interface Children extends Array<Children | Child> {}

export type ViewChild = ComponentView | IntrinsicView | string | undefined;

export abstract class View {
	children: ViewChild[] = [];

	get nodes(): (Node | string)[] {
		let buffer: string | undefined;
		const nodes: (Node | string)[] = [];
		for (const child of this.children) {
			if (child != null) {
				if (typeof child === "string") {
					buffer = buffer === undefined ? child : buffer + child;
				} else {
					if (buffer !== undefined) {
						nodes.push(buffer);
						buffer = undefined;
					}

					if (child instanceof IntrinsicView) {
						if (child.node != null) {
							nodes.push(child.node);
						}
					} else if (child instanceof ComponentView) {
						nodes.push(...child.nodes);
					}
				}
			}
		}

		if (buffer !== undefined) {
			nodes.push(buffer);
		}

		return nodes;
	}

	private createViewChild(child: Child): ViewChild {
		if (child == null || typeof child == "boolean") {
			return undefined;
		} else if (typeof child === "string" || typeof child === "number") {
			return child.toString();
		} else if (typeof child.tag === "string") {
			return new IntrinsicView(child, this);
		} else if (typeof child.tag === "function") {
			return new ComponentView(child, this);
		} else {
			throw new TypeError("unknown child type");
		}
	}

	abstract reconcile(elem: Element): Promise<void> | void;

	abstract destroy(): void;

	protected reconcileChildren(children: Child[]): Promise<void> | void {
		const max = Math.max(this.children.length, children.length);
		const promises: Promise<void>[] = [];
		for (let i = 0; i < max; i++) {
			let view = this.children[i];
			const elem = children[i];
			if (
				view === undefined ||
				elem === null ||
				typeof view !== "object" ||
				typeof elem !== "object" ||
				view.tag !== elem.tag
			) {
				if (typeof view === "object") {
					view.destroy();
				}

				view = this.createViewChild(elem);
				this.children[i] = view;
			}

			if (
				typeof view === "object" &&
				elem !== null &&
				typeof elem === "object"
			) {
				const p = view.reconcile(elem);
				if (p !== undefined) {
					promises.push(p);
				}
			}
		}

		if (promises.length) {
			return Promise.all(promises).then(() => {});
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
			throw new TypeError("Tag mismatch");
		}

		this.tag = elem.tag;
	}

	reconcile(elem: Element): Promise<void> | void {
		if (this.tag !== elem.tag) {
			throw new TypeError("Tag mismatch");
		}

		const child = this.tag.call(this.controller, elem.props, ...elem.children);
		if (isPromiseLike(child)) {
			return Promise.resolve(child).then((child) => {
				return this.reconcileChildren([child]);
			});
		} else {
			return this.reconcileChildren([child]);
		}
	}

	destroy(): void {
		this.reconcileChildren([]);
	}
}

export type Component<TProps extends Props = Props> = (
	this: ComponentController,
	// TODO: how do we parameterize this type
	props: TProps,
	...children: Child[]
) => PromiseLike<Element> | Element;

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
			throw new TypeError("Tag mismatch");
		}

		this.tag = elem.tag;
	}

	reconcile(elem: Element): Promise<void> | void {
		if (this.tag !== elem.tag) {
			throw new TypeError("Tag mismatch");
		}

		const p = this.reconcileChildren(elem.children);
		this.props = elem.props;
		if (p !== undefined) {
			return p.then(() => this.commit());
		}

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

	destroy(): void {
		delete this.node;
		if (this.iter != null) {
			if (typeof this.iter.return === "function") {
				this.iter.return();
			}

			delete this.iter;
		}

		this.reconcileChildren([]);
	}
}

export type Intrinsic = (
	this: IntrinsicController,
	props: Props,
	children: (Node | string)[],
) => Iterator<Node>;

export class RootView extends View {
	constructor(public node: HTMLElement) {
		super();
	}

	reconcile(elem: Element): Promise<void> | void {
		const p = this.reconcileChildren([elem]);
		if (p !== undefined) {
			return p.then(() => this.commit());
		}

		this.commit();
	}

	commit(): void {
		updateDOMChildren(this.node, this.nodes);
	}

	destroy(): void {
		this.reconcileChildren([]);
	}
}

function updateDOMProps(el: HTMLElement, props: Props): void {
	for (const [key, value] of Object.entries(props)) {
		if (key in el) {
			(el as any)[key] = value;
		} else {
			el.setAttribute(key.toLowerCase(), value);
		}
	}
}

function updateDOMChildren(el: HTMLElement, children: (Node | string)[]): void {
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
				if (oldChild.nodeValue !== newChild) {
					oldChild.nodeValue = newChild;
				}
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
				updateDOMProps(el, props);
				updateDOMChildren(el, children);
				yield el;
			}
		} finally {
			el.remove();
		}
	};
}

const renderViews: WeakMap<Node, RootView> = new WeakMap();
export function render(
	elem: Element | null | undefined,
	container: HTMLElement,
): Promise<RootView> | RootView {
	let view: RootView;
	if (renderViews.has(container)) {
		view = renderViews.get(container)!;
	} else {
		view = new RootView(container);
		renderViews.set(container, view);
	}

	if (elem == null) {
		view.destroy();
	} else {
		const p = view.reconcile(elem);
		if (p !== undefined) {
			return p.then(() => view);
		}
	}

	return view;
}
