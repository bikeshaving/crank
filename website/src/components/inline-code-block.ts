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
	}: {
		value: string;
		lang: string;
		editable: boolean;
		breakpoint: string;
	},
): any {
	let copied = false;

	this.addEventListener("contentchange", (ev: any) => {
		this.refresh(() => {
			value = ev.target.value;
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

	// eslint-disable-next-line crank/prop-destructuring-consistency -- value is internal state updated by contentchange
	for ({lang, editable, breakpoint = "1300px"} of this) {
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
							<button
								hydrate
								onclick=${async () => {
									if (typeof navigator !== "undefined" && navigator.clipboard) {
										await navigator.clipboard.writeText(value);
										this.refresh(() => (copied = true));
										// eslint-disable-next-line crank/require-cleanup-for-timers -- fire-and-forget UI feedback
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
								copy=${true}
								value=${value}
								language=${lang}
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
