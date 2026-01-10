import {jsx} from "@b9g/crank/standalone";
import type {Context} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";
import {css} from "@emotion/css";

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

	//const hashchange = (ev: HashChangeEvent) => {
	//	console.log("hashchange", ev);
	//	const value1 = LZString.decompressFromEncodedURIComponent("poop");
	//	console.log(value);
	//};
	//window.addEventListener("hashchange", hashchange);
	//this.cleanup(() => window.removeEventListener("hashchange", hashchange))
	//this.flush(() => {
	//	window.location.hash = LZString.compressToEncodedURIComponent(value);
	//});

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
					flex: 0 1 auto;
					min-height: 80vh;
					overflow: auto;
					@media (min-width: 800px) {
						height: calc(100vh - 50px);
						width: 61.8%;
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
				<div class=${css`
					@media (min-width: 800px) {
						flex: 1 0 auto;
						height: calc(100vh - 50px);
						width: 400px;
					}
					overflow-y: auto;
					border-top: 1px solid currentcolor;
					@media (min-width: 800px) {
						border-top: none;
						border-left: 1px solid currentcolor;
						margin-left: -1px;
					}
				`}>
					<${CodePreview} value=${code} showStatus autoresize />
				</div>
			</div>
		`;
	}
}

const el = document.getElementById("playground");
renderer.render(jsx`<${Playground} />`, el!);
