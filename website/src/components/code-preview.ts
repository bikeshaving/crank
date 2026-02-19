import {jsx} from "@b9g/crank/standalone";
import type {Context} from "@b9g/crank";
import {css} from "@emotion/css";
import {debounce} from "../utils/fns.js";
import {transform} from "../plugins/acorn.js";
import {extractData} from "./serialize-javascript.js";
import {getColorSchemeScript} from "../utils/color-scheme.js";

/**
 * Generate an Import Map from staticURLs for bare specifier resolution.
 */
function generateImportMap(staticURLs: Record<string, string>): string {
	const imports: Record<string, string> = {};
	for (const [key, value] of Object.entries(staticURLs)) {
		// Skip non-module entries like CSS
		if (!key.endsWith(".css")) {
			imports[key] = value;
		}
	}
	return JSON.stringify({imports}, null, "\t\t\t");
}

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
			<script>
				${getColorSchemeScript()}
			</script>
			<script type="importmap">
				${generateImportMap(staticURLs)}
			</script>
			<style>
				/* Minimal reset - only margin/padding, let apps define their own styles */
				html, body {
					margin: 0;
					padding: 0;
				}

				/* CSS variables for apps that want to use them */
				:root {
					--bg-color: #0a0e1f;
					--text-color: #f5f9ff;
					--highlight-color: #daa520;
				}
				.color-scheme-light {
					--bg-color: #e7f4f5;
					--text-color: #0a0e1f;
				}
			</style>
			<link
				rel="stylesheet"
				type="text/css"
				href=${staticURLs!["client.css"]}
			/>
		</head>
		<body>
			<script>
				// Listen for color scheme changes from parent
				window.addEventListener('storage', (e) => {
					if (e.key === 'color-scheme' && (e.newValue === 'dark' || e.newValue === 'light')) {
						const isDark = e.newValue === 'dark';
						document.documentElement.dataset.theme = e.newValue;
						document.documentElement.style.setProperty('--bg-color', isDark ? '#0a0e1f' : '#e7f4f5');
						document.documentElement.style.setProperty('--text-color', isDark ? '#f5f9ff' : '#0a0e1f');
						document.documentElement.classList.toggle('color-scheme-light', !isDark);
						document.body.classList.toggle('color-scheme-light', !isDark);
					}
				});

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
				${getColorSchemeScript()}

				// Listen for color scheme changes from parent
				window.addEventListener('storage', (e) => {
					if (e.key === 'color-scheme' && (e.newValue === 'dark' || e.newValue === 'light')) {
						const isDark = e.newValue === 'dark';
						document.documentElement.dataset.theme = e.newValue;
						document.documentElement.style.setProperty('--bg-color', isDark ? '#0a0e1f' : '#e7f4f5');
						document.documentElement.style.setProperty('--text-color', isDark ? '#f5f9ff' : '#0a0e1f');
						document.documentElement.classList.toggle('color-scheme-light', !isDark);
						document.body.classList.toggle('color-scheme-light', !isDark);
					}
				});

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
		autoresize = false,
		language,
	}: {
		value: string;
		visible?: boolean;
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
	let showErrorModal = true;
	let suppressErrors = false;

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
			this.refresh(() => {
				iframeID++;
			});
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
					this.refresh(() => {
						loading = false;
						errorMessage = err.message || err;
					});
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
				this.refresh(() => {
					loading = false;
				});
			} else if (data.type === "loading") {
				this.refresh(() => {
					loading = true;
					errorMessage = null;
				});
			} else if (data.type === "error") {
				this.refresh(() => {
					loading = false;
					errorMessage = data.message;
					showErrorModal = !suppressErrors;
				});
			} else if (data.type === "resize" && visible) {
				if (autoresize) {
					// Auto-resizing iframes is tricky because you can get into an
					// infinite loop. For instance, if the body height is `100vh`, or if
					// a scrollbar being added or removed causes the page height to
					// change. Therefore, we give a max height of 1000px.
					setTimeout(() => {
						// Putting this in a callback in an attempt to prevent infinite loops.
						this.refresh(() => {
							height = Math.min(1000, Math.max(100, data.height));
						});
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
	for ({value, visible = true, autoresize = false, language} of this) {
		if (value !== oldValue || visible !== oldVisible) {
			// TODO: This looks like it could just be an async function somehow
			loading = true;
			errorMessage = null;
			showErrorModal = !suppressErrors;
			if (typeof window !== "undefined") {
				this.after(() => executeDebounced());
			}
		}

		const pulsingClass = css`
			@keyframes pulse-bg {
				0%,
				100% {
					background-color: rgba(218, 165, 32, 0.2);
				}
				50% {
					background-color: var(--bg-color);
				}
			}
			animation: pulse-bg 1.5s ease-in-out infinite;
		`;

		yield jsx`
			<div class=${css`
				display: flex;
				flex-direction: column;
				height: 100%;
				position: relative;
			`}>
				<div class="${css`
					display: flex;
					flex-direction: column;
					flex: 1 1 auto;
					padding: 1em;
					width: 100%;
					position: relative;
				`} ${loading ? pulsingClass : ""}">
					${
						errorMessage &&
						showErrorModal &&
						jsx`
							<div class=${css`
								position: absolute;
								inset: 0;
								background-color: rgba(0, 0, 0, 0.5);
								display: flex;
								align-items: center;
								justify-content: center;
								padding: 1em;
								z-index: 10;
							`}>
								<div class=${css`
									background-color: rgba(180, 60, 60, 0.95);
									border-radius: 8px;
									max-width: 90%;
									max-height: 80%;
									display: flex;
									flex-direction: column;
									box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
								`}>
									<div class=${css`
										display: flex;
										justify-content: space-between;
										align-items: center;
										padding: 0.75em 1em;
										border-bottom: 1px solid rgba(255, 255, 255, 0.2);
									`}>
										<span class=${css`
											color: white;
											font-weight: bold;
											font-size: 14px;
										`}>Error</span>
										<button
											onclick=${() => {
												this.refresh(() => {
													showErrorModal = false;
												});
											}}
											class=${css`
												background: none;
												border: none;
												color: white;
												font-size: 20px;
												cursor: pointer;
												padding: 0;
												line-height: 1;
												opacity: 0.8;
												&:hover {
													opacity: 1;
												}
											`}
										>×</button>
									</div>
									<pre class=${css`
										color: white;
										background-color: rgba(0, 0, 0, 0.2);
										padding: 1em;
										margin: 0;
										overflow: auto;
										font-size: 12px;
										flex: 1;
									`}>${errorMessage}</pre>
									<label class=${css`
										display: flex;
										align-items: center;
										gap: 0.5em;
										padding: 0.75em 1em;
										border-top: 1px solid rgba(255, 255, 255, 0.2);
										color: white;
										font-size: 12px;
										cursor: pointer;
									`}>
										<input
											type="checkbox"
											checked=${suppressErrors}
											onchange=${(ev: Event) => {
												suppressErrors = (ev.target as HTMLInputElement)
													.checked;
											}}
										/>
										Suppress this modal
									</label>
								</div>
							</div>
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
						style="min-height: ${autoresize ? `${height}px` : "auto"};"
					/>
				</div>
			</div>
		`;

		oldValue = value;
		oldVisible = visible;
	}
}
