import {expect, test} from "bun:test";
import {transform} from "../../src/transform.ts";

// What the transform writes, apart from what it does when it runs.

const options = {id: "mod.tsx", runtime: "runtime", accept: true};
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
		"export default function () { return null; }",
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

test("a module without components is only compiled", () => {
	const code = transform(
		`export const LIMIT: number = 3;
export function helper(value: string) { return value; }
function* numbers() { for (;;) { yield 1; } }`,
		options,
	);
	expect(code).not.toContain("__hot");
	expect(code).not.toContain(": number");
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
	const view = JSON.parse(
		code.match(/"gen", "[^"]*", ("(?:[^"\\]|\\.)*")/)![1],
	);
	expect(view.replace(/\s+/g, " ").trim()).toBe(
		"if (item === 1) return __BREAK; " +
			"if (item === 2) return; " +
			"if (item === 3) return {value: (item)}; " +
			"if (item === 4) return {value: (undefined)}; " +
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
		"for (const props of this) { var count = 1; yield count; }",
		"for (const props of this) { yield arguments.length; }",
		"for (const props of this) yield 1;",
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
