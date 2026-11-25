import {expect, test} from "bun:test";
import {createElement} from "@b9g/crank";
import {renderer} from "@b9g/crank/html";
import {mkdirSync, rmSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {analyze} from "../../src/graph.ts";
import * as runtime from "../../src/runtime.js";
import {compile} from "../../src/compile.ts";

// A development server which evaluates a whole new bundle with every edit.
// Every module is evaluated again, and a binding keeps its value when
// neither its source nor the source of anything it refers to has changed.

const work = join(import.meta.dir, "../../.work/bundle");
const src = join(work, "src");
const handles: any = ((globalThis as any).bundle = {log: []});

const files = {
	"store.ts": `
export const store = {count: 0};
export const LIMIT = 10;
export function bump(): void {
	store.count += 1;
}
`,
	"app.tsx": `
import {createElement} from "@b9g/crank";
import type {Context} from "@b9g/crank";
import {bump, store} from "./store.ts";

const h: any = (globalThis as any).bundle;

export function* Counter(this: Context) {
	h.log.push("setup");
	h.bump = () => {
		bump();
		this.refresh();
	};
	for ({} of this) {
		yield <p>{store.count}</p>;
	}
}

export function App() {
	return <div><Counter /></div>;
}
`,
};

let builds = 0;
async function build(): Promise<any> {
	mkdirSync(src, {recursive: true});
	writeFileSync(
		join(work, "tsconfig.json"),
		'{"compilerOptions": {"jsx": "react", "jsxFactory": "createElement"}}',
	);
	for (const [name, source] of Object.entries(files)) {
		writeFileSync(join(src, name), source);
	}

	const graph = analyze([join(src, "app.tsx")], ++builds);
	const out = join(work, `v${builds}`);
	mkdirSync(out, {recursive: true});
	for (const name of Object.keys(files)) {
		// The file keeps its name, so that the imports of the bundle find it.
		writeFileSync(
			join(out, name),
			compile(files[name as keyof typeof files], {
				// Other tests have modules with these names.
				id: "bundle/" + name,
				runtime: join(import.meta.dir, "../../src/runtime.js"),
				hashes: graph.hashes.get(join(src, name)),
			}).code,
		);
	}

	const mod = await import(join(out, "app.tsx"));
	const store = await import(join(out, "store.ts"));
	runtime.flush();
	return {...mod, ...store};
}

function edit(name: keyof typeof files, from: string, to: string): void {
	if (!files[name].includes(from)) {
		throw new Error(`${from} not in ${name}`);
	}

	files[name] = files[name].replace(from, to);
}

// The tests share one tree, and run in order.
let first: any;
const root = {};
const read = () => renderer.render(<first.App />, root) as string;

test("a bundle with no edits keeps every value and every instance", async () => {
	rmSync(work, {recursive: true, force: true});
	first = await build();
	expect(read()).toBe("<div><p>0</p></div>");
	handles.bump();
	const second = await build();
	expect(second.store).toBe(first.store);
	expect(second.bump).toBe(first.bump);
	expect(second.App).toBe(first.App);
	expect(read()).toBe("<div><p>1</p></div>");
	expect(handles.log).toEqual(["setup"]);
});

test("an edit to a view keeps the instance and the values of other modules", async () => {
	edit("app.tsx", "yield <p>{store.count}</p>;", "yield <b>{store.count}</b>;");
	const next = await build();
	expect(next.store).toBe(first.store);
	expect(read()).toBe("<div><b>1</b></div>");
	handles.bump();
	expect(read()).toBe("<div><b>2</b></div>");
	expect(handles.log).toEqual(["setup"]);
});

test("an edit to a const which nothing else refers to", async () => {
	edit("store.ts", "LIMIT = 10", "LIMIT = 20");
	const next = await build();
	expect(next.LIMIT).toBe(20);
	expect(next.store).toBe(first.store);
	expect(next.bump).toBe(first.bump);
	expect(read()).toBe("<div><b>2</b></div>");
	expect(handles.log).toEqual(["setup"]);
});

test("an edit to a function which the setup of a component uses", async () => {
	edit("store.ts", "store.count += 1;", "store.count += 10;");
	const next = await build();
	// The store is the same object, and the function is not.
	expect(next.store).toBe(first.store);
	expect(next.bump).not.toBe(first.bump);
	expect(handles.log).toEqual(["setup", "setup"]);
	handles.bump();
	expect(read()).toBe("<div><b>12</b></div>");
});

test("an edit to a value makes what refers to it again", async () => {
	edit("store.ts", "{count: 0}", "{count: 100}");
	const next = await build();
	expect(next.store).not.toBe(first.store);
	expect(next.store.count).toBe(100);
	expect(handles.log).toEqual(["setup", "setup", "setup"]);
	handles.bump();
	expect(read()).toBe("<div><b>110</b></div>");
});
