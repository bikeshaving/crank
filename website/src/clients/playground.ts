import {jsx} from "@b9g/crank/standalone";
import type {Context} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";
import {css} from "@emotion/css";

import "prismjs/components/prism-javascript";

import {CodePreview} from "../components/code-preview.js";
import {CodeEditor} from "../components/code-editor.js";
//import LZString from "lz-string";

// TODO: move this to the ContentAreaElement component
import {ContentAreaElement} from "@b9g/revise/contentarea.js";
if (!window.customElements.get("content-area")) {
	window.customElements.define("content-area", ContentAreaElement);
}

// TODO: multiple examples

const EXAMPLE = `
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

const EXAMPLE1 = `
import {jsx} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/dom";

function *Timer() {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);

  for ({} of this) {
    yield jsx\`<div>\${seconds}s</div>\`;
  }

  clearInterval(interval);
}

renderer.render(jsx\`<\${Timer} />\`, document.body);
`.trimLeft();

function* Playground(this: Context, {}) {
	let value = localStorage.getItem("playground-value") || "";
	if (!value.trim()) {
		value = EXAMPLE;
	}

	this.addEventListener("contentchange", (ev: any) => {
		value = ev.target.value;

		localStorage.setItem("playground-value", value);
		this.refresh();
	});

	//const hashchange = (ev: HashChangeEvent) => {
	//	console.log("hashchange", ev);
	//	const value1 = LZString.decompressFromEncodedURIComponent("poop");
	//	console.log(value);
	//};
	//window.addEventListener("hashchange", hashchange);
	//this.cleanup(() => window.removeEventListener("hashchange", hashchange))

	for ({} of this) {
		//this.flush(() => {
		//	window.location.hash = LZString.compressToEncodedURIComponent(value);
		//});
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
					<${CodeEditor}
						value=${value}
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
					margin-top: -1px;
					@media (min-width: 800px) {
						border-left: 1px solid currentcolor;
						margin-left: -1px;
					}
				`}>
					<${CodePreview} value=${value} showStatus />
				</div>
			</div>
		`;
	}
}

const el = document.getElementById("playground");
renderer.hydrate(jsx`<${Playground} />`, el!);
