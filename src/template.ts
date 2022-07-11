import {c, Element} from "./crank.js";
import type {Tag} from "./crank.js";

export const t = template;

export default template;

export function template(
	spans: TemplateStringsArray,
	...expressions: Array<unknown>
): Element {
	const {element, targets} = parse(spans.raw);
	for (let i = 0; i < expressions.length; i++) {
		const exp = expressions[i];
		const target = targets[i];
		if (target) {
			target.value = exp;
		}
	}
	// TODO: cache the parse results
	return createElementsFromParse(element);
}

interface ParseElement {
	type: "element";
	open: ParseTag;
	close: ParseTag | null;
	props: Array<ParseProp | ParseSpreadProp>;
	children: Array<ParseElement | ParseValue>;
}

interface ParseValue {
	type: "value";
	value: any;
}

interface ParseTag {
	type: "tag";
	slash: string;
	value: any;
}

interface ParseSpreadProp {
	type: "spreadProp";
	value: any;
}

interface ParseProp {
	type: "prop";
	name: string;
	value: ParseValue | ParsePropString;
}

interface ParsePropString {
	type: "propString";
	parts: Array<string | ParseValue>;
}

/* Grammar
$CHILDREN: ($ELEMENT | $COMMENT | ${unknown} | [\S\s])*
// TODO: Maybe allow escaped angle brackets here.
$ELEMENT:
  $SELF_CLOSING_ELEMENT |
  $OPENING_ELEMENT $CHILDREN $CLOSING_ELEMENT
$SELF_CLOSING_ELEMENT: "<" ($IDENTIFIER | ${Tag}) $PROPS "/" ">"
$OPENING_ELEMENT: "<" ($IDENTIFIER | ${Tag})? $PROPS ">"
$CLOSING_ELEMENT: "<" "/" "/"? ($IDENTIFIER | ${Tag})? ">"
$PROPS: ($PROP | $SPREAD_PROP)*
// TODO: Maybe allow prop names to be expressions.
$PROP: $IDENTIFIER ("=" $PROP_VALUE)?
$SPREAD_PROP: "..." ${unknown}
$IDENTIFIER: [-_$\w]+
$PROP_VALUE:
  ('"' ('\\"' | [\S\s] | ${unknown})*? '"') |
  ("'" ("\\'" | [\S\s] | ${unknown})*? "'") |
  ${unknown}
$COMMENT: "<!--" ([\S\s] | ${unknown})*? "-->"
*/

/*
 * Matches first significant character in children mode.
 *
 * Group 1: newline
 * Group 2: comment
 * Group 3: tag
 * Group 4: closing slash
 * Group 5: tag name
 */
const CHILDREN_RE =
	/((?:\r|\n|\r\n)\s*)|(<!--[\S\s]*?(?:-->|$))|(<\s*(\/{0,2})\s*([-_$\w]*))/g;

/*
 * Matches props after element tags.
 *
 * Group 1: tag end
 * Group 2: spread props
 * Group 3: prop name
 * Group 4: equals
 * Group 5: prop value string
 */
const PROPS_RE =
	/\s*(?:(\/?\s*>)|(\.\.\.\s*)|(?:([-_$\w]+)\s*(=)?\s*(?:("(\\"|[\S\s])*?(?:"|$)|'(?:\\'|[\S\s])*?(?:'|$)))?))/g;

const CLOSING_BRACKET_RE = />/g;

const CLOSING_SINGLE_QUOTE_RE = /[^\\]?'/g;

const CLOSING_DOUBLE_QUOTE_RE = /[^\\]?"/g;

const CLOSING_COMMENT_RE = /-->/g;

type ExpressionTarget = ParseValue | ParseTag | ParseProp | ParseSpreadProp;

// TODO: Make ParseResult return targets.
interface ParseResult {
	element: ParseElement;
	targets: Array<ExpressionTarget | null>;
}

function parse(spans: ArrayLike<string>): ParseResult {
	let matcher = CHILDREN_RE as RegExp;
	const stack: Array<ParseElement> = [];
	let element: ParseElement = {
		type: "element",
		open: {type: "tag", slash: "", value: ""},
		close: null,
		props: [],
		children: [],
	};

	const targets: Array<ExpressionTarget | null> = [];
	let lineStart = true;
	for (let s = 0; s < spans.length; s++) {
		const span = spans[s];
		// Whether or not an expression is upcoming.
		const expressing = s < spans.length - 1;
		let expressionTarget: ExpressionTarget | null = null;
		for (let i = 0, end = i; i < span.length; i = end) {
			matcher.lastIndex = i;
			const match = matcher.exec(span);
			end = match ? match.index + match[0].length : span.length;
			switch (matcher) {
				case CHILDREN_RE:
					if (match) {
						const [, newline, comment, tag, closingSlash, tagName] = match;
						if (i < match.index) {
							let before = span.slice(i, match.index);
							if (lineStart) {
								before = before.replace(/^\s*/, "");
							}

							if (newline) {
								// We preserve whitespace before escaped newlines.
								//   t` \
								//   `
								if (span[Math.max(0, match.index - 1)] === "\\") {
									// remove the backslash
									before = before.slice(0, -1);
								} else {
									before = before.replace(/\s*$/, "");
								}
							}

							if (before) {
								element.children.push({type: "value", value: before});
							}
						}

						lineStart = !!newline;
						if (comment) {
							if (end === span.length) {
								// Expression in a comment:
								//   t`<!-- ${exp} -->`
								matcher = CLOSING_COMMENT_RE;
							}
						} else if (tag) {
							if (closingSlash) {
								element.close = {
									type: "tag",
									slash: closingSlash,
									value: tagName,
								};

								if (!stack.length) {
									// TODO: expressions
									throw new SyntaxError(`Unmatched closing tag "${tagName}"`);
								}

								if (end === span.length) {
									// TAG EXPRESSION
									expressionTarget = element.close;
								}

								element = stack.pop()!;
								matcher = CLOSING_BRACKET_RE;
							} else {
								const next: ParseElement = {
									type: "element",
									open: {
										type: "tag",
										slash: "",
										value: tagName,
									},
									close: null,
									props: [],
									children: [],
								};

								if (end === span.length) {
									// TAG EXPRESSION
									expressionTarget = next.open;
								}

								stack.push(element);
								element.children.push(next);
								element = next;
								matcher = PROPS_RE;
							}
						}
					} else {
						if (i < span.length) {
							let after = span.slice(i);
							if (!expressing) {
								after = after.replace(/\s*$/, "");
							}

							if (after) {
								element.children.push({type: "value", value: after});
							}
						}
					}

					break;

				case PROPS_RE:
					if (match) {
						const [, tagEnd, spread, name, equals, string] = match;
						if (i < match.index) {
							throw new SyntaxError(
								`Unexpected text \`${span.slice(i, match.index).trim()}\``,
							);
						}

						if (tagEnd) {
							if (tagEnd[0] === "/") {
								// This is a self-closing element, so there will always be a
								// result on the stack.
								element = stack.pop()!;
							}

							matcher = CHILDREN_RE;
						} else if (spread) {
							if (!(expressing && end === span.length)) {
								throw new SyntaxError(
									`Missing expression after "..." while parsing props for ${String(
										getTagDisplay(element.open.value),
									)}`,
								);
							}

							const value = {
								type: "spreadProp" as const,
								value: null,
							};
							element.props.push(value);
							// SPREAD PROP EXPRESSION
							expressionTarget = value;
						} else if (name) {
							let value: ParseValue | ParsePropString;
							if (string == null) {
								if (!equals) {
									value = {type: "value", value: true};
								} else if (end < span.length) {
									throw new SyntaxError(
										`Unexpected text \`${span.slice(end, end + 20)}\``,
									);
								} else if (!expressing) {
									throw new SyntaxError("Expression expected");
								} else {
									// PROP EXPRESSION
									value = {type: "value" as const, value: null};
									expressionTarget = value;
								}
							} else {
								const quote = string[0];
								value = {type: "propString", parts: []};
								value.parts.push(string);
								if (end === span.length) {
									matcher =
										quote === "'"
											? CLOSING_SINGLE_QUOTE_RE
											: CLOSING_DOUBLE_QUOTE_RE;
								}
							}

							const prop = {
								type: "prop" as const,
								name,
								value,
							};
							element.props.push(prop);
						}
					} else {
						if (!expressing) {
							// Not sure how much context to provide, 20 characters seems fine?
							throw new SyntaxError(
								`Unexpected text \`${span.slice(i, i + 20).trim()}\``,
							);
						}
					}
					break;

				case CLOSING_BRACKET_RE:
					// We’re in a self-closing slash and are looking for the >
					if (match) {
						if (i < match.index) {
							throw new SyntaxError(
								`Unexpected text \`${span.slice(i, match.index).trim()}\``,
							);
						}

						matcher = CHILDREN_RE;
					} else {
						// Not sure how much context to provide, 20 characters seems fine?
						if (!expressing) {
							throw new SyntaxError(
								`Unexpected text \`${span.slice(i, i + 20).trim()}\``,
							);
						}
					}
					break;

				case CLOSING_SINGLE_QUOTE_RE:
				case CLOSING_DOUBLE_QUOTE_RE: {
					const string = span.slice(i, end);
					const prop = element.props[element.props.length - 1] as ParseProp;
					const propString = prop.value as ParsePropString;
					propString.parts.push(string);
					if (match) {
						matcher = PROPS_RE;
					} else {
						if (!expressing) {
							throw new SyntaxError(
								`Missing \`${
									matcher === CLOSING_SINGLE_QUOTE_RE ? "'" : '"'
								}\``,
							);
						}
					}

					break;
				}

				case CLOSING_COMMENT_RE:
					if (match) {
						matcher = CHILDREN_RE;
					} else {
						if (!expressing) {
							throw new SyntaxError("Missing `-->`");
						}
					}

					break;
			}
		}

		if (expressing) {
			if (expressionTarget) {
				targets.push(expressionTarget);
				continue;
			}

			switch (matcher) {
				case CHILDREN_RE: {
					const target = {type: "value" as const, value: null};
					element.children.push(target);
					targets.push(target);
					break;
				}

				case CLOSING_SINGLE_QUOTE_RE:
				case CLOSING_DOUBLE_QUOTE_RE: {
					const prop = element.props[element.props.length - 1] as ParseProp;
					const target = {type: "value" as const, value: null};
					(prop.value as ParsePropString).parts.push(target);
					targets.push(target);
					break;
				}

				case CLOSING_COMMENT_RE:
					targets.push(null);
					break;

				default:
					throw new SyntaxError("Unexpected expression");
			}
		}

		lineStart = false;
	}

	if (stack.length) {
		// TODO: Figure out how to parameterize this
		throw new SyntaxError(
			`Unmatched opening tag "${getTagDisplay(element.open.value)}"`,
		);
	}

	if (element.children.length === 1 && element.children[0].type === "element") {
		element = element.children[0];
	}

	return {element, targets};
}

function getTagDisplay(tag: Tag) {
	return typeof tag === "function"
		? tag.name
		: typeof tag !== "string"
		? String(tag)
		: tag;
}

function formatString(str: string) {
	return (
		str
			// remove quotes
			.slice(1, -1)
			// deal with escaped characters
			.replace(/\\(.?)/g, "$1")
	);
}

function createElementsFromParse(parsed: ParseElement): Element {
	if (
		parsed.close !== null &&
		parsed.close.slash !== "//" &&
		parsed.open.value !== parsed.close.value
	) {
		throw new SyntaxError(
			`Mismatched closing tag "${getTagDisplay(
				parsed.close.value,
			)}" for opening tag "${getTagDisplay(parsed.open.value)}"`,
		);
	}

	const children: Array<unknown> = [];
	for (let i = 0; i < parsed.children.length; i++) {
		const child = parsed.children[i];
		children.push(
			child.type === "element" ? createElementsFromParse(child) : child.value,
		);
	}

	let props = parsed.props.length ? ({} as Record<string, unknown>) : null;
	for (let i = 0; i < parsed.props.length; i++) {
		const prop = parsed.props[i];
		if (prop.type === "prop") {
			if (prop.value.type === "value") {
				props![prop.name] = prop.value.value;
			} else {
				let string = "";
				for (let i = 0; i < prop.value.parts.length; i++) {
					const part = prop.value.parts[i];
					if (typeof part === "string") {
						string += part;
					} else if (typeof part.value !== "boolean" && part.value != null) {
						string +=
							typeof part.value === "string" ? part.value : String(part.value);
					}
				}

				props![prop.name] = formatString(string);
			}
		} else {
			props = {...props, ...(prop.value as any)};
		}
	}

	return c(parsed.open.value, props, ...children);
}
