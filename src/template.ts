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

/*
 * Matches the first significant character in children mode.
 * Group 1: newline
 * Group 2: comment
 * Group 3: tag
 * Group 4: closing slash
 * Group 5: tag name
 */
const CHILDREN_MATCHER =
	/((?:\r|\n|\r\n)\s*)|(<!--[\S\s]*?(?:-->|$))|(<\s*(\/{0,2})\s*(?:([-\w]*)\s*|$))/g;

// TODO: Think about prop name character class
/*
 * Matches props after a tag.
 * Group 1: tag end
 * Group 2: spread props
 * Group 3: prop name
 * Group 4: prop value string
 */
const PROPS_MATCHER =
	/\s*(\/?\s*>)|(\.\.\.\s*$)|(?:([-\w]+)\s*(?:=\s*(?:("[^"]*"|'[^']*')|$))?)/g;

/* Matches closing tag */
const CLOSING_TAG_MATCHER = /\s*>/g;

/* Matches a closing comment. */
const CLOSING_COMMENT_MATCHER = "-->";

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
	let matcher = CHILDREN_MATCHER as RegExp | string;
	let lineStart = true;
	for (let s = 0; s < spans.length; s++) {
		const span = spans[s];
		// expressions[spans.length - 1] will never be defined because
		// template tags are always called with one more span than expression.
		let expressing = s < spans.length - 1;
		for (let i = 0; i < span.length; ) {
			if (typeof matcher === "string") {
				// The only matcher which is a string right now is the
				// CLOSING_COMMENT_MATCHER.
				i = span.indexOf(matcher);
				if (i === -1) {
					break;
				}

				i += matcher.length;
				matcher = CHILDREN_MATCHER;
			} else {
				matcher.lastIndex = i;
				const match = matcher.exec(span);
				if (match) {
					let before = span.slice(i, match.index);
					i = match.index + match[0].length;
					if (matcher === CHILDREN_MATCHER) {
						if (lineStart) {
							before = before.replace(/^\s*/, "");
							lineStart = false;
						}

						const [, newline, comment, tagging, closer, tagName] = match;
						if (newline) {
							before =
								match.index > 0 && span[match.index - 1] === "\\"
									? // remove the backslash from the output
									  before.slice(0, -1)
									: before.replace(/\s*$/, "");
							lineStart = true;
						}

						if (before) {
							current.children.push({type: "value", value: before});
						}

						if (comment) {
							if (i === span.length) {
								matcher = CLOSING_COMMENT_MATCHER;
							}
						} else if (tagging) {
							// TODO: Consider runtime type checking
							let tag: Tag = tagName;
							if (expressing && i === span.length) {
								tag = expressions[s] as Tag;
								expressing = false;
							}

							if (closer) {
								// TODO: Use function names for components
								if (!stack.length) {
									throw new Error(
										`Unexpected closing tag named ${String(tag)}`,
									);
								} else if (closer !== "//" && current.tag !== tag) {
									throw new Error(`Mismatched tag: ${String(tag)}`);
								}

								current = stack.pop()!;
								matcher = CLOSING_TAG_MATCHER;
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
								matcher = PROPS_MATCHER;
							}
						}
					} else if (matcher === PROPS_MATCHER) {
						const [, closer, spread, name, string] = match;
						if (closer) {
							if (closer[0] === "/") {
								// TODO: Do we have to throw an error here if the stack is empty
								// self-closing tag
								current = stack.pop()!;
							}

							matcher = CHILDREN_MATCHER;
						} else if (spread) {
							if (i !== span.length || s >= spans.length - 1) {
								throw new Error("Expression expected");
							}

							current.props = {...current.props, ...(expressions[s] as any)};
							expressing = false;
						} else if (name) {
							if (string == null) {
								if (i < span.length) {
									// TODO: Does this work when an expression appears
									// after the boolean prop?
									current.props = {...current.props, ...{[name]: true}};
								} else if (i !== span.length || s >= spans.length - 1) {
									throw new Error("Expression expected");
								} else {
									// prop expression
									current.props = {
										...current.props,
										...{[name]: expressions[s]},
									};
									expressing = false;
								}
							} else {
								current.props = {
									...current.props,
									// I accidentally made some regular expression emoticons ^-^
									...{
										[name]: string.replace(/^('|")/, "").replace(/('|")$/, ""),
									},
								};
							}
						}
					} else if (matcher === CLOSING_TAG_MATCHER) {
						matcher = CHILDREN_MATCHER;
					}
				} else {
					if (matcher === CHILDREN_MATCHER) {
						if (i < span.length) {
							let after = span.slice(i);
							if (s === spans.length - 1) {
								after = after.replace(/\s*$/, "");
							}

							if (after) {
								current.children.push({type: "value", value: after});
							}

							break;
						}
					} else {
						// TODO: Better diagnostic
						throw new Error("Unexpected character");
					}
				}
			}
		}

		// TODO: I feel like there’s a more elegant way to express this. Too
		// much custom logic right now.
		if (expressing) {
			const value = expressions[s];
			if (matcher === CHILDREN_MATCHER) {
				current.children.push({type: "value", value});
			} else if (matcher !== CLOSING_COMMENT_MATCHER) {
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
