import {expect, test} from "bun:test";
import type {Page} from "playwright";

export interface Env {
	lab(): Page;
	edit(file: string, from: string, to: string): void;
	errors: Array<string>;
}

const FILE = "lab/app.tsx";

// Marks nodes, so that a node which has been replaced shows.
function mark(page: Page, selector: string): Promise<void> {
	return page.evaluate((s) => {
		for (const node of document.querySelectorAll(s)) {
			(node as any).kept = true;
		}
	}, selector);
}

function kept(page: Page, selector: string): Promise<Array<boolean>> {
	return page.evaluate(
		(s) =>
			[...document.querySelectorAll(s)].map((node) => !!(node as any).kept),
		selector,
	);
}

function shows(page: Page, text: string): Promise<unknown> {
	return page.waitForFunction(
		(t: string) => document.body.textContent!.includes(t),
		text,
		{timeout: 10000},
	);
}

/**
 * Edits to a page with one component for each thing a page can lose: the
 * state of keyed components, what was typed and chosen in a form, the
 * position of a scroller, listeners, and an async component.
 */
export function defineLabTests(env: Env): void {
	const items = () =>
		env.lab().evaluate(() =>
			[...document.querySelectorAll("#todos li")].map((li) => ({
				text: li.querySelector(".toggle")!.textContent,
				class: li.className,
				note: (li.querySelector(".note") as HTMLInputElement).value,
			})),
		);

	test("keyed components keep their state and their nodes", async () => {
		const page = env.lab();
		await page.click("#item-b .toggle");
		await page.fill("#item-a .note", "note a");
		await page.click("#reverse");
		await mark(page, "#todos li, #todos .note");
		env.edit(FILE, "\t\t\t\t\t{id}\n", "\t\t\t\t\t[{id}]\n");
		await shows(page, "[c]");
		expect(await items()).toEqual([
			{text: "[c]", class: "open", note: ""},
			{text: "[b]", class: "done", note: ""},
			{text: "[a]", class: "open", note: "note a"},
		]);
		expect(await kept(page, "#todos li, #todos .note")).toEqual(
			Array(6).fill(true),
		);
	});

	test("an edit to the parent of keyed components", async () => {
		const page = env.lab();
		env.edit(
			FILE,
			"\t\t\t\t</ul>\n",
			'\t\t\t\t</ul>\n\t\t\t\t<p id="total">{order.length} items</p>\n',
		);
		await shows(page, "3 items");
		expect((await items()).map((item) => item.text)).toEqual([
			"[c]",
			"[b]",
			"[a]",
		]);
		expect((await items())[2].note).toBe("note a");
		expect(await kept(page, "#todos li")).toEqual([true, true, true]);
		await page.click("#reverse");
		expect((await items()).map((item) => item.text)).toEqual([
			"[a]",
			"[b]",
			"[c]",
		]);
	});

	test("what was typed and chosen in a form", async () => {
		const page = env.lab();
		await page.check("#check");
		await page.selectOption("#pick", "two");
		await page.fill("#area", "some text");
		await page.evaluate(() => {
			const area = document.getElementById("area") as HTMLTextAreaElement;
			area.focus();
			area.setSelectionRange(2, 4);
		});
		await mark(page, "#form, #check, #pick, #area, #form-label");
		env.edit(
			FILE,
			'<p id="form-label">form</p>',
			'<p id="form-label" class="big">FORM</p>',
		);
		await shows(page, "FORM");
		expect(
			await page.evaluate(() => {
				const area = document.getElementById("area") as HTMLTextAreaElement;
				return {
					checked: (document.getElementById("check") as HTMLInputElement)
						.checked,
					picked: (document.getElementById("pick") as HTMLSelectElement).value,
					area: area.value,
					focused: document.activeElement === area,
					selection: [area.selectionStart, area.selectionEnd],
					label: document.getElementById("form-label")!.className,
				};
			}),
		).toEqual({
			checked: true,
			picked: "two",
			area: "some text",
			focused: true,
			selection: [2, 4],
			label: "big",
		});
		expect(
			await kept(page, "#form, #check, #pick, #area, #form-label"),
		).toEqual(Array(5).fill(true));
	});

	test("an attribute which an edit takes away", async () => {
		const page = env.lab();
		env.edit(
			FILE,
			'<p id="form-label" class="big">FORM</p>',
			'<p id="form-label">Form</p>',
		);
		await shows(page, "Form");
		expect(
			await page.evaluate(() =>
				document.getElementById("form-label")!.hasAttribute("class"),
			),
		).toBe(false);
		expect(await kept(page, "#form-label")).toEqual([true]);
	});

	test("a listener is not added again by an edit", async () => {
		const page = env.lab();
		await page.click("#clicks");
		await page.click("#clicks");
		await mark(page, "#clicks");
		env.edit(FILE, "clicks {n}", "taps {n}");
		await shows(page, "taps 2");
		env.edit(FILE, "taps {n}", "hits {n}");
		await shows(page, "hits 2");
		await page.click("#clicks");
		expect(await page.textContent("#clicks")).toBe("hits 3");
		expect(await kept(page, "#clicks")).toEqual([true]);
	});

	test("the position of a scroller", async () => {
		const page = env.lab();
		await page.evaluate(() => {
			document.getElementById("scroller")!.scrollTop = 500;
		});
		await mark(page, "#scroller");
		env.edit(FILE, "line {i}", "row {i}");
		await shows(page, "row 99");
		expect(
			await page.evaluate(() => document.getElementById("scroller")!.scrollTop),
		).toBe(500);
		expect(await kept(page, "#scroller")).toEqual([true]);
	});

	test("an async generator component", async () => {
		const page = env.lab();
		await page.click("#feed");
		await shows(page, "feed 1");
		await mark(page, "#feed");
		env.edit(FILE, "feed {n}", "FEED {n}");
		await shows(page, "FEED 1");
		await page.click("#feed");
		await shows(page, "FEED 2");
		expect(await kept(page, "#feed")).toEqual([true]);
	});

	test("an edit which throws leaves the page as it was", async () => {
		const page = env.lab();
		const before = env.errors.length;
		env.edit(FILE, "hits {n}", "hits {(undefined as any).missing}");
		for (let i = 0; i < 200 && env.errors.length === before; i++) {
			await page.waitForTimeout(50);
		}

		expect(env.errors.length).toBeGreaterThan(before);
		expect(await page.textContent("#clicks")).toBe("hits 3");
		expect(await kept(page, "#clicks")).toEqual([true]);
		// The error is the one which was asked for. Firefox does not say what
		// was logged, so only that something was.
		expect(env.errors.splice(before).length).toBeGreaterThan(0);
		env.edit(FILE, "hits {(undefined as any).missing}", "fixed {n}");
		await shows(page, "fixed 3");
		await page.click("#clicks");
		expect(await page.textContent("#clicks")).toBe("fixed 4");
		expect(await kept(page, "#clicks")).toEqual([true]);
	});

	test("an edit to a setup remounts that component and nothing else", async () => {
		const page = env.lab();
		await mark(page, "#todos, #todos ul");
		env.edit(FILE, "let done = false;", "let done = true;");
		await page.waitForFunction(
			() => document.querySelectorAll("#todos li.done").length === 3,
			undefined,
			{timeout: 10000},
		);
		// The items are new, in the order which their parent still has.
		expect(await items()).toEqual([
			{text: "[a]", class: "done", note: ""},
			{text: "[b]", class: "done", note: ""},
			{text: "[c]", class: "done", note: ""},
		]);
		expect(await kept(page, "#todos li")).toEqual([false, false, false]);
		expect(await kept(page, "#todos, #todos ul")).toEqual([true, true]);
		expect(
			await page.evaluate(() => ({
				checked: (document.getElementById("check") as HTMLInputElement).checked,
				scroll: document.getElementById("scroller")!.scrollTop,
				clicks: document.getElementById("clicks")!.textContent,
			})),
		).toEqual({checked: true, scroll: 500, clicks: "fixed 4"});
	});

	test("a component with its loop in a try statement", async () => {
		const page = env.lab();
		const cleanups = () =>
			page.evaluate(() => (window as any).guardedCleanups || 0);
		await page.click("#guarded");
		await page.click("#guarded");
		await mark(page, "#guarded");
		env.edit(FILE, "guarded {count}", "GUARDED {count}");
		await shows(page, "GUARDED 2");
		expect(await kept(page, "#guarded")).toEqual([true]);
		expect(await cleanups()).toBe(0);
		await page.click("#guarded");
		expect(await page.textContent("#guarded")).toBe("GUARDED 3");
		// An edit to the setup unmounts the instance, which runs its finally
		// clause.
		env.edit(FILE, "let count = 0;", "let count = 10;");
		await shows(page, "GUARDED 10");
		expect(await kept(page, "#guarded")).toEqual([false]);
		expect(await cleanups()).toBe(1);
	});
}
