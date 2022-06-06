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
	const [parsed] = parseChildren(Array.from(spans.raw), expressions);
	return createElementsFromParse(parsed);
}

export const x = template;

interface ParseElementResult {
	tag: Tag;
	props: Record<string, any> | null;
	children: Array<ParseElementResult | string>;
}

/* Whitespace
The JSX whitespace rules are complicated and controversial.

In the early days of React, when the JSX syntax extension was still being
implemented in the popular transpilers of the time, contributors debated how
whitespace should work. Of course, they shouldn’t work like HTML’s because
those rules are kinda insane. Insofar as JSX is meant for programmers, who like
to fiddle with whitespace, it should follow the same semantics as JavaScript
itself. One contributor writes:

	Indenting/beautifying code should never affect the outcome, especially as it
	means all indentation has to carry over into the final result and cannot be
	minified away (yuck!). While there are a handful of cases where you might
	want newlines to affect the outcome, those are far better handled explicitly
	by {' '} or {'\n'}.
	https://github.com/facebook/jsx/issues/19#issuecomment-57079949

We can rephrase the desire for “beauty” here as a desire for some whitespace in
the JSX grammar to be semantic-insensitive, for the purposes of programmers and
tools to toy with. Common use-cases for developer tooling like formatters and
minifiers include highlighting the “structure” of elements via indentation, or
trimming accidental whitespace. These use-cases can be rephrased as the
concrete rule: whitespace at the starts and ends of lines, or around the
children of an element, can be added or removed without affecting the semantics
of the code, ”semantics” here meaning simply the transpilation of JSX to
createElement() calls.

The tricky part for JSX is the use-case mentioned previously, where developers
want “some” whitespace at the ends of lines to be significant, as between two
inline elements divided across lines. As the author indicates, the solution is
to use JSX’s interpolation syntax `{" "}` to do so.

	return (
		<div>
			<span>Hello</span>{" "}
			<span>World</span>
		</div>
	);

Unfortunately, this solution is a pitfall for developers new to JSX, who
regularly assume that the whitespace rules for JSX are the same or similar to
that of HTML, as evidenced in the issue trackers for downstream transpilers.
Ironically, this solution is in and of itself “ugly,” or at least requires more
characters to type out, and a bigger lift for authors of developer tools.

To ease the tension, either developer tools need a semantic understanding of
inline/block elements to know how to preserve whitespace between elements, or
the whitespace rules of JSX need to give a little. The former solution is
futile, insofar as the semantics of inline and block elements can also depend
on styling. Meanwhile, there has been no progress made in regards to the latter
solution. Hence we are at the impasse we are at today.

The root cause of all this worry is that the JSX grammar does not have a way to
indicate that whitespace at the ends of lines is significant. Thankfully,
JavaScript template strings allow for Unix-style escapes of newlines, so we
don’t have to deal with any of these problems!

	yield x`
		<div>
			<span>Hello</span> \
			<span>World</span>
		</div>
	`;

The only catch is that we have to use the raw representation of strings,
because the “cooked” representation does not indicate that the newline has been
escaped; it removes the newline from the template tag entirely. For instance,
as we parse the template in the previous example, we want to treat the tabs on
the next line before `<span>World</span>` as insignificant, but we would have
no way of knowing that the tabs were at the start of a new line, rather than
between two elements.
*/

/* Some rambling thoughts on closing tags
JSX uses upper-case capitalization to determine whether a tag is an identifier
from the scope. The disadvantage for template tags is that if we interpolate
tags, this is slightly more typing (x`<${Component} />`). This unwieldy-ness is
exacerbated by closing tags, which must match opening tags to form a
well-formed tree.

	yield x`
		<${Component}>hello</${Component}>
	`;

Having to type out the `${}` twice is twice the syntactic noise. Honestly, as I
look at the above example, it doesn’t seem too bad, but insofar as JSX is not
HTML, we can do what developit/htm does and have a catch-all closing tag like
`<//>`.

	yield x`
		<${Component}>hello<//>
	`;

I think this would be the most explicit, least surprising design, right? Trying
to do fancy things where we allow closing elements to be un-interpolated, and
then parsed and compared against function names, would get in the way of
minifiers, which regularly mess with function names. We could also treat the
double slash as a comment-like construct, where you could put anything after
the slashes.

	yield x`
		<${Component}>hello< // Component >
	`;
 */

// TODO: Add HTML style comments to the grammar `<!-- comment -->`

/* Grammar
$CHILDREN: ($CHILD_TEXT | $ELEMENT | ${unknown})*
$CHILD_TEXT: /[^<]+/
$ELEMENT:
  $SELF_CLOSING_ELEMENT |
  $OPENING_ELEMENT $CHILDREN $CLOSING_ELEMENT
$SELF_CLOSING_ELEMENT: "<" ($IDENTIFIER | ${Tag}) $PROPS "/" ">"
$OPENING_ELEMENT: "<" ($IDENTIFIER | ${Tag})? $PROPS ">"
$CLOSING_ELEMENT: "<" ("/" | "//") ($IDENTIFIER)? ">"
$PROPS: ($PROP | $SPREAD_PROP)*
$SPREAD_PROP: "..." ${Record<string, unknown>}
$PROP: $IDENTIFIER ("=" $PROP_VALUE)?
$IDENTIFIER: /[^\s>]+/
$PROP_VALUE: /"[^"]*"/ | /'[^']*'/ | ${unknown}
*/

// I wish we could use regexs but we have to deal with expressions...
// We can probably deal with expressions with the string terminating regexp
// thingy.
const OPENING_TAG_RE = /<\s*([^\s>]*)/;
const CLOSING_TAG_RE = /<\s*\/\s*([^\s>]*)\s*>/;

// TODO: Since we’re going down the recursive descent route for now, we need to
// indicate to the callee in all the parseX functions how much span and
// expression is consumed.
// s = span
// i = index
function parseChildren(
	spans: Array<string>,
	expressions: Array<unknown>,
): [result: Array<ParseElementResult | string>, span: number, index: number] {
	const result: Array<ParseElementResult | string> = [];
	let starting = true;
	let s = 0; // span
	let i = 0; // index
	for (; s < spans.length; s++) {
		const span = spans[s];
		while (i < span.length) {
			if (starting) {
				// TODO: You can do gross regex magic to cut out whitespace-only lines right?
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
						spans1.unshift(span.slice(match.index));
						const [result1, s1, i1] = parseTag(spans1, expressions.slice(s));
						result.push(result1);
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

	return [result, s, i];
}

function parseTag(
	spans: Array<string>,
	expressions: Array<unknown>,
): [result: ParseElementResult, span: number, index: number] {
	let span = spans[0];
	let index = 0;
	let tag: Tag = "";
	// TODO: you can merge this with the next regexp you dumbass
	const match = /<\s*/.exec(span);
	const spaceMatch1 = /\s+/.exec(span);
	if (spaceMatch1) {
		index += spaceMatch1[0].length;
		span = span.slice(spaceMatch1.index);
	}

	if (span.length) {
		const tagMatch = /\S+/.exec(span);
		if (tagMatch) {
			tag = tagMatch[0];
			index += tag.length;
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

	const [props, s, i] = parseProps(spans, expressions);
	const endMatch = /\s*(\/)?>/.exec(span);
	if (!endMatch) {
		throw new Error("Parse Error Missing '>'");
	}

	index += endMatch[0].length;
	if (endMatch[1]) {
		if (!tag) {
			throw new Error("Parse Error");
		}

		// self-closing element.
		return [{tag, props, children: []}, 0, 0];
	}

	//const [children] = parseChildren(spans, expressions);
	return [{tag, props, children: []}, 0, 0];
}

function parseProps(
	_spans: ArrayLike<string>,
	_expressions: Array<unknown>,
): [result: Record<string, any> | null, span: number, index: number] {
	return [null, 0, 0];
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
