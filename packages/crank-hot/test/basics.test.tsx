import {beforeAll, expect, test} from "bun:test";
import {createElement} from "@b9g/crank";
import {renderer} from "@b9g/crank/html";
import {mkdirSync, rmSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import * as runtime from "../src/runtime.js";
import {transform} from "../src/transform.ts";

const work = join(import.meta.dir, "../.work/basics");
const handles: any = ((globalThis as any).handles = {cleanups: 0});

// The module under test, with the parts which the tests edit.
function source({
	helper = '"x" + n',
	start = "0",
	view = "yield <button>{name}: {label(n)}</button>;",
	app = "<div><Counter name={name} /><Child /><Shadow /></div>",
	gate = "<p>done {renders}</p>",
} = {}): string {
	return `
import {createElement} from "@b9g/crank";
import type {Context} from "@b9g/crank";

const handles: any = (globalThis as any).handles;
const label = (n: number): string => ${helper};
const tag = "module";

export function* Counter(this: Context, {name}: {name: string}) {
	let n = ${start};
	const inc = () => {
		n++;
		this.refresh();
	};
	handles.inc = inc;
	this.cleanup(() => handles.cleanups++);
	for ({name} of this) {
		${view}
	}
}

export function* Child(this: Context) {
	let pokes = 0;
	handles.poke = () => {
		pokes++;
		this.refresh();
	};
	for ({} of this) {
		yield <i>{pokes}</i>;
	}
}

// A local with the name of a binding of the module.
export function* Shadow(this: Context) {
	const tag = "local";
	for ({} of this) {
		yield <u>{tag}</u>;
	}
}

// A loop which the component returns from.
export function* Gate(this: Context, {mode}: {mode: string}) {
	let renders = 0;
	for ({mode} of this) {
		renders++;
		if (mode === "done") {
			return ${gate};
		}

		yield <p>going {renders}</p>;
	}
}

// Not a component, though it is named like one.
export function* Range(start: number, end: number) {
	for (let i = start; i < end; i++) {
		yield i;
	}
}

export const App = ({name}: {name: string}) => ${app};
`;
}

let version = 0;
async function load(text: string): Promise<any> {
	const code = transform(text, {
		id: "app.tsx",
		runtime: join(import.meta.dir, "../src/runtime.js"),
	}).code;
	const file = join(work, `app.${++version}.tsx`);
	writeFileSync(file, code);
	const mod = await import(file);
	runtime.flush();
	return mod;
}

// The tests share one tree, and run in order.
let mod: any;
const root = {};
const gateRoot = {};
const read = () => renderer.render(<mod.App name="a" />, root) as string;
beforeAll(() => {
	rmSync(work, {recursive: true, force: true});
	mkdirSync(work, {recursive: true});
	writeFileSync(
		join(work, "tsconfig.json"),
		'{"compilerOptions": {"jsx": "react", "jsxFactory": "createElement"}}',
	);
});

test("the components render as they were written", async () => {
	mod = await load(source());
	expect(read()).toBe("<div><button>a: x0</button><i>0</i><u>local</u></div>");
	handles.inc();
	handles.inc();
	handles.poke();
	expect(read()).toBe("<div><button>a: x2</button><i>1</i><u>local</u></div>");
});

test("an edit to a view keeps the state, and the view sees the new module", async () => {
	const next = await load(
		source({
			helper: '"#" + n',
			view: `handles.bump = () => { n += 5; this.refresh(); };
		yield <b>{name} = {label(n)}</b>;`,
		}),
	);
	// The exports are the same functions.
	expect(next.Counter).toBe(mod.Counter);
	expect(next.App).toBe(mod.App);
	expect(read()).toBe("<div><b>a = #2</b><i>1</i><u>local</u></div>");
	expect(handles.cleanups).toBe(0);
});

test("a handler written in the new view assigns to a variable of the setup", () => {
	handles.bump();
	expect(read()).toBe("<div><b>a = #7</b><i>1</i><u>local</u></div>");
	// The handler which the setup made still assigns to the same variable.
	handles.inc();
	expect(read()).toBe("<div><b>a = #8</b><i>1</i><u>local</u></div>");
});

test("an edit to a function component keeps everything under it", async () => {
	await load(
		source({
			helper: '"#" + n',
			view: "yield <b>{name} = {label(n)}</b>;",
			app: "<div><Counter name={name} /><Child /><Shadow /> edited</div>",
		}),
	);
	expect(read()).toBe("<div><b>a = #8</b><i>1</i><u>local</u> edited</div>");
});

test("an edit to the setup remounts the component alone", async () => {
	await load(
		source({
			helper: '"#" + n',
			start: "100",
			view: "yield <b>{name} = {label(n)}</b>;",
			app: "<div><Counter name={name} /><Child /><Shadow /> edited</div>",
		}),
	);
	expect(read()).toBe("<div><b>a = #100</b><i>1</i><u>local</u> edited</div>");
	expect(handles.cleanups).toBe(1);
});

test("a view which returns ends the component", async () => {
	const gate = (mode: string) =>
		renderer.render(<mod.Gate mode={mode} />, gateRoot) as string;
	expect(gate("go")).toBe("<p>going 1</p>");
	await load(
		source({
			helper: '"#" + n',
			start: "100",
			view: "yield <b>{name} = {label(n)}</b>;",
			app: "<div><Counter name={name} /><Child /><Shadow /> edited</div>",
			gate: "<p>finished after {renders}</p>",
		}),
	);
	expect(gate("go")).toBe("<p>going 3</p>");
	expect(gate("done")).toBe("<p>finished after 4</p>");
});

test("a generator which is not a component is called as it was", async () => {
	expect([...mod.Range(1, 4)]).toEqual([1, 2, 3]);
});

test("statements which leave the loop become return statements", () => {
	const code = transform(
		`export function* List(this: any) {
	outer: for (const item of this) {
		if (item === 1) break;
		if (item === 2) continue outer;
		for (const inner of item) { if (inner) break; }
		switch (item) { case 3: break; }
		yield item;
	}
}`,
		{id: "list.ts", runtime: "runtime"},
	).code;
	const view = code.match(
		/function\* __hotView\([^)]*\) \{(.*?)\n\t\}\n\}/s,
	)![1];
	expect(
		view
			.replace(/__locals\./g, "")
			.replace(/\s+/g, " ")
			.trim(),
	).toBe(
		"if (item === 1) return __hot.BREAK; if (item === 2) return; " +
			"for (const inner of item) { if (inner) break; } " +
			"switch (item) { case 3: break; } yield item;",
	);
});

test("a loop which cannot be separated is left whole", () => {
	const code = transform(
		`export function* Legacy(this: any) {
	if (true) {
		for (const props of this) {
			yield props;
		}
	}
}`,
		{id: "legacy.ts", runtime: "runtime"},
	).code;
	expect(code).not.toContain("__hot.view");
	expect(code).toContain('"gen"');
});
