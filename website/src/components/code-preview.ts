import {jsx} from "@b9g/crank";
import type {Context} from "@b9g/crank";
import {debounce} from "../utils/fns.js";

const IS_CLIENT = typeof document !== "undefined";

export function* CodePreview(this: Context, {value}: {value: string}) {
	let iframe: HTMLIFrameElement;
	let oldText: string | null = null;
	let errorMessage: string | null = null;
	let loading = true;
	const onglobalmessage = (ev: MessageEvent) => {
		const data = JSON.parse(ev.data);
		if (data.type === "ready") {
			iframe.contentWindow!.postMessage(value, "*");
		} else if (data.type === "error") {
			errorMessage = data.message;
			this.refresh();
		} else if (data.type === "executed") {
			errorMessage = null;
			loading = false;
			this.refresh();
		}
	};

	if (IS_CLIENT) {
		window.addEventListener("message", onglobalmessage);
		this.cleanup(() => window.removeEventListener("message", onglobalmessage));
	}

	const execute = debounce(() => {
		// TODO: Consider using srcdoc
		// TODO: Should we stop reloading the iframe?
		iframe.src = new URL("/sandbox/", window.location.origin).toString();
	}, 1000);

	for ({value} of this) {
		if (value !== oldText) {
			loading = true;
			errorMessage = null;
			this.flush(() => execute());
		}

		yield jsx`
			<div style="height: 100%; display: flex; flex-direction: column">
				<div style="padding: 1em; border-bottom: 1px solid white">
					${errorMessage ? "Errored!" : loading ? "Loading..." : "Running!"}
				</div>
				${
					errorMessage &&
					jsx`<pre
						style="
							color: red;
							height: 80%;
							padding: 1em;
						"
					>${errorMessage}
					</pre>`
				}
				<iframe
					$ref=${(el: HTMLIFrameElement) => (iframe = el)}
					style="
						border: none;
						padding: 1em;
						margin: 0;
						width: 100%;
						flex: 1 1;
						display: ${errorMessage ? "none" : "block"}
					"
				/>
			</div>
		`;

		oldText = value;
	}
}
