import {expect, test} from "bun:test";
import {transform} from "../../src/transform.ts";

// What the transform writes, apart from what it does when it runs.

// These are about what is written when the runtime evaluates text.
const options = {
	id: "mod.tsx",
	runtime: "runtime",
	accept: true,
};
const ACCEPT = "import.meta.hot.accept()";

test("a module which only exports components accepts its own replacement", () => {
	const code = transform(
		`export function Page() { return null; }
export const Card = () => null;
function helper() {}
export default function Root() { return null; }`,
		options,
	);
	expect(code).toContain(ACCEPT);
});

test("a module which exports anything else does not", () => {
	for (const extra of [
		"export const LIMIT = 3;",
		"export function helper() {}",
		"const LIMIT = 3; export {LIMIT};",
		"export default 3;",
		'export * from "./other";',
		'export {thing} from "./other";',
		"export const Fancy = wrap(Page);",
	]) {
		const code = transform(
			`export function Page() { return null; }\n${extra}`,
			options,
		);
		expect(code).toContain("__hot.register");
		expect(code).not.toContain(ACCEPT);
	}
});

test("a module without components is left as it was written", () => {
	const source = `export const LIMIT: number = 3;
export function helper(value: string) { return value; }
function* numbers() { for (;;) { yield 1; } }`;
	expect(transform(source, options)).toBe(source);
});

test("what is registered", () => {
	const code = transform(
		`export function Page() { return null; }
export const Card = () => null;
export const Row = function* () { for (;;) { yield null; } };
export function lower() { return null; }
export const Fancy = wrap(Page);
export class Model {}
function outer() { function Inner() { return null; } return Inner; }`,
		options,
	);
	const registered = [
		...code.matchAll(/register\("mod\.tsx#(\w+)", "(\w+)"/g),
	].map((match) => `${match[1]}:${match[2]}`);
	expect(registered.sort()).toEqual(["Card:fn", "Page:fn", "Row:gen"]);
});

test("the variables which a view can reach", () => {
	const code = transform(
		`export function* Table(this: any, {rows, ...rest}: any, ctx: any) {
	let page = 0;
	const size = 10;
	var legacy = 1;
	function next() {}
	class Cursor {}
	try {
		let inner = 1;
		for (const {filter} of this) {
			let scratch = 1;
			yield null;
		}
	} finally {}
	let after = 1;
}`,
		options,
	);
	const accessors = code.slice(
		code.indexOf("__hot.view("),
		code.indexOf("if (__view)"),
	);
	const names = (kind: string) =>
		[...accessors.matchAll(new RegExp(`${kind} (\\w+)\\(`, "g"))]
			.map((m) => m[1])
			.sort();
	expect(names("get")).toEqual([
		"Cursor",
		"after",
		"ctx",
		"filter",
		"inner",
		"legacy",
		"next",
		"page",
		"rest",
		"rows",
		"size",
	]);
	// A const cannot be assigned to, and a variable of the view is not listed.
	expect(names("set")).toEqual([
		"Cursor",
		"after",
		"ctx",
		"inner",
		"legacy",
		"next",
		"page",
		"rest",
		"rows",
	]);
});

test("statements which leave the loop become return statements", () => {
	const code = transform(
		`export function* List(this: any) {
	outer: for (const item of this) {
		if (item === 1) break;
		if (item === 2) continue outer;
		if (item === 3) return item;
		if (item === 4) return;
		for (const inner of item) { if (inner) break; else continue; }
		inner: while (item) { break inner; }
		switch (item) { case 5: break; }
		const pick = () => { return item; };
		function later() { return item; }
		yield item;
	}
}`,
		options,
	);
	const view = code.match(
		/function\* __hotView\([^)]*\) \{(.*?)\n\t\}\n\}/s,
	)![1];
	expect(
		view
			.replace(/__locals\./g, "")
			.replace(/\s+/g, " ")
			.trim(),
	).toBe(
		"if (item === 1) return __hot.BREAK; " +
			"if (item === 2) return; " +
			"if (item === 3) return {value: (item)}; " +
			"if (item === 4) return {value: undefined}; " +
			"for (const inner of item) { if (inner) break; else continue; } " +
			"inner: while (item) { break inner; } " +
			"switch (item) { case 5: break; } " +
			"const pick = () => { return item; }; " +
			"function later() { return item; } " +
			"yield item;",
	);
});

test("loops which are not separated", () => {
	for (const body of [
		"outer: { for (const props of this) { if (props) break outer; yield 1; } }",
		"if (true) { for (const props of this) { yield 1; } }",
	]) {
		const code = transform(
			`export function* Legacy(this: any) { ${body} }`,
			options,
		);
		expect(code).toContain("__hot.register");
		expect(code).not.toContain("__hot.view");
	}
});

test("the signature covers everything but the body of the loop", () => {
	const signature = (setup: string, view: string, after = "") =>
		transform(
			`export function* Counter(this: any) { ${setup} for ({} of this) { ${view} } ${after} }`,
			options,
		).match(/"gen", "([^"]*)"/)![1];
	const base = signature("let n = 0;", "yield n;");
	expect(signature("let n = 0;", "yield n + 1;")).toBe(base);
	expect(signature("let n = 0; /* note */", "yield n;")).toBe(base);
	expect(signature("let  n  =  0;", "yield n;")).toBe(base);
	expect(signature("let n = 1;", "yield n;")).not.toBe(base);
	expect(signature("let n = 0;", "yield n;", "n++;")).not.toBe(base);
});

test("a var and the arguments of the component in a loop", () => {
	const code = transform(
		`export function* Legacy(this: any, props: any) {
	for ({} of this) {
		var count = (count || 0) + 1, other = 2;
		var unset;
		for (var i = 0; i < 2; i++) {}
		for (var key in props) {}
		var {a, b} = props;
		const inner = function () { var own = arguments; return own; };
		yield [count, arguments.length, () => arguments[0]];
	}
}`,
		options,
	);
	const view = code.match(
		/function\* __hotView\([^)]*\) \{(.*?)\n\t\}\n\}/s,
	)![1];
	expect(view.replace(/\s+/g, " ").trim()).toBe(
		"(__locals.count = (__locals.count || 0) + 1, __locals.other = 2); ; " +
			"for (__locals.i = 0; __locals.i < 2; __locals.i++) {} " +
			"for (__locals.key in __locals.props) {} " +
			"({a: __locals.a, b: __locals.b} = __locals.props); " +
			"const inner = function () { var own = arguments; return own; }; " +
			"yield [__locals.count, __locals.__arguments.length, () => __locals.__arguments[0]];",
	);
	expect(code).toContain("__arguments: arguments,");
});

test("what the code outside a loop uses is passed to the runtime", () => {
	const code = transform(
		`import {imported, unused} from "./lib";
const constant = 1;
const viewOnly = 2;
function helper() { return deep(); }
function deep() { return constant; }
export function Other() { return null; }
export function* Counter(this: any) {
	const local = imported + helper();
	const tag = Other;
	for ({} of this) {
		yield viewOnly;
	}
}`,
		options,
	);
	// The helper is compared as text, and what it uses in turn as values.
	expect(code).toMatch(
		/register\("mod\.tsx#Counter", "gen", "[^"]*", "extract", \(\) => \[constant, imported\], Counter\)/,
	);
});

test("the lines of the module are the lines of the source", () => {
	const source = `import {createElement} from "@b9g/crank";

export function* Counter(this: any) {
	let n = 0;
	for ({} of this) {
		yield n; // MARK
	}
}

export const Boxed = wrap(Counter);
`;
	const hot = transform(source, options);
	const lineOf = (code: string) =>
		code.split("\n").findIndex((line) => line.includes("// MARK"));
	expect(lineOf(hot)).toBe(lineOf(source));
	expect(hot).toContain("__hot.value(");
});

test("a default export without a name is registered", () => {
	for (const source of [
		"export default function () { return null; }",
		"export default function* (this: any) { for ({} of this) { yield null; } }",
		"export default async function () { return null; }",
		"export default () => null;",
		"export default function* (this: any) { for ({} of this) yield null; }",
	]) {
		const code = transform(source, options);
		expect(code).toMatch(
			/export default\s+__hot\.register\("mod\.tsx#default"/,
		);
		expect(code).toContain(ACCEPT);
	}
});

test("what the setup uses which is not a binding of the module", () => {
	const code = transform(
		`const config = {};
export function* Counter(this: any, {name}: any) {
	const client = window.app.client;
	const started = Date.now();
	const onclick = (ev: Event) => fetchThing(ev.target, config);
	const lazy = import("./lazy");
	try {
		const config = "local";
		for ({name} of this) {
			yield <button onclick={onclick}>{viewOnly}</button>;
		}
	} finally {}
}`,
		options,
	);
	const inputs = code.match(/\(\) => \[(.*?)\], Counter\)/s)![1];
	const names = inputs.split(", ").sort();
	expect(names).toEqual(
		[
			"Symbol()",
			"config",
			'typeof Date === "undefined" ? undefined : Date',
			'typeof ev === "undefined" ? undefined : ev',
			'typeof fetchThing === "undefined" ? undefined : fetchThing',
			"window?.app?.client",
		].sort(),
	);
});

test("an import in a view is left where its module can find it", () => {
	const code = transform(
		`export function* Lazy(this: any) {
	for ({} of this) {
		const mod = import("./chart");
		yield import(this.name);
	}
}`,
		options,
	);
	expect(code).toContain('const mod = import("./chart");');
	expect(code).toContain("yield import(this.name);");
});

test("every line of a component stays where it was", () => {
	const source = `import {createElement} from "@b9g/crank";

export function* Counter(this: any, {name}: any) {
	let n = 0; // SETUP
	for ({name} of this) {
		const label = name + n; // VIEW
		yield label;
	}

	console.log("left"); // AFTER
	return null; // LAST
}
`;
	const code = transform(source, options);
	const lines = code.split("\n");
	const sourceLines = source.split("\n");
	for (const mark of ["// SETUP", "// VIEW", "// AFTER", "// LAST"]) {
		const line = sourceLines.findIndex((text) => text.includes(mark));
		expect(lines[line]).toContain(mark);
	}

	expect(code).toContain("function* __hotView(this: any, __locals: any) {");
	expect(code).toContain("const label = __locals.name + __locals.n;");
	expect(code).not.toContain("__hot.setView");
});

test("a loop in a try statement keeps the lines of its catch and finally", () => {
	const source = `export function* Counter(this: any) {
	try {
		for ({} of this) {
			yield 1; // VIEW
		}
	} catch (err) {
		report(err); // CATCH
	} finally {
		stop() // FINALLY
		done();
	}
}

export const after = 1; // NEXT
`;
	const code = transform(source, options);
	const lines = code.split("\n");
	const sourceLines = source.split("\n");
	for (const mark of ["// VIEW", "// CATCH", "// FINALLY", "// NEXT"]) {
		const line = sourceLines.findIndex((text) => text.includes(mark));
		expect(lines[line]).toContain(mark);
	}

	// The statement is ended after the loop and started again after the view.
	expect(code).toContain("try { if (__hotThrew) throw __hotError;");
	expect(code).not.toContain("__hot.setView");
});

test("what comes after a loop in a try statement stays where it was", () => {
	const source = `export function* Counter(this: any) {
	try {
		for ({} of this) {
			yield 1; // VIEW
		}

		flush() // AFTER
	} finally {
		done(); // FINALLY
	}
}
`;
	const code = transform(source, options);
	const lines = code.split("\n");
	const sourceLines = source.split("\n");
	for (const mark of ["// VIEW", "// AFTER", "// FINALLY"]) {
		const line = sourceLines.findIndex((text) => text.includes(mark));
		expect(lines[line]).toContain(mark);
	}

	expect(code).not.toContain("__hot.setView");
});

test("what comes after a loop in any other block is on one line", () => {
	const source = `export function* Counter(this: any) {
	try {
		const opened = open();
		for ({} of this) {
			yield 1; // VIEW
		}

		opened.flush() // no semicolon
	} finally {
		done();
	}
}

export const after = 1; // NEXT
`;
	const code = transform(source, options);
	const lines = code.split("\n");
	const sourceLines = source.split("\n");
	for (const mark of ["// VIEW", "// NEXT"]) {
		const line = sourceLines.findIndex((text) => text.includes(mark));
		expect(lines[line]).toContain(mark);
	}

	// What the block declared before the loop is used after it, so the
	// statement cannot be written in two parts. The statements are separated
	// as the ends of their lines separated them.
	expect(code).toContain(
		"} opened.flush(); } finally { done(); } }; __hot.setView(",
	);
});
