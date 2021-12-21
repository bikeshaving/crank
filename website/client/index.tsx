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

for (const el of Array.from(document.querySelectorAll(".codeblock"))) {
	const {code, lang} = (el as HTMLElement).dataset;
	renderer.render(<CodeBlock code={code!} lang={lang!} />, el);
}
