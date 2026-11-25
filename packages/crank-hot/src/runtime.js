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

/**
 * Registers a version of a component, and returns the component which the
 * rest of the app sees: the same function for as long as the page lives.
 *
 * @param kind - "fn", "gen" or "agen".
 * @param signature - A hash of the code which holds the state of the
 * component. Instances carry on while it stays the same.
 * @param view - The body of the loop of a generator component as source, or
 * null when it could not be separated.
 * @param scope - A function which returns the bindings of the module.
 */
export function register(key, kind, signature, view, scope, impl) {
	let family = families.get(key);
	if (!family) {
		family = {
			kind,
			signature,
			impl,
			// The version which instances are created from.
			stable: impl,
			view,
			scope,
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
		const created = family;
		family.shell = function (props) {
			if (!isContext(this)) {
				// Something other than Crank is calling the function.
				return created.impl.apply(this, arguments);
			}

			track(created.shells, this);
			if (created.kind === "fn") {
				if (created.broken) {
					return createElement(Copy);
				} else if (created.verified) {
					return created.impl.call(this, props, this);
				}

				try {
					const result = created.impl.call(this, props, this);
					created.verified = true;
					return result;
				} catch (err) {
					fail(created, err);
					return createElement(Copy);
				}
			}

			return createElement(created.stable, props);
		};

		Object.defineProperty(family.shell, "name", {
			value: key.slice(key.indexOf("#") + 1),
		});
		families.set(key, family);
		return family.shell;
	}

	const same = family.kind === kind && family.signature === signature;
	family.kind = kind;
	family.signature = signature;
	family.impl = impl;
	family.view = view;
	family.scope = scope;
	family.make = undefined;
	family.verified = false;
	family.broken = false;
	if (same) {
		family.fresh = false;
	} else {
		// The code which holds the state changed, so it is a different
		// component.
		family.stable = impl;
		family.fresh = true;
		family.remount = true;
	}

	dirty.add(family);
	// The instances are re-rendered once every module which is being replaced
	// has been evaluated.
	if (!globalThis.__crankFlush) {
		globalThis.__crankFlush = setTimeout(flush);
	}

	return family.shell;
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
 * Called by a generator component at the top of its loop. Returns a
 * generator function to run in place of the body of the loop, or undefined
 * when the body as it was written is current.
 *
 * @param getLocals - Returns an object with a getter, and a setter where it
 * can be assigned to, for every variable which is in scope at the loop.
 */
export function view(key, getLocals) {
	const family = families.get(key);
	if (!family || family.fresh || family.view == null) {
		return undefined;
	}

	if (!family.make) {
		// Function bodies are not strict, so `with` is allowed, and the function
		// inside can still be strict. The engine resolves each name: a local of
		// the component, then a binding of the module, then a global.
		family.make = new Function(
			"__module",
			"__locals",
			"__BREAK",
			`with (__module) with (__locals) { return ${
				family.kind === "agen" ? "async " : ""
			}function* () { "use strict"; ${family.view}\n}; }`,
		);
	}

	if (family.broken) {
		return keep;
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
		const contexts =
			family.kind === "fn" || family.remount ? family.shells : family.instances;
		family.remount = false;
		for (const ctx of [...contexts]) {
			if (!ctx.isUnmounted) {
				try {
					ctx.refresh();
				} catch (err) {
					console.error(err);
				}
			}
		}
	}
}
