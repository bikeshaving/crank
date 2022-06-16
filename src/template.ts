import {c, Element} from "./crank.js";
import type {Tag} from "./crank.js";

// TODO: Handle illegal escape sequences.
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#es2018_revision_of_illegal_escape_sequences

export function x(
	spans: TemplateStringsArray,
	...expressions: Array<unknown>
): Element | null {
	let parsed = parseChildren(spans.raw, expressions);
	if (parsed.children.length === 0) {
		return null;
	} else if (parsed.children.length === 1) {
		// TODO: Handle string children
		parsed = parsed.children[0] as any;
	}

	return createElementsFromParse(parsed);
}

interface ParseElementResult {
	tag: Tag;
	props: Record<string, any> | null;
	children: Array<ParseElementResult | string>;
}

// TODO: gross regexp magic to skip empty lines
/* Matches any whitespace that isn’t a newline. */
const WHITESPACE_RE = /[^\S\r\n]+/g;

/*
 * Matches the first significant character in children mode.
 * Group 1: newline
 * Group 2: element start
 */
const CHILDREN_RE = /(\r|\n|\r\n)|(<)/g;

// TODO: Figure out how to throw a smart error if the closing tag has props
/*
 * Matches an opening or closing tag
 *
 * Group 1: Closing slash, undefined if missing.
 * Group 2: Tag name
 */
const TAG_RE = /<\s*(\/)?\s*(?:([-\w]*)\s*|$)/g;

// TODO: Add spread operator
// TODO: Handle self-closing tag stuff
/*
 * Matches props after a tag.
 * Group 1: prop name
 * Group 2: prop value
 * Group 3: tag end
 */
const PROPS_RE =
	/\s*(?:(?:([-\w]+)\s*(?:=\s*("[^"]*"|'[^']*')|$)?)|(\/?\s*>))/g;

/* Modes */
const LINE_START_MODE = 0;
const CHILDREN_MODE = 1;
const PROPS_MODE = 2;
//const CLOSING_TAG_MODE = 3;

function parseChildren(
	spans: ArrayLike<string>,
	expressions: Array<unknown>,
): ParseElementResult {
	let current: ParseElementResult = {tag: "", props: null, children: []};
	const stack: Array<ParseElementResult> = [];
	let mode: number = LINE_START_MODE;
	for (let s = 0; s < spans.length; s++) {
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
					if (match[1]) {
						// newline detected
						if (match.index > 0 && span[match.index - 1] === "\\") {
							before = before.slice(0, -1);
						} else {
							before = before.trim();
						}

						if (before) {
							current.children.push(before);
						}

						mode = LINE_START_MODE;
						i = match.index + match[0].length;
					} else if (match[2]) {
						// tag detected
						TAG_RE.lastIndex = match.index;
						const tagMatch = TAG_RE.exec(span);
						if (tagMatch) {
							const closing = tagMatch[1] != null;
							const tagName = tagMatch[2];
							if (before) {
								current.children.push(before);
							}

							if (closing) {
								if (!stack.length) {
									throw new Error(`Unexpected closing tag named ${tagName}`);
								} else if (current.tag !== tagName) {
									throw new Error("Mismatched tag");
								}

								current = stack.pop()!;
								// TODO: Separate mode for closing tag
								mode = PROPS_MODE;
							} else {
								stack.push(current);
								const next = {tag: tagName, props: null, children: []};
								current.children.push(next);
								current = next;
								mode = PROPS_MODE;
							}

							i = tagMatch.index + tagMatch[0].length;
						} else {
							// We have a "<" but something unexpected happened.
							throw new Error("Unexpected token");
						}
					}
				} else {
					if (i < span.length) {
						let after = span.slice(i);
						if (s === spans.length - 1) {
							after = after.trimRight();
						}

						if (after) {
							current.children.push(after);
						}
					}

					break;
				}
			} else if (mode === PROPS_MODE) {
				PROPS_RE.lastIndex = i;
				const match = PROPS_RE.exec(span);
				if (match) {
					if (match[1]) {
						// prop matched
						const name = match[1];
						const value = match[2]
							// I made a couple useful winky emoticons by accident ^-^
							.replace(/^('|")/, "")
							.replace(/('|")$/, "");
						current.props = {...current.props, ...{[name]: value}};
					} else if (match[3]) {
						if (match[3][0] === "/") {
							// self-closing tag
							current = stack.pop()!;
						}

						mode = CHILDREN_MODE;
					}

					i = match.index + match[0].length;
				} else {
					// Is this branch possible?
					throw new Error("TODO");
				}
			}
		}

		// handle the expression
		const expression = expressions[s];
		if (expression != null) {
			throw new Error("TODO: Handle expressions");
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
	// TODO: We need to handle arbitrary children expressions
	const children = parsed.children.map((child) =>
		typeof child === "string" ? child : createElementsFromParse(child),
	);
	return c(parsed.tag, parsed.props, ...children);
}
