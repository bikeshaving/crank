import {createElement, Element} from "./crank.js";
import type {Tag} from "./crank.js";

// TODO: Handle illegal escape sequences.
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#es2018_revision_of_illegal_escape_sequences

// TODO: The biggest weakness with tagged templates is a lack of semantic type
// checking for expressions. Investigate whether TypeScript has advanced in
// this regard.

// TODO: Think about the name of this function.
export function template(
	spans: TemplateStringsArray,
	...expressions: Array<unknown>
): Element | null {
	const parsed = parseChildren(Array.from(spans.raw), expressions);
	return createElementsFromParse(parsed);
}

export const x = template;

interface ParseElementResult {
	tag: Tag;
	props: Record<string, any> | null;
	children: Array<ParseElementResult | string>;
	length: number;
}

/* Whitespace
The JSX whitespace rules are complicated and controversial.
	A quote from https://github.com/facebook/jsx/issues/19#issuecomment-57079949:
	Indenting/beautifying code should never affect the outcome, especially as it
	means all indentation has to carry over into the final result and cannot be
	minified away (yuck!). While there are a handful of cases where you might
	want newlines to affect the outcome, those are far better handled explicitly
	by {' '} or {'\n'}.

We can rephrase the desire for “beauty” here as a desire for the concrete rule:
whitespace at the start or end of lines and documents, and inside elements, can
be added or removed, without affecting the final result. The tricky part for
JSX is that there are certain instances where developers want to treat
whitespace at the ends of lines as significant, and JSX uses fancy heuristics
with regard to elements, text and expressions to allow for this.

	return (
		<div>
			<span>Hello</span>{" "}
			<span>World</span>
		</div>
	);

The example that trips up developers is when attempting to put whitespace
between “inline” elements like spans on separate lines. The solution is to
interpolate the whitespace as a raw string at the end of the line, but this is
itself “ugly” and a big lift for formatters. The root cause is that the JSX
grammar does not have a way to indicate that whitespace at the end of lines is
significant.

	yield x`
		<div>
			<span>Hello</span> \
			<span>World</span>
		</div>
	`;

Thankfully, JavaScript template strings allow for Unix-style escapes of
newlines, so we don’t have to deal with any of these problems! The only catch
is that we have to use the raw representation of strings, because the “cooked”
representation does not indicate that a newline has been escaped, and we need
it so we can ignore the whitespace at the start of the line. For instance, in
the previous example, we need to know that the newline is escaped, so that we
can treat the tabs on the next line before `<span>World</span>` as
insignificant.
*/

/* Grammar

CHILDREN = (CHILD_TEXT | ELEMENT | ${Children})*
CHILD_TEXT = ~`<`+
ELEMENT =
  SELF_CLOSING_ELEMENT |
  FRAGMENT_OPENING_ELEMENT CHILDREN CLOSING_ELEMENT |
  OPENING_ELEMENT CHILDREN CLOSING_ELEMENT
SELF_CLOSING_ELEMENT = `<` (IDENTIFIER | ${Component}) PROPS `/` `>`
FRAGMENT_OPENING_ELEMENT = `<` `>`
OPENING_ELEMENT = `<` (IDENTIFIER | ${Component}) PROPS `>`
CLOSING_ELEMENT = `<` `/` (IDENTIFIER | ${Component})? `>`
PROPS = (PROP | SPREAD_PROP)*
SPREAD_PROP = `...` ${Record<string, unknown>}
PROP = IDENTIFIER `=` PROP_VALUE
IDENTIFIER = /\S+/
PROP_VALUE = (`"` ~`"`* `"`) | (`'` ~`'`* `'`') | ${unknown}
*/

// TODO: Since we’re going down the recursive descent route, we need to
// indicate to the callee in all parseX functions how much span and expression
// is consumed.
function parseChildren(
	spans: Array<string>,
	expressions: Array<unknown>,
): Array<ParseElementResult | string> {
	const result: Array<ParseElementResult | string> = [];
	let starting = true;
	for (let s = 0; s < spans.length; s++) {
		const span = spans[s];
		for (let i = 0; i < span.length; ) {
			if (starting) {
				// TODO: You can do gross regex magic to cut empty lines right?
				const match = /^[^\S\r\n]/.exec(span.slice(i));
				if (match) {
					i += match[0].length;
				}

				starting = false;
			} else {
				const match = /(\r\n|\r|\n)|(<)/.exec(span.slice(i));
				if (match) {
					if (match.index > 0) {
						result.push(span.slice(i, i + match.index));
					}

					if (match[1]) {
						// newline detected
						starting = true;
						i = match.index + match[0].length;
					} else if (match[2]) {
						// element start detected
						const spans1 = spans.slice(s + 1);
						spans1.unshift(span.slice(match.index + match[0].length));
						const result1 = parseTag(spans1, expressions.slice(s));
						result.push(result1);
						i = match.index + result1.length;
						throw new Error("TODO 1");
					}
				} else {
					result.push(span.slice(i));
					break;
				}
			}
		}

		if (expressions.length) {
			throw new Error("TODO");
		}
	}

	return result;
}

function parseTag(
	spans: Array<string>,
	expressions: Array<unknown>,
): ParseElementResult {
	let length = 0;
	let span = spans[0];
	let tag: Tag = "";
	// TODO: you can merge this with the next regexp you dumbass
	const spaceMatch1 = /\s+/.exec(span);
	if (spaceMatch1) {
		length += spaceMatch1[0].length;
		span = span.slice(spaceMatch1.index);
	}

	if (span.length) {
		const tagMatch = /\S+/.exec(span);
		if (tagMatch) {
			tag = tagMatch[0];
			length += tag.length;
		}
	} else if (expressions.length) {
		tag = expressions[0] as Tag;
		if (
			typeof tag !== "string" ||
			typeof tag !== "function" ||
			typeof tag !== "symbol"
		) {
			throw new TypeError("Unexpected tag type");
		}

		span = spans[1];
	} else {
		throw new Error("Parse Error");
	}

	const props = parseProps(spans, expressions);
	const endMatch = /\s*(\/)?>/.exec(span);
	if (!endMatch) {
		throw new Error("Parse Error Missing '>'");
	}

	length += endMatch[0].length;
	if (endMatch[1]) {
		if (!tag) {
			throw new Error("Parse Error");
		}

		// self-closing element.
		return {tag, props, children: [], length};
	}

	const children = parseChildren(spans, expressions);
	return {tag, props, children, length};
}

function parseProps(
	_spans: ArrayLike<string>,
	_expressions: Array<unknown>,
): Record<string, any> | null {
	return null;
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
