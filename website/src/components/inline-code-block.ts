import {jsx} from "@b9g/crank/standalone";
import type {Context} from "@b9g/crank";
import {CodeEditor} from "./code-editor.js";
import {CodePreview} from "./code-preview.js";

export function* InlineCodeBlock(
	this: Context<typeof InlineCodeBlock>,
	{value, lang, editable}: {value: string; lang: string; editable: boolean},
): any {
	this.addEventListener("contentchange", (ev: any) => {
		// TODO: think about whether its wise to mutate a prop identifier
		value = ev.target.value;
		this.refresh();
	});

	let isIntersecting = false;
	if (typeof window !== "undefined") {
		const intersectionObserver = new IntersectionObserver((entries) => {
			if (!isIntersecting) {
				isIntersecting = entries[0].isIntersecting;
				this.refresh();
			}
		});

		this.flush((root) => {
			intersectionObserver.observe(root);
		});

		this.cleanup(() => {
			intersectionObserver.disconnect();
		});
	}

	for ({lang, editable} of this) {
		yield jsx`
			<div
				class="code-block"
				style="
					display: flex;
					flex-direction: row;
					flex-wrap: wrap;
					max-width: ${editable ? "100%" : "min(100%, 1000px)"};
					align-items: flex-start;
				"
			>
				<div style="
					flex: 1 1 650px;
					border: 1px solid white;
					overflow: none;
					margin-top: -1px;
					margin-left: -1px;
				">
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
						<div style="
							flex: 1 1 auto;
							position: sticky;
							top: 80px;
							min-height: 50px;
							border: 1px solid white;
							margin-top: -1px;
							margin-left: -1px;
						">
							<${CodePreview}
								value=${value}
								visible=${isIntersecting}
								autoresize
							/>
						</div>
					`
				}
			</div>
		`;
	}
}
