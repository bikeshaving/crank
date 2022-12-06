import {jsx} from "@b9g/crank";
import {InlineCodeBlock} from "./inline-code-block.js";
// TODO: declare these as top-level functions.
export const components = {
	codespan({token}: any) {
		return jsx`<code class="inline">${token.text}</code>`;
	},

	code({token}: any) {
		const {text: code, lang} = token;
		return jsx`
			<div class="code-block-container" data-code=${code} data-lang=${lang}>
				<${InlineCodeBlock} value=${code} lang=${lang} />
			</div>
		`;
	},
};
