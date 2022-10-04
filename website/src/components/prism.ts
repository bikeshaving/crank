import {xm} from "@b9g/crank";
import type {Context, Element} from "@b9g/crank";

import {Edit} from "@b9g/revise/edit.js";
import {Keyer} from "@b9g/revise/keyer.js";
import {EditHistory} from "@b9g/revise/history.js";
import type {ContentAreaElement} from "@b9g/revise/contentarea.js";

import Prism from "prismjs";
import type {Token} from "prismjs";
import "prismjs/components/prism-typescript.js";
import {ContentArea} from "./contentarea.js";
import * as Sucrase from "sucrase";

function* Preview(
	this: Context,
	{value}: {value: string},
): Generator<any, any, any> {
	let iframe: HTMLIFrameElement;
	for ({value} of this) {
		this.flush(() => {
			const document1 = iframe.contentDocument;
			if (document1 == null) {
				return;
			}

			try {
				const parsed = Sucrase.transform(value, {
					transforms: ["jsx", "typescript"],
					jsxPragma: "createElement",
					jsxFragmentPragma: "''",
				});

				document1.write(`
					<style>
						body {
							color: #f5f9ff;
						}
					</style>
				`);
				document1.write(`<script type="module">${parsed.code}</script>`);
				document1.close();
			} catch (err) {
				// TODO: Display errors in preview.
				console.error(err);
			}
		});

		yield xm`
			<iframe
				class="preview"
				c-ref=${(iframe1: any) => (iframe = iframe1)}
				src="about:blank"
			/>
		`;
	}
}

interface SelectionRange {
	selectionStart: number;
	selectionEnd: number;
	selectionDirection: "forward" | "backward" | "none";
}

// TODO: I need to separate the playground component from the codeblock component somehow
export function* CodeBlock(
	this: Context,
	{value, lang}: {value: string; lang: string},
) {
	let selectionRange: SelectionRange | undefined;
	let area: ContentAreaElement;
	let renderSource: string | undefined;
	const editHistory = new EditHistory();
	const keyer = new Keyer();
	let rest: string;
	{
		const i = lang.indexOf(" ");
		if (i === -1) {
			rest = "";
		} else {
			[lang, rest] = [lang.slice(0, i), lang.slice(i + 1)];
		}
	}

	const isLive = rest === "live";
	this.addEventListener("contentchange", (ev: any) => {
		if (!isLive) {
			renderSource = "contentchange";
			this.refresh();
			return;
		}

		const {edit, source} = ev.detail;
		keyer.transform(edit);
		if (source === "render") {
			return;
		} else if (source !== "history") {
			editHistory.append(edit);
		}

		value = ev.target.value;
		renderSource = "contentchange";
		this.refresh();
	});

	//this.addEventListener("keydown", (ev: any) => {
	//	if (ev.key === "Enter") {
	//		// Potato quality tab-matching.
	//		let {value: value1, selectionStart: selectionStart1, selectionEnd} = area;
	//		if (selectionStart1 !== selectionEnd) {
	//			return;
	//		}

	//		// A reasonable length to look for tabs and braces.
	//		const prev = value.slice(0, selectionStart1);
	//		const tabMatch = prev.match(/[\r\n]?([^\S\r\n]*).*$/);
	//		// [^\S\r\n] = non-newline whitespace
	//		const prevMatch = prev.match(/({|\(|\[)([^\S\r\n]*)$/);
	//		if (prevMatch) {
	//			// increase tab
	//			ev.preventDefault();
	//			const next = value1.slice(selectionStart1);
	//			const startBracket = prevMatch[1];
	//			const startWhitespace = prevMatch[2];
	//			let insertBefore = "\n";
	//			if (tabMatch) {
	//				insertBefore += tabMatch[1] + "  ";
	//			}

	//			let edit = Edit.build(
	//				value1,
	//				insertBefore,
	//				selectionStart1,
	//				selectionStart1 + startWhitespace.length,
	//			);

	//			selectionStart1 -= startWhitespace.length;
	//			selectionStart1 += insertBefore.length;

	//			const closingMap: Record<string, string> = {
	//				"{": "}",
	//				"(": ")",
	//				"[": "]",
	//			};
	//			let closing = closingMap[startBracket];
	//			if (closing !== "}") {
	//				closing = "\\" + closing;
	//			}
	//			const nextMatch = next.match(
	//				new RegExp(String.raw`^([^\S\r\n]*)${closing}`),
	//			);

	//			if (nextMatch) {
	//				const value2 = edit.apply(value1);
	//				const endWhitespace = nextMatch[1];
	//				const insertAfter = tabMatch ? "\n" + tabMatch[1] : "\n";
	//				const edit1 = Edit.build(
	//					value2,
	//					insertAfter,
	//					selectionStart1,
	//					selectionStart1 + endWhitespace.length,
	//				);

	//				edit = edit.compose(edit1);
	//			}

	//			value = edit.apply(value1);
	//			selectionRange = {
	//				selectionStart: selectionStart1,
	//				selectionEnd: selectionStart1,
	//				selectionDirection: "none",
	//			};
	//			this.refresh();
	//		} else if (tabMatch && tabMatch[1].length) {
	//			// match the tabbing of the previous line
	//			ev.preventDefault();
	//			const insertBefore = "\n" + tabMatch[1];
	//			const edit = Edit.build(value1, insertBefore, selectionStart1);
	//			value = edit.apply(value1);
	//			selectionRange = {
	//				selectionStart: selectionStart1 + insertBefore.length,
	//				selectionEnd: selectionStart1 + insertBefore.length,
	//				selectionDirection: "none",
	//			};
	//			this.refresh();
	//		}
	//	}
	//});

	this.addEventListener("beforeinput", (ev: any) => {
		switch (ev.inputType) {
			case "historyUndo": {
				ev.preventDefault();
				const edit = editHistory.undo();
				if (edit) {
					selectionRange = selectionRangeFromEdit(edit);
					value = edit.apply(value);
					renderSource = "history";
					this.refresh();
				}
				break;
			}
			case "historyRedo": {
				ev.preventDefault();
				const edit = editHistory.redo();
				if (edit) {
					value = edit.apply(value);
					selectionRange = selectionRangeFromEdit(edit);
					renderSource = "history";
					this.refresh();
				}
				break;
			}
		}
	});

	this.schedule((el) => {
		if (typeof document !== "undefined") {
			area = el.querySelector("content-area");
			checkpointEditHistoryBySelection(area, this, editHistory);
		}
	});
	for ({lang} of this) {
		this.schedule(() => {
			selectionRange = undefined;
			renderSource = undefined;
		});

		value = value.match(/(?:\r|\n|\r\n)$/) ? value : value + "\n";
		let rest: string;
		{
			const i = lang.indexOf(" ");
			if (i === -1) {
				rest = "";
			} else {
				[lang, rest] = [lang.slice(0, i), lang.slice(i + 1)];
			}
		}

		const grammar = Prism.languages[lang];
		let lines: Array<Array<string | Token>>;
		if (grammar == null) {
			lines = [];
		} else {
			lines = splitLines(Prism.tokenize(value || "", grammar));
		}

		const isClient = typeof document !== "undefined";
		let cursor = 0;

		yield xm`
			<div class="playground">
				<${ContentArea}
					c-ref=${(area1: any) => (area = area1)}
					value=${value}
					renderSource=${renderSource}
					selectionRange=${selectionRange}
					style="display: block;"
				>
					<pre
						class="editable ${isLive && "editable-live"}"
						autocomplete="off"
						autocorrect="off"
						autocapitalize="off"
						spellcheck="false"
						contenteditable=${isClient && isLive}
					>
						${lines.map((line) => {
							const key = keyer.keyAt(cursor);
							const length = line.reduce((l, t) => l + t.length, 0);
							cursor += length + 1;
							return xm`
								<div c-key=${key}>
									<code>${printTokens(line)}</code><br />
								</div>
							`;
						})}
					</pre>
				</${ContentArea}>
				${
					typeof document !== "undefined" &&
					rest === "live" &&
					xm`<${Preview} value=${value} />`
				}
			</div>
		`;
	}
}

/*** Prism Logic ***/
// @ts-ignore
Prism.manual = true;
function splitLinesRec(
	tokens: Array<Token | string>,
): Array<Array<Token | string>> {
	let currentLine: Array<Token | string> = [];
	const lines: Array<Array<Token | string>> = [currentLine];
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (typeof token === "string") {
			const split = token.split(/\r\n|\r|\n/);
			for (let j = 0; j < split.length; j++) {
				if (j > 0) {
					lines.push((currentLine = []));
				}

				const token1 = split[j];
				if (token1) {
					currentLine.push(token1);
				}
			}
		} else {
			const split = splitLinesRec(wrapContent(token.content));
			if (split.length > 1) {
				for (let j = 0; j < split.length; j++) {
					if (j > 0) {
						lines.push((currentLine = []));
					}

					const line = split[j];
					if (line.length) {
						const token1 = new Prism.Token(
							token.type,
							unwrapContent(line),
							token.alias,
						);
						token1.length = line.reduce((l, t) => l + t.length, 0);
						currentLine.push(token1);
					}
				}
			} else {
				currentLine.push(token);
			}
		}
	}

	return lines;
}

function wrapContent(
	content: Array<Token | string> | Token | string,
): Array<Token | string> {
	return Array.isArray(content) ? content : [content];
}

function unwrapContent(
	content: Array<Token | string>,
): Array<Token | string> | string {
	if (content.length === 0) {
		return "";
	} else if (content.length === 1 && typeof content[0] === "string") {
		return content[0];
	}

	return content;
}

export function splitLines(
	tokens: Array<Token | string>,
): Array<Array<Token | string>> {
	const lines = splitLinesRec(tokens);
	// Dealing with trailing newlines
	if (lines.length && !lines[lines.length - 1].length) {
		lines.pop();
	}

	return lines;
}

function printTokens(tokens: Array<Token | string>): Array<Element | string> {
	const result: Array<Element | string> = [];
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (typeof token === "string") {
			result.push(token);
		} else {
			const children = Array.isArray(token.content)
				? printTokens(token.content)
				: token.content;
			let className = "token " + token.type;
			if (Array.isArray(token.alias)) {
				className += " " + token.alias.join(" ");
			} else if (typeof token.alias === "string") {
				className += " " + token.alias;
			}

			result.push(xm`<span class=${className}>${children}</span>`);
		}
	}

	return result;
}

/*** Revise Logic ***/
function checkpointEditHistoryBySelection(
	area: ContentAreaElement,
	ctx: Context,
	editHistory: EditHistory,
): void {
	let oldSelectionRange: SelectionRange | undefined;
	ctx.addEventListener("contentchange", () => {
		oldSelectionRange = {
			selectionStart: area.selectionStart,
			selectionEnd: area.selectionEnd,
			selectionDirection: area.selectionDirection,
		};
	});

	const onselectionchange = () => {
		if (!area) {
			return;
		}

		const newSelectionRange = {
			selectionStart: area.selectionStart,
			selectionEnd: area.selectionEnd,
			selectionDirection: area.selectionDirection,
		};
		if (
			oldSelectionRange &&
			(oldSelectionRange.selectionStart !== newSelectionRange.selectionStart ||
				oldSelectionRange.selectionEnd !== newSelectionRange.selectionEnd ||
				oldSelectionRange.selectionDirection !==
					newSelectionRange.selectionDirection)
		) {
			editHistory.checkpoint();
		}

		oldSelectionRange = newSelectionRange;
	};

	document.addEventListener("selectionchange", onselectionchange);
	ctx.cleanup(() => {
		document.removeEventListener("selectionchange", onselectionchange);
	});
}

function selectionRangeFromEdit(edit: Edit): SelectionRange | undefined {
	const operations = edit.operations();
	let index = 0;
	let start: number | undefined;
	let end: number | undefined;
	for (const op of operations) {
		switch (op.type) {
			case "delete": {
				if (start === undefined) {
					start = index;
				}

				break;
			}

			case "insert": {
				if (start === undefined) {
					start = index;
				}

				index += op.value.length;
				end = index;
				break;
			}

			case "retain": {
				index += op.end - op.start;
				break;
			}
		}
	}

	if (start !== undefined && end !== undefined) {
		return {
			selectionStart: start,
			selectionEnd: end,
			selectionDirection: "forward",
		};
	} else if (start !== undefined) {
		return {
			selectionStart: start,
			selectionEnd: start,
			selectionDirection: "none",
		};
	}

	return undefined;
}
