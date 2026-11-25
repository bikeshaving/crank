import {expect, test} from "bun:test";
import {createElement} from "@b9g/crank";
import {gen, scenario} from "./harness.ts";

// What is known not to work. A failing test here states what should happen,
// and passes for as long as it does not.

test.failing(
	"a helper which the setup uses is edited in another module",
	async () => {
		const s = scenario();
		await s.load("export const step = () => 1;", "lib");
		const counter = (version: number) =>
			`import {step} from "./lib.${version}.js";\n` +
			gen({
				setup: "h.add = () => { n += step(); this.refresh(); };",
				view: "yield <p>{n}</p>;",
			});
		const {Counter} = await s.load(counter(1));
		const read = () => s.render(<Counter name="a" />);
		read();
		// The module of the helper changes, and what imports it is evaluated again.
		await s.load("export const step = () => 10;", "lib");
		await s.load(counter(2));
		s.h.add();
		// The handler which the setup made still calls the old helper.
		expect(read()).toBe("<p>10</p>");
	},
);

test.failing(
	"a component made by calling a function keeps its state",
	async () => {
		const s = scenario();
		const source = (tag: string) =>
			gen({view: "yield <i>{n}</i>;"}) +
			`const boxed = (Inner: any) => (props: any) => <${tag}><Inner {...props} /></${tag}>;\n` +
			"export const Boxed = boxed(Counter);\n";
		const first = await s.load(source("div"));
		const second = await s.load(source("div"));
		expect(second.Boxed).toBe(first.Boxed);
	},
);

test.failing(
	"a setup which throws leaves the old instance in place",
	async () => {
		const s = scenario();
		const {Counter} = await s.load(gen({view: "yield <p>{n}</p>;"}));
		const read = () => s.render(<Counter name="a" />);
		read();
		s.h.inc();
		const original = console.error;
		console.error = () => {};
		try {
			await s.load(
				gen({setup: "(undefined as any).missing;", view: "yield <p>{n}</p>;"}),
			);
		} finally {
			console.error = original;
		}

		expect(read()).toBe("<p>1</p>");
	},
);

test.todo("an async function component which rejects after an edit");
test.todo(
	"an edit while an async generator component is waiting on its own work",
);
test.todo("a component which is hydrated, and then edited");
test.todo("lines in errors and breakpoints after an edit");
test.todo("a module which stops exporting only components");
