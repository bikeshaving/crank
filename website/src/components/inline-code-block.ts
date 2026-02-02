import {jsx} from "@b9g/crank/standalone";
import type {Context} from "@b9g/crank";
import {css} from "@emotion/css";
import {CodeEditor} from "./code-editor.js";
import {CodePreview} from "./code-preview.js";

export function* InlineCodeBlock(
	this: Context<typeof InlineCodeBlock>,
	{
		value,
		lang,
		editable,
		// TODO: This is narsty.
		breakpoint = "1300px",
		jsxVersion = null,
		templateVersion = null,
	}: {
		value: string;
		lang: string;
		editable: boolean;
		breakpoint: string;
		jsxVersion?: string | null;
		templateVersion?: string | null;
	},
): any {
	// Track current syntax mode: "jsx" or "template"
	let syntaxMode: "jsx" | "template" =
		jsxVersion === value
			? "jsx"
			: templateVersion === value
				? "template"
				: "jsx";
	let justToggled = false;
	let copied = false;

	this.addEventListener("contentchange", (ev: any) => {
		value = ev.target.value;
		this.refresh();
	});

	let isIntersecting = false;
	if (typeof window !== "undefined") {
		const intersectionObserver = new IntersectionObserver(
			(entries) => {
				if (!isIntersecting) {
					isIntersecting = entries[0].isIntersecting;
					this.refresh();
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

	for ({
		lang,
		editable,
		breakpoint = "1300px",
		jsxVersion,
		templateVersion,
	} of this) {
		if (justToggled) {
			this.schedule(() => {
				justToggled = false;
			});
		}
		const canToggle = jsxVersion && templateVersion;
		const toggleSyntax = () => {
			if (syntaxMode === "jsx" && templateVersion) {
				syntaxMode = "template";
				value = templateVersion;
			} else if (syntaxMode === "template" && jsxVersion) {
				syntaxMode = "jsx";
				value = jsxVersion;
			}
			justToggled = true;
			this.refresh();
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
										hydrate="!style"
										onclick=${toggleSyntax}
										role="switch"
										aria-label="toggle syntax"
										aria-checked=${syntaxMode === "template"}
										style="display: flex;"
										class=${css`
											position: relative;
											width: 52px;
											height: 24px;
											border-radius: 12px;
											border: 1px solid var(--text-color);
											background: var(--bg-color);
											cursor: pointer;
											padding: 0 4px;
											display: none; /* Hidden until hydration */
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
												height: 20px;
												border-radius: 10px;
												border: 1px solid var(--text-color);
												background: color-mix(
													in srgb,
													var(--bg-color) 70%,
													transparent
												);
												backdrop-filter: blur(2px);
												transition: left 0.2s;
											`}
											style=${{left: syntaxMode === "jsx" ? "27px" : "2px"}}
										/>
									</button>
								`
							}
							<button
								hydrate="!style"
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
								style="display: inline-block;"
								class=${css`
									display: none; /* Hidden until hydration */
									padding: 0.3em 0.6em;
									font-size: 12px;
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
