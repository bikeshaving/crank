import {expect, test} from "bun:test";
import {createElement} from "@b9g/crank";
import {gen, scenario} from "./harness.ts";

// What Crank does with components, through the wrapper which the rest of
// the app sees.

test("keyed components keep their state when they move", async () => {
	const s = scenario();
	const item = (view: string) => `
export function* Item(this: Context, {id}: any) {
	let n = 0;
	h["inc" + id] = () => { n++; this.refresh(); };
	h.log.push("setup " + id);
	for ({id} of this) {
		${view}
	}
}`;
	const {Item} = await s.load(item("yield <i>{id}{n}</i>;"));
	const read = (order: Array<string>) =>
		s.render(
			<div>
				{order.map((id) => (
					<Item key={id} id={id} />
				))}
			</div>,
		);
	read(["a", "b", "c"]);
	s.h.inca();
	s.h.incc();
	s.h.incc();
	expect(read(["c", "a", "b"])).toBe("<div><i>c2</i><i>a1</i><i>b0</i></div>");
	await s.load(item("yield <b>{id}:{n}</b>;"));
	expect(read(["b", "c", "a"])).toBe(
		"<div><b>b:0</b><b>c:2</b><b>a:1</b></div>",
	);
	expect(s.h.log).toEqual(["setup a", "setup b", "setup c"]);
});

test("provisions pass through the wrapper", async () => {
	const s = scenario();
	const source = (view: string) => `
export function* Provider(this: Context, {children}: any) {
	this.provide("theme", "dark");
	for ({children} of this) {
		yield children;
	}
}
export function* Consumer(this: Context) {
	const theme = this.consume("theme");
	for ({} of this) {
		${view}
	}
}`;
	const {Provider, Consumer} = await s.load(source("yield <p>{theme}</p>;"));
	const read = () =>
		s.render(
			<Provider>
				<Consumer />
			</Provider>,
		);
	expect(read()).toBe("<p>dark</p>");
	await s.load(source("yield <b>{theme}</b>;"));
	expect(read()).toBe("<b>dark</b>");
});

test("events bubble through the wrapper", async () => {
	const s = scenario();
	const source = (view: string) => `
export function* Parent(this: Context, {children}: any) {
	this.addEventListener("ping", () => h.log.push("ping"));
	for ({children} of this) {
		yield children;
	}
}
export function* Child(this: Context) {
	h.ping = () => this.dispatchEvent(new Event("ping", {bubbles: true}));
	for ({} of this) {
		${view}
	}
}`;
	const {Parent, Child} = await s.load(source("yield <p>child</p>;"));
	s.render(
		<Parent>
			<Child />
		</Parent>,
	);
	s.h.ping();
	await s.load(source("yield <b>child</b>;"));
	s.h.ping();
	expect(s.h.log).toEqual(["ping", "ping"]);
});

test("children pass through the wrapper", async () => {
	const s = scenario();
	const source = (tag: string) => `
export function* Box(this: Context, {children}: any) {
	for ({children} of this) {
		yield <${tag}>{children}</${tag}>;
	}
}`;
	const {Box} = await s.load(source("div"));
	const {Counter} = await s.load(gen({view: "yield <i>{n}</i>;"}), "counter");
	const read = () =>
		s.render(
			<Box>
				<Counter name="a" />
			</Box>,
		);
	expect(read()).toBe("<div><i>0</i></div>");
	s.h.inc();
	await s.load(source("section"));
	// The element which the view renders changed, so what is in it is new.
	expect(read()).toBe("<section><i>0</i></section>");
});

test("a component which the parent has stopped re-rendering still gets the new view", async () => {
	const s = scenario();
	const {Counter} = await s.load(gen({view: "yield <p>{name} {n}</p>;"}));
	expect(s.render(<Counter copy name="a" />)).toBe("<p>a 0</p>");
	s.h.inc();
	expect(s.render(<Counter copy name="b" />)).toBe("<p>a 1</p>");
	await s.load(gen({view: "yield <b>{name} {n}</b>;"}));
	expect(s.render(<Counter copy name="c" />)).toBe("<b>a 1</b>");
});

test("the parent passes new props to a component with a new view", async () => {
	const s = scenario();
	const {Counter} = await s.load(gen({view: "yield <p>{name}</p>;"}));
	s.render(<Counter name="a" />);
	await s.load(gen({view: "yield <b>{name}</b>;"}));
	expect(s.render(<Counter name="b" />)).toBe("<b>b</b>");
	expect(s.render(<Counter name="c" />)).toBe("<b>c</b>");
});

test("a new view which throws, and the edit which fixes it", async () => {
	const s = scenario();
	const {Counter} = await s.load(gen({view: "yield <p>{n}</p>;"}));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.inc();
	const errors: Array<unknown> = [];
	const original = console.error;
	console.error = (...args: Array<unknown>) => errors.push(args[0]);
	try {
		await s.load(gen({view: "yield <p>{(undefined as any).missing}</p>;"}));
	} finally {
		console.error = original;
	}

	// The edit is reported, and the page is left as it was.
	expect(errors[0]).toBeInstanceOf(TypeError);
	expect(read()).toBe("<p>1</p>");
	// Until the next edit the component shows what it last rendered, though
	// its variables still change.
	s.h.inc();
	expect(read()).toBe("<p>1</p>");
	await s.load(gen({view: "yield <b>{n}</b>;"}));
	expect(read()).toBe("<b>2</b>");
	expect(s.h.log).toEqual(["setup"]);
});

test("a function component which throws, and the edit which fixes it", async () => {
	const s = scenario();
	const leaf = gen({
		name: "Leaf",
		params: "{}: any",
		head: "{} of this",
		view: "yield <i>{n}</i>;",
	});
	const page = (body: string) =>
		leaf + `export function Page() { return ${body}; }`;
	const {Page} = await s.load(page("<div>one <Leaf /></div>"));
	const read = () => s.render(<Page />);
	read();
	s.h.inc();
	const errors: Array<unknown> = [];
	const original = console.error;
	console.error = (...args: Array<unknown>) => errors.push(args[0]);
	try {
		await s.load(page("<div>{(undefined as any).missing}<Leaf /></div>"));
	} finally {
		console.error = original;
	}

	expect(errors[0]).toBeInstanceOf(TypeError);
	expect(read()).toBe("<div>one <i>1</i></div>");
	await s.load(page("<div>two <Leaf /></div>"));
	expect(read()).toBe("<div>two <i>1</i></div>");
	expect(s.h.log).toEqual(["setup"]);
});

test("an error which the view throws after it has rendered is thrown as usual", async () => {
	const s = scenario();
	const {Counter} = await s.load(gen({view: "yield <p>{n}</p>;"}));
	const read = () => s.render(<Counter name="a" />);
	read();
	await s.load(
		gen({view: 'if (h.fail) throw new Error("later"); yield <b>{n}</b>;'}),
	);
	expect(read()).toBe("<b>0</b>");
	s.h.fail = true;
	expect(read).toThrow("later");
});

test("an async function component which rejects, and the edit which fixes it", async () => {
	const s = scenario();
	const leaf = gen({
		name: "Leaf",
		params: "{}: any",
		head: "{} of this",
		view: "yield <i>{n}</i>;",
	});
	const page = (body: string) =>
		leaf + `export async function Page() { await null; return ${body}; }`;
	const {Page} = await s.load(page("<div>one <Leaf /></div>"));
	const read = () => s.render(<Page />);
	await read();
	s.h.inc();
	const errors: Array<unknown> = [];
	const original = console.error;
	console.error = (...args: Array<unknown>) => errors.push(args[0]);
	try {
		await s.load(page("<div>{(undefined as any).missing}<Leaf /></div>"));
		expect(await read()).toBe("<div>one <i>1</i></div>");
	} finally {
		console.error = original;
	}

	expect(errors[0]).toBeInstanceOf(TypeError);
	await s.load(page("<div>two <Leaf /></div>"));
	expect(await read()).toBe("<div>two <i>1</i></div>");
	expect(s.h.log).toEqual(["setup"]);
});

test("a page which does not allow strings to be evaluated", async () => {
	const s = scenario();
	const {Counter} = await s.load(gen({view: "yield <p>{n}</p>;"}));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.inc();
	const errors: Array<unknown> = [];
	const original = {
		error: console.error,
		Function: globalThis.Function,
		location: (globalThis as any).location,
	};
	let reloads = 0;
	console.error = (...args: Array<unknown>) => errors.push(args[0]);
	(globalThis as any).location = {reload: () => reloads++};
	(globalThis as any).Function = function () {
		throw new EvalError("Refused to evaluate a string as JavaScript");
	};
	try {
		await s.load(gen({view: "yield <b>{n}</b>;"}));
		// The page says why, asks to be loaded again, and is left as it was.
		expect(read()).toBe("<p>1</p>");
	} finally {
		console.error = original.error;
		globalThis.Function = original.Function;
		(globalThis as any).location = original.location;
	}

	expect(String(errors[0])).toContain("unsafe-eval");
	expect(reloads).toBe(1);
});

test("an error in an edited view is on the line it has in the module", async () => {
	const s = scenario();
	const view = (mark: string) => `const padding = 1;
		h.stack = new Error("${mark}").stack; // MARK
		yield <p>{n}</p>;`;
	const {Counter} = await s.load(gen({view: view("first")}));
	const read = () => s.render(<Counter name="a" />);
	read();
	await s.load(gen({view: view("second")}));
	read();
	expect(s.h.stack).toContain("second");
	// The view is evaluated so that it starts where it starts in the module,
	// which is what lets the source map of the module be used for it.
	const line =
		s.code
			.split("\n")
			.findIndex((text) => text.includes('new Error("second")')) + 1;
	const frame = s.h.stack
		.split("\n")
		.find((text: string) => text.includes("?hot="))!;
	expect(frame).toContain(`:${line}:`);
});

test("a setup which throws, and the edit which fixes it", async () => {
	const s = scenario();
	const {Counter} = await s.load(gen({view: "yield <p>{n}</p>;"}));
	const read = () => s.render(<Counter name="a" />);
	read();
	s.h.inc();
	// The setup which throws replaces this handle before it does.
	const inc = s.h.inc;
	const errors: Array<unknown> = [];
	const original = console.error;
	console.error = (...args: Array<unknown>) => errors.push(args[0]);
	try {
		await s.load(
			gen({setup: "(undefined as any).missing;", view: "yield <b>{n}</b>;"}),
		);
	} finally {
		console.error = original;
	}

	// The version before it is still the component, and still works.
	expect(errors[0]).toBeInstanceOf(TypeError);
	expect(read()).toBe("<p>1</p>");
	inc();
	expect(read()).toBe("<p>2</p>");
	await s.load(
		gen({setup: "const fixed = 1;", view: "yield <b>{n + fixed}</b>;"}),
	);
	expect(read()).toBe("<b>1</b>");
});
