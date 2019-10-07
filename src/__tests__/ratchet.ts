import {createRatchet} from "../ratchet";

describe("Ratchet", () => {
	test("basic", async () => {
		const ratchet = createRatchet();
		const [promise, resolve] = (ratchet.next() as any).value;
		resolve(1);
		await expect(promise).resolves.toEqual(1);
	});

	test("multiple", async () => {
		const ratchet = createRatchet();
		const [promise1, resolve1] = (ratchet.next() as any).value;
		const [promise2, resolve2] = (ratchet.next() as any).value;
		const [promise3, resolve3] = (ratchet.next() as any).value;
		resolve1(1);
		resolve2(2);
		resolve3(3);
		await expect(promise1).resolves.toEqual(1);
		await expect(promise2).resolves.toEqual(2);
		await expect(promise3).resolves.toEqual(3);
	});

	test("out of order", async () => {
		const ratchet = createRatchet();
		const [promise1, resolve1] = (ratchet.next() as any).value;
		const [promise2, resolve2] = (ratchet.next() as any).value;
		const [promise3, resolve3] = (ratchet.next() as any).value;
		resolve1(1);
		resolve3(3);
		resolve2(2);
		await expect(promise1).resolves.toEqual(1);
		await expect(promise2).resolves.toEqual(3);
		await expect(promise3).resolves.toEqual(3);
	});

	test("idempotent", async () => {
		const ratchet = createRatchet();
		const [promise1, resolve1] = (ratchet.next() as any).value;
		const [promise2, resolve2] = (ratchet.next() as any).value;
		const [promise3, resolve3] = (ratchet.next() as any).value;
		resolve3(3);
		resolve2(2);
		resolve1(1);
		resolve3(-3);
		resolve2(-2);
		resolve1(-1);
		await expect(promise1).resolves.toEqual(3);
		await expect(promise2).resolves.toEqual(3);
		await expect(promise3).resolves.toEqual(3);
	});

	test("cleanup", async () => {
		const ratchet = createRatchet();
		const [promise1, resolve1] = (ratchet.next() as any).value;
		const [promise2, resolve2] = (ratchet.next() as any).value;
		const [promise3, resolve3] = (ratchet.next() as any).value;
		resolve2(2);
		ratchet.return();
		await expect(promise1).resolves.toEqual(2);
		await expect(promise2).resolves.toEqual(2);
		await expect(promise3).resolves.toBeUndefined();
	});
});
