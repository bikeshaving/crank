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
		`import {step} from "./lib.${version}.tsx";\n` + gen({setup, view});
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
		'import {step} from "./lib.1.tsx";\n' + gen({setup, view}) + extra;
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

test("a component made by calling a function is made again with its module", async () => {
	const s = scenario();
	const source = (view: string, tag: string) =>
		gen({view}) +
		`const boxed = (Inner: any) => (props: any) => <${tag}><Inner {...props} /></${tag}>;\n` +
		"export const Boxed = boxed(Counter);\n" +
		"export const Model = (() => class { static count = 1; value = 2; })();\n";
	const first = await s.load(source("yield <i>{n}</i>;", "div"));
	expect(s.render(<first.Boxed name="a" />)).toBe("<div><i>0</i></div>");
	s.h.inc();
	// Only what is written as a function is a component, so the result of the
	// call is a different function in the new module, and starts again.
	const second = await s.load(source("yield <b>{n}</b>;", "div"));
	expect(second.Boxed).not.toBe(first.Boxed);
	expect(s.render(<second.Boxed name="a" />)).toBe("<div><b>0</b></div>");
	// And what is not a component is left as it was written.
	expect(new second.Model().value).toBe(2);
	expect(second.Model.count).toBe(1);
});

test("a const named like a component which is not one", async () => {
	const s = scenario();
	const source = (limit: number) =>
		`const make = (limit: number) => ({limit});\n` +
		`export const Config = make(${limit});\n` +
		"export function Page() { return <p>{Config.limit}</p>; }\n";
	const first = await s.load(source(1));
	expect(first.Config).toEqual({limit: 1});
	// It is evaluated again with its module, like any other const.
	const second = await s.load(source(1));
	expect(second.Config).toEqual({limit: 1});
	expect(second.Config).not.toBe(first.Config);
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

// What the code outside the loop uses which is not a binding of its module,
// or is one under a name which something else in the component also has.

test("a binding of the module with the name of a variable in another block", async () => {
	const s = scenario();
	const source = (value: string) => `
const tag = {value: ${JSON.stringify(value)}};
export function* Counter(this: Context) {
	h.log.push("setup");
	// This is the binding of the module: the variable below is in a block.
	h.read = () => tag.value;
	try {
		const tag = "local";
		for ({} of this) {
			yield <p>{tag}</p>;
		}
	} finally {
		h.log.push("cleanup");
	}
}`;
	const {Counter} = await s.load(source("one"));
	s.render(<Counter />);
	expect(s.h.read()).toBe("one");
	await s.load(source("two"));
	expect(s.h.log).toEqual(["setup", "setup", "cleanup"]);
	expect(s.h.read()).toBe("two");
});

test("a global which the setup uses is replaced", async () => {
	const s = scenario();
	const source = gen({
		setup: "const api = hotTestApi; h.call = () => api.name;",
		view: "yield <p>{n}</p>;",
	});
	(globalThis as any).hotTestApi = {name: "one"};
	const {Counter} = await s.load(source);
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.inc();
	// The module is evaluated again, and the global is the same.
	await s.load(source);
	expect(s.h.log).toEqual(["setup"]);
	expect(read()).toBe("<p>1</p>");
	// It is evaluated again after the global has been replaced.
	(globalThis as any).hotTestApi = {name: "two"};
	await s.load(source);
	expect(s.h.log).toEqual(["setup", "setup", "cleanup"]);
	expect(s.h.call()).toBe("two");
	delete (globalThis as any).hotTestApi;
});

test("a property of the global object which the setup uses is replaced", async () => {
	const s = scenario();
	const source = gen({
		setup:
			"const client = globalThis.hotTestApp.client; h.call = () => client.name;",
		view: "yield <p>{n}</p>;",
	});
	(globalThis as any).hotTestApp = {client: {name: "one"}};
	const {Counter} = await s.load(source);
	s.render(<Counter name="a" />);
	await s.load(source);
	expect(s.h.log).toEqual(["setup"]);
	(globalThis as any).hotTestApp.client = {name: "two"};
	await s.load(source);
	expect(s.h.log).toEqual(["setup", "setup", "cleanup"]);
	expect(s.h.call()).toBe("two");
	delete (globalThis as any).hotTestApp;
});

test("a global which only the view uses is replaced", async () => {
	const s = scenario();
	const source = gen({view: "yield <p>{hotTestLabel.text} {n}</p>;"});
	(globalThis as any).hotTestLabel = {text: "one"};
	const {Counter} = await s.load(source);
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.inc();
	(globalThis as any).hotTestLabel = {text: "two"};
	await s.load(source);
	expect(read()).toBe("<p>two 1</p>");
	expect(s.h.log).toEqual(["setup"]);
	delete (globalThis as any).hotTestLabel;
});

test("a module which the setup imports when it runs", async () => {
	const s = scenario();
	await s.load("export const step = 1;", "lib");
	const source = gen({
		setup:
			'const lib = import("./lib.1.tsx"); h.step = async () => (await lib).step;',
		view: "yield <p>{n}</p>;",
	});
	const {Counter} = await s.load(source);
	s.render(<Counter name="a" />);
	expect(await s.h.step()).toBe(1);
	// Nothing says which module the promise is for, so the component is
	// remounted whenever its own module is evaluated again, which is what a
	// development server does when the module it imports has changed.
	await s.load(source);
	expect(s.h.log).toEqual(["setup", "setup", "cleanup"]);
});

test("a module which only the view imports when it runs", async () => {
	const s = scenario();
	await s.load("export const step = 1;", "lib");
	const source = (mark: string) =>
		gen({
			view: `h.lib = import("./lib.1.tsx"); yield <p>${mark}{n}</p>;`,
		});
	const {Counter} = await s.load(source(""));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.inc();
	await s.load(source("#"));
	expect(read()).toBe("<p>#1</p>");
	expect(s.h.log).toEqual(["setup"]);
	// The edited view finds the module from where its own module is.
	expect((await s.h.lib).step).toBe(1);
});

test("a listener which the setup gives to something outside the component", async () => {
	const s = scenario();
	const bus = ((globalThis as any).hotTestBus = new EventTarget());
	const source = (start: number, cleanup: string) =>
		gen({
			setup: `const start = ${start};
	const onping = () => h.log.push("ping " + start);
	hotTestBus.addEventListener("ping", onping);
	${cleanup}`,
			view: "yield <p>{n}</p>;",
		});
	const remove =
		'this.cleanup(() => hotTestBus.removeEventListener("ping", onping));';
	const {Counter} = await s.load(source(1, remove));
	s.render(<Counter name="a" />);
	await s.load(source(2, remove));
	s.h.log.length = 0;
	bus.dispatchEvent(new Event("ping"));
	// The old instance was unmounted, and took its listener with it.
	expect(s.h.log).toEqual(["ping 2"]);

	// A component which does not remove its listener leaves it behind when it
	// is unmounted, by an edit or by anything else.
	await s.load(source(3, ""));
	await s.load(source(4, ""));
	s.h.log.length = 0;
	bus.dispatchEvent(new Event("ping"));
	expect(s.h.log).toEqual(["ping 3", "ping 4"]);
	delete (globalThis as any).hotTestBus;
});
