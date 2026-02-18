import {jsx} from "@b9g/crank/standalone";
import {InlineCodeBlock} from "./inline-code-block.js";
import {SerializeScript} from "./serialize-javascript.js";
import {PartsOfJSX} from "./parts-of-jsx.js";

export const components = {
	PartsOfJSX,

	codespan({token}: any) {
		return jsx`<code class="inline">${token.text}</code>`;
	},

	code({token}: any) {
		const {text: code, lang} = token;
		const isLive = lang.endsWith(" live");

		// TODO: turn this pattern into an Island Component
		return jsx`
			<div
				style="margin: 30px auto;"
				class="code-block-container ${isLive ? "code-block-live" : ""}"
			>
				<${InlineCodeBlock}
					value=${code}
					lang=${lang}
					editable=${isLive}
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
