import {Repeater, SlidingBuffer} from "@repeaterjs/repeater";

// TODO: make this non-global?
declare global {
	namespace JSX {
		interface IntrinsicElements {
			[name: string]: any;
		}

		// typescript children stuff is busted:
		// https://github.com/microsoft/TypeScript/issues/14729
		// https://github.com/microsoft/TypeScript/pull/29818
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
	childOrChildren: Child | Children
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
	...children: Children[]
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

export interface Children extends Iterable<Children | Child> {}

export type ViewChild = ComponentView | IntrinsicView | string | undefined;

// TODO: use a left-child right-sibling tree
export abstract class View {
	children: ViewChild[] = [];
	// TODO: parameterize Node
	node?: Node;
	parent?: View;

	// TODO: parameterize Node
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

	abstract commit(): void;

	abstract render(elem: Element): Promise<void> | void;

	// TODO: allow async unmount
	abstract unmount(): void;

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

			i++;
			view = this.children[i];
		}

		while (i < this.children.length) {
			if (typeof view === "object") {
				view.unmount();
			}

			delete this.children[i];
			i++;
			view = this.children[i];
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
	// TODO: parameterize Node
	(Node | string)[] | Node | string
>;

export type AsyncComponentIterator = AsyncIterator<
	Element,
	Element | void,
	// TODO: parameterize Node
	(Node | string)[] | Node | string
>;

export function* createIter(
	controller: Controller,
	tag: SyncFunctionComponent,
): SyncComponentIterator {
	for (const props of controller) {
		yield tag.call(controller, props);
	}
}

export async function* createAsyncIter(
	controller: Controller,
	tag: AsyncFunctionComponent,
): AsyncComponentIterator {
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
			this.commit();
			const nodes = this.nodes;
			const next = nodes.length <= 1 ? nodes[0] : nodes;
			this.promise = this.pull(this.asyncIter!.next(next));
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
		if (isIterator(child)) {
			const result = child.next();
			if (isPromiseLike(result)) {
				this.publish();
				this.asyncIter = child as AsyncComponentIterator;
				return (this.promise = this.pull(result));
			} else {
				this.iter = child as SyncComponentIterator;
				return this.renderChildren(
					isElement(result.value) ? [result.value] : [],
				);
			}
		} else if (isPromiseLike(child)) {
			this.asyncIter = createAsyncIter(this.controller, this.tag as any);
			const resultP = child.then((value) => ({value, done: false}));
			return (this.promise = this.pull(resultP));
		} else {
			this.iter = createIter(this.controller, this.tag as any);
			return this.renderChildren([child]);
		}
	}

	update(): Promise<void> | void {
		if (this.iter === undefined && this.asyncIter === undefined) {
			return this.initialize();
		}

		if (this.asyncIter !== undefined) {
			this.publish();
			return this.promise;
		} else if (this.iter !== undefined) {
			const nodes = this.nodes;
			const next = nodes.length <= 1 ? nodes[0] : nodes;
			const result = this.iter.next(next);
			const p = this.renderChildren(
				isElement(result.value) ? [result.value] : [],
			);
			if (p !== undefined) {
				return p;
			}

			this.commit();
		} else {
			throw new Error("Invalid state");
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
		this.renderChildren([]);
		for (const publication of this.publications) {
			publication.stop();
		}
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
	// TODO: parameterize Node
	node?: Node;
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
		view.unmount();
		renderViews.delete(container);
	} else {
		const p = view.render(elem);
		if (isPromiseLike(p)) {
			return p.then(() => view);
		}
	}

	return view;
}
