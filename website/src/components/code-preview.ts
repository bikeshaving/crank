import {jsx} from "@b9g/crank";
import type {Context} from "@b9g/crank";
import {debounce} from "../utils/fns.js";
import {transform} from "../plugins/babel.js";

export function* CodePreview(this: Context, {value}: {value: string}) {
	let iframe: HTMLIFrameElement;
	let loading = true;
	let errorMessage: string | null = null;

	const execute = debounce(() => {
		const document1 = iframe.contentDocument;
		if (document1 == null) {
			return;
		}

		let parsed: any;
		let code = "";
		try {
			parsed = transform(value);
			code = parsed.code;
		} catch (err: any) {
			errorMessage = err.message;
			this.refresh();
			return;
		}

		document1.write(`
			<style>
				body {
					color: #f5f9ff;
				}
			</style>
			<script>
				window.addEventListener("load", (ev) => {
					window.parent.postMessage(
						JSON.stringify({type: "executed"}),
						window.location.origin,
					);
				});

				window.addEventListener("error", (ev) => {
					window.parent.postMessage(
						JSON.stringify({type: "error", message: ev.message}),
						window.location.origin,
					);
				});
			</script>
			<script type="module">${code}</script>
		`);
		document1.close();
	}, 2000);

	const onmessage = (ev: any) => {
		// TODO: same origin?
		let data: any = JSON.parse(ev.data);
		if (data.type === "executed") {
			loading = false;
			this.refresh();
		} else if (data.type === "error") {
			loading = false;
			errorMessage = data.message;
			this.refresh();
		}
	};

	if (typeof window !== "undefined") {
		window.addEventListener("message", onmessage);
		this.cleanup(() => {
			window.removeEventListener("message", onmessage);
		});
	}

	let oldValue: string | undefined;
	for ({value} of this) {
		if (value !== oldValue) {
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
					jsx`
					<pre style="color: pink; height: 80%; padding: 1em;">
						${errorMessage}
					</pre>
				`
				}
				<iframe
					$ref=${(el: HTMLIFrameElement) => (iframe = el)}
					$static=${true}
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

		oldValue = value;
	}
}
