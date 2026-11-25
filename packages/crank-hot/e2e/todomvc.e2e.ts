import {afterAll, beforeAll, describe, expect, test} from "bun:test";
import {readFileSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import * as playwright from "playwright";
import type {Browser, Page} from "playwright";

// TodoMVC, started the way its README says to start it, with the package as
// it is built. An edit is made to each kind of code, with todos in the list
// and something typed in the field.

const dir = join(import.meta.dir, "../todomvc");
// What the scripts of the package run. They are started without a script
// between, so that stopping one stops the server.
const COMMANDS: Record<string, Array<string>> = {
	vite: [join(dir, "../node_modules/.bin/vite")],
	bun: ["bun", "bun.ts"],
	esbuild: ["bun", "esbuild.ts"],
};

for (const [name, command] of Object.entries(COMMANDS)) {
	describe(name, () => {
		const port = 5301 + Object.keys(COMMANDS).indexOf(name);
		const url = `http://localhost:${port}/`;
		const originals = new Map<string, string>();
		let server: ReturnType<typeof Bun.spawn>;
		let browser: Browser;
		let page: Page;
		let loads = 0;
		const errors: Array<string> = [];

		// Makes an edit and waits for the page to show some text.
		const edit = async (
			file: string,
			from: string,
			to: string,
			expected: string,
		): Promise<void> => {
			const path = join(dir, "src", file);
			const text = readFileSync(path, "utf8");
			if (!originals.has(path)) {
				originals.set(path, text);
			}

			if (!text.includes(from)) {
				throw new Error(`${from} not found in ${file}`);
			}

			// A server which was not watching yet does not see an edit, so it is
			// made again until the page shows it.
			for (let i = 0; i < 4; i++) {
				writeFileSync(path, text.replace(from, to));
				try {
					await page.waitForFunction(
						(text: string) => document.body.textContent!.includes(text),
						expected,
						{timeout: 5000},
					);
					return;
				} catch (_) {
					// The edit is made again.
				}
			}

			throw new Error(`The page did not show ${expected}`);
		};

		const readItems = (): Promise<Array<string>> =>
			page.$$eval(".todo-list li", (items) =>
				items.map((item) => `${item.className}:${item.textContent}`),
			);

		beforeAll(async () => {
			server = Bun.spawn(command, {
				cwd: dir,
				env: {...process.env, PORT: String(port), CI: "1"},
				stdout: "ignore",
				stderr: "inherit",
			});
			for (let i = 0; ; i++) {
				try {
					await fetch(url);
					break;
				} catch (err) {
					if (i > 150) {
						throw err;
					}

					await new Promise((resolve) => setTimeout(resolve, 200));
				}
			}

			browser =
				await playwright[
					(process.env.BROWSER || "chromium") as
						| "chromium"
						| "firefox"
						| "webkit"
				].launch();
			page = await browser.newPage();
			page.on("pageerror", (err) => errors.push(err.message));
			page.on("console", (msg) => {
				if (msg.type() === "error") {
					errors.push(msg.text());
				}
			});
			await page.goto(url);
			await page.waitForSelector(".new-todo");
			for (const title of ["one", "two"]) {
				await page.fill(".new-todo", title);
				await page.press(".new-todo", "Enter");
			}

			await page.click(".todo-list li:first-child .toggle");
			await page.fill(".new-todo", "typing");
			page.on("load", () => loads++);
		}, 60000);

		afterAll(async () => {
			for (const [path, text] of originals) {
				writeFileSync(path, text);
			}

			await (browser && browser.close());
			server.kill();
			await server.exited;
		});

		test("an edit to the view of a component keeps what was typed in it", async () => {
			await edit("header.tsx", "<h1>todos</h1>", "<h1>edited</h1>", "edited");
			expect(await page.inputValue(".new-todo")).toBe("typing");
			expect(await readItems()).toEqual(["completed:one", ":two"]);
		});

		test("an edit to the view of a keyed component keeps each one", async () => {
			await edit(
				"todo-item.tsx",
				"<label ondblclick={onedit}>{todo.title}</label>",
				"<label ondblclick={onedit}>todo {todo.title}</label>",
				"todo one",
			);
			expect(await readItems()).toEqual(["completed:todo one", ":todo two"]);
			expect(await page.inputValue(".new-todo")).toBe("typing");
		});

		test("an edit to a function component keeps what is around it", async () => {
			await edit("footer.tsx", "left\n", "remaining\n", "remaining");
			expect(await page.textContent(".todo-count")).toBe("1 item remaining");
			expect(await readItems()).toEqual(["completed:todo one", ":todo two"]);
		});

		test("an edit to a constant is seen", async () => {
			await edit("footer.tsx", '{name: "All"', '{name: "Every"', "Every");
			expect(await readItems()).toEqual(["completed:todo one", ":todo two"]);
		});

		test("the app still works after the edits", async () => {
			await page.fill(".new-todo", "three");
			await page.press(".new-todo", "Enter");
			await page.click(".todo-list li:nth-child(2) .toggle");
			expect(await readItems()).toEqual([
				"completed:todo one",
				"completed:todo two",
				":todo three",
			]);
			await page.click(".clear-completed");
			expect(await readItems()).toEqual([":todo three"]);
		});

		test("an edit to the setup of the app starts it again", async () => {
			await edit(
				"app.tsx",
				'<section class="todoapp">',
				'<section class="todoapp" data-edited>',
				"edited",
			);
			// The view was edited, so the todo is still there.
			expect(await readItems()).toEqual([":todo three"]);
			const path = join(dir, "src/app.tsx");
			writeFileSync(
				path,
				readFileSync(path, "utf8").replace(
					"let nextId = 1;",
					"let nextId = 100;",
				),
			);
			await page.waitForFunction(
				() => !document.querySelector(".todo-list"),
				null,
				{timeout: 15000},
			);
			await page.fill(".new-todo", "again");
			await page.press(".new-todo", "Enter");
			expect(await readItems()).toEqual([":todo again"]);
		});

		test("the page was not loaded again, and nothing was logged", () => {
			expect(loads).toBe(0);
			expect(errors).toEqual([]);
		});
	});
}
