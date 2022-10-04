import {xm} from "@b9g/crank";
import type {Context} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";
import {PlaygroundEditor} from "./components/playground-editor.js";
import "prismjs/components/prism-javascript";
//import LZString from "lz-string";

// TODO: move this to the ContentAreaElement component
import {ContentAreaElement} from "@b9g/revise/contentarea.js";
if (!window.customElements.get("content-area")) {
	window.customElements.define("content-area", ContentAreaElement);
}

function* Preview(this: Context, {text}: {text: string}) {
	let iframe: HTMLIFrameElement;
	let oldText: string | null = null;
	let errorMessage: string | null = null;
	let loading = true;
	const onglobalmessage = (ev: MessageEvent) => {
		const data = JSON.parse(ev.data);
		if (data.type === "ready") {
			iframe.contentWindow!.postMessage(text, "*");
		} else if (data.type === "error") {
			errorMessage = data.message;
			this.refresh();
		} else if (data.type === "executed") {
			errorMessage = null;
			loading = false;
			this.refresh();
		}
	};

	window.addEventListener("message", onglobalmessage);
	this.cleanup(() => window.removeEventListener("message", onglobalmessage));

	const execute = debounce(() => {
		// TODO: Should we stop reloading the iframe?
		iframe.src = new URL("/sandbox/", window.location.origin).toString();
	}, 1000);

	for ({text} of this) {
		if (text !== oldText) {
			loading = true;
			errorMessage = null;
			this.flush(() => execute());
		}

		yield xm`
			<div style="height: 100%">
				${
					errorMessage &&
					xm`<pre
						style="
							color: red;
							width: 100%;
							height: 80%;
							padding: 1em;
						"
					>${errorMessage}
					</pre>`
				}
				<iframe
					$ref=${(el: HTMLIFrameElement) => (iframe = el)}
					style="
						width: 100%;
						height: 80%;
						border: 2px inset white;
						padding: 1em;
						margin: 0;
						display: ${errorMessage ? "none" : "block"}
					"
				/>
				<div style="height: 20%; padding: 1em">
					${errorMessage ? "Errored!" : loading ? "Loading..." : "Running!"}
				</div>
			</div>
		`;

		oldText = text;
	}
}

function debounce(fn: Function, wait: number, immediate?: boolean) {
	let timeout: any = null;
	return function (this: unknown, ...args: Array<unknown>) {
		const later = () => {
			timeout = null;
			if (!immediate) {
				fn.apply(this, args);
			}
		};

		if (immediate && !timeout) {
			fn.apply(this, args);
		}

		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

// TODO: multiple examples
//const EXAMPLE = `hello
//world
//`;

const EXAMPLE =
	`
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
`.trim() + "\n";

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
					<${PlaygroundEditor} value=${value} language="typescript" $static=${true} />
				</div>
				<div style="width: 50%; height: 100%">
					<${Preview} text=${value} />
				</div>
			</div>
		`;
	}
}

const el = document.getElementById("playground");
renderer.render(xm`<${Playground} />`, el!);
