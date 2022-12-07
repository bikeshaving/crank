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
	let iframeHeight = 200;
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

		// TODO: move these to separate scripts/styles?
		document1.open();
		document1.write(`
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

					const resizeObserver = new ResizeObserver((entries) => {
						const {contentRect} = entries[0];
						window.parent.postMessage(
							JSON.stringify({type: "resize", id: ${id}, rect: contentRect}),
							window.location.origin,
						);
					});
					resizeObserver.observe(document.documentElement);
				}
			</script>
			<script type="module">${code}</script>
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
		} else if (data.type === "resize") {
			iframeHeight = data.rect.height;
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
			<div>
				<div style="padding: 1em; border-bottom: 1px solid white">
					${errorMessage ? "Errored!" : loading ? "Loading..." : "Running!"}
				</div>
				<div
					style="
						max-height: 500px;
						overflow: auto;
					"
				>
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
							height: calc(${iframeHeight}px + 2em);
							display: ${loading || errorMessage ? "none" : "block"}
						"
					/>
				</div>
			</div>
		`;

		oldValue = value;
		oldVisible = visible;
	}
}
