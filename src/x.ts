import {createElement, Element} from "./crank.js";
import type {Component} from "./crank.js";

// TODO: Figure out if we want to narrow the types.
type XExpression = unknown;

export function x(
	// TODO: Is it better to use the raw string? I don’t know tbh.
	spans: TemplateStringsArray,
	...expressions: Array<XExpression>
): Element {
	const parsed = parse(spans, expressions);
	return createElementsFromParse(parsed);
}

// ARE THESE ALL THE SPECIAL CHARACTERS?
//const SPECIAL_CHARACTERS = [
//	`"`, // prop value separator
//	`'`, // prop value separator
//	"=", // prop key-value separator
//	"<", // tag start
//	">", // tag end
//	"/", // tag closer
//];

interface ParseElementResult {
	tag: Component | string;
	props: Record<string, any>;
	children: Array<ParseElementResult | string>;
}

function parse(
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
				if (mode === "children") {
					// TODO: The JSX whitespace rules are actually kinda complicated huh
					// READ UP
					// https://www.bennadel.com/blog/2880-a-quick-look-at-rendering-white-space-using-jsx-in-reactjs.htm
					// https://github.com/facebook/jsx/issues/6
					// https://github.com/facebook/jsx/issues/19
					// https://github.com/microsoft/TypeScript/issues/22186
					// https://github.com/developit/htm/issues/206
					// https://github.com/babel/babel/issues/7360
					// https://github.com/prettier/prettier/issues/12047
					//
					// https://github.com/facebook/jsx/issues/19#issuecomment-57079949
					// "Indenting/beautifying code should never affect the outcome, especially as it means all indentation has to carry over into the final code and cannot be minified away (yuck!). While there are a handful of cases where you might want the newlines to affect outcome, those are far better handled explicitly by {' '} or {'\n'}."
					//
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

//x`<div a=${1} b=${2}>World</div>`;

function createElementsFromParse(
	parsed: Array<ParseElementResult | string>,
): Element {
	// TODO: actually do this bro
	parsed;
	return createElement("p");
}
