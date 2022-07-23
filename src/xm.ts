import {c} from "./crank.js";
import type {Element} from "./crank.js";

const cache = new Map<string, ParseResult>();
export function xm(
	spans: TemplateStringsArray,
	...expressions: Array<unknown>
): Element {
	const key = JSON.stringify(spans.raw);
	let parseResult = cache.get(key);
	if (parseResult == null) {
		parseResult = parse(spans.raw);
		cache.set(key, parseResult);
	}

	const {element, targets} = parseResult;
	for (let i = 0; i < expressions.length; i++) {
		const exp = expressions[i];
		const target = targets[i];
		if (target) {
			if (target.type === "error") {
				throw new SyntaxError(
					target.message.replace("${}", formatTagForError(exp)),
				);
			}

			target.value = exp;
		}
	}

	return build(element);
}

// Type definitions for a bare-bones AST
interface ParseElement {
	type: "element";
	open: ParseTag;
	close: ParseTag | null;
	// ParseValue is used to represent spread props.
	props: Array<ParseProp | ParseValue>;
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

interface ParseProp {
	type: "prop";
	name: string;
	value: ParseValue | ParsePropString;
}

interface ParsePropString {
	type: "propString";
	parts: Array<string | ParseValue>;
}

interface ParseError {
	type: "error";
	message: string;
	value: any;
}

// The parse result includes an array of targets, references to objects in the
// parse tree whose value property is overwritten with expressions expressions
// whenever the template function is called. By separating the logic of parsing
// static template spans from the handling of dynamic expressions, we can cache
// parse results for successive calls.
type ExpressionTarget = ParseValue | ParseTag | ParseProp | ParseError;

interface ParseResult {
	element: ParseElement;
	targets: Array<ExpressionTarget | null>;
}

/**
 * Matches first significant character in children mode.
 *
 * Group 1: newline
 * Group 2: comment
 * Group 3: tag
 * Group 4: closing slash
 * Group 5: tag name
 *
 * The comment group must appear first because the tag group can potentially
 * match a comment, so that we can handle tag expressions where we’ve reached
 * the end of a span.
 */
const CHILDREN_RE =
	/((?:\r|\n|\r\n)\s*)|(<!--[\S\s]*?(?:-->|$))|(<\s*(\/{0,2})\s*([-_$\w]*))/g;

/**
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

function parse(spans: ArrayLike<string>): ParseResult {
	let matcher = CHILDREN_RE;
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
		// Whether or not an expression is upcoming. Used to provide better errors.
		const expressing = s < spans.length - 1;
		let expressionTarget: ExpressionTarget | null = null;
		for (let i = 0, end = i; i < span.length; i = end) {
			matcher.lastIndex = i;
			const match = matcher.exec(span);
			end = match ? match.index + match[0].length : span.length;
			switch (matcher) {
				case CHILDREN_RE: {
					if (match) {
						const [, newline, comment, tag, closingSlash, tagName] = match;
						if (i < match.index) {
							let before = span.slice(i, match.index);
							if (lineStart) {
								before = before.replace(/^\s*/, "");
							}

							if (newline) {
								if (span[Math.max(0, match.index - 1)] === "\\") {
									// We preserve whitespace before escaped newlines.
									//   xm` \
									//   `
									// remove the backslash from output
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
								//   xm`<!-- ${exp} -->`
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
									if (end !== span.length) {
										throw new SyntaxError(`Unmatched closing tag "${tagName}"`);
									}

									// ERROR EXPRESSION
									expressionTarget = {
										type: "error",
										message: "Unmatched closing tag ${}",
										value: null,
									};
								} else {
									if (end === span.length) {
										// TAG EXPRESSION
										expressionTarget = element.close;
									}

									element = stack.pop()!;
									matcher = CLOSING_BRACKET_RE;
								}
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

								element.children.push(next);
								stack.push(element);
								element = next;
								matcher = PROPS_RE;
								if (end === span.length) {
									// TAG EXPRESSION
									expressionTarget = element.open;
								}
							}
						}
					} else {
						if (i < span.length) {
							let after = span.slice(i);
							if (!expressing) {
								// trim trailing whitespace
								after = after.replace(/\s*$/, "");
							}

							if (after) {
								element.children.push({type: "value", value: after});
							}
						}
					}

					break;
				}

				case PROPS_RE: {
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
							const value = {
								type: "value" as const,
								value: null,
							};
							element.props.push(value);
							// SPREAD PROP EXPRESSION
							expressionTarget = value;
							if (!(expressing && end === span.length)) {
								throw new SyntaxError('Expression expected after "..."');
							}
						} else if (name) {
							let value: ParseValue | ParsePropString;
							if (string == null) {
								if (!equals) {
									value = {type: "value", value: true};
								} else if (end < span.length) {
									throw new SyntaxError(
										`Unexpected text \`${span.slice(end, end + 20)}\``,
									);
								} else {
									value = {type: "value" as const, value: null};
									// PROP EXPRESSION
									expressionTarget = value;
									if (!(expressing && end === span.length)) {
										throw new SyntaxError(
											`Expression expected for prop "${name}"`,
										);
									}
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
							if (i === span.length) {
								throw new SyntaxError(
									`Expected props but reached end of document`,
								);
							} else {
								throw new SyntaxError(
									`Unexpected text \`${span.slice(i, i + 20).trim()}\``,
								);
							}
						}

						// Unexpected expression errors are handled in the outer loop.
						//
						// This would most likely be the starting point for the logic of
						// prop name expressions.
						//   xm`<p ${name}=${value}>`
					}

					break;
				}

				case CLOSING_BRACKET_RE: {
					// We’re in a closing tag and looking for the >.
					if (match) {
						if (i < match.index) {
							throw new SyntaxError(
								`Unexpected text \`${span.slice(i, match.index).trim()}\``,
							);
						}

						matcher = CHILDREN_RE;
					} else {
						if (!expressing) {
							throw new SyntaxError(
								`Unexpected text \`${span.slice(i, i + 20).trim()}\``,
							);
						}
					}

					break;
				}

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

				case CLOSING_COMMENT_RE: {
					if (match) {
						matcher = CHILDREN_RE;
					} else {
						if (!expressing) {
							throw new SyntaxError(
								"Expected `-->` but reached end of template",
							);
						}
					}

					break;
				}
			}
		}

		if (expressing) {
			if (expressionTarget) {
				targets.push(expressionTarget);
				if (expressionTarget.type === "error") {
					break;
				}

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
		} else if (expressionTarget) {
			throw new SyntaxError("Expression expected");
		}

		lineStart = false;
	}

	if (stack.length) {
		const ti = targets.indexOf(element.open);
		if (ti === -1) {
			throw new SyntaxError(`Unmatched opening tag "${element.open.value}"`);
		}

		targets[ti] = {
			type: "error",
			message: "Unmatched opening tag ${}",
			value: null,
		};
	}

	if (element.children.length === 1 && element.children[0].type === "element") {
		element = element.children[0];
	}

	return {element, targets};
}

function build(parsed: ParseElement): Element {
	if (
		parsed.close !== null &&
		parsed.close.slash !== "//" &&
		parsed.open.value !== parsed.close.value
	) {
		throw new SyntaxError(
			`Unmatched closing tag ${formatTagForError(
				parsed.close.value,
			)}, expected ${formatTagForError(parsed.open.value)}`,
		);
	}

	const children: Array<unknown> = [];
	for (let i = 0; i < parsed.children.length; i++) {
		const child = parsed.children[i];
		children.push(child.type === "element" ? build(child) : child.value);
	}

	let props = parsed.props.length ? ({} as Record<string, unknown>) : null;
	for (let i = 0; i < parsed.props.length; i++) {
		const prop = parsed.props[i];
		if (prop.type === "prop") {
			let value: any;
			if (prop.value.type === "value") {
				value = prop.value.value;
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
				value = string
					// remove quotes
					.slice(1, -1)
					// unescape things
					// adapted from https://stackoverflow.com/a/57330383/1825413
					.replace(
						/\\[0-9]|\\['"bfnrtv]|\\x[0-9a-f]{2}|\\u[0-9a-f]{4}|\\u\{[0-9a-f]+\}|\\./gi,
						(match) => {
							switch (match[1]) {
								case "'":
								case '"':
								case "\\":
									return match[1];
								case "b":
									return "\b";
								case "f":
									return "\f";
								case "n":
									return "\n";
								case "r":
									return "\r";
								case "t":
									return "\t";
								case "v":
									return "\v";
								case "u":
									if (match[2] === "{") {
										return String.fromCodePoint(
											parseInt(match.slice(3, -1), 16),
										);
									}

									return String.fromCharCode(parseInt(match.slice(2), 16));
								case "x":
									return String.fromCharCode(parseInt(match.slice(2), 16));
								case "0":
									return "\0";
								default:
									return match.slice(1);
							}
						},
					);
			}

			props![prop.name] = value;
		} else {
			// spread prop
			props = {...props, ...(prop.value as any)};
		}
	}

	return c(parsed.open.value, props, ...children);
}

function formatTagForError(tag: unknown): string {
	return typeof tag === "function"
		? tag.name + "()"
		: typeof tag === "string"
		? `"${tag}"`
		: JSON.stringify(tag);
}
