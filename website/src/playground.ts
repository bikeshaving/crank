import {xm} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";
import {PrismEditor} from "./components/prism-editor.js";
import "prismjs/components/prism-javascript";

import {ContentAreaElement} from "@b9g/revise/contentarea.js";
if (!window.customElements.get("content-area")) {
	window.customElements.define("content-area", ContentAreaElement);
}

function* Sandbox({text}: {text: string}) {
	let iframe: HTMLIFrameElement;
	for ({text} of this) {
		this.flush(() => {
			iframe.contentWindow.postMessage(text);
		});

		yield xm`
			<iframe
				$static
				$ref=${(el) => (iframe = el)}
				class="sandbox"
				src="/sandbox"
			/>
		`;
	}
}

function* Playground({}) {
	let value = "\n";
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
