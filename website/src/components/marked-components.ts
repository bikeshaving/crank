import {t} from "@b9g/crank/template.js";
import {CodeBlock} from "./prism.js";

// TODO: declare these as top-level functions.
export const components = {
	codespan({token}: any) {
		return t`<code class="inline">${token.text}</code>`;
	},

	code({token}: any) {
		const {text: code, lang} = token;
		return t`
			<div class="codeblock" data-code=${code} data-lang=${lang}>
				<${CodeBlock} value=${code} lang=${lang} />
			</div>
		`;
	},
};
