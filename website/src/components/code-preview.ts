import {jsx} from "@b9g/crank/standalone";
import type {Context} from "@b9g/crank";
import {css} from "@emotion/css";
import {debounce} from "../utils/fns.js";
import {transform} from "../plugins/babel.js";
import {extractData} from "./serialize-javascript.js";

function generateJavaScriptIFrameHTML(
	id: number,
	code: string,
	staticURLs: Record<string, any>,
): string {
	return `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width,initial-scale=1">
			<style>
				/* Inline styles to ensure text is visible before external CSS loads */
				:root {
					--bg-color: #0a0e1f;
					--text-color: #f5f9ff;
				}
				.color-scheme-light {
					--bg-color: #e7f4f5;
					--text-color: #0a0e1f;
				}
				* {
					color: var(--text-color);
					box-sizing: border-box;
				}
				body {
					background-color: var(--bg-color);
					color: var(--text-color);
					font-family: sans-serif;
					margin: 0;
					padding: 0;
				}
			</style>
			<link
				rel="stylesheet"
				type="text/css"
				href=${staticURLs!["client.css"]}
			/>
		</head>
		<body>
		  <!-- TODO: extract these scripts to a separate file or something -->
			<script>
				const colorScheme = sessionStorage.getItem("color-scheme") ||
					(
						window.matchMedia &&
						window.matchMedia("(prefers-color-scheme: dark)").matches
						? "dark"
						: "light"
					);
				if (colorScheme === "dark") {
					document.documentElement.classList.remove("color-scheme-light");
					document.body.classList.remove("color-scheme-light");
				} else {
					document.documentElement.classList.add("color-scheme-light");
					document.body.classList.add("color-scheme-light");
				}
			</script>
			<script>
				window.addEventListener("load", (ev) => {
					window.parent.postMessage(
						JSON.stringify({type: "executed", id: ${id}}),
						window.location.origin,
					);
				});

				window.addEventListener("error", (ev) => {
					// https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver#observation_errors
					if (/ResizeObserver loop completed with undelivered notifications/.test(ev.message)) {
						return;
					}

					window.parent.postMessage(
						JSON.stringify({type: "error", id: ${id}, message: ev.message}),
						window.location.origin,
					);
				});

				window.addEventListener("unhandledrejection", (ev) => {
					if (/ResizeObserver loop completed with undelivered notifications/.test(ev.reason.message)) {
						return;
					}
					window.parent.postMessage(
						JSON.stringify({type: "error", id: ${id}, message: ev.reason.message}),
						window.location.origin,
					);
				});

				const obs = new ResizeObserver((entries) => {
					const height = Math.max(entries[0].contentRect.height, 100);
					if (
						document.documentElement.clientHeight <
						document.documentElement.scrollHeight
					) {
						window.parent.postMessage(
							JSON.stringify({
								type: "resize",
								id: ${id},
								height,
							}),
							window.location.origin,
						);
					}
				})

				obs.observe(document.documentElement);
			</script>
			<script type="module">${code}</script>
		</body>
		</html>
	`;
}

function generatePythonIFrameHTML(
	id: number,
	code: string,
	staticURLs: Record<string, any>,
): string {
	return `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width,initial-scale=1">
			<link
				rel="stylesheet"
				type="text/css"
				href=${staticURLs!["client.css"]}
			/>
			<!-- PyScript CSS -->
			<link rel="stylesheet" href="https://pyscript.net/releases/2025.8.1/core.css">
			<script type="module" src="https://pyscript.net/releases/2025.8.1/core.js"></script>
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
					document.documentElement.classList.remove("color-scheme-light");
					document.body.classList.remove("color-scheme-light");
				} else {
					document.documentElement.classList.add("color-scheme-light");
					document.body.classList.add("color-scheme-light");
				}
			</script>
			<script>
				// Send loading message first
				window.parent.postMessage(
					JSON.stringify({type: "loading", id: ${id}, message: "Loading PyScript..."}),
					window.location.origin,
				);

				window.addEventListener("error", (ev) => {
					if (/ResizeObserver loop completed with undelivered notifications/.test(ev.message)) {
						return;
					}

					window.parent.postMessage(
						JSON.stringify({type: "error", id: ${id}, message: ev.message}),
						window.location.origin,
					);
				});

				const obs = new ResizeObserver((entries) => {
					const height = Math.max(entries[0].contentRect.height, 100);
					if (
						document.documentElement.clientHeight <
						document.documentElement.scrollHeight
					) {
						window.parent.postMessage(
							JSON.stringify({
								type: "resize",
								id: ${id},
								height,
							}),
							window.location.origin,
						);
					}
				})

				obs.observe(document.documentElement);

				// Handle PyScript ready event
				window.addEventListener('py:ready', () => {
					window.parent.postMessage(
						JSON.stringify({type: "executed", id: ${id}}),
						window.location.origin,
					);
				});

				// Handle PyScript errors
				window.addEventListener('py:error', (event) => {
					window.parent.postMessage(
						JSON.stringify({type: "error", id: ${id}, message: event.detail.message}),
						window.location.origin,
					);
				});
			</script>
			
			<py-config>
				{
					"packages": ["crankpy"],
					"js_modules": {
						"main": {
							"https://esm.run/@b9g/crank@0.7.1/crank.js": "crank_core",
							"https://esm.run/@b9g/crank@0.7.1/dom.js": "crank_dom"
						}
					}
				}
			</py-config>
			
			<!-- Python code execution -->
			<script type="py">
${code}
			</script>
		</body>
		</html>
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
		language,
	}: {
		value: string;
		visible?: boolean;
		showStatus?: boolean;
		autoresize?: boolean;
		language?: "javascript" | "python";
	},
): any {
	const id = globalId++;
	let iframe!: HTMLIFrameElement;
	// We use this iframe ID as the key for the iframe, so that previous iframes
	// are destroyed along with any registered callbacks like setInterval.
	let iframeID = 0;
	let loading = true;
	let errorMessage: string | null = null;

	const currentLanguage = language || "javascript";
	const isPython = currentLanguage === "python";

	let staticURLs: Record<string, any> | undefined;
	let execute: () => unknown;
	let executeDebounced: () => unknown;
	if (typeof window !== "undefined") {
		staticURLs = extractData(
			document.getElementById("static-urls") as HTMLScriptElement,
		) as Record<string, any>;
		execute = () => {
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

			let code = value;

			if (isPython) {
				// Python code - no transformation needed
				document1.write(generatePythonIFrameHTML(id, code, staticURLs!));
			} else {
				// JavaScript code - transform with Babel
				try {
					const parsed = transform(value);
					code = parsed.code;
					document1.write(generateJavaScriptIFrameHTML(id, code, staticURLs!));
				} catch (err: any) {
					console.error(err);
					loading = false;
					errorMessage = err.message || err;
					this.refresh();
					return;
				}
			}

			document1.close();
		};

		executeDebounced = debounce(execute, 2000);
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
			} else if (data.type === "loading") {
				loading = true;
				errorMessage = null;
				this.refresh();
			} else if (data.type === "error") {
				loading = false;
				errorMessage = data.message;
				this.refresh();
			} else if (data.type === "resize" && visible) {
				if (autoresize) {
					// Auto-resizing iframes is tricky because you can get into an
					// infinite loop. For instance, if the body height is `100vh`, or if
					// a scrollbar being added or removed causes the page height to
					// change. Therefore, we give a max height of 1000px.
					setTimeout(() => {
						// Putting this in a callback in an attempt to prevent infinite loops.
						height = Math.min(1000, Math.max(100, data.height));
						this.refresh();
					});
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
		language,
	} of this) {
		if (value !== oldValue || visible !== oldVisible) {
			// TODO: This looks like it could just be an async function somehow
			loading = true;
			errorMessage = null;
			if (typeof window !== "undefined") {
				this.after(() => executeDebounced());
			}
		}

		yield jsx`
			<div class=${css`
				display: flex;
				flex-direction: column;
				height: 100%;
			`}>
				${
					showStatus &&
					jsx`
						<div class=${css`
							flex: none;
							padding: 1em;
							height: 3em;
							border-bottom: 1px solid var(--text-color);
							display: flex;
							align-items: center;
							justify-content: space-between;
						`}>
							<span>${errorMessage ? "Errored!" : loading ? "Loading..." : "Running!"}</span>
						</div>
					`
				}
				<div class=${css`
					display: flex;
					flex-direction: column;
					flex: 1 1 auto;
					padding: 1em;
					transition: background-color 0.4s ease-out;
					background-color: ${errorMessage
						? "var(--coldark15)"
						: loading
							? "var(--coldark02)"
							: "var(--background-color)"};
					width: 100%;
				`}>
					${
						errorMessage &&
						jsx`
							<pre class=${css`
								flex: none;
								color: var(--coldark12);
								background-color: var(--bg-color);
								width: 100%;
								overflow-x: auto;
							`}>${errorMessage}</pre>
						`
					}
					<iframe
						key=${iframeID}
						ref=${(el: HTMLIFrameElement) => (iframe = el)}
						class="
							playground-iframe
							${css`
								flex: 1 1 auto;
								border: none;
								width: 100%;
								background-color: var(--bg-color);
							`}
						"
						style="height: ${autoresize ? `${height}px` : "auto"};"
					/>
				</div>
			</div>
		`;

		oldValue = value;
		oldVisible = visible;
	}
}
