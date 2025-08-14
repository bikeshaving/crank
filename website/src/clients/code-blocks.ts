import {jsx} from "@b9g/crank/standalone";
import {renderer} from "@b9g/crank/dom";

window.Prism = window.Prism || {};
Prism.manual = true;
import Prism from "prismjs";
// TODO: lazily import these?
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-diff";
import "prismjs/components/prism-bash";

import {ContentAreaElement} from "@b9g/revise/contentarea.js";
import {InlineCodeBlock} from "../components/inline-code-block.js";
import {extractData} from "../components/serialize-javascript.js";
import {GearInteractive} from "../components/gear-interactive.js";

if (!window.customElements.get("content-area")) {
	window.customElements.define("content-area", ContentAreaElement);
}

// TODO: why is this here???
const gearInteractiveRoot = document.getElementById("gear-interactive");
if (gearInteractiveRoot) {
	renderer.render(jsx`<${GearInteractive} />`, gearInteractiveRoot);
}

// TODO: abstract this pattern as an Island component
const containers = document.querySelectorAll(".code-block-container");
for (const container of Array.from(containers)) {
	const propsScript = container.querySelector(".props") as HTMLScriptElement;
	const {code, lang} = extractData(propsScript);
	renderer.hydrate(
		jsx`
			<${InlineCodeBlock}
				value=${code}
				lang=${lang}
				editable=${lang.endsWith(" live")}
			/>
		`,
		container,
	);
}
