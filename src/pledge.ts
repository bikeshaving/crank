export type MaybePromise<T> = Promise<T> | T;

export type MaybePromiseLike<T> = PromiseLike<T> | T;

export function isPromiseLike(value: any): value is PromiseLike<any> {
	return value != null && typeof value.then === "function";
}

export function upgrade<T>(value: MaybePromiseLike<T>): MaybePromise<T> {
	if (isPromiseLike(value) && !(value instanceof Promise)) {
		return Promise.resolve(value);
	}

	return value;
}

/**
 * A pledge is like a promise, except it runs synchronously if possible.
 *
 * It is not meant to be exposed in APIs; rather, you should unwrap pledges to
 * a MaybePromise by calling Pledge.prototype.execute.
 */
export class Pledge<T> {
	constructor(private executor: () => MaybePromiseLike<T>) {}

	then<TFulfilled = T, TRejected = never>(
		onfulfilled?: ((value: T) => MaybePromiseLike<TFulfilled>) | null,
		onrejected?: ((reason: any) => MaybePromiseLike<TRejected>) | null,
	): Pledge<TFulfilled | TRejected> {
		return new Pledge<TFulfilled | TRejected>(() => {
			try {
				const value = this.execute();
				if (isPromiseLike(value)) {
					return value.then(onfulfilled, onrejected);
				} else if (onfulfilled == null) {
					return value as any;
				}

				return onfulfilled(value);
			} catch (err) {
				if (onrejected == null) {
					throw err;
				}

				return onrejected(err);
			}
		});
	}

	catch<TRejected = never>(
		onrejected?: ((reason: any) => MaybePromiseLike<TRejected>) | null,
	): Pledge<T | TRejected> {
		return new Pledge<T | TRejected>(() => {
			try {
				const value = this.execute();
				if (isPromiseLike(value)) {
					return value.catch(onrejected);
				}

				return value;
			} catch (err) {
				if (onrejected == null) {
					throw err;
				}

				return onrejected(err);
			}
		});
	}

	finally(onfinally?: (() => unknown) | null): Pledge<T> {
		return new Pledge(() => {
			try {
				const value = this.execute();
				if (isPromiseLike(value)) {
					return value.finally(onfinally);
				} else if (onfinally != null) {
					onfinally();
				}

				return value;
			} catch (err) {
				if (onfinally != null) {
					onfinally();
				}

				throw err;
			}
		});
	}

	execute(): MaybePromise<T> {
		return upgrade(this.executor());
	}

	static resolve<T>(value: MaybePromiseLike<T>): Pledge<T> {
		return new Pledge(() => value);
	}
}
