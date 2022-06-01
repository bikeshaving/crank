import {createElement, Element} from "./crank.js";
import type {Component} from "./crank.js";

// TODO: Figure out if we want to narrow the types.
type XExpression = unknown;

// TODO: Handle illegal escape sequences.
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#es2018_revision_of_illegal_escape_sequences

// TODO: The biggest weakness with tagged templates is a lack of semantic type
// checking for expressions. Investigate whether TypeScript has advanced in
// this regard.

// TODO: Think about the name of this function.
export function x(
	spans: TemplateStringsArray,
	...expressions: Array<XExpression>
): Element | null {
	const parsed = parseChildren(spans.raw, expressions);
	return createElementsFromParse(parsed);
}

interface ParseElementResult {
	tag: Component | string;
	props: Record<string, any>;
	children: Array<ParseElementResult | string>;
}

/* Grammar
 *
 * CHILDREN = (CHILD_TEXT | ELEMENT | ${Children})*
 * CHILD_TEXT = ~`<`*
 * ELEMENT =
 *   SELF_CLOSING_ELEMENT |
 *   FRAGMENT_ELEMENT CHILDREN CLOSING_ELEMENT
 *   OPENING_ELEMENT CHILDREN CLOSING_ELEMENT |
 * SELF_CLOSING_ELEMENT = `<` (IDENTIFIER | ${Component}) PROPS `/` `>`
 * FRAGMENT_ELEMENT = `<>`
 * OPENING_ELEMENT = `<` (IDENTIFIER | ${Component}) PROPS `>`
 * CLOSING_ELEMENT = `<` `/` (IDENTIFIER | ${Component})? `>`
 * PROPS = (PROP | SPREAD_PROP)*
 * SPREAD_PROP = `...` ${Record<string, unknown>}
 * PROP = IDENTIFIER `=` PROP_VALUE
 * IDENTIFIER = /\S+/
 * PROP_VALUE = (`"` ~`"`* `"`) | (`'` ~`'`* `'`') | ${}
 */

/*
The JSX whitespace rules are complicated and controversial.

From https://github.com/facebook/jsx/issues/19#issuecomment-57079949
	Indenting/beautifying code should never affect the outcome, especially as it
	means all indentation has to carry over into the final code and cannot be
	minified away (yuck!). While there are a handful of cases where you might
	want newlines to affect the outcome, those are far better handled explicitly
	by {' '} or {'\n'}.

We can rephrase the desire for “beauty” here as a desire for the concrete rule:
whitespace at the start or end of lines and documents, and inside elements, can
be added or removed. The tricky part for JSX is that there are certain
instances where developers want to treat whitespace at the end of lines as
significant, and JSX uses fancy heuristics with regard to elements, text and
expressions to allow for this.

	return (
		<div>
			<span>Hello</span>{" "}
			<span>World</span>
		</div>
	);

The example that trips up web developers is when attempting to put whitespace
between “inline” elements like spans on separate lines. The solution is to
interpolate the whitespace as a raw string at the end of the line, but this is
itself “ugly” and a big lift for formatters. The root cause is that neither JSX
nor regular JavaScript include a way to escape newlines, so that significant
whitespace at the end of lines can be preserved.

	yield x`
		<div>
			<span>Hello</span> \
			<span>World</span>
		</div>
	`;

Thankfully, JavaScript template strings allow for Unix-style escapes of
newlines, so we don’t have to deal with any of these problems! The only catch
is that we have to use the raw representation of strings, because the “cooked”
representation does not include the escaped newline, and we need to know that
the line has ended. For instance, in the previous example, we need to know that
the newline is escaped so we can treat the tabs before `<span>World</span>` as
insignificant.

Therefore, a template tag-based API for element creation should probably abide by the
following rules with regard to whitespace:

1. Whitespace-only lines should be removed.
2. Whitespace at the start and end of lines should be stripped.
3. Whitespace inside elements should be removed.
*/

function parseChildren(
	spans: ArrayLike<string>,
	expressions: Array<XExpression>,
): Array<ParseElementResult | string> {
	const result: Array<ParseElementResult | string> = [];
	for (let i = 0; i < spans.length; i++) {
		const span = spans[i];
		span;
	}

	expressions;
	return result;
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
