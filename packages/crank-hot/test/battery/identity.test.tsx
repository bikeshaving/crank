import {expect, test} from "bun:test";
import {createElement} from "@b9g/crank";
import {gen, scenario} from "./harness.ts";

// What the rest of the app holds: the component is the same function through
// every edit, so nothing has to be told that it changed.

test("an export is the same function after every kind of edit", async () => {
	const s = scenario();
	const first = await s.load(gen({view: "yield <p>{n}</p>;"}));
	const second = await s.load(gen({view: "yield <b>{n}</b>;"}));
	const third = await s.load(
		gen({setup: "const k = 1;", view: "yield <b>{n}</b>;"}),
	);
	const fourth = await s.load("export function Counter() { return null; }");
	expect(second.Counter).toBe(first.Counter);
	expect(third.Counter).toBe(first.Counter);
	expect(fourth.Counter).toBe(first.Counter);
	expect(first.Counter.name).toBe("Counter");
});

test("a property assigned to a component", async () => {
	const s = scenario();
	const source = (title: string) =>
		`export function Page() { return <p>{(Page as any).title}</p>; }\n` +
		`(Page as any).title = ${JSON.stringify(title)};\n`;
	const {Page} = await s.load(source("one"));
	expect(s.render(<Page />)).toBe("<p>one</p>");
	await s.load(source("two"));
	expect(Page.title).toBe("two");
	expect(s.render(<Page />)).toBe("<p>two</p>");
});

test("a component which is held in a value of another module", async () => {
	const s = scenario();
	const {Counter} = await s.load(gen({view: "yield <p>{n}</p>;"}));
	const routes = {home: Counter};
	const read = () => s.render(createElement(routes.home, {name: "a"}));
	read();
	s.h.inc();
	await s.load(gen({view: "yield <b>{n}</b>;"}));
	expect(read()).toBe("<b>1</b>");
});

test("a module which imports a component is not evaluated again", async () => {
	const s = scenario();
	await s.load(gen({view: "yield <p>{n}</p>;"}), "child");
	const {Page} = await s.load(
		'import {Counter} from "./child.1.js";\n' +
			'export function Page() { return <div><Counter name="a" /></div>; }',
		"parent",
	);
	const read = () => s.render(<Page />);
	read();
	s.h.inc();
	// Only the module of the child is replaced, as a development server does
	// for a module which accepts its own replacement.
	await s.load(gen({view: "yield <b>{n}</b>;"}), "child");
	expect(read()).toBe("<div><b>1</b></div>");
	await s.load(gen({setup: "n = 7;", view: "yield <b>{n}</b>;"}), "child");
	expect(read()).toBe("<div><b>7</b></div>");
});

test("a component which is not exported", async () => {
	const s = scenario();
	const source = (view: string) =>
		gen({name: "Inner", view}).replace("export function*", "function*") +
		'export function Page() { return <div><Inner name="a" /></div>; }';
	const {Page} = await s.load(source("yield <p>{n}</p>;"));
	const read = () => s.render(<Page />);
	read();
	s.h.inc();
	await s.load(source("yield <b>{n}</b>;"));
	expect(read()).toBe("<div><b>1</b></div>");
	expect(s.h.log).toEqual(["setup"]);
});

test("a component which is used before its declaration", async () => {
	const s = scenario();
	const source = (text: string) => `
import {renderer} from "@b9g/crank/html";
h.early = renderer.render(<Late />);
h.tag = Late;
export function Late() {
	return <p>${text}</p>;
}`;
	const {Late} = await s.load(source("one"));
	expect(s.h.early).toBe("<p>one</p>");
	// The statement saw the component which the rest of the app sees.
	expect(s.h.tag).toBe(Late);
	await s.load(source("two"));
	expect(s.h.early).toBe("<p>two</p>");
});

test("a default export with a name", async () => {
	const s = scenario();
	const source = (tag: string) =>
		`export default function Page() { return <${tag}>page</${tag}>; }`;
	const first = await s.load(source("p"));
	const second = await s.load(source("b"));
	expect(second.default).toBe(first.default);
	expect(s.render(createElement(first.default, null))).toBe("<b>page</b>");
});
