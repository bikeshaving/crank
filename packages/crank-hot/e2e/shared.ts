import {afterAll, beforeAll, expect, test} from "bun:test";
import {readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import * as playwright from "playwright";
import type {Browser, Page} from "playwright";
import {defineDebuggerTests} from "./debug.ts";
import {defineLabTests} from "./lab.ts";

export interface Server {
	/** The page which renders the app. */
	url: string;
	/** The page which hydrates what a server would have sent. */
	hydrateUrl: string;
	/** The page with one component for each thing a page can lose. */
	labUrl: string;
	close(): Promise<unknown>;
	/**
	 * For a server which does not watch the files itself. It is given the
	 * pages, for one which tells them about a build itself.
	 */
	rebuild?(pages: Array<Page>): Promise<unknown>;
}

interface State {
	button: string;
	isSameButton: boolean;
	heading: string;
	input: string;
	isFocused: boolean;
}

const src = join(import.meta.dir, "../example/src");

/**
 * The same edits to the example app, whichever development server has it.
 */
export function defineTests(start: () => Promise<Server>): void {
	const originals = new Map<string, string>();
	const edit = (file: string, from: string, to: string): void => {
		const path = join(src, file);
		const text = readFileSync(path, "utf8");
		if (!originals.has(path)) {
			originals.set(path, text);
		}

		if (!text.includes(from)) {
			throw new Error(`${from} not found in ${file}`);
		}

		writeFileSync(path, text.replace(from, to));
		pending = pending.then(
			() => server.rebuild && server.rebuild([page, hydrated, lab]),
		);
	};

	let server: Server;
	// The builds which edits have asked for.
	let pending: Promise<unknown> = Promise.resolve();
	let browser: Browser;
	let page: Page;
	let hydrated: Page;
	let lab: Page;
	let loads = 0;
	const errors: Array<string> = [];
	beforeAll(async () => {
		server = await start();
		const name = (process.env.BROWSER || "chromium") as
			| "chromium"
			| "firefox"
			| "webkit";
		browser = await playwright[name].launch();
		page = await browser.newPage();
		hydrated = await browser.newPage();
		lab = await browser.newPage();
		for (const each of [page, hydrated, lab]) {
			each.on("load", () => loads++);
			each.on("pageerror", (err) => errors.push(err.message));
			each.on("console", (msg) => {
				if (msg.type() === "warning" || msg.type() === "error") {
					errors.push(msg.text());
				}
			});
		}

		await lab.goto(server.labUrl);
		await lab.waitForSelector("#probe");
		await page.goto(server.url);
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

		// The other page is hydrated, and its button is clicked once.
		await hydrated.goto(server.hydrateUrl);
		await hydrated.waitForFunction(() => {
			const button = document.getElementById("count")!;
			if (button.textContent === "x0") {
				button.click();
			}

			return button.textContent === "x1";
		});
		// Firefox says that a page has loaded more than once while it is
		// being opened, so only what comes after this is counted.
		loads = 0;
	});

	afterAll(async () => {
		for (const [path, text] of originals) {
			writeFileSync(path, text);
		}

		await browser.close();
		await server.close();
	});

	// Waits for the page to show the edit, and reads what a reload would lose.
	const read = async (expected: string): Promise<State> => {
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
	};

	// The tests share the pages, and run in order.
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

	test("the same edit to a page which was hydrated", async () => {
		await hydrated.waitForFunction(() =>
			document.body.textContent!.includes("Count: x1"),
		);
		// The button is still the one the server sent.
		expect(
			await hydrated.evaluate(
				() => document.getElementById("count") === (window as any).serverButton,
			),
		).toBe(true);
		await hydrated.click("#count");
		expect(await hydrated.textContent("#count")).toBe("Count: x2");
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

	const env = {
		lab: () => lab,
		edit,
		errors,
		read: (file: string) => readFileSync(join(src, file), "utf8"),
	};
	defineDebuggerTests(env);
	defineLabTests(env);

	test("the pages were never loaded again", () => {
		expect(loads).toBe(0);
		expect(errors).toEqual([]);
	});

	test("a module which stops exporting only components", async () => {
		// What imports the module has to be evaluated again, which a
		// development server may do by loading the page again.
		edit("app.tsx", "<h1>Edited</h1>", "<h1>{LIMIT}</h1>");
		edit(
			"app.tsx",
			"export function App",
			"export const LIMIT = 7;\n\nexport function App",
		);
		await page.waitForFunction(
			() => document.querySelector("h1")?.textContent === "7",
			undefined,
			{timeout: 10000},
		);
		const before = Number(
			(await page.textContent("#count"))!.replace(/\D/g, ""),
		);
		await page.click("#count");
		expect(await page.textContent("#count")).toBe(`Count: #${before + 1}`);
	});
}
