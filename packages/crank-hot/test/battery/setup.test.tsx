import {expect, test} from "bun:test";
import {createElement} from "@b9g/crank";
import {gen, scenario} from "./harness.ts";

// Edits to anything in a generator component outside its loop. The component
// is a different component: a new instance is mounted in its place, and the
// old one is unmounted, in the order Crank replaces any component.

test("an edit to the initializer of a variable", async () => {
	const s = scenario();
	const view = "yield <p>{n} {start}</p>;";
	const {Counter} = await s.load(gen({setup: "const start = 1;", view}));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.inc();
	expect(read()).toBe("<p>1 1</p>");
	await s.load(gen({setup: "const start = 2;", view}));
	expect(read()).toBe("<p>0 2</p>");
	expect(s.h.log).toEqual(["setup", "setup", "cleanup"]);
});

test("an edit to a handler which the setup makes", async () => {
	const s = scenario();
	const view = "yield <p>{n}</p>;";
	const {Counter} = await s.load(
		gen({setup: "h.add = () => { n += 1; this.refresh(); };", view}),
	);
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.add();
	await s.load(
		gen({setup: "h.add = () => { n += 100; this.refresh(); };", view}),
	);
	expect(read()).toBe("<p>0</p>");
	s.h.add();
	expect(read()).toBe("<p>100</p>");
	expect(s.h.log).toEqual(["setup", "setup", "cleanup"]);
});

test("an edit to the parameters", async () => {
	const s = scenario();
	const view = "yield <p>{name} {n}</p>;";
	const {Counter} = await s.load(gen({params: '{name = "x"}: any', view}));
	const read = () => s.render(<Counter />);
	read();
	s.h.inc();
	await s.load(gen({params: '{name = "y"}: any', view}));
	expect(s.h.log).toEqual(["setup", "setup", "cleanup"]);
});

test("an edit to the head of the loop", async () => {
	const s = scenario();
	const view = "yield <p>{n}</p>;";
	const {Counter} = await s.load(gen({head: "{name} of this", view}));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.inc();
	await s.load(gen({head: "{} of this", view}));
	expect(read()).toBe("<p>0</p>");
	expect(s.h.log).toEqual(["setup", "setup", "cleanup"]);
});

test("an edit to what comes after the loop", async () => {
	const s = scenario();
	const view = "yield <p>{n}</p>;";
	const {Counter} = await s.load(gen({after: 'h.log.push("left");', view}));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.inc();
	await s.load(gen({after: 'h.log.push("LEFT");', view}));
	expect(read()).toBe("<p>0</p>");
	// The old instance runs what came after its own loop when it is unmounted.
	expect(s.h.log).toEqual(["setup", "setup", "cleanup", "left"]);
});

test("a new variable in the setup which the new view reads", async () => {
	const s = scenario();
	const {Counter} = await s.load(gen({view: "yield <p>{n}</p>;"}));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.inc();
	await s.load(
		gen({setup: 'const unit = "px";', view: "yield <p>{n}{unit}</p>;"}),
	);
	expect(read()).toBe("<p>0px</p>");
	expect(s.h.log).toEqual(["setup", "setup", "cleanup"]);
});

test("the edit after a remount is to the new instance", async () => {
	const s = scenario();
	const {Counter} = await s.load(
		gen({setup: "const k = 1;", view: "yield <p>{n}</p>;"}),
	);
	const read = () => s.render(<Counter name="a" />);
	read();
	await s.load(gen({setup: "const k = 2;", view: "yield <p>{n}</p>;"}));
	s.h.inc();
	s.h.inc();
	await s.load(gen({setup: "const k = 2;", view: "yield <b>{n} {k}</b>;"}));
	expect(read()).toBe("<b>2 2</b>");
	expect(s.h.log).toEqual(["setup", "setup", "cleanup"]);
});

test("around a component which is remounted", async () => {
	const s = scenario();
	const stateful = (name: string, body: string, extra = "") => `
export function* ${name}(this: Context) {
	let n = 0;
	h["inc${name}"] = () => { n++; this.refresh(); };
	h.log.push("setup ${name}");
	${extra}
	for ({} of this) {
		yield ${body};
	}
}`;
	const source = (extra: string) =>
		stateful("Parent", "<div>{n}<Middle /><Sibling /></div>") +
		stateful("Middle", "<section>{n}<Leaf /></section>", extra) +
		stateful("Leaf", "<i>{n}</i>") +
		stateful("Sibling", "<u>{n}</u>");
	const {Parent} = await s.load(source(""));
	const read = () => s.render(<Parent />);
	read();
	for (const name of ["Parent", "Middle", "Leaf", "Sibling"]) {
		s.h["inc" + name]();
	}

	expect(read()).toBe("<div>1<section>1<i>1</i></section><u>1</u></div>");
	s.h.log.length = 0;
	await s.load(source("const added = true;"));
	// The component which was edited starts again, and so does what is under
	// it. What is above it and beside it carries on.
	expect(read()).toBe("<div>1<section>0<i>0</i></section><u>1</u></div>");
	expect(s.h.log).toEqual(["setup Middle", "setup Leaf"]);
});
