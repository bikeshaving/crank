import {Repeater, SlidingBuffer} from "@repeaterjs/repeater";

// TODO: make this non-global?
declare global {
	namespace JSX {
		interface IntrinsicElements {
			[name: string]: any;
		}

		// TODO: I don‘t think this actually type checks children
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

// TODO: user-defined control tags?
export const Default = Symbol.for("crank:Default");

export type Default = typeof Default;

// TODO: Rename this to Container? Maybe we can merge this tag concept with the
// unimplemented Portal tag
export const Root = Symbol.for("crank:Root");

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

export type Child = Element | string | number | boolean | null | undefined;

interface NestedChildIterable extends Iterable<Child | NestedChildIterable> {}

export type Children = Child | NestedChildIterable;

export interface Props {
	[name: string]: any;
	children?: Children;
}

export const ElementSigil: unique symbol = Symbol.for("crank:ElementSigil");

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

export type Committer<T> = Iterator<
	T | undefined,
	T | undefined,
	IntrinsicProps<T>
>;

// TODO: allow intrinsics to be a simple function
export type Intrinsic<T> = (props: IntrinsicProps<T>) => Committer<T>;

export type Guest = Element | string | undefined;

function createGuest(child: Child): Guest {
	if (child == null || typeof child === "boolean") {
		return;
	} else if (typeof child === "number") {
		return child.toString();
	} else if (typeof child === "string" || isElement(child)) {
		return child;
	}

	throw new Error("Unknown child type");
}

// TODO: use a left-child right-sibling tree, maybe we want to use an interface
// like this to make views dumb and performant.
//
//interface Host<T> {
//	guest?: Element | string;
//	node?: T | string;
//	parent?: Host<T>;
//	firstChild?: Host<T>;
//	nextSibling?: Host<T>;
//	engine?: Engine;
//}
//
//type Engine = Generator<
//	MaybePromise<undefined>,
//	MaybePromise<undefined>,
//	Props
//>;
//
// We should split up the logic from View to Fiber, which is stateless, and
// Engine, which is stateful. Engine would call updateChildren and yield host
// nodes. I’m not sure why the engine would yield host nodes, insofar as this
// would require the fiber or some other function to set the host on the fiber.
// Why would the engine set the children of the fiber but not set the host?
// This reveals the conceptual limits of iterators. They have to “yield”
// something or why use iterators at all?
//
// Engine is a type which both components and intrinsics can implement to
// manipulate the host.
//
// I’m not sure if creating/deleting an engine is possible, because if
// pending/enqueued isn’t defined on fibers, how do we enqueue multiple
// synchronous updates?
//
// The main problem is unmounting, where a guest at a fiber is replaced with a
// different type of guest. If this happens synchronously, but the old guest is
// evicted asynchronously, does that mean the mounting of the new guest is
// enqueued? If the new guest is a string or undefined, does that mean we need
// to keep the engine around?
//
// This is making me realize that the logic around asynchronous eviction is
// just wrong currently (using host/guest terminology opens us up to new
// analogies like lease/evict). Right now, when an element has children which
// are evicted asynchronously, we block the committing of that element (and all
// its children). A better alternative would be to simply block committing of
// the child in the unmounting “slot,” leaving the parent and siblings to
// freely update while the child is leaving. This necessitates a switch over to
// a Fiber-like data structure, insofar as we can’t simply call updateChildren
// to add/remove children; each child needs to keep its own internal unmounting
// state.
// TODO: rename to host?
//export class Host<T> {
export class View<T> {
	private node?: T | string;
	// whether or not the parent is updating this component or the component is
	// being updated by the parent
	private updating = false;
	// TODO: The controller and committer properties are mutually exclusive on a
	// view. There must be a more beautiful way to tie this logic together.
	private committer?: Committer<T>;
	private controller?: Controller;
	// These properties are exclusively used to batch intrinsic components with
	// async children. There must be a better way to do this than to define these
	// properties on View.
	private pending?: Promise<undefined>;
	private enqueued?: Promise<undefined>;
	// TODO: Use a left-child right-sibling tree.
	private children: (View<T> | undefined)[] = [];
	constructor(
		private guest: Guest,
		// TODO: Stop passing env into trees, should we pass in renderer?
		private env: Environment<T>,
		private parent?: View<T>,
	) {
		if (isElement(this.guest) && typeof this.guest.tag === "function") {
			this.controller = new Controller(this.guest.tag, this.guest.props, this);
		}
	}

	private _childNodes?: (T | string)[];
	get childNodes(): (T | string)[] {
		if (this._childNodes !== undefined) {
			return this._childNodes;
		}

		let buffer: string | undefined;
		const nodes: (T | string)[] = [];
		for (const childView of this.children) {
			// TODO: read string values off node not guest
			if (childView !== undefined && childView.guest !== undefined) {
				if (typeof childView.guest === "string") {
					buffer =
						buffer === undefined ? childView.guest : buffer + childView.guest;
				} else {
					if (buffer !== undefined) {
						nodes.push(buffer);
						buffer = undefined;
					}

					if (childView.node !== undefined) {
						nodes.push(childView.node);
					} else {
						nodes.push(...childView.childNodes);
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

	// TODO: move this logic to the renderer
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

	update(guest: Guest): Promise<undefined> | undefined {
		this.updating = true;
		const evicted = this.guest;
		this.guest = guest;
		if (
			typeof evicted !== "object" ||
			typeof guest !== "object" ||
			evicted.tag !== guest.tag
		) {
			// TODO: this logic is wrong
			// We don’t want to block updating of the parent until every child is
			// unmounted. We simply want to prevent this child from updating.
			this.pending = this.unmount();
			this.enqueued = undefined;
			if (this.pending !== undefined) {
				return this.pending.then(() => this.refresh());
			}
		}

		return this.refresh();
	}

	commit(): void {
		if (isElement(this.guest)) {
			if (typeof this.guest.tag === "function") {
				if (!this.updating && this.parent !== undefined) {
					this.parent.commit();
				}
			} else {
				const props = {...this.guest.props, children: this.childNodes};
				if (this.committer === undefined) {
					const intrinsic = this.intrinsicFor(this.guest.tag);
					this.committer = intrinsic(props);
				}

				const result = this.committer.next(props);
				if (result.done) {
					this.committer = undefined;
				}

				this.node = result.value as T | undefined;
			}
		}

		this.updating = false;
	}

	private run(): Promise<undefined> | undefined {
		if (isElement(this.guest)) {
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

						this.commit();
						this.pending = this.run();
						return result.value;
					});
				} else {
					if (result.done) {
						this.controller = undefined;
					}

					children = result.value as any;
				}
			} else {
				children = this.guest.props.children;
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
	}

	refresh(): Promise<undefined> | undefined {
		// TODO: should we do a check that tag for the controller is the same as
		// tag for the new guest?
		if (this.controller && isElement(this.guest)) {
			this.controller.publish(this.guest.props);
		}

		if (this.controller && this.controller.async) {
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
		for (const child of flattenChildren(children)) {
			const guest = createGuest(child);
			if (view === undefined) {
				view = this.children[i] = new View(guest, this.env, this);
			}

			const p = view.update(guest);
			if (p !== undefined) {
				promises.push(p);
			}

			view = this.children[++i];
		}

		while (i < this.children.length) {
			if (typeof view === "object") {
				// TODO: this logic is wrong
				// We don’t want to block updating of the parent until every child is
				// unmounted. We simply want to prevent this child from updating.
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

	unmount(): Promise<undefined> | undefined {
		if (this.committer !== undefined) {
			this.committer.return && this.committer.return();
			delete this.committer;
		}

		let result: any;
		if (this.controller !== undefined) {
			result = this.controller.return();
			this.controller = undefined;
		}

		if (isPromiseLike(result)) {
			return Promise.resolve(result).then(() => this.updateChildren([]));
		}

		return this.updateChildren([]);
	}
}

export type ChildGenerator =
	| Generator<MaybePromiseLike<Child>>
	| AsyncGenerator<Child>;

export type FunctionComponent = (
	this: Context,
	props: Props,
) => MaybePromiseLike<Child>;

export type GeneratorComponent = (
	this: Context,
	props: Props,
) => ChildGenerator;

// TODO: component cannot be a union of FunctionComponent | GeneratorComponent
// because this breaks Function.prototype methods.
// https://github.com/microsoft/TypeScript/issues/34984
export type Component = (
	this: Context,
	props: Props,
) => ChildGenerator | MaybePromiseLike<Child>;

interface Publication {
	push(value: Props): unknown;
	stop(): unknown;
}

export class Context {
	constructor(private controller: Controller, private view: View<any>) {}

	*[Symbol.iterator](): Generator<Props> {
		while (true) {
			yield this.controller.props;
		}
	}

	[Symbol.asyncIterator](): AsyncGenerator<Props> {
		return this.controller.subscribe();
	}

	refresh(): Promise<undefined> | undefined {
		return this.view.refresh();
	}
}

function* createChildGenerator(
	context: Context,
	tag: FunctionComponent,
): ChildGenerator {
	for (const props of context) {
		yield tag.call(context, props);
	}
}

type ControllerResult =
	| Promise<IteratorResult<Child>>
	| IteratorResult<MaybePromiseLike<Child>>;

class Controller {
	async = false;
	private ctx = new Context(this, this.view);
	private pubs = new Set<Publication>();
	private iter?: ChildGenerator;
	constructor(
		private tag: Component,
		public props: Props,
		private view: View<any>,
	) {}

	private initialize(): ControllerResult {
		const value = this.tag.call(this.ctx, this.props);
		// TODO: use a more reliable check to determine if the object is a generator
		// Check if Symbol.iterator or Symbol.asyncIterator + next/return/throw
		// are defined.
		if (isIteratorOrAsyncIterator(value)) {
			this.iter = value;
			const result = this.iter.next();
			this.async = isPromiseLike(result);
			return result;
		}

		// TODO: remove the type assertion from this.ctx
		this.iter = createChildGenerator(this.ctx, this.tag as FunctionComponent);
		return {value, done: false};
	}

	next(value?: any): ControllerResult {
		if (this.iter === undefined) {
			return this.initialize();
		}

		return this.iter.next(value);
	}

	return(value?: any): ControllerResult {
		if (this.iter === undefined) {
			this.iter = (function*() {})();
		}

		for (const pub of this.pubs) {
			pub.stop();
		}

		return this.iter.return ? this.iter.return(value) : {value, done: true};
	}

	throw(error: any): ControllerResult {
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
			push(this.props);
			const pub = {push, stop};
			this.pubs.add(pub);
			await stop;
			this.pubs.delete(pub);
		}, new SlidingBuffer(1));
	}

	publish(props: Props): void {
		this.props = props;
		for (const pub of this.pubs) {
			pub.push(this.props);
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

	// TODO: move the TContainer/node/Root wrapping logic into env-specific
	// functions. It does not apply uniformly for all enviroments.
	render(
		elem: Element | null | undefined,
		node?: TContainer,
	): MaybePromise<View<T>> | undefined {
		if (elem != null && elem.tag !== Root) {
			if (node == null) {
				throw new Error(
					"Node is null or undefined and root element is not a root element",
				);
			}

			elem = createElement(Root, {node}, elem);
		}

		let view: View<T>;
		if (node !== undefined && this.views.has(node)) {
			view = this.views.get(node)!;
		} else if (elem == null) {
			return;
		} else {
			view = new View(elem, this.env);
			if (node !== undefined) {
				this.views.set(node, view);
			}
		}

		let p: Promise<void> | void;
		if (elem == null) {
			p = view.unmount();
			if (node !== undefined) {
				this.views.delete(node);
			}
		} else {
			p = view.update(elem);
		}

		if (p !== undefined) {
			return p.then(() => view);
		}

		return view;
	}
}
