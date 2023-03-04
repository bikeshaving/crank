import {jsx} from "@b9g/crank/standalone";
import type {Context} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";
import {css} from "@emotion/css";

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

const TIMER_EXAMPLE = `
import {renderer} from "@b9g/crank/dom";

function *Timer() {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);

  for ({} of this) {
    yield <div>{seconds}</div>;
  }

  clearInterval(interval);
}

renderer.render(<Timer />, document.body);
`.trim();
import * as FS from "fs/promises";
function CodeEditorNavbar({children}) {
	return jsx`
		<div class=${css`
			flex: none;
			padding: 1em;
			height: 3em;
			border-bottom: 1px solid var(--text-color);
			display: flex;
			flex-direction: row;
			align-items: center;
		`}>
			${children}
		</div>
	`;
}

const examples = extractData(document.getElementById("examples"));

function* Playground(this: Context, {}) {
	let code = localStorage.getItem("playground-value") || "";
	if (!code.trim()) {
		code = TIMER_EXAMPLE;
	}

	this.addEventListener("contentchange", (ev: any) => {
		code = ev.target.value;

		localStorage.setItem("playground-value", code);
		this.refresh();
	});

	let exampleName: "" | "timer" | "tetris" = "";
	const onexamplechange = (ev: Event) => {
		exampleName = (ev.target as HTMLSelectElement).value;
		const {code: code1} = examples.find((example) => example.name === exampleName);
		code = code1;
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
								<option value="" $key=${name}>Load an example...</option>
								${examples.map(({name, label}) => jsx`
									<option value=${name} $key=${name}>${label}</option>
								`)}
							</select>
						</div>
					<//CodeEditorNavbar>
					<${CodeEditor}
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

					border-top: 1px solid currentcolor;
					@media (min-width: 800px) {
						border-top: none;
						border-left: 1px solid currentcolor;
						margin-left: -1px;
					}
				`}>
					<${CodePreview} value=${code} showStatus />
				</div>
			</div>
		`;
	}
}

const el = document.getElementById("playground");
renderer.hydrate(jsx`<${Playground} />`, el!);
