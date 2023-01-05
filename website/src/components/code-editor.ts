import {jsx} from "@b9g/crank";
import type {Context, Element as CrankElement} from "@b9g/crank";

import {Edit} from "@b9g/revise/edit.js";
import {Keyer} from "@b9g/revise/keyer.js";
import {EditHistory} from "@b9g/revise/history.js";

import type {ContentAreaElement} from "@b9g/revise/contentarea.js";

import type {Token} from "prismjs";
import {ContentArea} from "./contentarea.js";
import {tokenize} from "../utils/prism.js";
import {useVirtualizer} from "../utils/virtualizer.js";
import type {Virtualizer} from "../utils/virtualizer.js";
import {debounce} from "../utils/fns.js";

function Gutter(
	this: Context<typeof Gutter>,
	{virtualizer}: {virtualizer: Virtualizer<any, any>},
) {
	const items = virtualizer.getVirtualItems();
	const totalSize = virtualizer.getTotalSize();
	return jsx`
		<div
			style="
				flex: none;
				margin: 0;
				padding: 1em .5em;
				height: max(100vh, ${totalSize + 28}px);
				color: #fff;
				font-size: 14px;
				font-family: monospace;
				line-height: 1.4;
				text-align: right;
				border-right: 1px solid white;
				position: relative;
			"
		>
			<div
				style="
					position: relative;
					top: ${items[0]?.start}px;
				"
			>
				${items.map(
					(item) => jsx`
					<div
						style="
							height: ${item.size}px;
						"
					>${item.index + 1}</div>
				`,
				)}
			</div>
		</div>
	`;
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
		<div class="prism-line" data-index=${lineNumber}>
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

		value = ev.target.value;
		renderSource = "refresh";
		this.refresh();
	});

	const virtualizer = useVirtualizer(this, {
		count: 0,
		getScrollElement: () => {
			return getScroller(area);
		},
		// Debouncing because calling measureElement causes this function to fire
		// multiple times.
		onChange: debounce(() => {
			value = area.value;
			renderSource = "virtualizer";
			this.refresh();
		}, 0),
		estimateSize: () => {
			return 19;
		},
		// TODO: read this from the DOM and un-hardcode
		scrollPaddingStart: 14,
		scrollPaddingEnd: 14,
		overscan: 100,
	});

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

		this.flush((el) => {
			const pre = el.querySelector("pre")!;
			for (let i = 0; i < pre.children.length; i++) {
				const child = pre.children[i];
				virtualizer.measureElement(child);
			}
		});

		if (renderSource == null) {
			// Very perplexing.
			value = value1;
		}

		// make sure the value always ends with a newline
		value = value.match(/(?:\r|\n|\r\n)$/) ? value : value + "\n";

		const lineStarts: Array<number> = [];
		{
			// remove last empty line
			const lines = value.split(/\n/).slice(0, -1);
			for (let i = 0, c = 0; i < lines.length; i++) {
				lineStarts.push(c);
				c += lines[i].length + 1;
			}

			virtualizer.setOptions({
				...virtualizer.options,
				count: lines.length,
			});
		}

		const lines = tokenize(value, language || "javascript");
		let index = 0;
		//const items = virtualizer.getVirtualItems();
		//const start = items[0]?.index || 0;
		//const end = items[items.length - 1]?.index || 0;
		yield jsx`
			<div
				class="code-editor"
				style="
					position: relative;
					min-height: 100%;
					width: 100%;
					display: flex;
				"
			>
				${
					showGutter &&
					jsx`
					<${Gutter}
						length=${lines.length}
						lineStarts=${lineStarts}
						virtualizer=${virtualizer}
						keyer=${keyer}
					/>
				`
				}
				<${ContentArea}
					$ref=${(el: ContentAreaElement) => (area = el)}
					value=${value}
					renderSource=${renderSource}
					selectionRange=${selectionRange}
					style="display: contents"
				>
					<pre
						autocomplete="off"
						autocorrect="off"
						autocapitalize="off"
						contenteditable=${IS_CLIENT && editable}
						spellcheck="false"
						style="
							flex: 1 1 auto;
							word-break: break-all;
							overflow-wrap: anywhere;
							line-break: anywhere;
							white-space: pre-wrap;
							white-space: break-spaces;
						"
					>
						${lines.map((line, l) => {
							// TODO: only highlight visible lines
							// TODO: line should probably be a custom Prism token with the
							// length already calculated.
							const length =
								line.reduce((length, t) => length + t.length, 0) + "\n".length;
							try {
								// TODO: using the virtualizer start and ends with static is breaking paste
								return jsx`
									<${Line}
										$key=${keyer.keyAt(index) + "line"}
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
	}
}

function getScroller(el: Element | null): Element | null {
	for (; el != null; el = el.parentElement) {
		const overflowY = window.getComputedStyle(el).overflowY;
		if (overflowY === "auto" || overflowY === "scroll") {
			return el;
		}
	}

	return document.scrollingElement;
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
