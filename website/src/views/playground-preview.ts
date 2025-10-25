import {jsx, Raw} from "@b9g/crank/standalone";
import {getColorSchemeScript} from "../utils/color-scheme.js";

/**
 * Minimal server-rendered view for playground preview iframes.
 * This loads as a clean HTML page with critical scripts,
 * then receives and executes user code via postMessage.
 */
export default function* PlaygroundPreview() {
	const colorSchemeScript = getColorSchemeScript();

	const scriptContent = `
		// Listen for code from parent window
		window.addEventListener("message", async (ev) => {
			try {
				const data = JSON.parse(ev.data);

				if (data.type === "execute-code") {
					const code = data.code;
					const id = data.id;

					try {
						// Execute user code as a module
						const blob = new Blob([code], { type: 'application/javascript' });
						const url = URL.createObjectURL(blob);
						await import(url);
						URL.revokeObjectURL(url);

						// Notify parent of successful execution
						window.parent.postMessage(
							JSON.stringify({ type: "executed", id }),
							window.location.origin
						);
					} catch (error) {
						// Notify parent of error
						window.parent.postMessage(
							JSON.stringify({
								type: "error",
								id,
								message: error.message || String(error)
							}),
							window.location.origin
						);
					}
				}
			} catch {
				// Ignore non-JSON messages
			}
		});

		// Handle errors
		window.addEventListener("error", (ev) => {
			if (/ResizeObserver loop completed with undelivered notifications/.test(ev.message)) {
				return;
			}

			window.parent.postMessage(
				JSON.stringify({ type: "error", message: ev.message }),
				window.location.origin
			);
		});

		window.addEventListener("unhandledrejection", (ev) => {
			if (/ResizeObserver loop completed with undelivered notifications/.test(ev.reason?.message)) {
				return;
			}
			window.parent.postMessage(
				JSON.stringify({
					type: "error",
					message: ev.reason?.message || String(ev.reason)
				}),
				window.location.origin
			);
		});

		// Set up resize observer
		const obs = new ResizeObserver((entries) => {
			const height = Math.max(entries[0].contentRect.height, 100);
			if (
				document.documentElement.clientHeight <
				document.documentElement.scrollHeight
			) {
				window.parent.postMessage(
					JSON.stringify({
						type: "resize",
						height,
					}),
					window.location.origin
				);
			}
		});

		obs.observe(document.documentElement);

		// Signal ready
		window.parent.postMessage(
			JSON.stringify({ type: "ready" }),
			window.location.origin
		);
	`;

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width,initial-scale=1">
	<script>${colorSchemeScript}</script>
	<style>
		html, body {
			background-color: #0a0e1f;
			color: #f5f9ff;
			margin: 0;
			padding: 0;
			font-family: sans-serif;
		}
		html.color-scheme-light, html.color-scheme-light body {
			background-color: #e7f4f5;
			color: #0a0e1f;
		}
		:root {
			--bg-color: #0a0e1f;
			--text-color: #f5f9ff;
		}
		.color-scheme-light {
			--bg-color: #e7f4f5;
			--text-color: #0a0e1f;
		}
	</style>
</head>
<body>
	<script type="module">${scriptContent}</script>
</body>
</html>`;

	yield jsx`<${Raw} value=${html} />`;
}
