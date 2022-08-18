import {xm} from "@b9g/crank";
import type {Context} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";
import {PrismEditor} from "./components/prism-editor.js";
import "prismjs/components/prism-javascript";

import {ContentAreaElement} from "@b9g/revise/contentarea.js";
if (!window.customElements.get("content-area")) {
	window.customElements.define("content-area", ContentAreaElement);
}

function* Sandbox(this: Context, {text}: {text: string}) {
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
				class="sandbox"
			/>
		`;
	}
}

function* Playground(this: Context, {}) {
	let value = `
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
	this.addEventListener("contentchange", (ev: any) => {
		value = ev.target.value;
		this.refresh();
	});

	for ({} of this) {
		yield xm`
			<div style="position: relative; top: 50px; display: flex; flex-direction: row; height: 100%">
				<div style="width: 50%; height: 100%">
					<${PrismEditor} value=${value} language="typescript" />
				</div>
				<div style="width: 50%: height: 100%">
					<${Sandbox} text=${value} />
				</div>
			</div>
		`;
	}
}

const el = document.getElementById("playground");

renderer.render(xm`<${Playground} />`, el!);
