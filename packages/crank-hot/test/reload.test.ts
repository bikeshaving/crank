import {afterAll, beforeAll, expect, test} from "bun:test";

// The part of the page which is told about builds, with a page made of
// nothing but what it uses.

const loaded: Array<string> = [];
const logged: Array<unknown> = [];
let reloads = 0;
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
	location: (globalThis as any).location,
	error: console.error,
};
let client: typeof import("../src/reload.js");
beforeAll(async () => {
	(globalThis as any).EventSource = FakeEventSource;
	(globalThis as any).location = {reload: () => reloads++};
	console.error = (...args: Array<unknown>) => logged.push(args[0]);
	client = await import("../src/reload.js");
	(globalThis as any).__crankHot.load = async (url: string) => {
		loaded.push(url);
	};
});

afterAll(() => {
	(globalThis as any).EventSource = original.EventSource;
	(globalThis as any).location = original.location;
	console.error = original.error;
});

test("a bundle which listens to nothing is evaluated when the page is told to", async () => {
	client.connect("http://localhost/main.js", null);
	client.connect("http://localhost/admin.js?hot=3", null);
	await (globalThis as any).__crankHot.update();
	expect(loaded).toEqual([
		"http://localhost/main.js?hot=1",
		"http://localhost/admin.js?hot=1",
	]);
});

test("only the bundles which changed are evaluated", async () => {
	loaded.length = 0;
	await client.update(["/admin.js"]);
	expect(loaded).toEqual(["http://localhost/admin.js?hot=2"]);
});

test("an event stream is listened to once", async () => {
	loaded.length = 0;
	client.connect("http://localhost/main.js", "/events");
	const source = FakeEventSource.last;
	client.connect("http://localhost/admin.js", "/events");
	expect(FakeEventSource.last).toBe(source);
	expect(source.url).toBe("/events");

	// What esbuild's server sends.
	source.send(
		"change",
		JSON.stringify({added: [], removed: [], updated: ["/main.js"]}),
	);
	// What anything else can send, with or without the bundles.
	source.send("update");
	await Promise.resolve();
	expect(loaded).toEqual([
		"http://localhost/main.js?hot=3",
		"http://localhost/main.js?hot=4",
		"http://localhost/admin.js?hot=4",
	]);
});

test("the page is loaded again when it is told to be", () => {
	FakeEventSource.last.send("reload");
	expect(reloads).toBe(1);
	(globalThis as any).__crankHot.reload();
	expect(reloads).toBe(2);
});

test("a build which failed is said, and a stream which failed is not", () => {
	FakeEventSource.last.send("error", "Build failed: unexpected token");
	FakeEventSource.last.send("error");
	expect(logged).toEqual(["Build failed: unexpected token"]);
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
	expect(loaded).toEqual(["http://localhost/admin.js?hot=5"]);
	expect(String(logged[0])).toContain("syntax");
});
