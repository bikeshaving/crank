import {c, Element} from "./crank.js";
import type {Tag} from "./crank.js";

// TODO: Consider the name of this function. Currently, I’m think `t` for
// template?
export function x(
	spans: TemplateStringsArray,
	...expressions: Array<unknown>
): Element | null {
	let parsed = parseChildren(spans.raw, expressions);
	if (parsed.children.length === 0) {
		return null;
	} else if (
		parsed.children.length === 1 &&
		parsed.children[0].type === "element"
	) {
		parsed = parsed.children[0];
	}

	return createElementsFromParse(parsed);
}

interface ParseElementResult {
	type: "element";
	tag: Tag;
	props: Record<string, any> | null;
	children: Array<ParseResult>;
}

interface ParseValueResult {
	type: "value";
	value: unknown;
}

type ParseResult = ParseElementResult | ParseValueResult;

// TODO: gross regexp magic to skip empty lines
/* Matches any whitespace that isn’t a newline. */
const WHITESPACE_RE = /[^\S\r\n]+/g;

// TODO: double closing slash
/*
 * Matches the first significant character in children mode.
 * Group 1: newline
 * Group 2: tag
 * Group 3: closing slash, undefined if missing.
 * Group 4: tag name, will never be undefined.
 */
const CHILDREN_RE = /(\r|\n|\r\n)|(<\s*(\/)?\s*(?:([-\w]*)\s*|$))/g;

// TODO: Add spread operator
// TODO: Handle self-closing tag stuff
/*
 * Matches props after a tag.
 * Group 1: tag end
 * Group 2: prop name
 * Group 3: prop value
 * Group 4: prop value string
 */
const PROPS_RE = /\s*(\/?\s*>)|([-\w]+)\s*(=\s*(?:("[^"]*"|'[^']*')|$))?/g;

const CLOSING_TAG_RE = /\s*>/g;

/* Modes */
const LINE_START_MODE = 0;
const CHILDREN_MODE = 1;
const PROPS_MODE = 2;
const CLOSING_TAG_MODE = 3;

function parseChildren(
	spans: ArrayLike<string>,
	expressions: Array<unknown>,
): ParseElementResult {
	let current: ParseElementResult = {
		type: "element",
		tag: "",
		props: null,
		children: [],
	};
	const stack: Array<ParseElementResult> = [];
	let mode = LINE_START_MODE;
	outer: for (let s = 0; s < spans.length; s++) {
		const span = spans[s];
		for (let i = 0; i < span.length; ) {
			if (mode === LINE_START_MODE) {
				// consuming whitespace at the start of lines/elements
				WHITESPACE_RE.lastIndex = i;
				const match = WHITESPACE_RE.exec(span);
				if (match && match.index === i) {
					i = match.index + match[0].length;
				}

				mode = CHILDREN_MODE;
			} else if (mode === CHILDREN_MODE) {
				CHILDREN_RE.lastIndex = i;
				const match = CHILDREN_RE.exec(span);
				if (match) {
					let before = span.slice(i, match.index);
					i = match.index + match[0].length;
					if (match[1]) {
						// newline detected
						before =
							match.index > 0 && span[match.index - 1] === "\\"
								? // remove the backslash from the output
								  before.slice(0, -1)
								: before.trim();
						if (before) {
							current.children.push({type: "value", value: before});
						}

						mode = LINE_START_MODE;
					} else if (match[2]) {
						if (before) {
							current.children.push({type: "value", value: before});
						}

						const opening = match[3] == null;
						const tagName = match[4];
						const expressing = i === span.length && s < spans.length - 1;
						// TODO: Some type checking?
						const tag = expressing ? (expressions[s] as Tag) : tagName;
						if (opening) {
							stack.push(current);
							const next = {
								type: "element" as const,
								tag,
								props: null,
								children: [],
							};
							current.children.push(next);
							current = next;
							mode = PROPS_MODE;
						} else {
							// closing
							if (!stack.length) {
								throw new Error(`Unexpected closing tag named ${tag}`);
							} else if (current.tag !== tag) {
								throw new Error(`Mismatched tag: ${tag}`);
							}

							current = stack.pop()!;
							mode = CLOSING_TAG_MODE;
						}

						if (expressing) {
							continue outer;
						}
					} else {
						throw new Error("TODO: Is this branch possible?");
					}
				} else {
					// No more tags or newlines in this span.
					if (i < span.length) {
						let after = span.slice(i);
						if (s === spans.length - 1) {
							after = after.trimRight();
						}

						if (after) {
							current.children.push({type: "value", value: after});
						}
					}

					break;
				}
			} else if (mode === PROPS_MODE) {
				PROPS_RE.lastIndex = i;
				const match = PROPS_RE.exec(span);
				if (match) {
					i = match.index + match[0].length;
					if (match[1]) {
						if (match[1][0] === "/") {
							// self-closing tag
							current = stack.pop()!;
						}

						mode = CHILDREN_MODE;
					} else if (match[2]) {
						// prop matched
						const name = match[2];
						let string = match[4];
						if (string == null) {
							if (i !== span.length) {
								throw new Error("Property expected");
							} else if (s >= spans.length - 1) {
								throw new Error("Expression expected");
							}

							current.props = {...current.props, ...{[name]: expressions[s]}};
							continue outer;
						} else {
							current.props = {
								...current.props,
								// I accidentally made some regular expression emoticons ^-^
								...{[name]: string.replace(/^('|")/, "").replace(/('|")$/, "")},
							};
						}
					}
				} else {
					throw new Error("TODO: Is this branch possible?");
				}
			} else if (mode === CLOSING_TAG_MODE) {
				CLOSING_TAG_RE.lastIndex = i;
				const match = CLOSING_TAG_RE.exec(span);
				if (match) {
					i = match.index + match[0].length;
					mode = CHILDREN_MODE;
				} else {
					throw new Error(`Unexpected character`);
				}
			}
		}

		// expressions[spans.length - 1] will never be defined because template
		// tags are always called with one more span than expression.
		if (s < spans.length - 1) {
			const value = expressions[s];
			// TODO: use the statement label to break out of this part
			if (mode === CHILDREN_MODE) {
				current.children.push({type: "value", value});
			} else {
				throw new Error(
					`Unexpected expression: \${${JSON.stringify(value, null, 2)}}`,
				);
			}
		}
	}

	if (stack.length) {
		throw new Error(
			`Missing closing tag for ${stack[stack.length - 1].tag.toString()}`,
		);
	}

	return current;
}

function createElementsFromParse(parsed: ParseElementResult): Element | null {
	const children: Array<unknown> = [];
	for (let i = 0; i < parsed.children.length; i++) {
		const child = parsed.children[i];
		children.push(
			child.type === "element" ? createElementsFromParse(child) : child.value,
		);
	}

	return c(parsed.tag, parsed.props, ...children);
}
