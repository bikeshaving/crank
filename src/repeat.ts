import {Repeater, SlidingBuffer} from "@repeaterjs/repeater";
import {createRatchet, Ratchet} from "./ratchet";

declare global {
	namespace JSX {
		interface IntrinsicElements {
			[name: string]: any;
		}

		interface ElementChildrenAttribute {}
	}
}

function isPromiseLike(value: any): value is PromiseLike<unknown> {
	return value != null && typeof value.then === "function";
}

function isIterator(
	value: any,
): value is
	| AsyncIterator<unknown, unknown, unknown>
	| Iterator<unknown, unknown, unknown> {
	return value != null && typeof value.next === "function";
}

export interface Props {
	[key: string]: any;
	children?: Iterable<Element>;
}

export type Tag<TProps extends Props = Props> = Component<Props> | string;

export const ElementSigil: unique symbol = Symbol.for("crank.element");
export type ElementSigil = typeof ElementSigil;

export interface Element<TTag extends Tag = Tag, TProps extends Props = Props> {
	sigil: ElementSigil;
	tag: TTag;
	props: TProps;
}

export function isElement(value: any): value is Element {
	return value != null && value.sigil === ElementSigil;
}

export function createElement<T extends Tag>(
	tag: T,
	props: Props | null,
	...children: Children
): Element<T> {
	props = Object.assign({}, props);
	if (children.length) {
		// TODO: make this a lazy iterator
		props.children = children.flat(Infinity);
	}
	return {sigil: ElementSigil, tag, props};
}

// TODO: rename to Node?
export type Child = Element | string | number | boolean | null | undefined;

export interface Children extends Array<Children | Child> {}

export type ViewChild = ComponentView | IntrinsicView | string | undefined;

export abstract class View {
	children: ViewChild[] = [];

	get nodes(): (Node | string)[] {
		let buffer: string | undefined;
		const nodes: (Node | string)[] = [];
		for (const child of this.children) {
			if (child !== undefined) {
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
		if (child == null || typeof child === "boolean") {
			return undefined;
		} else if (typeof child === "string") {
			return child;
		} else if (typeof child === "number") {
			return child.toString();
		} else if (typeof child.tag === "string") {
			return new IntrinsicView(child, this);
		} else if (typeof child.tag === "function") {
			return new ComponentView(child, this);
		} else {
			throw new TypeError("Unknown child type");
		}
	}

	abstract reconcile(elem: Element): Promise<void> | void;

	abstract destroy(): void;

	protected reconcileChildren(children: Iterable<Child>): Promise<void> | void {
		// TODO: use iterator and maybe something like an iterator zipper instead
		const children1 = Array.from(children);
		const max = Math.max(this.children.length, children1.length);
		const promises: Promise<void>[] = [];
		for (let i = 0; i < max; i++) {
			let view = this.children[i];
			const elem = children1[i];
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
			return Promise.all(promises).then();
		}
	}
}

export class Controller {
	mounted = true;
	constructor(private view: ComponentView) {}

	*[Symbol.iterator](): Generator<Props> {
		while (this.mounted) {
			yield this.view.props;
		}
	}

	[Symbol.asyncIterator](): AsyncGenerator<Props> {
		return this.view.subscribe();
	}

	update(): Promise<void> | void {
		return this.view.update();
	}
}

export type SyncComponentIterator = Iterator<
	Element,
	Element | void,
	(Node | string)[] | Node | string
>;

export type AsyncComponentIterator = AsyncIterator<
	Element,
	Element | void,
	(Node | string)[] | Node | string
>;

function* createIterator(
	controller: Controller,
	first: Element,
	tag: SyncFunctionComponent,
): SyncComponentIterator {
	yield first;
	for (const props of controller) {
		yield tag.call(controller, props);
	}
}

async function* createAsyncIterator(
	controller: Controller,
	first: PromiseLike<Element>,
	tag: AsyncFunctionComponent,
): AsyncComponentIterator {
	yield first;
	for await (const props of controller) {
		yield tag.call(controller, props);
	}
}

export type SyncFunctionComponent<TProps extends Props = Props> = (
	this: Controller,
	props: TProps,
) => Element;

export type AsyncFunctionComponent<TProps extends Props = Props> = (
	this: Controller,
	props: TProps,
) => Promise<Element>;

export type SyncGeneratorComponent<TProps extends Props = Props> = (
	this: Controller,
	props: TProps,
) => SyncComponentIterator;

export type AsyncGeneratorComponent<TProps extends Props = Props> = (
	this: Controller,
	props: TProps,
) => AsyncComponentIterator;

// TODO: use the following code when this issue is fixed:
// https://github.com/microsoft/TypeScript/issues/33815
// export type Component<TProps extends Props = Props> =
// 	| SyncFunctionComponent<TProps>
// 	| AsyncFunctionComponent<TProps>
// 	| SyncGeneratorComponent<TProps>
// 	| AsyncGeneratorComponent<TProps>;
export type Component<TProps extends Props = Props> = (
	this: Controller,
	props: TProps,
) =>
	| AsyncComponentIterator
	| SyncComponentIterator
	| Promise<Element>
	| Element;

interface Publication {
	push(value: Props): void;
	stop(): void;
}

class ComponentView extends View {
	private controller = new Controller(this);
	tag: Component;
	props: Props;
	private iter?: SyncComponentIterator;
	private asyncIter?: AsyncComponentIterator;
	private publications: Set<Publication> = new Set();
	private ratchet?: Ratchet<void> = createRatchet();
	constructor(elem: Element, private parent: View) {
		super();
		if (typeof elem.tag !== "function") {
			throw new TypeError("Tag mismatch");
		}

		this.tag = elem.tag;
		this.props = elem.props;
	}

	reconcile(elem: Element): Promise<void> | void {
		if (this.tag !== elem.tag) {
			throw new TypeError("Tag mismatch");
		}

		this.props = elem.props;
		return this.update();
	}

	update(): Promise<void> | void {
		if (this.iter === undefined && this.asyncIter === undefined) {
			const child:
				| AsyncComponentIterator
				| SyncComponentIterator
				| PromiseLike<Element>
				| Element = this.tag.call(this.controller, this.props);
			if (isIterator(child)) {
				const result = child.next();
				this.publish();
				if (isPromiseLike(result)) {
					this.asyncIter = child as AsyncComponentIterator;
					if (this.ratchet === undefined) {
						this.ratchet = createRatchet();
					}

					const ratchetResult = this.ratchet.next();
					if (ratchetResult.done) {
						return Promise.resolve();
					}

					const [promise, resolve] = ratchetResult.value;
					result.then((result) => {
						resolve(
							this.reconcileChildren(
								isElement(result.value) ? [result.value] : [],
							),
						);
					});

					return promise;
				} else {
					this.iter = child as SyncComponentIterator;
					return this.reconcileChildren(
						isElement(result.value) ? [result.value] : [],
					);
				}
			} else if (isPromiseLike(child)) {
				this.asyncIter = createAsyncIterator(this.controller, child, this
					.tag as AsyncFunctionComponent);
			} else {
				this.iter = createIterator(this.controller, child, this
					.tag as SyncFunctionComponent);
			}
		}

		const nodes = this.nodes;
		const next = nodes.length <= 1 ? nodes[0] : nodes;
		if (this.asyncIter !== undefined) {
			if (this.ratchet === undefined) {
				this.ratchet = createRatchet();
			}

			const ratchetResult = this.ratchet.next();
			if (ratchetResult.done) {
				return Promise.resolve();
			}

			const [promise, resolve] = ratchetResult.value;
			const result = this.asyncIter.next(next);
			this.publish();
			result.then((result) => {
				resolve(
					this.reconcileChildren(isElement(result.value) ? [result.value] : []),
				);
			});

			return promise;
		} else if (this.iter !== undefined) {
			const result = this.iter.next(next);
			return this.reconcileChildren(
				isElement(result.value) ? [result.value] : [],
			);
		} else {
			throw new Error("Invalid state");
		}
	}

	subscribe(): Repeater<Props> {
		return new Repeater(async (push, stop) => {
			const publication: Publication = {push, stop};
			this.publications.add(publication);
			await stop;
			this.publications.delete(publication);
		}, new SlidingBuffer(1));
	}

	publish(): void {
		for (const publication of this.publications) {
			publication.push(this.props);
		}
	}

	destroy(): void {
		this.reconcileChildren([]);
		for (const publication of this.publications) {
			publication.stop();
		}

		if (this.ratchet !== undefined) {
			this.ratchet.return();
		}
	}
}

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
	iter?: Iterator<Node>;
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

		this.props = elem.props;
		const children =
			elem.props.children === undefined ? [] : elem.props.children;
		const p = this.reconcileChildren(children);
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
			if (key !== "children") {
				(el as any)[key] = value;
			}
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
		if (oldChild === undefined) {
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
		if (isPromiseLike(p)) {
			return p.then(() => view);
		}
	}

	return view;
}
