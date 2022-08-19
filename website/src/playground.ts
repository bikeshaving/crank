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
	for ({text} of this) {
		this.flush(() => {
			iframe.src = "/sandbox";
			// TODO: figure out the timings
			setTimeout(() => {
				iframe.contentWindow!.postMessage(text);
			}, 100);
		});

		yield xm`
			<iframe
				$ref=${(el: HTMLIFrameElement) => (iframe = el)}
				class="playground-preview"
			/>
		`;
	}
}

const EXAMPLE = `
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
`.trim();

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
	}, 500);

	this.addEventListener("contentchange", (ev: any) => {
		executeValue(ev);
	});

	for ({} of this) {
		yield xm`
			<div class="playground">
				<div class="playground-input" style="flex: 50%; height: 100%">
					<${PrismEditor} value=${value} language="typescript" />
				</div>
				<div style="width: 0px; height: 100%; border-right: 1px solid white" />
				<div class="playground-output" style="flex: 50%; height: 100%">
					<${Preview} text=${value} />
				</div>
			</div>
		`;
	}
}

document.body.style.overflow = "hidden";
const el = document.getElementById("playground");

renderer.render(xm`<${Playground} />`, el!);
