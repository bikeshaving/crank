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

function upgrade<T>(value: MaybePromiseLike<T>): MaybePromise<T> {
	if (isPromiseLike(value) && !(value instanceof Promise)) {
		return Promise.resolve(value);
	}

	return value;
}

/**
 * A pledge is like a promise, but eager.
 */
export class Pledge<T> {
	private state: PromiseState<T>;
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

	then<TResult1 = T, TResult2 = never>(
		onfulfilled?: ((value: T) => MaybePromiseLike<TResult1>) | null,
		onrejected?: ((reason: any) => MaybePromiseLike<TResult2>) | null,
	): MaybePromise<TResult1 | TResult2> {
		switch (this.state.status) {
			case "fulfilled": {
				if (onfulfilled == null) {
					return (this.state.value as unknown) as TResult1;
				} else {
					return upgrade(onfulfilled(this.state.value));
				}
			}
			case "rejected": {
				if (onrejected == null) {
					throw this.state.reason;
				} else {
					return upgrade(onrejected(this.state.reason));
				}
			}
			case "pending": {
				return this.state.promise.then(onfulfilled, onrejected);
			}
		}
	}

	catch<TResult = never>(
		onrejected?: ((reason: any) => MaybePromiseLike<TResult>) | null,
	): MaybePromise<T | TResult> {
		switch (this.state.status) {
			case "fulfilled": {
				return this.state.value;
			}
			case "rejected": {
				if (onrejected == null) {
					throw this.state.reason;
				} else {
					return upgrade(onrejected(this.state.reason));
				}
			}
			case "pending": {
				return this.state.promise.catch(onrejected);
			}
		}
	}

	finally(onfinally?: (() => unknown) | null): MaybePromise<T> {
		switch (this.state.status) {
			case "fulfilled": {
				if (onfinally != null) {
					onfinally();
				}

				return this.state.value;
			}
			case "rejected": {
				if (onfinally != null) {
					onfinally();
				}

				throw this.state.reason;
			}
			case "pending": {
				return this.state.promise.finally(onfinally);
			}
		}
	}
}
