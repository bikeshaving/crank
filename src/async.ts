import type {Children, Component, Context} from "./crank.js";
import {createElement, Portal, Raw} from "./crank.js";

/**
 * Creates a lazy-loaded component from an initializer function.
 *
 * @param initializer - Function that returns a Promise resolving to a component or module
 * @returns A component that loads the target component on first render
 *
 * @example
 * ```jsx
 * const LazyComponent = lazy(() => import('./MyComponent'));
 *
 * <Suspense fallback={<div>Loading...</div>}>
 *   <LazyComponent prop="value" />
 * </Suspense>
 * ```
 */
export function lazy<T extends Component>(
	initializer: () => Promise<T | {default: T}>,
): T {
	return async function* LazyComponent(
		this: Context,
		props: any,
	): AsyncGenerator<Children> {
		let Component = await initializer();
		if (Component && typeof Component === "object" && "default" in Component) {
			Component = Component.default;
		}

		if (typeof Component !== "function") {
			throw new Error(
				"Lazy component initializer must return a Component or a module with a default export that is a Component.",
			);
		}

		for (props of this) {
			yield createElement(Component, props);
		}
	} as unknown as T;
}

async function SuspenseEmpty() {
	await new Promise((resolve) => setTimeout(resolve));
	return null;
}

async function SuspenseFallback(
	this: Context,
	{
		children,
		timeout,
		schedule,
	}: {
		children: Children;
		timeout: number;
		schedule: () => Promise<unknown>;
	},
): Promise<Children> {
	this.schedule(schedule);
	await new Promise((resolve) => setTimeout(resolve, timeout));
	return children;
}

function SuspenseChildren(
	this: Context,
	{
		children,
		schedule,
	}: {
		children: Children;
		schedule: () => Promise<unknown>;
	},
) {
	this.schedule(schedule);
	return children;
}

function* SuspenseBoundaryChildren(
	this: Context,
	{
		children,
		boundary,
		ready,
	}: {
		children: Children;
		boundary: SuspenseBoundary;
		ready: (boundary: SuspenseBoundary | undefined) => void;
	},
): Generator<Children> {
	// Suspense components in the children are in the contents of the boundary.
	this.provide(SuspenseBoundaries, () => boundary.boundary());
	for ({children, boundary, ready} of this) {
		try {
			this.schedule(() => ready(boundary));
			yield children;
		} catch (err) {
			// Once the placeholder has been rendered, the rest of the document
			// does not depend on the children, so the error is the boundary's.
			if (!boundary.abort(err)) {
				throw err;
			}

			ready(undefined);
			yield null;
		}
	}
}

/**
 * A component that displays a fallback while its children are loading.
 *
 * When used within a SuspenseList, coordinates with siblings to control
 * reveal order and fallback behavior.
 *
 * @param children - The content to display when loading is complete
 * @param fallback - The content to display while children are loading
 * @param timeout - Time in milliseconds before showing fallback (defaults to
 * 300ms standalone, or inherits from SuspenseList)
 *
 * @example
 * ```jsx
 * <Suspense fallback={<div>Loading...</div>}>
 *   <AsyncComponent />
 * </Suspense>
 * ```
 */
export async function* Suspense(
	this: Context,
	{
		children,
		fallback,
		timeout,
	}: {children: Children; fallback: Children; timeout?: number},
): AsyncGenerator<Children> {
	const controller = this.consume(SuspenseListController);
	const createBoundary = this.consume(SuspenseBoundaries) as
		| (() => SuspenseBoundary | undefined)
		| undefined;
	this.provide(SuspenseListController, undefined);
	for await ({children, fallback, timeout} of this) {
		if (timeout == null) {
			if (controller) {
				timeout = controller.timeout;
			} else {
				timeout = 300;
			}
		}

		if (this.isHydrating) {
			// The document already has the children, so a fallback would only
			// replace them.
			yield children;
			continue;
		}

		const boundary = createBoundary && createBoundary();
		if (createBoundary && !boundary) {
			// A render to a string has nothing which could replace a fallback
			// later, so it waits for the children.
			yield children;
			continue;
		} else if (boundary) {
			// The children are rendered into the boundary, which writes them in
			// place, or writes the placeholder in place and the children after
			// the document.
			let canShow = true;
			let ready = (boundary1: SuspenseBoundary | undefined): void => {
				if (boundary1 && !boundary1.close(true)) {
					boundary1.reveal();
				}
			};

			if (controller) {
				const items = await controller.register(this);
				const item = items.find((item) => item.ctx === this);
				canShow =
					controller.revealOrder !== "together" && controller.tail !== "hidden";
				boundary.showing = canShow && controller.isHead(this, items);
				if (item && canShow && !boundary.showing) {
					item.fallback = () => boundary.fallback();
				}

				ready = (boundary1) => controller.ready(this, items, boundary1);
			}

			yield createElement(SuspenseFallback, {
				timeout: timeout!,
				children: [
					createElement(
						Portal,
						{root: boundary.placeholder},
						canShow ? fallback : null,
					),
					createElement(Raw, {value: boundary.placeholder}),
				],
				schedule: () => {},
			});
			yield [
				createElement(
					Portal,
					{root: boundary},
					createElement(SuspenseBoundaryChildren, {children, boundary, ready}),
				),
				createElement(Raw, {value: boundary}),
			];
			continue;
		}

		if (!controller) {
			yield createElement(SuspenseFallback, {
				timeout: timeout!,
				children: fallback,
				schedule: () => {},
			});
			yield children;
			continue;
		}

		const items = await controller.register(this);
		if (controller.revealOrder !== "together") {
			if (!controller.isHead(this, items)) {
				yield createElement(SuspenseEmpty);
			}

			if (controller.tail !== "hidden") {
				yield createElement(SuspenseFallback, {
					timeout: timeout!,
					children: fallback,
					schedule: () => controller.scheduleFallback(this, items),
				});
			}
		}

		yield createElement(SuspenseChildren, {
			children,
			schedule: () => controller.scheduleChildren(this, items),
		});
	}
}

const SuspenseListController = Symbol.for("SuspenseListController");

/**
 * Provided by a renderer which does not render for a screen. The function
 * returns a boundary if the renderer can write the children of a Suspense
 * component after the rest of the document, replacing its fallback, and
 * nothing if the component has to wait for its children.
 */
const SuspenseBoundaries = Symbol.for("crank.SuspenseBoundaries");

interface SuspenseBoundary {
	/**
	 * What the fallback is rendered into, and what is rendered in place until
	 * the children can replace it.
	 */
	placeholder: object;
	/** Whether the placeholder has the fallback in it. */
	showing: boolean;
	/** Creates a boundary for a Suspense component in the children. */
	boundary(): SuspenseBoundary;
	/**
	 * Called when the children have been rendered into the boundary. Returns
	 * whether they were rendered in place, which they can only be if inline is
	 * true. If they were not, they are held until reveal() is called.
	 */
	close(inline: boolean): boolean;
	reveal(): void;
	/** Called when a placeholder rendered without the fallback can show it. */
	fallback(): void;
	/**
	 * Called when the children have failed to render. Returns whether the
	 * boundary takes the error, which it does if the placeholder has been
	 * rendered.
	 */
	abort(err: unknown): boolean;
}

interface SuspenseListItem {
	ctx: Context;
	resolve: () => void;
	promise: Promise<void>;
	// The rest is for a list whose components render into boundaries.
	/** Whether the children have rendered, or failed to. */
	ready?: boolean;
	/** Whether the children are in the document, or are never going to be. */
	revealed?: boolean;
	/** Whether the children were rendered in place. */
	inline?: boolean;
	reveal?: () => void;
	/** Shows the fallback of a placeholder which was rendered without it. */
	fallback?: (() => void) | undefined;
}

interface SuspenseListController {
	timeout?: number;
	revealOrder?: "forwards" | "backwards" | "together";
	tail?: "collapsed" | "hidden";
	register(ctx: Context): Promise<Array<SuspenseListItem>>;
	isHead(ctx: Context, items: Array<SuspenseListItem>): boolean;
	scheduleFallback(ctx: Context, items: Array<SuspenseListItem>): Promise<void>;
	scheduleChildren(ctx: Context, items: Array<SuspenseListItem>): Promise<void>;
	/**
	 * Called when the children of a component which renders into a boundary
	 * have rendered, or with no boundary when they have failed to.
	 */
	ready(
		ctx: Context,
		items: Array<SuspenseListItem>,
		boundary: SuspenseBoundary | undefined,
	): void;
}

declare global {
	namespace Crank {
		interface ProvisionMap {
			[SuspenseListController]: SuspenseListController;
			[SuspenseBoundaries]: () => SuspenseBoundary | undefined;
		}
	}
}

/**
 * Controls when child <Suspense> components show their content or fallbacks
 * based on the specified reveal order. The <SuspenseList> resolves when
 * coordination effort is complete (not necessarily when all content is
 * loaded).
 *
 * @param revealOrder - How children should be revealed:
 *   - "forwards" (default): Show children in document order, waiting for
 *     predecessors
 *   - "backwards": Show children in reverse order, waiting for successors
 *   - "together": Show all children simultaneously when all are ready
 *   In Crank, the default behavior of async components is to render together,
 *   so "together" might not be necessary if you are not using <Suspense>
 *   fallbacks.
 *e@param tail - How to handle fallbacks:
 *   - "collapsed" (default): Show only the fallback for the next unresolved
 *     Suspense component
 *   - "hidden": Hide all fallbacks
 *   Tail behavior only applies when revealOrder is not "together".
 * @param timeout - Default timeout for Suspense children in milliseconds
 * @param children - The elements containing Suspense components to coordinate.
 *   Suspense components which are not rendered immediately (because they are
 *   the children of another async component) will not be coordinated.
 *
 * @example
 * ```jsx
 * <SuspenseList revealOrder="forwards" tail="collapsed">
 *   <Suspense fallback={<div>Loading A...</div>}>
 *     <ComponentA />
 *   </Suspense>
 *   <Suspense fallback={<div>Loading B...</div>}>
 *     <ComponentB />
 *   </Suspense>
 * </SuspenseList>
 * ```
 */
export function* SuspenseList(
	this: Context,
	{
		revealOrder = "forwards",
		tail = "collapsed",
		timeout,
		children,
	}: {
		revealOrder?: "forwards" | "backwards" | "together";
		tail?: "collapsed" | "hidden";
		timeout?: number;
		children: Children;
	},
): Generator<Children> {
	let finishRegistration: () => void;
	let registering: Promise<void> | null = null;
	let items: Array<SuspenseListItem> = [];
	const controller: SuspenseListController = {
		timeout,
		revealOrder,
		tail,
		async register(ctx: Context) {
			if (registering) {
				let childrenResolver!: () => void;
				const childrenPromise = new Promise<void>(
					(r) => (childrenResolver = r),
				);

				items.push({
					ctx,
					resolve: childrenResolver!,
					promise: childrenPromise,
				});

				// Wait for registration to complete
				await registering;
				return items;
			}

			console.error(
				"Component registered outside SuspenseList registration window",
			);
			return [];
		},

		isHead(ctx: Context, suspenseItems: Array<SuspenseListItem>): boolean {
			const index = suspenseItems.findIndex((item) => item.ctx === ctx);
			if (index === -1) {
				return false;
			}
			if (revealOrder === "forwards") {
				return index === 0;
			} else if (revealOrder === "backwards") {
				return index === suspenseItems.length - 1;
			}

			return false;
		},

		async scheduleFallback(
			ctx: Context,
			suspenseItems: Array<SuspenseListItem>,
		) {
			const index = suspenseItems.findIndex((item) => item.ctx === ctx);
			if (index === -1) {
				return;
			} else if (revealOrder === "forwards") {
				await Promise.all(
					suspenseItems.slice(0, index).map((item) => item.promise),
				);
			} else if (revealOrder === "backwards") {
				await Promise.all(
					suspenseItems.slice(index + 1).map((item) => item.promise),
				);
			}
		},

		async scheduleChildren(
			ctx: Context,
			suspenseItems: Array<SuspenseListItem>,
		) {
			const index = suspenseItems.findIndex((item) => item.ctx === ctx);
			if (index === -1) {
				return;
			}

			// This children content is ready
			suspenseItems[index].resolve();
			// Children coordination - determine when this content should show
			if (revealOrder === "together") {
				await Promise.all(suspenseItems.map((item) => item.promise));
			} else if (revealOrder === "forwards") {
				const waitFor = suspenseItems
					.slice(0, index + 1)
					.map((item) => item.promise);
				await Promise.all(waitFor);
			} else if (revealOrder === "backwards") {
				const waitFor = suspenseItems
					.slice(index + 1)
					.map((item) => item.promise);
				await Promise.all(waitFor);
			}
		},

		ready(
			ctx: Context,
			suspenseItems: Array<SuspenseListItem>,
			boundary: SuspenseBoundary | undefined,
		) {
			const index = suspenseItems.findIndex((item) => item.ctx === ctx);
			const item = suspenseItems[index];
			if (!item || item.ready) {
				return;
			}

			item.ready = true;
			if (!boundary) {
				item.revealed = true;
			} else if (
				// A template is written after the document, so children are only
				// rendered in place if nothing which is revealed before them is in
				// a template.
				boundary.close(
					revealOrder === "forwards" &&
						suspenseItems.slice(0, index).every((item1) => item1.inline),
				)
			) {
				item.inline = true;
				item.revealed = true;
			} else {
				item.reveal = () => boundary.reveal();
			}

			const order =
				revealOrder === "backwards"
					? suspenseItems.slice().reverse()
					: suspenseItems;
			if (revealOrder !== "together" || order.every((item1) => item1.ready)) {
				for (const item1 of order) {
					if (!item1.ready) {
						break;
					} else if (!item1.revealed) {
						item1.revealed = true;
						item1.reveal!();
					}
				}
			}

			// A collapsed tail shows the fallback of whichever is revealed next.
			const next = order.find((item1) => !item1.revealed);
			if (next && next.fallback) {
				const fallback = next.fallback;
				next.fallback = undefined;
				fallback();
			}
		},
	};

	this.provide(SuspenseListController, controller);
	for ({
		revealOrder = "forwards",
		tail = "collapsed",
		timeout,
		children,
	} of this) {
		items = [];
		controller.timeout = timeout;
		controller.revealOrder = revealOrder;
		controller.tail = tail;
		registering = new Promise((r) => (finishRegistration = r));
		// TODO: Is there a more precise timing for the registration window
		const timerId = setTimeout(() => {
			finishRegistration();
			registering = null;
		});
		this.cleanup(() => clearTimeout(timerId));
		yield children;
	}
}
