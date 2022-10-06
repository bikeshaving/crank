import {xm} from "@b9g/crank";
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
//const EXAMPLE = `hello
//world
//`;

const EXAMPLE = `
import {xm} from "@b9g/crank@beta/xm.js";
import {renderer} from "@b9g/crank@beta/dom";

function *Timer() {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);
  try {
    for ({} of this) {
      yield xm\`<div>\${seconds}s</div>\`;
    }
  } finally {
    clearInterval(interval);
  }
}

renderer.render(xm\`<\${Timer} />\`, document.body);
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
	//this.cleanup(() => window.removeEventListener("hashchange", hashchange));

	for ({} of this) {
		//this.flush(() => {
		//	window.location.hash = LZString.compressToEncodedURIComponent(value);
		//});

		yield xm`
			<div
				style="
					display: flex;
					flex-direction: row;
					width: 100vw;
					height: calc(100vh - 50px);
					position: relative;
					top: 50px;
				"
			>
				<div style="width: 50%; height: 100%; border-right: 1px solid white">
					<${CodeEditor}
						$static
						value=${value}
						language="typescript"
						showGutter
					/>
				</div>
				<div style="width: 50%; height: 100%">
					<${CodePreview} value=${value} />
				</div>
			</div>
		`;
	}
}

const el = document.getElementById("playground");
renderer.render(xm`<${Playground} />`, el!);
