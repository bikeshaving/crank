import {t} from "@b9g/crank/template.js";
import {renderer} from "@b9g/crank/dom.js";

import Prism from "prismjs";
// TODO: lazily import these?
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-diff";
import "prismjs/components/prism-bash";
import {ContentAreaElement} from "@b9g/revise/contentarea.js";
import {CodeBlock} from "./components/prism.js";

// @ts-ignore
Prism.manual = true;

if (!window.customElements.get("content-area")) {
	window.customElements.define("content-area", ContentAreaElement);
}

for (const el of Array.from(document.querySelectorAll(".codeblock"))) {
	const {code, lang} = (el as HTMLElement).dataset;
	if (code != null && lang != null) {
		renderer.render(t`<${CodeBlock} value=${code} lang=${lang} />`, el);
	}
}
