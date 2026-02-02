import {jsx} from "@b9g/crank/standalone";
import {InlineCodeBlock} from "./inline-code-block.js";
import {SerializeScript} from "./serialize-javascript.js";
import {jsxToTemplate, templateToJsx} from "@b9g/crank-codemods";

export const components = {
	codespan({token}: any) {
		return jsx`<code class="inline">${token.text}</code>`;
	},

	code({token}: any) {
		const {text: code, lang} = token;
		const isLive = lang.endsWith(" live");
		const noToggle = lang.includes("notoggle");

		// Pre-compute JSX/template alternate versions for toggle
		let jsxVersion: string | null = null;
		let templateVersion: string | null = null;

		// Only compute alternate versions for JS/TS code blocks (unless notoggle)
		const isJsLang =
			!noToggle &&
			(lang.startsWith("js") ||
				lang.startsWith("ts") ||
				lang.startsWith("jsx") ||
				lang.startsWith("tsx") ||
				lang === "javascript" ||
				lang === "typescript" ||
				lang === "javascript live" ||
				lang === "jsx live" ||
				lang === "tsx live");

		if (isJsLang) {
			// Detect if code uses JSX or template syntax
			const hasJsx = /<[A-Za-z]/.test(code) && !code.includes("jsx`");
			const hasTemplate = /jsx`/.test(code);

			try {
				if (hasJsx && !hasTemplate) {
					// Code is JSX, compute template version
					jsxVersion = code;
					templateVersion = jsxToTemplate(code);
				} else if (hasTemplate && !hasJsx) {
					// Code is template, compute JSX version
					templateVersion = code;
					jsxVersion = templateToJsx(code);
				}
			} catch {
				// Conversion failed, don't show toggle
				jsxVersion = null;
				templateVersion = null;
			}
		}

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
					jsxVersion=${jsxVersion}
					templateVersion=${templateVersion}
				/>
				<${SerializeScript}
					class="props"
					value=${{code, lang, jsxVersion, templateVersion}}
					name="inline-code-block-props"
				/>
			</div>
		`;
	},
};
