import {Repeater, SlidingBuffer} from "@repeaterjs/repeater";

// TODO: make this non-global?
declare global {
	namespace JSX {
		interface IntrinsicElements {
			[name: string]: any;
		}

		// TODO: I don‘t think this actually type checks children
		// https://github.com/microsoft/TypeScript/issues/18357
		// https://github.com/Microsoft/TypeScript/issues/28953
		interface ElementChildrenAttribute {
			children: Children;
		}
	}
}

type MaybePromise<T> = Promise<T> | T;

type MaybePromiseLike<T> = PromiseLike<T> | T;

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

// TODO: should we use Symbol or Symbol.for?
// TODO: user-defined control tags?
export const Default = Symbol("Default");

export type Default = typeof Default;

// TODO: Rename this to Container? Maybe we can merge this tag concept with the
// unimplemented Portal tag
export const Root = Symbol("Root");

export type Root = typeof Root;

// TODO: implement these control tags
// I wonder if the following tags can be implemented without defining a custom
// function for each tag for every environment
// export const Copy = Symbol("Copy");
//
// export type Copy = typeof Copy;
//
// export const Fragment = Symbol("Fragment");
//
// export type Fragment = typeof Fragment;
//
// export const Portal = Symbol("Portal");
//
// export type Portal = typeof Portal;
//
export type ControlTag = Root;

// export type ControlTag = Root | Copy | Fragment | Portal;
export type Tag = Component | ControlTag | string;

// TODO: rename to Node? NodeValue? Cog? Guest?
export type Child = Element | string | number | boolean | null | undefined;

interface ChildIterable extends Iterable<Child | ChildIterable> {}

export type Children = Child | ChildIterable;

export interface Props {
	[name: string]: any;
	children?: Children;
}

export const ElementSigil: unique symbol = Symbol.for("crank.element");

export type ElementSigil = typeof ElementSigil;

export interface Element<T extends Tag = Tag> {
	sigil: ElementSigil;
	tag: T;
	props: Props;
}

export function isElement(value: any): value is Element {
	return value != null && value.sigil === ElementSigil;
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
		props.children = Array.from(arguments).slice(2);
	} else if (arguments.length > 2) {
		props.children = arguments[2];
	}

	return {sigil: ElementSigil, tag, props};
}

export function* flattenChildren(children: Children): Iterable<Child> {
	if (typeof children === "string" || !isIterable(children)) {
		yield children;
		return;
	}

	for (const child of children) {
		yield* flattenChildren(child);
	}
}

export interface IntrinsicProps<T> {
	[key: string]: any;
	children?: (T | string)[];
}

export type Committer<T> = Iterator<T | undefined, T | void, IntrinsicProps<T>>;

// TODO: allow intrinsics to be a simple function
export type Intrinsic<T> = (props: IntrinsicProps<T>) => Committer<T>;

// TODO: use a left-child right-sibling tree, maybe we want to use an interface like this to make views dumb and performant
//type Engine<T> = Iterator<
//	T | string | undefined,
//	T | string | undefined,
//	Props
//>;
//
// Idea for a refactoring to a binary tree. What should this be called?
// View? Fiber? Node?
// Should this be an interface or a class?
//interface Fiber<T> {
//	value?: Element | string;
//	host?: T | string;
//	engine?: Engine;
//	firstChild?: Fiber<T>;
//	nextSibling?: Fiber<T>;
//	parent?: Fiber<T>;
//}
//
export class View<T> {
	tag: Tag;
	props: Props;
	// TODO: rename to host?
	private node?: T | string;
	// whether or not the parent is updating this component or the component is being updated by the parent
	private updating = false;
	// TODO: The controller and committer properties are mutually exclusive on a view.
	// There must be a more beautiful way to tie this logic together.
	private committer?: Committer<T>;
	private controller?: Controller;
	// These properties are exclusively used to batch intrinsic components with async children. There must be a better way to do this than to define these properties on View.
	private pending?: Promise<undefined>;
	private enqueued?: Promise<undefined>;
	// TODO: Use a left-child right-sibling tree.
	private children: (View<T> | string | undefined)[] = [];
	// TODO: Stop passing env into this thing.
	constructor(
		elem: Element,
		private env: Environment<T>,
		private parent?: View<T>,
	) {
		this.tag = elem.tag;
		this.props = elem.props;
		if (elem.tag === Root && parent !== undefined) {
			throw new TypeError(
				"Root Element must always be the root of an element tree",
			);
		} else if (typeof this.tag === "function") {
			this.controller = new Controller(this.tag, this);
		}
	}

	private _childNodes?: (T | string)[];
	get childNodes(): (T | string)[] {
		if (this._childNodes !== undefined) {
			return this._childNodes;
		}

		let buffer: string | undefined;
		const nodes: (T | string)[] = [];
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
							nodes.push(...child.childNodes);
						}
					}
				}
			}
		}

		if (buffer !== undefined) {
			nodes.push(buffer);
		}

		this._childNodes = nodes;
		return nodes;
	}

	get childNodeOrNodes(): (T | string)[] | T | string | undefined {
		if (this.childNodes.length > 1) {
			return this.childNodes;
		}

		return this.childNodes[0];
	}

	protected intrinsicFor(tag: string | ControlTag): Intrinsic<T> {
		let intrinsic: Intrinsic<T> | undefined;
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

	private instantiate(child: Child): View<T> | string | undefined {
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

	update(elem: Element): Promise<undefined> | undefined {
		if (this.tag !== elem.tag) {
			throw new TypeError("Tag mismatch");
		}

		this.updating = true;
		this.props = elem.props;
		return this.refresh();
	}

	commit(): void {
		if (typeof this.tag === "function") {
			if (!this.updating && this.parent !== undefined) {
				this.parent.commit();
			}
		} else {
			const props = {...this.props, children: this.childNodes};
			if (this.committer === undefined) {
				const intrinsic = this.intrinsicFor(this.tag);
				this.committer = intrinsic(props);
			}

			const result = this.committer.next(props);
			if (result.done) {
				this.committer = undefined;
			}

			this.node = result.value as T | undefined;
		}

		this.updating = false;
	}

	private run(): Promise<undefined> | undefined {
		let children: MaybePromiseLike<Children>;
		if (this.controller !== undefined) {
			const nodes =
				this.pending === undefined
					? this.childNodeOrNodes
					: this.pending.then(() => this.childNodeOrNodes);
			const result = this.controller.next(nodes);
			if (isPromiseLike(result)) {
				children = result.then((result) => {
					if (result.done) {
						this.controller = undefined;
						return result.value as any;
					}

					this.pending = this.run()!.then(() => void this.commit());
					return result.value;
				});
			} else {
				if (result.done) {
					this.controller = undefined;
				}

				children = result.value as any;
			}
		} else {
			children = this.props.children;
		}

		let update: Promise<undefined> | undefined;
		if (isPromiseLike(children)) {
			update = Promise.resolve(children).then((children) =>
				this.updateChildren(children),
			);
		} else {
			update = this.updateChildren(children);
		}

		if (update === undefined) {
			this.commit();
			return;
		}

		return update.then(() => void this.commit());
	}

	refresh(): Promise<undefined> | undefined {
		if (this.controller && this.controller.async) {
			// should we be calling publish here or should the controller call
			// publish on next?
			this.controller.publish();
			return this.pending;
		} else if (this.pending === undefined) {
			const update = this.run();
			if (update !== undefined) {
				this.pending = update;
				this.pending.finally(() => {
					this.pending = this.enqueued;
					this.enqueued = undefined;
				});
			}

			return this.pending;
		} else if (this.enqueued === undefined) {
			this.enqueued = this.pending.then(() => this.run());
			this.enqueued.finally(() => {
				this.pending = this.enqueued;
				this.enqueued = undefined;
			});
		}

		return this.enqueued;
	}

	updateChildren(children: Children): Promise<undefined> | undefined {
		this._childNodes = undefined;
		const promises: Promise<any>[] = [];
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
			return Promise.all(promises).then(() => undefined);
		}
	}

	unmount(): Promise<void> | void {
		if (this.committer !== undefined) {
			this.committer.return && this.committer.return();
			delete this.committer;
		}

		let result: any;
		if (this.controller !== undefined) {
			result = this.controller.return();
			delete this.controller;
		}

		if (isPromiseLike(result)) {
			return Promise.resolve(result).then(() => this.updateChildren([]));
		}

		return this.updateChildren([]);
	}
}

// TODO: get rid of the voids
// (async) generator functions will not be able to return ComponentIterator until this issue is fixed https://github.com/microsoft/TypeScript/issues/34984
export type ComponentIterator =
	| Iterator<MaybePromiseLike<Children>>
	| AsyncIterator<Children>;

export type ComponentGenerator =
	| Generator<MaybePromiseLike<Children>>
	| AsyncGenerator<Children>;

export type ComponentIteratorResult = IteratorResult<
	MaybePromiseLike<Children>
>;

export type FunctionComponent = (
	this: Context,
	props: Props,
) => MaybePromiseLike<Children>;

export type IteratorComponent = (
	this: Context,
	props: Props,
) => ComponentIterator;

// NOTE: we can’t use a type alias of FunctionComponent | IteratorComponent
// because that breaks Function.prototype methods.
// https://github.com/microsoft/TypeScript/issues/33815
export type Component = (
	this: Context,
	props: Props,
) => ComponentIterator | MaybePromiseLike<Children>;

interface Publication {
	push(value: Props): unknown;
	stop(): unknown;
}

export class Context {
	constructor(private controller: Controller, private view: View<any>) {}

	*[Symbol.iterator](): Generator<Props> {
		while (true) {
			yield this.view.props;
		}
	}

	[Symbol.asyncIterator](): AsyncGenerator<Props> {
		return this.controller.subscribe();
	}

	refresh(): Promise<undefined> | undefined {
		return this.view.refresh();
	}
}

function* createComponentGenerator(
	context: Context,
	tag: FunctionComponent,
): ComponentGenerator {
	for (const props of context) {
		yield tag.call(context, props);
	}
}

class Controller {
	async = false;
	private ctx = new Context(this, this.view);
	private pubs = new Set<Publication>();
	private iter?: ComponentIterator;
	constructor(private tag: Component, private view: View<any>) {}

	private initialize(): MaybePromise<ComponentIteratorResult> {
		const value = this.tag.call(this.ctx, this.view.props);
		if (isIteratorOrAsyncIterator(value)) {
			this.iter = value;
			const result = this.iter.next();
			this.async = isPromiseLike(result);
			return result;
		}

		// TODO: remove the type assertion from this.ctx
		this.iter = createComponentGenerator(
			this.ctx,
			this.tag as FunctionComponent,
		);
		return {value, done: false};
	}

	next(value?: any): MaybePromise<ComponentIteratorResult> {
		if (this.iter === undefined) {
			return this.initialize();
		}

		return this.iter.next(value);
	}

	return(value?: any): MaybePromise<ComponentIteratorResult> {
		if (this.iter === undefined) {
			this.iter = (function*() {})();
		}

		for (const pub of this.pubs) {
			pub.stop();
		}

		return this.iter.return ? this.iter.return(value) : {value, done: true};
	}

	throw(error: any): MaybePromise<ComponentIteratorResult> {
		if (this.iter === undefined) {
			this.iter = (function*() {})();
		}

		if (!this.iter.throw) {
			throw error;
		}

		return this.iter.throw(error);
	}

	subscribe(): AsyncGenerator<Props> {
		return new Repeater(async (push, stop) => {
			push(this.view.props);
			const pub = {push, stop};
			this.pubs.add(pub);
			await stop;
			this.pubs.delete(pub);
		}, new SlidingBuffer(1));
	}

	publish(): void {
		for (const pub of this.pubs) {
			pub.push(this.view.props);
		}
	}
}

// TODO: allow tags to define child tags (for svg and custom canvas tags a la react-three-fiber)
export interface Environment<T> {
	[Default](tag: string): Intrinsic<T>;
	[Root]?: Intrinsic<T>;
	// TODO: figure out if we need custom functions for portal and fragment?
	// [Portal]?: Intrinsic<T>;
	// [Fragment]?: Intrinsic<T>;
	[tag: string]: Intrinsic<T>;
}

const defaultEnv: Environment<any> = {
	[Default](tag: string): never {
		throw new Error(
			`tag ${tag} does not exist and default intrinsic not provided`,
		);
	},
};

export class Renderer<T, TContainer extends {}> {
	views: WeakMap<TContainer, View<T>> = new WeakMap();
	env: Environment<T> = defaultEnv;

	constructor(envs: Partial<Environment<T>>[]) {
		for (const env of envs) {
			this.extend(env);
		}
	}

	extend(env: Partial<Environment<T>>): void {
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
		node: TContainer,
	): Promise<View<T>> | View<T> | undefined {
		if (elem != null && elem.tag !== Root) {
			elem = createElement(Root, {node}, elem);
		}

		let view: View<T>;
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
