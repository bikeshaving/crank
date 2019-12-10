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
): value is Element<string | symbol> {
	return isElement(value) && typeof value.tag !== "function";
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

export type IntrinsicIterator<T> = Iterator<
	T | undefined,
	undefined,
	IntrinsicProps<T>
>;

// TODO: allow intrinsics to be a simple function
export type Intrinsic<T> = (props: IntrinsicProps<T>) => IntrinsicIterator<T>;

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

type Gear<T> = Generator<
	MaybePromise<T | undefined>,
	MaybePromise<undefined>,
	Props
>;

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
	// Whether or not the update was initiated by the parent.
	updating = false;
	private node?: T | string;
	// When a component unmounts asynchronously, its current nodes are stored in
	// hanging until the unmount promise settles.
	// Until that point, parents will continue to see the hanging nodes.
	// The view can continue to be updated in the meantime.
	private hanging?: (T | string)[];
	private gear?: Gear<T>;
	// TODO: Use a left-child right-sibling tree.
	private children: (View<T> | undefined)[] = [];
	constructor(
		public guest: Guest,
		// TODO: Pass renderer into here instead
		private env: Environment<T>,
		private parent?: View<T>,
	) {
		if (isComponentElement(guest)) {
			this.gear = new ComponentGear(this);
		} else if (isIntrinsicElement(guest)) {
			this.gear = new IntrinsicGear(this);
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
	intrinsicFor(tag: string | symbol): Intrinsic<T> {
		let intrinsic: Intrinsic<T> | undefined;
		if (tag === Root) {
			intrinsic = this.env[tag as any];
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
			!isElement(this.guest) ||
			!isElement(guest) ||
			this.guest.tag !== guest.tag
		) {
			void this.unmount();
			this.guest = guest;
			if (isComponentElement(guest)) {
				this.gear = new ComponentGear(this);
			} else if (isIntrinsicElement(guest)) {
				this.gear = new IntrinsicGear(this);
			}
		} else {
			this.guest = guest;
		}

		return this.refresh();
	});

	// TODO: batch this per tick
	enqueueCommit(): void {
		this.cachedChildNodes = undefined;
		this.refresh();
	}

	refresh(): Promise<undefined> | undefined {
		if (isElement(this.guest)) {
			if (this.gear !== undefined) {
				const iteration = this.gear.next(this.guest.props);
				if (iteration.done) {
					this.gear = undefined;
				}

				if (isPromiseLike(iteration.value)) {
					return Promise.resolve(iteration.value).then((value) => {
						this.node = value;
						return undefined; // void :(
					});
				}

				this.node = iteration.value;
			}
		} else {
			this.node = this.guest;
		}
	}

	updateChildren(children: Children): Promise<undefined> | undefined {
		this.cachedChildNodes = undefined;
		// TODO: Not sure if this is the correct logic here.
		const unmounting = Array.isArray(children) && children.length === 0;
		const promises: Promise<any>[] = [];
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
				if (unmounting && isPromiseLike(unmountP)) {
					promises.push(unmountP);
				}
			}

			view = this.children[++i];
		}

		if (promises.length) {
			return Promise.all(promises).then(() => undefined); // void :(
		}
	}

	unmount(): MaybePromise<undefined> {
		this.node = undefined;
		this.guest = undefined;
		if (this.gear !== undefined) {
			const iteration = this.gear.return && this.gear.return(undefined);
			if (!iteration.done) {
				throw new Error("Zombie gear");
			}

			this.gear = undefined;
			const p = iteration && iteration.value;
			if (isPromiseLike(p)) {
				this.hanging = this.childNodes;
				return p.then(() => {
					this.hanging = undefined;
					this.parent && this.parent.enqueueCommit();
					return undefined; // void :(
				});
			}
		}
	}
}

export class Context {
	constructor(private gear: ComponentGear, private view: View<any>) {}

	// TODO: throw an error if props are pulled multiple times per update
	*[Symbol.iterator](): Generator<Props> {
		while (true) {
			yield this.gear.props;
		}
	}

	[Symbol.asyncIterator](): AsyncGenerator<Props> {
		return this.gear.subscribe();
	}

	refresh(): Promise<undefined> | undefined {
		return this.view.refresh();
	}

	get props(): Props {
		return this.gear.props;
	}
}

export type ChildIterator =
	| Iterator<MaybePromiseLike<Child>>
	| AsyncIterator<Child>;

export type FunctionComponent = (
	this: Context,
	props: Props,
) => MaybePromiseLike<Child>;

export type GeneratorComponent = (this: Context, props: Props) => ChildIterator;

// TODO: component cannot be a union of FunctionComponent | GeneratorComponent
// because this breaks Function.prototype methods.
// https://github.com/microsoft/TypeScript/issues/34984
export type Component = (
	this: Context,
	props: Props,
) => ChildIterator | MaybePromiseLike<Child>;

type ComponentIteratorResult = MaybePromise<
	IteratorResult<MaybePromiseLike<Child>>
>;

// TODO: Delete this abstraction now that we have gears
export class ComponentIterator {
	private finished = false;
	private iter?: ChildIterator;
	constructor(private component: Component, private ctx: Context) {}

	private initialize(): ComponentIteratorResult {
		if (this.finished) {
			return {value: undefined, done: true};
		}

		const value = this.component.call(this.ctx, this.ctx.props);
		if (isIteratorOrAsyncIterator(value)) {
			this.iter = value;
			return this.iter.next();
		}

		return {value, done: false};
	}

	next(value?: any): ComponentIteratorResult {
		if (this.iter === undefined) {
			return this.initialize();
		}

		return this.iter.next(value);
	}

	return(value?: any): ComponentIteratorResult {
		if (this.iter === undefined) {
			this.finished = true;
		} else if (this.iter.return) {
			return this.iter.return(value);
		}

		return {value, done: true};
	}

	throw(error: any): ComponentIteratorResult {
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

// TODO: rewrite this as a generator function
class ComponentGear implements Gear<never> {
	props: Props;
	private iter: ComponentIterator;
	private value?: Promise<undefined>;
	private enqueued?: Promise<undefined>;
	private done = false;
	private async = false;
	private pubs = new Set<Publication>();
	constructor(private view: View<any>) {
		if (!isComponentElement(view.guest)) {
			throw new Error("View’s guest is not a component element");
		}

		this.props = view.guest.props;
		this.iter = new ComponentIterator(view.guest.tag, new Context(this, view));
	}

	run(): Promise<undefined> | undefined {
		const iteration = this.iter.next(this.view.childNodeOrNodes);
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
		const iteration = this.iter.return();
		if (isPromiseLike(iteration)) {
			const value = iteration.then(() => this.view.updateChildren([]));
			return {value, done: true};
		}

		return {value: this.view.updateChildren([]), done: true};
	}

	throw(error: any): never {
		// TODO: throw error into iter
		throw error;
	}

	[Symbol.iterator]() {
		return this;
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

// TODO: rewrite this as a generator function
class IntrinsicGear<T> implements Gear<T> {
	private done = false;
	private intrinsic: Intrinsic<T>;
	private iter?: IntrinsicIterator<T>;
	private props: Props;
	private tag: string | symbol;
	constructor(private view: View<T>) {
		if (!isIntrinsicElement(view.guest)) {
			throw new Error("View’s guest is not an intrinsic element");
		}

		this.props = view.guest.props;
		// TODO: this probably should not be done here.
		this.intrinsic = view.intrinsicFor(view.guest.tag);
		this.tag = view.guest.tag;
	}

	private commit(): T | undefined {
		if (this.done) {
			return;
		}

		const props = {...this.props, children: this.view.childNodes};
		if (this.iter === undefined) {
			this.iter = this.intrinsic(props);
		}

		const iteration = this.iter.next(props);
		this.done = !!iteration.done;
		return iteration.value;
	}

	next(props: Props): IteratorResult<MaybePromise<T | undefined>, undefined> {
		if (this.done) {
			return {value: undefined, done: true};
		}

		this.props = props;
		let updateP: MaybePromise<undefined>;
		if (this.view.updating) {
			updateP = this.view.updateChildren(this.props.children);
		}

		if (updateP !== undefined) {
			return {
				value: updateP.then(() => this.commit()),
				done: false,
			};
		}

		return {value: this.commit(), done: this.done};
	}

	return(): IteratorResult<
		MaybePromise<T | undefined>,
		MaybePromise<undefined>
	> {
		this.done = true;
		if (this.iter === undefined || this.iter.return === undefined) {
			return {value: this.view.updateChildren([]), done: true};
		}

		const value = this.view.updateChildren([]);
		if (isPromiseLike(value)) {
			return {value: value.then(() => void this.iter!.return!()), done: true};
		}

		this.iter.return();
		return {value, done: true};
	}

	throw(): IteratorResult<T | undefined> {
		throw new Error("Not implemented");
	}

	[Symbol.iterator]() {
		return this;
	}
}

export interface Environment<T> {
	[Default](tag: string | symbol): Intrinsic<T>;
	[Root]: Intrinsic<T>;
	[tag: string]: Intrinsic<T>; // Intrinsic<T> | Environment<T>;
	// TODO: allow symbol index parameters when typescript gets its shit together
	// [tag: symbol]: Intrinsic<T>; // Intrinsic<T> | Environment<T>;
}

const defaultEnv: Environment<any> = {
	[Default](tag: string | symbol): never {
		tag = typeof tag === "string" ? tag : tag.toString();
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
