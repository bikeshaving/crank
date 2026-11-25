import {expect, test} from "bun:test";
import {compile} from "../../src/transform.ts";

// The source map of a module, read the way a debugger reads it.

const BASE64 =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Returns the line of the source which each line of the code starts on.
function decodeLines(mappings: string): Array<number | undefined> {
	const lines: Array<number | undefined> = [];
	let sourceLine = 0;
	for (const line of mappings.split(";")) {
		let first: number | undefined;
		for (const segment of line.split(",")) {
			const fields: Array<number> = [];
			let value = 0;
			let shift = 0;
			for (const char of segment) {
				const digit = BASE64.indexOf(char);
				value += (digit & 31) << shift;
				if (digit & 32) {
					shift += 5;
				} else {
					fields.push(value & 1 ? -(value >> 1) : value >> 1);
					value = shift = 0;
				}
			}

			if (fields.length >= 4) {
				sourceLine += fields[2];
				if (first === undefined) {
					first = sourceLine;
				}
			}
		}

		lines.push(first);
	}

	return lines;
}

test("each line of a component maps to the line it was written on", () => {
	const source = `import {createElement} from "@b9g/crank";
import type {Context} from "@b9g/crank";

interface Props {
	name: string;
}

export function* Counter(this: Context, {name}: Props) {
	let n = 0; // SETUP
	const onclick = () => this.refresh(() => n++);
	for ({name} of this) {
		const label = name + n; // VIEW
		yield (
			<button onclick={onclick}>
				{label}
			</button>
		);
	}
}

export const Boxed = wrap(Counter); // CALL
`;
	const {code, map} = compile(source, {id: "counter.tsx", runtime: "runtime"});
	// The uses of the variables of the component are rewritten in place.
	expect(code).toContain("const label = __locals.name + __locals.n;");
	const parsed = JSON.parse(map);
	expect(parsed.sources).toEqual(["counter.tsx"]);
	expect(parsed.sourcesContent).toEqual([source]);
	const lines = decodeLines(parsed.mappings);
	const sourceLines = source.split("\n");
	const codeLines = code.split("\n");
	for (const [inCode, inSource] of [
		["let n = 0;", "// SETUP"],
		["const label = __locals.name + __locals.n;", "// VIEW"],
		["= __hot.value(", "// CALL"],
	]) {
		const codeLine = codeLines.findIndex(
			(line) =>
				line.trimStart().startsWith(inCode) ||
				(inCode.startsWith("=") && line.includes(inCode)),
		);
		const sourceLine = sourceLines.findIndex((line) => line.includes(inSource));
		expect(codeLine).toBeGreaterThan(0);
		expect(lines[codeLine]).toBe(sourceLine);
	}
});

test("each line of a view maps to the line it was written on", () => {
	const source = `import {createElement} from "@b9g/crank";

export function* Counter(this: any, {name}: {name: string}) {
	let n = 0;
	for ({name} of this) {
		const label: string = name + n; // FIRST
		if (n > 10) {
			return null; // SECOND
		}

		yield (
			<button>
				{label /* THIRD */}
			</button>
		);
	}
}
`;
	const {code} = compile(source, {
		id: "counter.tsx",
		runtime: "runtime",
		evaluate: true,
	});
	// The view is a function in JavaScript, with the mappings of its own map.
	const [js, mappings] = JSON.parse(
		code.match(/"gen", "[^"]*", (\[.*?\]), __hotScope/s)![1],
	);
	const lines = decodeLines(mappings);
	const sourceLines = source.split("\n");
	const jsLines: Array<string> = js.split("\n");
	for (const [inJS, inSource] of [
		["const label = name + n;", "// FIRST"],
		["return { value: (null) };", "// SECOND"],
		// The compiler writes the whole expression on the line it starts on.
		["yield (__hotCreateElement", "yield ("],
	]) {
		const jsLine = jsLines.findIndex((line) => line.includes(inJS));
		const sourceLine = sourceLines.findIndex((line) => line.includes(inSource));
		expect(jsLine).toBeGreaterThan(0);
		expect(lines[jsLine]).toBe(sourceLine);
	}
});
