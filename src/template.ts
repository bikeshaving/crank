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

function parseChildren(
	spans: ArrayLike<string>,
	expressions: Array<unknown>,
): ParseElementResult {
	let current: ParseElementResult = {tag: "", props: null, children: []};
	const stack: Array<ParseElementResult> = [];
	let mode: "whitespace" | "children" | "props" = "whitespace";

	// TODO: gross regexp magic to skip empty lines
	/* Matches any whitespace that isn’t a newline. */
	const whitespaceRe = /[^\S\r\n]+/g;
	/*
	 * Matches the first significant character in children mode.
	 * Group 1: newline
	 * Group 2: element start
	 */
	const childrenRe = /(\r|\n|\r\n)|(<)/g;
	/*
	 * Matches an opening or closing tag.
	 * Group 1: closing tag
	 * Group 2: closing tagName
	 * Group 3: opening tag
	 * Group 4: opening tagName
	 *
	 * The closing tag group has to go first because otherwise the opening tag
	 * group will match.
	 */
	// TODO: Figure out how to throw a smart error if the closing tag has props
	// TODO: we can probably combine the groups and make the slash optional
	const tagRe = /(<\s*\/\s*([-\w]*)\s*>)|(<\s*(?:([-\w]*)|$))/g;

	/*
	 * Matches props after a tag.
	 * Group 1: prop name
	 * Group 2: prop value
	 * Group 3: tag end
	 */
	// TODO: Add spread operator
	// TODO: Handle self-closing tag stuff
	const propsRe =
		/\s*(?:(?:([-\w]+)\s*(?:=\s*("[^"]*"|'[^']*')|$)?)|(\/?\s*>))/g;
	for (let s = 0; s < spans.length; s++) {
		const span = spans[s];
		for (let i = 0; i < span.length; ) {
			// TODO: Should we use the same mode system when handling expressions or nah?
			if (mode === "whitespace") {
				// consuming whitespace at the start of lines/elements
				whitespaceRe.lastIndex = i;
				const match = whitespaceRe.exec(span);
				if (match && match.index === i) {
					i = match.index + match[0].length;
				}

				mode = "children";
			} else if (mode === "children") {
				childrenRe.lastIndex = i;
				const match = childrenRe.exec(span);
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

						mode = "whitespace";
						i = match.index + match[0].length;
					} else if (match[2]) {
						// tag detected
						tagRe.lastIndex = match.index;
						const tagMatch = tagRe.exec(span);
						if (tagMatch) {
							if (tagMatch[1] != null) {
								// closing tag match
								const tagName = tagMatch[2];
								if (!stack.length) {
									throw new Error(`Unexpected closing tag named ${tagName}`);
								} else if (current.tag !== tagName) {
									throw new Error("Mismatched tag");
								}

								if (before) {
									current.children.push(before);
								}

								current = stack.pop()!;
								mode = "children";
							} else if (tagMatch[3] != null) {
								// opening tag match
								if (before) {
									current.children.push(before);
								}

								const tagName = tagMatch[4];
								stack.push(current);
								const next = {tag: tagName, props: null, children: []};
								current.children.push(next);
								current = next;
								mode = "props";
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

					i = span.length;
				}
			} else if (mode === "props") {
				propsRe.lastIndex = i;
				const match = propsRe.exec(span);
				if (match) {
					if (match[1]) {
						// prop matched
						throw new Error("PROP MATCH");
					} else if (match[3]) {
						if (match[3][0] === "/") {
							// self-closing tag
							current = stack.pop()!;
						}

						mode = "children";
						i = match.index + match[0].length;
					}
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
