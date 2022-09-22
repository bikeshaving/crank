import {xm} from "@b9g/crank";
import type {Context, Element} from "@b9g/crank";

import {Edit} from "@b9g/revise/edit.js";
import {Keyer} from "@b9g/revise/keyer.js";
import {EditHistory} from "@b9g/revise/history.js";
import Prism from "prismjs";
import type {Token} from "prismjs";
import "prismjs/components/prism-typescript.js";
import {ContentArea} from "./contentarea.js";
import type {ContentAreaElement} from "@b9g/revise/contentarea";

const IS_CLIENT = typeof document !== "undefined";

// TODO: Custom tabs
const TAB = "  ";

function Chunk({
	chunk,
	//observer,
	key,
	keyer,
	index,
}: {
	chunk: Array<Array<Token | string>>;
	//observer: IntersectionObserver;
	key: any;
	keyer: Keyer;
	index: number;
}) {
	//this.flush((el) => {
	//	//console.log("scheduling", key, el);
	//	observer.observe(el);
	//});

	//this.cleanup((el) => {
	//	//console.log("cleaning up", key, el);
	//	observer.unobserve(el);
	//});

	return xm`
		<div class="chunk" data-key=${key}>
			${chunk.map((line) => {
				const key = keyer.keyAt(index);
				const length =
					line.reduce((length, t) => length + t.length, 0) + "\n".length;
				try {
					return xm`
						<${Line}
							$key=${key}
							key=${key}
							line=${line}
						/>
					`;
				} finally {
					index += length;
				}
			})}
		</div>
	`;
}

function* Line(
	this: Context,
	{
		line,
		//observer,
		key,
	}: {
		line: Array<Token | string>;
		//observer: IntersectionObserver;
		key: any;
	},
) {
	for ({line, key} of this) {
		yield xm`
			<div class="prism-line" data-key=${key}>
				${line.length ? xm`<code>${printTokens(line)}</code>` : null}
				<br />
			</div>
		`;
	}
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

function Gutter({length}: {length: number}) {
	const numbers: Array<any> = [];
	for (let l = 0; l < length; l++) {
		numbers.push(xm`<div class="prism-editor-linenumber">${l + 1}</div>`);
	}

	return xm`
		<div
			style="
				min-width: 5em;
				margin: 0;
				padding: 1em;
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
}

export function* PrismEditor(
	this: Context,
	{
		value,
		language,
		editable,
	}: {value: string; language: string; editable?: boolean},
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
		let initial = true;
		this.addEventListener("contentchange", (ev: any) => {
			const {edit} = ev.detail;
			if (initial) {
				initial = false;
			} else {
				keyer.transform(edit);
			}
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

		checkpointEditHistory(this, editHistory);

		let initial = true;
		this.addEventListener("contentchange", (ev: any) => {
			const {edit, source} = ev.detail;
			if (source !== "history") {
				if (!initial) {
					editHistory.append(edit.normalize());
				}

				initial = false;
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
	const intersectionObserver = new IntersectionObserver(
		(entries) => {
			//console.log(entries);
			for (const entry of entries) {
				if (entry.isIntersecting) {
					entry.target.style.backgroundColor = "red";
				} else {
					entry.target.style.backgroundColor = "blue";
				}
			}
		},
		{rootMargin: "500px 0px 500px 0px"},
	);

	for ({value: value1, language, editable = true} of this) {
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
		const chunks = Array.from(chunkArray(lines, Infinity));
		//const lines = value.split("\n").map((l) => [l]).slice(0, -1);
		let index = 0;
		yield xm`
			<div
				style="
					display: flex;
					flex-direction: row;
					align-items: stretch;
					position: relative;
					height: calc(100% - 50px);
					flex: 1 0 50%;
					overflow: hidden auto;
				"
			>
				<${Gutter} length=${lines.length} />
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
						style="border-left: 1px solid white; min-height: 100%"
					>
					${chunks.map((chunk) => {
						const key = keyer.keyAt(index);
						const length = chunk
							.map(
								(line) =>
									line.reduce((length, t) => length + t.length, 0) +
									"\n".length,
							)
							.reduce((length, n) => length + n, 0);
						try {
							return xm`
								<${Chunk}
									$key=${key}
									key=${key}
									keyer=${keyer}
									index=${index}
									observer=${intersectionObserver}
									chunk=${chunk}
								/>
							`;
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

function* chunkArray<T>(arr: Array<T>, size: number): Array<Array<T>> {
	for (let i = 0; i < arr.length; i += size) {
		yield arr.slice(i, i + size);
	}
}

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
