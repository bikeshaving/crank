import {expect, test} from "bun:test";
import {createElement} from "@b9g/crank";
import {gen, scenario} from "./harness.ts";

// Components of other shapes.

test("an edit to the view of an async generator component", async () => {
	const s = scenario();
	const source = (view: string) => `
export async function* Feed(this: Context, {name}: any) {
	let n = 0;
	h.inc = () => { n++; return this.refresh(); };
	h.log.push("setup");
	for await ({name} of this) {
		${view}
	}
}`;
	const {Feed} = await s.load(source("yield <p>{name}: {n}</p>;"));
	const read = () => s.render(<Feed name="a" />);
	expect(await read()).toBe("<p>a: 0</p>");
	await s.h.inc();
	await s.h.inc();
	expect(await read()).toBe("<p>a: 2</p>");
	await s.load(source("await null; yield <b>{name} is {n}</b>;"));
	expect(await read()).toBe("<b>a is 2</b>");
	await s.h.inc();
	expect(await read()).toBe("<b>a is 3</b>");
	expect(s.h.log).toEqual(["setup"]);
});

test("an edit to the setup of an async generator component", async () => {
	const s = scenario();
	const source = (start: number) => `
export async function* Feed(this: Context) {
	let n = ${start};
	h.log.push("setup");
	for await ({} of this) {
		yield <p>{n}</p>;
	}
}`;
	const {Feed} = await s.load(source(0));
	const read = () => s.render(<Feed />);
	expect(await read()).toBe("<p>0</p>");
	await s.load(source(5));
	expect(await read()).toBe("<p>5</p>");
	expect(s.h.log).toEqual(["setup", "setup"]);
});

test("a generator component without a loop is remounted by any edit", async () => {
	const s = scenario();
	const source = (text: string) => `
export function* Steps(this: Context) {
	h.log.push("setup");
	yield <p>${text}</p>;
	yield <p>second</p>;
}`;
	const {Steps} = await s.load(source("first"));
	expect(s.render(<Steps />)).toBe("<p>first</p>");
	await s.load(source("FIRST"));
	expect(s.h.log).toEqual(["setup", "setup"]);
});

test("a var in the loop keeps its value through an edit", async () => {
	const s = scenario();
	const source = (tag: string) => `
export function* Legacy(this: Context) {
	h.log.push("setup");
	for ({} of this) {
		var renders = (renders || 0) + 1;
		yield <${tag}>{renders}</${tag}>;
	}
}`;
	const {Legacy} = await s.load(source("p"));
	const read = () => s.render(<Legacy />);
	read();
	expect(read()).toBe("<p>2</p>");
	await s.load(source("b"));
	// The edit rendered once, and reading renders again.
	expect(read()).toBe("<b>4</b>");
	expect(s.h.log).toEqual(["setup"]);
});

test("a new var in the loop remounts the component", async () => {
	const s = scenario();
	const {Counter} = await s.load(gen({view: "yield <p>{n}</p>;"}));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.inc();
	await s.load(gen({view: "var extra = 1; yield <p>{n + extra}</p>;"}));
	expect(read()).toBe("<p>1</p>");
	expect(s.h.log).toEqual(["setup", "setup", "cleanup"]);
});

test("the arguments of the component in an edited loop", async () => {
	const s = scenario();
	const source = (tag: string) => `
export function* Legacy(this: Context, props: any) {
	h.log.push("setup");
	for ({} of this) {
		yield <${tag}>{arguments.length} {String(arguments[1] === this)}</${tag}>;
	}
}`;
	const {Legacy} = await s.load(source("p"));
	const read = () => s.render(<Legacy />);
	expect(read()).toBe("<p>2 true</p>");
	await s.load(source("b"));
	expect(read()).toBe("<b>2 true</b>");
	expect(s.h.log).toEqual(["setup"]);
});

test("an edit while an async generator component is waiting on its own work", async () => {
	const s = scenario();
	const source = (view: string) => `
export async function* Feed(this: Context) {
	let n = 0;
	h.inc = () => { n++; return this.refresh(); };
	h.log.push("setup");
	for await ({} of this) {
		${view}
	}
}`;
	const wait = "await new Promise((resolve) => (h.release = resolve));";
	const {Feed} = await s.load(source(`${wait} yield <p>{n}</p>;`));
	const read = () => s.render(<Feed />);
	const first = read();
	await new Promise((resolve) => setTimeout(resolve));
	// The component is in the middle of its first render.
	await s.load(source("yield <b>{n}</b>;"));
	s.h.release();
	await first;
	expect(await read()).toBe("<b>0</b>");
	await s.h.inc();
	expect(await read()).toBe("<b>1</b>");
	expect(s.h.log).toEqual(["setup"]);
});

test("a generator component which becomes an async generator component", async () => {
	const s = scenario();
	const {Counter} = await s.load(gen({view: "yield <p>{n}</p>;"}));
	const read = () => s.render(<Counter name="a" />);
	expect(read()).toBe("<p>0</p>");
	await s.load(`
export async function* Counter(this: Context, {name}: any) {
	for await ({name} of this) {
		yield <b>{name}</b>;
	}
}`);
	expect(await read()).toBe("<b>a</b>");
	expect(s.h.log).toEqual(["setup", "cleanup"]);
});

test("a generator which is not a component", async () => {
	const s = scenario();
	const source = (step: number) => `
export function* Range(start: number, end: number) {
	for (let i = start; i < end; i += ${step}) {
		yield i;
	}
}
export function Format(value: number) {
	return "v${step}:" + value;
}`;
	const {Range, Format} = await s.load(source(1));
	expect([...Range(1, 4)]).toEqual([1, 2, 3]);
	expect(Format(1)).toBe("v1:1");
	const next = await s.load(source(2));
	expect(next.Range).toBe(Range);
	expect([...Range(1, 6)]).toEqual([1, 3, 5]);
	expect(Format(1)).toBe("v2:1");
});
