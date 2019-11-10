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

function isIterable(value: any): value is Iterable<unknown> {
	return value != null && typeof value[Symbol.iterator] === "function";
}

function isIteratorOrAsyncIterator(
	value: any,
): value is
	| AsyncIterator<unknown, unknown, unknown>
	| Iterator<unknown, unknown, unknown> {
	return value != null && typeof value.next === "function";
}

type MaybePromise<T> = Promise<T> | T;
type MaybePromiseLike<T> = PromiseLike<T> | T;

// control tags are symbols that can be used as element tags which have special behavior during rendering
// TODO: user-defined control tags?
export const Default = Symbol("Default");
export type Default = typeof Default;

export const Root = Symbol("Root");
export type Root = typeof Root;

// TODO: implement these control tags
// TODO: I wonder if the following tags can be implemented without defining a custom function for each tag for every environment
// export const Copy = Symbol("Copy");
// export type Copy = typeof Copy;
//
// export const Fragment = Symbol("Fragment");
// export type Fragment = typeof Fragment;
//
// export const Portal = Symbol("Portal");
// export type Portal = typeof Portal;

export type ControlTag = Root; // | Copy | Fragment | Portal;

export type Tag<TProps extends Props = Props> =
	| Component<TProps>
	| ControlTag
	| string;

// TODO: rename to Node?
export type Child = Element | string | number | boolean | null | undefined;

export interface Children extends Iterable<Child | Children> {}

export interface Props {
	[key: string]: any;
	children?: Child | Children;
}

export const ElementSigil: unique symbol = Symbol.for("crank.element");
export type ElementSigil = typeof ElementSigil;
// TODO: parameterize Props
export interface Element<T extends Tag = Tag> {
	sigil: ElementSigil;
	tag: T;
	props: Props;
}

export function isElement(value: any): value is Element {
	return value != null && value.sigil === ElementSigil;
}

export function* flattenChildren(
	childOrChildren: Child | Children,
): Iterable<Child> {
	if (typeof childOrChildren === "string" || !isIterable(childOrChildren)) {
		yield childOrChildren;
		return;
	}

	for (const child of childOrChildren) {
		yield* flattenChildren(child);
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
		props.children = Array.from(arguments).slice(2);
	} else if (arguments.length > 2) {
		props.children = arguments[2];
	}

	return {sigil: ElementSigil, tag, props};
}

export interface IntrinsicProps {
	[key: string]: any;
	children?: (Node | string)[];
}

export type IntrinsicIterator = Iterator<
	Node | undefined,
	Node | void,
	IntrinsicProps
>;

export type IntrinsicFunction = (props: IntrinsicProps) => IntrinsicIterator;

// TODO: use a left-child right-sibling tree, maybe we want to use an interface like this to make views dumb and performant
//interface Fiber<T> {
//	value: Child;
//	node?: T;
//	child?: Fiber<T>;
//	sibling?: Fiber<T>;
//	parent?: Fiber<T>;
//}
export class View {
	tag: Tag;
	props: Props;
	// TODO: parameterize Node
	private node?: Node;
	private iter?: IntrinsicIterator;
	private result?: IteratorResult<Node | undefined>;
	// These properties are exclusively used to batch intrinsic components with async children. There must be a better way to do this than to define these properties on View.
	private pending: Promise<void | undefined> | void | undefined;
	private enqueued: Promise<void | undefined> | void | undefined;
	private controller?: Controller;
	// TODO: left-child right-sibling tree
	private children: (View | string | undefined)[] = [];
	// whether or not the parent is updating this component or the component is being updated by the parent
	private updating = false;
	// TODO: stop passing env into this thing.
	constructor(elem: Element, private env: Environment, private parent?: View) {
		this.tag = elem.tag;
		this.props = elem.props;
		if (elem.tag === Root && parent !== undefined) {
			throw new TypeError(
				"Root Element must always be the root of an element tree",
			);
		} else if (typeof elem.tag === "function") {
			this.controller = new Controller(this, elem.tag);
		}
	}

	// TODO: cache this or something
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

					if (child instanceof View) {
						if (child.node !== undefined) {
							nodes.push(child.node);
						} else {
							nodes.push(...child.nodes);
						}
					}
				}
			}
		}

		if (buffer !== undefined) {
			nodes.push(buffer);
		}

		return nodes;
	}

	get nodeOrNodes(): (Node | string | undefined) | (Node | string)[] {
		if (this.nodes.length > 1) {
			return this.nodes;
		}

		return this.nodes[0];
	}

	protected intrinsicFor(tag: string | ControlTag): IntrinsicFunction {
		let intrinsic: IntrinsicFunction | undefined;
		if (tag === Root) {
			intrinsic = this.env[tag];
			if (intrinsic == null) {
				throw new Error("Unknown Tag");
			}
		} else if (typeof tag === "string") {
			intrinsic = this.env[tag];
			if (intrinsic == null) {
				intrinsic = this.env[Default](tag);
			}
		} else {
			throw new Error("Unknown Tag");
		}

		return intrinsic;
	}

	private instantiate(child: Child): View | string | undefined {
		if (child == null || typeof child === "boolean") {
			return undefined;
		} else if (typeof child === "string") {
			return child;
		} else if (typeof child === "number") {
			return child.toString();
		} else if (isElement(child)) {
			return new View(child, this.env, this);
		} else {
			throw new TypeError("Unknown child type");
		}
	}

	update(elem: Element): Promise<void> | void {
		if (this.tag !== elem.tag) {
			throw new TypeError("Tag mismatch");
		}

		this.updating = true;
		this.props = elem.props;
		// for component views, children are produced by the component
		if (this.controller !== undefined) {
			return this.controller.refresh();
		} else {
			// for intrinsics, children are passed via props
			if (this.pending === undefined) {
				const update = this.updateChildren(this.props.children);
				if (update === undefined) {
					this.commit();
					return;
				}

				// TODO: turn this pending/enqueued pattern into a higher-order function or something. Also, shouldn’t components similarly use this logic
				this.pending = update.then(() => {
					this.commit();
				});
				return this.pending;
			} else if (this.enqueued === undefined) {
				this.enqueued = this.pending.then(() => {
					this.pending = this.enqueued;
					this.enqueued = undefined;
					const update = this.updateChildren(this.props.children);
					return Promise.resolve(update).then(() => this.commit());
				});
			}

			return this.enqueued;
		}
	}

	updateChildren(children: Child | Children): Promise<void> | void {
		const promises: Promise<void>[] = [];
		let i = 0;
		let view = this.children[i];
		for (const elem of flattenChildren(children)) {
			if (
				view === undefined ||
				elem === null ||
				typeof view !== "object" ||
				typeof elem !== "object" ||
				view.tag !== elem.tag
			) {
				if (typeof view === "object") {
					const p = view.unmount();
					if (p !== undefined) {
						promises.push(p);
					}
				}

				view = this.instantiate(elem);
				this.children[i] = view;
			}

			if (
				typeof view === "object" &&
				elem !== null &&
				typeof elem === "object"
			) {
				const p = view.update(elem);
				if (p !== undefined) {
					promises.push(p);
				}
			}

			view = this.children[++i];
		}

		while (i < this.children.length) {
			if (typeof view === "object") {
				const p = view.unmount();
				if (p !== undefined) {
					promises.push(p);
				}
			}

			delete this.children[i];
			view = this.children[++i];
		}

		if (promises.length) {
			return Promise.all(promises).then(() => {});
		}
	}

	commit(): void {
		if (typeof this.tag === "function") {
			if (!this.updating && this.parent !== undefined) {
				this.parent.commit();
			}
		} else {
			const props = {...this.props, children: this.nodes};
			if (this.iter == null) {
				const intrinsic = this.intrinsicFor(this.tag);
				this.iter = intrinsic(props);
			}

			this.result = (this.iter as IntrinsicIterator).next(props);
			this.node = this.result.value;
		}

		this.updating = false;
	}

	unmount(): Promise<void> | void {
		// TODO: figure out how to merge the logic between controller.unmount and here
		if (this.controller !== undefined) {
			return this.controller.unmount();
		}

		let result: Promise<IteratorResult<any>> | IteratorResult<any> | undefined;
		if (this.result !== undefined && !this.result.done) {
			if (this.iter !== undefined && typeof this.iter.return === "function") {
				result = this.iter.return();
			}
		}

		if (isPromiseLike(result)) {
			return result.then((result) => {
				if (!result.done) {
					throw new Error("Zombie iterator");
				}

				this.result = result;
				return this.updateChildren([]);
			});
		} else if (result !== undefined && !result.done) {
			throw new Error("Zombie iterator");
		}

		this.result = result;
		return this.updateChildren([]);
	}
}

export class Context {
	constructor(private view: View, private controller: Controller) {}

	*[Symbol.iterator](): Generator<Props> {
		while (true) {
			yield this.view.props;
		}
	}

	[Symbol.asyncIterator](): AsyncGenerator<Props> {
		return this.controller.subscribe();
	}

	refresh(): Promise<void> | void {
		return this.controller.refresh();
	}
}

// generator functions will not be able to use this type until
export type ComponentIterator =
	| Iterator<MaybePromise<Child>, MaybePromise<Child | void>, any>
	| AsyncIterator<Child, Child | void, any>;

export type ComponentGenerator =
	| Generator<MaybePromise<Child>, MaybePromise<Child | void>, any>
	| AsyncGenerator<Child, Child | void, any>;

export type ComponentIteratorResult = IteratorResult<
	MaybePromiseLike<Child>,
	MaybePromiseLike<Child | void>
>;

export function* createIterator(
	context: Context,
	tag: (this: Context, props: Props) => Child,
): ComponentGenerator {
	for (const props of context) {
		yield tag.call(context, props);
	}
}

export type Component<TProps extends Props = Props> = (
	this: Context,
	props: TProps,
) => ComponentIterator | MaybePromiseLike<Element>;

interface Publication {
	push(value: Props): unknown;
	stop(): unknown;
}

// TODO: the methods of this class look suspiciously like an iterator, maybe we can make this class extend ComponentIterator and have the pulling/iterating logic on view, or move all updateChildren calls to the Controller consistently.
// A Controller is an iterator or async iterator which updates the children of the view with every iteration. If an iteration is synchronous, it is updated whenever the view is updated. If an iteration is asynchronous, it will update the view on its own time, and further view updates are passed into the iterator asynchronously (how?). If it is synchronous but the children are asynchronous, then this whole sync/async distinction falls apart. Maybe we should just make update uniformly asynchronous?
//
// Things the Controller needs to do:
// - turn sync fn, async fn, sync gen, async gen into an iterator.
// - call the fn/gen with a newly created Context.
// - if the iterator is sync, update the views children whenever an update is scheduled.
// - if the iterator is async, constantly pull values from the iterator and do some other stuff
class Controller {
	private ctx = new Context(this.view, this);
	private iter?: ComponentIterator;
	private result?: ComponentIteratorResult;
	private publications: Set<Publication> = new Set();
	private pulling = false;
	private pending: Promise<void | undefined> | void | undefined;
	private enqueued: Promise<void | undefined> | void | undefined;
	constructor(private view: View, private tag: Component) {}

	subscribe(): AsyncGenerator<Props> {
		return new Repeater(async (push, stop) => {
			const pub = {push, stop};
			this.publications.add(pub);
			await stop;
			this.publications.delete(pub);
		}, new SlidingBuffer(1));
	}

	publish(): void {
		for (const pub of this.publications) {
			pub.push(this.view.props);
		}
	}

	// next(): Promise<ComponentIteratorResult> | ComponentIteratorResult {
	// 	if (this.iter === undefined) {
	// 		return this.initialize1();
	// 	}

	// 	this.publish();
	// 	return this.iter.next();
	// }

	// private initialize1(
	// ): Promise<ComponentIteratorResult> | ComponentIteratorResult {
	// 	if (this.iter !== undefined) {
	// 		throw new Error("Attempting to reinitialize controller");
	// 	}

	// 	const value:
	// 		| ComponentIterator
	// 		| PromiseLike<Element>
	// 		| Element = this.tag.call(this.ctx, this.view.props);
	// 	if (isIteratorOrAsyncIterator(value)) {
	// 		this.iter = value;
	// 		const result = this.iter.next();
	// 		this.publish();
	// 		return result;
	// 	} else if (isPromiseLike(value)) {
	// 		this.iter = createAsyncIterator(this.ctx, this.tag as any);
	// 		return Promise.resolve(value).then((value) => ({value, done: false}));
	// 	} else {
	// 		this.iter = createSyncIterator(this.ctx, this.tag as any);
	// 		return {value, done: false};
	// 	}
	// }

	private initialize(): Promise<void> | void {
		const value: ComponentIterator | MaybePromiseLike<Element> = this.tag.call(
			this.ctx,
			this.view.props,
		);
		if (isIteratorOrAsyncIterator(value)) {
			this.iter = value;
			const result = this.iter.next();
			if (isPromiseLike(result)) {
				this.publish();
				return this.pull(result);
			} else {
				return this.iterate(result);
			}
		} else {
			this.iter = createIterator(this.ctx, this.view.tag as any);
			return this.iterate({value, done: false});
		}
	}

	private iterate(result: ComponentIteratorResult): Promise<void> | void {
		this.result = result;
		if (this.result.value == null) {
			return this.view.updateChildren([]);
		} else if (isPromiseLike(result.value)) {
			// TODO: tie this into this.pending/this.enqueued stuff.
			return Promise.resolve(result.value).then((value) => {
				return this.view.updateChildren(value as Child);
			});
		}

		return this.view.updateChildren(this.result.value as Child);
	}

	// TODO: handle resultP rejecting
	private pull(resultP: Promise<ComponentIteratorResult>): Promise<void> {
		this.pulling = true;
		return resultP.then((result) => {
			const p = this.iterate(result);
			let nodeOrNodes:
				| (Node | string)[]
				| Node
				| string
				| Promise<(Node | string)[] | Node | string>;
			if (p === undefined) {
				this.view.commit();
				nodeOrNodes = this.view.nodeOrNodes!;
			} else {
				nodeOrNodes = p.then(() => {
					this.view.commit();
					return this.view.nodeOrNodes!;
				});
			}

			if (!result.done) {
				const resultP = this.iter!.next(nodeOrNodes);
				if (isPromiseLike(resultP)) {
					this.pending = this.pull(resultP);
				} else {
					this.result = resultP;
					// TODO: trigger this branch
					throw new Error("EY BABY");
				}
			}

			return Promise.resolve(nodeOrNodes).then(() => {});
		});
	}

	refresh(): Promise<void> | void {
		if (this.iter === undefined) {
			this.pending = this.initialize();
			return this.pending;
		} else if (this.pulling) {
			this.publish();
			return this.pending;
		} else if (this.pending === undefined) {
			const result = this.iter.next(this.view.nodeOrNodes) as IteratorResult<
				Element
			>;
			this.pending = this.iterate(result);
		} else if (this.enqueued === undefined) {
			this.enqueued = this.pending.then(() => {
				this.pending = this.enqueued;
				this.enqueued = undefined;
				const result = this.iter!.next(this.view.nodeOrNodes) as IteratorResult<
					Element
				>;
				return this.iterate(result);
			});
		}

		return this.enqueued;
	}

	unmount(): Promise<void> | void {
		for (const pub of this.publications) {
			pub.stop();
		}

		let result: Promise<IteratorResult<any>> | IteratorResult<any> | undefined;
		if (this.result !== undefined && !this.result.done) {
			if (this.iter !== undefined && typeof this.iter.return === "function") {
				result = this.iter.return();
			}
		}

		if (isPromiseLike(result)) {
			return result.then((result) => {
				if (!result.done) {
					throw new Error("Zombie iterator");
				}

				this.result = result;
				return this.view.updateChildren([]);
			});
		} else if (result !== undefined && !result.done) {
			throw new Error("Zombie iterator");
		}

		this.result = result;
		return this.view.updateChildren([]);
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

// TODO: allow tags to define child tags (for svg and custom canvas tags a la react-three-fiber)
interface Environment {
	[Default](tag: string): IntrinsicFunction;
	[Root]?: IntrinsicFunction;
	// TODO: figure out if we need custom functions for portal and fragment?
	// [Portal]?: IntrinsicFunction;
	// [Fragment]?: IntrinsicFunction;
	[tag: string]: IntrinsicFunction;
}

const defaultEnv: Environment = {
	[Default](tag: string): never {
		throw new Error(
			`tag ${tag} does not exist and default intrinsic not provided`,
		);
	},
};

const domEnv: Environment = {
	[Default](tag: string): IntrinsicFunction {
		return function* defaultDOM({children, ...props}): IntrinsicIterator {
			const node = document.createElement(tag);
			while (true) {
				updateDOMProps(node, props);
				updateDOMChildren(node, children);
				({children, ...props} = yield node);
			}
		};
	},
	*[Root]({node, children}): IntrinsicIterator {
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

export class Renderer {
	views: WeakMap<Node, View> = new WeakMap();
	env: Environment = defaultEnv;

	constructor(envs: Partial<Environment>[]) {
		for (const env of envs) {
			this.extend(env);
		}
	}

	extend(env: Partial<Environment>): void {
		if (env[Default] != null) {
			this.env[Default] = env[Default]!;
		}

		if (env[Root] != null) {
			this.env[Root] = env[Root];
		}

		for (const [tag, value] of Object.entries(env)) {
			if (value != null) {
				this.env[tag] = value;
			}
		}
	}

	render(
		elem: Element | null | undefined,
		node: HTMLElement,
	): Promise<View> | View | undefined {
		if (elem != null && elem.tag !== Root) {
			elem = createElement(Root, {node}, elem);
		}

		let view: View;
		if (this.views.has(node)) {
			view = this.views.get(node)!;
		} else if (elem == null) {
			return;
		} else {
			view = new View(elem, this.env);
			this.views.set(node, view);
		}

		let p: Promise<void> | void;
		if (elem == null) {
			p = view.unmount();
			this.views.delete(node);
		} else {
			p = view.update(elem);
		}

		if (p !== undefined) {
			return p.then(() => view);
		}

		return view;
	}
}

export const renderer = new Renderer([domEnv]);

export function render(
	elem: Element | null | undefined,
	node: HTMLElement,
): Promise<View> | View | undefined {
	return renderer.render(elem, node);
}
