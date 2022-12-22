import {jsx} from "@b9g/crank";
import type {Context} from "@b9g/crank";
import {debounce} from "../utils/fns.js";
import {transform} from "../plugins/babel.js";

let globalId = 0;
export function* CodePreview(
	this: Context<typeof CodePreview>,
	{value, visible}: {value: string; visible: boolean},
): any {
	const id = globalId++;
	let iframe: HTMLIFrameElement;
	let loading = true;
	let errorMessage: string | null = null;

	const execute = debounce(() => {
		if (!visible) {
			return;
		}

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

		iframe.src = "";
		// TODO: default styling for elements in the playground
		// TODO: move these to separate scripts/styles?
		document1.write(`
			<!DOCTYPE html>
			<head>
				<style>
				body {
					color: #f5f9ff;
				}
				</style>
				<script>
				{
					window.addEventListener("load", (ev) => {
						window.parent.postMessage(
							JSON.stringify({type: "executed", id: ${id}}),
							window.location.origin,
						);
					});

					window.addEventListener("error", (ev) => {
						window.parent.postMessage(
							JSON.stringify({type: "error", id: ${id}, message: ev.message}),
							window.location.origin,
						);
					});
				}
				</script>
				<script type="module">${code}</script>
			</head>
			<body></body>
		`);
		document1.close();
	}, 2000);

	const onmessage = (ev: any) => {
		// TODO: same origin?
		let data: any = JSON.parse(ev.data);
		if (data.id !== id) {
			return;
		}

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
	let oldVisible: boolean | undefined;
	for ({value, visible = true} of this) {
		if (value !== oldValue || visible !== oldVisible) {
			loading = true;
			errorMessage = null;
			this.flush(() => execute());
		}

		yield jsx`
			<div style="
				height: 100%;
				display: flex;
				flex-direction: column;
			">
				<div style="flex: none; padding: 1em; border-bottom: 1px solid white">
					${errorMessage ? "Errored!" : loading ? "Loading..." : "Running!"}
				</div>
				<div style="flex: 1;">
					${
						errorMessage &&
						jsx`
						<pre style="color: pink; padding: 1em">
							${errorMessage}
						</pre>
					`
					}
					<iframe
						$ref=${(el: HTMLIFrameElement) => (iframe = el)}
						style="
							border: none;
							padding: 1em;
							margin: 0;
							width: 100%;
							height: 100%;
							display: ${errorMessage ? "none" : "block"}
						"
					/>
				</div>
			</div>
		`;

		oldValue = value;
		oldVisible = visible;
	}
}
