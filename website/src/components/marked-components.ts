import {jsx} from "@b9g/crank/standalone";
import {InlineCodeBlock} from "./inline-code-block.js";
import {SerializeScript} from "./serialize-javascript.js";

export const components = {
	codespan({token}: any) {
		return jsx`<code class="inline">${token.text}</code>`;
	},

	code({token}: any) {
		const {text: code, lang} = token;
		// TODO: turn this pattern into an Island Component
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
				<${SerializeScript}
					class="props"
					value=${{code, lang}}
					name="inline-code-block-props"
				/>
			</div>
		`;
	},
};
