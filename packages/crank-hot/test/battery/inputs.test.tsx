import {expect, test} from "bun:test";
import {createElement} from "@b9g/crank";
import {gen, scenario} from "./harness.ts";

// What the code outside the loop of a generator component uses. It ran once
// with those values, so when one of them is replaced the component is
// remounted, and otherwise it carries on.

const setup = "h.add = () => { n += step(); this.refresh(); };";
const view = "yield <p>{n}</p>;";

test("a helper which the setup uses is edited in another module", async () => {
	const s = scenario();
	await s.load("export const step = () => 1;", "lib");
	const counter = (version: number) =>
		`import {step} from "./lib.${version}.js";\n` + gen({setup, view});
	const {Counter} = await s.load(counter(1));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.add();
	expect(read()).toBe("<p>1</p>");
	// The module of the helper changes, and what imports it is evaluated again.
	await s.load("export const step = () => 10;", "lib");
	await s.load(counter(2));
	expect(s.h.log).toEqual(["setup", "setup", "cleanup"]);
	s.h.add();
	expect(read()).toBe("<p>10</p>");
});

test("the module is evaluated again and what the setup uses is the same", async () => {
	const s = scenario();
	await s.load("export const step = () => 1;", "lib");
	const counter = (extra: string) =>
		'import {step} from "./lib.1.js";\n' + gen({setup, view}) + extra;
	const {Counter} = await s.load(counter(""));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.add();
	await s.load(counter("export function Other() { return null; }"));
	expect(read()).toBe("<p>1</p>");
	expect(s.h.log).toEqual(["setup"]);
});

test("a helper in the same module which the setup uses is edited", async () => {
	const s = scenario();
	const counter = (amount: number) =>
		gen({setup, view}) +
		"function step() { return amount(); }\n" +
		`function amount() { return ${amount}; }\n`;
	const {Counter} = await s.load(counter(1));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.add();
	// The helper which changed is one which the helper of the setup calls.
	await s.load(counter(10));
	expect(s.h.log).toEqual(["setup", "setup", "cleanup"]);
	s.h.add();
	expect(read()).toBe("<p>10</p>");
});

test("a helper in the same module which only the view uses is edited", async () => {
	const s = scenario();
	const counter = (mark: string) =>
		gen({view: "yield <p>{show(n)}</p>;"}) +
		`function show(value: number) { return "${mark}" + value; }\n`;
	const {Counter} = await s.load(counter("x"));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.inc();
	await s.load(counter("#"));
	expect(read()).toBe("<p>#1</p>");
	expect(s.h.log).toEqual(["setup"]);
});

test("a value of the same module which the setup uses is made again", async () => {
	const s = scenario();
	const counter = (view: string) =>
		"const cache = new Map<string, number>();\n" +
		gen({setup: 'h.put = () => { cache.set("k", n); this.refresh(); };', view});
	const {Counter} = await s.load(counter("yield <p>{cache.size}</p>;"));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.put();
	expect(read()).toBe("<p>1</p>");
	// The module has a new map, which the new view would read while the old
	// setup wrote to the old one.
	await s.load(counter("yield <b>{cache.size}</b>;"));
	expect(s.h.log).toEqual(["setup", "setup", "cleanup"]);
	expect(read()).toBe("<b>0</b>");
	s.h.put();
	expect(read()).toBe("<b>1</b>");
});

test("a component which the setup uses is edited", async () => {
	const s = scenario();
	const source = (text: string) =>
		gen({setup: "const Tag = Label;", view: "yield <Tag />;"}) +
		`export function Label() { return <i>${text}</i>; }\n`;
	const {Counter} = await s.load(source("one"));
	const read = () => s.render(<Counter name="a" />);
	expect(read()).toBe("<i>one</i>");
	await s.load(source("two"));
	// A component is the same function through every edit.
	expect(read()).toBe("<i>two</i>");
	expect(s.h.log).toEqual(["setup"]);
});

test("a component made by calling a function", async () => {
	const s = scenario();
	const source = (view: string, tag: string) =>
		gen({view}) +
		`const boxed = (Inner: any) => (props: any) => <${tag}><Inner {...props} /></${tag}>;\n` +
		"export const Boxed = boxed(Counter);\n";
	const {Boxed} = await s.load(source("yield <i>{n}</i>;", "div"));
	const read = () => s.render(<Boxed name="a" />);
	expect(read()).toBe("<div><i>0</i></div>");
	s.h.inc();
	// An edit to the component which was passed: the result is kept.
	const second = await s.load(source("yield <b>{n}</b>;", "div"));
	expect(second.Boxed).toBe(Boxed);
	expect(read()).toBe("<div><b>1</b></div>");
	// An edit to the function which made it: it is made again, and is still
	// the same function to the rest of the app.
	const third = await s.load(source("yield <b>{n}</b>;", "section"));
	expect(third.Boxed).toBe(Boxed);
	expect(read()).toBe("<section><b>0</b></section>");
});

test("a const named like a component which is not one", async () => {
	const s = scenario();
	const source = (limit: number) =>
		`const make = (limit: number) => ({limit});\n` +
		`export const Config = make(${limit});\n` +
		"export function Page() { return <p>{Config.limit}</p>; }\n";
	const first = await s.load(source(1));
	expect(first.Config).toEqual({limit: 1});
	const second = await s.load(source(1));
	expect(second.Config).toBe(first.Config);
	const third = await s.load(source(2));
	expect(third.Config).toEqual({limit: 2});
	expect(s.render(<first.Page />)).toBe("<p>2</p>");
});

test("a variable of the module which the setup assigns to", async () => {
	const s = scenario();
	const counter = (view: string) =>
		"let total = 0;\n" +
		gen({setup: "h.add = () => { total += 1; this.refresh(); };", view});
	const {Counter} = await s.load(counter("yield <p>{total}</p>;"));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.add();
	expect(read()).toBe("<p>1</p>");
	// The module has a new variable, so the handler which the setup made
	// would assign to one which the new view cannot see.
	await s.load(counter("yield <b>{total}</b>;"));
	expect(s.h.log).toEqual(["setup", "setup", "cleanup"]);
	s.h.add();
	expect(read()).toBe("<b>1</b>");
});
