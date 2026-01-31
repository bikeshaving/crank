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
//import LZString from "lz-string";

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
	let code = localStorage.getItem("playground-value") || "";
	let updateEditor = true;
	if (!code.trim()) {
		code = examples[0].code;
	}

	// Panel width as percentage (0-100)
	let leftPanelWidth = parseFloat(
		localStorage.getItem("playground-panel-width") || "61.8",
	);
	let isDragging = false;

	this.addEventListener("contentchange", (ev: any) => {
		code = ev.target.value;
		localStorage.setItem("playground-value", code);
		this.refresh();
	});

	let exampleName = "";
	const onexamplechange = (ev: Event) => {
		exampleName = (ev.target as HTMLSelectElement).value;
		const {code: code1} = examples.find(
			(example: any) => example.name === exampleName,
		);
		code = code1;
		updateEditor = true;
		this.refresh();
	};

	const onDividerMouseDown = (ev: MouseEvent) => {
		ev.preventDefault();
		isDragging = true;
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
	};

	const onMouseMove = (ev: MouseEvent) => {
		if (!isDragging) return;
		const container = document.querySelector(".playground") as HTMLElement;
		if (!container) return;
		const rect = container.getBoundingClientRect();
		const newWidth = ((ev.clientX - rect.left) / rect.width) * 100;
		// Clamp between 20% and 80%
		leftPanelWidth = Math.max(20, Math.min(80, newWidth));
		localStorage.setItem("playground-panel-width", leftPanelWidth.toString());
		this.refresh();
	};

	const onMouseUp = () => {
		if (isDragging) {
			isDragging = false;
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		}
	};

	window.addEventListener("mousemove", onMouseMove);
	window.addEventListener("mouseup", onMouseUp);
	this.cleanup(() => {
		window.removeEventListener("mousemove", onMouseMove);
		window.removeEventListener("mouseup", onMouseUp);
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
					onmousedown=${onDividerMouseDown}
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
