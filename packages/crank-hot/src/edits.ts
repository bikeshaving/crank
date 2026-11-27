// The transform changes a module by a list of edits to its source. Applying
// them here also writes the source map, which says where each word of the
// result was in the source.

/** Replaces the source from a start to an end with some text. */
export type Edit = [start: number, end: number, text: string];

const BASE64 =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function encode(value: number): string {
	let result = "";
	let rest = value < 0 ? (-value << 1) | 1 : value << 1;
	do {
		const digit = rest & 31;
		rest >>>= 5;
		result += BASE64[rest ? digit | 32 : digit];
	} while (rest);

	return result;
}

// A word, or a character which is not part of one. A source map says where
// places are and nothing about what is between them, so every word of the
// source which is kept gets a place.
const WORD = /[A-Za-z0-9_$]+|[^\sA-Za-z0-9_$]/g;

/**
 * Applies edits to a source, and returns the result with the mappings of a
 * source map from it to the source.
 *
 * Edits which start at the same place are applied so that the one which was
 * added last comes first, and one which takes nothing out comes before one
 * which does.
 */
export function applyEdits(
	source: string,
	edits: Array<Edit>,
): {code: string; mappings: string} {
	const ordered = edits
		.map((edit, i) => ({edit, i}))
		.sort(
			(a, b) =>
				a.edit[0] - b.edit[0] ||
				(a.edit[1] === a.edit[0] ? 0 : 1) - (b.edit[1] === b.edit[0] ? 0 : 1) ||
				b.i - a.i,
		);

	// Where each line of the source starts.
	const starts = [0];
	for (let i = 0; i < source.length; i++) {
		if (source[i] === "\n") {
			starts.push(i + 1);
		}
	}

	let code = "";
	let mappings = "";
	// The line of the source which a place is on is looked for from the last.
	let sourceLine = 0;
	// What the numbers in the mappings are counted from.
	let column = 0;
	let lastColumn = 0;
	let lastSourceLine = 0;
	let lastSourceColumn = 0;
	let isFirst = true;
	const mark = (at: number): void => {
		while (sourceLine + 1 < starts.length && starts[sourceLine + 1] <= at) {
			sourceLine++;
		}

		const sourceColumn = at - starts[sourceLine];
		mappings +=
			(isFirst ? "" : ",") +
			encode(column - lastColumn) +
			"A" +
			encode(sourceLine - lastSourceLine) +
			encode(sourceColumn - lastSourceColumn);
		isFirst = false;
		lastColumn = column;
		lastSourceLine = sourceLine;
		lastSourceColumn = sourceColumn;
	};

	const write = (text: string): void => {
		code += text;
		for (let i = 0; i < text.length; i++) {
			if (text[i] === "\n") {
				mappings += ";";
				column = 0;
				lastColumn = 0;
				isFirst = true;
			} else {
				column++;
			}
		}
	};

	// Writes a part of the source as it was.
	const keep = (from: number, to: number): void => {
		const text = source.slice(from, to);
		let done = 0;
		WORD.lastIndex = 0;
		for (let match = WORD.exec(text); match; match = WORD.exec(text)) {
			write(text.slice(done, match.index));
			mark(from + match.index);
			done = match.index;
		}

		write(text.slice(done));
	};

	let at = 0;
	for (const {edit} of ordered) {
		const [start, end, text] = edit;
		if (start < at) {
			throw new Error("Edits to the same part of a module");
		}

		keep(at, start);
		if (text) {
			// What is written in place of something is where it was.
			mark(start);
			write(text);
		}

		at = end;
	}

	keep(at, source.length);
	return {code, mappings};
}
