import {jsx} from "@b9g/crank/standalone";
import type {Context} from "@b9g/crank";
import {css} from "@emotion/css";
import {CodeEditor} from "./code-editor.js";
import {CodePreview} from "./code-preview.js";

// Detect if code uses JSX or template syntax
function detectSyntax(code: string, lang: string): "jsx" | "template" | null {
	const hasTemplate = /jsx`/.test(code);
	// Use language identifier for JSX detection, not content sniffing
	// (content sniffing fails on TypeScript generics like <T>)
	const hasJSX = /jsx|tsx/.test(lang) && !hasTemplate;
	if (hasJSX) return "jsx";
	if (hasTemplate) return "template";
	return null;
}

// Check if language supports toggle
function canToggleLang(lang: string): boolean {
	if (lang.includes("notoggle")) return false;
	return /jsx|tsx/.test(lang) || lang.startsWith("js") || lang.startsWith("ts");
}

export function* InlineCodeBlock(
	this: Context<typeof InlineCodeBlock>,
	{
		value,
		lang,
		editable,
		// TODO: This is narsty.
		breakpoint = "1300px",
	}: {
		value: string;
		lang: string;
		editable: boolean;
		breakpoint: string;
	},
): any {
	// Lazy-loaded conversion functions
	let jsxToTemplate: ((code: string) => string) | null = null;
	let templateToJSX: ((code: string) => string) | null = null;

	// Detect initial syntax
	const detectedSyntax = detectSyntax(value, lang);
	let syntaxMode: "jsx" | "template" = detectedSyntax || "jsx";

	let justToggled = false;
	let copied = false;
	let converting = false;

	this.addEventListener("contentchange", (ev: any) => {
		this.refresh(() => {
			value = ev.target.value;
			syntaxMode = detectSyntax(value, lang) || "jsx";
		});
	});

	let isIntersecting = false;
	if (typeof window !== "undefined") {
		const intersectionObserver = new IntersectionObserver(
			(entries) => {
				if (!isIntersecting) {
					this.refresh(() => {
						isIntersecting = entries[0].isIntersecting;
					});
				}
			},
			{threshold: 0.1},
		);

		this.after((root) => {
			intersectionObserver.observe(root);
		});

		this.cleanup(() => {
			intersectionObserver.disconnect();
		});
	}

	for ({value, lang, editable, breakpoint = "1300px"} of this) {
		if (justToggled) {
			this.schedule(() => {
				justToggled = false;
			});
		}

		const canToggle = canToggleLang(lang) && detectedSyntax !== null;

		const toggleSyntax = async () => {
			if (converting) return;

			// Lazy load conversion functions
			if (!jsxToTemplate || !templateToJSX) {
				this.refresh(() => {
					converting = true;
				});
				try {
					const codemods = await import("@b9g/crank-codemods");
					jsxToTemplate = codemods.jsxToTemplate;
					templateToJSX = codemods.templateToJSX;
				} catch {
					converting = false;
					return;
				}
				converting = false;
			}

			try {
				if (syntaxMode === "jsx") {
					value = jsxToTemplate(value);
					syntaxMode = "template";
				} else {
					value = templateToJSX(value);
					syntaxMode = "jsx";
				}
			} catch {
				// Conversion failed, stay on current syntax
			}

			this.refresh(() => {
				justToggled = true;
			});
		};
		yield jsx`
			<div hydrate="!class" class=${css`
				max-width: ${editable ? "calc(100% - 1px)" : "min(100%, 1000px)"};
			`}>
				<div hydrate="!class" class=${css`
					display: flex;
					flex-direction: column;
					font-size: 16px;
					@media (min-width: ${breakpoint}) {
						flex-direction: row;
						align-items: flex-start;
					}
				`}>
					<div hydrate="!class" class=${css`
						position: relative;
						flex: 1 1 auto;
						width: 100%;
						border: 1px solid var(--text-color);
						border-radius: ${editable ? "4px 4px 0 0" : "4px"};
						overflow: hidden;
						${editable
							? `@media (min-width: ${breakpoint}) {
							max-width: 61.8%;
							border-radius: 4px 0 0 4px;
						}`
							: ""}
					`}>
						<div hydrate="!class" class=${css`
							position: absolute;
							top: 0.5em;
							right: 0.5em;
							z-index: 10;
							display: flex;
							align-items: center;
							gap: 8px;
						`}>
							${
								canToggle &&
								jsx`
									<button
										hydrate
										onclick=${toggleSyntax}
										role="switch"
										aria-label="toggle syntax"
										aria-checked=${syntaxMode === "template" ? "true" : "false"}
										class=${css`
											position: relative;
											width: 48px;
											height: 24px;
											border-radius: 12px;
											border: 1px solid var(--text-color);
											background: transparent;
											cursor: pointer;
											padding: 0 4px;
											display: flex;
											align-items: center;
											justify-content: space-between;
											font-size: 10px;
											font-family: monospace;
											opacity: 0.7;
											transition: opacity 0.2s;
											&:hover {
												opacity: 1;
											}
											&:focus {
												outline: none;
												opacity: 1;
											}
										`}
									>
										<span>JSX</span>
										<span>JS</span>
										<span
											class=${css`
												position: absolute;
												width: 22px;
												height: 22px;
												border-radius: 11px;
												border: 1px solid var(--text-color);
												background: var(--bg-color);
												transition: left 0.2s;
											`}
											style=${{left: syntaxMode === "jsx" ? "24px" : "2px"}}
										/>
									</button>
								`
							}
							<button
								hydrate
								onclick=${async () => {
									if (typeof navigator !== "undefined" && navigator.clipboard) {
										await navigator.clipboard.writeText(value);
										this.refresh(() => (copied = true));
										setTimeout(
											() => this.refresh(() => (copied = false)),
											2000,
										);
									}
								}}
								class=${css`
									height: 24px;
									padding: 0 8px;
									border-radius: 4px;
									border: 1px solid var(--text-color);
									background: transparent;
									font-size: 10px;
									font-family: monospace;
									cursor: pointer;
									opacity: 0.7;
									transition: opacity 0.2s;
									&:hover {
										opacity: 1;
									}
								`}
							>
								${copied ? "Copied!" : "Copy"}
							</button>
						</div>
						<div hydrate="!class" class=${css`
							overflow-x: auto;
						`}>
							<${CodeEditor}
								copy=${!justToggled}
								value=${value}
								lang=${lang}
								editable=${editable}
							/>
						</div>
					</div>
					${
						editable &&
						jsx`
							<div hydrate="!class" class=${css`
								flex: 1 1 auto;
								position: sticky;
								top: 100px;
								border: 1px solid var(--text-color);
								border-radius: 0 0 4px 4px;
								margin-top: -1px;
								min-height: 50px;
								width: 100%;
								background-color: var(--bg-color);
								@media screen and (min-width: ${breakpoint}) {
									margin-top: 0;
									margin-left: -1px;
									border-radius: 0 4px 4px 0;
									width: 30%;
								}
							`}>
								<${CodePreview}
									value=${value}
									visible=${isIntersecting}
									autoresize
									showStatus
									language=${lang.startsWith("python") ? "python" : "javascript"}
								/>
							</div>
						`
					}
				</div>
			</div>
		`;
	}
}
