import {jsx} from "@b9g/crank/standalone";
import type {Context} from "@b9g/crank";
import {css} from "@emotion/css";
import {debounce} from "../utils/fns.js";
import {transform} from "../plugins/babel.js";

function generateIFrameHTML(
	id: number,
	code: string,
	staticURLs: Record<string, any>,
): string {
	return `
		<!DOCTYPE html>
		<head>
			<link
				rel="stylesheet"
				type="text/css"
				href=${staticURLs!["client.css"]}
			/>
			<style>
				body {
					background: none !important;
				}
			</style>
		</head>
		<body>
			<script>
				const colorScheme = sessionStorage.getItem("color-scheme") ||
					(
						window.matchMedia &&
						window.matchMedia("(prefers-color-scheme: dark)").matches
						? "dark"
						: "light"
					);
				if (colorScheme === "dark") {
					document.body.classList.remove("color-scheme-light");
				} else {
					document.body.classList.add("color-scheme-light");
				}
			</script>
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

				window.addEventListener("message", (ev) => {
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
		</body>
	`;
}

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

	let staticURLs: Record<string, any> | undefined;
	let execute: () => unknown;
	if (typeof window !== "undefined") {
		staticURLs = JSON.parse(
			// @ts-ignore
			document.getElementById("static-urls").textContent,
		);

		execute = debounce(() => {
			if (!visible) {
				return;
			}

			// We have to refresh to change the iframe variable in scope, as the
			// previous iframe is destroyed. We would have to await refresh if this
			// component was refactored to be async.
			iframeID++;
			this.refresh();
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
				console.error(err.message || err);
				this.refresh();
				return;
			}

			iframe.src = "";
			document1.write(generateIFrameHTML(id, code, staticURLs!));
			document1.close();
		}, 2000);
	}

	let height = 100;
	if (typeof window !== "undefined") {
		const onmessage = (ev: any) => {
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
					// Auto-resizing iframes is tricky because you can get into an
					// infinite loop. For instance, if the body height is `100vh`, or if
					// a scrollbar being added or removed causes the page height to
					// change. Therefore, we only increase the height and give a max
					// height of 1000px.
					height = Math.min(1000, Math.max(height, data.height));
					this.refresh();
				}
			}
		};

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
				class=${css`
					display: flex;
					flex-direction: column;
					height: 100%;
				`}
			>
				${showStatus && jsx`
					<div class=${css`
						flex: none;
						padding: 1em;
						border-bottom: 1px solid var(--text-color);
						height: 3em;
					`}>
						${errorMessage ? "Errored!" : loading ? "Loading..." : "Running!"}
					</div>
				`}
				<div class=${css`
					flex: 1 1 auto;
					border: 4px solid ${loading ? "var(--coldark12)" : "var(--coldark11)"};
					padding: 1em;
				`}
				>
					<iframe
						$key=${iframeID}
						$ref=${(el: HTMLIFrameElement) => (iframe = el)}
						class="playground-iframe"
						style="
							border: none;
							width: 100%;
							height: ${autoresize ? `${height}px` : "100%"};
							background-color: var(--bg-color);
						"
					/>
				</div>
			</div>
		`;

		oldValue = value;
		oldVisible = visible;
	}
}
