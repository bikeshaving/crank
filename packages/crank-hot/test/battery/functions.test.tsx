import {expect, test} from "bun:test";
import {createElement} from "@b9g/crank";
import {gen, scenario} from "./harness.ts";

// Function components have nothing which outlives a render, so every edit to
// one is an edit to a view: what is under it carries on.

const leaf = gen({
	name: "Leaf",
	params: "{}: any",
	head: "{} of this",
	view: "yield <i>{n}</i>;",
});

for (const [title, declare] of [
	[
		"a function declaration",
		(body: string) => `export function Page() { return ${body}; }`,
	],
	[
		"an arrow function with an expression",
		(body: string) => `export const Page = () => ${body};`,
	],
	[
		"an arrow function with a block",
		(body: string) => `export const Page = () => { return ${body}; };`,
	],
	[
		"a function expression",
		(body: string) => `export const Page = function () { return ${body}; };`,
	],
] as const) {
	test(`an edit to ${title}`, async () => {
		const s = scenario();
		const {Page} = await s.load(leaf + declare("<div>one <Leaf /></div>"));
		const read = () => s.render(<Page />);
		read();
		s.h.inc();
		const next = await s.load(leaf + declare("<div>two <Leaf /></div>"));
		expect(next.Page).toBe(Page);
		expect(read()).toBe("<div>two <i>1</i></div>");
		expect(s.h.log).toEqual(["setup"]);
	});
}

test("an edit to an async function component", async () => {
	const s = scenario();
	const page = (text: string) =>
		`export async function Page() { await null; return <div>${text} <Leaf /></div>; }`;
	const {Page} = await s.load(leaf + page("one"));
	const read = () => s.render(<Page />);
	expect(await read()).toBe("<div>one <i>0</i></div>");
	s.h.inc();
	await s.load(leaf + page("two"));
	expect(await read()).toBe("<div>two <i>1</i></div>");
	expect(s.h.log).toEqual(["setup"]);
});

test("a function component which renders itself", async () => {
	const s = scenario();
	const tree = (mark: string) => `
export function Tree({depth}: any): any {
	return depth ? <ul><li>${mark}{depth}<Tree depth={depth - 1} /></li></ul> : null;
}`;
	const {Tree} = await s.load(tree(""));
	const read = () => s.render(<Tree depth={2} />);
	expect(read()).toBe("<ul><li>2<ul><li>1</li></ul></li></ul>");
	await s.load(tree("#"));
	expect(read()).toBe("<ul><li>#2<ul><li>#1</li></ul></li></ul>");
});

test("a function component which becomes a generator component, and back", async () => {
	const s = scenario();
	const {Counter} = await s.load(
		"export function Counter({name}: any) { return <p>{name}</p>; }",
	);
	const read = () => s.render(<Counter name="a" />);
	expect(read()).toBe("<p>a</p>");
	await s.load(gen({view: "yield <p>{name} {n}</p>;"}));
	expect(read()).toBe("<p>a 0</p>");
	s.h.inc();
	expect(read()).toBe("<p>a 1</p>");
	await s.load(
		"export function Counter({name}: any) { return <b>{name}</b>; }",
	);
	expect(read()).toBe("<b>a</b>");
	expect(s.h.log).toEqual(["setup", "cleanup"]);
});

test("props reach a component as they did before", async () => {
	const s = scenario();
	const {Probe, Plain} = await s.load(`
export function* Probe(this: Context, props: any) {
	for (props of this) {
		h.seen = props;
		yield null;
	}
}
export function Plain(props: any) {
	h.plain = props;
	return null;
}`);
	const children = <b>child</b>;
	const style = {color: "red"};
	s.render(
		<div>
			<Probe a={1} style={style}>
				{children}
			</Probe>
			<Plain a={1} style={style}>
				{children}
			</Plain>
		</div>,
	);
	for (const props of [s.h.seen, s.h.plain]) {
		expect(Object.keys(props).sort()).toEqual(["a", "children", "style"]);
		expect(props.style).toBe(style);
		expect(props.children).toBe(children);
	}
});
