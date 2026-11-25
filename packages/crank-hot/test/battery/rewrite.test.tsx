import {expect, test} from "bun:test";
import {createElement} from "@b9g/crank";
import {scenario} from "./harness.ts";

// Without evaluating text, the transform has to work out which names in the
// body of a loop are variables of the component. With it, the engine does.
// So each of these views is run both ways, and has to do the same thing.

const component = (view: string) => `
const outer = "module";
function tag(strings: TemplateStringsArray, ...values: Array<unknown>) {
	return strings.raw.join("|") + values.join(",");
}

export function* Probe(this: Context, {name}: any, ctx: Context) {
	let n = 1;
	let list = [1, 2, 3];
	const point = {x: 1, y: 2};
	const outer = "setup";
	function double(value: number) { return value * 2; }
	const self = function (this: any) { return this === undefined; };
	class Box { constructor(public value: number) {} }
	const Row = ({value}: any) => <i>{value}</i>;
	h.get = () => ({n, list, point});
	for ({name} of this) {
		${view}
	}
}`;

const views: Record<string, string> = {
	"reads and assigns": `n += 1; n++; --n; list = [...list, n]; yield <p>{n} {list.join()}</p>;`,
	"a block declares the name again": `{ const n = "inner"; h.inner = n; } yield <p>{n}</p>;`,
	"a let after its use in the same block": `const before = () => n; const n = "shadow"; yield <p>{before()}</p>;`,
	"a parameter": `const f = (n: number, list = [n]) => n + list.length; yield <p>{f(10)} {n}</p>;`,
	"a function declaration and its var": `function f() { var n = 5; return n; } var kept = f(); yield <p>{kept} {n}</p>;`,
	"a named function expression": `const f = function double(depth: number): number { return depth ? double(depth - 1) : 7; }; yield <p>{f(2)} {double(2)}</p>;`,
	"a catch clause": `let out = ""; try { throw new Error("x"); } catch (n) { out = String(n instanceof Error); } yield <p>{out} {n}</p>;`,
	"the head of a loop": `let sum = 0; for (const n of list) { sum += n; } for (let n = 0; n < 2; n++) { sum += n; } for (const name in point) { sum += name.length; } yield <p>{sum} {n} {name}</p>;`,
	"a class": `const made = new Box(3); class Local { n = n; static make() { return new Local().n; } } yield <p>{made.value} {Local.make()}</p>;`,
	"a property with the name": `const o = {n: 5, list: {n: 6}}; yield <p>{o.n} {o.list.n} {point.x}</p>;`,
	"a short property": `const o = {n, point, name}; yield <p>{o.n} {o.point.y} {o.name}</p>;`,
	"a destructuring declaration": `const {x, y: n} = point; const [list] = [9]; yield <p>{x} {n} {list}</p>;`,
	"a destructuring assignment": `[n, list] = [list.length, [n]]; ({x: n} = point); yield <p>{n} {list.join()}</p>;`,
	"a short destructuring assignment with a default": `({n = 4, list = []} = {} as any); yield <p>{n} {list.length}</p>;`,
	"a function called without an object": `yield <p>{String(self())} {double(4)}</p>;`,
	"a tagged template": `const t = tag; yield <p>{t\`a\${n}b\`} {tag\`c\${name}\`}</p>;`,
	"a component in JSX": `yield <p><Row value={n} /><Row value={name} /></p>;`,
	"a label and a property": `n: for (const x of list) { if (x > 1) break n; } yield <p>{n}</p>;`,
	"typeof and a computed key": `const key = "x"; const o = {[name]: n, [key]: typeof n}; yield <p>{o.a} {o.x} {typeof missing}</p>;`,
	"a closure which assigns later": `h.later = () => { n = 100; list = []; }; yield <p>{n} {list.length}</p>;`,
	"a method and a getter": `const o = {n() { return n; }, get list() { return list.length; }, set point(value: number) { n = value; }}; o.point = 8; yield <p>{o.n()} {o.list}</p>;`,
	"an arrow function with a default": `const f = (a = n, {b = name} = {}) => a + b; yield <p>{f()}</p>;`,
	"a var in the loop": `var count = (count || 0) + n; var {x: px, y: py} = point; var [first] = list; for (var i = 0; i < 2; i++) {} yield <p>{count} {px} {py} {first} {i}</p>;`,
	"the arguments and the context": `yield <p>{arguments.length} {String(arguments[1] === ctx)} {String((() => arguments[0] === this.props)())}</p>;`,
	"the name of the module binding which the setup also has": `yield <p>{outer}</p>;`,
	"a generic arrow and a cast": `const id = <T,>(value: T): T => value; yield <p>{id<number>(n as number)} {(name satisfies string)}</p>;`,
	"an await-free generator inside": `function* each() { for (const n of list) yield n * 2; } yield <p>{[...each()].join()} {n}</p>;`,
	"an optional call and chain": `const o: any = {f: undefined}; yield <p>{String(o.f?.())} {double?.(n)} {point?.x}</p>;`,
};

for (const [title, view] of Object.entries(views)) {
	test(title, async () => {
		const results: Array<unknown> = [];
		for (const rewrite of [false, true]) {
			const s = scenario(rewrite);
			// The view is an edit, so that it is not the code as it was written.
			const {Probe} = await s.load(component("yield <p>first</p>;"));
			const read = () => s.render(<Probe name="a" />);
			read();
			await s.load(component(view));
			const first = read();
			if (s.h.later) {
				s.h.later();
			}

			results.push([first, read(), s.h.get(), s.h.inner]);
		}

		expect(results[1]).toEqual(results[0]);
		expect(String((results[0] as any)[0])).toMatch(/^<p>/);
	});
}
