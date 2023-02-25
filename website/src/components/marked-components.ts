import {jsx} from "@b9g/crank/standalone";
import {InlineCodeBlock} from "./inline-code-block.js";
import {EmbeddedJSON} from "./embedded-json.js";

export const components = {
	codespan({token}: any) {
		return jsx`<code class="inline">${token.text}</code>`;
	},

	code({token}: any) {
		const {text: code, lang} = token;
		return jsx`
			<div
				style="margin: 30px auto;"
				class="code-block-container"
			>
				<${InlineCodeBlock}
					value=${code}
					lang=${lang}
					editable=${lang.endsWith(" live")}
				/>
				<${EmbeddedJSON} value=${{code, lang}} class="props" />
			</div>
		`;
	},
};
