import {jsx, Raw} from "@b9g/crank/standalone";
import {InlineCodeBlock} from "./inline-code-block.js";

export const components = {
	codespan({token}: any) {
		return jsx`<code class="inline">${token.text}</code>`;
	},

	code({token}: any) {
		const {text: code, lang} = token;
		const props = {code, lang};
		const json = JSON.stringify(props);
		return jsx`
			<div
				style="margin: 30px auto;"
				class="code-block-container"
			>
				<script class="props" type="application/json">
					<${Raw} value=${json} />
				</script>
				<${InlineCodeBlock}
					value=${code}
					lang=${lang}
					editable=${lang.endsWith(" live")}
				/>
			</div>
		`;
	},
};
