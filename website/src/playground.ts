import {xm} from "@b9g/crank";
import type {Context} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";
import {PrismEditor} from "./components/prism-editor.js";
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
			loading = false;
			this.refresh();
		}
	};

	window.addEventListener("message", onglobalmessage);
	this.cleanup(() => window.removeEventListener("message", onglobalmessage));

	const execute = debounce(() => {
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
				${errorMessage && xm`<pre style="color: red">${errorMessage}</pre>`}
				<iframe
					$ref=${(el: HTMLIFrameElement) => (iframe = el)}
					$static
					style="width: 100%; height: 80%; border: none; padding: 1em"
				/>
				<div style="border-top: 1px solid white; padding: 1em">
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

function* Playground(this: Context, {}) {
	let value = EXAMPLE;
	this.addEventListener("contentchange", (ev: any) => {
		value = ev.target.value;
		this.refresh();
	});

	//const hashchange = (ev: HashChangeEvent) => {
	//	console.log("hashchange", ev);
	//	const value1 = LZString.decompressFromEncodedURIComponent("poop");
	//	console.log(value);
	//};

	window.addEventListener("hashchange", hashchange);
	this.cleanup(() => window.removeEventListener("hashchange", hashchange));

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
					position: absolute;
					top: 50px;
					overflow: hidden;
				"
			>
				<div style="width: 50%; height: 100%; flex: 1 1 50%; border-right: 1px solid white">
					<div style="position: relative; width: 100%; height: 50px; border-bottom: 1px solid white; padding: 1em; background-color: red">
						<select name="example">
							<option value="hello-world">Hello world</option>
							<option value="todomvc">TodoMVC</option>
						</select>
					</div>
					<${PrismEditor} value=${value} language="typescript" />
				</div>
				<div style="height: 100%; flex: 1 1 50%;">
					<${Preview} text=${value} />
				</div>
			</div>
		`;
	}
}

const el = document.getElementById("playground");
renderer.render(xm`<${Playground} />`, el!);
