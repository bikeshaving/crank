import {jsx} from "@b9g/crank/standalone";
import type {Context} from "@b9g/crank";
import {debounce} from "../utils/fns.js";
import {transform} from "../plugins/babel.js";

let globalId = 0;
export function* CodePreview(
	this: Context<typeof CodePreview>,
	{
		value,
		visible = true,
		showStatus = false,
		autoresize = false,
	}: {
		value: string;
		visible?: boolean;
		showStatus?: boolean;
		autoresize?: boolean;
	},
): any {
	const id = globalId++;
	let iframe!: HTMLIFrameElement;
	// We use this iframe ID as the key for the iframe, so that previous iframes
	// are destroyed along with any registered callbacks like setInterval.
	let iframeID = 0;
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

		//iframeID++;
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

					new ResizeObserver((entries) => {
						window.parent.postMessage(
							JSON.stringify({
								type: "resize",
								id: ${id},
								height: entries[0].contentRect.height,
							}),
							window.location.origin,
						);
					}).observe(document.documentElement);
				}
				</script>
				<script type="module">${code}</script>
			</head>
			<body></body>
		`);
		document1.close();
	}, 2000);

	let height = 100;
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
			if (autoresize) {
				// Auto-resizing iframes is tricky because you can get into an infinite
				// loop. For instance, if the body height is `100vh`, or if a scrollbar
				// being added or removed causes the page height to change. Therefore,
				// we only increase the height and give a max height of 1000px.
				height = Math.min(1000, Math.max(height, data.height));
				this.refresh();
			}
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
	for ({
		value,
		visible = true,
		showStatus = false,
		autoresize = false,
	} of this) {
		if (value !== oldValue || visible !== oldVisible) {
			loading = true;
			errorMessage = null;
			this.flush(() => execute());
		}

		yield jsx`
			<div
				style="
					display: flex;
					flex-direction: column;
					height: 100%;
				"
			>
				${
					showStatus &&
					jsx`
						<div
							style="
								flex: none;
								padding: 1em;
								border-bottom: 1px solid var(--text-color);
							">
							${errorMessage ? "Errored!" : loading ? "Loading..." : "Running!"}
						</div>
					`
				}
				${
					errorMessage &&
					jsx`
						<pre
							style="
								color: pink;
								padding: 1em;
							"
						>${errorMessage}</pre>
					`
				}
				<div
					style="
						flex: 1 1 auto;
						height: 100%;
						padding: 1em;
					"
				>
					<iframe
						$key=${iframeID}
						$ref=${(el: HTMLIFrameElement) => (iframe = el)}
						style="
							border: none;
							width: 100%;
							height: ${autoresize ? `${height}px` : "100%"};
						"
					/>
				</div>
			</div>
		`;

		oldValue = value;
		oldVisible = visible;
	}
}
