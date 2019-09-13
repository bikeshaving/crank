export type Props = Record<string, any>;
export type Tag = Component | string;
export type Component = (
	this: ComponentController,
  // TODO: how do we parameterize this type
	props: Props,
	...children: Child[]
) => Element;

function isPromiseLike(value: any): value is PromiseLike<unknown> {
	return value != null && typeof value.then === "function";
}

function isIterable(value: any): value is Iterable<unknown> {
	return value != null && typeof value[Symbol.iterator] === "function";
}

function isAsyncIterable(value: any): value is AsyncIterable<unknown> {
	return value != null && typeof value[Symbol.asyncIterator] === "function";
}

export interface Element<T extends Tag = Tag> {
	tag: T;
	props: Props;
	children: Child[];
}

export type Child = Element | string | null | undefined;

declare global {
	namespace JSX {
		interface IntrinsicElements {
			[name: string]: any;
		}
	}
}

export type ViewChild = ComponentView | IntrinsicView | string | undefined;

// Components are called with a controller as the value of this.
class ComponentController {
	constructor(view: ComponentView) {}

	reconcile(): void {}
}

class ComponentView implements Element {
	constructor(
		public tag: Component,
		public props: Props,
		public children: Child[],
		private parent: ComponentView | IntrinsicView | RootView,
	) {}

	reconcile(props: Props, children: Child[]): void {}

	commit(): void {}

	destroy(): void {}
}

const iViews: WeakMap<IntrinsicController, IntrinsicView> = new WeakMap();
class IntrinsicController {
	constructor(view: IntrinsicView) {
		iViews.set(this, view);
	}

	*[Symbol.iterator](): Generator<[Props, (Node | string)[]]> {
		const view = iViews.get(this);
		if (view == null) {
			throw new Error("Missing view");
		}

		while (true) {
			yield [view.props, view.childNodes];
		}
	}
}

export type Intrinsic = (
	this: IntrinsicController,
	props: Props,
	children: (Node | string)[],
) => Iterator<Node>;

export class IntrinsicView implements Element {
	props: Props = {};
	children: ViewChild[] = [];
	private controller = new IntrinsicController(this);
	node?: Node;
	protected iter?: Iterator<Node>;
	constructor(
		public tag: string,
		props: Props,
		children: Child[],
		private parent: ComponentView | IntrinsicView | RootView,
	) {
		this.reconcile(props, children);
	}

	reconcile(props: Props, children: Child[]): void {
		this.props = props;
		const max = Math.max(this.children.length, children.length);
		for (let i = 0; i < max; i++) {
			const oldChild = this.children[i];
			const newChild = children[i];
			if (oldChild == null) {
				if (newChild != null) {
					if (typeof newChild === "string") {
						this.children[i] = newChild;
					} else if (typeof newChild.tag === "string") {
						this.children[i] = new IntrinsicView(
							newChild.tag,
							newChild.props,
							newChild.children,
							this,
						);
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
					this.children[i] = new IntrinsicView(
						newChild.tag,
						newChild.props,
						newChild.children,
						this,
					);
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
					this.children[i] = new IntrinsicView(
						newChild.tag,
						newChild.props,
						newChild.children,
						this,
					);
				} else {
					// TODO: ComponentView
				}
			} else {
				oldChild.reconcile(newChild.props, newChild.children);
			}
		}

		this.commit();
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

	commit(): void {
		if (this.iter == null) {
			const intrinsic = createBasicIntrinsic(this.tag);
			this.iter = intrinsic.call(this.controller, this.props, this.childNodes);
		}

		this.node = this.iter.next().value;
	}

	destroy(): void {
		delete this.node;
		if (this.iter == null) {
			return;
		}

		this.iter.return && this.iter.return().value;
	}
}

export class RootView {
	tag = "";
	props = {};
	child: ComponentView | IntrinsicView | undefined;
	constructor(public node: Node) {}

	update(elem: Element): void {
		if (this.child == null) {
			if (elem != null) {
				if (typeof elem.tag === "string") {
					this.child = new IntrinsicView(
						elem.tag,
						elem.props,
						elem.children,
						this,
					);
				} else {
					// TODO: ComponentView
				}
			}
		} else if (elem == null) {
			this.child.destroy;
			delete this.child;
		} else if (this.child.tag !== elem.tag) {
			this.child.destroy();
			if (typeof elem.tag === "string") {
				this.child = new IntrinsicView(
					elem.tag,
					elem.props,
					elem.children,
					this,
				);
			} else {
				// TODO: ComponentView
			}
		} else {
			this.child.reconcile(elem.props, elem.children);
		}

		this.commit();
	}

	commit(): void {
    // TODO: does this go in a generator
		if (this.child == null) {
      while (this.node.firstChild) {
        this.node.firstChild.remove();
      }
		} else if (this.child instanceof IntrinsicView) {
      if (this.child.node == null) {
        while (this.node.firstChild) {
          this.node.firstChild.remove();
        }
      } else {
        this.node.appendChild(this.child.node);
      }
		}
	}

	destroy(): void {
		if (this.child != null) {
			this.child.destroy();
		}

		delete this.child;
	}
}

export function createElement<T extends Tag>(
	tag: T,
	props: Props | null,
	...children: Element[]
): Element<T> {
	props = Object.assign({}, props);
	return {tag, props, children};
}

function createBasicIntrinsic(tag: string): Intrinsic {
	return function* intrinsic(
		this: IntrinsicController,
		props: Props,
		children: (Node | string)[],
	): Iterator<Node> {
		const el = document.createElement(tag);
		try {
			for (const attr in props) {
				const value = props[attr];
				(el as any)[attr] = value;
			}

			const fragment = document.createDocumentFragment();
			for (const child of children) {
				fragment.appendChild(
					typeof child === "string" ? document.createTextNode(child) : child,
				);
			}

			el.appendChild(fragment);
			yield el;

			for ([props, children] of this) {
				for (const attr in props) {
					const value = props[attr];
					(el as any)[attr] = value;
				}

				const max = Math.max(el.childNodes.length, children.length);
				// TODO: is this right?
				for (let i = 0; i < max; i++) {
					const oldChild = el.childNodes[i];
					const newChild = children[i];
					if (oldChild == null) {
						if (newChild != null) {
							el.appendChild(
								typeof newChild === "string"
									? document.createTextNode(newChild)
									: newChild,
							);
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
	container: Node,
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
