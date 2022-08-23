import {xm} from "@b9g/crank";
import type {Context} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";
import {PrismEditor} from "./components/prism-editor.js";
import "prismjs/components/prism-javascript";
// TODO: store example URL in the hash
//import LZString from "lz-string";

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
		} else if (data.type === "syntaxError") {
			errorMessage = data.message;
			this.refresh();
		} else if (data.type === "error") {
			errorMessage = data.message;
			this.refresh();
		} else if (data.type === "executed") {
			loading = false;
			this.refresh();
		}
	};

	window.addEventListener("message", onglobalmessage);
	this.cleanup(() => window.removeEventListener("message", onglobalmessage));

	for ({text} of this) {
		if (text !== oldText) {
			loading = true;
			errorMessage = null;
			this.flush(() => {
				iframe.src = new URL("/sandbox", window.location.origin).toString();
			});
		}

		yield xm`
			<div>
				<div style="border-bottom: 1px solid white; padding: 1em">
					${errorMessage ? "Errored!" : loading ? "Loading..." : "Done!"}
				</div>
				${errorMessage && xm`<pre>${errorMessage}</pre>`}
				<iframe
					$ref=${(el: HTMLIFrameElement) => (iframe = el)}
					$static
					style="width: 100%; height: 100%; border: none; padding: 1em "
					sandbox="allow-scripts allow-same-origin"
				/>
			</div>
		`;

		oldText = text;
	}
}

const EXAMPLE =
	`
import {createElement} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";

function *Timer() {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);
  try {
    for ({} of this) {
      yield <div>{seconds}s</div>;
    }
  } finally {
    clearInterval(interval);
  }
}

renderer.render(<Timer />, document.body);
`.trim() + "\n";

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

function* Playground(this: Context, {}) {
	let value = EXAMPLE;
	const executeValue = debounce((ev: any) => {
		value = ev.target.value;

		//console.log(LZString.compressToEncodedURIComponent(value));
		this.refresh();
	}, 1000);

	this.addEventListener("contentchange", (ev: any) => {
		executeValue(ev);
	});

	for ({} of this) {
		yield xm`
			<div
				style="
					display: flex;
					flex-direction: row;
					height: calc(100vh - 50px);
				"
			>
				<div style="flex: 1 1 50%">
					<${PrismEditor} value=${value} language="typescript" />
				</div>
				<div style="width: 0px; border-right: 1px solid white" />
				<div style="flex: 1 1 50%">
					<${Preview} text=${value} />
				</div>
			</div>
		`;
	}
}

document.body.style.overflow = "hidden";
const el = document.getElementById("playground");

renderer.render(xm`<${Playground} />`, el!);
