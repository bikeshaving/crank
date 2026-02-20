import {jsx} from "@b9g/crank/standalone";
import {InlineCodeBlock} from "./inline-code-block.js";
import {SerializeScript} from "./serialize-javascript.js";
import {PartsOfJSX} from "./parts-of-jsx.js";

function resolveMarkdownHref(href: string, basePath: string): string {
	const baseParts = basePath.split("/").filter(Boolean);
	for (const part of href.split("/")) {
		if (part === "..") {
			baseParts.pop();
		} else if (part !== ".") {
			baseParts.push(part);
		}
	}

	return "/" + baseParts.join("/")
		.replace(/\.md$/, "")
		.replace(/([0-9]+-)+/, "");
}

export const components = {
	PartsOfJSX,

	link({token, rootProps, children}: any) {
		const {href, title} = token;
		const resolvedHref = href && href.endsWith(".md") && rootProps.basePath
			? resolveMarkdownHref(href, rootProps.basePath)
			: href;
		return jsx`<a href=${resolvedHref} title=${title}>${children}</a>`;
	},

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
