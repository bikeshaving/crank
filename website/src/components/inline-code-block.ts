import {jsx} from "@b9g/crank";
import type {Context} from "@b9g/crank";
import {CodeEditor} from "./code-editor.js";
import {CodePreview} from "./code-preview.js";

export function* InlineCodeBlock(
	this: Context,
	{value, lang}: {value: string; lang: string},
) {
	this.addEventListener("contentchange", (ev: any) => {
		value = ev.target.value;
		this.refresh();
	});

	for ({lang} of this) {
		yield jsx`
			<div
				class="code-block"
				style="
					display: flex;
					flex-direction: row;
					flex-wrap: wrap;
				"
			>
				<div style="
					width: 80ch;
					flex: 2 1 auto;
					border: 1px solid white;
					margin: -1px 0 0 -1px;
				">
					<${CodeEditor} $static value=${value} lang=${lang} editable=${true} />
				</div>
				<div style="
					width: 400px;
					height: 300px;
					flex: 1 1 auto;
					position: sticky;
					align-self; flex-start;
					top: 80px;
					border: 1px solid white;
					margin: -1px 0 0 -1px;
				">
					<${CodePreview} value=${value} />
				</div>
			</div>
		`;
	}
}
