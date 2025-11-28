import {jsx} from "@b9g/crank/standalone";
import type {Context} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";
import {css} from "@emotion/css";

import "prismjs/components/prism-javascript";

import {CodePreview} from "../components/code-preview.js";
import {CodeEditor} from "../components/code-editor.js";
import {extractData} from "../components/serialize-javascript.js";
import LZString from "lz-string";

// TODO: move this to the ContentAreaElement component
import {ContentAreaElement} from "@b9g/revise/contentarea.js";
if (!window.customElements.get("content-area")) {
	window.customElements.define("content-area", ContentAreaElement);
}

function CodeEditorNavbar({children}: any) {
	return jsx`
		<div class=${css`
			flex: none;
			padding: 1em;
			height: 3em;
			border-bottom: 1px solid var(--coldark3);
			display: flex;
			flex-direction: row;
			align-items: center;
			position: sticky;
			left: 0;
		`}>
			${children}
		</div>
	`;
}

const examples = extractData(
	document.getElementById("examples") as HTMLScriptElement,
);

// Helper function to debounce URL hash updates
function debounceHash(callback: () => void, delay: number) {
	let timeoutId: number | undefined;
	return () => {
		if (timeoutId !== undefined) {
			clearTimeout(timeoutId);
		}
		timeoutId = setTimeout(callback, delay) as any;
	};
}

function* Playground(this: Context) {
	let code = "";
	let updateEditor = true;
	let copyButtonText = "Copy Link";

	// Try to load code from URL hash first
	if (window.location.hash) {
		try {
			const compressed = window.location.hash.slice(1);
			const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
			if (decompressed) {
				code = decompressed;
			}
		} catch (err) {
			console.warn("Failed to decompress code from URL:", err);
		}
	}

	// Fall back to localStorage, then default example
	if (!code.trim()) {
		code = localStorage.getItem("playground-value") || "";
	}
	if (!code.trim()) {
		code = examples[0].code;
	}

	// Debounced function to update URL hash
	const updateHash = debounceHash(() => {
		const compressed = LZString.compressToEncodedURIComponent(code);
		window.history.replaceState(null, "", `#${compressed}`);
	}, 1000);

	this.addEventListener("contentchange", (ev: any) => {
		code = ev.target.value;
		localStorage.setItem("playground-value", code);
		updateHash();
		this.refresh();
	});

	let exampleName = "";
	const onexamplechange = (ev: Event) => {
		exampleName = (ev.target as HTMLSelectElement).value;
		const {code: code1} = examples.find(
			(example: any) => example.name === exampleName,
		);
		code = code1;
		updateEditor = true;
		updateHash();
		this.refresh();
	};

	const onCopyLink = async () => {
		const compressed = LZString.compressToEncodedURIComponent(code);
		const url = `${window.location.origin}${window.location.pathname}#${compressed}`;

		try {
			await navigator.clipboard.writeText(url);
			copyButtonText = "Copied!";
			this.refresh();
			setTimeout(() => {
				copyButtonText = "Copy Link";
				this.refresh();
			}, 2000);
		} catch (err) {
			console.error("Failed to copy to clipboard:", err);
			copyButtonText = "Failed";
			this.refresh();
			setTimeout(() => {
				copyButtonText = "Copy Link";
				this.refresh();
			}, 2000);
		}
	};

	const hashchange = (ev: HashChangeEvent) => {
		if (!window.location.hash) {
			return;
		}
		try {
			const compressed = window.location.hash.slice(1);
			const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
			if (decompressed && decompressed !== code) {
				code = decompressed;
				updateEditor = true;
				this.refresh();
			}
		} catch (err) {
			console.warn("Failed to decompress code from URL:", err);
		}
	};

	window.addEventListener("hashchange", hashchange);
	this.cleanup(() => window.removeEventListener("hashchange", hashchange));

	for ({} of this) {
		this.schedule(() => {
			updateEditor = false;
		});
		yield jsx`
			<div class="playground ${css`
				display: flex;
				flex-direction: column;
				@media (min-width: 800px) {
					flex-direction: row;
					align-items: stretch;
					justify-content: stretch;
				}

				width: 100%;
				padding-top: 50px;
			`}">
				<div class=${css`
					flex: 0 1 auto;
					min-height: 80vh;
					overflow: auto;
					@media (min-width: 800px) {
						height: calc(100vh - 50px);
						width: 61.8%;
					}
				`}>
					<${CodeEditorNavbar}>
						<div class=${css`
							display: flex;
							gap: 1em;
							align-items: center;
							width: 100%;
						`}>
							<select
								name="Example"
								value=${exampleName}
								onchange=${onexamplechange}
								class=${css`
									padding: 0.25em 0.5em;
									border: 1px solid var(--coldark3);
									border-radius: 4px;
									background-color: var(--bg-color);
									color: var(--text-color);
								`}
							>
								<option value="">Load an example...</option>
								${examples.map(
									({name, label}: any) => jsx`
									<option value=${name} key=${name}>${label}</option>
								`,
								)}
							</select>
							<button
								onclick=${onCopyLink}
								class=${css`
									padding: 0.25em 0.75em;
									border: 1px solid var(--coldark3);
									border-radius: 4px;
									background-color: var(--bg-color);
									color: var(--text-color);
									cursor: pointer;
									transition: all 0.2s;
									&:hover {
										background-color: var(--coldark02);
									}
									&:active {
										transform: scale(0.98);
									}
								`}
							>
								${copyButtonText}
							</button>
						</div>
					<//CodeEditorNavbar>
					<${CodeEditor}
						copy=${!updateEditor}
						value=${code}
						language="typescript"
						showGutter=${true}
					/>
				</div>
				<div class=${css`
					@media (min-width: 800px) {
						flex: 1 0 auto;
						height: calc(100vh - 50px);
						width: 400px;
					}
					overflow-y: auto;
					border-top: 1px solid currentcolor;
					@media (min-width: 800px) {
						border-top: none;
						border-left: 1px solid currentcolor;
						margin-left: -1px;
					}
				`}>
					<${CodePreview} value=${code} showStatus autoresize />
				</div>
			</div>
		`;
	}
}

const el = document.getElementById("playground");
renderer.render(jsx`<${Playground} />`, el!);
