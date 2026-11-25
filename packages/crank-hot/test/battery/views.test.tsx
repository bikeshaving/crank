import {expect, test} from "bun:test";
import {createElement} from "@b9g/crank";
import {gen, scenario} from "./harness.ts";

// Edits to what a generator component does in its loop. The component keeps
// its instance: the setup runs once, and its variables keep their values.

test("an edit to the JSX", async () => {
	const s = scenario();
	const {Counter} = await s.load(gen({view: "yield <p>{name}: {n}</p>;"}));
	const read = () => s.render(<Counter name="a" />);
	expect(read()).toBe("<p>a: 0</p>");
	s.h.inc();
	s.h.inc();
	await s.load(gen({view: "yield <b>{name} is {n}</b>;"}));
	expect(read()).toBe("<b>a is 2</b>");
	expect(s.h.log).toEqual(["setup"]);
});

test("an edit to the statements before the yield", async () => {
	const s = scenario();
	const {Counter} = await s.load(
		gen({view: "const shown = n * 2; yield <p>{shown}</p>;"}),
	);
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.inc();
	s.h.inc();
	s.h.inc();
	expect(read()).toBe("<p>6</p>");
	await s.load(gen({view: "const shown = n * 3; yield <p>{shown}</p>;"}));
	expect(read()).toBe("<p>9</p>");
	expect(s.h.log).toEqual(["setup"]);
});

test("the new view reads a variable which the old view did not", async () => {
	const s = scenario();
	const setup = 'const secret = "hidden";';
	const {Counter} = await s.load(gen({setup, view: "yield <p>{n}</p>;"}));
	const read = () => s.render(<Counter name="a" />);
	read();
	await s.load(gen({setup, view: "yield <p>{secret} {name}</p>;"}));
	expect(read()).toBe("<p>hidden a</p>");
	expect(s.h.log).toEqual(["setup"]);
});

test("a handler in the new view assigns to a variable of the setup", async () => {
	const s = scenario();
	const {Counter} = await s.load(gen({view: "yield <p>{n}</p>;"}));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.inc();
	await s.load(
		gen({
			view: "h.bump = () => { n += 10; this.refresh(); }; yield <p>{n}</p>;",
		}),
	);
	s.h.bump();
	expect(read()).toBe("<p>11</p>");
	// The handler which the setup made assigns to the same variable.
	s.h.inc();
	expect(read()).toBe("<p>12</p>");
});

test("a variable declared in the new view shadows one of the setup", async () => {
	const s = scenario();
	const {Counter} = await s.load(gen({view: "yield <p>{n}</p>;"}));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.inc();
	await s.load(gen({view: '{ const n = "inner"; yield <p>{n}</p>; }'}));
	expect(read()).toBe("<p>inner</p>");
	await s.load(gen({view: "yield <p>{n}</p>;"}));
	expect(read()).toBe("<p>1</p>");
});

test("the new view calls a helper which the module did not have", async () => {
	const s = scenario();
	const {Counter} = await s.load(gen({view: "yield <p>{name}</p>;"}));
	const read = () => s.render(<Counter name="a" />);
	read();
	await s.load(
		gen({view: "yield <p>{shout(name)}</p>;"}) +
			"function shout(text: string) { return text.toUpperCase() + LATE; }\n" +
			'const LATE = "!";\n',
	);
	expect(read()).toBe("<p>A!</p>");
});

test("the new view uses an import which the module did not have", async () => {
	const s = scenario();
	await s.load("export const double = (n: number) => n * 2;", "lib");
	const {Counter} = await s.load(gen({view: "yield <p>{n}</p>;"}));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.inc();
	await s.load(
		'import {double} from "./lib.1.js";\n' +
			gen({view: "yield <p>{double(n)}</p>;"}),
	);
	expect(read()).toBe("<p>2</p>");
});

test("an edit to a const of the module which the view reads", async () => {
	const s = scenario();
	const view = "yield <p>{n}{UNIT}</p>;";
	const {Counter} = await s.load('const UNIT = "px";\n' + gen({view}));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.inc();
	await s.load('const UNIT = "em";\n' + gen({view}));
	expect(read()).toBe("<p>1em</p>");
	expect(s.h.log).toEqual(["setup"]);
});

test("props which the loop declares", async () => {
	const s = scenario();
	const options = {params: "props: any", head: "const {name} of this"};
	const {Counter} = await s.load(
		gen({...options, view: "yield <p>{name}</p>;"}),
	);
	expect(s.render(<Counter name="a" />)).toBe("<p>a</p>");
	await s.load(gen({...options, view: "yield <b>{name} {n}</b>;"}));
	expect(s.render(<Counter name="b" />)).toBe("<b>b 0</b>");
});

test("props as one object", async () => {
	const s = scenario();
	const options = {params: "props: any", head: "props of this"};
	const {Counter} = await s.load(
		gen({...options, view: "yield <p>{props.name}</p>;"}),
	);
	expect(s.render(<Counter name="a" />)).toBe("<p>a</p>");
	await s.load(gen({...options, view: "yield <b>{props.name} {n}</b>;"}));
	expect(s.render(<Counter name="b" />)).toBe("<b>b 0</b>");
});

test("this in the new view is the context", async () => {
	const s = scenario();
	const setup = "h.ctx = this;";
	const {Counter} = await s.load(gen({setup, view: "yield <p>{n}</p>;"}));
	const read = () => s.render(<Counter name="a" />);
	read();
	await s.load(
		gen({
			setup,
			view: "const same = this === h.ctx; yield <p>{String(same)} {String((() => this === h.ctx)())}</p>;",
		}),
	);
	expect(read()).toBe("<p>true true</p>");
});

test("every instance gets the new view and keeps its own variables", async () => {
	const s = scenario();
	const setup = 'h["inc" + name] = () => { n++; this.refresh(); };';
	const {Counter} = await s.load(gen({setup, view: "yield <i>{name}{n}</i>;"}));
	const read = () =>
		s.render(
			<div>
				<Counter name="a" />
				<Counter name="b" />
			</div>,
		);
	read();
	s.h.inca();
	s.h.incb();
	s.h.incb();
	await s.load(gen({setup, view: "yield <b>{name}={n}</b>;"}));
	expect(read()).toBe("<div><b>a=1</b><b>b=2</b></div>");
	expect(s.h.log).toEqual(["setup", "setup"]);
});

test("edit after edit, and back to what it was", async () => {
	const s = scenario();
	const {Counter} = await s.load(gen({view: "yield <p>{n}</p>;"}));
	const read = () => s.render(<Counter name="a" />);
	read();
	for (let i = 1; i <= 3; i++) {
		s.h.inc();
		await s.load(gen({view: `yield <p>v${i} {n}</p>;`}));
		expect(read()).toBe(`<p>v${i} ${i}</p>`);
	}

	await s.load(gen({view: "yield <p>{n}</p>;"}));
	expect(read()).toBe("<p>3</p>");
	expect(s.h.log).toEqual(["setup"]);
});

test("an instance which is mounted after the edit", async () => {
	const s = scenario();
	const {Counter} = await s.load(gen({view: "yield <p>{n}</p>;"}));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.inc();
	s.render(null);
	await s.load(gen({view: "yield <b>{n}</b>;"}));
	expect(read()).toBe("<b>0</b>");
	s.h.inc();
	expect(read()).toBe("<b>1</b>");
	expect(s.h.log).toEqual(["setup", "cleanup", "setup"]);
});

test("a loop in a try statement", async () => {
	const s = scenario();
	const source = (view: string) => `
export function* Counter(this: Context) {
	let n = 0;
	h.inc = () => { n++; this.refresh(); };
	try {
		for ({} of this) {
			${view}
		}
	} finally {
		h.log.push("finally");
	}
}`;
	const {Counter} = await s.load(source("yield <p>{n}</p>;"));
	const read = () => s.render(<Counter />);
	read();
	s.h.inc();
	await s.load(source("yield <b>{n}</b>;"));
	expect(read()).toBe("<b>1</b>");
	expect(s.h.log).toEqual([]);
	s.render(null);
	expect(s.h.log).toEqual(["finally"]);
});

test("a loop with a label", async () => {
	const s = scenario();
	const options = {head: "{name} of this"};
	const source = (view: string) =>
		gen({...options, view}).replace("for (", "render: for (");
	const {Counter} = await s.load(source("yield <p>{n}</p>;"));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.inc();
	await s.load(source("if (h.stop) break render; yield <b>{n}</b>;"));
	expect(read()).toBe("<b>1</b>");
});

test("a while loop", async () => {
	const s = scenario();
	const source = (view: string) => `
export function* Counter(this: Context) {
	let n = 0;
	h.inc = () => { n++; this.refresh(); };
	while (true) {
		${view}
	}
}`;
	const {Counter} = await s.load(source("yield <p>{n}</p>;"));
	const read = () => s.render(<Counter />);
	read();
	s.h.inc();
	await s.load(source("yield <b>{n}</b>;"));
	expect(read()).toBe("<b>1</b>");
});

test("loops and switches in the new view", async () => {
	const s = scenario();
	const {Counter} = await s.load(gen({view: "yield <p>{n}</p>;"}));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.inc();
	await s.load(
		gen({
			view: `let out = "";
			for (const x of [1, 2, 3, 4]) {
				if (x === 2) continue;
				if (x === 4) break;
				out += x;
			}
			switch (n) {
				case 1: out += "one"; break;
				default: out += "other";
			}
			const pick = (list: Array<number>) => { for (const x of list) { if (x > 1) return x; } return 0; };
			yield <p>{out} {pick([1, 2, 3])}</p>;`,
		}),
	);
	expect(read()).toBe("<p>13one 2</p>");
});

test("the new view returns", async () => {
	const s = scenario();
	const {Counter} = await s.load(gen({view: "yield <p>{n}</p>;"}));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.inc();
	await s.load(
		gen({view: "if (h.done) return <b>done at {n}</b>; yield <p>{n}</p>;"}),
	);
	expect(read()).toBe("<p>1</p>");
	s.h.done = true;
	expect(read()).toBe("<b>done at 1</b>");
});

test("the new view breaks out of the loop", async () => {
	const s = scenario();
	const after = "return <i>after {n}</i>;";
	const {Counter} = await s.load(gen({after, view: "yield <p>{n}</p>;"}));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.inc();
	await s.load(gen({after, view: "if (h.stop) break; yield <b>{n}</b>;"}));
	expect(read()).toBe("<b>1</b>");
	s.h.stop = true;
	expect(read()).toBe("<i>after 1</i>");
});

test("the new view uses what the yield evaluates to", async () => {
	const s = scenario();
	const {Counter} = await s.load(gen({view: "yield <p>{n}</p>;"}));
	const read = () => s.render(<Counter name="a" />);
	read();
	await s.load(gen({view: "h.result = yield <b>{n}</b>;"}));
	read();
	read();
	expect(s.h.result).toBe("<b>0</b>");
});

test("the new view uses globals and names which objects inherit", async () => {
	const s = scenario();
	const {Counter} = await s.load(gen({view: "yield <p>{n}</p>;"}));
	const read = () => s.render(<Counter name="a" />);
	read();
	await s.load(
		gen({
			view: "yield <p>{Math.max(n, 7)} {typeof toString} {typeof (globalThis as any).nothing} {typeof constructor}</p>;",
		}),
	);
	expect(read()).toBe("<p>7 function undefined function</p>");
});

test("TypeScript in the new view", async () => {
	const s = scenario();
	const {Counter} = await s.load(gen({view: "yield <p>{n}</p>;"}));
	const read = () => s.render(<Counter name="a" />);
	read();
	await s.load(
		gen({
			view: `const items = [n, n + 1] as Array<number>;
			const first = items[0]!;
			const text = (<T,>(value: T): string => String(value))(first satisfies number);
			yield <><p>{text}</p><p>{items.length}</p></>;`,
		}),
	);
	expect(read()).toBe("<p>0</p><p>2</p>");
});

test("an edit which only changes whitespace and comments", async () => {
	const s = scenario();
	const {Counter} = await s.load(gen({view: "yield <p>{n}</p>;"}));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.inc();
	await s.load(
		gen({
			setup: "// a comment in the setup\n\n",
			view: "/* a comment in the view */\n\n\t\tyield   <p>{n}</p>;",
		}),
	);
	expect(read()).toBe("<p>1</p>");
	expect(s.h.log).toEqual(["setup"]);
});

test("a loop whose body is one statement", async () => {
	const s = scenario();
	const source = (view: string) => `
export function* Counter(this: Context) {
	let n = 0;
	h.inc = () => { n++; this.refresh(); };
	h.log.push("setup");
	for ({} of this) ${view}
}`;
	const {Counter} = await s.load(source("yield <p>{n}</p>;"));
	const read = () => s.render(<Counter />);
	read();
	s.h.inc();
	await s.load(source("yield <b>{n}</b>;"));
	expect(read()).toBe("<b>1</b>");
	await s.load(source("{ const double = n * 2; yield <i>{double}</i>; }"));
	expect(read()).toBe("<i>2</i>");
	expect(s.h.log).toEqual(["setup"]);
});
