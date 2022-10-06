import {xm} from "@b9g/crank";
import type {Context} from "@b9g/crank";
import {CodeEditor} from "./code-editor.js";
import {CodePreview} from "./code-preview.js";

export function* CodeBlock(
	this: Context,
	{value, lang}: {value: string; lang: string},
) {
	const isLive = lang.endsWith(" live");
	if (isLive) {
		lang = lang.split(" ")[0];
		this.addEventListener("contentchange", (ev: any) => {
			value = ev.target.value;
			this.refresh();
		});
	}

	for ({value, lang} of this) {
		yield xm`
			<div
				style="
					display: flex;
					flex-direction: row;
					margin: 1.5em 0;
					max-width: ${isLive ? "1100px" : "800px"}
				"
			>
				<div style="border: 1px solid white; flex-grow: 1; width: 600px">
					<${CodeEditor}
						$static
						value=${value}
						lang=${lang}
						editable=${isLive}
					/>
				</div>

				${
					isLive &&
					xm`
						<div style="
							position: sticky;
							top: 80px;
							border: 1px solid white;
							border-left: none;
							width: 40%;
							max-height: 400px;
						">
							<${CodePreview} value=${value} />
						</div>
					`
				}
			</div>
		`;
	}
}
