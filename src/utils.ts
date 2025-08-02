export function wrap<T>(value: Array<T> | T | undefined): Array<T> {
	return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

export function unwrap<T>(arr: Array<T>): Array<T> | T | undefined {
	return arr.length === 0 ? undefined : arr.length === 1 ? arr[0] : arr;
}

export type NonStringIterable<T> = Iterable<T> & object;

/**
 * Ensures a value is an array.
 *
 * This function does the same thing as wrap() above except it handles nulls
 * and iterables, so it is appropriate for wrapping user-provided element
 * children.
 */
export function arrayify<T>(
	value: NonStringIterable<T> | T | null | undefined,
): Array<T> {
	return value == null
		? []
		: Array.isArray(value)
			? value
			: typeof value === "string" ||
				  typeof (value as any)[Symbol.iterator] !== "function"
				? [value as T]
				: [...(value as NonStringIterable<T>)];
}

export function isIteratorLike(
	value: any,
): value is Iterator<unknown> | AsyncIterator<unknown> {
	return value != null && typeof value.next === "function";
}

export function isPromiseLike(value: any): value is PromiseLike<unknown> {
	return value != null && typeof value.then === "function";
}

type Deferred<T = unknown> = {
	resolve: (value: T | PromiseLike<T>) => void;
	reject: (reason?: unknown) => void;
};

type RaceRecord = {
	deferreds: Set<Deferred>;
	settled: boolean;
};

function createRaceRecord(contender: PromiseLike<unknown>): RaceRecord {
	const deferreds = new Set<Deferred>();
	const record = {deferreds, settled: false};

	// This call to `then` happens once for the lifetime of the value.
	Promise.resolve(contender).then(
		(value) => {
			for (const {resolve} of deferreds) {
				resolve(value);
			}

			deferreds.clear();
			record.settled = true;
		},
		(err) => {
			for (const {reject} of deferreds) {
				reject(err);
			}

			deferreds.clear();
			record.settled = true;
		},
	);
	return record;
}

// Promise.race is memory unsafe. This is alternative which is. See:
// https://github.com/nodejs/node/issues/17469#issuecomment-685235106
// Keys are the values passed to race.
// Values are a record of data containing a set of deferreds and whether the
// value has settled.
const wm = new WeakMap<object, RaceRecord>();
export function safeRace<T>(
	contenders: Iterable<T | PromiseLike<T>>,
): Promise<Awaited<T>> {
	let deferred: Deferred;
	const result = new Promise((resolve, reject) => {
		deferred = {resolve, reject};
		for (const contender of contenders) {
			if (!isPromiseLike(contender)) {
				// If the contender is a not a then-able, attempting to use it as a key
				// in the weakmap would throw an error. Luckily, it is safe to call
				// `Promise.resolve(contender).then` on regular values multiple
				// times because the promise fulfills immediately.
				Promise.resolve(contender).then(resolve, reject);
				continue;
			}

			let record = wm.get(contender);
			if (record === undefined) {
				record = createRaceRecord(contender);
				record.deferreds.add(deferred);
				wm.set(contender, record);
			} else if (record.settled) {
				// If the value has settled, it is safe to call
				// `Promise.resolve(contender).then` on it.
				Promise.resolve(contender).then(resolve, reject);
			} else {
				record.deferreds.add(deferred);
			}
		}
	});

	// The finally callback executes when any value settles, preventing any of
	// the unresolved values from retaining a reference to the resolved value.
	return result.finally(() => {
		for (const contender of contenders) {
			if (isPromiseLike(contender)) {
				const record = wm.get(contender);
				if (record) {
					record.deferreds.delete(deferred);
				}
			}
		}
	}) as Promise<Awaited<T>>;
}
