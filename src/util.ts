export const NOOP = () => {};

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
 * and iterables, so it is appropriate for wrapping user-provided children.
 */
export function arrayify<T>(
	value: NonStringIterable<T> | T | null | undefined,
): Array<T> {
	return value == null
		? []
		: Array.isArray(value)
		? (value as any)
		: typeof value === "string" ||
		  typeof (value as any)[Symbol.iterator] !== "function"
		? [value]
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
