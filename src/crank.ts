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
	| Iterator<unknown, unknown, unknown>
	| AsyncIterator<unknown, unknown, unknown> {
	return value != null && typeof value.next === "function";
}

// TODO: user-defined control tags?
export const Default = Symbol.for("crank:Default");

export type Default = typeof Default;

// TODO: Rename to Container? Merge with Portal?
export const Root = Symbol.for("crank:Root");

// TODO: typescript is dumb and doesn’t allow symbols in jsx expressions.
export type Root = any;

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
export type ControlTag = Root;

// export type ControlTag = Root | Copy | Fragment | Portal;
//
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

export function isIntrinsicElement(
	value: any,
): value is Element<ControlTag | string> {
	return (
		isElement(value) &&
		(typeof value.tag === "string" || value === (Root as any))
	);
}

export function isComponentElement(value: any): value is Element<Component> {
	return isElement(value) && typeof value.tag === "function";
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

	throw new TypeError("Unknown child type");
}

// TODO: explain what this higher-order function does
function chase<Return, This>(
	fn: (this: This, ...args: any[]) => PromiseLike<Return> | Return,
): (this: This, ...args: any[]) => Promise<Return> | Return {
	let next: ((result: PromiseLike<Return> | Return) => unknown) | undefined;
	return function chaseWrapper(...args: unknown[]): Promise<Return> | Return {
		const result = fn.apply(this, args);
		if (next !== undefined) {
			next(result);
		}

		if (isPromiseLike(result)) {
			const nextP = new Promise<Return>((resolve) => (next = resolve));
			return Promise.race([result, nextP]);
		}

		return result;
	};
}

type Engine<T> = Generator<MaybePromise<T | undefined>, any, Props>;

// TODO: use a left-child right-sibling tree, maybe we want to use an interface
// like this and get rid of the class in favor of functions/interfaces.
//interface Host<T> {
//	guest?: Element | string;
//	node?: T | string;
//	parent?: Host<T>;
//	firstChild?: Host<T>;
//	nextSibling?: Host<T>;
//	engine?: Engine<T>;
//}
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
// TODO: rename to host?
//export class Host<T> {
export class View<T> {
	// whether or not the parent is updating this node
	private updating = false;
	private node?: T | string;
	// whether or not the node is unmounting (asynchronously)
	private hanging?: (T | string)[];
	private engine?: Engine<T>;
	// TODO: Refactor committer to an engine
	private committer?: Committer<T>;
	// TODO: Use a left-child right-sibling tree.
	private children: (View<T> | undefined)[] = [];
	constructor(
		private guest: Guest,
		// TODO: Pass renderer into here instead
		private env: Environment<T>,
		private parent?: View<T>,
	) {
		if (isComponentElement(guest)) {
			this.engine = new ComponentEngine(guest, this);
		}
	}

	private cachedChildNodes?: (T | string)[];
	get childNodes(): (T | string)[] {
		if (this.cachedChildNodes !== undefined) {
			return this.cachedChildNodes;
		}

		let buffer: string | undefined;
		const childNodes: (T | string)[] = [];
		for (const childView of this.children) {
			if (childView !== undefined) {
				if (childView.hanging !== undefined) {
					childNodes.push(...childView.hanging);
				} else if (typeof childView.node === "string") {
					buffer = (buffer || "") + childView.node;
				} else {
					if (buffer !== undefined) {
						childNodes.push(buffer);
						buffer = undefined;
					}

					if (childView.node !== undefined) {
						childNodes.push(childView.node);
					} else {
						childNodes.push(...childView.childNodes);
					}
				}
			}
		}

		if (buffer !== undefined) {
			childNodes.push(buffer);
		}

		this.cachedChildNodes = childNodes;
		return childNodes;
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
				throw new TypeError("Unknown Tag");
			}
		} else if (typeof tag === "string") {
			intrinsic = this.env[tag];
			if (intrinsic == null) {
				intrinsic = this.env[Default](tag);
			}
		} else {
			throw new TypeError("Unknown Tag");
		}

		return intrinsic;
	}

	update = chase(function update(
		this: View<T>,
		guest: Guest,
	): Promise<undefined> | undefined {
		this.updating = true;
		if (
			isElement(this.guest) &&
			(!isElement(guest) || this.guest.tag !== guest.tag)
		) {
			this.unmount();
			if (isComponentElement(guest)) {
				this.engine = new ComponentEngine(guest, this);
			}
		}

		this.guest = guest;
		return this.refresh();
	});

	// TODO: batch this per tick
	enqueueCommit(): void {
		this.cachedChildNodes = undefined;
		this.commit();
	}

	commit(): void {
		if (isElement(this.guest)) {
			if (typeof this.guest.tag === "function") {
				if (!this.updating && this.parent !== undefined) {
					this.parent.enqueueCommit();
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

				this.node = result.value;
			}
		} else {
			this.node = this.guest;
		}

		this.updating = false;
	}

	refresh(): Promise<undefined> | undefined {
		if (isElement(this.guest)) {
			if (this.engine !== undefined) {
				const iteration = this.engine.next(this.guest.props);
				if (iteration.done) {
					this.engine = undefined;
				}

				if (iteration.value !== undefined) {
					return iteration.value.then(() => void this.commit());
				}

				this.commit();
				return;
			}

			const updateP = this.updateChildren(this.guest.props.children);
			if (updateP !== undefined) {
				return updateP.then(() => void this.commit()); // void :(
			}
		}

		this.commit();
	}

	updateChildren(children: Children): Promise<undefined> | undefined {
		this.cachedChildNodes = undefined;
		const unmounting = Array.isArray(children) && children.length === 0;
		const promises: (Promise<undefined> | undefined)[] = [];
		let i = 0;
		let view = this.children[i];
		for (const child of flattenChildren(children)) {
			const guest = createGuest(child);
			if (view === undefined) {
				view = this.children[i] = new View(guest, this.env, this);
			}

			const update = view.update(guest);
			if (update !== undefined) {
				promises.push(update);
			}

			view = this.children[++i];
		}

		while (i < this.children.length) {
			if (typeof view === "object") {
				const unmountP = view.unmount();
				if (unmounting && unmountP !== undefined) {
					promises.push(unmountP);
				}
			}

			view = this.children[++i];
		}

		if (promises.length) {
			return Promise.all(promises).then(() => undefined); // void :(
		}
	}

	unmount(): Promise<undefined> | undefined {
		// TODO: catch and swallow any errors
		this.node = undefined;
		this.guest = undefined;
		let unmountP: Promise<undefined> | undefined;
		if (this.engine !== undefined) {
			// Need to explicitly return undefined because of this bullshit:
			// https://github.com/microsoft/TypeScript/issues/33357
			const iteration = this.engine.return(undefined);
			if (iteration && iteration.value !== undefined) {
				unmountP = iteration.value;
			}

			this.engine = undefined;
		}

		// TODO: is this right?
		if (unmountP === undefined) {
			unmountP = this.updateChildren([]);
		} else {
			unmountP = unmountP.then(() => this.updateChildren([]));
		}

		if (unmountP !== undefined) {
			this.hanging = this.childNodes;
			unmountP = unmountP.then(() => {
				this.hanging = undefined;
				if (this.committer !== undefined) {
					this.committer.return && this.committer.return();
					this.committer = undefined;
				}

				this.parent && this.parent.enqueueCommit();
				return undefined; // void :(
			});

			return unmountP;
		}

		this.hanging = undefined;
		if (this.committer !== undefined) {
			this.committer.return && this.committer.return();
			this.committer = undefined;
		}
	}
}

export class Context {
	constructor(private engine: ComponentEngine, private view: View<any>) {}

	// TODO: throw an error if props are pulled multiple times per update
	*[Symbol.iterator](): Generator<Props> {
		while (true) {
			yield this.engine.props;
		}
	}

	[Symbol.asyncIterator](): AsyncGenerator<Props> {
		return this.engine.subscribe();
	}

	refresh(): Promise<undefined> | undefined {
		return this.view.refresh();
	}

	get props(): Props {
		return this.engine.props;
	}
}

export type ChildIterableIterator =
	| IterableIterator<MaybePromiseLike<Child>>
	| AsyncIterableIterator<MaybePromiseLike<Child>>;

export type FunctionComponent = (
	this: Context,
	props: Props,
) => MaybePromiseLike<Child>;

export type GeneratorComponent = (
	this: Context,
	props: Props,
) => ChildIterableIterator;

// TODO: component cannot be a union of FunctionComponent | GeneratorComponent
// because this breaks Function.prototype methods.
// https://github.com/microsoft/TypeScript/issues/34984
export type Component = (
	this: Context,
	props: Props,
) => ChildIterableIterator | MaybePromiseLike<Child>;

type ControllerResult = MaybePromise<IteratorResult<MaybePromiseLike<Child>>>;

export class Controller {
	private finished = false;
	private iter?: ChildIterableIterator;
	// TODO: remove view
	constructor(private component: Component, private ctx: Context) {}

	private initialize(): ControllerResult {
		if (this.finished) {
			return {value: undefined, done: true};
		}

		const value = this.component.call(this.ctx, this.ctx.props);
		// TODO: use a more reliable check?
		if (isIteratorOrAsyncIterator(value)) {
			this.iter = value;
			return this.iter.next();
		}

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
			this.finished = true;
		} else if (this.iter.return) {
			return this.iter.return(value);
		}

		return {value, done: true};
	}

	throw(error: any): ControllerResult {
		if (this.iter === undefined) {
			this.finished = true;
		} else if (this.iter.throw) {
			return this.iter.throw(error);
		}

		throw error;
	}
}

interface Publication {
	push(value: Props): unknown;
	stop(): unknown;
}

class ComponentEngine implements Engine<unknown> {
	props: Props;
	private controller: Controller;
	private value?: Promise<undefined>;
	private enqueued?: Promise<undefined>;
	private done = false;
	private async = false;
	private pubs = new Set<Publication>();
	constructor(element: Element<Component>, private view: View<any>) {
		this.props = element.props;
		this.controller = new Controller(element.tag, new Context(this, view));
	}

	run(): Promise<undefined> | undefined {
		const iteration = this.controller.next(this.view.childNodeOrNodes);
		if (isPromiseLike(iteration)) {
			this.async = true;
			return iteration
				.then((iteration) => {
					this.done = !!iteration.done;
					return this.view.updateChildren(iteration.value);
				})
				.finally(() => {
					if (!this.done) {
						this.value = this.run();
					}
				});
		}

		this.done = !!iteration.done;
		const update = isPromiseLike(iteration.value)
			? Promise.resolve(iteration.value).then((value: any) =>
					this.view.updateChildren(value),
			  )
			: this.view.updateChildren(iteration.value);
		if (update !== undefined) {
			return update.finally(() => {
				this.value = this.enqueued;
				this.enqueued = undefined;
			});
		}
	}

	next(props: Props): IteratorResult<MaybePromise<undefined>> {
		if (this.done) {
			return {value: undefined, done: true};
		}

		this.props = props;
		this.publish();
		if (this.async) {
			return {value: this.value, done: this.done};
		} else if (this.value === undefined) {
			this.value = this.run();
			return {value: this.value, done: this.done};
		} else if (this.enqueued === undefined) {
			this.enqueued = this.value.then(() => this.run());
		}

		return {value: this.enqueued, done: this.done};
	}

	return(): IteratorResult<MaybePromise<undefined>> {
		for (const pub of this.pubs) {
			pub.stop();
		}

		this.done = true;
		const iteration = this.controller.return();
		if (isPromiseLike(iteration)) {
			const value = iteration.then(() => undefined); // void :(
			return {value, done: true};
		}

		return {value: undefined, done: true};
	}

	throw(error: any): never {
		// TODO: throw error into this.controller.throw
		throw error;
	}

	[Symbol.iterator](): never {
		throw new Error("Not implemented");
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

	publish(): void {
		for (const pub of this.pubs) {
			pub.push(this.props);
		}
	}
}

// TODO: Should we allow Environments to define custom Symbol elements?
export interface Environment<T> {
	[Default](tag: string): Intrinsic<T>;
	[Root]: Intrinsic<T>; // Intrinsic<T> | Environment<T>;
	[tag: string]: Intrinsic<T>;
}

const defaultEnv: Environment<any> = {
	[Default](tag: string): never {
		throw new Error(`Environment did not provide an intrinsic for ${tag}`);
	},
	[Root](): never {
		throw new Error("Environment did not provide an intrinsic for the Root");
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
			this.env[Root] = env[Root]!;
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
		elem?: Element | null,
		node?: TContainer,
	): MaybePromise<View<T>> | undefined {
		if (elem != null && elem.tag !== Root) {
			if (node == null) {
				throw new TypeError(
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
