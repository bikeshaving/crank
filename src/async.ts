import type {Children, Component, Context} from "./crank.js";
import {createElement} from "./crank.js";

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
	this.provide(SuspenseListController, undefined);
	for await ({children, fallback, timeout} of this) {
		if (timeout == null) {
			if (controller) {
				timeout = controller.timeout;
			} else {
				timeout = 300;
			}
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

interface SuspenseListItem {
	ctx: Context;
	resolve: () => void;
	promise: Promise<void>;
}

interface SuspenseListController {
	timeout?: number;
	revealOrder?: "forwards" | "backwards" | "together";
	tail?: "collapsed" | "hidden";
	register(ctx: Context): Promise<Array<SuspenseListItem>>;
	isHead(ctx: Context, items: Array<SuspenseListItem>): boolean;
	scheduleFallback(ctx: Context, items: Array<SuspenseListItem>): Promise<void>;
	scheduleChildren(ctx: Context, items: Array<SuspenseListItem>): Promise<void>;
}

declare global {
	namespace Crank {
		interface ProvisionMap {
			[SuspenseListController]: SuspenseListController;
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
		setTimeout(() => {
			finishRegistration();
			registering = null;
		});
		yield children;
	}
}
