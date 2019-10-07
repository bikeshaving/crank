type Resolve<T> = (value?: Promise<T> | T) => void;
export type Ratchet<T> = Generator<[Promise<T | undefined>, Resolve<T>], void>;
export function* createRatchet<T>(): Ratchet<T> {
	let index = 0;
	const queue: Resolve<T>[] = [];
	try {
		while (true) {
			const promise = new Promise<T | undefined>((resolve) =>
				queue.push(resolve),
			);
			const index1 = index + queue.length;
			const resolve: Resolve<T> = (value) => {
				for (let diff = index1 - index; diff > 0; diff--) {
					queue.shift()!(value);
				}

				index = Math.max(index, index1);
			};

			yield [promise, resolve];
		}
	} finally {
		for (const resolve of queue) {
			resolve();
		}
	}
}
