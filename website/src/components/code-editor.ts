import {Copy, jsx} from "@b9g/crank/standalone";
import type {Context, Element as CrankElement} from "@b9g/crank";
import {css} from "@emotion/css";
import {Edit} from "@b9g/revise/edit.js";

import {Keyer} from "@b9g/revise/keyer.js";
import {EditHistory} from "@b9g/revise/history.js";
import type {ContentAreaElement} from "@b9g/revise/contentarea.js";

import type {Token} from "prismjs";

//import {parser} from "@lezer/javascript";
import {ContentArea} from "./contentarea.js";
import {tokenize} from "../utils/prism.js";

function* Gutter(this: Context<typeof Gutter>, {length}: {length: number}) {
	let initial = true;
	let newLength: number;
	const lines = Array.from({length}, (_, i) => i + 1);
	for ({length: newLength} of this) {
		if (length === newLength) {
			if (!initial) {
				yield jsx`<${Copy} />`;
				continue;
			}
		} else {
			if (length < newLength) {
				lines.push(
					...Array.from({length: newLength - length}, (_, i) => i + length + 1),
				);
			} else {
				lines.splice(newLength);
			}
		}

		yield jsx`
			<div
				copy=${length === newLength}
				class="blur-background ${css`
					display: none;
					@media (min-width: 800px) {
						display: flex;
					}
					flex-direction: column;
					flex: none;
					margin: 0;
					padding: 1.1em 0.5em 0.9em 0.8em;
					font-size: 14px;
					font-family: monospace;
					line-height: 1.6;
					text-align: right;
					border-right: 1px solid var(--text-color);
					position: sticky;
					left: 0;
				`}"
			>
				${lines.map(
					(line) => jsx`
					<div
						class="prism-line ${css`
							border-top: 1px solid transparent;
							color: var(--coldark03);
						`}">
							${line}
						</div>
				`,
				)}
			</div>
		`;
		initial = false;
		length = newLength;
	}
}

const IS_CLIENT = typeof document !== "undefined";

// TODO: Custom tabs
const TAB = "  ";

function Line(
	this: Context<typeof Line>,
	{
		line,
		lineNumber,
	}: {
		line: Array<Token | string>;
		lineNumber: number;
	},
) {
	return jsx`
		<div
			class="
				prism-line
				${css`
					border-bottom: 1px dotted #333;
					.color-scheme-light & {
						border-bottom: 1px dotted #ddd;
					}
				`}
			"
			data-index=${lineNumber}
		>
			${line.length ? jsx`<code>${printTokens(line)}</code>` : null}
			<br />
		</div>
	`;
}

function printTokens(
	tokens: Array<Token | string>,
): Array<CrankElement | string> {
	const result: Array<CrankElement | string> = [];
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
		copy,
	}: {
		value: string;
		language: string;
		editable?: boolean;
		showGutter?: boolean;
		copy?: boolean;
	},
) {
	let copied = false;
	const copyToClipboard = async () => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			await navigator.clipboard.writeText(value);
			copied = true;
			this.refresh();
			setTimeout(() => {
				copied = false;
				this.refresh();
			}, 2000);
		}
	};
	const keyer = new Keyer();
	let selectionRange: SelectionRange | undefined;
	let renderSource: string | undefined;
	let area!: ContentAreaElement;
	{
		// key stuff
		let initial = true;
		this.addEventListener("contentchange", (ev: any) => {
			if (initial) {
				initial = false;
				return;
			}

			const {edit, source} = ev.detail;
			// TODO: when edits are dynamically created, ghost keys are created.
			// This is because keyer.keyAt() is called before the edit transforms the
			// keyer.keys array, creating unnecessary keys.
			if (source !== "newline" && source !== "history") {
				keyer.transform(edit);
			}
		});
	}

	this.addEventListener("contentchange", (ev: any) => {
		if (ev.detail.source != null) {
			return;
		}

		ev.preventDefault();
		value = ev.target.value;
		renderSource = "refresh";
		this.refresh();
	});

	let editHistory = new EditHistory();
	{
		// history stuff
		const undo = () => {
			const edit = editHistory.undo();
			if (edit) {
				value = edit.apply(value);
				selectionRange = selectionRangeFromEdit(edit);
				keyer.transform(edit);
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
				keyer.transform(edit);
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
			if (source !== "history" && source !== null) {
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
				keyer.transform(edit);
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
				// TODO:
			} else if (ev.key === "Escape") {
				// TODO:
			}
		});
	}

	let value1: string;
	// TODO: parameterize newlines
	for ({value: value1, language, editable = true, showGutter} of this) {
		this.schedule(() => {
			selectionRange = undefined;
			renderSource = undefined;
		});

		if (renderSource == null) {
			value = value1;
			renderSource = "update";
		}

		// make sure the value always ends with a newline
		value = value.match(/(?:\r|\n|\r\n)$/) ? value : value + "\n";

		const lineTokens = tokenize(value, language || "javascript");
		let index = 0;
		const result = jsx`
			<div
				class=${css`
					position: relative;
					min-height: 100%;
					width: 100%;
					display: flex;
					background-color: var(--bg-color);
				`}
			>
				${
					copy &&
					jsx`
					<button
						onclick=${copyToClipboard}
						class=${css`
							position: absolute;
							top: 0.5em;
							right: 0.5em;
							z-index: 10;
							padding: 0.3em 0.6em;
							font-size: 12px;
							cursor: pointer;
							opacity: 0.7;
							transition: opacity 0.2s;
							&:hover {
								opacity: 1;
							}
						`}
					>
						${copied ? "Copied!" : "Copy"}
					</button>
				`
				}
				${showGutter && jsx`<${Gutter} length=${lineTokens.length} />`}
				<${ContentArea}
					ref=${(el: ContentAreaElement) => (area = el)}
					value=${value}
					renderSource=${renderSource}
					selectionRange=${selectionRange}
					class=${css`
						display: contents;
					`}
				>
					<pre
						hydrate="!contenteditable"
						autocomplete="off"
						autocorrect="off"
						autocapitalize="none"
						contenteditable=${IS_CLIENT && editable}
						spellcheck="false"
						class="
							language-${language}
							${css`
								flex: 1 1 auto;
								word-break: break-all;
								overflow-wrap: anywhere;
								line-break: anywhere;
								white-space: pre-wrap;
								white-space: break-spaces;
								/* Needs to be min 16px to prevent iOS zoom */
								font-size: 16px;
							`}
						"
					>
						${lineTokens.map((line, l) => {
							// TODO: only highlight visible lines
							// TODO: line should probably be a custom Prism token with the
							// length already calculated.
							const length =
								line.reduce((length, t) => length + t.length, 0) + "\n".length;
							try {
								// TODO: using the virtualizer start and ends with static is breaking paste
								return jsx`
									<${Line}
										key=${keyer.keyAt(index) + "line"}
										line=${line}
										lineNumber=${l}
									/>
								`;
							} finally {
								index += length;
							}
						})}
					</pre>
				</${ContentArea}>
			</div>
		`;
		yield result;
	}
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
	let index = 0;
	let start: number | undefined;
	let end: number | undefined;
	for (const op of edit.operations()) {
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
