import {Copy, createElement} from "@b9g/crank";

// One family per component, shared by every version of its module.
// Everything which outlives a copy of this module is on one object, because
// a development server which evaluates a whole new bundle evaluates this
// module again.
const state = (globalThis.__crankHot ||= {});
const families = (state.families ||= new Map());
const dirty = (state.dirty ||= new Set());

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

const extraction = (state.extraction ||= {
	isActive: false,
	view: undefined,
});

// Something which can be read from, called and taken apart without throwing,
// to call a component with when only its view is wanted.
const HOLE = new Proxy(() => {}, {
	get(_, key) {
		if (key === Symbol.iterator) {
			return function* () {
				for (let i = 0; i < 32; i++) {
					yield HOLE;
				}
			};
		} else if (key === Symbol.toPrimitive) {
			return () => "";
		}

		return HOLE;
	},
	apply() {
		return HOLE;
	},
	construct() {
		return HOLE;
	},
	has() {
		return true;
	},
	ownKeys() {
		return [];
	},
});

/**
 * Whether a component is being called for its view. The first statement of
 * a component asks, and returns the view if so.
 */
export function isExtracting() {
	return extraction.isActive;
}

export function extract(view) {
	extraction.view = view;
}

/**
 * Returns the view of a version of a component, which is a function which
 * the component declares. The component is called and resumed once, which
 * runs its parameters and its first statement.
 */
function getView(impl) {
	extraction.isActive = true;
	extraction.view = undefined;
	try {
		const result = impl.call(undefined, HOLE, HOLE).next();
		if (result && typeof result.then === "function") {
			result.then(undefined, () => {});
		}
	} catch (_) {
		// The parameters could not be made from nothing.
	} finally {
		extraction.isActive = false;
	}

	return extraction.view;
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
				inputs: family.inputs,
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
	family.isExtracted = next.view === "extract";
	family.view = family.isExtracted ? getView(next.impl) : next.view;
	family.inputs = inputs;
	family.verified = isFirst;
	family.broken = false;
	if (!same) {
		family.stable = next.impl;
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
		// The body of the loop of the newest version, as a function.
		view: undefined,
		inputs: undefined,
		// The newest version, until something needs the component.
		next: undefined,
		previous: undefined,
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
 * @param view - "extract" when the body of the loop of a generator component
 * is a function inside the component, true when it is one which comes after
 * the component, or null when it could not be separated.
 * @param inputs - A function which returns the values of the bindings which
 * the code outside the loop uses, or null. Instances carry on while they stay
 * the same.
 */
export function register(key, kind, signature, view, inputs, impl) {
	let family = families.get(key);
	const isFirst = !family;
	if (!family) {
		family = createFamily(key);
		families.set(key, family);
	}

	family.next = {kind, signature, view, inputs, impl};
	if (!isFirst) {
		dirty.add(family);
		// The instances are re-rendered once every module which is being
		// replaced has been evaluated.
		if (!state.timeout) {
			state.timeout = setTimeout(flush);
		}
	}

	return family.shell;
}

// What reuse() last returned for each key.
const values = (state.values ||= new Map());

/**
 * Evaluates a top-level binding for a development server which evaluates
 * every module again with every edit. The hash covers the source of the
 * binding and of everything it refers to, and the value is kept while the
 * hash is the same.
 */
export function reuse(key, signature, make) {
	const last = values.get(key);
	if (last && last.signature === signature) {
		return last.result;
	}

	const result = make();
	values.set(key, {signature, result});
	return result;
}

/**
 * Gives the newest version of a component its view, when the view comes
 * after the component in the module, and so after the component is
 * registered.
 */
export function setView(key, view) {
	const family = families.get(key);
	if (family) {
		(family.next || family).view = view;
	}
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
 * Called by a generator component at the top of its loop. Returns the body
 * of the loop of the newest version, as a generator function which is called
 * with the variables of the instance.
 */
export function view(key) {
	const family = families.get(key);
	settle(family);
	if (family.view === true) {
		throw new Error(
			`The component ${family.shell.name} was rendered before its module had been evaluated as far as its view`,
		);
	} else if (typeof family.view !== "function") {
		throw new Error(
			`The view of the component ${family.shell.name} could not be found`,
		);
	} else if (family.broken) {
		return keep;
	}

	const made = family.view;
	return family.kind === "agen"
		? function (locals) {
				return guardAsync(family, made.call(this, locals));
			}
		: function (locals) {
				return guard(family, made.call(this, locals));
			};
}

/**
 * Re-renders the live instances of the components which were registered
 * again.
 */
export function flush() {
	clearTimeout(state.timeout);
	state.timeout = undefined;
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

			// The new version could not be rendered. If it was a different
			// component, the version before it is the component again.
			const recover = (err) => {
				console.error(err);
				if (isRemount && family.previous) {
					Object.assign(family, family.previous);
					family.previous = undefined;
					family.verified = true;
					try {
						const again = ctx.refresh();
						if (again && typeof again.then === "function") {
							again.then(undefined, () => {});
						}
					} catch (_) {
						// The error has been reported.
					}
				}
			};

			try {
				const result = ctx.refresh();
				// An async component says so later.
				if (result && typeof result.then === "function") {
					result.then(undefined, recover);
				}
			} catch (err) {
				recover(err);
			}
		}
	}
}
