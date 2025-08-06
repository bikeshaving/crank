/**
 * Utility assertion to check that a value does not settle before a specified
 * timeout.
 */
export async function hangs(
	value: unknown,
	ms = 100,
	message: string = "Expected not to fulfill before timeout",
): Promise<void> {
	const timeout = Symbol("timeout");
	try {
		await Promise.race([
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
