import {jsx} from "@b9g/crank/standalone";
import {InlineCodeBlock} from "./inline-code-block.js";

export const components = {
	codespan({token}: any) {
		return jsx`<code class="inline">${token.text}</code>`;
	},

	code({token}: any) {
		const {text: code, lang} = token;
		return jsx`
			<div class="code-block-container" data-code=${code} data-lang=${lang}>
				<${InlineCodeBlock}
					value=${code}
					lang=${lang}
					editable=${lang.endsWith(" live")}
				/>
			</div>
		`;
	},
};
