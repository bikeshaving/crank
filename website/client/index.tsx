/** @jsx createElement */
import {createElement} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom.js";

import Prism from "prismjs";
// TODO: lazily import these?
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-diff";
import "prismjs/components/prism-bash";
import {CodeBlock} from "../shared/prism";

// @ts-ignore
Prism.manual = true;

// https://github.com/PrismJS/prism/blob/a80a68ba507dae20f007a0817d9812f8eebcc5ce/components/prism-core.js#L502
const selector =
	'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code';

// https://github.com/PrismJS/prism/blob/a80a68ba507dae20f007a0817d9812f8eebcc5ce/components/prism-core.js#L22
const lang = /\blang(?:uage)?-([\w-]+)\b/i;
// TOOD: type el
function getLanguage(el: any): string {
	while (el && !lang.test(el.className)) {
		el = el.parentElement;
	}

	if (el) {
		return (el.className.match(lang) || [null, "none"])[1].toLowerCase();
	}

	return "none";
}
for (const el of Array.from(document.querySelectorAll(selector))) {
	renderer.render(
		<CodeBlock code={el.textContent || ""} lang={getLanguage(el)} />,
		el.parentNode!,
	);
}
