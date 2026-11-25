// Bun reads the plugin from the bunfig.toml of the directory it is run in:
//   cd example && bun test ../e2e/browser.e2e.ts
import {afterAll, beforeAll, expect, test} from "bun:test";
import {readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import * as playwright from "playwright";
import type {Browser, Page} from "playwright";
import index from "../example/index.html";

const src = join(import.meta.dir, "../example/src");
const originals = new Map<string, string>();
function edit(file: string, from: string, to: string): void {
	const path = join(src, file);
	const text = readFileSync(path, "utf8");
	if (!originals.has(path)) {
		originals.set(path, text);
	}

	if (!text.includes(from)) {
		throw new Error(`${from} not found in ${file}`);
	}

	writeFileSync(path, text.replace(from, to));
}

interface State {
	button: string;
	isSameButton: boolean;
	heading: string;
	input: string;
	isFocused: boolean;
}

let server: ReturnType<typeof Bun.serve>;
let browser: Browser;
let page: Page;
let loads = 0;
const errors: Array<string> = [];
beforeAll(async () => {
	server = Bun.serve({
		port: 0,
		routes: {"/": index},
		development: {hmr: true},
	});
	const name = (process.env.BROWSER || "chromium") as
		| "chromium"
		| "firefox"
		| "webkit";
	browser = await playwright[name].launch();
	page = await browser.newPage();
	page.on("load", () => loads++);
	page.on("pageerror", (err) => errors.push(err.message));
	await page.goto(server.url.href);
	await page.waitForSelector("#count");

	// State which a remount or a page load would lose.
	await page.click("#count");
	await page.click("#count");
	await page.click("#count");
	await page.fill("#name", "hello");
	await page.focus("#name");
	await page.evaluate(() => {
		(document.getElementById("count") as any).original = true;
	});
});

afterAll(async () => {
	for (const [path, text] of originals) {
		writeFileSync(path, text);
	}

	await browser.close();
	await server.stop(true);
});

// Waits for the page to show the edit, and reads what a reload would lose.
async function read(expected: string): Promise<State> {
	await page.waitForFunction(
		(text: string) => document.body.textContent!.includes(text),
		expected,
		{timeout: 10000},
	);
	return page.evaluate(() => {
		const el = (id: string) => document.getElementById(id) as any;
		return {
			button: el("count").textContent,
			isSameButton: !!el("count").original,
			heading: document.querySelector("h1")!.textContent!,
			input: el("name").value,
			isFocused: document.activeElement === el("name"),
		};
	});
}

// The tests share one page, and run in order.
test("an edit to the view of a generator component", async () => {
	edit("app.tsx", "{label(n)}", "Count: {label(n)}");
	expect(await read("Count: x3")).toEqual({
		button: "Count: x3",
		isSameButton: true,
		heading: "App",
		input: "hello",
		isFocused: true,
	});
});

test("an edit to the function component at the root", async () => {
	edit("app.tsx", "<h1>App</h1>", "<h1>Edited</h1>");
	expect(await read("Edited")).toEqual({
		button: "Count: x3",
		isSameButton: true,
		heading: "Edited",
		input: "hello",
		isFocused: true,
	});
});

test("an edit to a helper in another module", async () => {
	edit("format.ts", '"x" + n', '"#" + n');
	expect(await read("Count: #3")).toEqual({
		button: "Count: #3",
		isSameButton: true,
		heading: "Edited",
		input: "hello",
		isFocused: true,
	});
});

test("an edit to the setup of a generator component", async () => {
	edit("app.tsx", "let n = 0;", "let n = 50;");
	expect(await read("Count: #50")).toEqual({
		button: "Count: #50",
		isSameButton: false,
		heading: "Edited",
		input: "hello",
		isFocused: true,
	});
});

test("the page was never loaded again", () => {
	expect(loads).toBe(1);
	expect(errors).toEqual([]);
});
