import {isPromiseLike, unwrap, wrap, arrayify, NOOP} from "../util";
import {Context, commitCtx, unmountCtx, updateCtx} from "./context";
import {
	Element,
	ElementValue,
	Portal,
	Children,
	createElement,
	getChildValues,
	IsInUse,
	Component,
	Raw,
	Fragment,
	NarrowedChild,
	Key,
	narrow,
	Copy,
	getInflightValue,
	cloneElement,
	normalize,
	HadChildren,
} from "./elements";
import {getListeners, isEventTarget} from "./events";

/**
 * An abstract class which is subclassed to render to different target
 * environments. This class is responsible for kicking off the rendering
 * process, caching previous trees by root, and creating, mutating and
 * disposing of nodes.
 *
 * @template TNode - The type of the node for a rendering environment.
 * @template TScope - Data which is passed down the tree.
 * @template TRoot - The type of the root for a rendering environment.
 * @template TResult - The type of exposed values.
 */
export class Renderer<
	TNode,
	TScope,
	TRoot = TNode,
	TResult = ElementValue<TNode>
> {
	/**
	 * @internal
	 * A weakmap which stores element trees by root.
	 */
	_cache: WeakMap<object, Element<Portal>>;
	constructor() {
		this._cache = new WeakMap();
	}

	/**
	 * Renders an element tree into a specific root.
	 *
	 * @param children - An element tree. You can render null with a previously
	 * used root to delete the previously rendered element tree from the cache.
	 * @param root - The node to be rendered into. The renderer will cache
	 * element trees per root.
	 * @param ctx - An optional context that will be the ancestor context of all
	 * elements in the tree. Useful for connecting renderers which call each
	 * other so that events/provisions properly propagate. The context for a
	 * given root must be the same or an error will be thrown.
	 *
	 * @returns The result of rendering the children, or a possible promise of
	 * the result if the element tree renders asynchronously.
	 */
	render(
		children: Children,
		root?: TRoot | undefined,
		ctx?: Context | undefined,
	): Promise<TResult> | TResult {
		let portal: Element<Portal> | undefined;
		if (typeof root === "object" && root !== null) {
			portal = this._cache.get(root as any);
		}

		if (portal === undefined) {
			portal = createElement(Portal, {children, root});
			portal._n = ctx;
			if (typeof root === "object" && root !== null && children != null) {
				this._cache.set(root as any, portal);
			}
		} else {
			if (portal._n !== ctx) {
				throw new Error("Context mismatch");
			}

			portal.props = {children, root};
			if (typeof root === "object" && root !== null && children == null) {
				this._cache.delete((root as unknown) as object);
			}
		}

		const value = update(this, root, portal, ctx, undefined, portal);
		// We return the child values of the portal because portal elements
		// themselves have no readable value.
		if (isPromiseLike(value)) {
			return value.then(() => {
				const result = this.read(unwrap(getChildValues<TNode>(portal!)));
				if (root == null) {
					unmount(this, portal!, undefined, portal!);
				}

				return result;
			});
		}

		const result = this.read(unwrap(getChildValues<TNode>(portal)));
		if (root == null) {
			unmount(this, portal, undefined, portal);
		}

		return result;
	}

	/**
	 * Called when an element’s rendered value is exposed via render, schedule,
	 * refresh, refs, or generator yield expressions.
	 *
	 * @param value - The value of the element being read. Can be a node, a
	 * string, undefined, or an array of nodes and strings, depending on the
	 * element.
	 *
	 * @returns Varies according to the specific renderer subclass. By default,
	 * it exposes the element’s value.
	 *
	 * This is useful for renderers which don’t want to expose their internal
	 * nodes. For instance, the HTML renderer will convert all internal nodes to
	 * strings.
	 */
	read(value: ElementValue<TNode>): TResult {
		return (value as unknown) as TResult;
	}

	/**
	 * Called in a preorder traversal for each host element.
	 *
	 * Useful for passing data down the element tree. For instance, the DOM
	 * renderer uses this method to keep track of whether we’re in an SVG
	 * subtree.
	 *
	 * @param el - The host element.
	 * @param scope - The current scope.
	 *
	 * @returns The scope to be passed to create and scope for child host
	 * elements.
	 *
	 * This method sets the scope for child host elements, not the current host
	 * element.
	 */
	scope(_el: Element<string | symbol>, scope: TScope | undefined): TScope {
		return scope as TScope;
	}

	/**
	 * Called for each string in an element tree.
	 *
	 * @param text - The string child.
	 * @param scope - The current scope.
	 *
	 * @returns The escaped string.
	 *
	 * Rather than returning text nodes for whatever environment we’re rendering
	 * to, we defer that step for Renderer.prototype.arrange. We do this so that
	 * adjacent strings can be concatenated and the actual element tree can be
	 * rendered in a normalized form.
	 */
	escape(text: string, _scope: TScope): string {
		return text;
	}

	/**
	 * Called for each Raw element whose value prop is a string.
	 *
	 * @param text - The string child.
	 * @param scope - The current scope.
	 *
	 * @returns The parsed node or string.
	 */
	parse(text: string, _scope: TScope): TNode | string {
		return text;
	}

	/**
	 * Called for each host element when it is committed for the first time.
	 *
	 * @param el - The host element.
	 * @param scope - The current scope.
	 *
	 * @returns A “node” which determines the value of the host element.
	 */
	create(_el: Element<string | symbol>, _scope: TScope): TNode {
		throw new Error("Not implemented");
	}

	/**
	 * Called for each host element when it is committed.
	 *
	 * @param el - The host element.
	 * @param node - The node associated with the host element.
	 *
	 * @returns The return value is ignored.
	 *
	 * Used to mutate the node associated with an element when new props are
	 * passed.
	 */
	patch(_el: Element<string | symbol>, _node: TNode): unknown {
		return;
	}

	// TODO: pass hints into arrange about where the dirty children start and end
	/**
	 * Called for each host element so that elements can be arranged into a tree.
	 *
	 * @param el - The host element.
	 * @param node - The node associated with the host element.
	 * @param children - An array of nodes and strings from child elements.
	 *
	 * @returns The return value is ignored.
	 *
	 * This method is also called by child components contexts as the last step
	 * of a refresh.
	 */
	arrange(
		_el: Element<string | symbol>,
		_node: TNode | TRoot,
		_children: Array<TNode | string>,
	): unknown {
		return;
	}

	// TODO: remove(): a method which is called to remove a child from a parent
	// to optimize arrange

	/**
	 * Called for each host element when it is unmounted.
	 *
	 * @param el - The host element.
	 * @param node - The node associated with the host element.
	 *
	 * @returns The return value is ignored.
	 */
	dispose(_el: Element<string | symbol>, _node: TNode): unknown {
		return;
	}

	/**
	 * Called at the end of the rendering process for each root of the tree.
	 *
	 * @param root - The root prop passed to portals or the render method.
	 *
	 * @returns The return value is ignored.
	 */
	complete(_root: TRoot): unknown {
		return;
	}
}

/*** PRIVATE RENDERER FUNCTIONS ***/

function mount<TNode, TScope, TRoot, TResult>(
	renderer: Renderer<TNode, TScope, TRoot, TResult>,
	root: TRoot,
	host: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: TScope,
	el: Element,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	el._f |= IsInUse;
	if (typeof el.tag === "function") {
		el._n = new Context(
			renderer,
			root,
			host,
			ctx,
			scope,
			el as Element<Component>,
		);

		return updateCtx(el._n);
	} else if (el.tag === Raw) {
		return commit(renderer, scope, el, []);
	} else if (el.tag !== Fragment) {
		if (el.tag === Portal) {
			root = el.props.root;
		} else {
			el._n = renderer.create(el as Element<string | symbol>, scope);
			renderer.patch(el as Element<string | symbol>, el._n);
		}

		host = el as Element<string | symbol>;
		scope = renderer.scope(host, scope);
	}

	return updateChildren(
		renderer,
		root,
		host,
		ctx,
		scope,
		el,
		el.props.children,
	);
}

function update<TNode, TScope, TRoot, TResult>(
	renderer: Renderer<TNode, TScope, TRoot, TResult>,
	root: TRoot,
	host: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: TScope,
	el: Element,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	if (typeof el.tag === "function") {
		return updateCtx(el._n);
	} else if (el.tag === Raw) {
		return commit(renderer, scope, el, []);
	} else if (el.tag !== Fragment) {
		if (el.tag === Portal) {
			root = el.props.root;
		} else {
			renderer.patch(el as Element<string | symbol>, el._n);
		}

		host = el as Element<string | symbol>;
		scope = renderer.scope(host, scope);
	}

	return updateChildren(
		renderer,
		root,
		host,
		ctx,
		scope,
		el,
		el.props.children,
	);
}

function createChildrenByKey(
	children: Array<NarrowedChild>,
): Map<Key, Element> {
	const childrenByKey = new Map<Key, Element>();
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (typeof child === "object" && typeof child.key !== "undefined") {
			childrenByKey.set(child.key, child);
		}
	}

	return childrenByKey;
}

export function updateChildren<TNode, TScope, TRoot, TResult>(
	renderer: Renderer<TNode, TScope, TRoot, TResult>,
	root: TRoot,
	host: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	scope: TScope,
	el: Element,
	children: Children,
): Promise<ElementValue<TNode>> | ElementValue<TNode> {
	const oldChildren = wrap(el._ch);
	const newChildren = arrayify(children);
	const newChildren1: Array<NarrowedChild> = [];
	const values: Array<Promise<ElementValue<TNode>> | ElementValue<TNode>> = [];
	let graveyard: Array<Element> | undefined;
	let seenKeys: Set<Key> | undefined;
	let childrenByKey: Map<Key, Element> | undefined;
	let isAsync = false;
	let i = 0;
	for (
		let j = 0, il = oldChildren.length, jl = newChildren.length;
		j < jl;
		j++
	) {
		let oldChild = i >= il ? undefined : oldChildren[i];
		let newChild = narrow(newChildren[j]);
		// ALIGNMENT
		let oldKey = typeof oldChild === "object" ? oldChild.key : undefined;
		let newKey = typeof newChild === "object" ? newChild.key : undefined;
		if (newKey !== undefined && seenKeys && seenKeys.has(newKey)) {
			console.error("Duplicate key", newKey);
			newKey = undefined;
		}

		if (oldKey === newKey) {
			if (childrenByKey !== undefined && newKey !== undefined) {
				childrenByKey.delete(newKey);
			}

			i++;
		} else {
			if (!childrenByKey) {
				childrenByKey = createChildrenByKey(oldChildren.slice(i));
			}

			if (newKey === undefined) {
				while (oldChild !== undefined && oldKey !== undefined) {
					i++;
					oldChild = oldChildren[i];
					oldKey = typeof oldChild === "object" ? oldChild.key : undefined;
				}

				i++;
			} else {
				oldChild = childrenByKey.get(newKey);
				if (oldChild !== undefined) {
					childrenByKey.delete(newKey);
				}

				if (!seenKeys) {
					seenKeys = new Set();
				}

				seenKeys.add(newKey);
			}
		}

		// UPDATING
		let value: Promise<ElementValue<TNode>> | ElementValue<TNode>;
		if (
			typeof oldChild === "object" &&
			typeof newChild === "object" &&
			oldChild.tag === newChild.tag
		) {
			if (
				oldChild.tag === Portal &&
				oldChild.props.root !== newChild.props.root
			) {
				renderer.arrange(oldChild as Element<Portal>, oldChild.props.root, []);
				renderer.complete(oldChild.props.root);
			}

			// TODO: implement Raw element parse caching
			if (oldChild !== newChild) {
				oldChild.props = newChild.props;
				oldChild.ref = newChild.ref;
				newChild = oldChild;
			}

			value = update(renderer, root, host, ctx, scope, newChild);
		} else if (typeof newChild === "object") {
			if (newChild.tag === Copy) {
				value =
					typeof oldChild === "object"
						? getInflightValue<TNode>(oldChild)
						: oldChild;
				if (typeof newChild.ref === "function") {
					if (isPromiseLike(value)) {
						value.then(newChild.ref).catch(NOOP);
					} else {
						newChild.ref(value);
					}
				}

				newChild = oldChild;
			} else {
				if (newChild._f & IsInUse) {
					newChild = cloneElement(newChild);
				}

				value = mount(renderer, root, host, ctx, scope, newChild);
				if (isPromiseLike(value)) {
					newChild._fb = oldChild;
				}
			}
		} else if (typeof newChild === "string") {
			newChild = value = renderer.escape(newChild, scope);
		}

		newChildren1[j] = newChild;
		values[j] = value;
		isAsync = isAsync || isPromiseLike(value);
		if (typeof oldChild === "object" && oldChild !== newChild) {
			if (!graveyard) {
				graveyard = [];
			}

			graveyard.push(oldChild);
		}
	}

	el._ch = unwrap(newChildren1);
	// cleanup
	for (; i < oldChildren.length; i++) {
		const oldChild = oldChildren[i];
		if (typeof oldChild === "object" && typeof oldChild.key === "undefined") {
			if (!graveyard) {
				graveyard = [];
			}

			graveyard.push(oldChild);
		}
	}

	if (childrenByKey !== undefined && childrenByKey.size > 0) {
		if (!graveyard) {
			graveyard = [];
		}

		graveyard.push(...childrenByKey.values());
	}

	if (isAsync) {
		let values1 = Promise.all(values).finally(() => {
			if (graveyard) {
				for (let i = 0; i < graveyard.length; i++) {
					unmount(renderer, host, ctx, graveyard[i]);
				}
			}
		});

		let onvalues!: Function;
		values1 = Promise.race([
			values1,
			new Promise<any>((resolve) => (onvalues = resolve)),
		]);

		if (el._ov) {
			el._ov(values1);
		}

		el._ic = values1.then((values) =>
			commit(renderer, scope, el, normalize(values)),
		);

		el._ov = onvalues;
		return el._ic;
	}

	if (graveyard) {
		for (let i = 0; i < graveyard.length; i++) {
			unmount(renderer, host, ctx, graveyard[i]);
		}
	}

	if (el._ov) {
		el._ov(values);
		el._ov = undefined;
	}

	return commit(
		renderer,
		scope,
		el,
		normalize(values as Array<ElementValue<TNode>>),
	);
}

function commit<TNode, TScope, TRoot, TResult>(
	renderer: Renderer<TNode, TScope, TRoot, TResult>,
	scope: TScope,
	el: Element,
	values: Array<TNode | string>,
): ElementValue<TNode> {
	if (el._ic) {
		el._ic = undefined;
	}

	// Need to handle (_fb) fallback being the empty string.
	if (typeof el._fb !== "undefined") {
		el._fb = undefined;
	}

	let value: ElementValue<TNode>;
	if (typeof el.tag === "function") {
		value = commitCtx(el._n, values);
	} else if (el.tag === Raw) {
		if (typeof el.props.value === "string") {
			el._n = renderer.parse(el.props.value, scope);
		} else {
			el._n = el.props.value;
		}

		value = el._n;
	} else if (el.tag === Fragment) {
		value = unwrap(values);
	} else {
		if (el.tag === Portal) {
			renderer.arrange(el as Element<Portal>, el.props.root, values);
			renderer.complete(el.props.root);
		} else {
			renderer.arrange(el as Element<string | symbol>, el._n, values);
		}

		value = el._n;
		if (values.length) {
			el._f |= HadChildren;
		} else {
			el._f &= ~HadChildren;
		}
	}

	if (el.ref) {
		el.ref(renderer.read(value));
	}

	return value;
}

function unmount<TNode, TScope, TRoot, TResult>(
	renderer: Renderer<TNode, TScope, TRoot, TResult>,
	host: Element<string | symbol>,
	ctx: Context<unknown, TResult> | undefined,
	el: Element,
): void {
	if (typeof el.tag === "function") {
		unmountCtx(el._n);
		ctx = el._n;
	} else if (el.tag === Portal) {
		host = el as Element<symbol>;
		renderer.arrange(host, host.props.root, []);
		renderer.complete(host.props.root);
	} else if (el.tag !== Fragment) {
		if (isEventTarget(el._n)) {
			const listeners = getListeners(ctx, host);
			for (let i = 0; i < listeners.length; i++) {
				const record = listeners[i];
				el._n.removeEventListener(record.type, record.callback, record.options);
			}
		}

		host = el as Element<string | symbol>;
		renderer.dispose(host, host._n);
	}

	const children = wrap(el._ch);
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		if (typeof child === "object") {
			unmount(renderer, host, ctx, child);
		}
	}
}
