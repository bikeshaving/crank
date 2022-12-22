import {jsx} from "@b9g/crank";
import type {Context} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";

import "prismjs/components/prism-javascript";

import {CodePreview} from "./components/code-preview.js";
import {CodeEditor} from "./components/code-editor.js";
//import LZString from "lz-string";

// TODO: move this to the ContentAreaElement component
import {ContentAreaElement} from "@b9g/revise/contentarea.js";
if (!window.customElements.get("content-area")) {
	window.customElements.define("content-area", ContentAreaElement);
}

// TODO: multiple examples

const EXAMPLE = `
import {jsx} from "@b9g/crank@beta/crank.js";

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

import {renderer} from "@b9g/crank@beta/dom.js";
renderer.render(jsx\`<\${Timer} />\`, document.body);
`.trimLeft();

function* Playground(this: Context, {}) {
	let value = localStorage.getItem("playground-value") || EXAMPLE;
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
			<div
				style="
					display: flex;
					flex-wrap: wrap;
					width: 100vw;
					height: 100vh;
					padding-top: 50px;
				"
			>
				<!-- THIS IS THE SCROLL ELEMENT -->
				<div style="
					flex: 1 1 auto;
					width: 600px;
					height: 100%;
					overflow: auto;
				">
					<${CodeEditor}
						value=${value}
						language="typescript"
						showGutter=${true}
					/>
				</div>
				<div style="
					flex: 1 1 auto;
					width: 300px;
					height: 100%;
					border-top: 1px solid white;
					border-left: 1px solid white;
					margin-top: -1px;
					margin-left: -1px;
				">
					<${CodePreview} value=${value} />
				</div>
			</div>
		`;
	}
}

const el = document.getElementById("playground");
renderer.render(jsx`<${Playground} />`, el!);
