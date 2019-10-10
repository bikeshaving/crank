import {Repeater, SlidingBuffer} from "@repeaterjs/repeater";

// TODO: make this non-global?
declare global {
	namespace JSX {
		interface IntrinsicElements {
			[name: string]: any;
		}

		// typescript jsx children type checking is busted so we just opt out of it:
		// https://github.com/microsoft/TypeScript/issues/14729
		// https://github.com/microsoft/TypeScript/pull/29818
		type ElementChildrenAttribute = {};
	}
}

function isPromiseLike(value: any): value is PromiseLike<unknown> {
	return value != null && typeof value.then === "function";
}

function isIteratorOrAsyncIterator(
	value: any,
): value is
	| AsyncIterator<unknown, unknown, unknown>
	| Iterator<unknown, unknown, unknown> {
	return value != null && typeof value.next === "function";
}

function isIterable(value: any): value is Iterable<unknown> {
	return value != null && typeof value[Symbol.iterator] === "function";
}

export interface Props {
	[key: string]: any;
	children?: Iterable<Child>;
}

export interface IntrinsicProps {
	[key: string]: any;
	children: (Node | string)[];
}

export type Tag<TProps extends Props = Props> = Component<TProps> | string;

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

export function* flattenChildren(
	childOrChildren: Child | Children,
): Iterable<Child> {
	if (isIterable(childOrChildren)) {
		for (const child of childOrChildren) {
			if (
				child == null ||
				typeof child === "string" ||
				typeof child === "number" ||
				typeof child === "boolean" ||
				isElement(child)
			) {
				yield child;
			} else if (isIterable(child)) {
				yield* flattenChildren(child);
			} else {
				throw new TypeError("Unknown child type");
			}
		}
	} else {
		yield childOrChildren;
	}
}

export function createElement<T extends Tag>(
	tag: T,
	props?: Props | null,
	...children: (Child | Children)[]
): Element<T>;
export function createElement<T extends Tag>(
	tag: T,
	props?: Props | null,
): Element<T> {
	props = Object.assign({}, props);
	if (arguments.length > 3) {
		props.children = flattenChildren(Array.from(arguments).slice(2));
	} else if (arguments.length > 2) {
		props.children = flattenChildren(arguments[2]);
	}

	return {sigil: ElementSigil, tag, props};
}

// TODO: rename to Node?
export type Child = Element | string | number | boolean | null | undefined;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Children extends Iterable<Child | Children> {}

export type ViewChild = ComponentView | IntrinsicView | string | undefined;

// TODO: use a left-child right-sibling tree
export abstract class View {
	children: ViewChild[] = [];
	// TODO: parameterize Node
	node?: Node;
	parent?: View;
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

	abstract render(elem: Element): Promise<void> | void;

	abstract commit(): void;

	// TODO: allow async unmount
	abstract unmount(): void;

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

	protected renderChildren(children: Iterable<Child>): Promise<void> | void {
		const promises: Promise<void>[] = [];
		let i = 0;
		let view = this.children[i];
		for (const elem of children) {
			if (
				view === undefined ||
				elem === null ||
				typeof view !== "object" ||
				typeof elem !== "object" ||
				view.tag !== elem.tag
			) {
				if (typeof view === "object") {
					// TODO: allow unmount to be async
					view.unmount();
				}

				view = this.createViewChild(elem);
				this.children[i] = view;
			}

			if (
				typeof view === "object" &&
				elem !== null &&
				typeof elem === "object"
			) {
				const p = view.render(elem);
				if (p !== undefined) {
					promises.push(p);
				}
			}

			view = this.children[++i];
		}

		while (i < this.children.length) {
			if (typeof view === "object") {
				view.unmount();
			}

			delete this.children[i];
			view = this.children[++i];
		}

		if (promises.length) {
			return Promise.all(promises).then(() => {});
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
	// TODO: parameterize Node
	(Node | string)[] | Node | string
>;

export type AsyncComponentIterator = AsyncIterator<
	Element,
	Element | void,
	// TODO: parameterize Node
	(Node | string)[] | Node | string
>;

export function* createIterator(
	controller: Controller,
	tag: (this: Controller, props: Props) => Element,
): SyncComponentIterator {
	for (const props of controller) {
		yield tag.call(controller, props);
	}
}

export async function* createAsyncIterator(
	controller: Controller,
	tag: (this: Controller, props: Props) => PromiseLike<Element>,
): AsyncComponentIterator {
	for await (const props of controller) {
		yield tag.call(controller, props);
	}
}

export type ComponentIterator = AsyncComponentIterator | SyncComponentIterator;

export type Component<TProps extends Props = Props> = (
	this: Controller,
	props: TProps,
) => ComponentIterator | PromiseLike<Element> | Element;

interface Publication {
	push(value: Props): void;
	stop(): void;
}

class ComponentView extends View {
	private controller = new Controller(this);
	tag: Component;
	props: Props;
	private iter?: ComponentIterator;
	private promise?: Promise<void>;
	private publications: Set<Publication> = new Set();
	constructor(elem: Element, public parent: View) {
		super();
		if (typeof elem.tag !== "function") {
			throw new TypeError("Tag mismatch");
		}

		this.tag = elem.tag;
		this.props = elem.props;
	}

	async pull(resultP: PromiseLike<IteratorResult<Element>>): Promise<void> {
		const result = await resultP;
		if (!result.done) {
			await this.renderChildren(isElement(result.value) ? [result.value] : []);
			// TODO: only commit if this is a non-update resolution
			this.commit();
			const nodes = this.nodes;
			const next = nodes.length <= 1 ? nodes[0] : nodes;
			this.promise = this.pull((this.iter as any).next(next));
		}
	}

	subscribe(): Repeater<Props> {
		return new Repeater(async (push, stop) => {
			const publication = {push, stop};
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

	initialize(): Promise<void> | void {
		const child:
			| AsyncComponentIterator
			| SyncComponentIterator
			| PromiseLike<Element>
			| Element = this.tag.call(this.controller, this.props);
		if (isIteratorOrAsyncIterator(child)) {
			const result = child.next();
			if (isPromiseLike(result)) {
				this.publish();
				this.iter = child;
				this.promise = this.pull(result);
				return this.promise;
			} else {
				this.iter = child;
				return this.renderChildren(
					isElement(result.value) ? [result.value] : [],
				);
			}
		} else if (isPromiseLike(child)) {
			this.iter = createAsyncIterator(this.controller, this.tag as any);
			this.promise = this.pull(child.then((value) => ({value, done: false})));
			return this.promise;
		} else {
			this.iter = createIterator(this.controller, this.tag as any);
			return this.renderChildren([child]);
		}
	}

	update(): Promise<void> | void {
		if (this.iter === undefined) {
			return this.initialize();
		}

		if (this.promise === undefined) {
			const nodes = this.nodes;
			const next = nodes.length <= 1 ? nodes[0] : nodes;
			const result = this.iter.next(next) as IteratorResult<Element>;
			const p = this.renderChildren(
				isElement(result.value) ? [result.value] : [],
			);
			if (p !== undefined) {
				return p;
			}
		} else {
			this.publish();
			return this.promise;
		}
	}

	render(elem: Element): Promise<void> | void {
		if (this.tag !== elem.tag) {
			throw new TypeError("Tag mismatch");
		}

		this.props = elem.props;
		return this.update();
	}

	commit(): void {
		this.parent.commit();
	}

	unmount(): void {
		for (const publication of this.publications) {
			publication.stop();
		}

		this.renderChildren([]);
	}
}

class IntrinsicController {
	constructor(private view: IntrinsicView) {}

	// TODO: parameterize IntrinsicProps
	*[Symbol.iterator](): Generator<IntrinsicProps> {
		while (true) {
			yield {...this.view.props, children: this.view.nodes};
		}
	}
}

export class IntrinsicView extends View {
	private controller = new IntrinsicController(this);
	tag: string;
	props: Props = {};
	iter?: Iterator<Node>;
	constructor(elem: Element, public parent: View) {
		super();
		if (typeof elem.tag !== "string") {
			throw new TypeError("Tag mismatch");
		}

		this.tag = elem.tag;
	}

	render(elem: Element): Promise<void> | void {
		if (this.tag !== elem.tag) {
			throw new TypeError("Tag mismatch");
		}

		this.props = elem.props;
		const children =
			elem.props.children === undefined ? [] : elem.props.children;
		const p = this.renderChildren(children);
		if (p !== undefined) {
			return p;
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

	unmount(): void {
		if (this.iter !== undefined) {
			if (typeof this.iter.return === "function") {
				this.iter.return();
			}

			delete this.iter;
		}

		this.renderChildren([]);
		delete this.node;
	}
}

export type Intrinsic = (
	this: IntrinsicController,
	props: Props,
	// TODO: parameterize Node
	children: (Node | string)[],
) => Iterator<Node>;

export class RootView extends View {
	constructor(public node: HTMLElement) {
		super();
	}

	render(elem: Element): Promise<void> | void {
		const p = this.renderChildren([elem]);
		if (p !== undefined) {
			return p.then(() => this.commit());
		}

		this.commit();
	}

	commit(): void {
		// TODO: abstract this
		updateDOMChildren(this.node, this.nodes);
	}

	unmount(): void {
		this.renderChildren([]);
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

function createBasicIntrinsic(tag: string): Intrinsic {
	return function* intrinsic(this: IntrinsicController): Iterator<Node> {
		const el = document.createElement(tag);
		for (const {children, ...props} of this) {
			updateDOMProps(el, props);
			updateDOMChildren(el, children);
			yield el;
		}
	};
}

const views: WeakMap<Node, RootView> = new WeakMap();
export function render(
	elem: Element | null | undefined,
	container: HTMLElement,
): Promise<RootView> | RootView {
	let view: RootView;
	if (views.has(container)) {
		view = views.get(container)!;
	} else {
		view = new RootView(container);
		views.set(container, view);
	}

	if (elem == null) {
		view.unmount();
		views.delete(container);
	} else {
		const p = view.render(elem);
		if (isPromiseLike(p)) {
			return p.then(() => view);
		}
	}

	return view;
}
