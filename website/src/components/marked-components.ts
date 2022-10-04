import {xm} from "@b9g/crank";
import {CodeEditor} from "./code-editor.js";

// TODO: declare these as top-level functions.
export const components = {
	codespan({token}: any) {
		return xm`<code class="inline">${token.text}</code>`;
	},

	code({token}: any) {
		const {text: code, lang} = token;
		return xm`
			<div class="codeblock" data-code=${code} data-lang=${lang}>
				<${CodeEditor}
					value=${code}
					lang=${lang}
					editable=${lang.endsWith(" live")}
				/>
			</div>
		`;
	},
};
