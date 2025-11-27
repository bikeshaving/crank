import {jsx, Raw} from "@b9g/crank/standalone";
import {getColorSchemeScript} from "../utils/color-scheme.js";
/**
 * Returns the inline script for PyScript loading
 */
function getPyScriptLoaderScript(): string {
	return `
		// Check if this is a Python iframe
		const params = new URLSearchParams(window.location.search);
		window.isPython = params.get('lang') === 'python';

		// Load PyScript if this is a Python iframe
		if (window.isPython) {
			const pyScriptCss = document.createElement('link');
			pyScriptCss.rel = 'stylesheet';
			pyScriptCss.href = 'https://pyscript.net/releases/2025.8.1/core.css';
			document.head.appendChild(pyScriptCss);

			const pyScriptJs = document.createElement('script');
			pyScriptJs.type = 'module';
			pyScriptJs.src = 'https://pyscript.net/releases/2025.8.1/core.js';
			document.head.appendChild(pyScriptJs);
		}
	`;
}

/**
 * Returns the main playground script for message handling and code execution
 */
function getPlaygroundScript(): string {
	return `
		const root = document.getElementById('playground-root');

		function reset() {
			// Clear body children except essential elements
			Array.from(document.body.children).forEach(child => {
				if (child.id === 'playground-root') {
					child.innerHTML = '';
				} else if (!child.matches('script:not([data-playground])')) {
					child.remove();
				}
			});
			// Remove dynamically added scripts
			document.querySelectorAll('script[data-playground]').forEach(s => s.remove());
			document.querySelectorAll('py-config').forEach(s => s.remove());
			document.querySelectorAll('script[type="py"]').forEach(s => s.remove());
		}

		function executeCode(code, id) {
			if (window.isPython) {
				// Create PyScript config
				const config = document.createElement('py-config');
				config.textContent = JSON.stringify({
					packages: ['crankpy'],
					js_modules: {
						main: {
							'https://esm.run/@b9g/crank@0.7.1/crank.js': 'crank_core',
							'https://esm.run/@b9g/crank@0.7.1/dom.js': 'crank_dom'
						}
					}
				});
				document.body.appendChild(config);

				// Create Python script element
				const pyScript = document.createElement('script');
				pyScript.type = 'py';
				pyScript.textContent = code;
				document.body.appendChild(pyScript);

				// Listen for PyScript events
				window.addEventListener('py:ready', () => {
					window.parent.postMessage(
						JSON.stringify({type: 'executed', id}),
						window.location.origin
					);
				}, {once: true});

				window.addEventListener('py:error', (event) => {
					window.parent.postMessage(
						JSON.stringify({
							type: 'error',
							id,
							message: event.detail?.message || 'Python error'
						}),
						window.location.origin
					);
				}, {once: true});

				// Send loading message
				window.parent.postMessage(
					JSON.stringify({type: 'loading', id, message: 'Loading PyScript...'}),
					window.location.origin
				);
			} else {
				// JavaScript execution
				const script = document.createElement('script');
				script.type = 'module';
				script.dataset.playground = 'true';
				script.textContent = code;
				document.body.appendChild(script);

				// Notify parent of successful execution
				window.parent.postMessage(
					JSON.stringify({type: 'executed', id}),
					window.location.origin
				);
			}
		}

		// Message handler
		window.addEventListener('message', (ev) => {
			try {
				const data = JSON.parse(ev.data);

				if (data.type === 'reset') {
					reset();
					// Signal ready after reset
					window.parent.postMessage(
						JSON.stringify({type: 'ready'}),
						window.location.origin
					);
				} else if (data.type === 'execute') {
					executeCode(data.code, data.id);
				}
			} catch (error) {
				window.parent.postMessage(
					JSON.stringify({
						type: 'error',
						message: error.message || String(error)
					}),
					window.location.origin
				);
			}
		});

		// Error handlers
		window.addEventListener('error', (ev) => {
			if (/ResizeObserver loop completed with undelivered notifications/.test(ev.message)) {
				return;
			}
			window.parent.postMessage(
				JSON.stringify({type: 'error', message: ev.message}),
				window.location.origin
			);
		});

		window.addEventListener('unhandledrejection', (ev) => {
			if (/ResizeObserver loop completed with undelivered notifications/.test(ev.reason?.message)) {
				return;
			}
			window.parent.postMessage(
				JSON.stringify({type: 'error', message: ev.reason?.message || String(ev.reason)}),
				window.location.origin
			);
		});

		// ResizeObserver for auto-resizing
		const obs = new ResizeObserver((entries) => {
			const height = Math.max(entries[0].contentRect.height, 100);
			if (
				document.documentElement.clientHeight <
				document.documentElement.scrollHeight
			) {
				window.parent.postMessage(
					JSON.stringify({type: 'resize', height}),
					window.location.origin
				);
			}
		});
		obs.observe(document.documentElement);

		// Listen for color scheme changes from parent window
		window.addEventListener('storage', (e) => {
			if (e.key === 'color-scheme' && (e.newValue === 'dark' || e.newValue === 'light')) {
				const isDark = e.newValue === 'dark';
				document.documentElement.dataset.theme = e.newValue;
				document.documentElement.style.setProperty('--bg-color', isDark ? '#0a0e1f' : '#e7f4f5');
				document.documentElement.style.setProperty('--text-color', isDark ? '#f5f9ff' : '#0a0e1f');
				document.documentElement.classList.toggle('color-scheme-light', !isDark);
			}
		});

		// Notify parent that iframe is ready
		window.parent.postMessage(
			JSON.stringify({type: 'ready'}),
			window.location.origin
		);
	`;
}

const styles = `
	:root {
		--bg-color: #0a0e1f;
		--text-color: #f5f9ff;
		--highlight-color: #daa520;
	}

	[data-theme="light"] {
		--bg-color: #e7f4f5;
		--text-color: #0a0e1f;
	}

	*, *::before, *::after {
		box-sizing: border-box;
	}

	html, body {
		background-color: var(--bg-color);
		color: var(--text-color);
		margin: 0;
		padding: 0;
		font-family: sans-serif;
	}
`;

/**
 * Minimal playground preview iframe view
 *
 * This view provides a minimal HTML page for playground code execution:
 * - NO Root component (no navbar/chrome)
 * - Includes color scheme initialization script
 * - Sets up storage event listener for automatic color sync
 * - Receives and executes code via postMessage
 * - Supports reset message to clear state without full reload
 */
export default function PlaygroundPreview() {
	const colorSchemeInit = `(() => { ${getColorSchemeScript()} })()`;

	return jsx`
		<${Raw} value="<!DOCTYPE html>" />
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				<script><${Raw} value=${colorSchemeInit} /></script>
				<script><${Raw} value=${getPyScriptLoaderScript()} /></script>
				<style>${styles}</style>
			</head>
			<body>
				<div id="playground-root" />
				<script><${Raw} value=${getPlaygroundScript()} /></script>
			</body>
		</html>
	`;
}
