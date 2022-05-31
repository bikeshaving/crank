import {createElement, Element} from "./crank.js";
import type {Component} from "./crank.js";

// TODO: Figure out if we want to narrow the types.
type XExpression = unknown;

// TODO: Handle illegal escape sequences.
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#es2018_revision_of_illegal_escape_sequences

// TODO: The biggest weakness with tagged templates is a lack of semantic type
// checking for expressions. Investigate whether TypeScript has advanced in
// this regard.

export function x(
	spans: TemplateStringsArray,
	...expressions: Array<XExpression>
): Element | null {
	// We use the “cooked” representation of template strings because there is no
	// need for custom escape sequences.
	const parsed = parseChildren(Array.from(spans), expressions);
	return createElementsFromParse(parsed);
}

interface ParseElementResult {
	tag: Component | string;
	props: Record<string, any>;
	children: Array<ParseElementResult | string>;
}

function createElementsFromParse(
	parsed: Array<ParseElementResult | string>,
): Element | null {
	if (parsed.length === 0) {
		return null;
	}

	// TODO: actually do this bro
	const result: Array<Element> = [];
	for (let i = 0; i < parsed.length; i++) {
		result.push(createElement("p"));
	}

	if (result.length === 1) {
		return result[0];
	}

	// return a fragment
	return createElement("", null, result);
}

// Wouldn’t it be nice if there were a TypeScript plugin that just implemented this?

/* Grammar
 *
 * CHILDREN = (CHILD_TEXT | ELEMENT | ${Children})*
 * CHILD_TEXT = ~`<`*
 * ELEMENT = SELF_CLOSING_ELEMENT | OPENING_ELEMENT CHILDREN CLOSING_ELEMENT
 * SELF_CLOSING_ELEMENT = `<` (IDENTIFIER | ${Component}) PROPS `/` `>`
 * OPENING_ELEMENT = `<` (IDENTIFIER | ${Component}) PROPS `>`
 * CLOSING_ELEMENT = `<` `/` IDENTIFIER `>`
 * PROPS = (PROP | SPREAD_PROP)*
 * SPREAD_PROP = `...` ${Record<string, unknown>}
 * PROP = IDENTIFIER `=` PROP_VALUE
 * IDENTIFIER = /+/
 * PROP_VALUE = (`"` ~`"` `"`) | (`'` ~`'` `'`') | ${}
 */
function parseChildren(
	// We use the cooked representation because there are no situations where we
	// need to escape characters in this language.
	spans: Array<string>,
	expressions: Array<XExpression>,
): Array<ParseElementResult | string> {
	let mode: "children" | "tag" | "props" = "children";
	//const stack: Array<ParseElementResult> = [];
	const result: Array<ParseElementResult | string> = [];
	for (let i = 0; i < spans.length; i++) {
		const span = spans[i];
		for (let j = 0; j < span.length; j++) {
			const ch = span[j];
			// character is whitespace
			switch (ch) {
				case "\r":
					if (ch[j + 1] === "\n") {
						j++;
					}
				// fallthrough
				case "\n":
					break;
				case " ":
				case "\t":
					break;
			}
			if (!ch.trim()) {
				if (mode === "children") {
					/*
						TODO: The JSX whitespace rules are actually kinda complicated.

						From https://github.com/facebook/jsx/issues/19#issuecomment-57079949
							Indenting/beautifying code should never affect the outcome,
							especially as it means all indentation has to carry over into the
							final code and cannot be minified away (yuck!). While there are a
							handful of cases where you might want the newlines to affect
							outcome, those are far better handled explicitly by {' '} or
							{'\n'}.

						We can rephrase the desire for “beauty” here, or for
						semantic-insensitive code formatting, as a desire for the concrete
						rule: whitespace at the start or end of lines/documents can be
						added and removed. The problem for JSX is that there are certain
						instances where developers want to treat whitespace at the end of
						lines as significant, and JSX uses fancy heuristics with regard to
						elements, text and interpolations to try and make things behave
						predictably.

							return (
								<div>
									<span>Hello</span>{" "}
									<span>World</span>
								</div>
							);

						The canonical problem for web developers is when attempting to put
						whitespace between “inline” elements on separate lines. The
						solution is to interpolate the whitespace as a raw string at the
						end of the line, but this is itself “ugly.” The root cause is that
						neither JSX nor regular JavaScript include a way to escape newlines
						at the end of code.

							yield x`
								<div>
									<span>Hello</span> \
									<span>World</span>
								</div>
							`;

						Luckily, JavaScript template strings allow for Unix-style escapes
						of newlines. By escaping newlines in template documents, we can
						allow for whitespace between elements which are separated by
						newlines.

						Therefore, a template tag-based API for element creation should
						probably abide by the following rules with regard to whitespace:

						1. Whitespace at the start of lines should be stripped.
						2. Whitespace at the end of lines should be preserved.
						3. Empty lines (lines with only whitespace) should be removed from
							the output.
						4. Whitespace at the start and end of documents should be removed.
					*/
					result.push(ch);
				}

				continue;
			} else if (ch === "<") {
				// TODO: Do we have to allow back-slash escapes in this shit or can people just interpolate random strings in children?
				if (mode === "children") {
					mode = "tag";
				} else {
					throw new Error("Unexpected character");
				}
			} else if (ch === ">") {
				if (mode === "tag" /* || mode === "props"*/) {
					mode = "children";
				} else {
					result.push(ch);
				}
			} else if (ch === "/") {
				if (mode === "tag") {
					// what the fuck
				}
			}
		}

		const expression = expressions[i];
		expression;
	}

	return result;
}
