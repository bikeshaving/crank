import {expect, test} from "bun:test";
import {createElement} from "@b9g/crank";
import {scenario} from "./harness.ts";

// The transform has to work out which names in the body of a loop are
// variables of the component. These views are hard to get right.
//
// What each one should do was recorded from another way of running a view,
// which has since been taken out: the body was evaluated from text inside
// `with` blocks, so that the engine said what each name referred to. The
// engine is right by definition, so the snapshots are the right answers, and
// are not to be written again from what this does.

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
	const Wrap = ({children}: any) => <u>{children}</u>;
	const kit = {Row};
	const Math = {max: () => "mine"};
	let $ = 1;
	let _ = 2;
	h.get = () => ({n, list, point, $, _});
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
	"a var in a function inside": `const f = () => { var n = 9; return n; }; yield <p>{f()} {n}</p>;`,
	"a function declared in a block": `{ function n() { return 5; } h.inner = n(); } yield <p>{n}</p>;`,
	"a class with a field and a method of the name": `class K { n = 3; list() { return this.n + n; } static n = n; } yield <p>{new K().list()} {K.n}</p>;`,
	"a pattern with a key of the name": `const {n: renamed, point: {x}} = {n: 5, point: {x: 6}}; yield <p>{renamed} {x} {n} {point.x}</p>;`,
	"a block which declares the name, and what comes after it": `let out = ""; { let n = 1; out += n; } out += n; yield <p>{out}</p>;`,
	"a loop which assigns to a variable of the component": `for (n of [5, 6]) {} for ([n] of [[7]]) {} yield <p>{n}</p>;`,
	"a function which is called at once": `yield <p>{(function (n: number) { return n + arguments.length; })(40)} {(() => n)()}</p>;`,
	"an assignment which depends on the value": `n ||= 9; n &&= n + 1; let m: any = null; m ??= n; list &&= [...list, m]; yield <p>{n} {m} {list.length}</p>;`,
	"a template with the names in it":
		"yield <p>{`${n}-${name}-${`${point.x}`}`}</p>;",
	"a component of the setup with children": `yield <p><Wrap><Row value={n} /><Row value={name} /></Wrap></p>;`,
	"a member of a variable as an element": `const ui = {Row}; yield <p><ui.Row value={n} /><kit.Row value={name} /></p>;`,
	"a method of a variable": `list.push(n); yield <p>{list.join()} {list.map((n) => n * 2).join()}</p>;`,
	"a regular expression, a string and a property with the name": `const re = /n+/g; yield <p>{"nnn".replace(re, name)} {({n: "prop"}).n} {"n".length}</p>;`,
	"a spread and a rest": `const {x, ...rest} = {...point, n}; const [first, ...others] = list; yield <p>{x} {Object.keys(rest).join()} {first} {others.length}</p>;`,
	"a generator in the view which is delegated to": `function* inner() { return n * 2; } const twice: number = yield* inner(); yield <p>{twice}</p>;`,
	"a variable with the name of a global": `yield <p>{Math.max(1, 2)} {typeof Math}</p>;`,
	"variables named with a dollar sign and an underscore": `$++; _ += $; yield <p>{$} {_}</p>;`,
	"a property which is assigned through a variable": `point.x++; point["y"] += n; yield <p>{point.x} {point.y}</p>;`,
	"a comma, a conditional and void": `const v = (n++, n > 1 ? list : [name]); yield <p>{v.length} {n} {String(void n)} {String(n ?? "none")}</p>;`,
	"a function with the name of a variable as a parameter, called with the variable": `const f = (list: Array<number>, n: number) => list.length + n; yield <p>{f(list, n)}</p>;`,
	"an optional call and chain": `const o: any = {f: undefined}; yield <p>{String(o.f?.())} {double?.(n)} {point?.x}</p>;`,
};

for (const [title, view] of Object.entries(views)) {
	test(title, async () => {
		const results: Array<unknown> = [];
		{
			const s = scenario();
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

		expect(results[0]).toMatchSnapshot();
		expect(String((results[0] as any)[0])).toMatch(/^<p>/);
	});
}

// A try statement around the loop is ended after the loop and started again
// after the view. The other way left the statement as it was written, so
// what it did with what was thrown and returned is the right answer.

const guarded: Record<string, string> = {
	"a finally clause": `
export function* Guard(this: Context) {
	let n = 0;
	h.inc = () => { n++; this.refresh(); };
	try {
		for ({} of this) {
			VIEW
		}
	} finally {
		h.log.push("finally " + n);
	}
}`,
	"a catch clause": `
export function* Guard(this: Context) {
	let n = 0;
	h.inc = () => { n++; this.refresh(); };
	try {
		for ({} of this) {
			VIEW
		}
	} catch (err: any) {
		h.log.push("caught " + err.message);
		return <b>caught {n}</b>;
	}
}`,
	"a catch and a finally clause, and what comes after": `
export function* Guard(this: Context) {
	let n = 0;
	h.inc = () => { n++; this.refresh(); };
	try {
		const inside = "in";
		for ({} of this) {
			h.log.push(inside);
			VIEW
		}
	} catch (err: any) {
		h.log.push("caught " + err.message);
	} finally {
		h.log.push("finally " + n);
	}

	h.log.push("after");
	return <i>after {n}</i>;
}`,
};

guarded["a return before the loop, with a finally clause"] = `
export function* Guard(this: Context) {
	let n = 0;
	h.inc = () => { n++; this.refresh(); };
	try {
		if (h.early) return <u>early {n}</u>;
		for ({} of this) {
			VIEW
		}
	} finally {
		h.log.push("finally " + n);
	}
}`;

guarded["a return before the loop, with a catch clause"] = `
export function* Guard(this: Context) {
	let n = 0;
	h.inc = () => { n++; this.refresh(); };
	try {
		if (h.early) { return <u>early {n}</u> }
		for ({} of this) {
			VIEW
		}
	} catch (err: any) {
		h.log.push("caught " + err.message);
		return <b>caught {n}</b>;
	}
}`;

guarded["what comes after the loop in the try statement"] = `
export function* Guard(this: Context) {
	let n = 0;
	h.inc = () => { n++; this.refresh(); };
	try {
		h.log.push("before");
		for ({} of this) {
			VIEW
		}

		const left = "left " + n;
		h.log.push(left);
		if (h.mode === "break") return <i>{left}</i>;
	} catch (err: any) {
		h.log.push("caught " + err.message);
	} finally {
		h.log.push("finally " + n);
	}
}`;

const steps: Record<string, string> = {
	renders: "yield <p>{n}</p>;",
	throws:
		'if (h.mode === "throw") throw new Error("thrown " + n); yield <p>{n}</p>;',
	returns:
		'if (h.mode === "return") return <b>returned {n}</b>; yield <p>{n}</p>;',
	breaks: 'if (h.mode === "break") break; yield <p>{n}</p>;',
};

for (const [shape, source] of Object.entries(guarded)) {
	for (const [step, view] of Object.entries(steps)) {
		test(`${shape}: the view ${step}`, async () => {
			const results: Array<unknown> = [];
			{
				const s = scenario();
				const outputs: Array<unknown> = [];
				const read = (Guard: any) => {
					try {
						outputs.push(s.render(<Guard />));
					} catch (err: any) {
						outputs.push("threw " + err.message);
					}
				};

				const {Guard} = await s.load(
					source.replace("VIEW", "yield <p>first {n}</p>;"),
				);
				read(Guard);
				s.h.inc();
				// The view is an edit.
				await s.load(source.replace("VIEW", view));
				read(Guard);
				s.h.mode = step.replace(/s$/, "");
				read(Guard);
				read(Guard);
				// A component which has finished starts again when it is rendered.
				s.h.early = true;
				read(Guard);
				s.render(null);
				results.push([outputs, s.h.log]);
			}

			expect(results[0]).toMatchSnapshot();
		});
	}
}

// Components, where the views above were all for one.

interface Case {
	source: string;
	first: string;
	second: string;
	act(s: any, read: (props?: any) => any, outputs: Array<unknown>): unknown;
}

const cases: Record<string, Case> = {
	"an error from what the view renders, which the view catches": {
		source: `
export function Bomb({armed}: any) {
	if (armed) {
		throw new Error("boom");
	}

	return <i>safe</i>;
}

export function* Guard(this: Context) {
	let n = 0;
	h.inc = () => { n++; this.refresh(); };
	for ({} of this) {
		VIEW
	}
}`,
		first: "yield <p>first {n}</p>;",
		second: `try {
			yield <p><Bomb armed={h.armed} /> {n}</p>;
		} catch (err: any) {
			h.log.push("caught " + err.message + " " + n);
			yield <b>recovered {n}</b>;
		}`,
		act(s, read) {
			read();
			s.h.inc();
			s.h.armed = true;
			read();
			s.h.armed = false;
			read();
			read();
		},
	},
	"a handler which keeps what the loop declared for one render": {
		source: `
export function* Guard(this: Context, props: any) {
	let n = 0;
	h.handlers = [];
	h.inc = () => { n++; this.refresh(); };
	for (const {label} of this) {
		VIEW
	}
}`,
		first: "h.handlers.push(() => label + n); yield <p>{label}</p>;",
		second:
			"const mine = label.toUpperCase(); h.handlers.push(() => mine + label + n); yield <b>{label}</b>;",
		act(s, read, outputs) {
			read({label: "b"});
			s.h.inc();
			read({label: "c"});
			outputs.push(s.h.handlers.map((handler: any) => handler()));
		},
	},
	"a loop which assigns its props with defaults": {
		source: `
export function* Guard(this: Context, props: any) {
	let id: any, first: any, rest: any;
	for ({user: {id = "anon"} = {}, tags: [first = "none", ...rest] = []} of this) {
		VIEW
	}
}`,
		first: "yield <p>{id}</p>;",
		second: "yield <b>{id} {first} {rest.length}</b>;",
		act(_s, read) {
			read({});
			read({user: {id: "u1"}, tags: ["a", "b", "c"]});
			read({user: {}, tags: []});
		},
	},
	"what a view schedules": {
		source: `
export function* Guard(this: Context) {
	let n = 0;
	h.inc = () => { n++; this.refresh(); };
	for ({} of this) {
		VIEW
	}
}`,
		first: "yield <p>{n}</p>;",
		second: `this.schedule(() => h.log.push("schedule " + n));
		this.after(() => h.log.push("after " + n));
		this.cleanup(() => h.log.push("cleanup " + n));
		yield <b>{n}</b>;`,
		act(s, read) {
			read();
			s.h.inc();
			read();
			s.render(null);
		},
	},
	"an async generator component with a try statement": {
		source: `
export async function* Guard(this: Context) {
	let n = 0;
	h.inc = () => { n++; return this.refresh(); };
	try {
		for await ({} of this) {
			VIEW
		}
	} catch (err: any) {
		h.log.push("caught " + err.message);
		return <i>caught {n}</i>;
	} finally {
		h.log.push("finally " + n);
	}
}`,
		first: "yield <p>first {n}</p>;",
		second: `await null;
		if (h.armed) {
			throw new Error("thrown " + n);
		}

		const value = await Promise.resolve(n * 2);
		yield <b>{value}</b>;`,
		async act(s, read, outputs) {
			await outputs[outputs.length - 1];
			await read();
			await s.h.inc();
			await read();
			s.h.armed = true;
			await read();
			await read();
			s.render(null);
		},
	},
};

for (const [title, {source, first, second, act}] of Object.entries(cases)) {
	test(title, async () => {
		const results: Array<unknown> = [];
		{
			const s = scenario();
			const outputs: Array<unknown> = [];
			let Guard: any;
			const read = (props: any = {label: "a"}) => {
				let output: any;
				try {
					output = s.render(<Guard {...props} />);
				} catch (err: any) {
					output = "threw " + err.message;
				}

				outputs.push(output);
				return output;
			};

			({Guard} = await s.load(source.replace("VIEW", first)));
			read();
			// The view is an edit.
			await s.load(source.replace("VIEW", second));
			await act(s, read, outputs);
			results.push([await Promise.all(outputs), s.h.log]);
		}

		expect(results[0]).toMatchSnapshot();
		// The component did something to compare.
		expect(JSON.stringify(results[0]).length).toBeGreaterThan(20);
	});
}

test("a view which asks about its module", async () => {
	const s = scenario();
	const source = (view: string) => `
export function* Meta(this: Context) {
	for ({} of this) {
		${view}
	}
}`;
	const {Meta} = await s.load(source("yield <p>first</p>;"));
	s.render(<Meta />);
	await s.load(source("yield <p>{typeof import.meta.url}</p>;"));
	expect(s.render(<Meta />)).toBe("<p>string</p>");
});
