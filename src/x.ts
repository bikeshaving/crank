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

// ARE THESE ALL THE SPECIAL CHARACTERS
//const SPECIAL_CHARACTERS = [
//	`"`, // prop value separator
//	`'`, // prop value separator
//	"=", // prop key-value separator
//	"<", // tag start
//	">", // tag end
//	"/", // tag closer
//];

interface ChildState {
	type: "child";
	children: Array<TagState | string>;
}

interface TagState {
	type: "tag";
	value: string | Component | null;
	props: PropsState;
}

interface PropsState {
	type: "props";
	value: Record<string, any>;
}

type ParseState = ChildState | TagState | PropsState;

function parse(
	spans: TemplateStringsArray,
	expressions: Array<XExpression>,
): unknown {
	let state: ParseState = {
		type: "child",
		children: [],
	};

	for (let i = 0; i < spans.length; i++) {
		const span = spans[i];
		for (let j = 0; j < span.length; j++) {
			const ch = span[j];
			if (!ch.trim()) {
				continue;
			} else if (state.type === "tag") {
				// what the fuck
			} else if (ch === "<") {
				if (state.type === "child") {
					const state1: TagState = {
						type: "tag",
						value: null,
						props: {
							type: "props",
							value: {},
						},
					} as const;
					state.children.push(state1);
					state = state1;
				}
			} else if (ch === ">") {
				// what the fuck
			} else if (ch === "/") {
				// what the fuck
			}
		}
	}

	expressions;
	return 1;
}

//x`<div a=${1} b=${2}>World</div>`;

function createElementsFromParse(parsed: unknown): Element {
	parsed;
	return createElement("p");
}
