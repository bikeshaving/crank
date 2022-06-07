import {c, Element} from "./crank.js";
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

// TODO: Add HTML style comments to the grammar `<!-- comment -->`

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
		result.push(c("p"));
	}

	if (result.length === 1) {
		return result[0];
	}

	// return a fragment
	return c("", null, result);
}
