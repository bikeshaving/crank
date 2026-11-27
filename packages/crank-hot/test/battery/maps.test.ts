import {expect, test} from "bun:test";
import {compile} from "../../src/compile.ts";

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
		["export const Boxed = wrap(Counter);", "// CALL"],
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

// Returns where a place in the code was in the source: the last mapping at
// or before it on its line, as a debugger reads a map.
function locate(
	mappings: string,
	line: number,
	column: number,
): [number, number] | undefined {
	let sourceLine = 0;
	let sourceColumn = 0;
	const lines = mappings.split(";");
	let found: [number, number] | undefined;
	for (let i = 0; i <= line; i++) {
		let at = 0;
		for (const segment of lines[i].split(",")) {
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

			if (fields.length < 4) {
				continue;
			}

			at += fields[0];
			sourceLine += fields[2];
			sourceColumn += fields[3];
			if (i === line && at <= column) {
				found = [sourceLine, sourceColumn];
			}
		}
	}

	return found;
}

test("each word of a module maps to the column it was written at", () => {
	const source = `import {createElement} from "@b9g/crank";

export function* Counter(this: any, {name}: {name: string}) {
	let total = 0;
	const onclick = () => this.refresh(() => total++);
	for ({name} of this) {
		const label = name + total;
		yield <button onclick={onclick}>{label}</button>;
	}
}
`;
	const {code, map} = compile(source, {id: "counter.tsx", runtime: "runtime"});
	const {mappings} = JSON.parse(map);
	const codeLines = code.split("\n");
	const sourceLines = source.split("\n");
	// A word of the code, the occurrence of it on its line, and the word of
	// the source which it was.
	for (const [line, inCode, nth, inSource] of [
		[2, "Counter", 0, "Counter"],
		[3, "total", 0, "total"],
		[4, "refresh", 0, "refresh"],
		[4, "total", 0, "total"],
		[5, "name", 0, "name"],
		// The uses which are rewritten are where the names were.
		[6, "__locals", 0, "name"],
		[6, "__locals", 1, "total"],
		[6, "+", 0, "+"],
		[7, "__locals", 0, "onclick"],
		[7, "label", 0, "label"],
		[7, "button", 1, "button"],
	] as Array<[number, string, number, string]>) {
		let column = -1;
		for (let i = 0; i <= nth; i++) {
			column = codeLines[line].indexOf(inCode, column + 1);
		}

		let sourceColumn = -1;
		// The attribute is written before the handler it is given.
		const occurrence =
			inCode === "button" ? nth : inSource === "onclick" ? 1 : 0;
		for (let i = 0; i <= occurrence; i++) {
			sourceColumn = sourceLines[line].indexOf(inSource, sourceColumn + 1);
		}

		expect(column).toBeGreaterThanOrEqual(0);
		expect(locate(mappings, line, column)).toEqual([line, sourceColumn]);
	}
});
