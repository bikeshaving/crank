// Throwaway prototype for #293. Validates the maybe-async walk that streaming
// SSR reduces to (the issue's "Eager DFS Traversal of an Async Tree").
//
// The point it proves: this is the renderer's *existing* diff/commit split.
//   - diff  = eager fan-out. Every function is called the moment it is
//             encountered (siblings in array order; a nested function the
//             moment its parent resolves), producing a tree whose async nodes
//             are inline-awaitable promises. Nothing is emitted here.
//   - commit = strict-order maybe-async fold. Emits onEnter pre-order and
//             onExit post-order, awaiting each async node inline so no node is
//             ever emitted before its predecessor. Returns a string when the
//             tree held no async node, a Promise otherwise.
//
// Streaming is naming the sink onEnter/onExit already flush to. Atomic is the
// degenerate case: a fully-resolved diff, so commit never awaits.

type Tree = string | Tree[] | (() => Promise<Tree>);

type Diffed =
	| {kind: "string"; value: string}
	| {kind: "array"; children: Array<Diffed>}
	| {kind: "async"; promise: Promise<Diffed>};

function isPromiseLike(value: any): value is PromiseLike<unknown> {
	return value != null && typeof value.then === "function";
}

// Eager fan-out. Calling `tree()` here is what "starts" a delay; mapping over
// an array starts every sibling in order; the `.then(diff)` restarts on
// resolution so a function resolving to a function is also started at once.
function diff(tree: Tree): Diffed {
	if (typeof tree === "function") {
		return {kind: "async", promise: tree().then(diff)};
	} else if (typeof tree === "string") {
		return {kind: "string", value: tree};
	}

	return {kind: "array", children: tree.map(diff)};
}

// Strict-order emit. `onEnter` fires before descending (the shell flushes
// ahead of async children); each child is awaited inline before its successor.
function commit(
	node: Diffed,
	onEnter: (value: string) => void,
	onExit: (value: string) => void,
): Promise<string> | string {
	if (node.kind === "async") {
		return node.promise.then((resolved) => commit(resolved, onEnter, onExit));
	} else if (node.kind === "string") {
		onEnter(node.value);
		onExit(node.value);
		return node.value;
	}

	onEnter("");
	let result = "";
	const children = node.children;
	const go = (i: number): Promise<string> | string => {
		for (; i < children.length; i++) {
			const childResult = commit(children[i], onEnter, onExit);
			if (isPromiseLike(childResult)) {
				return childResult.then((s) => {
					result += s;
					return go(i + 1);
				});
			}

			result += childResult;
		}

		onExit("");
		return result;
	};

	return go(0);
}

export function walk(
	tree: Tree,
	onEnter: (value: string) => void,
	onExit: (value: string) => void,
): Promise<string> | string {
	return commit(diff(tree), onEnter, onExit);
}
