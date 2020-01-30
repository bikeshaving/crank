// TODO: unwrap promiselikes
export type MaybePromise<T> = Promise<T> | T;

// TODO: unwrap promiselikes
export type MaybePromiseLike<T> = PromiseLike<T> | T;

interface PromisePending<T> {
	status: "pending";
	promise: Promise<T>;
}

interface PromiseFulfilled<T> {
	status: "fulfilled";
	value: T;
}

interface PromiseRejected {
	status: "rejected";
	reason: any;
}

type PromiseState<T> =
	| PromisePending<T>
	| PromiseFulfilled<T>
	| PromiseRejected;

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
 */
export class Pledge<T> {
	private state: PromiseState<T>;
	// TODO: allow value to be a callable function so we can catch errors
	constructor(value: MaybePromiseLike<T>) {
		if (isPromiseLike(value)) {
			this.state = {status: "pending", promise: Promise.resolve(value)};
			value.then(
				(value) => (this.state = {status: "fulfilled", value}),
				(reason) => (this.state = {status: "rejected", reason}),
			);
		} else {
			this.state = {status: "fulfilled", value};
		}
	}

	then<TFulfilled = T, TRejected = never>(
		onFulfilled?: ((value: T) => MaybePromiseLike<TFulfilled>) | null,
		onRejected?: ((reason: any) => MaybePromiseLike<TRejected>) | null,
	): MaybePromise<TFulfilled | TRejected> {
		switch (this.state.status) {
			case "fulfilled": {
				if (onFulfilled == null) {
					return this.state.value as any;
				} else {
					return upgrade(onFulfilled(this.state.value));
				}
			}
			case "rejected": {
				if (onRejected == null) {
					throw this.state.reason;
				} else {
					return upgrade(onRejected(this.state.reason));
				}
			}
			case "pending": {
				return this.state.promise.then(onFulfilled, onRejected);
			}
		}
	}

	catch<TRejected = never>(
		onRejected?: ((reason: any) => MaybePromiseLike<TRejected>) | null,
	): MaybePromise<T | TRejected> {
		switch (this.state.status) {
			case "fulfilled": {
				return this.state.value;
			}
			case "rejected": {
				if (onRejected == null) {
					throw this.state.reason;
				} else {
					return upgrade(onRejected(this.state.reason));
				}
			}
			case "pending": {
				return this.state.promise.catch(onRejected);
			}
		}
	}

	finally(onFinally?: (() => unknown) | null): MaybePromise<T> {
		switch (this.state.status) {
			case "fulfilled": {
				if (onFinally != null) {
					onFinally();
				}

				return this.state.value;
			}
			case "rejected": {
				if (onFinally != null) {
					onFinally();
				}

				throw this.state.reason;
			}
			case "pending": {
				return this.state.promise.finally(onFinally);
			}
		}
	}
}
