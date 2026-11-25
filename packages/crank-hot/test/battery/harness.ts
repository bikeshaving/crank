import {renderer} from "@b9g/crank/html";
import type {Children} from "@b9g/crank";
import {mkdirSync, rmSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import * as runtime from "../../src/runtime.js";
import {transform} from "../../src/transform.ts";

const RUNTIME = join(import.meta.dir, "../../src/runtime.js");
const work = join(import.meta.dir, "../../.work/battery");
// How the modules which the tests write are compiled.
const TSCONFIG = JSON.stringify({
	compilerOptions: {
		jsx: "react",
		jsxFactory: "createElement",
		jsxFragmentFactory: "Fragment",
	},
});
const run = Math.random().toString(36).slice(2, 8);
let count = 0;

export interface Scenario {
	/** What the modules of the scenario see as `h`. */
	h: any;
	/**
	 * Evaluates a new version of a module, the way a development server does
	 * when the file changes, and re-renders what needs it.
	 */
	load(body: string, name?: string): Promise<any>;
	/** Renders into the root of the scenario and returns the HTML. */
	render(children: Children, root?: object): any;
	/** The transformed source of the last version which was loaded. */
	code: string;
}

/**
 * Every test gets modules, handles and a root of its own.
 */
export function scenario(): Scenario {
	const id = `${run}-${++count}`;
	const dir = join(work, id);
	rmSync(dir, {recursive: true, force: true});
	mkdirSync(dir, {recursive: true});
	writeFileSync(join(work, "tsconfig.json"), TSCONFIG);
	const handles: any = {log: []};
	((globalThis as any).handles ||= {})[id] = handles;
	const versions: Record<string, number> = {};
	const root = {};
	const result: Scenario = {
		h: handles,
		code: "",
		async load(body, name = "app") {
			const source =
				`import {createElement, Fragment} from "@b9g/crank";\n` +
				`import type {Context} from "@b9g/crank";\n` +
				`const h: any = (globalThis as any).handles[${JSON.stringify(id)}];\n` +
				body;
			result.code = transform(source, {
				id: `${id}/${name}.tsx`,
				runtime: RUNTIME,
			});
			versions[name] = (versions[name] || 0) + 1;
			// The module is still in the language it was written in.
			const file = join(dir, `${name}.${versions[name]}.tsx`);
			writeFileSync(file, result.code);
			const mod = await import(file);
			runtime.flush();
			return mod;
		},
		render(children, target = root) {
			return renderer.render(children, target);
		},
	};

	return result;
}

/**
 * The source of a generator component with a counter in its setup.
 */
export function gen({
	name = "Counter",
	params = "{name}: any",
	setup = "",
	head = "{name} of this",
	view,
	after = "",
}: {
	name?: string;
	params?: string;
	setup?: string;
	head?: string;
	view: string;
	after?: string;
}): string {
	return `
export function* ${name}(this: Context, ${params}) {
	let n = 0;
	h.inc = () => {
		n++;
		this.refresh();
	};
	h.log.push("setup");
	this.cleanup(() => h.log.push("cleanup"));
	${setup}
	for (${head}) {
		${view}
	}
	${after}
}
`;
}
