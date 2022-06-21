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

/* Modes */
const LINE_START_MODE = 0;
const CHILDREN_MODE = 1;
const PROPS_MODE = 2;
const CLOSING_TAG_MODE = 3;
const COMMENT_MODE = 4;

// TODO: gross regexp magic to skip empty lines
/* Matches any whitespace that isn’t a newline. */
const WHITESPACE_RE = /[^\S\r\n]+/g;

/*
 * Matches the first significant character in children mode.
 * Group 1: newline
 * Group 2: comment
 * Group 3: tag
 * Group 4: closing slash
 * Group 5: tag name
 */
const CHILDREN_RE =
	/(\r|\n|\r\n)|(<!--[\S\s]*?(?:-->|$))|(<\s*(\/{0,2})\s*(?:([-\w]*)\s*|$))/g;

// TODO: Think about prop name character class
/*
 * Matches props after a tag.
 * Group 1: tag end
 * Group 2: spread props
 * Group 3: prop name
 * Group 4: prop value string
 */
const PROPS_RE =
	/\s*(\/?\s*>)|(\.\.\.$)|(?:([-\w]+)\s*(?:=\s*(?:("[^"]*"|'[^']*')|$))?)/g;

/* Matches closing tag */
const CLOSING_TAG_RE = /\s*>/g;

function parseChildren(
	spans: ArrayLike<string>,
	expressions: Array<unknown>,
): ParseElementResult {
	let mode = LINE_START_MODE;
	let current: ParseElementResult = {
		type: "element",
		tag: "",
		props: null,
		children: [],
	};
	const stack: Array<ParseElementResult> = [];
	// By continuing the spanloop, we avoid the logic at the bottom of the loop,
	// which handles expressions and throws errors when an expression is
	// unexpected.
	spanloop: for (let s = 0; s < spans.length; s++) {
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
					const [, newline, comment, tag, closer, tagName] = match;
					if (newline) {
						before =
							match.index > 0 && span[match.index - 1] === "\\"
								? // remove the backslash from the output
								  before.slice(0, -1)
								: before.trim();
						if (before) {
							current.children.push({type: "value", value: before});
						}

						mode = LINE_START_MODE;
					} else if (comment) {
						if (before) {
							current.children.push({type: "value", value: before});
						}

						if (i === span.length) {
							mode = COMMENT_MODE;
							continue spanloop;
						}
					} else if (tag) {
						if (before) {
							current.children.push({type: "value", value: before});
						}

						const expressing = i === span.length && s < spans.length - 1;
						// TODO: Consider runtime type checking
						const tag = expressing ? (expressions[s] as Tag) : tagName;
						if (closer) {
							// TODO: Use function names for components
							if (!stack.length) {
								throw new Error(`Unexpected closing tag named ${String(tag)}`);
							} else if (closer !== "//" && current.tag !== tag) {
								throw new Error(`Mismatched tag: ${String(tag)}`);
							}

							current = stack.pop()!;
							mode = CLOSING_TAG_MODE;
						} else {
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
						}

						if (expressing) {
							continue spanloop;
						}
					}
				} else {
					// TODO: We can probably abstract this in the whitespace branch
					// somehow
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
					const [, closer, spread, name, string] = match;
					if (closer) {
						if (closer[0] === "/") {
							// TODO: Do we have to throw an error here if the stack is empty
							// self-closing tag
							current = stack.pop()!;
						}

						mode = CHILDREN_MODE;
					} else if (spread) {
						if (i !== span.length || s >= spans.length - 1) {
							// TODO: Allow whitespace after the ...?
							throw new Error("Expression expected");
						}

						current.props = {...current.props, ...(expressions[s] as any)};
						continue spanloop;
					} else if (name) {
						if (string == null) {
							if (i < span.length) {
								// TODO: Does this work when an expression appears
								// after the boolean prop?
								current.props = {...current.props, ...{[name]: true}};
							} else if (s >= spans.length - 1) {
								throw new Error("Expression expected");
							} else {
								// prop expression
								current.props = {...current.props, ...{[name]: expressions[s]}};
								continue spanloop;
							}
						} else {
							current.props = {
								...current.props,
								// I accidentally made some regular expression emoticons ^-^
								...{[name]: string.replace(/^('|")/, "").replace(/('|")$/, "")},
							};
						}
					}
				} else {
					// TODO: Better diagnostic
					throw new Error("Unexpected character");
				}
			} else if (mode === CLOSING_TAG_MODE) {
				CLOSING_TAG_RE.lastIndex = i;
				const match = CLOSING_TAG_RE.exec(span);
				if (match) {
					i = match.index + match[0].length;
					mode = CHILDREN_MODE;
				} else {
					// TODO: Better diagnostic
					throw new Error("Unexpected character");
				}
			} else if (mode === COMMENT_MODE) {
				const ci = span.indexOf("-->");
				if (ci === -1) {
					continue spanloop;
				}

				i = ci + "-->".length;
				mode = CHILDREN_MODE;
			}
		}

		// expressions[spans.length - 1] will never be defined because template
		// tags are always called with one more span than expression.
		if (s < spans.length - 1) {
			const value = expressions[s];
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
		// TODO: Better error message for components
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
