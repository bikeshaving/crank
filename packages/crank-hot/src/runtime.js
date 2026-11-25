import {Copy, createElement} from "@b9g/crank";

// One family per component, shared by every version of its module.
const families = (globalThis.__crankFamilies ||= new Map());
const dirty = (globalThis.__crankDirty ||= new Set());

export const BREAK = Symbol.for("crank.hot.break");

function isContext(value) {
	return (
		value != null &&
		typeof value.refresh === "function" &&
		typeof value.cleanup === "function"
	);
}

/**
 * An edit which cannot render is reported, and what was rendered before it
 * is left in place until the next edit. Once the edit has rendered, what it
 * throws is thrown as it would be without this module.
 */
function fail(family, err) {
	family.broken = true;
	console.error(err);
}

// Runs a view which has replaced the one a component was written with.
function* guard(family, iterator) {
	let step;
	if (family.verified) {
		step = iterator.next();
	} else {
		try {
			step = iterator.next();
			family.verified = true;
		} catch (err) {
			fail(family, err);
			yield createElement(Copy);
			return undefined;
		}
	}

	while (!step.done) {
		let sent;
		let resumed = false;
		try {
			sent = yield step.value;
			resumed = true;
		} catch (err) {
			resumed = true;
			step = iterator.throw(err);
			continue;
		} finally {
			if (!resumed) {
				iterator.return();
			}
		}

		step = iterator.next(sent);
	}

	return step.value;
}

async function* guardAsync(family, iterator) {
	let step;
	if (family.verified) {
		step = await iterator.next();
	} else {
		try {
			step = await iterator.next();
			family.verified = true;
		} catch (err) {
			fail(family, err);
			yield createElement(Copy);
			return undefined;
		}
	}

	while (!step.done) {
		let sent;
		let resumed = false;
		try {
			sent = yield step.value;
			resumed = true;
		} catch (err) {
			resumed = true;
			step = await iterator.throw(err);
			continue;
		} finally {
			if (!resumed) {
				await iterator.return();
			}
		}

		step = await iterator.next(sent);
	}

	return step.value;
}

function* keep() {
	yield createElement(Copy);
}

function track(set, ctx) {
	if (!set.has(ctx)) {
		set.add(ctx);
		ctx.cleanup(() => set.delete(ctx));
	}
}

function isSame(a, b) {
	if (!a || !b || a.length !== b.length) {
		return false;
	}

	for (let i = 0; i < a.length; i++) {
		if (!Object.is(a[i], b[i])) {
			return false;
		}
	}

	return true;
}

/**
 * Takes up the newest version of a component which has been registered.
 *
 * This waits until something needs the component, because the values which
 * its setup uses are bindings of a module which is still being evaluated
 * when the component is registered.
 */
function settle(family) {
	const next = family.next;
	if (!next) {
		return;
	}

	family.next = undefined;
	let inputs;
	try {
		inputs = next.inputs ? next.inputs() : [];
	} catch (_) {
		// A binding which cannot be read yet is one which has changed.
		inputs = undefined;
	}

	const isFirst = family.impl === undefined;
	// What to go back to if the new version cannot be mounted.
	family.previous = isFirst
		? undefined
		: {
				kind: family.kind,
				signature: family.signature,
				impl: family.impl,
				stable: family.stable,
				view: family.view,
				scope: family.scope,
				inputs: family.inputs,
				make: family.make,
				fresh: family.fresh,
			};
	// The component is the same while the code which holds its state is, and
	// the values which that code uses are.
	const same =
		!isFirst &&
		family.kind === next.kind &&
		family.signature === next.signature &&
		isSame(family.inputs, inputs);
	family.kind = next.kind;
	family.signature = next.signature;
	family.impl = next.impl;
	family.view = next.view;
	family.scope = next.scope;
	family.inputs = inputs;
	family.make = undefined;
	family.verified = isFirst;
	family.broken = false;
	if (same) {
		family.fresh = false;
	} else {
		family.stable = next.impl;
		family.fresh = true;
		family.remount = !isFirst;
	}
}

function createFamily(key) {
	const family = {
		kind: undefined,
		signature: undefined,
		impl: undefined,
		// The version which instances are created from.
		stable: undefined,
		// The body of the loop of the newest version: its source, and the line
		// and column it starts at in its module.
		view: undefined,
		scope: undefined,
		inputs: undefined,
		// The newest version, until something needs the component.
		next: undefined,
		previous: undefined,
		make: undefined,
		// Whether the view is the one written in the stable version.
		fresh: true,
		// Whether the newest version has rendered, or has failed to.
		verified: true,
		broken: false,
		shells: new Set(),
		instances: new Set(),
		remount: false,
		shell: undefined,
	};

	family.shell = function (props) {
		settle(family);
		if (!isContext(this)) {
			// Something other than Crank is calling the function.
			return family.impl.apply(this, arguments);
		}

		track(family.shells, this);
		if (family.kind !== "fn") {
			return createElement(family.stable, props);
		} else if (family.broken) {
			return createElement(Copy);
		} else if (family.verified) {
			return family.impl.call(this, props, this);
		}

		let result;
		try {
			result = family.impl.call(this, props, this);
		} catch (err) {
			fail(family, err);
			return createElement(Copy);
		}

		if (result && typeof result.then === "function") {
			const impl = family.impl;
			return result.then(
				(value) => {
					if (family.impl === impl) {
						family.verified = true;
					}

					return value;
				},
				(err) => {
					if (family.impl !== impl) {
						throw err;
					}

					fail(family, err);
					return createElement(Copy);
				},
			);
		}

		family.verified = true;
		return result;
	};

	Object.defineProperty(family.shell, "name", {
		value: key.slice(key.indexOf("#") + 1),
	});
	return family;
}

/**
 * Registers a version of a component, and returns the component which the
 * rest of the app sees: the same function for as long as the page lives.
 *
 * @param kind - "fn", "gen" or "agen".
 * @param signature - A hash of the code which holds the state of the
 * component. Instances carry on while it stays the same.
 * @param view - The body of the loop of a generator component as source,
 * with the line and column it starts at, or null when it could not be
 * separated.
 * @param scope - A function which returns the bindings of the module.
 * @param inputs - A function which returns the values of the bindings which
 * the code outside the loop uses, or null. Instances carry on while they stay
 * the same.
 */
export function register(key, kind, signature, view, scope, inputs, impl) {
	let family = families.get(key);
	const isFirst = !family;
	if (!family) {
		family = createFamily(key);
		families.set(key, family);
	}

	family.next = {kind, signature, view, scope, inputs, impl};
	if (!isFirst) {
		dirty.add(family);
		// The instances are re-rendered once every module which is being
		// replaced has been evaluated.
		if (!globalThis.__crankFlush) {
			globalThis.__crankFlush = setTimeout(flush);
		}
	}

	return family.shell;
}

// What value() last returned for each key.
const values = (globalThis.__crankValues ||= new Map());
let evaluations = 0;

/**
 * Evaluates a const which is declared with a call and named like a
 * component, such as `const Fancy = withTheme(Card)`.
 *
 * The result is kept while the call and what it uses are the same. When the
 * result is a function it is registered as a component, so that the rest of
 * the app sees one function for it too.
 */
export function value(key, signature, inputs, make) {
	let current;
	try {
		current = inputs ? inputs() : [];
	} catch (_) {
		current = undefined;
	}

	const last = values.get(key);
	if (last && last.signature === signature && isSame(last.inputs, current)) {
		return last.result;
	}

	let result = make();
	if (typeof result === "function") {
		const name = Object.getPrototypeOf(result).constructor.name;
		const kind =
			name === "GeneratorFunction"
				? "gen"
				: name === "AsyncGeneratorFunction"
					? "agen"
					: "fn";
		// A generator component which was made again is a different component.
		result = register(
			key,
			kind,
			kind === "fn" ? "" : `${signature}:${evaluations++}`,
			null,
			undefined,
			null,
			result,
		);
	}

	values.set(key, {signature, inputs: current, result});
	return result;
}

/**
 * Called by a generator component when it starts.
 */
export function mount(key, ctx) {
	const family = families.get(key);
	if (family && isContext(ctx)) {
		track(family.instances, ctx);
	}
}

/**
 * Makes a function which makes a view from the bindings of its module and
 * the variables of an instance.
 *
 * Function bodies are not strict, so `with` is allowed, and the function
 * inside can still be strict. The engine resolves each name: a local of the
 * component, then a binding of the module, then a global.
 *
 * The body starts on the line and at the column it has in its module, so
 * that the source map of the module is the source map of the view.
 */
function compile(family) {
	const [source, line, column] = family.view;
	// The function which the constructor makes starts with two lines, and the
	// line after them is for what goes around the body.
	const padding = line >= 3 ? "\n".repeat(line - 2) + " ".repeat(column) : "";
	const scope = family.scope;
	const map =
		padding && scope.map
			? `\n//# sourceURL=${scope.id}?hot=${evaluations++}\n//# sourceMappingURL=${scope.map}`
			: "";
	try {
		return new Function(
			"__module",
			"__locals",
			"__BREAK",
			`with (__module) with (__locals) { return ${
				family.kind === "agen" ? "async " : ""
			}function* () { "use strict";${padding}${source}\n}; }${map}`,
		);
	} catch (err) {
		if (err instanceof SyntaxError) {
			throw err;
		}

		// A content security policy which does not allow strings to be
		// evaluated.
		console.error(
			"crank-hot could not evaluate an edit, most likely because the " +
				"Content-Security-Policy of the page does not allow 'unsafe-eval'. " +
				"The page is being loaded again instead.",
			err,
		);
		if (
			globalThis.location &&
			typeof globalThis.location.reload === "function"
		) {
			globalThis.location.reload();
		}

		return undefined;
	}
}

/**
 * Called by a generator component at the top of its loop. Returns a
 * generator function to run in place of the body of the loop, or undefined
 * when the body as it was written is current.
 *
 * @param getLocals - Returns an object with a getter, and a setter where it
 * can be assigned to, for every variable which is in scope at the loop.
 */
export function view(key, getLocals) {
	const family = families.get(key);
	if (!family) {
		return undefined;
	}

	settle(family);
	if (family.fresh || family.view == null) {
		return undefined;
	} else if (family.broken) {
		return keep;
	}

	if (!family.make) {
		family.make = compile(family);
		if (!family.make) {
			family.broken = true;
			return keep;
		}
	}

	const made = family.make(family.scope(), getLocals(), BREAK);
	return family.kind === "agen"
		? function () {
				return guardAsync(family, made.call(this));
			}
		: function () {
				return guard(family, made.call(this));
			};
}

/**
 * Re-renders the live instances of the components which were registered
 * again.
 */
export function flush() {
	clearTimeout(globalThis.__crankFlush);
	globalThis.__crankFlush = undefined;
	const updated = [...dirty];
	dirty.clear();
	for (const family of updated) {
		settle(family);
		const isRemount = family.remount;
		const contexts =
			family.kind === "fn" || isRemount ? family.shells : family.instances;
		family.remount = false;
		for (const ctx of [...contexts]) {
			if (ctx.isUnmounted) {
				continue;
			}

			try {
				ctx.refresh();
			} catch (err) {
				console.error(err);
				if (isRemount && family.previous) {
					// The new version could not be mounted, so the version before
					// it is the component again.
					Object.assign(family, family.previous);
					family.previous = undefined;
					family.verified = true;
					try {
						ctx.refresh();
					} catch (_) {
						// The error has been reported.
					}
				}
			}
		}
	}
}
