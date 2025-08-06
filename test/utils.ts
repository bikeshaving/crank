import * as Assert from "uvu/assert";

export async function hangs(
	value: unknown,
	ms = 100,
	message: string = "Expected not to resolve before timeout",
): Promise<unknown> {
	const timeout = Symbol("timeout");
	try {
		const result = await Promise.race([
			value,
			new Promise((_, reject) => setTimeout(() => reject(timeout), ms)),
		]);

		throw new Error(message);
	} catch (err) {
		if (err === timeout) {
			return;
		}

		throw err;
	}
}
