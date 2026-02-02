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
		jsxVersion === value ? "jsx" : templateVersion === value ? "template" : "jsx";

	const toggleSyntax = () => {
		if (syntaxMode === "jsx" && templateVersion) {
			syntaxMode = "template";
			value = templateVersion;
		} else if (syntaxMode === "template" && jsxVersion) {
			syntaxMode = "jsx";
			value = jsxVersion;
		}
		this.refresh();
	};

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

	const canToggle = jsxVersion && templateVersion;

	for ({lang, editable, breakpoint = "1300px", jsxVersion, templateVersion} of this) {
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
						${
							canToggle &&
							jsx`
								<div hydrate="!class" class=${css`
									display: flex;
									justify-content: flex-end;
									padding: 4px 8px;
									background-color: var(--bg-color);
									border-bottom: 1px solid var(--text-color);
								`}>
									<button
										onclick=${toggleSyntax}
										class=${css`
											padding: 2px 8px;
											font-size: 12px;
											cursor: pointer;
											border: 1px solid var(--text-color);
											border-radius: 4px;
											background-color: var(--bg-color);
											color: var(--text-color);
											&:hover {
												background-color: var(--text-color);
												color: var(--bg-color);
											}
										`}
									>
										${syntaxMode === "jsx" ? "Show Template" : "Show JSX"}
									</button>
								</div>
							`
						}
						<div hydrate="!class" class=${css`
							overflow-x: auto;
						`}>
							<${CodeEditor}
								copy
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
