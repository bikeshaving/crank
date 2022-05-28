import {createElement, Element} from "./crank.js";
import type {Component} from "./crank.js";

// TODO: Figure out if we want to narrow the types.
type XExpression = unknown;

// TODO: Is it better to use the raw string? I don’t know tbh. The only reason
// to use a raw string would be to allow escape sequences.
export function x(
	spans: TemplateStringsArray,
	...expressions: Array<XExpression>
): Element | null {
	const parsed = parse(spans, expressions);
	return createElementsFromParse(parsed);
}

/*
	ARE THESE ALL THE SPECIAL CHARACTERS?
	`"`,`'` // prop value separator
	"=", // prop key-value separator
	"<", // tag start
	">", // tag end
	"/", // tag closer
 */
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

//x`<div a=${1} b=${2}>World</div>`;
function parse(
	// TODO: figure out if we need to use the raw strings array.
	// This would imply that there are some escape sequences we need to handle.
	spans: TemplateStringsArray,
	expressions: Array<XExpression>,
): Array<ParseElementResult | string> {
	let mode: "children" | "tag" | "props" = "children";
	//const stack: Array<Component | string> = [];
	const result: Array<ParseElementResult | string> = [];
	for (let i = 0; i < spans.length; i++) {
		const span = spans[i];
		for (let j = 0; j < span.length; j++) {
			const ch = span[j];
			if (!ch.trim()) {
				// character is whitespace
				if (mode === "children") {
					/*
						TODO: The JSX whitespace rules are actually kinda complicated.

						READ:
						https://www.bennadel.com/blog/2880-a-quick-look-at-rendering-white-space-using-jsx-in-reactjs.htm
						https://github.com/facebook/jsx/issues/6
						https://github.com/facebook/jsx/issues/19
						https://github.com/microsoft/TypeScript/issues/22186
						https://github.com/developit/htm/issues/206
						https://github.com/babel/babel/issues/7360
						https://github.com/prettier/prettier/issues/12047

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
						lines as significant, and JSX uses a bunch of fancy heuristics
						with regard to elements, text and interpolations to try and make
						things behave predictably.

							return (
								<div>
									<span>Hello</span>{" "}
									<span>World</span>
								</div>
							);

						The canonical problem for web developers is when attempting to put
						whitespace between “inline” elements on separate lines. The
						solution is to interpolate the whitespace as a raw string, but this
						is itself “ugly.” Neither the JSX grammar nor regular JavaScript
						include a way to escape newlines at the end of code.

						The root problem here is that the JSX grammar does not have a way
						to demark significant whitespace at the end of a line, which can be
						preserved by code formatters. At the same time, we don’t want to
						adopt the whitespace rules of HTML, which are pretty fucking
						insane.

							yield x`
								<div>
									<span>Hello</span> \
									<span>World</span>
								</div>
							`;

						Luckily, JavaScript template strings allow for Unix-style escapes
						of newlines. By backslash escaping newlines in template documents,
						we can allow significant whitespace between elements which are
						separated by newlines.

						Therefore, a template string-based API for JSX-like element
						creation should probably follow the following rules:

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
				}
			} else if (ch === ">") {
				// what the fuck
			} else if (ch === "/") {
				// what the fuck
			}
		}
	}

	expressions;
	return result;
}
