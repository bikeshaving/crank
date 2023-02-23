import {jsx} from "@b9g/crank/standalone";
import type {Context} from "@b9g/crank";
import {css} from "@emotion/css";
import {CodeEditor} from "./code-editor.js";
import {CodePreview} from "./code-preview.js";

export function* InlineCodeBlock(
	this: Context<typeof InlineCodeBlock>,
	{value, lang, editable}: {value: string; lang: string; editable: boolean},
): any {
	this.addEventListener("contentchange", (ev: any) => {
		// TODO: think about whether its wise to mutate a prop
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

		this.flush((root) => {
			intersectionObserver.observe(root);
		});

		this.cleanup(() => {
			intersectionObserver.disconnect();
		});
	}

	for ({lang, editable} of this) {
		yield jsx`
			<div class=${css`
				max-width: ${editable ? "calc(100% - 1px)" : "min(100%, 1000px)"};
			`}>
				<div class=${css`
					display: flex;
					flex-direction: row;
					flex-wrap: wrap;
					align-items: flex-start;
					font-size: 16px;
				`}>
					<div class=${css`
						flex: 1 1 650px;
						max-width: 100%;
						overflow: auto;
						border: 1px solid var(--text-color);
						margin-top: -1px;
					`}>
						<${CodeEditor}
							$static
							value=${value}
							lang=${lang}
							editable=${editable}
						/>
					</div>
					${
						editable &&
						jsx`
							<div class=${css`
								flex: 1 1 auto;
								position: sticky;
								top: 100px;
								border-top: 1px solid var(--text-color);
								margin-top: -1px;
								border-right: 1px solid var(--text-color);
								border-bottom: 1px solid var(--text-color);
								min-height: 50px;
							`}>
								<${CodePreview}
									value=${value}
									visible=${isIntersecting}
									autoresize
									showStatus
								/>
							</div>
						`
					}
				</div>
			</div>
		`;
	}
}
