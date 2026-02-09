import {jsx} from "@b9g/crank/standalone";
import type {Context} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";
import {css} from "@emotion/css";

window.Prism = window.Prism || {};
Prism.manual = true;
import "prismjs";
import "prismjs/components/prism-javascript";

import {CodePreview} from "../components/code-preview.js";
import {CodeEditor} from "../components/code-editor.js";
import {extractData} from "../components/serialize-javascript.js";
import LZString from "lz-string";

// TODO: move this to the ContentAreaElement component
import {ContentAreaElement} from "@b9g/revise/contentarea.js";
if (!window.customElements.get("content-area")) {
	window.customElements.define("content-area", ContentAreaElement);
}

function CodeEditorNavbar({children}: any) {
	return jsx`
		<div class=${css`
			flex: none;
			padding: 1em;
			height: 3em;
			border-bottom: 1px solid var(--coldark3);
			display: flex;
			flex-direction: row;
			align-items: center;
			position: sticky;
			left: 0;
		`}>
			${children}
		</div>
	`;
}

const examples = extractData(
	document.getElementById("examples") as HTMLScriptElement,
);

function* Playground(this: Context) {
	// Priority: URL hash > localStorage > default example
	let code = "";
	let updateEditor = true;
	const hash = window.location.hash.slice(1);
	if (hash) {
		try {
			code = LZString.decompressFromEncodedURIComponent(hash) || "";
		} catch {
			// Invalid hash, ignore
		}
	}
	if (!code.trim()) {
		code = localStorage.getItem("playground-value") || "";
	}
	if (!code.trim()) {
		code = examples[0].code;
	}

	let shareStatus = "";

	// Panel width as percentage (0-100)
	let leftPanelWidth = parseFloat(
		localStorage.getItem("playground-panel-width") || "61.8",
	);
	let isDragging = false;

	this.addEventListener("contentchange", (ev: any) => {
		this.refresh(() => {
			code = ev.target.value;
			localStorage.setItem("playground-value", code);
			exampleName = ""; // Clear example selection when user edits
		});
	});

	let exampleName = "";
	const onexamplechange = (ev: Event) => {
		exampleName = (ev.target as HTMLSelectElement).value;
		if (!exampleName) return; // "Load an example..." selected
		const example = examples.find(
			(example: any) => example.name === exampleName,
		);
		if (example) {
			this.refresh(() => {
				code = example.code;
				updateEditor = true;
			});
		}
	};

	const onShare = async () => {
		const compressed = LZString.compressToEncodedURIComponent(code);
		const url = `${window.location.origin}${window.location.pathname}#${compressed}`;
		history.replaceState(null, "", `#${compressed}`);
		let status: string;
		try {
			await navigator.clipboard.writeText(url);
			status = "Copied!";
		} catch {
			status = "Failed";
		}
		this.refresh(() => {
			shareStatus = status;
		});
		setTimeout(() => {
			this.refresh(() => {
				shareStatus = "";
			});
		}, 2000);
	};

	const startDrag = (ev: MouseEvent | TouchEvent) => {
		ev.preventDefault();
		isDragging = true;
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
	};

	const updateWidth = (clientX: number) => {
		const container = document.querySelector(".playground") as HTMLElement;
		if (!container) return;
		const rect = container.getBoundingClientRect();
		const newWidth = ((clientX - rect.left) / rect.width) * 100;
		// Clamp between 20% and 80%
		const clampedWidth = Math.max(20, Math.min(80, newWidth));
		this.refresh(() => {
			leftPanelWidth = clampedWidth;
			localStorage.setItem("playground-panel-width", leftPanelWidth.toString());
		});
	};

	const onMouseMove = (ev: MouseEvent) => {
		if (!isDragging) return;
		updateWidth(ev.clientX);
	};

	const onTouchMove = (ev: TouchEvent) => {
		if (!isDragging) return;
		updateWidth(ev.touches[0].clientX);
	};

	const endDrag = () => {
		if (isDragging) {
			isDragging = false;
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		}
	};

	window.addEventListener("mousemove", onMouseMove);
	window.addEventListener("mouseup", endDrag);
	window.addEventListener("touchmove", onTouchMove);
	window.addEventListener("touchend", endDrag);
	this.cleanup(() => {
		window.removeEventListener("mousemove", onMouseMove);
		window.removeEventListener("mouseup", endDrag);
		window.removeEventListener("touchmove", onTouchMove);
		window.removeEventListener("touchend", endDrag);
	});

	for ({} of this) {
		this.schedule(() => {
			updateEditor = false;
		});
		yield jsx`
			<div class="playground ${css`
				display: flex;
				flex-direction: column;
				@media (min-width: 800px) {
					flex-direction: row;
					align-items: stretch;
					justify-content: stretch;
				}

				width: 100%;
				padding-top: 50px;
			`}">
				<div class=${css`
					flex: 0 0 auto;
					min-height: 80vh;
					overflow: auto;
					@media (min-width: 800px) {
						height: calc(100vh - 50px);
						width: ${leftPanelWidth}%;
					}
				`}>
					<${CodeEditorNavbar}>
						<div>
							<select
								name="Example"
								value=${exampleName}
								onchange=${onexamplechange}
							>
								<option value="">Load an example...</option>
								${examples.map(
									({name, label}: any) => jsx`
									<option value=${name} key=${name}>${label}</option>
								`,
								)}
							</select>
						</div>
						<button
							class=${css`
								margin-left: auto;
								padding: 0.3em 0.8em;
								background: transparent;
								border: 1px solid currentcolor;
								color: inherit;
								cursor: pointer;
								font-size: inherit;
								&:hover {
									background: var(--highlight-color);
									color: var(--bg-color);
								}
							`}
							onclick=${onShare}
						>
							${shareStatus || "Share"}
						</button>
					<//CodeEditorNavbar>
					<${CodeEditor}
						copy=${!updateEditor}
						value=${code}
						language="typescript"
						showGutter=${true}
					/>
				</div>
				<div
					class=${css`
						display: none;
						@media (min-width: 800px) {
							display: block;
							flex: 0 0 1px;
							background: currentcolor;
							cursor: col-resize;
							position: relative;
							z-index: 10;
							&::before {
								content: "";
								position: absolute;
								top: 0;
								bottom: 0;
								left: -4px;
								right: -4px;
							}
							&:hover {
								background: var(--highlight-color);
							}
						}
					`}
					onmousedown=${startDrag}
					ontouchstart=${startDrag}
				/>
				<div class=${css`
					@media (min-width: 800px) {
						flex: 1 1 auto;
						height: calc(100vh - 50px);
						min-width: 0;
					}
					overflow-y: auto;
					border-top: 1px solid currentcolor;
					@media (min-width: 800px) {
						border-top: none;
					}
				`} style=${isDragging ? "pointer-events: none" : ""}>
					<${CodePreview} value=${code} showStatus autoresize />
				</div>
			</div>
		`;
	}
}

const el = document.getElementById("playground");
renderer.render(jsx`<${Playground} />`, el!);
