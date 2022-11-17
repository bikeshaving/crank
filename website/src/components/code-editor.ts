import {jsx, Copy} from "@b9g/crank";
import type {Context, Element} from "@b9g/crank";

import {Edit} from "@b9g/revise/edit.js";
import {Keyer} from "@b9g/revise/keyer.js";
import {EditHistory} from "@b9g/revise/history.js";
import Prism from "prismjs";
import type {Token} from "prismjs";
import "prismjs/components/prism-typescript.js";
import {ContentArea} from "./contentarea.js";
import type {ContentAreaElement} from "@b9g/revise/contentarea";

function* Gutter(this: Context, {length}: {length: number}) {
	const numbers: Array<any> = [];
	for (let l = 0; l < length; l++) {
		numbers.push(jsx`
			<div class="prism-editor-linenumber">${l + 1}</div>
		`);
	}

	let initial = true;
	for (const {length: newLength} of this) {
		if (initial) {
			initial = false;
		} else {
			if (length < newLength) {
				for (let l = numbers.length; l < newLength; l++) {
					numbers.push(jsx`
						<div class="prism-editor-linenumber">${l + 1}</div>
					`);
				}
			} else if (length > newLength) {
				numbers.length = newLength;
			} else {
				yield jsx`<${Copy} />`;
				continue;
			}
		}

		yield jsx`
			<div
				style="
					/* this has to match the css of lines or it gets misaligned :( */
					margin: 0;
					padding: 1em .5em;
					color: #fff;
					font-size: 14px;
					font-family: monospace;
					line-height: 1.4;
					text-align: right;
				"
			>
				${numbers}
			</div>
		`;

		length = newLength;
	}
}

const IS_CLIENT = typeof document !== "undefined";

// TODO: Custom tabs
const TAB = "  ";

function Line({line}: {line: Array<Token | string>}) {
	return jsx`
		<div class="prism-line">
			${line.length ? jsx`<code>${printTokens(line)}</code>` : null}
			<br />
		</div>
	`;
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

			result.push(jsx`<span class=${className}>${children}</span>`);
		}
	}

	return result;
}

export function* CodeEditor(
	this: Context,
	{
		value,
		language,
		editable,
		showGutter,
	}: {
		value: string;
		language: string;
		editable?: boolean;
		showGutter?: boolean;
	},
) {
	const keyer = new Keyer();
	let editHistory = new EditHistory();
	let selectionRange: SelectionRange | undefined;
	let renderSource: string | undefined;
	let area!: ContentAreaElement;
	this.addEventListener("contentchange", (ev: any) => {
		if (ev.detail.source != null) {
			return;
		}

		value = ev.target.value;
		renderSource = "refresh";
		this.refresh();
	});

	{
		// key stuff
		this.addEventListener("contentchange", (ev: any) => {
			const {edit} = ev.detail;
			keyer.transform(edit);
		});
	}

	{
		// history stuff
		const undo = () => {
			const edit = editHistory.undo();
			if (edit) {
				value = edit.apply(value);
				selectionRange = selectionRangeFromEdit(edit);
				renderSource = "history";
				this.refresh();
				return true;
			}

			return false;
		};

		const redo = () => {
			const edit = editHistory.redo();
			if (edit) {
				value = edit.apply(value);
				selectionRange = selectionRangeFromEdit(edit);
				renderSource = "history";
				this.refresh();
				return true;
			}

			return false;
		};

		this.addEventListener("beforeinput", (ev: InputEvent) => {
			switch (ev.inputType) {
				case "historyUndo": {
					if (undo()) {
						ev.preventDefault();
					}

					break;
				}
				case "historyRedo": {
					if (redo()) {
						ev.preventDefault();
					}

					break;
				}
			}
		});

		this.addEventListener("keydown", (ev: KeyboardEvent) => {
			if (
				ev.keyCode === 0x5a /* Z */ &&
				!ev.altKey &&
				((ev.metaKey && !ev.ctrlKey) || (!ev.metaKey && ev.ctrlKey))
			) {
				if (ev.shiftKey) {
					redo();
				} else {
					undo();
				}

				ev.preventDefault();
			} else if (
				ev.keyCode === 0x59 /* Y */ &&
				ev.ctrlKey &&
				!ev.altKey &&
				!ev.metaKey
			) {
				redo();
				ev.preventDefault();
			}
		});

		if (IS_CLIENT) {
			checkpointEditHistory(this, editHistory);
		}

		this.addEventListener("contentchange", (ev: any) => {
			const {edit, source} = ev.detail;
			//console.log(edit, source);
			//console.trace();
			if (source !== "history") {
				editHistory.append(edit.normalize());
			}
		});
	}

	{
		// Potato tab matching.
		// TODO: clear empty lines of whitespace on enter
		// TODO: tab/shift tab
		this.addEventListener("keydown", (ev: any) => {
			const {selectionStart, selectionEnd} = area;
			if (ev.key === "Enter") {
				if (selectionStart !== selectionEnd) {
					return;
				}

				const prevLine = getPreviousLine(value, selectionStart);
				const [, spaceBefore, bracket] = prevLine.match(
					/(\s*).*?(\(|\[|{)?(?:\s*)$/,
				)!;
				let insert = "\n" + (spaceBefore || "");
				if (bracket) {
					insert += TAB;
				}
				const edit = Edit.builder(value)
					.retain(selectionStart)
					.insert(insert)
					.build();
				renderSource = "newline";
				value = edit.apply(value);
				selectionRange = {
					selectionStart: selectionStart + insert.length,
					selectionEnd: selectionStart + insert.length,
					selectionDirection: "none",
				};
				ev.preventDefault();
				this.refresh();
			} else if (ev.key === "Tab") {
				// TODO: handle tabs and shift tabs
			}
		});
	}

	let value1: string;
	for ({value: value1, language, editable = true, showGutter} of this) {
		this.schedule(() => {
			selectionRange = undefined;
			renderSource = undefined;
		});

		if (renderSource == null) {
			value = value1;
		}

		// adding a line so that we can do shit
		value = value.match(/(?:\r|\n|\r\n)$/) ? value : value + "\n";
		const grammar = Prism.languages[language] || Prism.languages.javascript;
		const lines = splitLines(Prism.tokenize(value || "", grammar));
		//const lines = value.split("\n").map((l) => [l]).slice(0, -1);
		let index = 0;
		yield jsx`
			<div
				style="
					display: flex;
					flex-direction: row;
					position: relative;
					overflow: auto;
					height: 100%;
				"
			>
				${showGutter && jsx`<${Gutter} length=${lines.length} />`}
				<${ContentArea}
					value=${value}
					renderSource=${renderSource}
					selectionRange=${selectionRange}
					style="
						display: block;
						flex: 1 1 auto;
						white-space: pre-wrap;
						white-space: break-spaces;
						word-break: break-all;
						width: 100%;
					"
					$ref=${(area1: ContentAreaElement) => (area = area1)}
				>
					<pre
						autocomplete="off"
						autocorrect="off"
						autocapitalize="off"
						contenteditable=${IS_CLIENT && editable}
						spellcheck="false"
						style="
							${showGutter && "border-left: 1px solid white;"}
							min-height: 100%;
						"
					>
					${lines.map((line) => {
						const key = keyer.keyAt(index);
						const length =
							line.reduce((length, t) => length + t.length, 0) + "\n".length;
						try {
							return jsx`<${Line} $key=${key + "line"} line=${line} />`;
						} finally {
							index += length;
						}
					})}
					</pre>
				<//ContentArea>
			</div>
		`;
	}
}

// TODO: move this to prism-utils file
// @ts-ignore
Prism.manual = true;

function splitLines(
	tokens: Array<Token | string>,
): Array<Array<Token | string>> {
	const lines = splitLinesRec(tokens);
	// Dealing with trailing newlines
	if (lines.length && !lines[lines.length - 1].length) {
		lines.pop();
	}

	return lines;
}

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

function getPreviousLine(text: string, index: number) {
	index = Math.max(0, index);
	for (let i = index - 1; i >= 0; i--) {
		if (text[i] === "\n" || text[i] === "\r") {
			return text.slice(i + 1, index);
		}
	}

	return text.slice(0, index);
}

interface SelectionRange {
	selectionStart: number;
	selectionEnd: number;
	selectionDirection: string;
}

/*** Revise Logic ***/
async function checkpointEditHistory(ctx: Context, editHistory: EditHistory) {
	const contentArea = (
		(await new Promise((resolve) => ctx.schedule(resolve))) as any
	).querySelector("content-area");
	let oldSelectionRange: SelectionRange | undefined;
	ctx.addEventListener("contentchange", () => {
		oldSelectionRange = {
			selectionStart: contentArea.selectionStart,
			selectionEnd: contentArea.selectionEnd,
			selectionDirection: contentArea.selectionDirection,
		};
	});

	const onselectionchange = () => {
		const newSelectionRange = {
			selectionStart: contentArea.selectionStart,
			selectionEnd: contentArea.selectionEnd,
			selectionDirection: contentArea.selectionDirection,
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

	const onblur = () => {
		editHistory.checkpoint();
	};

	document.addEventListener("selectionchange", onselectionchange);
	contentArea.addEventListener("blur", onblur);
	ctx.cleanup(() => {
		document.removeEventListener("selectionchange", onselectionchange);
		contentArea.removeEventListener("blur", onblur);
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
