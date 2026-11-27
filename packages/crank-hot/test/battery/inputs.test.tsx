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

test("a component which the setup calls is edited", async () => {
	const s = scenario();
	const source = (end: string) =>
		gen({
			setup: "const items = [...Range(2)];",
			view: "yield <p>{items}</p>;",
		}) +
		`export function* Range(n: number) { for (let i = 0; i < ${end}; i++) yield i; }\n`;
	const {Counter} = await s.load(source("n"));
	const read = () => s.render(<Counter name="a" />);
	expect(read()).toBe("<p>01</p>");
	// What is named like a component is not always rendered as one. The setup
	// ran the old one, and kept what it returned.
	await s.load(source("n + 1"));
	expect(read()).toBe("<p>012</p>");
	expect(s.h.log).toEqual(["setup", "setup", "cleanup"]);
});

test("a component of another module which the setup calls is edited", async () => {
	const s = scenario();
	const lib = (end: string) =>
		`export function* Range(n: number) { for (let i = 0; i < ${end}; i++) yield i; }\n` +
		"export function Label() { return <i>label</i>; }\n";
	await s.load(lib("n"), "lib");
	const {Counter} = await s.load(
		'import {Range, Label} from "./lib.1.tsx";\n' +
			gen({
				setup: "const items = [...Range(2)]; const Tag = Label;",
				view: "yield <p>{items}<Tag /></p>;",
			}),
	);
	const read = () => s.render(<Counter name="a" />);
	expect(read()).toBe("<p>01<i>label</i></p>");
	// The module of the components accepts its own replacement, so nothing
	// evaluates this one again, and the runtime starts the component again.
	await s.load(lib("n + 1"), "lib");
	expect(read()).toBe("<p>012<i>label</i></p>");
	expect(s.h.log).toEqual(["setup", "setup", "cleanup"]);
});

test("a function of the module is the same function through every edit", async () => {
	const s = scenario();
	const source = (view: string, text: string) =>
		gen({
			setup: "h.listeners = new Set([onTick]); h.tick = () => onTick();",
			view,
		}) + `function onTick() { return "${text}"; }\n`;
	const {Counter} = await s.load(
		source("yield <p>{String(h.listeners.has(onTick))}</p>;", "one"),
	);
	const read = () => s.render(<Counter name="a" />);
	expect(read()).toBe("<p>true</p>");
	// The view of the new module asks about the function which the setup of
	// the old one kept.
	await s.load(
		source("yield <b>{String(h.listeners.has(onTick))}</b>;", "one"),
	);
	expect(read()).toBe("<b>true</b>");
	expect(s.h.log).toEqual(["setup"]);
	// An edit to the function starts the component again, and what kept the
	// function calls the newest version of it.
	const tick = s.h.tick;
	await s.load(
		source("yield <b>{String(h.listeners.has(onTick))}</b>;", "two"),
	);
	expect(s.h.log).toEqual(["setup", "setup", "cleanup"]);
	expect(tick()).toBe("two");
});

test("a function which another module imports is edited", async () => {
	const s = scenario();
	const lib = (amount: number) =>
		`export const step = () => ${amount};\n` +
		"export function Label() { return <i>label</i>; }\n";
	await s.load(lib(1), "lib");
	const counter = (version: number) =>
		`import {step} from "./lib.${version}.tsx";\n` + gen({setup, view});
	const {Counter} = await s.load(counter(1));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.add();
	expect(read()).toBe("<p>1</p>");
	// The function is the same function in the new module, so the runtime
	// says that it is not the same code.
	await s.load(lib(10), "lib");
	await s.load(counter(2));
	expect(s.h.log).toEqual(["setup", "setup", "cleanup"]);
	s.h.add();
	expect(read()).toBe("<p>10</p>");
});

test("a class of the module is kept while it is the same", async () => {
	const s = scenario();
	const source = (view: string, start: number) =>
		gen({
			setup: "h.add = () => { Store.count++; this.refresh(); };",
			view,
		}) +
		`class Store { static count = ${start}; }\n` +
		"export const made = new Store();\n" +
		"export const isStore = (value: unknown) => value instanceof Store;\n";
	const first = await s.load(source("yield <p>{Store.count}</p>;", 0));
	const read = () => s.render(<first.Counter name="a" />);
	read();
	s.h.add();
	s.h.add();
	expect(read()).toBe("<p>2</p>");
	// The setup of the old module and the view of the new one have one class.
	const second = await s.load(source("yield <b>{Store.count}</b>;", 0));
	s.h.add();
	expect(read()).toBe("<b>3</b>");
	expect(s.h.log).toEqual(["setup"]);
	expect(second.isStore(first.made)).toBe(true);
	expect(second.isStore(second.made)).toBe(true);
	// An edit to the class makes a new one, and starts what used the old one
	// again.
	await s.load(source("yield <b>{Store.count}</b>;", 10));
	expect(read()).toBe("<b>10</b>");
	expect(s.h.log).toEqual(["setup", "setup", "cleanup"]);
});

test("a class which uses a value which is made again is made again", async () => {
	const s = scenario();
	const source = (view: string) =>
		"const cache = new Map();\n" +
		"class Store { static count = 0; static cache = cache; }\n" +
		gen({setup: "h.add = () => { Store.count++; this.refresh(); };", view});
	const {Counter} = await s.load(source("yield <p>{Store.count}</p>;"));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.add();
	expect(read()).toBe("<p>1</p>");
	await s.load(source("yield <b>{Store.count}</b>;"));
	expect(read()).toBe("<b>0</b>");
	expect(s.h.log).toEqual(["setup", "setup", "cleanup"]);
});
