import {afterAll, beforeAll, expect, test} from "bun:test";

// The part of the page which is told about builds, with a page made of
// nothing but what it uses.

const loaded: Array<string> = [];
const logged: Array<unknown> = [];
class FakeEventSource {
	static last: FakeEventSource;
	listeners: Record<string, Array<(ev: any) => void>> = {};
	constructor(public url: string) {
		FakeEventSource.last = this;
	}

	addEventListener(type: string, listener: (ev: any) => void): void {
		(this.listeners[type] ||= []).push(listener);
	}

	send(type: string, data?: string): void {
		for (const listener of this.listeners[type] || []) {
			listener({data});
		}
	}
}

const original = {
	EventSource: (globalThis as any).EventSource,
	error: console.error,
};
let client: typeof import("../src/reload.js");
beforeAll(async () => {
	(globalThis as any).EventSource = FakeEventSource;
	console.error = (...args: Array<unknown>) => logged.push(args[0]);
	client = await import("../src/reload.js");
	(globalThis as any).__crankHot.load = async (url: string) => {
		loaded.push(url);
	};
});

afterAll(() => {
	(globalThis as any).EventSource = original.EventSource;
	console.error = original.error;
});

test("esbuild's server is listened to once", async () => {
	client.connect("http://localhost/main.js");
	const source = FakeEventSource.last;
	client.connect("http://localhost/admin.js?hot=3");
	expect(FakeEventSource.last).toBe(source);
	expect(source.url).toBe("/esbuild");
	source.send("change");
	await Promise.resolve();
	expect(loaded).toEqual([
		"http://localhost/main.js?hot=1",
		"http://localhost/admin.js?hot=1",
	]);
});

test("only the bundles which changed are evaluated", async () => {
	loaded.length = 0;
	FakeEventSource.last.send(
		"change",
		JSON.stringify({added: [], removed: [], updated: ["/admin.js"]}),
	);
	await Promise.resolve();
	expect(loaded).toEqual(["http://localhost/admin.js?hot=2"]);
});

test("a bundle which a build is said to add is evaluated", async () => {
	loaded.length = 0;
	FakeEventSource.last.send(
		"change",
		JSON.stringify({added: ["/main.js"], removed: [], updated: []}),
	);
	await Promise.resolve();
	expect(loaded).toEqual(["http://localhost/main.js?hot=3"]);
});

test("a bundle which cannot be evaluated is said, and the others are evaluated", async () => {
	loaded.length = 0;
	logged.length = 0;
	(globalThis as any).__crankHot.load = async (url: string) => {
		if (url.includes("main")) {
			throw new Error("syntax");
		}

		loaded.push(url);
	};
	await client.update();
	expect(loaded).toEqual(["http://localhost/admin.js?hot=4"]);
	expect(String(logged[0])).toContain("syntax");
});
